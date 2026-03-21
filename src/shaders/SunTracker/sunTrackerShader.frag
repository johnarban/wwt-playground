// https://github.com/ostefani/web-gl-series/tree/main/article-2/shaders
precision mediump float;

varying vec2 vSunPositionUv;
varying vec2 vpixelPosition;
varying float vSunVisible;

void main() {    
    float dist = length(vpixelPosition - vSunPositionUv); 
    if (dist <= 0.075) {
        gl_FragColor = vec4(1.0, 0.0, 0.0,  0.7 * vSunVisible); // set opacity to 0 if behind camera
    } else {
        // Transparent outside the marker
        gl_FragColor = vec4(0.0, 0.0, 0.0, 0.0);
    }
}
