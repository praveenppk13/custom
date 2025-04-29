import * as THREE from "three";
import { models, currentModelName } from "./model.js";
import { currentLogo, setLogo, clearLogo } from "./state.js";
import { applyToTShirt } from "./GUI.js";

export function setupLogoInput() {
    const logoInput = document.getElementById("logoInput");
    const applyLogoButton = document.getElementById("applyLogoButton");
    const logoPosition = document.getElementById("logoPosition");
    const logoWidth = document.getElementById("logoWidth");
    const logoHeight = document.getElementById("logoHeight");
    const lockAspectRatio = document.getElementById("lockAspectRatio");
    const logoOpacity = document.getElementById("logoOpacity");
    const logoXOffset = document.getElementById("logoXOffset");
    const logoYOffset = document.getElementById("logoYOffset");
    const removeLogoButton = document.getElementById("removeLogoButton");
    const logoWidthValue = document.getElementById("logoWidthValue");
    const logoHeightValue = document.getElementById("logoHeightValue");
    const logoOpacityValue = document.getElementById("logoOpacityValue");
    const logoXOffsetValue = document.getElementById("logoXOffsetValue");
    const logoYOffsetValue = document.getElementById("logoYOffsetValue");

    if (!logoInput || !applyLogoButton || !logoPosition || !logoWidth || !logoHeight || !lockAspectRatio || !logoOpacity || !logoXOffset || !logoYOffset || !removeLogoButton) {
        console.error("❌ One or more DOM elements not found:", { logoInput, applyLogoButton, logoPosition, logoWidth, logoHeight, lockAspectRatio, logoOpacity, logoXOffset, logoYOffset, removeLogoButton });
        return;
    }

    // Update slider values in real-time for existing logo
    const updateSliderValueLogo = (slider, valueSpan) => {
        slider.addEventListener('input', () => {
            valueSpan.textContent = slider.value;
            if (currentLogo.image) {
                const width = parseFloat(logoWidth.value);
                const height = lockAspectRatio.checked ? width / (currentLogo.image.width / currentLogo.image.height) : parseFloat(logoHeight.value);
                setLogo({
                    image: currentLogo.image,
                    position: logoPosition.value,
                    width,
                    height,
                    opacity: parseFloat(logoOpacity.value),
                    xOffset: parseFloat(logoXOffset.value),
                    yOffset: parseFloat(logoYOffset.value),
                });
                applyToTShirt();
            }
        });
    };
    updateSliderValueLogo(logoWidth, logoWidthValue);
    updateSliderValueLogo(logoHeight, logoHeightValue);
    updateSliderValueLogo(logoOpacity, logoOpacityValue);
    updateSliderValueLogo(logoXOffset, logoXOffsetValue);
    updateSliderValueLogo(logoYOffset, logoYOffsetValue);

    // Maintain aspect ratio for existing logo
    logoWidth.addEventListener('input', () => {
        if (lockAspectRatio.checked && currentLogo.image) {
            const aspect = currentLogo.image.width / currentLogo.image.height;
            logoHeight.value = Math.round(logoWidth.value / aspect);
            logoHeightValue.textContent = logoHeight.value;
        }
    });
    logoHeight.addEventListener('input', () => {
        if (lockAspectRatio.checked && currentLogo.image) {
            const aspect = currentLogo.image.width / currentLogo.image.height;
            logoWidth.value = Math.round(logoHeight.value * aspect);
            logoWidthValue.textContent = logoWidth.value;
        }
    });

    // Update logo position in real-time for existing logo
    logoPosition.addEventListener("change", () => {
        if (currentLogo.image) {
            setLogo({ ...currentLogo, position: logoPosition.value });
            applyToTShirt();
        }
    });

    // Apply new logo only on button click
    applyLogoButton.addEventListener("click", () => {
        const file = logoInput.files[0];
        if (file) {
            if (!file.type.startsWith("image/")) {
                alert("Only image files are allowed!");
                return;
            }
            applyLogo(file, logoPosition.value, parseFloat(logoWidth.value), parseFloat(logoHeight.value), parseFloat(logoOpacity.value), parseFloat(logoXOffset.value), parseFloat(logoYOffset.value), lockAspectRatio.checked);
        } else {
            console.warn("⚠️ Please select an image file.");
        }
    });

    removeLogoButton.addEventListener("click", () => {
        const currentModel = models[currentModelName];
        if (currentModel) {
            clearLogo();
            applyToTShirt();
            console.log("🗑️ Logo removed from T-shirt, preserving color, text, and texture.");
        } else {
            console.warn("⚠️ T-shirt model not loaded.");
        }
    });
}

function applyLogo(file, position, width, height, opacity, xOffset, yOffset, lockAspectRatio) {
    const reader = new FileReader();
    reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
            let finalWidth = width;
            let finalHeight = height;
            if (lockAspectRatio) {
                const aspectRatio = img.width / img.height;
                finalHeight = width / aspectRatio;
            }
            setLogo({ image: img, position, width: finalWidth, height: finalHeight, opacity, xOffset, yOffset });
            applyToTShirt();
            console.log(`🏷️ Logo applied to T-shirt: Position: ${position}, Width: ${finalWidth}, Height: ${finalHeight}`);
        };
        img.onerror = () => console.error("❌ Failed to load logo image.");
        img.src = event.target.result;
    };
    reader.onerror = () => console.error("❌ Failed to read logo file.");
    reader.readAsDataURL(file);
}