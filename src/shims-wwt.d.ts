/* eslint-disable @typescript-eslint/naming-convention */

import "@wwtelescope/engine"; // all types are available to typescript here, but i import them specifically below for clarity
import type { Color, Vector3d } from "@wwtelescope/engine";


declare module "@wwtelescope/engine" {
    
  // this seems to be the write way to extend the class. do a normal import
  // and ts will merge? this interface. idk really.   
  interface RenderContext  {
      readonly gl: WebGL2RenderingContext;
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
};


// import type { WWTInstance } from "@wwtelescope/engine-helpers";
import { WWTGlobalState } from "@wwtelescope/engine-pinia/src/store";

declare module "@wwtelescope/engine-pinia" {
  interface WWTEnginePiniaState {
    $wwt: WWTGlobalState;
  }
}