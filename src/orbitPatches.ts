/*
 * Runtime patches for custom orbits on engine 7.41 (published bundle). Both are off by default and
 * restore the engine's own functions when switched off.
 *
 * Basis-vector draw3D: rows of the orientation are swap(P), swap(Q), swap(H), where P = Rz(Ω)Rx(i)Rz(ω)·x̂
 * (perihelion), H = Rz(Ω)Rx(i)·ẑ (pole), Q = H×P, swap(x,y,z) = (x,z,y). The ellipse shader draws
 * a(cosE−e), b·sinE in the xy plane, so a point is x·swap(P) + y·swap(Q). The engine's v·Rz(ω)·Rx(i)·Rz(Ω)·S
 * (row vectors; = column Rz(Ω)Rx(i)Rz(ω), swap last) is the same thing written as rotations: max matrix
 * difference 3e-16 over 2000 random (Ω,i,ω), and the drawn ellipse matches ELL.calculateRectangular to 2e-15.
 * Planets3d builds its orbit matrices the same way (rows ecc, h×ecc, h).
 *
 * Sun frame: setupPlanetMatrix wants the Sun's frame = ecliptic, but when the Sun is in the frustum
 * Planets3d._drawPlanet3d re-runs _setupMatrixForPlanetGeometry for it, overwriting worldBaseNonRotating
 * with scale·orientationAtEpoch(Sun)·T. orientationAtEpoch(Sun) turns +X by ~98.7° in the ecliptic plane and
 * tilts the pole 7.25°. OrbitLayer.draw and child-frame orbits/bodies all use worldBaseNonRotating. If this
 * is confirmed, the engine fix is in planets_3d.js _drawPlanet3d (don't let that re-call overwrite the Sun's
 * worldBaseNonRotating).
 */
import {
  Color,
  Coordinates,
  EllipseRenderer,
  Matrix3d,
  Orbit,
  Planets,
  SpaceTimeController,
  Vector3d,
  type RenderContext,
} from "@wwtelescope/engine";
import { SolarSystemObjects } from "@wwtelescope/engine-types";

const engineDraw3D = Orbit.prototype.draw3D;
const engineSetupPlanetGeometry = Planets._setupMatrixForPlanetGeometry;

/**
 * The lost "basis-vector" Orbit.draw3D, rebuilt from the branch's description: the orientation rows are
 * the perifocal axes P (perihelion), Q = H × P and H (orbit pole) in standard ecliptic coordinates, each
 * with y and z swapped for WWT. 7.41's Rz(ω)·Rx(i)·Rz(Ω)·_orbitalToWwt is the same matrix (to ~1e-16),
 * so this should draw identically. It is kept to A/B that claim in the browser.
 */
function basisVectorDraw3D(this: Orbit, renderContext: RenderContext, opacity: number, centerPoint: Vector3d) {
  const el = this._elements;
  const [node, inc, peri] = [el.omega, el.i, el.w].map((deg) => Coordinates.degreesToRadians(deg)) as [
    number,
    number,
    number,
  ];
  const [cosO, sinO, cosI, sinI, cosW, sinW] = [
    Math.cos(node),
    Math.sin(node),
    Math.cos(inc),
    Math.sin(inc),
    Math.cos(peri),
    Math.sin(peri),
  ];
  const p = [cosO * cosW - sinO * sinW * cosI, sinO * cosW + cosO * sinW * cosI, sinW * sinI];
  const h = [sinO * sinI, -cosO * sinI, cosI];
  const q = [h[1]! * p[2]! - h[2]! * p[1]!, h[2]! * p[0]! - h[0]! * p[2]!, h[0]! * p[1]! - h[1]! * p[0]!];
  // prettier-ignore
  const orientation = Matrix3d.create(
    p[0]!, p[2]!, p[1]!, 0,
    q[0]!, q[2]!, q[1]!, 0,
    h[0]!, h[2]!, h[1]!, 0,
    0, 0, 0, 1,
  );
  const worldMatrix = Matrix3d.multiplyMatrix(
    Matrix3d.multiplyMatrix(orientation, Matrix3d.translation(centerPoint)),
    renderContext.get_world(),
  );

  // the rest is the engine's draw3D: mean anomaly now (keeps its sign), 5 Newton steps for E
  const meanAnomaly = Coordinates.degreesToRadians((el.n * (SpaceTimeController.get_jNow() - el.t)) % 360);
  let eccAnomaly = meanAnomaly;
  for (let i = 0; i < 5; i++) {
    eccAnomaly += (meanAnomaly - eccAnomaly + el.e * Math.sin(eccAnomaly)) / (1 - el.e * Math.cos(eccAnomaly));
  }
  const color = Color._fromArgbColor(Math.trunc(opacity * 255), this._orbitColor);
  EllipseRenderer.drawEllipse(renderContext, el.a / this._scale, el.e, eccAnomaly, color, worldMatrix);
}

export function setBasisVectorOrbitDraw(on: boolean) {
  Orbit.prototype.draw3D = on ? basisVectorDraw3D : engineDraw3D;
}

/**
 * When the Sun is in view, Planets3d._drawPlanet3d re-runs _setupMatrixForPlanetGeometry for it, which
 * puts the Sun's orientation at epoch (pole RA/Dec + prime meridian) into worldBaseNonRotating. That
 * undoes Planets.setupPlanetMatrix, which wants the Sun's frame to be the plain ecliptic frame. OrbitLayer
 * and child-frame orbits are drawn in worldBaseNonRotating, so they turn ~99° about the ecliptic pole
 * (and tilt 7.25°), and snap back when the Sun leaves the view. This redoes setupPlanetMatrix's Sun case.
 */
function sunEclipticSetupPlanetGeometry(
  renderContext: RenderContext,
  planetID: number,
  centerPoint: Vector3d,
  makeFrustum: boolean,
): number {
  const nonRotating = renderContext.get_world().clone();
  const rotation = engineSetupPlanetGeometry(renderContext, planetID, centerPoint, makeFrustum);
  if (planetID === SolarSystemObjects.sun) {
    const radius = Planets.getAdjustedPlanetRadius(planetID);
    nonRotating.scale(Vector3d.create(radius, radius, radius));
    nonRotating._multiply(
      Matrix3d.translation(Vector3d.subtractVectors(Planets._planet3dLocations[planetID]!, centerPoint)),
    );
    renderContext.set_worldBaseNonRotating(nonRotating);
  }
  return rotation;
}

export function setSunEclipticFrameFix(on: boolean) {
  Planets._setupMatrixForPlanetGeometry = on ? sunEclipticSetupPlanetGeometry : engineSetupPlanetGeometry;
}
