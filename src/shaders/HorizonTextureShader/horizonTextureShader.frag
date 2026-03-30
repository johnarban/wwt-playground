// https://github.com/ostefani/web-gl-series/tree/main/article-2/shaders
precision highp float;

varying vec2 vPixelPosition;
uniform mat4 uInverseWorldViewMatrix;
uniform mat4 uPMatrix;
uniform float uSiderealTime;
uniform float uSinLat;
uniform float uCosLat;
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

void main() {    
    // Start from the current fragment's screen position, convert that into a
    // 3D ray in the sky, then into local horizon coordinates.
    vec3 currentCoord = skyDirFromNdc(vPixelPosition);
    vec2 raDec = equatorialVecToRaDec(currentCoord);
    vec2 altAz = equatorialToHorizon(raDec);

    // The panorama is equirectangular in horizontal coordinates:
    // - horizontally it stores azimuth from 0 to 2*PI
    // - vertically it stores altitude from +PI/2 at the top to -PI/2 at the bottom
    //
    // So we map:
    //   u = azimuth / (2*PI)
    //   v = 0.5 - altitude / PI
    //
    // Why the v formula looks like this:
    // - altitude = 0     -> v = 0.5 (horizon in the middle)
    // - altitude = +PI/2 -> v = 0.0 (zenith at the top)
    // - altitude = -PI/2 -> v = 1.0 (nadir at the bottom)
    //
    // fract() wraps azimuth so 0 and 2*PI land on the same vertical seam.
    // clamp() keeps numerical roundoff from sampling outside the image.
    vec2 uv = vec2(
        fract(altAz.x / (2.0 * PI)),
        clamp(0.5 - (altAz.y / PI), 0.0, 1.0)
    );

    vec4 color = texture2D(uPanorama, uv);
    // if near sky blue set to transparent
    if (color.r < 0.3 && color.g > 0.5 && color.b > 0.5) {
        discard;
    }
    gl_FragColor = color;
}
