<template>
  <div 
    v-if="isFitsLayer"
    class="fits-layer-settings" 
  >
    <h3 v-if="imagesetLayer"> 
      Settings for {{ imagesetLayer.get_name() }} 
    </h3>
    <label>
      <span>vmin: </span>
      <input 
        v-model="vmin"
        type="range" 
        :min="dataMin" 
        :max="dataMax" 
        :step="(dataMax - dataMin) / 1000"
      ></label>
    <label>
      <span>vmax: </span>
      <input 
        v-model="vmax"
        type="range" 
        :min="dataMin" 
        :max="dataMax" 
        :step="(dataMax - dataMin) / 1000"
      ></label>
    <label>
      scale
      <select v-model="scale">
        <option 
          v-for="s of SCALES" 
          :key="s"
        >
          {{ s }}
        </option>
      </select>
    </label>
    <label>
      colormap
      <select v-model="colormap">
        <option 
          v-for="c of COLORMAPS" 
          :key="c"
        >
          {{ c }}
        </option>
      </select>
    </label>
  </div>
</template>
<script setup lang="ts">
import {ref, computed, watch} from 'vue';
import { ScaleTypes } from "@wwtelescope/engine-types";
import { ImageSetLayer, WWTControl} from '@wwtelescope/engine';
import { Colormaps, COLORMAPS } from './types';

interface Props {
  imagesetLayer: ImageSetLayer | null
}

const props = defineProps<Props>();

const isFitsLayer = computed(() => {
  return props.imagesetLayer ? props.imagesetLayer.getFitsImage() !== null : false;
});

const fitsImage = computed(() => {
  if (isFitsLayer.value && props.imagesetLayer) {
    return props.imagesetLayer.getFitsImage();
  }
  return null;
});

const vmin = ref(0);
const vmax = ref(0);

const SCALES = ['linear', 'log', 'power', 'squareRoot', 'histogramEqualization'] as const;
const scale = ref<typeof SCALES[number]>('linear');
  
const colormap = ref<Colormaps>(props.imagesetLayer?.get_colorMapperName() as Colormaps ?? 'viridis');
  
const dataMin = ref(0);
const dataMax = ref(0);

function setRange() {
  if (isFitsLayer.value) {
    if (fitsImage.value) {
      dataMin.value = parseFloat(fitsImage.value.header['DATAMIN']);
      dataMax.value = parseFloat(fitsImage.value.header['DATAMAX']);
      vmin.value = props.imagesetLayer?.get_imageSet().get_fitsProperties().lowerCut ?? dataMin.value;
      vmax.value = props.imagesetLayer?.get_imageSet().get_fitsProperties().upperCut ?? dataMax.value;
    }
  }
}

setRange();
watch(() => props.imagesetLayer, (iset) => {
  console.log(iset);
  setRange();
  colormap.value = props.imagesetLayer?.get_colorMapperName() as Colormaps ?? 'viridis';
});

watch(vmin, (v) => {
  if (!props.imagesetLayer) return;
  console.log(ScaleTypes[scale.value], v ,vmax.value);
  props.imagesetLayer.setImageScalePhysical(ScaleTypes[scale.value], v ,vmax.value);
  WWTControl.singleton.renderOneFrame();
  
});
watch(vmax, (v) => {
  if (!props.imagesetLayer) return;
  props.imagesetLayer.setImageScalePhysical(ScaleTypes[scale.value], vmin.value, v);
  WWTControl.singleton.renderOneFrame();
});
watch(scale, (s) => {
  if (!props.imagesetLayer) return;
  props.imagesetLayer.setImageScalePhysical(ScaleTypes[s], vmin.value, vmax.value);
  WWTControl.singleton.renderOneFrame();
});

watch(colormap, (c) => {
  if (!props.imagesetLayer) return;
  props.imagesetLayer.set_colorMapperName(c);
  WWTControl.singleton.renderOneFrame();
});



</script>
<style scoped>
.fits-layer-settings {
  pointer-events: auto;
  border-radius: 10px;
  outline: 1px solid white;
  padding: 1em;
}
input[type="range"] {
  padding: 1em;
  display: inline;
  width: 250px;
  flex-grow: 1
}

select {
  outline: 1px solid white;
  padding: 0.5em;
}

label {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 1rem;
}
</style>
