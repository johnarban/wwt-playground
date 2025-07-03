import { WWTControl } from "@wwtelescope/engine";
import { type WWTEngineStore } from "./types";

let wwtReady = false;
export async function waitForWWTReady(store: WWTEngineStore): Promise<void> {
  // by @Carifio24
  if (wwtReady) {
    return;
  }
  return store.waitForReady().then(() => {
    WWTControl.singleton.renderOneFrame();
    wwtReady = true;
  });
}