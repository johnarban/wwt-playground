# SunTracker Shader — Notes

## Two Useful Modes

There are really two different goals that came up while debugging this shader:

1. Draw a simple red marker near the sun.
2. Compute a meaningful distance-from-sun field for gradients, boundaries, and other effects.

Both are valid. The screen-space circle was the simplest robust answer for the first
goal. The angular-distance field is the right direction for the second goal.

---

## Current Experiment: Angular Distance Field

The shader has been switched back to an angular-distance experiment so it can support
effects like:

- white-to-black gradients from `0` to `180` degrees away from the sun
- rings or boundaries at some angular threshold
- falloff masks centered on the sun

The current approach is:

1. Project the sun into clip space with `uPMatrix * uMVMatrix * vec4(uSunPosition, 1.0)`.
2. Perspective-divide to get the sun's NDC position.
3. In the fragment shader, reconstruct a ray for:
   - the current fragment NDC position
   - the sun's NDC position
4. Reconstruct both rays through the same `uInverseTransformMatrix`.
5. Compute angular distance between those two rays with:

```glsl
atan(length(cross(a, b)), dot(a, b))
```

6. Map that distance from `0..PI` to `1..0` for a grayscale field.

This should be a cleaner version of the older "distance from sun" attempt because the
sun ray and fragment ray are now built by the same path instead of mixing one vector
from `raDecTo3d(...)` and one vector from unprojection.

---

## What We Learned From The Marker Version

The earlier working marker was still useful because it established a few things:

### 1. The Sun Projection Was Basically Right

The debug images showed that the projected sun location in NDC was close to correct.
Crosshair-style diagnostics consistently passed through the visible sun point.

That meant the bug was usually not "where is the sun on the screen?" but instead:

- how the fragment field was being built
- what distance was being measured
- whether the compared vectors were in the same space

### 2. `length()` Was Not The Problem By Itself

`length()` is fine when used on the right quantity.

For the screen-space marker:

```glsl
vec2 delta = vpixelPosition - vSunPositionUv;
delta.x *= uAspectRatio;
float dist = length(delta);
```

That worked because it was explicitly measuring 2D screen-space distance after aspect
correction.

The problem was never "you cannot use `length()`". The problem was using it on the
wrong quantity.

### 3. Aspect Ratio Still Matters For Screen-Space Work

When drawing in NDC/screen space, raw X and Y are not equally scaled unless the canvas
is square. That is why the screen-space marker needed:

```glsl
delta.x *= uAspectRatio;
```

Without that correction, circles turned into stretched ellipses or bars.

---

## Earlier Angular-Distance Investigation

The old notes are still worth keeping because some of them were correct, even if the
overall conclusions were not fully settled.

### 1. WebGL1 vs WebGL2

WWT uses a **WebGL1** context (`WebGLRenderingContext`), so the shaders need WebGL1 GLSL:

| WebGL2 GLSL | WebGL1 GLSL |
|---|---|
| `#version 300 es` | _(no version directive)_ |
| `in` / `out` | `attribute` / `varying` |
| `out vec4 fragColor` | `gl_FragColor` |
| `gl.createVertexArray()` | not available |

### 2. Precision Mismatch Between Vertex and Fragment Shaders

One real issue encountered earlier was a precision mismatch for shared uniforms.
Adding `precision mediump float;` to the vertex shader was part of resolving that.

### 3. Interpolating Nonlinear Quantities Can Break Full-Screen Quad Shaders

Earlier versions computed transformed or normalized directions in the vertex shader and
then let the GPU interpolate them across the quad. That is dangerous because the mapping
from screen position to direction is nonlinear.

Passing NDC through and reconstructing per-fragment is safer.

### 4. Perspective Divide Is Not `length(vec4)`

This was a real correction:

```glsl
// WRONG
temp.xyz / length(temp)

// RIGHT
temp.xyz / temp.w
```

If unprojecting from clip space, divide by `w`. `length(vec4)` is not a substitute for
the perspective divide.

### 5. Coordinate-Space Mismatch Was A Real Failure Mode

One of the biggest earlier problems was comparing:

- `Coordinates.raDecTo3d(...)`
- an unprojected fragment direction from `inverse(proj * world * view)`

Those may not land in the same coordinate frame. WWT's rendering pipeline may include
inside-out sky conventions or axis flips that make a direct comparison unreliable.

That is why the current angular-distance experiment derives both rays from the same
inverse transform path.

### 6. The Comparison Operator Matters

For a boolean angular threshold:

```glsl
dot(a, b) >= cos(radius)
```

selects points **inside** the radius, while:

```glsl
dot(a, b) <= cos(radius)
```

selects points **outside** the radius.

---

## Current Shader Structure

### Vertex Shader

- receives `uSunPosition`, `uMVMatrix`, and `uPMatrix`
- projects the sun into clip space
- computes `vSunPositionUv = sunClipSpace.xy / sunClipSpace.w`
- passes `vpixelPosition = aPosition`
- passes `vSunVisible`

### Fragment Shader

- receives `uInverseTransformMatrix`
- reconstructs a ray from `vpixelPosition`
- reconstructs a ray from `vSunPositionUv`
- computes spherical distance between those two rays
- maps `0..PI` to white..black

### TypeScript

- supplies `uMVMatrix`
- supplies `uPMatrix`
- supplies `uInverseTransformMatrix = inverse(proj * world * view)`
- supplies `uSunPosition`

---

## Practical Expectation

If this version works, it gives a reusable angular-distance field that can drive:

- gradients
- contour lines
- masks
- thresholds

If it still produces artifacts, the likely next problem is not the distance formula
itself but the exact meaning of the unprojected rays in WWT's coordinate system.
