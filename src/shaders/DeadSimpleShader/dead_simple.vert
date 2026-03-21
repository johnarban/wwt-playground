#version 300 es
void main() {
    gl_PointSize = 50.0; // in pixels
    gl_Position = vec4(0.5, 0.5, 0, 1.0); // why is it at w = 1
    // https://stackoverflow.com/a/49782362/11594175
}