<!--  -->
<template>
  <v-radio-group
    v-model="selectedShader"
    class="pointer-events-auto"
    label="Shader"
  >
    <v-radio 
      v-for="shaderName in shaders.keys()"
      :key="shaderName"
      :label="shaderName"
      :value="shaderName"
    >
    </v-radio>
  </v-radio-group>
</template>

<script setup lang="ts">
/* eslint-disable @typescript-eslint/no-unused-vars */
import { ref, computed ,onMounted, Ref} from 'vue';

import { addToWWTRenderLoop , renderOneFrame} from "@/wwt-hacks";
import {SimpleLineList, Vector3d, Color } from "@wwtelescope/engine";
import { DeadSimpleShader } from "@/shaders/DeadSimpleShaders";
import { FullScreenQuad } from "@/shaders/FullScreenQuad";
import { SunTrackerShader } from "@/shaders/SunTrackerShader";
import { AstroCalc, SpaceTimeController, Settings } from "@wwtelescope/engine";
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
      if (store.$wwt.inst) {
        const linelist = new SimpleLineList();
        // the x, y origin is at 0,0 in ra/dec. the extent is physical au
        // to give 2d perspective in z. set pure2D to false. 
        // give z coordinates. should be greater z>=1, otherwise they can get clipped
        linelist.addLine(Vector3d.create(0,0,0), Vector3d.create(x, y, z ?? 0));
        linelist.pure2D = !in3d;
        linelist.useLocalCenters = false; // if true, this would center it on the page
        linelist.set_depthBuffered(false); // will only do the local center if set_depthBuffered(true)
        linelist.drawLines(store.$wwt.inst.ctl.renderContext, 1, Color.fromHex(color) );
      }
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
    if (store.$wwt.inst) {
      DeadSimpleShader.use(store.$wwt.inst.ctl.renderContext); // has the gl.drawArrays call internal
    }
  }
};

const fullscreenshader = {
  name: "Full Screen Quad",
  code: () => {
    if (store.$wwt.inst) {
      FullScreenQuad.use(store.$wwt.inst.ctl.renderContext); // has the gl.drawArrays call internal
    }
  }
};

const suntrackershader = {
  name: "Sun Tracker",
  code: () => {
    if (store.$wwt.inst && !in3d) {
      SunTrackerShader.use(store.$wwt.inst.ctl.renderContext, location.lat, location.lon);
    }
  }
};


const allShaders = [
  linesShader,
  deadSimpleShader,
  fullscreenshader,
  suntrackershader,
  {name: 'None', code: () => {return;}}
] as const;
const shaders = new Map<typeof allShaders[0]['name'], () => void>();
allShaders.map(v => {
  if (!shaders.has(v.name)) {
    shaders.set(v.name, v.code);
  }
});



const selectedShader = ref<typeof allShaders[0]['name']>('None');

const selectedShaderFunction = computed(() => {
  if (shaders.has(selectedShader.value)) {
    return shaders.get(selectedShader.value) as ()=> void;
  }
  return () => {return;};
});

onMounted(() => {
  store.waitForReady().then(async () => {
    renderOneFrame();
    addToWWTRenderLoop(() => {
      if (selectedShaderFunction.value) {
        selectedShaderFunction.value();
      }
    });
  });
});

</script>

