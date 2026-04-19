/* eslint-disable @typescript-eslint/no-dynamic-delete */
/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck

import { RenderContext, TileCache, Imageset } from "@wwtelescope/engine";


// export function getTileKey(imageset, level, x, y, parent) {
//   if (imageset.get_projection() === 7 && parent != null) {
//     const ipix = (parent).ipix * 4 + y * 2 + x;
//     return imageset.get_imageSetID().toString() + '\\' + level.toString() + '\\' + ipix.toString();
//   }

//   return imageset.get_imageSetID().toString() + '\\' + level.toString() + '\\' + y.toString() + '_' + x.toString();
// }

export function removeTilesForImageset(imageset: Imageset) {
  const maxX = RenderContext.getTilesXForLevel(imageset, imageset.get_baseLevel());
  const maxY = RenderContext.getTilesYForLevel(imageset, imageset.get_baseLevel());
  for (let x = 0; x < maxX; x++) {
    for (let y = 0; y < maxY; y++) {
      const tile = TileCache.getTile(imageset.get_baseLevel(), x, y, imageset, null);
      if (!tile) continue;
      // console.log('Removing tile:', tile.dataset?.get_name(), 'Level:', imageset.get_baseLevel(), 'X:', x, 'Y:', y);
      tile.cleanUp(true);
      delete TileCache._tiles[tile._key];
      // TileCache.removeFromQueue(tile._key, true);
    }
  }
    
}