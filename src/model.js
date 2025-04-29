import * as THREE from "three";
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { scene } from './scene.js';

export let models = {};
export let currentModelName = null;
export let modelStates = {};

const TARGET_SIZE = 2.0;
const loader = new GLTFLoader();

function loadModel(url, name) {
    return new Promise((resolve, reject) => {
        const loaderElement = document.getElementById("loader");
        loaderElement.style.display = "block";

        loader.load(
            url,
            (gltf) => {
                const model = gltf.scene;
                model.visible = false;

                const box = new THREE.Box3().setFromObject(model);
                const size = new THREE.Vector3();
                box.getSize(size);
                const center = new THREE.Vector3();
                box.getCenter(center);

                // Set initial position to (0, 2, 0) instead of (0, 0, 0)
                model.position.set(0, 2, 0);
                const maxDimension = Math.max(size.x, size.y, size.z);
                const scaleFactor = TARGET_SIZE / maxDimension;
                model.scale.setScalar(scaleFactor);
                model.updateMatrixWorld();

                const fabricTexture = new THREE.TextureLoader().load("./public/Fabric.jpg");
                fabricTexture.wrapS = THREE.RepeatWrapping;
                fabricTexture.wrapT = THREE.RepeatWrapping;
                fabricTexture.repeat.set(4, 4);

                model.traverse((child) => {
                    if (child.isMesh) {
                        child.material = new THREE.MeshStandardMaterial({
                            map: fabricTexture,
                            roughness: 0.8,
                            metalness: 0.2,
                            color: new THREE.Color(1, 1, 1),
                            side: THREE.DoubleSide, // Changed to DoubleSide to render both faces
                            transparent: false,
                            opacity: 1.0,
                        });
                        child.castShadow = true;
                        child.receiveShadow = true;
                    }
                });

                scene.add(model);
                loaderElement.style.display = "none";

                modelStates[name] = {
                    initialPosition: new THREE.Vector3(0, 2, 0),
                    initialScale: new THREE.Vector3(scaleFactor, scaleFactor, scaleFactor),
                    initialRotation: new THREE.Euler(0, 0, 0),
                    currentColor: new THREE.Color(1, 1, 1),
                    compositeCanvas: null
                };

                resolve({ name, scene: model });
            },
            undefined,
            (error) => {
                console.error(`Error loading ${name} model:`, error);
                loaderElement.style.display = "none";
                reject(error);
            }
        );
    });
}

export function loadTShirtModels() {
    return Promise.all([
        loadModel('./public/models/tshirt.glb', 'T-Shirt 1'),
        loadModel('./public/models/rack3.glb', 'T-Shirt 2')
    ]).then((loadedModels) => {
        loadedModels.forEach((model) => {
            models[model.name] = model.scene;
        });
        currentModelName = 'T-Shirt 1';
        models[currentModelName].visible = true;
        resetModelToInitial(currentModelName);
        console.log("Models loaded:", Object.keys(models));
    }).catch((error) => {
        console.error('Error loading T-shirt models:', error);
    });
}

export function switchModel(name) {
    if (currentModelName === name || !models[name]) return;

    if (currentModelName && models[currentModelName]) {
        models[currentModelName].visible = false;
    }

    const newModel = models[name];
    newModel.visible = true;
    currentModelName = name;

    resetModelToInitial(name);

    const state = modelStates[name];
    newModel.traverse((child) => {
        if (child.isMesh) {
            child.material.color.copy(state.currentColor);
            child.material.side = THREE.DoubleSide; // Ensure DoubleSide on switch
            if (state.compositeCanvas) {
                const texture = new THREE.CanvasTexture(state.compositeCanvas);
                texture.wrapS = THREE.RepeatWrapping;
                texture.wrapT = THREE.RepeatWrapping;
                texture.repeat.set(1, 1);
                texture.needsUpdate = true;
                child.material.map = texture;
            }
            child.material.needsUpdate = true;
        }
    });

    console.log(`Switched to model: ${name} at initial position`, state.initialPosition);
}

export function resetModelToInitial(name = currentModelName) {
    const model = models[name];
    const state = modelStates[name];
    if (model && state) {
        model.position.copy(state.initialPosition);
        model.scale.copy(state.initialScale);
        model.rotation.copy(state.initialRotation);
        model.visible = true;

        model.matrixAutoUpdate = true;
        model.matrix.identity();
        model.updateMatrix();
        model.updateMatrixWorld(true);

        console.log(`Reset ${name} to initial state: position (${state.initialPosition.x}, ${state.initialPosition.y}, ${state.initialPosition.z}), scale (${state.initialScale.x}, ${state.initialScale.y}, ${state.initialScale.z})`);
    } else {
        console.warn(`Cannot reset ${name}: model or state not found`);
    }
}

export function setCurrentColor(color, modelName = currentModelName) {
    if (!modelStates[modelName]) return;
    modelStates[modelName].currentColor = color.clone();
    const currentModel = models[modelName];
    if (currentModel) {
        currentModel.traverse((child) => {
            if (child.isMesh) {
                child.material.color.copy(modelStates[modelName].currentColor);
                child.material.needsUpdate = true;
            }
        });
    }
}

export function setCompositeCanvas(canvas, modelName = currentModelName) {
    if (!modelStates[modelName]) return;
    modelStates[modelName].compositeCanvas = canvas;
    const model = models[modelName];
    if (model) {
        model.traverse((child) => {
            if (child.isMesh) {
                const texture = new THREE.CanvasTexture(canvas);
                texture.wrapS = THREE.RepeatWrapping;
                texture.wrapT = THREE.RepeatWrapping;
                texture.repeat.set(1, 1);
                texture.needsUpdate = true;
                child.material.map = texture;
                child.material.needsUpdate = true;
            }
        });
    }
}

export function getCurrentColor(modelName = currentModelName) {
    return modelStates[modelName]?.currentColor || new THREE.Color(1, 1, 1);
}

export function getCompositeCanvas(modelName = currentModelName) {
    return modelStates[modelName]?.compositeCanvas || null;
}