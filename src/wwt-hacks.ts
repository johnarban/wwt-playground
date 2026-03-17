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


const addedToFrame: (()=>void)[] = [];
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
  if (addedToFrame.includes(cb)) {
    console.warn(`Attempted to add ${cb} already in render loop. Skipping`);
    return;
  }
  // pre-render the frame before adding // default is undefined
  if (preRender) WWTControl.singleton.renderOneFrame();
  
  const renderOneFrame = WWTControl.singleton.renderOneFrame;
  const newFrameRender = function() { 
    renderOneFrame.call(WWTControl.singleton);
    cb();
  };
  addedToFrame.push(cb);
  WWTControl.singleton.renderOneFrame = newFrameRender;
}
