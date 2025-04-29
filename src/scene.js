import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { currentModelName, models } from './model.js';
import { isARMode } from './GUI.js';

export let scene, camera, renderer, controls, roomGroup;

export function initScene() {
    const canvas = document.getElementById("canvas");
    scene = new THREE.Scene();

    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 2, 5);

    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setClearColor(0x000000, 0);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);

    const spotLight = new THREE.SpotLight(0xffeedd, 1.5, 50, Math.PI / 6, 0.5);
    spotLight.position.set(0, 10, 5);
    spotLight.castShadow = true;
    spotLight.shadow.mapSize.width = 1024;
    spotLight.shadow.mapSize.height = 1024;
    spotLight.shadow.bias = -0.0001;
    spotLight.target.position.set(0, 0, 0);
    scene.add(spotLight);
    scene.add(spotLight.target);

    const rimLight = new THREE.DirectionalLight(0xaaaaaa, 0.6);
    rimLight.position.set(0, 8, -5);
    scene.add(rimLight);

    new RGBELoader().load("./public/pine.hdr", function (texture) {
        texture.mapping = THREE.EquirectangularReflectionMapping;
        scene.environment = texture;
    });

    roomGroup = new THREE.Group();
    const textureLoader = new THREE.TextureLoader();
    const woodTexture = textureLoader.load("./public/woodwall.jpg");
    const metalTexture = textureLoader.load("./public/metal.jpg");
    woodTexture.wrapS = woodTexture.wrapT = THREE.RepeatWrapping;
    woodTexture.repeat.set(4, 4);
    metalTexture.wrapS = metalTexture.wrapT = THREE.RepeatWrapping;
    metalTexture.repeat.set(8, 8);

    const wallMaterial = new THREE.MeshStandardMaterial({
        map: woodTexture,
        roughness: 0.8,
        metalness: 0.1,
        side: THREE.DoubleSide
    });
    const ceilingFloorMaterial = new THREE.MeshStandardMaterial({
        map: metalTexture,
        roughness: 0.3,
        metalness: 0.7,
        side: THREE.DoubleSide
    });

    const ROOM_WIDTH = 20;
    const ROOM_HEIGHT = 10;
    const ROOM_DEPTH = 20;

    const wallGeometry = new THREE.PlaneGeometry(ROOM_WIDTH, ROOM_HEIGHT);
    const floorCeilingGeometry = new THREE.PlaneGeometry(ROOM_WIDTH, ROOM_DEPTH);

    const backWall = new THREE.Mesh(wallGeometry, wallMaterial);
    backWall.position.set(0, ROOM_HEIGHT / 2, -ROOM_DEPTH / 2);
    backWall.receiveShadow = true;
    backWall.castShadow = true;

    const leftWall = new THREE.Mesh(wallGeometry, wallMaterial);
    leftWall.position.set(-ROOM_WIDTH / 2, ROOM_HEIGHT / 2, 0);
    leftWall.rotation.y = Math.PI / 2;
    leftWall.receiveShadow = true;
    leftWall.castShadow = true;

    const rightWall = new THREE.Mesh(wallGeometry, wallMaterial);
    rightWall.position.set(ROOM_WIDTH / 2, ROOM_HEIGHT / 2, 0);
    rightWall.rotation.y = -Math.PI / 2;
    rightWall.receiveShadow = true;
    rightWall.castShadow = true;

    const doorWidth = 4;
    const doorHeight = 8;
    const wallShape = new THREE.Shape();
    wallShape.moveTo(-ROOM_WIDTH / 2, 0);
    wallShape.lineTo(-ROOM_WIDTH / 2, ROOM_HEIGHT);
    wallShape.lineTo(ROOM_WIDTH / 2, ROOM_HEIGHT);
    wallShape.lineTo(ROOM_WIDTH / 2, 0);
    wallShape.lineTo(doorWidth / 2, 0);
    wallShape.lineTo(doorWidth / 2, doorHeight);
    wallShape.lineTo(-doorWidth / 2, doorHeight);
    wallShape.lineTo(-doorWidth / 2, 0);
    wallShape.lineTo(-ROOM_WIDTH / 2, 0);

    const wallGeometryWithHole = new THREE.ExtrudeGeometry(wallShape, { depth: 0.1, bevelEnabled: false });
    const frontWall = new THREE.Mesh(wallGeometryWithHole, wallMaterial);
    frontWall.position.set(0, 0, ROOM_DEPTH / 2 - 0.05);
    frontWall.rotation.y = Math.PI;
    frontWall.receiveShadow = true;
    frontWall.castShadow = true;

    const loader = new GLTFLoader();
    loader.load('./public/door.glb', (gltf) => {
        const doorModel = gltf.scene;
        const box = new THREE.Box3().setFromObject(doorModel);
        const size = new THREE.Vector3();
        box.getSize(size);
        const scaleFactor = Math.min(doorWidth / size.x, doorHeight / size.y, 0.1 / size.z);
        doorModel.scale.set(scaleFactor, scaleFactor, scaleFactor);
        doorModel.position.set(0, doorHeight / 2, ROOM_DEPTH / 2);
        doorModel.rotation.y = Math.PI;
        doorModel.traverse(child => {
            if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
                child.material.roughness = 0.8;
                child.material.metalness = 0.2;
            }
        });
        roomGroup.add(doorModel);
    });

    const ceiling = new THREE.Mesh(floorCeilingGeometry, ceilingFloorMaterial);
    ceiling.position.set(0, ROOM_HEIGHT, 0);
    ceiling.rotation.x = Math.PI / 2;
    ceiling.receiveShadow = true;
    ceiling.castShadow = true;

    const floor = new THREE.Mesh(floorCeilingGeometry, ceilingFloorMaterial);
    floor.position.set(0, 0, 0);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    floor.castShadow = true;

    roomGroup.add(backWall, leftWall, rightWall, frontWall, ceiling, floor);
    scene.add(roomGroup);

    const rackMaterial = new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.8, metalness: 0.3 });
    const rackBaseGeometry = new THREE.BoxGeometry(2, 0.2, 0.5);
    const rackPoleGeometry = new THREE.CylinderGeometry(0.05, 0.05, 4, 32);
    const rackBarGeometry = new THREE.CylinderGeometry(0.03, 0.03, 2, 32);

    const rackTshirtModels = ['./public/models/rack3.glb', './public/models/rack3.glb', './public/models/rack3.glb'];

    function createRack(x, z, modelIndex) {
        const rackGroup = new THREE.Group();
        const base = new THREE.Mesh(rackBaseGeometry, rackMaterial);
        base.position.set(0, 0.1, 0);
        const poleLeft = new THREE.Mesh(rackPoleGeometry, rackMaterial);
        poleLeft.position.set(-0.8, 2, 0);
        const poleRight = new THREE.Mesh(rackPoleGeometry, rackMaterial);
        poleRight.position.set(0.8, 2, 0);
        const bar = new THREE.Mesh(rackBarGeometry, rackMaterial);
        bar.rotation.z = Math.PI / 2;
        bar.position.set(0, 4, 0);

        loader.load(rackTshirtModels[modelIndex % rackTshirtModels.length], (gltf) => {
            const tshirtModel = gltf.scene;
            tshirtModel.scale.set(1, 1, 1);
            tshirtModel.position.set(0, 3, 0);
            tshirtModel.rotation.y = Math.random() * 0.2 - 0.1;
            tshirtModel.traverse(child => {
                if (child.isMesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                    child.material.roughness = 0.9;
                    child.material.metalness = 0.1;
                }
            });
            rackGroup.add(tshirtModel);
        });

        rackGroup.add(base, poleLeft, poleRight, bar);
        rackGroup.position.set(x, 0, z);
        rackGroup.traverse(child => {
            if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
            }
        });
        scene.add(rackGroup);
    }

    createRack(-5, -5, 0);
    createRack(5, -5, 1);
    createRack(-5, 5, 2);

    const posterGeometry = new THREE.PlaneGeometry(4, 6);
    const posterTexture1 = textureLoader.load("./public/sunposter.jpg");
    const posterTexture2 = textureLoader.load("./public/stars.jpg");
    const posterMaterial1 = new THREE.MeshStandardMaterial({ map: posterTexture1, roughness: 0.7, metalness: 0 });
    const posterMaterial2 = new THREE.MeshStandardMaterial({ map: posterTexture2, roughness: 0.7, metalness: 0 });

    const posterLeft = new THREE.Mesh(posterGeometry, posterMaterial1);
    posterLeft.position.set(-9.9, 5, 0);
    posterLeft.rotation.y = Math.PI / 2;
    posterLeft.receiveShadow = true;
    posterLeft.castShadow = true;

    const posterRight = new THREE.Mesh(posterGeometry, posterMaterial2);
    posterRight.position.set(9.9, 5, 0);
    posterRight.rotation.y = -Math.PI / 2;
    posterRight.receiveShadow = true;
    posterRight.castShadow = true;

    scene.add(posterLeft, posterRight);

    function createNeonText(text, color) {
        const canvas = document.createElement('canvas');
        canvas.width = 1024;
        canvas.height = 256;
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.font = 'bold 120px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = color;
        ctx.fillText(text, canvas.width / 2, canvas.height / 2);

        const neonTexture = new THREE.CanvasTexture(canvas);
        neonTexture.needsUpdate = true;
        const neonMaterial = new THREE.MeshStandardMaterial({
            map: neonTexture,
            emissive: color,
            emissiveIntensity: 0.5,
            roughness: 0.2,
            metalness: 0.1,
            transparent: true
        });
        const neonGeometry = new THREE.PlaneGeometry(10, 2.5);
        const neonTextMesh = new THREE.Mesh(neonGeometry, neonMaterial);
        neonTextMesh.position.set(0, 7, -9.9);
        neonTextMesh.receiveShadow = true;
        neonTextMesh.castShadow = true;
        scene.add(neonTextMesh);
    }

    createNeonText("STREETWEAR", "#ff00ff");

    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.15;
    controls.minDistance = 2;
    controls.maxDistance = 6;
    controls.minPolarAngle = 0.1;
    controls.maxPolarAngle = 1.8;
    controls.target.set(0, 3.1, 0);
    controls.update();

    window.addEventListener("resize", onWindowResize);
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

let latestResults = null;
let smoothedPosition = new THREE.Vector3(0, 0, -2);
let smoothedScale = new THREE.Vector3(1, 1, 1);
let smoothedRotation = new THREE.Euler(0, 0, 0);
const SMOOTHING_FACTOR = 0.6;
const VIEWPORT_WIDTH = 10;
const VIEWPORT_HEIGHT = 8;
const WIDTH_SCALE_FACTOR = 8.0; // Adjustable factor to map torso width to model X-scale
let arLight = null;
let trackingLostFrames = 0;
const MAX_LOST_FRAMES = 30;
let hasLoggedNoResults = false;

export function animate() {
    requestAnimationFrame(animate);
    controls.update();

    const activeCamera = arLight ? scene.getObjectByName('arCamera') || camera : camera;

    // Only process landmarks in AR mode
    if (isARMode) {
        const model = models[currentModelName];

        if (model && latestResults) {
            const leftShoulder = latestResults.poseLandmarks?.[11];
            const rightShoulder = latestResults.poseLandmarks?.[12];
            const leftElbow = latestResults.poseLandmarks?.[13];
            const rightElbow = latestResults.poseLandmarks?.[14];
            const leftHip = latestResults.poseLandmarks?.[23];
            const rightHip = latestResults.poseLandmarks?.[24];

            if (leftShoulder && rightShoulder && leftElbow && rightElbow && leftHip && rightHip) {
                trackingLostFrames = 0;
                model.visible = true;

                console.log("Left Shoulder:", leftShoulder);
                console.log("Right Shoulder:", rightShoulder);

                // Define landmark positions in 3D space
                const leftShoulderPos = new THREE.Vector3(
                    (0.5 - leftShoulder.x) * VIEWPORT_WIDTH,
                    (0.5 - leftShoulder.y) * VIEWPORT_HEIGHT,
                    -1 - leftShoulder.z * 6
                );
                const rightShoulderPos = new THREE.Vector3(
                    (0.5 - rightShoulder.x) * VIEWPORT_WIDTH,
                    (0.5 - rightShoulder.y) * VIEWPORT_HEIGHT,
                    -1 - rightShoulder.z * 6
                );
                const leftHipPos = new THREE.Vector3(
                    (0.5 - leftHip.x) * VIEWPORT_WIDTH,
                    (0.5 - leftHip.y) * VIEWPORT_HEIGHT,
                    -1 - leftHip.z * 6
                );
                const rightHipPos = new THREE.Vector3(
                    (0.5 - rightHip.x) * VIEWPORT_WIDTH,
                    (0.5 - rightHip.y) * VIEWPORT_HEIGHT,
                    -1 - rightHip.z * 6
                );

                // Center of torso based on shoulders and hips
                const torsoCenterX = (leftShoulder.x + rightShoulder.x + leftHip.x + rightHip.x) / 4;
                const torsoCenterY = (leftShoulder.y + rightShoulder.y + leftHip.y + rightHip.y) / 4;
                const torsoCenterZ = (leftShoulder.z + rightShoulder.z + leftHip.z + rightHip.z) / 4;

                // Position t-shirt at torso center
                const tShirtX = (0.5 - torsoCenterX) * VIEWPORT_WIDTH * (1 + torsoCenterZ);
                const tShirtY = (0.5 - torsoCenterY) * VIEWPORT_HEIGHT * (1 + torsoCenterZ);
                const tShirtZ = -2 - torsoCenterZ * 6;

                const clampedX = THREE.MathUtils.clamp(tShirtX, -VIEWPORT_WIDTH / 2, VIEWPORT_WIDTH / 2);
                const clampedY = THREE.MathUtils.clamp(tShirtY, -VIEWPORT_HEIGHT / 2, VIEWPORT_HEIGHT / 2);

                smoothedPosition.lerp(new THREE.Vector3(clampedX, clampedY, tShirtZ), SMOOTHING_FACTOR);

                // Calculate torso width (max of shoulder and hip widths)
                const shoulderWidth = Math.abs(leftShoulder.x - rightShoulder.x);
                const hipWidth = Math.abs(leftHip.x - rightHip.x);
                const torsoWidth = Math.max(shoulderWidth, hipWidth); // Use max for broader fit

                // Scale based on torso dimensions
                const torsoHeight = Math.abs((leftShoulder.y + rightShoulder.y) / 2 - (leftHip.y + rightHip.y) / 2);
                const baseScale = 6 + Math.abs(torsoCenterZ) * 12;

                // Dynamic X-scale based on torso width
                const scaleX = torsoWidth * WIDTH_SCALE_FACTOR * (1 + torsoCenterZ);
                const scaleY = torsoHeight * baseScale * 1.5;
                const scaleZ = scaleX * 0.8; // Z-scale slightly smaller than X for natural depth

                smoothedScale.lerp(new THREE.Vector3(scaleX, scaleY, scaleZ), SMOOTHING_FACTOR);

                const shoulderVector = new THREE.Vector3(
                    rightShoulder.x - leftShoulder.x,
                    rightShoulder.y - leftShoulder.y,
                    rightShoulder.z - leftShoulder.z
                );
                const torsoVector = new THREE.Vector3(
                    (rightHip.x - leftHip.x),
                    (rightHip.y - leftHip.y),
                    (rightHip.z - leftHip.z)
                );
                const shoulderAngle = Math.atan2(shoulderVector.x, shoulderVector.z);
                const torsoAngle = Math.atan2(torsoVector.x, torsoVector.z);
                const avgAngle = (shoulderAngle + torsoAngle) / 2;
                const targetRotationY = (Math.abs(avgAngle) > 1.2) ? Math.PI : 0;
                smoothedRotation.y = THREE.MathUtils.lerp(smoothedRotation.y, targetRotationY, SMOOTHING_FACTOR);

                model.position.copy(smoothedPosition);
                model.scale.copy(smoothedScale);
                model.rotation.set(0, smoothedRotation.y, 0);

                if (arLight) {
                    arLight.position.set(smoothedPosition.x, smoothedPosition.y + 5, smoothedPosition.z + 5);
                    arLight.target.position.copy(smoothedPosition);
                }

                console.log(`👕 T-shirt (${currentModelName}) position: (${smoothedPosition.x.toFixed(2)}, ${smoothedPosition.y.toFixed(2)}, ${smoothedPosition.z.toFixed(2)}), scale: (${smoothedScale.x.toFixed(2)}, ${smoothedScale.y.toFixed(2)}, ${smoothedScale.z.toFixed(2)}), rotation: ${smoothedRotation.y.toFixed(2)}, torsoWidth: ${torsoWidth.toFixed(3)}`);
                hasLoggedNoResults = false; // Reset warning flag when results are processed
            } else {
                console.warn('⚠️ Missing landmarks in latestResults:', { leftShoulder, rightShoulder, leftElbow, rightElbow, leftHip, rightHip });
                trackingLostFrames++;
                if (trackingLostFrames > MAX_LOST_FRAMES) {
                    model.visible = false;
                    document.getElementById("loader").style.display = "block";
                    document.getElementById("loader").textContent = "Tracking Lost - Please align yourself with the camera";
                }
            }
        } else if (!hasLoggedNoResults) {
            console.warn('⚠️ No model or no results:', {
                hasModel: !!models[currentModelName],
                hasResults: !!latestResults,
            });
            hasLoggedNoResults = true; // Log only once per AR session
        }
    } else {
        hasLoggedNoResults = false; // Reset when exiting AR mode
    }

    renderer.render(scene, activeCamera);
}

export function setLatestResults(results) {
    if (isARMode) {
        console.log('📍 setLatestResults called with results:', results);
        latestResults = results;
    }
}

export function toggleEditorMode(isEditorMode) {
    roomGroup.visible = isEditorMode;
    if (models[currentModelName]) {
        models[currentModelName].visible = isEditorMode;
        if (isEditorMode) {
            // Reset AR smoothing variables and results
            smoothedPosition.set(0, 2, 0);
            smoothedScale.set(1, 1, 1);
            smoothedRotation.set(0, 0, 0);
            latestResults = null; // Clear landmark results
        }
        console.log(`🔍 Editor Mode: ${isEditorMode ? 'ON' : 'OFF'}`);
        console.log(`🎯 Model Position:`, models[currentModelName].position);
    } else {
        console.warn(`No model found for ${currentModelName}`);
    }
    renderer.setSize(window.innerWidth, window.innerHeight);
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.position.set(0, 15, 20);
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();

    if (!isEditorMode && !arLight) {
        arLight = new THREE.DirectionalLight(0xffffff, 1.5);
        arLight.position.set(0, 5, 5);
        arLight.target.position.set(0, 0, 0);
        scene.add(arLight);
        scene.add(arLight.target);
    } else if (isEditorMode && arLight) {
        scene.remove(arLight);
        scene.remove(arLight.target);
        arLight = null;
    }
}