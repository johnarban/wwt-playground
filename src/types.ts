import type { FitsDataUnit, FitsImage, ImageSetLayer } from "@wwtelescope/engine";

export const COLORMAPS = [
  "viridis",
  "plasma",
  "inferno",
  "magma",
  "cividis",
  "greys",
  "gray",
  "purples",
  "blues",
  "greens",
  "oranges",
  "reds",
  "rdylbu",
] as const;
export type Colormaps = (typeof COLORMAPS)[number];

export const SCALES = ["linear", "log", "power", "squareRoot", "histogramEqualization"] as const;
export type Scales = (typeof SCALES)[number];

export type TypedNumberArray = FitsDataUnit;

export interface FitsDataset {
  id: string;
  name: string;
  /** null = not hosted anywhere yet; shown disabled in the picker */
  url: string | null;
  colormap?: Colormaps;
  /** initial physical display range; defaults to the engine's cuts */
  range?: [number, number];
  note?: string;
}

export interface FitsLayerInfo {
  name: string;
  layer: ImageSetLayer;
  fitsImage: FitsImage | null;
  /** the full data unit as loaded (the whole cube); slices are copied out of it */
  dataUnit: TypedNumberArray | undefined;
  sliceCount: number;
  /** the plane currently shown */
  z: number;
}
