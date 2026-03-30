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
uniform sampler2D uPanorama;

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
    // This gives the pixel's sky direction in equatorial coordinates as
    // right ascension (ra) and declination (dec), both in radians.
    float dec = asin(dir.y);
    float ra = atan(dir.z, dir.x); // atan(z/x)
    ra += 2.0 * PI;
    ra = mod(ra, 2.0 * PI);
    return vec2(ra , dec);
}

// Coordinates.equitorialToHorizon
vec2 equatorialToHorizon(vec2 raDec) {
    // Convert equatorial coordinates into the local horizontal frame:
    // azimuth = angle around the horizon, altitude = angle above/below it.
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

float skyOpacityForSunAlt(float sinSunAltRad) {
    float civilTwilight = -6.0 * PI / 180.0;
    float astronomicalTwilight = 3.0 * civilTwilight;
    return clamp((1.0 + atan(PI * asin(sinSunAltRad) / (-1.0 * astronomicalTwilight))) / 2.0, 0.0, 1.0);
}

float panoramaBrightnessForSunAlt(float sinSunAltRad) {
    // Reuse the twilight curve, but keep a floor so the panorama darkens
    // at low sun altitude instead of disappearing into black.
    float daylight = skyOpacityForSunAlt(sinSunAltRad);
    return mix(0.20, 1.0, daylight);
}

void main() {    
    vec3 currentCoord = skyDirFromNdc(vPixelPosition);
    vec2 raDec = equatorialVecToRaDec(currentCoord);
    vec2 altAz = equatorialToHorizon(raDec);

    vec2 uv = vec2(
        fract(altAz.x / (2.0 * PI)),
        clamp(0.5 - (altAz.y / PI), 0.0, 1.0)
    );

    float sinAlt = dot(currentCoord, normalize(uZenith));
    float sinSunAlt = dot(normalize(uSunDirection), normalize(uZenith));

    float aa = 0.00001;
    float horizonMix = smoothstep(-aa, aa, sinAlt);
    vec4 skyColor = vec4(0.01, 0.9, 0.97, 0.9 * skyOpacityForSunAlt(sinSunAlt));
    vec4 groundColor = vec4(105.0 / 255.0, 97.0 / 255.0, 18.0 / 255.0, 0.9);
    vec4 skyGroundColor = mix(groundColor, skyColor, horizonMix);

    vec4 panoramaColor = texture2D(uPanorama, uv);
    panoramaColor.rgb *= panoramaBrightnessForSunAlt(sinSunAlt);

    bool inCircle = false;
    if (uUsePixelSize) {
        vec2 vectorSub = vPixelPosition - vSunClipSpace;
        vectorSub.x = vectorSub.x * uAspectRatio;
        float dist = length(vectorSub);
        inCircle = dist <= 0.075;
    } else {
        inCircle = sphericalDistance(normalize(uSunDirection), currentCoord) <= (15.0 / 60.0) * PI / 180.0;
    }

    // The sun disk lives in the flat background layer, so the panorama can
    // cover it anywhere the texture is opaque.
    if (inCircle && vSunVisible > 0.5) {
        skyGroundColor = vec4(1.0, 1.0, 0.0, 1.0);
    }

    // The PNG alpha decides where the panorama overrides the procedural
    // sky/ground colors and where the flat background shows through.
    gl_FragColor = mix(skyGroundColor, panoramaColor, clamp(panoramaColor.a*2.0, 0.0, 1.0));
}
