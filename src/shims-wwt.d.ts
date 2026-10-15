/* eslint-disable @typescript-eslint/naming-convention */

import "@wwtelescope/engine"; // all types are available to typescript here, but i import them specifically below for clarity
// Color and Vector3d are not imported: the Color/Vector3d namespace augmentations below merge with the engine's
import type { FrameCallback, Layer } from "@wwtelescope/engine";
import { SolarSystemObjects } from "@wwtelescope/engine-types";
import type { AltUnits, ReferenceFrames, ReferenceFrameTypes } from "@wwtelescope/engine-types";

declare module "@wwtelescope/engine" {
  // this seems to be the write way to extend the class. do a normal import
  // and ts will merge? this interface. idk really.
  interface RenderContext {
    readonly gl: WebGL2RenderingContext;
    get_world(): Matrix3d;
    get_view(): Matrix3d;
    get_projection(): Matrix3d;
  }

  // this on the other hand is not exported at all, so we create the class declaration here
  export class SimpleLineList {
    addLine(pt1: Vector3d, pt2: Vector3d): void;
    drawLines(context: RenderContext, opacity: number, color: Color): void;
    pure2D: boolean;
    viewTransform: Matrix3d;
    useLocalCenters: boolean;
    set_depthBuffered(buffered: boolean): void;
    clear(): void;
  }

  export class AstroRaDec {
    RA: number;
    dec: number;
    distance: number;
    constructor(ra: number, dec: number, distance: number, shadow?: boolean, eclipsed?: boolean);
  }

  interface Coordinates {
    raDecTo3d(ra: number, dec: number): Vector3d;
    horizonToEquitorial(altAz: Coordinates, location: Coordinates, utc: Date): Coordinates;
  }

  // in the engine since 7.36, but only typed on the ScriptInterface and the pinia store
  interface WWTControl {
    addFrameCallback(callback: FrameCallback): void;
    removeFrameCallback(callback: FrameCallback): void;
  }

  // 7.41 declares the Matrix3d class but leaves these instance methods untyped
  interface Matrix3d {
    floatArray(): number[];
    clone(): Matrix3d;
    invert(): void;
  }

  namespace Matrix3d {
    function multiplyMatrix(a: Matrix3d, b: Matrix3d): Matrix3d;
    function invertMatrix(m: Matrix3d): Matrix3d;
    function get_identity(): Matrix3d;
    function clone(): Matrix3d;
    function invert(): void;
    function floatArray(): number[];
  }

  /**
   *  example use: console.log(AstroCalc.getPlanet(
      SpaceTimeController.utcToJulian(new Date()), // or use SpaceTimeController.get_jNow()
      SolarSystemObjects.sun,
      0, 0, 0 // lat lon height
    ));
   */
  namespace AstroCalc {
    function getPlanet(
      jDate: number,
      planetName: SolarSystemObjects,
      lat: number,
      lng: number,
      height: number,
    ): AstroRaDec;
    function galacticToJ2000(l: number, b: number): AstroRaDec;
    function eclipticToJ2000(l: number, b: number): AstroRaDec;
    function j2000ToGalactic(ra: number, dec: number): AstroRaDec; // l is on RA, and b is on dec
    function j2000ToEcliptic(ra: number, dec: number): AstroRaDec; // l is on RA, and b is on dec
  }

  namespace SpaceTimeController {
    function get_location(): Coordinates;
  }

  interface Imageset {
    // used by useWtml. returns a zoom (deg) that fits the image; never larger than currentZoom when given
    _guessZoomSetting(currentZoom?: number): number;
  }

  /* --- asteroids: engine internals for orbits, reference frames, the Sun frame patch and debug axes --- */
  namespace Coordinates {
    function degreesToRadians(degrees: number): number;
    function meanObliquityOfEcliptic(jd: number): number;
  }

  interface Matrix3d {
    /** in place: this = this * scaling(v) (row vectors) */
    scale(v: Vector3d): void;
    /** in place: this = this * mat (row vectors) */
    _multiply(mat: Matrix3d): void;
  }

  namespace Matrix3d {
    function _rotationX(radians: number): Matrix3d;
    function _rotationY(radians: number): Matrix3d;
    function _rotationZ(radians: number): Matrix3d;
  }

  namespace Vector3d {
    function _transformCoordinate(v: Vector3d, mat: Matrix3d): Vector3d;
  }

  namespace Color {
    function _fromArgbColor(a: number, col: Color): Color;
  }

  namespace Colors {
    function get_red(): Color;
    function get_green(): Color;
    function get_blue(): Color;
    function get_white(): Color;
    function get_yellow(): Color;
  }

  /* --- solar-system orbits: runtime exports the d.ts leaves out --- */

  /** elliptical orbital elements (astrocalc). Angles in degrees, n in deg/day, t = time of perihelion (JD) */
  export interface EOE {
    a: number;
    e: number;
    i: number;
    w: number;
    omega: number;
    jdEquinox: number;
    t: number;
    n: number;
    meanAnnomolyOut?: number; // sic
  }

  export namespace ELL {
    /** WWT coordinates (ecliptic x, z, y), in the units of elements.a */
    function calculateRectangularJD(jd: number, elements: EOE): Vector3d;
    function meanMotionFromSemiMajorAxis(a: number): number;
  }

  export class ReferenceFrame {
    name: string;
    parent: string;
    referenceFrameType: ReferenceFrameTypes;
    reference: ReferenceFrames;
    meanRadius: number; // meters
    scale: number;
    showAsPoint: boolean;
    showOrbitPath: boolean;
    semiMajorAxis: number;
    semiMajorAxisUnits: AltUnits;
    eccentricity: number;
    inclination: number;
    argumentOfPeriapsis: number;
    longitudeOfAscendingNode: number;
    meanAnomolyAtEpoch: number; // sic
    meanDailyMotion: number;
    epoch: number;
    rotationalPeriod: number; // days
    worldMatrix: Matrix3d;
    get_elements(): EOE;
    get_orbit(): Orbit | null;
    set_orbit(orbit: Orbit | null): Orbit | null;
    set_representativeColor(color: Color): Color;
    toTLE(): string;
  }

  export class Orbit {
    _elements: EOE;
    _orbitColor: Color;
    _scale: number;
    static _orbitalToWwt: Matrix3d;
    draw3D(renderContext: RenderContext, opacity: number, centerPoint: Vector3d): void;
  }

  export namespace EllipseRenderer {
    function drawEllipse(
      renderContext: RenderContext,
      semiMajorAxis: number,
      eccentricity: number,
      eccentricAnomaly: number,
      color: Color,
      worldMatrix: Matrix3d,
      opacity?: number,
    ): void;
  }

  export class OrbitLayer extends Layer {
    get_frames(): ReferenceFrame[];
    set_frames(frames: ReferenceFrame[]): ReferenceFrame[];
  }

  interface LayerMap {
    frame: ReferenceFrame;
  }

  export namespace Planets {
    let _planet3dLocations: Vector3d[];
    function getPlanetPositionDirect(id: SolarSystemObjects, jd: number): Vector3d;
    function getAdjustedPlanetRadius(id: SolarSystemObjects): number;
    let _setupMatrixForPlanetGeometry: (
      renderContext: RenderContext,
      planetID: SolarSystemObjects,
      centerPoint: Vector3d,
      makeFrustum: boolean,
    ) => number;
  }

  namespace LayerManager {
    function loadTree(): void;
    function get_version(): number;
    function set_version(v: number): number;
    function _loadOrbitsFile(name: string, data: string, currentMap: string): OrbitLayer;
    /** scrapes minorplanetcenter.net/db_search/show_object?object_id=<id> and adds an OrbitLayer to target's map */
    function _getMpcAsTLE(id: string, target: { get_name(): string }): void;
  }

  interface RenderContext {
    set_worldBaseNonRotating(m: Matrix3d): Matrix3d;
  }
}
