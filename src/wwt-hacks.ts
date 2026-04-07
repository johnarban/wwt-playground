import { WWTControl } from "@wwtelescope/engine";
import type { engineStore } from '@wwtelescope/engine-pinia';

// ─── Camera view type ────────────────────────────────────────────────────────

export interface CameraView {
  lng: number;
  lat: number;
  zoomDeg: number;
  rotationDeg: number;
  angleDeg: number;
  opacity: number;
}

/**
 * Move the WWT camera to the given view without changing the tracked object.
 * followed google codewiki advice
**/
export function moveViewCamera(view: CameraView, instant = false): void {
  const control = WWTControl.singleton;
  const rc = control.renderContext;

  rc.targetCamera.lat      = view.lat;
  rc.targetCamera.lng      = view.lng;
  rc.targetCamera.zoom     = view.zoomDeg;
  rc.targetCamera.rotation = view.rotationDeg;
  rc.targetCamera.angle    = view.angleDeg;
  rc.targetCamera.opacity  = view.opacity;

  if (instant) {
    rc.viewCamera.lat      = rc.targetCamera.lat;
    rc.viewCamera.lng      = rc.targetCamera.lng;
    rc.viewCamera.zoom     = rc.targetCamera.zoom;
    rc.viewCamera.rotation = rc.targetCamera.rotation;
    rc.viewCamera.angle    = rc.targetCamera.angle;
    rc.viewCamera.opacity  = rc.targetCamera.opacity;
  }

  control.renderOneFrame();
}

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