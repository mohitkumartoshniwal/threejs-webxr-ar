import * as THREE from 'three';
import { ARButton } from 'three/examples/jsm/webxr/ARButton'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader'


let loadedModels = [];
let hitTestSource = null;
let hitTestSourceRequested = false;

let gltfLoader = new GLTFLoader();
gltfLoader.load('/models/tree1.gltf', onLoad);
gltfLoader.load('/models/tree2.gltf', onLoad);
gltfLoader.load('/models/tree3.gltf', onLoad);

function onLoad(gtlf) {
    loadedModels.push(gtlf.scene)
}

const scene = new THREE.Scene()

const sizes = {
    width: window.innerWidth,
    height: window.innerHeight
}

const light = new THREE.AmbientLight(0xffffff, 1.0)
scene.add(light)


let reticle = new THREE.Mesh(
    new THREE.RingGeometry(0.15, .2, 32).rotateX(-Math.PI / 2),
    new THREE.MeshStandardMaterial({ color: 0xffffff * Math.random() })
)
reticle.visible = false;
reticle.matrixAutoUpdate = false;
scene.add(reticle)

const camera = new THREE.PerspectiveCamera(75, sizes.width / sizes.height, 0.1, 1000);
camera.position.set(0, 2, 5);
camera.lookAt(new THREE.Vector3(0, 0, 0))
scene.add(camera);

const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true

});

renderer.setSize(sizes.width, sizes.height);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.xr.enabled = true

document.body.appendChild(renderer.domElement);
document.body.appendChild(ARButton.createButton(renderer, { requiredFeatures: ['hit-test'] }));


let controller = renderer.xr.getController(0);
controller.addEventListener('select', onSelect);
scene.add(controller)

function onSelect() {
    if (reticle.visible) {
        let randomIndex = Math.floor((Math.random() * loadedModels.length))
        let model = loadedModels[randomIndex].clone()
        model.position.setFromMatrixPosition(reticle.matrix);
        model.scale.set(.1, .1, .1)
        model.name = "model"
        scene.add(model)
    }
}

renderer.setAnimationLoop(render)

function render(timestamp, frame) {
    if (frame) {
        const referenceSpace = renderer.xr.getReferenceSpace();
        const session = renderer.xr.getSession();

        if (hitTestSourceRequested === false) {
            session.requestReferenceSpace('viewer').then(referenceSpace => {
                session.requestHitTestSource({ space: referenceSpace }).then(source =>
                    hitTestSource = source)
            })

            hitTestSourceRequested = true;

            session.addEventListener("end", () => {
                hitTestSourceRequested = false;
                hitTestSource = null;
            })
        }

        if (hitTestSource) {
            const hitTestResults = frame.getHitTestResults(hitTestSource);
            if (hitTestResults.length > 0) {
                const hit = hitTestResults[0];
                reticle.visible = true;
                reticle.matrix.fromArray(hit.getPose(referenceSpace).transform.matrix)

            } else {
                reticle.visible = false

            }
        }
    }
    // console.log(scene.children)
    scene.children.forEach(object => {
        if (object.name === "model") {
            object.rotation.y += 0.01
        }
    })
    renderer.render(scene, camera)
}

window.addEventListener('resize', () => {
    sizes.width = window.innerWidth;
    sizes.height = window.innerHeight;

    camera.aspect = sizes.width / sizes.height;
    camera.updateProjectionMatrix();

    renderer.setSize(sizes.width, sizes.height);
    renderer.setPixelRatio(window.devicePixelRatio)

})