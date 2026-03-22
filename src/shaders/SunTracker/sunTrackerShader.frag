// https://github.com/ostefani/web-gl-series/tree/main/article-2/shaders
precision mediump float;

varying vec2 vSunPositionUv;
varying vec2 vpixelPosition;
varying float vSunVisible;

uniform float uAspectRatio;

void main() {    
    vec2 delta = vpixelPosition - vSunPositionUv;
    delta.x *= uAspectRatio;
    float dist = length(delta);
    if (dist <= 0.075) {
        gl_FragColor = vec4(1.0, 0.0, 0.0,  0.7 * vSunVisible); // set opacity to 0 if behind camera
    } else {
        // Transparent outside the marker
        gl_FragColor = vec4(0.0, 0.0, 0.0, 0.0);
    }
}
