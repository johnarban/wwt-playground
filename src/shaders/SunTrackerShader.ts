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

import SkyFrag from "./sunTrackerShader.frag?raw";
import SkyVert from "./sunTrackerShader.vert?raw";

import {showError, setupShader, linkProgram} from './shader-helpers';

export function SunTrackerShader() { };
export namespace SunTrackerShader {
  export let _frag: WebGLShader | undefined;
  export let _vert: WebGLShader | undefined;
  export let _prog: WebGLProgram | undefined;
  export let initialized: boolean | undefined;
  
  export let _buffer: WebGLBuffer;
  export let uSunPosition: WebGLUniformLocation;
  export let aPosition: number;
  export let projMatLoc: WebGLUniformLocation;
  export let mvMatLoc: WebGLUniformLocation;
  
  
}

SunTrackerShader.init = function (renderContext: RenderContext) {
  const gl = renderContext.gl;
  
  // Create shaders and link program
  SunTrackerShader._frag = setupShader(gl, gl.FRAGMENT_SHADER, SkyFrag)!;
  SunTrackerShader._vert = setupShader(gl, gl.VERTEX_SHADER, SkyVert)!;
  const prog = gl.createProgram();
  SunTrackerShader._prog = prog;
  gl.attachShader(SunTrackerShader._prog, SunTrackerShader._vert);
  gl.attachShader(SunTrackerShader._prog, SunTrackerShader._frag);
  linkProgram(gl, SunTrackerShader._prog);
  
  // setup the field we will draw on with gl.drawArrays(gl.TRIANGLES, 0, 6);
  SunTrackerShader.projMatLoc = gl.getUniformLocation(prog, 'uPMatrix')!;
  SunTrackerShader.mvMatLoc = gl.getUniformLocation(prog, 'uMVMatrix')!;
  SunTrackerShader.uSunPosition = gl.getUniformLocation(prog, 'uSunPosition')!;
  SunTrackerShader.aPosition = gl.getAttribLocation(prog, 'aPosition');
  
  SunTrackerShader.initialized = true;
};

SunTrackerShader.use = function (renderContext: RenderContext, lat: number, lon: number) {
  const gl = renderContext.gl;
  
  if (!SunTrackerShader.initialized) {
    SunTrackerShader.init(renderContext);
    console.log('SunTrackerShader initialized');
  }
  
  if (!SunTrackerShader._prog) return;
  
  gl.useProgram(SunTrackerShader._prog);
  
  // setup matrices
  const mvMat = Matrix3d.multiplyMatrix(renderContext.get_world(), renderContext.get_view());
  const pMat = renderContext.get_projection();
  gl.uniformMatrix4fv(SunTrackerShader.mvMatLoc, false, mvMat.floatArray()); // transpose = false;
  gl.uniformMatrix4fv(SunTrackerShader.projMatLoc, false, pMat.floatArray()); // transpose = false;
  
  
  // ---- Zenith direction (unit vector in WWT equatorial coords) ----
  const jNow = SpaceTimeController.get_jNow();
  const location = SpaceTimeController.get_location(); // get_lat, get_lng return degrees
  const sunRaDec = AstroCalc.getPlanet(jNow, SolarSystemObjects.sun, location.get_lat(), location.get_lng(), 0);
  const sunVec = Coordinates.raDecTo3d(sunRaDec.RA, sunRaDec.dec);
  
  gl.uniform3fv(SunTrackerShader.uSunPosition, new Float32Array([sunVec.x, sunVec.y, sunVec.z]));
  
  
  // ---- Draw ----
  // Full-screen quad vertices
  const vertices = new Float32Array([
    -1, -1,   1, -1,   -1, 1,
    -1,  1,   1, -1,    1, 1,
  ]);
  
  SunTrackerShader._buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, SunTrackerShader._buffer);
  gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
  gl.enableVertexAttribArray(SunTrackerShader.aPosition);
  gl.vertexAttribPointer(SunTrackerShader.aPosition, 2, gl.FLOAT, false, 0, 0);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  gl.disable(gl.DEPTH_TEST);
  gl.drawArrays(gl.TRIANGLES, 0, 6);
  gl.bindBuffer(gl.ARRAY_BUFFER, null);
};
