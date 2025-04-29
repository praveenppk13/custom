import * as THREE from "three";

export let currentText = {
    text: "",
    color: "#000000",
    option: "front",
    positions: [],
    fontSize: 30
};

export let currentTexture = {
    patternType: "",
    colors: []
};

export let currentLogo = {
    image: null,
    position: "front",
    width: 120,
    height: 120,
    opacity: 1,
    xOffset: 0,
    yOffset: 0
};

export function setText(text, color, option, positions, fontSize = 30) {
    currentText.text = text;
    currentText.color = color;
    currentText.option = option;
    currentText.positions = positions;
    currentText.fontSize = fontSize;
}

export function setTexture(patternType, colors) {
    currentTexture.patternType = patternType;
    currentTexture.colors = colors;
}

export function setLogo({ image, position, width, height, opacity, xOffset, yOffset }) {
    currentLogo.image = image;
    currentLogo.position = position;
    currentLogo.width = width;
    currentLogo.height = height;
    currentLogo.opacity = opacity;
    currentLogo.xOffset = xOffset;
    currentLogo.yOffset = yOffset;
}

export function clearText() {
    currentText.text = "";
    currentText.color = "#000000";
    currentText.option = "front";
    currentText.positions = [];
    currentText.fontSize = 30;
}

export function clearTexture() {
    currentTexture.patternType = "";
    currentTexture.colors = [];
}

export function clearLogo() {
    currentLogo.image = null;
    currentLogo.position = "front";
    currentLogo.width = 120;
    currentLogo.height = 120;
    currentLogo.opacity = 1;
    currentLogo.xOffset = 0;
    currentLogo.yOffset = 0;
}