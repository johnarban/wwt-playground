import { WWTControl } from "@wwtelescope/engine";
import type { engineStore } from '@wwtelescope/engine-pinia';

let wwtReady = false;
export async function waitForWWTReady(store: ReturnType<typeof engineStore>): Promise<void> {
  // by @Carifio24
  if (wwtReady) {
    return;
  }
  return store.waitForReady().then(() => {
    WWTControl.singleton.renderOneFrame();
    wwtReady = true;
  });
}

export function renderOneFrame() {
  WWTControl.singleton.renderOneFrame();
}


/**
 * Some notes about renderOneFrame
 * It does things in this order
 * 1. get imageset
 * 2. make sure canvas has proper size 
 * 3. Updates positions and moves
 * 4. // ignore Solar System mode for now
 * 5. Draws backgroundImageset
 * 6. Draws Foreground imageset
 * 7. renders Hips
 * 8. Draws planets
 * 8. Draws Sky Overlays
 * 9. Draws crosshairs
 * 10. Draws Annotations
 * 
 * 
 */

const addedToFrame: (()=>void)[] = [];
let isRenderLoopPatched = false;
function ensureRenderLoopPatched() {
  if (isRenderLoopPatched) return;
  
  const originalRenderOneFrame = WWTControl.singleton.renderOneFrame;
  const newRenderOneFrame = function() {
    originalRenderOneFrame.call(WWTControl.singleton);
    
    const callbacks = addedToFrame.slice();
    for (const cb of callbacks) {
      try {
        cb();
      } catch(e) {
        console.error('Error from added frame',e);
      }
    }
  };
  WWTControl.singleton.renderOneFrame = newRenderOneFrame;
  isRenderLoopPatched = true;
}

/**
 * Add a callback that runs once per WorldWide Telescope render frame by patching
 * `WWTControl.singleton.renderOneFrame`.
 *
 * If the same callback is provided again, it is skipped and a warning is logged.
 *
 * If `preRender` is `true`, one frame is rendered immediately before the callback is attached.
 * 
 * Callback functions are added to a non-exported list: `addedToFrame`
 *
 * @param cb - The function to invoke after each call to `renderOneFrame`.
 * @param preRender - When `true`, renders one frame immediately before installing the callback.
 */
export function addToWWTRenderLoop(cb: () => void, preRender?: boolean) {
  // don't add the same function more than once
  if (addedToFrame.indexOf(cb) !== -1) {
    console.warn(`Attempted to add ${cb} already in render loop. Skipping`);
    return;
  }
  
  ensureRenderLoopPatched();
  // pre-render the frame before adding // default is undefined
  if (preRender) WWTControl.singleton.renderOneFrame();
  
  addedToFrame.push(cb);
}


export function removeFromWWTRenderLoop(cb: () => void) {
  const idx = addedToFrame.indexOf(cb);
  if (idx === -1) return;
  // begin removing items at idx, and remove just 1
  addedToFrame.splice(idx, 1);
}



// Let's do the same patching for the sky oberlays


const addedBeforeSkyOverlays: (()=>void)[] = [];
let isSkyOverlaysPatched = false;
function ensureSkyOverlaysPatched() {
  if (isSkyOverlaysPatched) return;

  
  
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  const originalDrawSkyOverlays = WWTControl.singleton._drawSkyOverlays;
  
  const newDrawSkyOverlays = function() {
    // call the callbacks first
    const callbacks = addedBeforeSkyOverlays.slice();
    for (const cb of callbacks) {
      try {
        cb();
      } catch (e) {
        console.error('Error from added sky overlay callback', e);
      }
    }
    originalDrawSkyOverlays.call(WWTControl.singleton);
    // there is an opportuniy here to do something after the sky overlays as well, 
    // but for now we just want before
  };
  
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  WWTControl.singleton._drawSkyOverlays = newDrawSkyOverlays;
  isSkyOverlaysPatched = true;
}
export function addBeforeWWTSkyOverlays(cb: () => void) {
  if (addedBeforeSkyOverlays.indexOf(cb) !== -1) {
    console.warn(`Attempted to add ${cb} already before sky overlays. Skipping`);
    return;
  }

  ensureSkyOverlaysPatched();
  addedBeforeSkyOverlays.push(cb);
}

export function removeBeforeWWTSkyOverlays(cb: () => void) {
  const idx = addedBeforeSkyOverlays.indexOf(cb);
  if (idx === -1) return;
  addedBeforeSkyOverlays.splice(idx, 1);
}
