import { RenderContext, TileCache, type Imageset } from "@wwtelescope/engine";

// export function getTileKey(imageset, level, x, y, parent) {
//   if (imageset.get_projection() === 7 && parent != null) {
//     const ipix = (parent).ipix * 4 + y * 2 + x;
//     return imageset.get_imageSetID().toString() + '\\' + level.toString() + '\\' + ipix.toString();
//   }

//   return imageset.get_imageSetID().toString() + '\\' + level.toString() + '\\' + y.toString() + '_' + x.toString();
// }

/**
 * Evict an imageset's cached tiles so the engine rebuilds them. set_centerX/set_rotation/... only
 * affect tiles created afterwards. Only the base level is covered, which is all a skyImage set has.
 * Relies on untyped engine internals (see shims-wwt.d.ts). There is no public per-imageset eviction.
 */
export function removeTilesForImageset(imageset: Imageset) {
  const level = imageset.get_baseLevel();
  const maxX = RenderContext.getTilesXForLevel(imageset, level);
  const maxY = RenderContext.getTilesYForLevel(imageset, level);
  for (let x = 0; x < maxX; x++) {
    for (let y = 0; y < maxY; y++) {
      // getCachedTile only reads the cache (getTile would create a tile just to throw it away)
      const tile = TileCache.getCachedTile(level, x, y, imageset, null);
      if (!tile) continue;
      // _key is filled lazily, get_key() computes it
      const key = tile.get_key();
      tile.cleanUp(true);
      TileCache.removeFromQueue(key, false);
      // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
      delete TileCache._tiles[key];
    }
  }
}
