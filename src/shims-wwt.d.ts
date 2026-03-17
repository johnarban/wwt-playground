/* eslint-disable @typescript-eslint/naming-convention */

import "@wwtelescope/engine"; // all types are available to typescript here, but i import them specifically below for clarity
import type { Color, Vector3d } from "@wwtelescope/engine";
import { SolarSystemObjects } from "@wwtelescope/engine-types";


declare module "@wwtelescope/engine" {
    
  // this seems to be the write way to extend the class. do a normal import
  // and ts will merge? this interface. idk really.   
  interface RenderContext  {
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
    function getPlanet(jDate: number, planetName: SolarSystemObjects, lat: number, lng: number, height: number): AstroRaDec;
  }
  
  namespace SpaceTimeController {
    function get_location(): Coordinates;
  }
  

};


// import type { WWTInstance } from "@wwtelescope/engine-helpers";
import { WWTGlobalState } from "@wwtelescope/engine-pinia/src/store";

declare module "@wwtelescope/engine-pinia" {
  interface WWTEnginePiniaState {
    $wwt: WWTGlobalState;
  }
}