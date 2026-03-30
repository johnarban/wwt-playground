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
          v-for="shaderName in shaders.keys()"
          :key="shaderName"
          :label="shaderName"
          :value="shaderName"
        >
          <template 
            #label
          >
            <div class="shader-label">
              <div>{{ shaderName }}</div>
              <label
                v-if="['Sun Tracker', 'Horizon'].includes(shaderName) && selectedShader === shaderName"
                class="shader-toggle pointer-events-auto ml-2"
                @click.stop
              >
                <input
                  v-model="usePixelScale"
                  type="checkbox"
                >
                <span>Use Screen Scale</span>
              </label>
            </div>
          </template>
        </v-radio>
      </v-radio-group>
    </fieldset>
  </div>
</template>

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

<script setup lang="ts">
/* eslint-disable @typescript-eslint/no-unused-vars */
import { ref, computed ,onMounted, Ref} from 'vue';

import { addBeforeWWTSkyOverlays, addToWWTRenderLoop , renderOneFrame} from "@/wwt-hacks";
import {SimpleLineList, Vector3d, Color } from "@wwtelescope/engine";
import { DeadSimpleShader } from "@/shaders/DeadSimpleShader/DeadSimpleShaders";
import { FullScreenQuad } from "@/shaders/FullScreenQuad/FullScreenQuad";
import { SunTrackerShader } from "@/shaders/SunTracker/SunTrackerShader";
import { HorizonShader } from "@/shaders/HorizonShader/horizonShader";
import { HorizonTextureShader } from '@/shaders/HorizonTextureShader/horizonTextureShader';
import { AstroCalc, SpaceTimeController, Settings, WWTControl } from "@wwtelescope/engine";
import { SolarSystemObjects } from "@wwtelescope/engine-types";
import { engineStore } from '@wwtelescope/engine-pinia';
import { skyBackgroundImagesets } from "@cosmicds/vue-toolkit";
const store = engineStore();

interface AddShaderProps {
  in3d: boolean,
  location: {lat: number, lon: number}
}

const { in3d, location } = defineProps<AddShaderProps>();
  
const linesShader = {
  name: 'Debug Lines',
  code: () => {
    /**
       * Drawing some diagnostic lines on the view. Static 2d lines and dynamic 3d lines
       */
    function draw(x: number,y: number, color: string, z?: number) {

      const linelist = new SimpleLineList();
      // the x, y origin is at 0,0 in ra/dec. the extent is physical au
      // to give 2d perspective in z. set pure2D to false. 
      // give z coordinates. should be greater z>=1, otherwise they can get clipped
      linelist.addLine(Vector3d.create(0,0,0), Vector3d.create(x, y, z ?? 0));
      linelist.pure2D = !in3d;
      linelist.useLocalCenters = false; // if true, this would center it on the page
      linelist.set_depthBuffered(false); // will only do the local center if set_depthBuffered(true)
      linelist.drawLines(WWTControl.singleton.renderContext, 1, Color.fromHex(color) );

    }
    const d = in3d ? 100 : 1;
    draw(d, 0, '#FF0000');
    draw(-d, 0, '#FFAA00')
    ;
    draw(0, d, '#00FF00');
    draw(0, -d, '#00FFAA');
      
    if (in3d) { // add a z line
      draw(0, 0, '#0000FF', d);
      draw(0, 0, '#00AAFF', -d);
    }
      
  }
};

const deadSimpleShader = {
  name: "Dead Simple Shader",
  code: () => {

    DeadSimpleShader.use(WWTControl.singleton.renderContext); // has the gl.drawArrays call internal
  }
};

const fullscreenshader = {
  name: "Full Screen Quad",
  code: () => {
    FullScreenQuad.use(WWTControl.singleton.renderContext); // has the gl.drawArrays call internal
  }
};

const usePixelScale = ref(true);
const suntrackershader = {
  name: "Sun Tracker",
  code: () => {
    if (!in3d) {
      SunTrackerShader.setScale(usePixelScale.value ? 'screen' : 'world');
      SunTrackerShader.use(WWTControl.singleton.renderContext, location.lat, location.lon);
    }
  }
};
const horizonshader = {
  name: "Horizon",
  code: () => {
    if (!in3d) {
      HorizonShader.setScale(usePixelScale.value ? 'screen' : 'world');
      HorizonShader.use(WWTControl.singleton.renderContext, location.lat, location.lon);
    }
  }
};

const horizonTextureShader = {
  name: "Horizon Texture",
  code: () => {
    if (!in3d) {
      HorizonTextureShader.setScale(usePixelScale.value ? 'screen' : 'world');
      HorizonTextureShader.use(WWTControl.singleton.renderContext, location.lat, location.lon);
    }
  }
};

const allShaders = [
  linesShader,
  deadSimpleShader,
  fullscreenshader,
  suntrackershader,
  horizonshader,
  horizonTextureShader,
  {name: 'None', code: () => {return;}}
] as const;
const shaders = new Map<typeof allShaders[0]['name'], () => void>();
allShaders.map(v => {
  if (!shaders.has(v.name)) {
    shaders.set(v.name, v.code);
  }
});



const selectedShader = ref<typeof allShaders[0]['name']>('Horizon Texture');

const selectedShaderFunction = computed(() => {
  if (shaders.has(selectedShader.value)) {
    return shaders.get(selectedShader.value) as ()=> void;
  }
  return () => {return;};
});

const behindGrid = ['Horizon', 'Horizon Texture'];

onMounted(() => {
  store.waitForReady().then(async () => {
    renderOneFrame();
    addBeforeWWTSkyOverlays(() => {
      if (behindGrid.includes(selectedShader.value) && selectedShaderFunction.value) {
        selectedShaderFunction.value();
      }
    });
    addToWWTRenderLoop(() => {
      if (!behindGrid.includes(selectedShader.value) && selectedShaderFunction.value) {
        selectedShaderFunction.value();
      }
    });
  });
});

</script>
