// https://github.com/ostefani/web-gl-series/tree/main/article-2/shaders
precision highp float;

varying vec2 vPixelPosition;
varying float vSunVisible;
varying vec2 vSunClipSpace;

uniform float uAspectRatio;

uniform vec3 uZenith;
uniform mat4 uInverseWorldViewMatrix;
uniform mat4 uPMatrix;
uniform bool uUsePixelSize;

uniform float uSiderealTime;
uniform float uSinLat;
uniform float uCosLat;
uniform vec3 uSunDirection;

const float PI = 3.14159265358979323846; // 20 digits of PI

/* skyDirFromNdc get's the Cartesian vector corresponding to pixel location */
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

vec2 equatorialVecToRaDec(vec3 dir) {
    // Invert WWT's Coordinates.raDecTo3d():
    // x = cos(ra) * cos(dec), y = sin(dec), z = sin(ra) * cos(dec)
    float dec = asin(dir.y);
    float ra = atan(dir.z, dir.x); // atan(z/x)
    ra += 2.0 * PI;
    ra = mod(ra, 2.0 * PI);
    return vec2(ra , dec);
}

// Coordinates.equitorialToHorizon
vec2 equatorialToHorizon(vec2 raDec) {
    float ha = uSiderealTime - raDec.x; // raDec.x is RA
    float dec = raDec.y; // raDec.y is Dec
    float sinAlt = sin(dec) * uSinLat + cos(dec) * uCosLat * cos(ha);
    float altitude = asin(sinAlt);
    float cosAzimith = (sin(dec) - sin(altitude) * uSinLat) / (cos(altitude) * uCosLat);
    cosAzimith = clamp(cosAzimith, -1.0, 1.0);
    float azimuth = acos(cosAzimith);
    if (sin(ha) > 0.0) {
        azimuth = 2.0 * PI - azimuth;
    }
    return vec2(azimuth, altitude);
}
    

vec3 cyclic_warm(float t) {
    // Create 12 discrete bands
    float snapped = floor(t * 12.0) / 12.0;
    // Cosine palette for warm colors
    vec3 col = 0.5 + 0.5 * cos(6.28318 * (snapped * 0.5 + vec3(0.0, 0.1, 0.2)));
    return col;
}

vec3 debug(float t) {
    if (t < (PI / 2.0)) {
        return vec3(1.0,0.0,0.0);
    }
    return vec3(0.0,1.0,0.0);
}

float skyOpacityForSunAlt(float sinSunAltRad) {
  float civilTwilight = -6.0 * PI / 180.0; // in radians
  float astronomicalTwilight = 3.0 * civilTwilight;
  
  return clamp((1.0 + atan(PI * asin(sinSunAltRad) / (-1.0 * astronomicalTwilight))) / 2.0, 0.0 , 1.0);
}

void main() {    
    
    // For debugging: differenciate between upper and lower hemisphere // the sun position is actually 0,0 in alt,az
    // vec3 currentCoord = skyDirFromNdc(vPixelPosition); // get's the 3d sphere coordinate
    // float dist = sphericalDistance(normalize(uZenith), currentCoord); // returns angle in radians
    // vec3 color = cyclic_warm(1.0 - (dist / PI));
    // // if we are in the upper hemisphere around Alt = 90
    // if (dist < (PI/2.0)) {
    //     gl_FragColor = vec4(color, 0.5);
    //     return;
    // }
    // gl_FragColor = vec4(0.0,1.0,0.0,0.5);
    
    // For debugging: convert to alt, az and check if we are above or below the horizon
    // vec3 currentCoord = skyDirFromNdc(vPixelPosition);
    // vec2 raDec = equatorialVecToRaDec(currentCoord);
    // vec2 altAz = equatorialToHorizon(raDec);
    // if (altAz.y > 0.0) {
    //     gl_FragColor = vec4(0.0,1.0,0.0,0.5);
    // } else {
    //     gl_FragColor = vec4(1.0,0.0,0.0,0.5);
    // }
    
    // vec3 currentCoord = skyDirFromNdc(vPixelPosition);
    // float currentDotZenith = dot(normalize(uZenith), currentCoord);
    // // We can use the dot product to determine if we are above or below the horizon, since the zenith is always straight up
    // if (currentDotZenith > 0.0) {
    //     gl_FragColor = vec4(0.0,1.0,0.0,0.5);
    // } else {
    //     gl_FragColor = vec4(1.0,0.0,0.0,0.5);
    // }
    
    
    // use a smooth step to iterpolate between the two colors across the jagged boundary
    vec3 currentCoord = skyDirFromNdc(vPixelPosition);
    // sin because were doing cos = a dot b, and we want 90- that angle
    float sinAlt = dot(currentCoord, normalize(uZenith));
    float sinSunAlt = dot(normalize(uSunDirection), normalize(uZenith));

    // Blend across a small band around the horizon to avoid a jagged binary edge.
    float aa = 0.00001;
    float horizonMix = smoothstep(-aa, aa, sinAlt);
    vec4 skyColor = vec4(0.01,0.9,0.97, 0.9*skyOpacityForSunAlt(sinSunAlt));
    vec4 groundColor = vec4(0.0,1.0,0.0,0.9);
    gl_FragColor = mix(groundColor, skyColor, horizonMix);
    
    float radius = 0.0;
    bool inCircle = false;
    if (uUsePixelSize) {
        vec2 vectorSub = vPixelPosition - vSunClipSpace;
        vectorSub.x = vectorSub.x * uAspectRatio;
        float dist = length(vectorSub);
        inCircle = dist <= 0.075;
    } else {
        vec3 currentCoord = skyDirFromNdc(vPixelPosition); // get's the 3d sphere coordinate
        inCircle = sphericalDistance(normalize(uSunDirection), currentCoord) <= (15.0 / 60.) * PI / 180.0;
    }
    if (inCircle && vSunVisible > 0.5) {
        gl_FragColor = vec4(1.0,1.0,0.0, 1.0);
    }
    
}
