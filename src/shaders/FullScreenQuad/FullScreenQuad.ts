/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/naming-convention */
import {
  Color,
  Coordinates,
  RenderContext,
  Settings,
  SpaceTimeController,
  Vector3d,
  WWTControl,
} from "@wwtelescope/engine";

import SimpleFrag from "./fullScreenQuad.frag?raw";
import SimpleVert from "./fullScreenQuad.vert?raw";

import { setupShader, linkProgram, createQuadVao, drawQuad } from "../shader-helpers";

// broadly following https://ostefani.dev/tech-notes/webgl-drawing-full-screen-quad
// set it up like WWT does. but a class would be better i think
/**
 * Setup a full screen quad shader so that we can draw to it directly.
 * The vertices with drawArrays gl.TRIANGLE, drow the triangles
 * the fragment shader says how to color them
 *
 */
export function FullScreenQuad() {}
// declare (type-only) so Oxc/Vite 8 can strip it; the members are set on the function at runtime
export declare namespace FullScreenQuad {
  export let _frag: WebGLShader | undefined;
  export let _vert: WebGLShader | undefined;
  export let _prog: WebGLProgram | undefined;
  export let initialized: boolean | undefined;
  export let _vao: WebGLVertexArrayObject | undefined;
}

FullScreenQuad.init = function (renderContext: RenderContext) {
  const gl = renderContext.gl;

  // create shaders and link program
  FullScreenQuad._frag = setupShader(gl, gl.FRAGMENT_SHADER, SimpleFrag)!;
  FullScreenQuad._vert = setupShader(gl, gl.VERTEX_SHADER, SimpleVert)!;
  FullScreenQuad._prog = gl.createProgram();
  gl.attachShader(FullScreenQuad._prog, FullScreenQuad._vert);
  gl.attachShader(FullScreenQuad._prog, FullScreenQuad._frag);
  linkProgram(gl, FullScreenQuad._prog);
  // gl.useProgram(FullScreenQuad._prog); // does not need this one. but it does need it in .use otherwise it get really flashy
  // gl.enable(gl.BLEND);
  // gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  // the quad (vao + buffer) is made once here, not every frame
  const aPositon = gl.getAttribLocation(FullScreenQuad._prog, "aPosition");
  FullScreenQuad._vao = createQuadVao(gl, aPositon);
  FullScreenQuad.initialized = true;
};

FullScreenQuad.use = function (renderContext: RenderContext) {
  const gl = renderContext.gl;
  if (gl != null) {
    if (!FullScreenQuad.initialized) {
      FullScreenQuad.init(renderContext);
      console.log("using full screen quad");
    }
    gl.useProgram(FullScreenQuad._prog!);
    // the fragment shader draws whereever there are triangles
    drawQuad(gl, FullScreenQuad._vao!, false);
  }
};
