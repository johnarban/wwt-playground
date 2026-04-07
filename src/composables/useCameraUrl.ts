import { computed, watch } from "vue";
import { engineStore } from "@wwtelescope/engine-pinia";
import { WWTControl } from "@wwtelescope/engine";
import { R2D } from "@wwtelescope/astro";
import { moveViewCamera, type CameraView } from "../wwt-hacks";

/**
 * Syncs the WWT view camera with URL search params.
 *
 * - On `ready`, reads ?ra/dec/fov/rot/angle from the URL and snaps to that
 *   view (falling back to `fallback` if the URL has no params).
 * - Afterwards, keeps the URL params updated as the camera moves.
 *
 * @param fallback  View to use when no URL params are present.
 * @param ready     Reactive boolean — sync starts once this is `true`.
 */
export function useCameraUrl(fallback: CameraView) {
  const store = engineStore();

  // ─── Live camera values ───────────────────────────────────────────────────

  // lng/lat read directly from viewCamera (same units WWT uses internally).
  const lng         = computed(() => ((360 - store.raRad * R2D) % 360));
  const lat         = computed(() => store.decRad * R2D);
  const zoomDeg     = computed(() => store.zoomDeg);
  const rotationDeg = computed(() => store.rollRad * R2D);
  const angleDeg    = computed(() => WWTControl.singleton.renderContext.viewCamera.angle);

  // ─── URL read / write ─────────────────────────────────────────────────────

  function readUrl(): CameraView | null {
    const p   = new URLSearchParams(window.location.search);
    const lngV = +(p.get("lng") ?? fallback.lng);
    const latV = +(p.get("lat") ?? fallback.lat);
    const fov = +(p.get("fov")   ?? fallback.zoomDeg);
    const rot = +(p.get("rot")   ?? fallback.rotationDeg);
    const ang = +(p.get("angle") ?? fallback.angleDeg);
    return { lng: lngV, lat: latV, zoomDeg: fov, rotationDeg: rot, angleDeg: ang, opacity: fallback.opacity };
  }

  function writeUrl() {
    const url = new URL(window.location.href);
    url.searchParams.set("lng",   lng.value.toFixed(6));
    url.searchParams.set("lat",   lat.value.toFixed(6));
    url.searchParams.set("fov",   zoomDeg.value.toFixed(6));
    url.searchParams.set("rot",   rotationDeg.value.toFixed(6));
    url.searchParams.set("angle", angleDeg.value.toFixed(6));
    window.history.replaceState({}, "", url);
  }

  // ─── Apply initial view, then track ──────────────────────────────────────

  function init() {
    const view = readUrl() ?? fallback;

    moveViewCamera(view, true);
    // window.setTimeout(() => moveViewCamera(view, true), 50);

    // Start keeping the URL in sync after the initial snap.
    watch([lng, lat, zoomDeg, rotationDeg, angleDeg], writeUrl);
  }

  init();
}
