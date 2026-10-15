// https://github.com/ostefani/web-gl-series/tree/main/article-2/shaders
precision highp float;

varying vec2 vPixelPosition;
varying float vSunVisible;
varying vec2 vSunClipSpace;

uniform float uAspectRatio;

uniform vec3 uSunPosition;
uniform mat4 uInverseWorldViewMatrix;
uniform mat4 uPMatrix;
uniform bool uUsePixelSize;

const float PI = 3.14159265358979323846; // 20 digits of PI

vec3 skyDirFromNdc(vec2 ndc) {
    // From WWTControl.transformPickPointToWorldSpace():
    vec3 viewRay = vec3(
        ndc.x / uPMatrix[0][0],
        ndc.y / uPMatrix[1][1],
        1.0
    );
    // inverse transform with with w = 0 (doesn't seem to matter)
    return normalize((uInverseWorldViewMatrix * vec4(viewRay, 0.0)).xyz);
}

float sphericalDistance(vec3 a, vec3 b) {
    return atan(length(cross(a, b)), dot(a, b));
}

// can't use this. acos and cos are numerically unstable for small angles
bool withinAngularDistance(vec3 a, vec3 b, float limit) {
    return dot(a, b) >= cos(limit);
}

void main() {    
    /* // Track the Sun in real, coordinate space
    vec3 currentCoord = skyDirFromNdc(vPixelPosition); // get's the 3d sphere coordinate
    // float dist = sphericalDistance(normalize(uSunPosition), currentCoord);
    // // 0 degrees from the sun -> white, 180 degrees away -> black
    // float value = 1.0 - dist / PI;
    // gl_FragColor = vec4(vec3(value), 0.7);
    
    bool inCircle = sphericalDistance(normalize(uSunPosition), currentCoord) <= (15.0 / 60.) * PI / 180.0;
    if (inCircle) {
        gl_FragColor = vec4(1.0,0.0,0.0, 0.7);
        return;
    } 
    gl_FragColor = vec4(0.0,0.0,0.0, 0);
    */
    
    float radius = 0.0;
    bool inCircle = false;
    if (uUsePixelSize) {
        vec2 vectorSub = vPixelPosition - vSunClipSpace;
        vectorSub.x = vectorSub.x * uAspectRatio;
        float dist = length(vectorSub);
        inCircle = dist <= 0.075;
    } else {
        vec3 currentCoord = skyDirFromNdc(vPixelPosition); // get's the 3d sphere coordinate
        // float dist = sphericalDistance(normalize(uSunPosition), currentCoord);
        inCircle = sphericalDistance(normalize(uSunPosition), currentCoord) <= (15.0 / 60.) * PI / 180.0;
    }
    
    // direction doesn't really matter, but. we want vector from sun to pixel
    // the vector a - b = c, c points from tip of b to tip of a
    
    if (inCircle) {
        gl_FragColor = vec4(1.0,0.0,0.0, 0.7 * vSunVisible);
        return;
    }
    gl_FragColor = vec4(0.0,0.0,0.0, 0);
}
