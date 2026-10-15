/**
 * a helper for errors. doesn't do much now
 * but can be hooked up to a div to display them on screen
 */
export function showError(msg: string) {
  throw new Error(msg);
}

export type ShaderType = WebGL2RenderingContext["FRAGMENT_SHADER"] | WebGL2RenderingContext["VERTEX_SHADER"];

/**
 * Helper function to contain boilerplate for setting up a Fragment or Vertex Shader
 * and showing errors
 * Alot of the structure comes from IndigoCode @sessamekesh tutorials https://indigocode.dev/tutorials/webgl
 * and Adam Adamson @scriptfoundry/WebGL2-Videos-Materials https://www.youtube.com/playlist?list=PLPbmjY2NVO_X1U1JzLxLDdRn4NmtxyQQo
 */
export function setupShader(gl: WebGL2RenderingContext, type: ShaderType, source: string) {
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

export function linkProgram(gl: WebGL2RenderingContext, program: WebGLProgram) {
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const errorMessage = gl.getProgramInfoLog(program);
    showError(`Failed to link program: ${errorMessage}`);
  }
}

// two triangles covering clip space, drawn with gl.drawArrays(gl.TRIANGLES, 0, 6)
const QUAD_VERTICES = new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]);

/**
 * Create the full-screen quad once (in a shader's init). The attribute setup lives in its own
 * VAO so it never touches the engine's vertex attribute state.
 * VAOs are WebGL2; the engine asks for webgl2 first and the app requires it (WebGlTest).
 */
export function createQuadVao(gl: WebGL2RenderingContext, aPosition: number) {
  const vao = gl.createVertexArray();
  gl.bindVertexArray(vao);
  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, QUAD_VERTICES, gl.STATIC_DRAW);
  gl.enableVertexAttribArray(aPosition);
  gl.vertexAttribPointer(aPosition, 2, gl.FLOAT, false, 0, 0);
  gl.bindVertexArray(null);
  gl.bindBuffer(gl.ARRAY_BUFFER, null);
  return vao;
}

/**
 * Draw the quad with alpha blending and no depth test, then put blend/depth back
 * the way the engine had them and unbind the VAO.
 */
export function drawQuad(gl: WebGL2RenderingContext, vao: WebGLVertexArrayObject, blend = true) {
  const hadBlend = gl.isEnabled(gl.BLEND);
  const hadDepth = gl.isEnabled(gl.DEPTH_TEST);
  if (blend) {
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  }
  gl.disable(gl.DEPTH_TEST);
  gl.bindVertexArray(vao);
  gl.drawArrays(gl.TRIANGLES, 0, 6);
  gl.bindVertexArray(null);
  if (!hadBlend) gl.disable(gl.BLEND);
  if (hadDepth) gl.enable(gl.DEPTH_TEST);
}
