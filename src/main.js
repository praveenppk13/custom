import * as THREE from 'three';
import { initScene, animate, setLatestResults } from "./scene.js";
import { loadTShirtModels } from "./model.js";
import { setupColorPicker } from "./Colorpicker.js";
import { setupTextInput } from "./TextInput.js";
import { setupTextureInput } from "./Texture.js";
import { setupLogoInput } from "./LogoInput.js";
import { setupGUI } from "./GUI.js";

const videoElement = document.getElementById('video');
let holistic;
window.holisticInitialized = false;

export function updateTShirtPosition(results) {
    // Placeholder function; actual logic is in scene.js
}

// Initialize MediaPipe Holistic immediately
const initializeHolistic = async (version = '0.5.1675471629', retries = 10, delay = 500) => {
    for (let i = 0; i < retries; i++) {
        if (typeof window.Holistic === 'function') {
            try {
                holistic = new window.Holistic({
                    locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/holistic@${version}/${file}`,
                });

                holistic.setOptions({
                    modelComplexity: 1,
                    smoothLandmarks: true,
                    enableSegmentation: false,
                    refineFaceLandmarks: false,
                    minDetectionConfidence: 0.5,
                    minTrackingConfidence: 0.5,
                });

                holistic.onResults((results) => {
                    console.log('📍 Holistic results received:', {
                        poseLandmarks: results.poseLandmarks ? results.poseLandmarks.length : 'none',
                        leftShoulder: results.poseLandmarks?.[11],
                        rightShoulder: results.poseLandmarks?.[12],
                    });
                    setLatestResults(results); // Use imported function directly
                });

                window.holistic = holistic;
                window.holisticInitialized = true;
                console.log(`✅ MediaPipe Holistic initialized with version ${version}`);
                return holistic;
            } catch (error) {
                console.error(`❌ Error initializing MediaPipe Holistic with version ${version}:`, error);
                break;
            }
        } else {
            console.warn(`⏳ Waiting for window.Holistic to load (attempt ${i + 1}/${retries})...`);
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }

    console.error(`❌ window.Holistic not defined after ${retries} attempts with version ${version}`);
    return null;
};

// Start initialization immediately
initializeHolistic('0.5.1675471629').then(async (holisticInstance) => {
    if (!holisticInstance) {
        console.log('🔄 Falling back to older version 0.4.1630009814...');
        await initializeHolistic('0.4.1630009814');
    }
});

document.addEventListener("DOMContentLoaded", async () => {
    initScene();
    const tryOnButton = document.getElementById('tryOnButton');
    tryOnButton.disabled = true;
    await loadTShirtModels();
    tryOnButton.disabled = false;
    setupColorPicker();
    setupTextInput();
    setupTextureInput();
    setupLogoInput();
    setupGUI();
    animate();
});