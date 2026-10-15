import { WWTControl } from "@wwtelescope/engine";
import type { engineStore } from "@wwtelescope/engine-pinia";

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

const addedToFrame: (() => void)[] = [];

/**
 * Add a callback that runs once per WorldWide Telescope render frame.
 *
 * Uses the engine's own frame callbacks (engine >= 7.36), which run at the end of
 * `renderOneFrame`, after the matrices are restored -- the same point the old
 * `renderOneFrame` patch called them. `store.addFrameCallback` is the same thing via pinia.
 *
 * If the same callback is provided again, it is skipped and a warning is logged.
 *
 * If `preRender` is `true`, one frame is rendered immediately before the callback is attached.
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

  // pre-render the frame before adding // default is undefined
  if (preRender) WWTControl.singleton.renderOneFrame();

  addedToFrame.push(cb);
  WWTControl.singleton.addFrameCallback(cb);
}

export function removeFromWWTRenderLoop(cb: () => void) {
  const idx = addedToFrame.indexOf(cb);
  if (idx === -1) return;
  // begin removing items at idx, and remove just 1
  addedToFrame.splice(idx, 1);
  WWTControl.singleton.removeFrameCallback(cb);
}
