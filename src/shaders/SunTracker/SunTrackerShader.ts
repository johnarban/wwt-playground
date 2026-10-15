/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/naming-convention */
import { RenderContext, SpaceTimeController, AstroCalc, Coordinates, Matrix3d } from "@wwtelescope/engine";
import { SolarSystemObjects } from "@wwtelescope/engine-types";

import SkyFrag from "./sunTrackerShader.frag?raw";
import SkyVert from "./sunTrackerShader.vert?raw";

import { setupShader, linkProgram, createQuadVao, drawQuad } from "../shader-helpers";

type SizeScale = "screen" | "world";

export function SunTrackerShader() {}
// declare (type-only) so Oxc/Vite 8 can strip it; the members are set on the function at runtime
export declare namespace SunTrackerShader {
  export let _frag: WebGLShader | undefined;
  export let _vert: WebGLShader | undefined;
  export let _prog: WebGLProgram | undefined;
  export let initialized: boolean | undefined;

  export let _vao: WebGLVertexArrayObject;
  export let uSunPosition: WebGLUniformLocation;
  export let aPosition: number;
  export let projMatLoc: WebGLUniformLocation;
  export let mvMatLoc: WebGLUniformLocation;
  export let aspectRatioLoc: WebGLUniformLocation;
  export let invWorldViewMatLoc: WebGLUniformLocation;
  export let usePixelSize: WebGLUniformLocation;
  export let sizeScale: SizeScale;
}
SunTrackerShader.sizeScale = "screen";

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
  SunTrackerShader.projMatLoc = gl.getUniformLocation(prog, "uPMatrix")!;
  SunTrackerShader.mvMatLoc = gl.getUniformLocation(prog, "uMVMatrix")!;
  SunTrackerShader.uSunPosition = gl.getUniformLocation(prog, "uSunPosition")!;
  SunTrackerShader.aspectRatioLoc = gl.getUniformLocation(prog, "uAspectRatio")!;
  SunTrackerShader.invWorldViewMatLoc = gl.getUniformLocation(prog, "uInverseWorldViewMatrix")!;
  SunTrackerShader.usePixelSize = gl.getUniformLocation(prog, "uUsePixelSize")!;
  SunTrackerShader.aPosition = gl.getAttribLocation(prog, "aPosition");
  // the quad (vao + buffer) is made once here, not every frame
  SunTrackerShader._vao = createQuadVao(gl, SunTrackerShader.aPosition);

  SunTrackerShader.initialized = true;
};

SunTrackerShader.setScale = function (scale: SizeScale) {
  SunTrackerShader.sizeScale = scale;
};

SunTrackerShader.use = function (renderContext: RenderContext, lat: number, lon: number) {
  const gl = renderContext.gl;

  if (!SunTrackerShader.initialized) {
    SunTrackerShader.init(renderContext);
    console.log("SunTrackerShader initialized");
  }

  if (!SunTrackerShader._prog) return;

  gl.useProgram(SunTrackerShader._prog);

  // setup matrices
  const mvMat = Matrix3d.multiplyMatrix(renderContext.get_world(), renderContext.get_view());
  const pMat = renderContext.get_projection();
  const inverseWorldView = Matrix3d.invertMatrix(mvMat);
  gl.uniformMatrix4fv(SunTrackerShader.mvMatLoc, false, mvMat.floatArray()); // transpose = false;
  gl.uniformMatrix4fv(SunTrackerShader.projMatLoc, false, pMat.floatArray()); // transpose = false;
  gl.uniform1f(SunTrackerShader.aspectRatioLoc, gl.canvas.width / gl.canvas.height);
  gl.uniformMatrix4fv(SunTrackerShader.invWorldViewMatLoc, false, inverseWorldView.floatArray()); // transpose = false;
  gl.uniform1i(SunTrackerShader.usePixelSize, SunTrackerShader.sizeScale === "screen" ? 1 : 0);

  // ---- Zenith direction (unit vector in WWT equatorial coords) ----
  const jNow = SpaceTimeController.get_jNow();
  const location = SpaceTimeController.get_location(); // get_lat, get_lng return degrees
  const sunRaDec = AstroCalc.getPlanet(jNow, SolarSystemObjects.sun, location.get_lat(), location.get_lng(), 0);
  const sunVec = Coordinates.raDecTo3d(sunRaDec.RA, sunRaDec.dec);

  gl.uniform3fv(SunTrackerShader.uSunPosition, new Float32Array([sunVec.x, sunVec.y, sunVec.z]));

  // ---- Draw ----
  // full-screen quad, blended over what is already drawn
  drawQuad(gl, SunTrackerShader._vao);
};
