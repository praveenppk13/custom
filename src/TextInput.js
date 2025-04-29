import * as THREE from "three";
import { models, currentModelName } from "./model.js";
import { currentText, setText, clearText } from "./state.js";
import { applyToTShirt } from "./GUI.js";

export function setupTextInput() {
    const textInput = document.getElementById("textInput");
    const applyTextButton = document.getElementById("applyTextButton");
    const textColorPicker = document.getElementById("textColorPicker");
    const printOption = document.getElementById("printOption");
    const removeTextButton = document.getElementById("removeTextButton");
    const textXOffset = document.getElementById("textXOffset");
    const textYOffset = document.getElementById("textYOffset");
    const textFontSize = document.getElementById("textFontSize");
    const textXOffsetValue = document.getElementById("textXOffsetValue");
    const textYOffsetValue = document.getElementById("textYOffsetValue");
    const textFontSizeValue = document.getElementById("textFontSizeValue");

    if (!textInput || !applyTextButton || !textColorPicker || !printOption || !removeTextButton || !textXOffset || !textYOffset || !textFontSize) {
        console.error("❌ One or more DOM elements not found:", { textInput, applyTextButton, textColorPicker, printOption, removeTextButton, textXOffset, textYOffset, textFontSize });
        return;
    }

    // Update slider values in real-time for existing text
    const updateSliderValue = (slider, valueSpan) => {
        slider.addEventListener('input', () => {
            valueSpan.textContent = slider.value;
            if (currentText.text) { // Only update if text exists
                applyTextWithCurrentSettings();
            }
        });
    };
    updateSliderValue(textXOffset, textXOffsetValue);
    updateSliderValue(textYOffset, textYOffsetValue);
    updateSliderValue(textFontSize, textFontSizeValue);

    // Update text color and print option in real-time for existing text
    textColorPicker.addEventListener('input', () => {
        if (currentText.text) {
            applyTextWithCurrentSettings();
        }
    });
    printOption.addEventListener('change', () => {
        if (currentText.text) {
            applyTextWithCurrentSettings();
        }
    });

    function applyTextWithCurrentSettings() {
        const text = textInput.value.trim();
        const color = textColorPicker.value;
        const option = printOption.value;
        const xOffset = parseFloat(textXOffset.value);
        const yOffset = parseFloat(textYOffset.value);
        const fontSize = parseFloat(textFontSize.value);

        if (text) {
            const positions = calculateTextPositions(option, 1024, 256, xOffset, yOffset);
            setText(text, color, option, positions, fontSize);
            applyToTShirt();
            console.log(`📝 Text updated: "${text}", Color: ${color}, Option: ${option}, X: ${xOffset}, Y: ${yOffset}, FontSize: ${fontSize} for ${currentModelName}`);
        }
    }

    // Apply new text only on button click
    applyTextButton.addEventListener('click', () => {
        const text = textInput.value.trim();
        if (text) {
            applyTextWithCurrentSettings();
        } else {
            console.warn("⚠️ Please enter some text.");
        }
    });

    removeTextButton.addEventListener("click", () => {
        const currentModel = models[currentModelName];
        if (currentModel) {
            clearText();
            applyToTShirt();
            console.log("🗑️ Text removed from T-shirt, preserving color, texture, and logo.");
        } else {
            console.warn("⚠️ T-shirt model not loaded.");
        }
    });
}

function calculateTextPositions(option, width, height, xOffset = 0, yOffset = 0) {
    const positions = [];
    const frontX = width * 0.25; // 276
    const backX = width * 0.75;  // 723
    const baseY = height / 2;

    const frontOffsetX = 50;
    const frontOffsetY = 35;
    const backOffsetX = 0;
    const backOffsetY = 20;

    switch (option) {
        case "front":
            positions.push({ x: frontX + frontOffsetX + xOffset, y: baseY + frontOffsetY + yOffset });
            break;
        case "back":
            positions.push({ x: backX + backOffsetX + xOffset, y: baseY + backOffsetY + yOffset });
            break;
        case "both":
            positions.push({ x: frontX + frontOffsetX + xOffset, y: baseY + frontOffsetY + yOffset });
            positions.push({ x: backX + backOffsetX + xOffset, y: baseY + backOffsetY + yOffset });
            break;
        case "many":
            const printCount = Math.floor(Math.random() * 6) + 5;
            for (let i = 0; i < printCount; i++) {
                const randX = Math.random() * width + xOffset;
                const randY = Math.random() * height + yOffset;
                positions.push({ x: randX, y: randY });
            }
            break;
    }
    return positions;
}