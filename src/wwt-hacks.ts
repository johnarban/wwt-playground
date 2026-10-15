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
 */

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

// Let's do the same patching for the sky overlays

/**
 * Draw "behind the sky overlays" by wrapping the engine's private `WWTControl._drawSkyOverlays`.
 * Engine 7.41 has no hook earlier than the frame callbacks (which run after everything), so this
 * is the one remaining render-loop hack. Limits:
 * - it runs after `Planets.drawPlanets`, so the drawing still lands on top of the planets
 * - in sky mode the engine only calls `_drawSkyOverlays` when `showSolarSystem` is on
 * - it also runs in 3D/solar-system mode (inside the Milky Way world matrix); callers guard on 3D
 * - it depends on a private method name
 * A real fix is an engine "pre-overlay" callback list (before drawPlanets or at the top of _drawSkyOverlays).
 */

interface PatchedControl {
  _drawSkyOverlays: () => void;
}

const addedBeforeSkyOverlays: (() => void)[] = [];
let originalDrawSkyOverlays: (() => void) | null = null;

function control() {
  return WWTControl.singleton as unknown as PatchedControl;
}

function patch() {
  if (originalDrawSkyOverlays) return;
  const ctl = control();
  const original = ctl._drawSkyOverlays;
  originalDrawSkyOverlays = original;
  ctl._drawSkyOverlays = function () {
    // call the callbacks first
    for (const cb of addedBeforeSkyOverlays.slice()) {
      try {
        cb();
      } catch (e) {
        console.error("Error from added sky overlay callback", e);
      }
    }
    original.call(WWTControl.singleton);
  };
}

function unpatch() {
  if (!originalDrawSkyOverlays) return;
  control()._drawSkyOverlays = originalDrawSkyOverlays;
  originalDrawSkyOverlays = null;
}

export function addBeforeWWTSkyOverlays(cb: () => void) {
  if (addedBeforeSkyOverlays.indexOf(cb) !== -1) {
    console.warn(`Attempted to add ${cb} already before sky overlays. Skipping`);
    return;
  }
  patch();
  addedBeforeSkyOverlays.push(cb);
}

export function removeBeforeWWTSkyOverlays(cb: () => void) {
  const idx = addedBeforeSkyOverlays.indexOf(cb);
  if (idx === -1) return;
  addedBeforeSkyOverlays.splice(idx, 1);
  if (addedBeforeSkyOverlays.length === 0) unpatch();
}
