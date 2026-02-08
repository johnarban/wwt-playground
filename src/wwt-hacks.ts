/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-dynamic-delete */
import { ImageSetLayer, Imageset, TileCache, WWTControl, Tile, RenderContext } from "@wwtelescope/engine";

import { TypedNumberArray } from "./types";


export function bustImageSetTileCache(imageset: Imageset) {
  const gl = WWTControl.singleton.renderContext.gl;
  for (const key of Object.keys(TileCache._tiles)) {
    if (key.startsWith(imageset.get_imageSetID().toString())) {
      const tile = TileCache._tiles[key];
      // get rid of the texture before deleting it from the cache
      if (gl && tile && tile.texture2d) gl.deleteTexture(tile.texture2d);
      delete TileCache._tiles[key];
    }
  }
}


export function applyFitsSlice(layer: ImageSetLayer, fullDataUnit: TypedNumberArray, z: number): void {
  const fi = layer.getFitsImage();
  if (!fi) {
    return;
  }


  const sizeZ = (fi.axisSize || [])[2] || 0;
  if ((fi.numAxis || 0) < 3 || fi.sizeX < 1 || fi.sizeY < 1 || sizeZ < 1) {
    console.error(`No slices on ImageSet ${layer.get_imageSet().get_name()}`);
    return;
  }

  const pageSize = fi.sizeX * fi.sizeY;
  const zIndex = Math.max(0, Math.min((z | 0), sizeZ - 1)); // clamp
  const start = zIndex * pageSize;
  const end = start + pageSize;
  if (end > fullDataUnit.length) {
    return;
  }

  fi.dataUnit = fullDataUnit.slice(start, end);
  bustImageSetTileCache(layer.get_imageSet());
  WWTControl.singleton.renderContext.drawImageSet(layer.get_imageSet(), 1);
  WWTControl.singleton.renderOneFrame();
}