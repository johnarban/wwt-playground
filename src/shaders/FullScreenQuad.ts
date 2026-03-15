/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/naming-convention */
/* eslint-disable @typescript-eslint/no-empty-function */
import { 
  Color, 
  Coordinates, 
  RenderContext, 
  Settings, 
  SpaceTimeController, 
  Vector3d, 
  WWTControl 
} from "@wwtelescope/engine";

import SimpleFrag from "./fullScreenQuad.frag?raw";
import SimpleVert from "./fullScreenQuad.vert?raw";

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


// broadly following https://ostefani.dev/tech-notes/webgl-drawing-full-screen-quad
// set it up like WWT does. but a class would be better i think
/**
 * Setup a full screen quad shader so that we can draw to it directly.
 * The vertices with drawArrays gl.TRIANGLE, drow the triangles
 * the fragment shader says how to color them
 * 
 */
export function FullScreenQuad() { };
export namespace FullScreenQuad {
  export let _frag: WebGLShader | undefined;
  export let _vert: WebGLShader | undefined;
  export let _prog: WebGLProgram | undefined;
  export let initialized: boolean | undefined;
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
  FullScreenQuad.initialized = true;
};

FullScreenQuad.use = function (renderContext: RenderContext) {
  const gl  = renderContext.gl;
  if (gl != null) {
    if (!FullScreenQuad.initialized) {
      FullScreenQuad.init(renderContext);
      console.log('using dead simple');
    }
    gl.useProgram(FullScreenQuad._prog!); 
    
    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);
    const vertices = new Float32Array([
      // Triangle 1
      -1, -1, // left, bottom 
      1, -1, // right, bottom 
      -1, 1,  // left, top 
      // Triangle 2
      -1, 1, // left, top
      1, -1, // right, bottom
      1, 1, // right, top
    ].map(v=>v/2)); 
    const buffer = gl.createBuffer(); // create the buffer
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer); // it should be an ARRAY_BUFFER
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW); // writes only to the last bound buffer
    
    const aPositon = gl.getAttribLocation(FullScreenQuad._prog!, 'aPosition');
    gl.enableVertexAttribArray(aPositon); // aPosition
    // this is going to use the currently bound buffer, to define 2 triangles
    // the fragment shader draws whereever there are triangles
    gl.vertexAttribPointer(aPositon, 2, gl.FLOAT, false, 0, 0);
    
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
    // gl.bindVertexArray(null);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }
};