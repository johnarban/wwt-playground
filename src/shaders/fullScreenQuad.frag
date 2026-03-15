#version 300 es
// https://github.com/ostefani/web-gl-series/tree/main/article-2/shaders
precision mediump float;
in vec2 vUV;
out vec4 fragColor;
void main() {
    // Render a simple gradient: red = U, green = V, blue = 0.5
    fragColor = vec4(vUV.x, vUV.y, 0.5, 1);
}