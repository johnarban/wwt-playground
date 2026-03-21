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

import {showError, setupShader, linkProgram} from '@/shaders/shader-helpers';

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
    ]); 
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