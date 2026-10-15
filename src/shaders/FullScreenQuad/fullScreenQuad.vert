#version 300 es
// https://github.com/ostefani/web-gl-series/tree/main/article-2/shaders
in vec2 aPosition;
out vec2 vUV;
void main() {
    // Convert aPosition from [-1,1] to [0,1] range for texture‐style UVs
    // this is convenient for textures, but could just as easily be done in the fragment shader
    vUV = aPosition * 0.5 + 0.5; 
    vUV.y = 1.0 - vUV.y;
    gl_Position = vec4(aPosition, 0.0, 1.0);
}