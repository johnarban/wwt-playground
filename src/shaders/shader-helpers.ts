/**
 * a helper for errors. doesn't do much now
 * but can be hooked up to a div to display them on screen
 */
export function showError(msg: string) {
  throw(new Error(msg));
}

export type ShaderType = WebGL2RenderingContext['FRAGMENT_SHADER'] | WebGL2RenderingContext['VERTEX_SHADER']

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