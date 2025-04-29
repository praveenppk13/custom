import * as THREE from "three";
import { models, currentModelName } from "./model.js";
import { setTexture, clearTexture } from "./state.js";
import { applyToTShirt } from "./GUI.js";

export function setupTextureInput() {
    const textureInput = document.getElementById("textureInput");
    const applyTextureButton = document.getElementById("applyTextureButton");
    const texturePatternOption = document.getElementById("texturePatternOption");
    const removeTextureButton = document.getElementById("removeTextureButton");

    if (!textureInput || !applyTextureButton || !texturePatternOption || !removeTextureButton) {
        console.error("❌ One or more DOM elements not found:", { textureInput, applyTextureButton, texturePatternOption, removeTextureButton });
        return;
    }

    applyTextureButton.addEventListener("click", () => {
        const currentModel = models[currentModelName];
        if (!currentModel) {
            console.warn("⚠️ T-shirt model not loaded.");
            return;
        }

        const file = textureInput.files[0];
        if (file) {
            if (!file.type.startsWith("image/")) {
                alert("Only image files are allowed!");
                return;
            }
            applyAdvancedTexture(file, texturePatternOption.value);
        } else {
            console.warn("⚠️ Please select an image file.");
        }
    });

    removeTextureButton.addEventListener("click", () => {
        const currentModel = models[currentModelName];
        if (currentModel) {
            clearTexture();
            applyToTShirt();
            console.log("🗑️ Texture removed from T-shirt, preserving color, text, and logo.");
        } else {
            console.warn("⚠️ T-shirt model not loaded.");
        }
    });
}

function applyAdvancedTexture(file, patternType) {
    const reader = new FileReader();
    reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
            const colors = extractAdvancedColors(img, 5);
            setTexture(patternType, colors);
            applyToTShirt();
            console.log(`🌟 Texture applied to T-shirt: ${patternType}`);
        };
        img.src = event.target.result;
    };
    reader.readAsDataURL(file);
}

function extractAdvancedColors(image, numClusters = 5) {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    canvas.width = image.width;
    canvas.height = image.height;
    ctx.drawImage(image, 0, 0);

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    const pixels = [];
    for (let i = 0; i < imageData.length; i += 20) {
        pixels.push([imageData[i], imageData[i + 1], imageData[i + 2]]);
    }

    const centroids = [];
    for (let i = 0; i < numClusters; i++) {
        centroids.push(pixels[Math.floor(Math.random() * pixels.length)]);
    }

    const clusters = Array(numClusters).fill().map(() => []);
    pixels.forEach((pixel) => {
        let minDist = Infinity;
        let clusterIdx = 0;
        centroids.forEach((centroid, idx) => {
            const dist = Math.sqrt(
                (pixel[0] - centroid[0]) ** 2 +
                (pixel[1] - centroid[1]) ** 2 +
                (pixel[2] - centroid[2]) ** 2
            );
            if (dist < minDist) {
                minDist = dist;
                clusterIdx = idx;
            }
        });
        clusters[clusterIdx].push(pixel);
    });

    return clusters.map((cluster) => {
        const avg = cluster.reduce(
            (acc, [r, g, b]) => [acc[0] + r, acc[1] + g, acc[2] + b],
            [0, 0, 0]
        );
        const count = cluster.length || 1;
        return new THREE.Color(avg[0] / count / 255, avg[1] / count / 255, avg[2] / count / 255);
    });
}