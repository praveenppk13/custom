import * as THREE from 'three';
import { gsap } from 'gsap';
import { scene, camera, renderer, roomGroup, toggleEditorMode, setLatestResults } from './scene.js';
import { models, switchModel, setCompositeCanvas, setCurrentColor, currentModelName, getCurrentColor, getCompositeCanvas } from './model.js';
import { currentText, currentTexture, currentLogo, setText, setTexture, setLogo, clearText, clearTexture, clearLogo } from './state.js';

// Canvas layers
let fabricLayerCanvas = null;
let textureLayerCanvas = null;
let textLayerCanvas = null;
let logoLayerCanvas = null;
let compositeCanvas = null;

let stream = null;
export let isARMode = false; // Export isARMode for scene.js
let cameraFeed = null;
const video = document.getElementById('video');

let arLight = null;
let arCamera = null; // Separate AR camera
let editorCameraState = null; // Store editor camera and model state
let sceneObjectStates = new Map();

export function setupGUI() {
    const gui = document.getElementById('controls');
    const toggleBtn = gui.querySelector('.toggle-button');
    const content = gui.querySelector('.content');

    // Ensure content is hidden when collapsed on load
    content.style.display = gui.classList.contains('collapsed') ? 'none' : 'block';

    toggleBtn.addEventListener('click', () => {
        gui.classList.toggle('collapsed');
        content.style.display = gui.classList.contains('collapsed') ? 'none' : 'block';
    });

    fabricLayerCanvas = document.createElement("canvas");
    fabricLayerCanvas.width = 1024;
    fabricLayerCanvas.height = 256;
    const fabricCtx = fabricLayerCanvas.getContext("2d");
    new THREE.TextureLoader().load("./public/Fabric.jpg", (loadedTexture) => {
        fabricCtx.drawImage(loadedTexture.image, 0, 0, fabricLayerCanvas.width, fabricLayerCanvas.height);
        fabricCtx.globalCompositeOperation = "multiply";
        fabricCtx.drawImage(loadedTexture.image, 0, 0, fabricLayerCanvas.width, fabricLayerCanvas.height);
        fabricCtx.globalCompositeOperation = "source-over";
        console.log("Initialized fabric layer");
        applyToTShirt();
    });

    const modelSelect = document.getElementById('modelSelect');
    modelSelect.addEventListener('change', (e) => {
        switchModel(e.target.value);
        applyToTShirt();
        const colorPicker = document.getElementById('colorPicker');
        const currentColor = getCurrentColor(currentModelName);
        colorPicker.value = `#${currentColor.getHexString()}`;
        console.log(`Model switched to: ${e.target.value}`);
    });

    const tryOnButton = document.getElementById('tryOnButton');

    tryOnButton.addEventListener('click', async () => {
        if (!isARMode) {
            applyToTShirt();
            const currentModel = models[currentModelName];
            if (!currentModel) {
                console.error("No model loaded for AR mode");
                return;
            }

            // Store editor state (camera and model)
            editorCameraState = {
                camera: {
                    position: camera.position.clone(),
                    rotation: camera.rotation.clone(),
                    fov: camera.fov,
                    near: camera.near,
                    far: camera.far,
                    aspect: camera.aspect
                },
                model: {
                    position: currentModel.position.clone(),
                    scale: currentModel.scale.clone(),
                    rotation: currentModel.rotation.clone(),
                    visible: currentModel.visible
                }
            };

            // Store scene object states (excluding camera and currentModel)
            sceneObjectStates.clear();
            scene.children.forEach((obj) => {
                if (obj !== currentModel && obj !== camera) {
                    sceneObjectStates.set(obj, { 
                        visible: obj.visible, 
                        position: obj.position.clone(), 
                        rotation: obj.rotation.clone() 
                    });
                    obj.visible = false;
                }
            });

            // Prepare currentModel for AR mode
            currentModel.visible = true;
            currentModel.position.set(0, 0, -2);
            currentModel.scale.set(1, 1, 1);
            currentModel.rotation.set(0, 0, 0);
            console.log(`Using model ${currentModelName} for AR mode, position=[0, 0, -2], Jenner scale=[1, 1, 1]`);

            video.style.display = 'block';
            await startARMode();
            tryOnButton.textContent = 'Back to Editor';
            isARMode = true;
            console.log(`Switched to AR Mode: ${currentModelName} visible`);
        } else {
            stopARMode();
            video.style.display = 'none';
            const currentModel = models[currentModelName];
            if (currentModel) {
                // Clear any animations on the model
                gsap.killTweensOf(currentModel.position);
                gsap.killTweensOf(currentModel.scale);
                gsap.killTweensOf(currentModel.rotation);

                // Restore model state
                if (editorCameraState && editorCameraState.model) {
                    currentModel.position.copy(editorCameraState.model.position);
                    currentModel.scale.copy(editorCameraState.model.scale);
                    currentModel.rotation.copy(editorCameraState.model.rotation);
                    currentModel.visible = editorCameraState.model.visible;
                    console.log(`Restored model ${currentModelName}, position=${currentModel.position.toArray()}, scale=${currentModel.scale.toArray()}`);
                }
            } else {
                console.warn(`Model ${currentModelName} not found`);
            }

            // Restore scene state
            sceneObjectStates.forEach((state, obj) => {
                obj.visible = state.visible;
                obj.position.copy(state.position);
                obj.rotation.copy(state.rotation);
            });
            sceneObjectStates.clear();

            // Restore editor camera
            if (editorCameraState && editorCameraState.camera) {
                camera.position.copy(editorCameraState.camera.position);
                camera.rotation.copy(editorCameraState.camera.rotation);
                camera.fov = editorCameraState.camera.fov;
                camera.near = editorCameraState.camera.near;
                camera.far = editorCameraState.camera.far;
                camera.aspect = editorCameraState.camera.aspect;
                camera.updateProjectionMatrix();
            }

            toggleEditorMode(true);
            tryOnButton.textContent = 'Try On';
            isARMode = false;
            console.log(`Switched to Editor Mode: ${currentModelName} restored`);
        }
    });

    async function startARMode() {
        try {
            if (!window.holisticInitialized || !window.holistic) {
                console.log("🚀 Initializing MediaPipe Holistic...");
                window.holistic = new window.Holistic({
                    locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/holistic/${file}`
                });
                window.holistic.setOptions({
                    modelComplexity: 1,
                    smoothLandmarks: true,
                    enableSegmentation: false,
                    minDetectionConfidence: 0.5,
                    minTrackingConfidence: 0.5
                });
                window.holistic.onResults((results) => {
                    console.log('📍 MediaPipe results received:', results);
                    setLatestResults(results);
                });
                await window.holistic.initialize();
                window.holisticInitialized = true;
                console.log("✅ MediaPipe Holistic initialized");
            }

            // Create separate AR camera
            arCamera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 100);
            arCamera.position.set(0, 0, 0);
            arCamera.lookAt(0, 0, -1);
            arCamera.name = 'arCamera';
            scene.add(arCamera);

            stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
            video.srcObject = stream;
            video.onloadedmetadata = async () => {
                console.log('🎥 Video metadata loaded:', { width: video.videoWidth, height: video.videoHeight });
                video.play();
                video.width = video.videoWidth;
                video.height = video.videoHeight;
                renderer.setSize(window.innerWidth, window.innerHeight);
                renderer.setClearColor(0x000000, 0);

                cameraFeed = new window.Camera(video, {
                    onFrame: async () => {
                        console.log('📸 Sending frame to Holistic');
                        await window.holistic.send({ image: video });
                    },
                    width: video.videoWidth,
                    height: video.videoHeight
                });
                await cameraFeed.start();
                console.log(`AR Mode: Video started (${video.videoWidth}x${video.videoHeight})`);

                if (!arLight) {
                    arLight = new THREE.PointLight(0xffffff, 1.5, 50);
                    arLight.position.set(0, 0, 1);
                    arCamera.add(arLight);
                }

                document.getElementById("loader").style.display = "none";
            };
        } catch (err) {
            console.error("Camera or MediaPipe error:", err);
            alert("Failed to start AR mode. Please allow camera permissions or try again.");
            tryOnButton.textContent = 'Try On';
            isARMode = false;
        }
    }

    function stopARMode() {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            stream = null;
            video.srcObject = null;
            video.pause();
        }
        if (cameraFeed) {
            cameraFeed.stop();
            cameraFeed = null;
        }
        if (window.holistic) {
            window.holistic.close().then(() => {
                console.log('🛑 MediaPipe Holistic closed');
            }).catch(err => {
                console.error('Error closing MediaPipe Holistic:', err);
            });
            window.holistic = null;
            window.holisticInitialized = false;
        }
        isARMode = false;
        if (arLight) {
            arCamera.remove(arLight);
            arLight = null;
        }
        if (arCamera) {
            scene.remove(arCamera);
            arCamera = null;
        }
        console.log('🛑 AR Mode stopped, camera feed terminated, MediaPipe cleared');
    }
}

export function applyToTShirt() {
    const model = models[currentModelName];
    if (!model || !fabricLayerCanvas) return;

    updateTextureLayer();
    updateTextLayer();
    updateLogoLayer();

    model.traverse((child) => {
        if (child.isMesh) {
            compositeCanvas = document.createElement("canvas");
            compositeCanvas.width = 1024;
            compositeCanvas.height = 256;
            const ctx = compositeCanvas.getContext("2d");

            ctx.clearRect(0, 0, compositeCanvas.width, compositeCanvas.height);
            ctx.drawImage(fabricLayerCanvas, 0, 0);
            if (textureLayerCanvas) ctx.drawImage(textureLayerCanvas, 0, 0);
            if (textLayerCanvas) ctx.drawImage(textLayerCanvas, 0, 0);
            if (logoLayerCanvas) ctx.drawImage(logoLayerCanvas, 0, 0);

            const texture = new THREE.CanvasTexture(compositeCanvas);
            texture.wrapS = THREE.RepeatWrapping;
            texture.wrapT = THREE.RepeatWrapping;
            texture.repeat.set(1, 1);
            texture.needsUpdate = true;

            child.material.map = texture;
            child.material.color.copy(getCurrentColor(currentModelName));
            child.material.roughness = 0.8;
            child.material.emissive = getCurrentColor(currentModelName).clone().multiplyScalar(0.05);
            child.material.emissiveMap = texture;
            child.material.side = THREE.DoubleSide;
            child.material.transparent = false;
            child.material.opacity = 1.0;
            child.material.depthTest = true;
            child.material.depthWrite = true;
            child.material.needsUpdate = true;
            setCompositeCanvas(compositeCanvas, currentModelName);
            console.log(`Texture applied to ${currentModelName}`);
        }
    });
    model.visible = true;
}

function updateTextureLayer() {
    textureLayerCanvas = document.createElement("canvas");
    textureLayerCanvas.width = 1024;
    textureLayerCanvas.height = 256;
    const ctx = textureLayerCanvas.getContext("2d");
    if (currentTexture.patternType && currentTexture.colors.length > 0) {
        applyPattern(ctx, currentTexture.patternType, currentTexture.colors, textureLayerCanvas.width, textureLayerCanvas.height);
    }
}

function updateTextLayer() {
    textLayerCanvas = document.createElement("canvas");
    textLayerCanvas.width = 1024;
    textLayerCanvas.height = 256;
    const ctx = textLayerCanvas.getContext("2d");
    if (currentText.text && currentText.positions.length > 0) {
        ctx.font = `${currentText.fontSize || 30}px Arial`;
        ctx.fillStyle = currentText.color;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        currentText.positions.forEach(pos => {
            ctx.fillText(currentText.text, pos.x, pos.y);
        });
    }
}

function updateLogoLayer() {
    logoLayerCanvas = document.createElement("canvas");
    logoLayerCanvas.width = 1024;
    logoLayerCanvas.height = 256;
    const ctx = logoLayerCanvas.getContext("2d");
    if (currentLogo.image) {
        const logoWidth = currentLogo.width;
        const logoHeight = currentLogo.height;
        const xOffset = currentLogo.xOffset;
        const yOffset = currentLogo.yOffset;
        const baseX = currentLogo.position === "front" ? 276 : 723;
        const baseY = currentLogo.position === "front" ? 148.3125 : 142.6875;
        const x = baseX + xOffset;
        const y = baseY + yOffset;

        ctx.globalAlpha = currentLogo.opacity;
        ctx.drawImage(currentLogo.image, x, y, logoWidth, logoHeight);
        ctx.globalAlpha = 1.0;
    }
}

function applyPattern(ctx, patternType, colors, width, height) {
    switch (patternType) {
        case "splatter":
            applySplatterPattern(ctx, colors, width, height);
            break;
        case "gradient":
            applyGradientPattern(ctx, colors, width, height);
            break;
        case "grid":
            applyGridPattern(ctx, colors, width, height);
            break;
    }
}

function applySplatterPattern(ctx, colors, width, height) {
    const splatterCount = 100;
    for (let i = 0; i < splatterCount; i++) {
        const x = Math.random() * width;
        const y = Math.random() * height;
        const radius = Math.random() * 50 + 10;
        const color = colors[Math.floor(Math.random() * colors.length)];
        ctx.fillStyle = color.getStyle();
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.filter = "blur(5px)";
        ctx.fill();
        ctx.filter = "none";
    }
}

function applyGradientPattern(ctx, colors, width, height) {
    const gradient = ctx.createLinearGradient(0, 0, width, 0);
    colors.forEach((color, idx) => {
        gradient.addColorStop(idx / (colors.length - 1), color.getStyle());
    });
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
}

function applyGridPattern(ctx, colors, width, height) {
    const tileSize = 64;
    for (let x = 0; x < width; x += tileSize) {
        for (let y = 0; y < height; y += tileSize) {
            const color = colors[Math.floor(Math.random() * colors.length)];
            ctx.fillStyle = color.getStyle();
            ctx.fillRect(x, y, tileSize, tileSize);
        }
    }
}