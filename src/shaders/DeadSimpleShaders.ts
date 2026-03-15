/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/naming-convention */
import { 
  Color, 
  Coordinates, 
  RenderContext, 
  Settings, 
  SpaceTimeController, 
  Vector3d, 
  WWTControl 
} from "@wwtelescope/engine";

import SimpleFrag from "./dead_simple.frag?raw";
import SimpleVert from "./dead_simple.vert?raw";

/**
 * a helper for errors. doesn't do much now
 * but can be hooked up to a div to display them on screen
 */
function showError(msg: string) {
  throw(new Error(msg));
}

type ShaderType = WebGL2RenderingContext['FRAGMENT_SHADER'] | WebGL2RenderingContext['VERTEX_SHADER']

/**
 * Helper function to contain boilerplate for setting up a Fragment or Vertex Shader
 * and showing errors
 * Alot of the structure comes from IndigoCode @sessamekesh tutorials https://indigocode.dev/tutorials/webgl
 * and Adam Adamson @scriptfoundry/WebGL2-Videos-Materials https://www.youtube.com/playlist?list=PLPbmjY2NVO_X1U1JzLxLDdRn4NmtxyQQo
 */
function setupShader(gl: WebGL2RenderingContext, type: ShaderType, source: string) {
  const shader = gl.createShader(type);
  if (shader === null) {
    showError(`setupShader: createShader returned null for source ${source}`);
    return;
  }
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
    
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const errorMessage = gl.getShaderInfoLog(shader);
    showError(`Failed to compile shader: ${errorMessage}`);
  }
  return shader;
}

function linkProgram(gl: WebGL2RenderingContext, program: WebGLProgram) {
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const errorMessage = gl.getProgramInfoLog(program);
    showError(`Failed to link program: ${errorMessage}`);
  }
}

// set it up like WWT does. but a class would be better i think
// eslint-disable-next-line @typescript-eslint/no-empty-function
export function DeadSimpleShader() { };
export namespace DeadSimpleShader {
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
  const gl  = renderContext.gl;
  if (gl != null) {
    if (!DeadSimpleShader.initialized) {
      DeadSimpleShader.init(renderContext);
      console.log('using dead simple');
    }
    gl.useProgram(DeadSimpleShader._prog!); 
    gl.drawArrays(gl.POINTS, 0, 1);
  }
};