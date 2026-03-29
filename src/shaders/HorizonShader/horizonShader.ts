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

import SkyFrag from "./horizonShader.frag?raw";
import SkyVert from "./horizonShader.vert?raw";

import {showError, setupShader, linkProgram} from '@/shaders/shader-helpers';

type SizeScale = 'screen' | 'world'

export function HorizonShader() { };
export namespace HorizonShader {
  export let _frag: WebGLShader | undefined;
  export let _vert: WebGLShader | undefined;
  export let _prog: WebGLProgram | undefined;
  export let initialized: boolean | undefined;
  
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
  
  
}

HorizonShader.init = function (renderContext: RenderContext) {
  const gl = renderContext.gl;
  
  // Create shaders and link program
  HorizonShader._frag = setupShader(gl, gl.FRAGMENT_SHADER, SkyFrag)!;
  HorizonShader._vert = setupShader(gl, gl.VERTEX_SHADER, SkyVert)!;
  const prog = gl.createProgram();
  HorizonShader._prog = prog;
  gl.attachShader(HorizonShader._prog, HorizonShader._vert);
  gl.attachShader(HorizonShader._prog, HorizonShader._frag);
  linkProgram(gl, HorizonShader._prog);
  
  // setup the field we will draw on with gl.drawArrays(gl.TRIANGLES, 0, 6);
  HorizonShader.projMatLoc = gl.getUniformLocation(prog, 'uPMatrix')!;
  HorizonShader.mvMatLoc = gl.getUniformLocation(prog, 'uMVMatrix')!;
  HorizonShader.uZenith = gl.getUniformLocation(prog, 'uZenith')!;
  HorizonShader.aspectRatioLoc = gl.getUniformLocation(prog, 'uAspectRatio')!;
  HorizonShader.invWorldViewMatLoc = gl.getUniformLocation(prog, 'uInverseWorldViewMatrix')!;
  HorizonShader.usePixelSize = gl.getUniformLocation(prog, 'uUsePixelSize')!;
  HorizonShader.aPosition = gl.getAttribLocation(prog, 'aPosition');
  
  HorizonShader.uSiderealTimeLoc = gl.getUniformLocation(prog, 'uSiderealTime')!;
  HorizonShader.uSinLatLoc = gl.getUniformLocation(prog, 'uSinLat')!;
  HorizonShader.uCosLatLoc = gl.getUniformLocation(prog, 'uCosLat')!;
  HorizonShader.uSunDirectionLoc = gl.getUniformLocation(prog, 'uSunDirection')!;
  
  HorizonShader.initialized = true;
};

HorizonShader.setScale = function (scale: SizeScale) {
  HorizonShader.sizeScale = scale;
};

HorizonShader.use = function (renderContext: RenderContext, lat: number, lon: number) {
  const gl = renderContext.gl;
  
  if (!HorizonShader.initialized) {
    HorizonShader.init(renderContext);
    console.log('HorizonShader initialized');
  }
  
  if (!HorizonShader._prog) return;
  
  gl.useProgram(HorizonShader._prog);
  
  // setup matrices
  const mvMat = Matrix3d.multiplyMatrix(renderContext.get_world(), renderContext.get_view());
  const pMat = renderContext.get_projection();
  const inverseWorldView = Matrix3d.invertMatrix(mvMat);
  gl.uniformMatrix4fv(HorizonShader.mvMatLoc, false, mvMat.floatArray()); // transpose = false;
  gl.uniformMatrix4fv(HorizonShader.projMatLoc, false, pMat.floatArray()); // transpose = false;
  gl.uniform1f(HorizonShader.aspectRatioLoc, gl.canvas.width / gl.canvas.height);
  gl.uniformMatrix4fv(HorizonShader.invWorldViewMatLoc, false, inverseWorldView.floatArray()); // transpose = false;
  gl.uniform1i(HorizonShader.usePixelSize, HorizonShader.sizeScale === 'screen' ? 1 : 0);
  
  
  // ---- Zenith direction (unit vector in WWT equatorial coords) ----
  const jNow = SpaceTimeController.get_jNow();
  const location = SpaceTimeController.get_location(); // get_lat, get_lng return degrees
  gl.uniform1f(HorizonShader.uSinLatLoc, Math.sin(location.get_lat() * Math.PI / 180));
  gl.uniform1f(HorizonShader.uCosLatLoc, Math.cos(location.get_lat() * Math.PI / 180));
  
  const siderealTime = Coordinates.mstFromUTC2(
    SpaceTimeController.get_now(),
    location.get_lng()
  );
  gl.uniform1f(HorizonShader.uSiderealTimeLoc, siderealTime * Math.PI / 180); // convert to radians
  
  const sunRaDec = AstroCalc.getPlanet(jNow, SolarSystemObjects.sun, location.get_lat(), location.get_lng(), 0);
  const sunVec = Coordinates.raDecTo3d(sunRaDec.RA, sunRaDec.dec);
  gl.uniform3fv(HorizonShader.uSunDirectionLoc, new Float32Array([sunVec.x, sunVec.y, sunVec.z]));
  const zenithRaDec = Coordinates.horizonToEquitorial(
    Coordinates.fromLatLng(89.99999,0),  // if exactly 90, it breaks
    location, 
    SpaceTimeController.get_now() // don't round trip jNow through julianToUtc, it for some reason causes it to be off by the browser's timezone offset :/
  );
  const zenitVec = Coordinates.raDecTo3d(zenithRaDec.get_RA(), zenithRaDec.get_dec()); // raDecTo3d takes ra in hours and declination in degrees, return a unit vector
  gl.uniform3fv(HorizonShader.uZenith, new Float32Array([zenitVec.x, zenitVec.y, zenitVec.z]));
  

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
  
  HorizonShader._buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, HorizonShader._buffer);
  gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
  gl.enableVertexAttribArray(HorizonShader.aPosition);
  gl.vertexAttribPointer(HorizonShader.aPosition, 2, gl.FLOAT, false, 0, 0);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  gl.disable(gl.DEPTH_TEST);
  gl.drawArrays(gl.TRIANGLES, 0, 6);
  gl.bindBuffer(gl.ARRAY_BUFFER, null);
};
