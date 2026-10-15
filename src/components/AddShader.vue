<template>
  <div>
    <fieldset>
      <legend>Select shader</legend>
      <v-radio-group
        v-model="selectedShader"
        class="pointer-events-auto"
        density="compact"
        hide-details
      >
        <v-radio
          v-for="shaderName in SHADER_NAMES"
          :key="shaderName"
          :label="shaderName"
          :value="shaderName"
        >
          <template #label>
            <div class="shader-label">
              <div>{{ shaderName }}</div>
              <!-- a native checkbox: vuetify's v-checkbox conflicts with the radio group -->
              <label
                v-if="SCALABLE.includes(shaderName) && selectedShader === shaderName"
                class="shader-toggle pointer-events-auto ml-2"
                @click.stop
              >
                <input
                  v-model="usePixelScale"
                  type="checkbox"
                />
                <span>Use Screen Scale</span>
              </label>
            </div>
          </template>
        </v-radio>
      </v-radio-group>
    </fieldset>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from "vue";
import { engineStore } from "@wwtelescope/engine-pinia";
import { SimpleLineList, Vector3d, Color, WWTControl } from "@wwtelescope/engine";

import {
  addToWWTRenderLoop,
  removeFromWWTRenderLoop,
  addBeforeWWTSkyOverlays,
  removeBeforeWWTSkyOverlays,
} from "@/wwt-hacks";
import { DeadSimpleShader } from "@/shaders/DeadSimpleShader/DeadSimpleShaders";
import { FullScreenQuad } from "@/shaders/FullScreenQuad/FullScreenQuad";
import { SunTrackerShader } from "@/shaders/SunTracker/SunTrackerShader";
import { HorizonShader } from "@/shaders/HorizonShader/horizonShader";
import { HorizonTextureShader } from "@/shaders/HorizonTextureShader/horizonTextureShader";

const store = engineStore();

interface AddShaderProps {
  in3d: boolean;
  location: { lat: number; lon: number };
}

const props = defineProps<AddShaderProps>();

const SHADER_NAMES = [
  "Debug Lines",
  "Dead Simple Shader",
  "Full Screen Quad",
  "Sun Tracker",
  "Horizon",
  "Horizon Texture",
  "None",
] as const;
type ShaderName = (typeof SHADER_NAMES)[number];

// these draw before the sky overlays (grids, constellations), the rest draw on top of everything
const BEHIND_GRID: readonly ShaderName[] = ["Horizon", "Horizon Texture"];
// these have a screen/world size toggle
const SCALABLE: readonly ShaderName[] = ["Sun Tracker", "Horizon"];

const selectedShader = ref<ShaderName>("Horizon Texture");
const usePixelScale = ref(true);

/**
 * Drawing some diagnostic lines on the view. Static 2d lines and dynamic 3d lines.
 * SimpleLineList keeps its GL buffers, so the lists are built once per 2D/3D mode.
 */
const debugLines = new Map<boolean, [SimpleLineList, Color][]>();
function makeDebugLines(is3d: boolean) {
  function line(x: number, y: number, color: string, z?: number): [SimpleLineList, Color] {
    const linelist = new SimpleLineList();
    // the x, y origin is at 0,0 in ra/dec. the extent is physical au
    // to give 2d perspective in z. set pure2D to false.
    // give z coordinates. should be greater z>=1, otherwise they can get clipped
    linelist.addLine(Vector3d.create(0, 0, 0), Vector3d.create(x, y, z ?? 0));
    linelist.pure2D = !is3d;
    linelist.useLocalCenters = false; // if true, this would center it on the page
    linelist.set_depthBuffered(false); // will only do the local center if set_depthBuffered(true)
    return [linelist, Color.fromHex(color)];
  }
  const d = is3d ? 100 : 1;
  const lines = [line(d, 0, "#FF0000"), line(-d, 0, "#FFAA00"), line(0, d, "#00FF00"), line(0, -d, "#00FFAA")];
  if (is3d) {
    // add a z line
    lines.push(line(0, 0, "#0000FF", d), line(0, 0, "#00AAFF", -d));
  }
  return lines;
}

function drawDebugLines() {
  if (!debugLines.has(props.in3d)) debugLines.set(props.in3d, makeDebugLines(props.in3d));
  for (const [linelist, color] of debugLines.get(props.in3d)!) {
    linelist.drawLines(WWTControl.singleton.renderContext, 1, color);
  }
}

const scale = () => (usePixelScale.value ? "screen" : "world");

// each draws into the current WWT frame. the sky-only ones skip 3D mode
// keys are the display names
/* eslint-disable @typescript-eslint/naming-convention */
const shaders: Record<ShaderName, () => void> = {
  "Debug Lines": drawDebugLines,
  // these have the gl.drawArrays call internal
  "Dead Simple Shader": () => DeadSimpleShader.use(WWTControl.singleton.renderContext),
  "Full Screen Quad": () => FullScreenQuad.use(WWTControl.singleton.renderContext),
  "Sun Tracker": () => {
    if (props.in3d) return;
    SunTrackerShader.setScale(scale());
    SunTrackerShader.use(WWTControl.singleton.renderContext, props.location.lat, props.location.lon);
  },
  Horizon: () => {
    if (props.in3d) return;
    HorizonShader.setScale(scale());
    HorizonShader.use(WWTControl.singleton.renderContext, props.location.lat, props.location.lon);
  },
  "Horizon Texture": () => {
    if (props.in3d) return;
    HorizonTextureShader.setScale(scale());
    HorizonTextureShader.use(WWTControl.singleton.renderContext, props.location.lat, props.location.lon);
  },
  None: () => {},
};
/* eslint-enable @typescript-eslint/naming-convention */

function drawOnTop() {
  if (!BEHIND_GRID.includes(selectedShader.value)) shaders[selectedShader.value]();
}
function drawBehindGrid() {
  if (BEHIND_GRID.includes(selectedShader.value)) shaders[selectedShader.value]();
}

onMounted(() => {
  store.waitForReady().then(() => {
    addBeforeWWTSkyOverlays(drawBehindGrid);
    addToWWTRenderLoop(drawOnTop);
  });
});

onUnmounted(() => {
  removeFromWWTRenderLoop(drawOnTop);
  removeBeforeWWTSkyOverlays(drawBehindGrid);
});
</script>

<style>
.shader-label {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
}

.shader-toggle {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}
</style>
