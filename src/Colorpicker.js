import * as THREE from "three";
import { gsap } from "gsap";
import { models, currentModelName, setCurrentColor, getCurrentColor } from "./model.js";
import { applyToTShirt } from "./GUI.js";

// Debounce function to batch updates
function debounceUpdate(callback, delay = 100) {
    let timeout;
    return (...args) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => callback(...args), delay);
    };
}

export function setupColorPicker() {
    const colorPicker = document.getElementById("colorPicker");
    const removeColorButton = document.getElementById("removeColorButton");

    if (!colorPicker || !removeColorButton) {
        console.error("❌ One or more elements not found:", { colorPicker, removeColorButton });
        return;
    }

    const applyColorAnimationDebounced = debounceUpdate(applyColorAnimation, 100);

    colorPicker.addEventListener("input", (event) => {
        const currentModel = models[currentModelName];
        if (currentModel) {
            const newColor = new THREE.Color(event.target.value);
            setCurrentColor(newColor, currentModelName);
            applyColorAnimationDebounced(currentModel, newColor);
            applyToTShirt();
            console.log(`🎨 Color applied to ${currentModelName}: ${event.target.value}`);
        } else {
            console.warn("⚠️ T-shirt model not yet loaded. Color change ignored.");
        }
    });

    removeColorButton.addEventListener("click", () => {
        const currentModel = models[currentModelName];
        if (currentModel) {
            const defaultColor = new THREE.Color("#ffffff");
            setCurrentColor(defaultColor, currentModelName);
            applyColorAnimationDebounced(currentModel, defaultColor);
            applyToTShirt();
            colorPicker.value = "#ffffff";
            console.log(`🎨 Color reset to white for ${currentModelName}, other customizations preserved.`);
        } else {
            console.warn("⚠️ T-shirt model not loaded.");
        }
    });
}

function applyColorAnimation(model, color) {
    model.traverse((child) => {
        if (child.isMesh) {
            const currentMaterial = child.material;
            gsap.to(currentMaterial.color, {
                r: color.r,
                g: color.g,
                b: color.b,
                duration: 0.5,
                ease: "power2.out",
                onUpdate: () => {
                    currentMaterial.needsUpdate = true;
                },
            });
            currentMaterial.roughness = 0.8;
            currentMaterial.emissive = color.clone().multiplyScalar(0.05);
            currentMaterial.emissiveMap = currentMaterial.map;
        }
    });
}