/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/naming-convention */
import {  Layer, Color, RenderContext } from "@wwtelescope/engine";
import type { AltUnits, ReferenceFrameTypes, ReferenceFrames } from "@wwtelescope/engine-types";
import { LayerManager } from "@wwtelescope/engine";
interface Target {
    get_name: () => string;
}



declare module "@wwtelescope/engine" {

  export namespace ss {
    function truncate(value: number): number;
  }
  
  export class Matrix3d {
    _m11: number; _m12: number; _m13: number; _m14: number;
    _m21: number; _m22: number; _m23: number; _m24: number;
    _m31: number; _m32: number; _m33: number; _m34: number;
    _offsetX: number; _offsetY: number; _offsetZ: number; _m44: number;
    transform(v: Vector3d): Vector3d;
  }
  
  export namespace Matrix3d {
    function get_identity(): Matrix3d;
    function create(m11: number, m12: number, m13: number, m14: number,
                  m21: number, m22: number, m23: number, m24: number,
                  m31: number, m32: number, m33: number, m34: number,
                  offsetX: number, offsetY: number, offsetZ: number, m44: number): Matrix3d;
    function multiplyMatrix(a: Matrix3d, b: Matrix3d): Matrix3d;
    function translation(v: Vector3d): Matrix3d;
    function transform(v: Vector3d): Matrix3d;
    function _rotationX(radians: number): Matrix3d;
    function _rotationY(radians: number): Matrix3d;
    function _rotationZ(radians: number): Matrix3d;
    function _scaling(x: number, y: number, z: number): Matrix3d;
    
  }


  export class Vector3d {
    x: number;
    y: number;
    z: number;
  }
  
  export class Vector2d {
    x: number;
    y: number;
  }

  export function Color(): void;
  export class Color {
    a: number;
    b: number;
    g: number;
    r: number;
  }
  export namespace Color {
    function fromArgb(a: number, r: number, g: number, b: number): Color;
    function _fromArgbColor(a: number, col: Color): Color;
    function fromName(name: string): Color;
    function fromHex(data: string): Color;
    function fromSimpleHex(data: string): Color;
    function _fromWindowsNamedColor(name: string): Color;
}

  export function Colors(): void;
  export namespace Colors {
      function get_black(): Color;
      function get_blue(): Color;
      function get_brown(): Color;
      function get_cyan(): Color;
      function get_darkGray(): Color;
      function get_gray(): Color;
      function get_green(): Color;
      function get_lightGray(): Color;
      function get_magenta(): Color;
      function get_orange(): Color;
      function get_purple(): Color;
      function get_red(): Color;
      function get_transparent(): Color;
      function get_white(): Color;
      function get_yellow(): Color;
  }




  export namespace Orbit {
    export const _element: null | OrbitalElement;
    export const _orbitColor: Color;
    export const _scale: number;
    export const _segmentCount: number;
    export const _orbitalToWwt: Matrix3d;
    export function draw3d(renderContext: RenderContext, opacity: number, centerPoint: Vector3d): void;
  }
  
  export namespace EllipseRenderer {
    function drawEllipse(
      renderContext: RenderContext, 
      semiMajorAxis: number, 
      eccentricity: number, 
      eccentricAnomaly: number, 
      color: Color, 
      worldMatrix: Matrix3d
    ): void;
    function drawEllipseWithPosition(
      renderContext: RenderContext, 
      semiMajorAxis: number, 
      eccentricity: number, 
      eccentricAnomaly: number, 
      color: Color, 
      worldMatrix: Matrix3d, 
      positionNow: Vector3d
    ): void;
  }
  

  export class EOE {
    a: number; // Semi-major axis (size of orbit) (au? )
    e: number; // eccentricity
    i: number; // inclicnation (degrees)
    w: number; // argument of periapsis (degrees)
    omega: number; // longitude of ascending node (degrees)
    jdEquinox: number; // julian date of equinix (idk what this is)
    t: number; // time of perihelion passage (jd)
    n: number; // mean daily motion (degrees per day)
    meanAnnomolyOut?: number; // calculated mean annomoly i think // this is the correct incorrect spelling :)
  }


  export class ReferenceFrame {
    _systemGenerated: boolean;
    name: string;
    parent?: string;
    referenceFrameType: ReferenceFrameTypes;
    reference: ReferenceFrames; // probably 18 = custom
    
    // Calclulated
    meanAnomoly: number;
    orbitalYears: number;

    // Serialized
    observingLocation: boolean;
    reference: number;
    parentsRoationalBase: boolean;
    referenceFrameType: ReferenceFrameTypes;
    meanRadius: number; // in meters
    oblateness: number;
    heading: number;
    pitch: number;
    roll: number;
    scale: number;
    tilt: number;
    translation: Vector3d;

    // For Spherical Offset
    lat: number;
    lng: number;
    altitude: number;

    // For Rotating frames
    rotationalPeriod: number; // days
    zeroRotationDate: number; // julian decimal

    // For representing orbits & distant point location
    representativeColor: Color; // Used for orbits and points
    showAsPoint: boolean;
    showOrbitPath: boolean;

    semiMajorAxis: number; // a Au's
    semiMajorAxisUnits: AltUnits; // AltUnits
    eccentricity: number; // e
    inclination: number; // i
    argumentOfPeriapsis: number; // w
    longitudeOfAscendingNode: number; // Omega
    meanAnomolyAtEpoch: number; // M
    meanDailyMotion: number; // n .degrees day
    epoch: number; // standard equinox

    _orbit: null | Orbit;
    _elements:  EOE;
    worldMatrix: Matrix3d;
    worldMatrix: Matrix3d;
    
    // methods
    get_elements(): EOE;
    set_elements(elements: EOE): void;
    set_representativeColor(color: Color): void;
    fromTLE(line1: string, line2: string, gravity: number): void;
    toTLE(): string;
  }

  
  


  export class OrbitLayer extends Layer {
    get_frames: () => ReferenceFrame[];
    set_frames: (frames: ReferenceFrame[]) => void;
    cleanUp: () => void;
    
    get_pointOpacity: () => number;
    set_pointOpacity: (number) => void;
    
    /**
     * @param dataFile - The TLE string
     */
    loadString: (dataFile: string) => void;
    _elements: unknown;
  }

/*
re-exporting this to get the "frame" property
thas commented out in @wwtelescope/engine 
*/
  export interface LayerMap {
    childMaps: Record<string, LayerMap>;
    parent: LayerMap | null;
    layers: Layer[];
    open: boolean;
    enabled: boolean;
    loadedFromTour: boolean;
    frame: ReferenceFrame;

    addChild(child: LayerMap): void;
    get_name(): string;
    set_name(value: string): string;
  }

  export function Coordinates(ascention: number, declination: number): void;
  export class Coordinates {
    constructor(ascention: number, declination: number);
    _ascention: number;
    _declination: number;
  }
  export namespace Coordinates {
      const RC: number;
      const RCRA: number;
      const radius: number;
      const _rotationMatrix: number[][] | null;
      function geoTo3d(lat: number, lng: number): Vector3d;
      function geoTo3dDouble(lat: number, lng: number): Vector3d;
      function geoTo3dRad(lat: number, lng: number, radius: number): Vector3d;
      function raDecTo3d(ra: number, dec: number): Vector3d;
      function raDecTo3dAu(ra: number, dec: number, au: number): Vector3d;
      function raDecTo3dMat(ra: number, dec: number, mat: Matrix3d): Vector3d;
      function raDecTo3dPointRad(point: Coordinates, radius: number): Vector3d;
      function sterographicTo3d(x: number, y: number, radius: number, standardLat: number, meridean: number, falseEasting: number, falseNorthing: number, scale: number, north: boolean): Vector3d;
      function equitorialToHorizon(equitorial: Coordinates, location: Coordinates, utc: number): Coordinates;
      function horizonToEquitorial(altAz: Coordinates, location: Coordinates, utc: number): Coordinates;
      function _altAzToRaDec(Altitude: number, Azimuth: number, Latitude: number): Vector2d;
      function mstFromUTC2(utc: number, lng: number): number;
      function cartesianToSpherical(vector: Vector3d): Coordinates;
      function cartesianToSpherical2(vector: Vector3d): Coordinates;
      function cartesianToSphericalSky(vector: Vector3d): Vector2d;
      function sphericalSkyToCartesian(vector: Vector3d | Vector2d): Vector3d;
      function cartesianToLatLng(vector: Vector3d): Vector2d;
      function cartesianToSpherical3(vector: Vector3d): Coordinates;
      function fromRaDec(ra: number, dec: number): Coordinates;
      function fromLatLng(lat: number, lng: number): Coordinates;
      function dmsToDegrees(Degrees: numbrt, Minutes: number, Seconds: number): number;
      function degreesToRadians(Degrees: number): number;
      function radiansToDegrees(Radians: number): number;
      function radiansToHours(Radians: number): number;
      function hoursToRadians(Hours: number): number;
      function hoursToDegrees(Hours: number): number;
      function degreesToHours(Degrees: number): number;
      function PI(): number;
      function mapTo0To360Range(Degrees: number): number;
      function mapTo0To24Range(HourAngle: number): number;
      function meanObliquityOfEcliptic(JD: number): number;
      function j2000toGalactic(J2000RA: number, J2000DEC: number): number[];
      function galacticTo3dDouble(l: number, b: number): Vector3d;
      function galactictoJ2000(GalacticL2: number, GalacticB2: number): number[];
  }


  export namespace ELL {
    function calculateRectangularJD(jd: number, elements: EOE): { x: number; y: number; z: number };
  }



  


  export namespace Planets {
    function getPlanetPositionDirect(id: number, jd: number): Vector3d;
    let _jNow: number;
  }

  // Generated by Copilot
  export class Settings {
    static get_active(): Settings;
    get_solarSystemOrbits(): boolean;
    set_solarSystemOrbits(value: boolean): boolean;
    get_solarSystemMinorOrbits(): boolean;
    set_solarSystemMinorOrbits(value: boolean): boolean;
  }

  // there must be a better way. @wwtelescope/engine
  // already exports LayerManager. it just does not 
  // include some of the internal functions
  export namespace LayerManager  {
    function _getMpcAsTLE(id: string, target: Target ): void;
    function _getMpc(id: string, target: Target ): void;
    function _loadOrbitsFile(name: string, data: string, currentMap: string): OrbitLayer;
    function loadTree(): void;
    function get_allMaps(): Record<string, {layers: Layer[], open: boolean}>;
    function get_version(): number;
    function set_version(value: number): void;
    function deleteLayerByID(id: string, updateTree?: boolean, removeFromParent?: boolean): void;
  }


}

// import type { WWTInstance } from "@wwtelescope/engine-helpers";
import { WWTGlobalState } from "@wwtelescope/engine-pinia/src/store";

declare module "@wwtelescope/engine-pinia" {
  interface WWTEnginePiniaState {
    $wwt: WWTGlobalState;
  }
}