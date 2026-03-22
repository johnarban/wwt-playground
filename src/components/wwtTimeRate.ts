// a composable to have the actually internal WWT time rate

import { type Ref, ref, onMounted, onUnmounted } from "vue";
import { engineStore } from "@wwtelescope/engine-pinia";
import { SpaceTimeController } from "@wwtelescope/engine";
import { addToWWTRenderLoop, removeFromWWTRenderLoop } from "@/wwt-hacks";

export function useWwtClockStatus(options?: {pollRateMs: number}) {
  const store = engineStore();
  
  
  const timeRate: Ref<number> = ref(SpaceTimeController.get_timeRate()); // may or may not be correct
  const isClockSynced: Ref<boolean> = ref(SpaceTimeController.get_syncToClock()); // may or may not be correct

  
  function syncFromEngine() {
    const newRate = SpaceTimeController.get_timeRate();
    const newSync = SpaceTimeController.get_syncToClock();
    
    if (timeRate.value !== newRate) {
      timeRate.value = newRate;
    }
    if (isClockSynced.value !== newSync) {
      isClockSynced.value = newSync;
    }
  }
  
  let lastPoll = 0;
  const pollRate = options?.pollRateMs ?? 150;
  const onRenderFrame = () => {
    const now = performance.now();
    if (now - lastPoll < pollRate) return;
    lastPoll = now;
    syncFromEngine();
  };
  
  onMounted(() => {
    store.waitForReady()
      .then(() => {
        syncFromEngine();
        addToWWTRenderLoop(onRenderFrame);
      });
  });
  
  onUnmounted(() => {
    removeFromWWTRenderLoop(onRenderFrame);
  });
  
  
  return { timeRate, isClockSynced };
  
    
}