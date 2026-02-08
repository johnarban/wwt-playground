/* eslint-disable @typescript-eslint/naming-convention */
import "@wwtelescope/engine";


import { TypedNumberArray } from "./types";

export interface Header {
  SIMPLE:     string;
  BITPIX:     string;
  NAXIS:      string;
  NAXIS1:     string;
  NAXIS2:     string;
  NAXIS3?:     string;
  EXTEND?:     string;
  BSCALE?:     string;
  BZERO?:      string;
  BLANK?:      string;
  BUNIT?:      string;
  CRPIX1:     string;
  CDELT1:     string;
  CRVAL1:     string;
  CTYPE1:     string;
  CRPIX2:     string;
  CDELT2:     string;
  CRVAL2:     string;
  CTYPE2:     string;
  CRPIX3?:     string;
  CDELT3?:     string;
  CRVAL3?:     string;
  CTYPE3?:     string;
  RESTFREQ?:   string;
  BMAJ?:       string;
  BMIN?:       string;
  DATAMAX:    string;
  DATAMIN:    string;
  EPOCH?:      string;
  OBJECT?:     string;
}


declare module "@wwtelescope/engine" {
  interface FitsImage {
    dataUnit: TypedNumberArray;
    axisSize: number[];
    numAxis?: number;
    header: Header
  }

  interface RenderContext {
    gl?: WebGLRenderingContext | WebGL2RenderingContext | null;
    drawImageSet: (Imageset, number) => void
  }

  interface Tile {
    dataset?: Imageset;
    fitsImage?: unknown;
    texture2d?: WebGLTexture | null;
    makeTexture: () => void;
    texReady: boolean;
    readyToRender: boolean;
    demReady: boolean; 
    demTile: boolean;
    requestPending: boolean;
  }



  export namespace TileCache {
    let _tiles: Record<string, Tile>;
  }
  
  export interface Imageset {
    _guessZoomSetting: () => number;
  }
  
}
