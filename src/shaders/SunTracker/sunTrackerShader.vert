// https://github.com/ostefani/web-gl-series/tree/main/article-2/shaders
precision highp float;

attribute vec2 aPosition;

uniform vec3 uSunPosition;
uniform mat4 uMVMatrix;
uniform mat4 uPMatrix;

varying vec2 vPixelPosition;
varying float vSunVisible;  // 1.0 if sun is in front of camera, 0.0 if behind
varying vec2 vSunClipSpace; // the sun's location in clip space

void main() {
    /* always provide the SunClipSpace position */
    vec4 sunClipSpace = uPMatrix * uMVMatrix * vec4(uSunPosition, 1.0);
    // Check if sun is in front of camera (positive w means in front)
    vSunVisible = sunClipSpace.w > 0.0 ? 1.0 : 0.0;
    
    vSunClipSpace = sunClipSpace.xy / sunClipSpace.w;

    vPixelPosition = aPosition;  // aPosition is already in NDC space [-1, 1]
    gl_Position = vec4(aPosition, 0.0, 1.0);
}

