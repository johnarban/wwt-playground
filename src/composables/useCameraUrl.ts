import { engineStore } from "@wwtelescope/engine-pinia";
import { WWTControl } from "@wwtelescope/engine";
import { R2D } from "@wwtelescope/astro";
import { moveViewCamera, type CameraView } from "../wwt-hacks";
import { watch, onMounted, ref } from 'vue';

export function useCameraUrl(fallback: CameraView) {
  const store = engineStore();

  const lng         = () => ((360 - store.raRad * R2D) % 360);
  const lat         = () => store.decRad * R2D;
  const zoomDeg     = () => store.zoomDeg;
  const rotationDeg = () => store.rollRad * R2D;
  const angleDeg    = () => WWTControl.singleton.renderContext.viewCamera.angle;
  const time        = () => store.currentTime.getTime();
  const successWatch = ref(false);

  function readUrl(): CameraView {
    const p = new URLSearchParams(window.location.search);
    return {
      lng:         +(p.get("lng")   ?? fallback.lng),
      lat:         +(p.get("lat")   ?? fallback.lat),
      zoomDeg:     +(p.get("fov")   ?? fallback.zoomDeg),
      rotationDeg: +(p.get("rot")   ?? fallback.rotationDeg),
      angleDeg:    +(p.get("angle") ?? fallback.angleDeg),
      time:        +(p.get("time") ?? fallback.time),
    };
  }

  function buildViewUrl(): string {
    const url = new URL(window.location.href);
    url.searchParams.set("lng",   lng().toFixed(6));
    url.searchParams.set("lat",   lat().toFixed(6));
    url.searchParams.set("fov",   zoomDeg().toFixed(6));
    url.searchParams.set("rot",   rotationDeg().toFixed(6));
    url.searchParams.set("angle", angleDeg().toFixed(6));
    url.searchParams.set("time", time().toString());
    return url.toString();
  }

  async function copyViewUrl() {
    await navigator.clipboard.writeText(buildViewUrl());
    successWatch.value = true;
  }

  watch(successWatch, success => {
    if (success) {
      setTimeout(() => {
        successWatch.value = false;
      }, 1800);
    }
  });
  // Apply initial view from URL (or fallback) once.
  onMounted(() => {
    store.waitForReady().then(() => {
      moveViewCamera(readUrl(), true);
    });
  });

  return { copyViewUrl, copySuccess: successWatch };
}
