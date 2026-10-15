/* eslint-disable @typescript-eslint/naming-convention */

import "@wwtelescope/engine"; // all types are available to typescript here, but i import them specifically below for clarity
import type { Color, Vector3d, FrameCallback } from "@wwtelescope/engine";
import { SolarSystemObjects } from "@wwtelescope/engine-types";

declare module "@wwtelescope/engine" {
  // this seems to be the write way to extend the class. do a normal import
  // and ts will merge? this interface. idk really.
  interface RenderContext {
    readonly gl: WebGL2RenderingContext;
    get_world(): Matrix3d;
    get_view(): Matrix3d;
    get_projection(): Matrix3d;
    drawImageSet(imageset: Imageset, opacity: number, smooth?: boolean): void;
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

  /* FITS internals (cube slicing) */
  export type FitsDataUnit = Float32Array | Float64Array | Uint8Array | Int16Array | Int32Array;

  // header values are the raw card strings
  export interface FitsHeader {
    [key: string]: string | undefined;
    SIMPLE: string;
    BITPIX: string;
    NAXIS: string;
    NAXIS1: string;
    NAXIS2: string;
    NAXIS3?: string;
    BSCALE?: string;
    BZERO?: string;
    BLANK?: string;
    BUNIT?: string;
    CRPIX3?: string;
    CDELT3?: string;
    CRVAL3?: string;
    CTYPE3?: string;
    CUNIT3?: string;
    DATAMAX?: string;
    DATAMIN?: string;
    OBJECT?: string;
  }

  interface FitsImage {
    dataUnit: FitsDataUnit;
    axisSize: number[];
    header: FitsHeader;
  }

  // not exported by the typings; TileCache._tiles holds these
  export interface Tile {
    dataset?: Imageset;
    fitsImage?: unknown;
    texture2d?: WebGLTexture | null;
    makeTexture(): void;
    texReady: boolean;
    readyToRender: boolean;
    demReady: boolean;
    demTile: boolean;
    requestPending: boolean;
  }

  namespace TileCache {
    let _tiles: Record<string, Tile>;
  }
}
