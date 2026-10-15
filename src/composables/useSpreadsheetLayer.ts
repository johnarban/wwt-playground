/* eslint-disable @typescript-eslint/no-explicit-any */
// from almagal (3bcc9c1) src/composables/useSpreadsheetLayer.ts, plus filledCircle and color/size columns
import { shallowRef } from "vue";
import { engineStore } from "@wwtelescope/engine-pinia";
import { Color, SpreadSheetLayer, SpreadSheetLayerFilter } from "@wwtelescope/engine";
import { AltTypes, MarkerScales, PlotTypes, PointScaleTypes } from "@wwtelescope/engine-types";
import { RAUnits, AltUnits } from "@wwtelescope/engine-types";
export type MarkerType = "gaussian" | "point" | "circle" | "filledCircle";

const MARKER_TYPE_MAP: Record<MarkerType, PlotTypes> = {
  gaussian: PlotTypes.gaussian,
  point: PlotTypes.point,
  circle: PlotTypes.circle,
  filledCircle: PlotTypes.filledCircle,
};

export function jsonToCsv(jsonData: any[]): string {
  if (jsonData.length === 0) {
    return "";
  }

  const headers = Object.keys(jsonData[0]);
  const csvRows = [headers.join(",")];

  for (const row of jsonData) {
    const values = headers.map((header) => {
      // const escaped = ('' + row[header]).replace(/"/g, '\\"');
      // return `"${escaped}"`;
      return row[header];
    });
    csvRows.push(values.join(","));
  }

  return csvRows.join("\n").replace(/\n/g, "\r\n");
}

/**
 * Type guard for 3-element array.
 * To keep it short we just check the first element of the array
 */
function isArray3(data: any): data is [number, number, number][] {
  return (
    Array.isArray(data) &&
    Array.isArray(data[0]) &&
    data[0].length === 3 &&
    data[0].every((x: any) => typeof x === "number")
  );
}

function isArray2(data: any): data is [number, number][] {
  return (
    Array.isArray(data) &&
    Array.isArray(data[0]) &&
    data[0].length === 2 &&
    data[0].every((x: any) => typeof x === "number")
  );
}

/**
 * Buiild a CSV string from a list of [ra, dec] or [ra, dec, distance] points. The CSV will have headers "ra,dec" or "ra,dec,dist" accordingly.
 */
function buildCsv(points: [number, number][] | [number, number, number][]): string {
  if (isArray3(points)) {
    const rows = points.map(([ra, dec, dist]) => `${ra},${dec},${dist}`).join("\r\n");
    return `ra,dec,distance\r\n${rows}`;
  }
  if (isArray2(points)) {
    const rows = points.map(([ra, dec]) => `${ra},${dec}`).join("\r\n");
    return `ra,dec\r\n${rows}`;
  }

  throw new Error("Invalid points format for buildCsv");
}

interface CoordinateJson extends Record<string, any> {
  ra: number;
  dec: number;
}

function isCoordinateJsonArray(data: any): data is CoordinateJson[] {
  return Array.isArray(data) && data.length > 0 && "ra" in data[0] && "dec" in data[0];
}

export interface SpreadsheetLayerOptions {
  name?: string;
  color?: string;
  markerSize?: number;
  markerType?: MarkerType;
  distanceColumn?: string | null; // column name for distance
  distanceUnit?: AltUnits;
  raUnit?: RAUnits;
  colorColumn?: string | null; // column of literal colors ("#rrggbb")
  sizeColumn?: string | null;
  sizeScale?: PointScaleTypes;
  opacity?: number;
}
/**
 * RA in hours by default
 *
 * [Optional] Distance in parsecs by default. The default distance column is "dist"
 *
 * The options are
 *   - `name`: the name of layer. Default: "spreadsheet-layer"
 *   - `color`: the color of the markers. Default: "#ffffff"
 *   - `markerSize`: the size of the markers (the layer's scale factor). Default: 10
 *   - `markerType`: "gaussian" | "point" | "circle" | "filledCircle". Default: "circle"
 *   - `distanceColumn`: Optional name of the distance column. Default: "dist".
 *   - `distanceUnit`: Default: AltUnits.parsecs.
 *   - `raUnit`: Default: RAUnits.hours
 *   - `colorColumn`: Optional column of literal per-row colors ("#rrggbb"), used instead of `color`. Default: null
 *   - `sizeColumn`: Optional column that sizes each marker (not for "point", which is always 1px). Default: null
 *   - `sizeScale`: how `sizeColumn` maps to a size. Default: PointScaleTypes.stellarMagnitude
 *   - `opacity`: Default: 1
 */
export function useSpreadsheetLayer(
  points: [number, number][] | [number, number, number][] | CoordinateJson[],
  options: SpreadsheetLayerOptions = {},
) {
  const store = engineStore();
  // with defaults
  const {
    name = "spreadsheet-layer",
    color = "#ffffff",
    markerSize = 10,
    markerType = "circle",
    distanceColumn = "dist",
    distanceUnit = AltUnits.parsecs,
    raUnit = RAUnits.hours,
    colorColumn = null,
    sizeColumn = null,
    sizeScale = PointScaleTypes.stellarMagnitude,
    opacity = 1,
  } = options;

  let originalLayer: SpreadSheetLayer | null = null;
  let header: string[] = [];

  function getColumnIndex(col: string): number | undefined {
    const index = header.findIndex((h) => h.toLowerCase() === col.toLowerCase());
    return index === -1 ? undefined : index;
  }

  // shallow: the engine object shouldn't be wrapped in a deep proxy
  const layer = shallowRef<SpreadSheetLayer | null>(originalLayer);

  async function createLayer() {
    if (points.length === 0) {
      console.warn("No points provided to useSpreadsheetLayer");
      return;
    }
    let dataCsv: string | undefined;
    let lonCol = 0; // RA
    let latCol = 1; // Dec
    let distCol = 2; // Distance, if present

    if (isArray2(points) || isArray3(points)) {
      dataCsv = buildCsv(points);
    }

    if (isCoordinateJsonArray(points)) {
      dataCsv = jsonToCsv(points);
      // get the first row to determine which columns are ra/dec
      const headerRow = Object.keys(points[0]!);
      if (!headerRow.includes("ra") || !headerRow.includes("dec")) {
        throw new Error(`No RA or DEC in  ${headerRow}`);
      }
      latCol = headerRow.findIndex((h) => h.toLowerCase() === "dec");
      lonCol = headerRow.findIndex((h) => h.toLowerCase() === "ra");
      if (distanceColumn !== null) {
        distCol = headerRow.findIndex((h) => h.toLowerCase() === distanceColumn.toLowerCase());
        if (distCol === -1) {
          console.warn(`Distance column "${distanceColumn}" not found in data; ignoring distance`);
        }
      }
    }

    if (!dataCsv) {
      throw new Error(
        "Point data is not in a recognized format. Must be either [ra: number, dec: number][] or [ra: number, dec: number, distance: number][] or { ra: number, dec: number, dist?: number, ... }[]",
      );
    }

    const l = await store.createTableLayer({
      name,
      referenceFrame: "Sky",
      dataCsv,
    });
    header = l.get_header();
    l.set_lngColumn(lonCol);
    l.set_raUnits(raUnit);
    l.set_latColumn(latCol);
    // setup distance column if included
    if (distanceColumn && distCol !== -1) {
      l.set_altColumn(distCol);
      l.set_altType(AltTypes.distance);
      l.set_altUnit(distanceUnit);
      l.set_showFarSide(true);
    }
    l.set_markerScale(MarkerScales.screen);
    l.set_color(Color.fromHex(color));
    l.set_scaleFactor(markerSize);
    l.set_plotType(MARKER_TYPE_MAP[markerType]);
    l.set_pointScaleType(sizeScale);
    l.set_opacity(opacity);
    console.log("Created spreadsheet layer", l.get_name());
    originalLayer = l;
    layer.value = l;
    setColorColumn(colorColumn);
    setSizeColumn(sizeColumn);
    return l;
  }

  // A single, user-customizable filter. Defaults to keeping every row; the
  // consumer overrides it via setFilter().
  let filter: SpreadSheetLayerFilter = () => true;
  function setFilter(f: SpreadSheetLayerFilter) {
    filter = f;
  }

  // Apply the current filter to the table.
  function applyFilter() {
    if (!originalLayer) return;
    originalLayer.set_filter(filter, false);
  }

  function setVisible(visible: boolean) {
    if (!originalLayer) return;
    originalLayer.set_enabled(visible);
  }

  function show() {
    setVisible(true);
  }
  function hide() {
    setVisible(false);
  }

  /** color each row from a column of literal colors, or `null` to go back to the single layer color */
  function setColorColumn(col: string | null) {
    if (!originalLayer) return;
    originalLayer.set_dynamicColor(false);
    originalLayer.set_colorMapColumn(col === null ? -1 : (getColumnIndex(col) ?? -1));
  }

  /** size each row from a column (see `sizeScale`), or `null` for one size */
  function setSizeColumn(col: string | null) {
    if (!originalLayer) return;
    originalLayer.set_sizeColumn(col === null ? -1 : (getColumnIndex(col) ?? -1));
  }

  function setOpacity(value: number) {
    originalLayer?.set_opacity(value);
  }

  function setMarkerSize(value: number) {
    originalLayer?.set_scaleFactor(value);
  }

  return {
    createLayer,
    layer,
    applyFilter,
    setFilter,
    show,
    hide,
    setVisible,
    getColumnIndex,
    setColorColumn,
    setSizeColumn,
    setOpacity,
    setMarkerSize,
  };
}
