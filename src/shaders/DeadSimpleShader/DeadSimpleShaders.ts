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

import SimpleFrag from "./dead_simple.frag?raw";
import SimpleVert from "./dead_simple.vert?raw";

import { setupShader, linkProgram } from "../shader-helpers";

// set it up like WWT does. but a class would be better i think
export function DeadSimpleShader() {}
// declare (type-only) so Oxc/Vite 8 can strip it; the members are set on the function at runtime
export declare namespace DeadSimpleShader {
  export let _frag: WebGLShader | undefined;
  export let _vert: WebGLShader | undefined;
  export let _prog: WebGLProgram | undefined;
  export let initialized: boolean | undefined;
}

DeadSimpleShader.init = function (renderContext: RenderContext) {
  const gl = renderContext.gl;

  // create shaders and link program
  DeadSimpleShader._frag = setupShader(gl, gl.FRAGMENT_SHADER, SimpleFrag)!;
  DeadSimpleShader._vert = setupShader(gl, gl.VERTEX_SHADER, SimpleVert)!;
  DeadSimpleShader._prog = gl.createProgram();
  gl.attachShader(DeadSimpleShader._prog, DeadSimpleShader._vert);
  gl.attachShader(DeadSimpleShader._prog, DeadSimpleShader._frag);
  linkProgram(gl, DeadSimpleShader._prog);
  // gl.useProgram(DeadSimpleShader._prog); // does not need this one. but it does need it in .use otherwise it get really flashy
  // gl.enable(gl.BLEND);
  // gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  DeadSimpleShader.initialized = true;
};

DeadSimpleShader.use = function (renderContext: RenderContext) {
  const gl = renderContext.gl;
  if (gl != null) {
    if (!DeadSimpleShader.initialized) {
      DeadSimpleShader.init(renderContext);
      console.log("using dead simple");
    }
    gl.useProgram(DeadSimpleShader._prog!);
    gl.drawArrays(gl.POINTS, 0, 1);
  }
};
