/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/naming-convention */
/* eslint-disable @typescript-eslint/no-empty-function */
import { 
  RenderContext, 
  SpaceTimeController,
  AstroCalc,
  Coordinates,
  Matrix3d
} from "@wwtelescope/engine";
import { SolarSystemObjects } from "@wwtelescope/engine-types";

import SkyFrag from "./horizonTextureShader.frag?raw";
import SkyVert from "./horizonTextureShader.vert?raw";

import {showError, setupShader, linkProgram} from '@/shaders/shader-helpers';

type SizeScale = 'screen' | 'world'

export function HorizonTextureShader() { };
export namespace HorizonTextureShader {
  export let _frag: WebGLShader | undefined;
  export let _vert: WebGLShader | undefined;
  export let _prog: WebGLProgram | undefined;
  export let initialized: boolean | undefined;
  export let panoramaLoaded: boolean | undefined;
  
  export let _buffer: WebGLBuffer;
  export let uZenith: WebGLUniformLocation;
  export let aPosition: number;
  export let projMatLoc: WebGLUniformLocation;
  export let mvMatLoc: WebGLUniformLocation;
  export let aspectRatioLoc: WebGLUniformLocation;
  export let invWorldViewMatLoc: WebGLUniformLocation;
  export let usePixelSize: WebGLUniformLocation;
  // eslint-disable-next-line prefer-const
  export let sizeScale: SizeScale = 'screen';
  export let uSiderealTimeLoc: WebGLUniformLocation;
  export let uSinLatLoc: WebGLUniformLocation;
  export let uCosLatLoc: WebGLUniformLocation;
  export let uSunDirectionLoc: WebGLUniformLocation;
  export let uPanoramaLoc: WebGLUniformLocation;
  export let panoramaTexture: WebGLTexture | undefined;
  
}


function isPowerOf2(value) {
  return (value & (value - 1)) === 0;
}


// 1. Load the texture. follow https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/Tutorial/Using_textures_in_WebGL blindly
HorizonTextureShader.initializePanoramaTexture = function (gl: WebGLRenderingContext) {
  if (HorizonTextureShader.panoramaTexture) {
    return;
  }

  const texture = gl.createTexture();
  if (!texture) {
    return;
  }

  HorizonTextureShader.panoramaTexture = texture;

  gl.bindTexture(gl.TEXTURE_2D, texture);
  const level = 0;
  const internalFormat = gl.RGBA;
  const width = 1;
  const height = 1;
  const border = 0;
  const srcFormat = gl.RGBA;
  const srcType = gl.UNSIGNED_BYTE;
  const pixel = new Uint8Array([0, 0, 0, 255]); // opaque black
  gl.texImage2D(
    gl.TEXTURE_2D,
    level,
    internalFormat,
    width,
    height,
    border,
    srcFormat,
    srcType,
    pixel,
  );


  const image = new Image();
  image.onload = () => {
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 0);
    gl.texImage2D(
      gl.TEXTURE_2D,
      level,
      internalFormat,
      srcFormat,
      srcType,
      image,
    );

    if (isPowerOf2(image.width) && isPowerOf2(image.height)) {
      // Yes, it's a power of 2. Generate mips.
      console.log('Panorama texture loaded, is power of 2, generating mipmaps');
      // it didn't do this
      gl.generateMipmap(gl.TEXTURE_2D);
    } else {
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      // gl.NEAREST is also allowed, instead of gl.LINEAR, as neither mipmap.
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      // Prevents s-coordinate wrapping (repeating).
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      // Prevents t-coordinate wrapping (repeating).
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    }
    HorizonTextureShader.panoramaLoaded = true;
  };
  image.src = './panorama.png';
  // image.src = '/Milky_Way_360_equirectangular_rendering_with_foreground_stars_removed.png';
};

HorizonTextureShader.init = function (renderContext: RenderContext) {
  const gl = renderContext.gl;
  
  // Create shaders and link program
  HorizonTextureShader._frag = setupShader(gl, gl.FRAGMENT_SHADER, SkyFrag)!;
  HorizonTextureShader._vert = setupShader(gl, gl.VERTEX_SHADER, SkyVert)!;
  const prog = gl.createProgram();
  HorizonTextureShader._prog = prog;
  gl.attachShader(HorizonTextureShader._prog, HorizonTextureShader._vert);
  gl.attachShader(HorizonTextureShader._prog, HorizonTextureShader._frag);
  linkProgram(gl, HorizonTextureShader._prog);
  
  // setup the field we will draw on with gl.drawArrays(gl.TRIANGLES, 0, 6);
  HorizonTextureShader.projMatLoc = gl.getUniformLocation(prog, 'uPMatrix')!;
  HorizonTextureShader.mvMatLoc = gl.getUniformLocation(prog, 'uMVMatrix')!;
  HorizonTextureShader.uZenith = gl.getUniformLocation(prog, 'uZenith')!;
  HorizonTextureShader.aspectRatioLoc = gl.getUniformLocation(prog, 'uAspectRatio')!;
  HorizonTextureShader.invWorldViewMatLoc = gl.getUniformLocation(prog, 'uInverseWorldViewMatrix')!;
  HorizonTextureShader.usePixelSize = gl.getUniformLocation(prog, 'uUsePixelSize')!;
  HorizonTextureShader.aPosition = gl.getAttribLocation(prog, 'aPosition');
  
  HorizonTextureShader.uSiderealTimeLoc = gl.getUniformLocation(prog, 'uSiderealTime')!;
  HorizonTextureShader.uSinLatLoc = gl.getUniformLocation(prog, 'uSinLat')!;
  HorizonTextureShader.uCosLatLoc = gl.getUniformLocation(prog, 'uCosLat')!;
  HorizonTextureShader.uSunDirectionLoc = gl.getUniformLocation(prog, 'uSunDirection')!;
  HorizonTextureShader.uPanoramaLoc = gl.getUniformLocation(prog, 'uPanorama')!;
  
  HorizonTextureShader.initialized = true;
};

HorizonTextureShader.setScale = function (scale: SizeScale) {
  HorizonTextureShader.sizeScale = scale;
};

HorizonTextureShader.use = function (renderContext: RenderContext, lat: number, lon: number) {
  const gl = renderContext.gl;
  
  if (!HorizonTextureShader.initialized) {
    HorizonTextureShader.init(renderContext);
    console.log('HorizonTextureShader initialized');
  }
  
  if (!HorizonTextureShader._prog) return;
  
  gl.useProgram(HorizonTextureShader._prog);
  
  // 2. Load the texture if we haven't already
  HorizonTextureShader.initializePanoramaTexture(gl);
  
  // setup matrices
  const mvMat = Matrix3d.multiplyMatrix(renderContext.get_world(), renderContext.get_view());
  const pMat = renderContext.get_projection();
  const inverseWorldView = Matrix3d.invertMatrix(mvMat);
  gl.uniformMatrix4fv(HorizonTextureShader.mvMatLoc, false, mvMat.floatArray()); // transpose = false;
  gl.uniformMatrix4fv(HorizonTextureShader.projMatLoc, false, pMat.floatArray()); // transpose = false;
  gl.uniform1f(HorizonTextureShader.aspectRatioLoc, gl.canvas.width / gl.canvas.height);
  gl.uniformMatrix4fv(HorizonTextureShader.invWorldViewMatLoc, false, inverseWorldView.floatArray()); // transpose = false;
  gl.uniform1i(HorizonTextureShader.usePixelSize, HorizonTextureShader.sizeScale === 'screen' ? 1 : 0);
  
  
  // ---- Zenith direction (unit vector in WWT equatorial coords) ----
  const jNow = SpaceTimeController.get_jNow();
  const location = SpaceTimeController.get_location(); // get_lat, get_lng return degrees
  gl.uniform1f(HorizonTextureShader.uSinLatLoc, Math.sin(location.get_lat() * Math.PI / 180));
  gl.uniform1f(HorizonTextureShader.uCosLatLoc, Math.cos(location.get_lat() * Math.PI / 180));
  
  const siderealTime = Coordinates.mstFromUTC2(
    SpaceTimeController.get_now(),
    location.get_lng()
  );
  gl.uniform1f(HorizonTextureShader.uSiderealTimeLoc, siderealTime * Math.PI / 180); // convert to radians
  
  const sunRaDec = AstroCalc.getPlanet(jNow, SolarSystemObjects.sun, location.get_lat(), location.get_lng(), 0);
  const sunVec = Coordinates.raDecTo3d(sunRaDec.RA, sunRaDec.dec);
  gl.uniform3fv(HorizonTextureShader.uSunDirectionLoc, new Float32Array([sunVec.x, sunVec.y, sunVec.z]));
  const zenithRaDec = Coordinates.horizonToEquitorial(
    Coordinates.fromLatLng(89.99999,0),  // if exactly 90, it breaks
    location, 
    SpaceTimeController.get_now() // don't round trip jNow through julianToUtc, it for some reason causes it to be off by the browser's timezone offset :/
  );
  const zenitVec = Coordinates.raDecTo3d(zenithRaDec.get_RA(), zenithRaDec.get_dec()); // raDecTo3d takes ra in hours and declination in degrees, return a unit vector
  gl.uniform3fv(HorizonTextureShader.uZenith, new Float32Array([zenitVec.x, zenitVec.y, zenitVec.z]));
  
  // 3. Bind the texture to a texture unit and set the sampler uniform
  if (HorizonTextureShader.panoramaTexture) {
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, HorizonTextureShader.panoramaTexture);
    gl.uniform1i(HorizonTextureShader.uPanoramaLoc, 0);
  }
  

  // ---- Draw ----
  // Full-screen quad vertices
  const vertices = new Float32Array([
    -1, -1,  
    1, -1,  
    -1, 1,
    -1,  1,  
    1, -1,  
    1, 1,
  ]);
  
  HorizonTextureShader._buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, HorizonTextureShader._buffer);
  gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
  gl.enableVertexAttribArray(HorizonTextureShader.aPosition);
  gl.vertexAttribPointer(HorizonTextureShader.aPosition, 2, gl.FLOAT, false, 0, 0);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  gl.disable(gl.DEPTH_TEST);
  gl.drawArrays(gl.TRIANGLES, 0, 6);
  gl.bindBuffer(gl.ARRAY_BUFFER, null);
};
