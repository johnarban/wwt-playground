/**
 * This alternative hack was completed with help of Chat-GPT Codex
 * It's far more complex that my more brute force approach. 
 * Instead of just deleting the cache, it directly updates the 
 * textures. This was based on it seems on the TangentTile.requestImage
 * 
 * 
 * My method - does much the same, but uses renderContext.drawImageSet to setup the new textures
 */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { ImageSetLayer, Imageset, TileCache, WWTControl, Tile, RenderContext } from "@wwtelescope/engine";

import { TypedNumberArray } from "./types";


function forEachImagesetTile(imageset: Imageset, cb: (tile: Tile) => void): void {
  // the tile cache has all of the tiles
  const tiles = TileCache._tiles as Record<string, Tile> | undefined;
  if (!tiles) {
    // console.log
    return;
  }

  const imageSetId = imageset.get_imageSetID();
  const keys = Object.keys(tiles);
  for (const key of keys) {
    const tile = tiles[key];
    // see getTileKey in engine/utils.js
    if (!key.startsWith(imageSetId.toString()) || !tile) {
      continue;
    };
    cb(tile);
  }
}

function _replaceTileTexture(tile: Tile | null | undefined, gl: WebGLRenderingContext | WebGL2RenderingContext | null | undefined) {
  if (!tile) {
    return;
  }
  
  // this is just an "abundance of caution" check i think
  // there is no reason i think hat these would not be set
  if (!tile.fitsImage && tile.dataset) {
    console.error('there is no fits image');
    tile.fitsImage = tile.dataset.get_wcsImage();
  }
  // also no reason these would not be set
  // also this runs just fine without deleting the text first
  // but i am pretty sure it needs to be deleted otherwise there
  // is probably some memory badness gonna happen
  if (gl && tile?.texture2d) {
    gl.deleteTexture(tile.texture2d);
    tile.texture2d = null;
  }
  
  // it doesn't seem to matter what these are
  // actually set to here
  tile.demTile = true;
  tile.demReady = true;
  tile.requestPending = false;
  
  // in short - this whole function could just be this line, since we only ever pass it a Tile
  tile.makeTexture();
  
}

export function refreshImagesetTileTextures(imageset: Imageset): void {
  const renderContext = WWTControl.singleton.renderContext;
  const gl = (renderContext && renderContext.gl) || null;

  forEachImagesetTile(imageset, (tile) => _replaceTileTexture(tile, gl));

  WWTControl.singleton.renderOneFrame();
}

export function applyFitsSlice(layer: ImageSetLayer, fullDataUnit: TypedNumberArray, z: number): void {
  const fitsImage = layer.getFitsImage();
  if (!fitsImage) {
    return;
  }

  const axisSize = fitsImage.axisSize || [];
  const sizeX = axisSize[0] || 0;
  const sizeY = axisSize[1] || 0;
  const sizeZ = axisSize[2] || 0;
  if ((fitsImage.numAxis || 0) < 3 || sizeX <= 0 || sizeY <= 0 || sizeZ <= 0) {
    return;
  }

  const pageSize = sizeX * sizeY;
  const zIndex = Math.max(0, Math.min((z | 0), sizeZ - 1));
  const start = zIndex * pageSize;
  const end = start + pageSize;
  if (end > fullDataUnit.length) {
    return;
  }

  fitsImage.dataUnit = fullDataUnit.slice(start, end);
  refreshImagesetTileTextures(layer.get_imageSet());
}

