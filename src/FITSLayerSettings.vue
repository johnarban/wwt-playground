<template>
  <div
    v-if="imagesetLayer && hasFits"
    class="fits-layer-settings d-flex flex-column ga-2"
  >
    <h3 class="text-subtitle-1">Settings for {{ imagesetLayer.get_name() }}</h3>
    <v-range-slider
      v-model="cuts"
      label="Range"
      :min="dataMin"
      :max="dataMax"
      :step="step"
      :disabled="!rangeOk"
      hide-details
      density="compact"
    />
    <div class="text-caption">
      vmin {{ formatValue(cuts[0]) }}, vmax {{ formatValue(cuts[1]) }} (data {{ formatValue(dataMin) }} to
      {{ formatValue(dataMax) }})
    </div>
    <v-select
      v-model="scale"
      label="Scale"
      :items="[...SCALES]"
      hide-details
      density="compact"
    />
    <v-select
      v-model="colormap"
      label="Colormap"
      :items="[...COLORMAPS]"
      hide-details
      density="compact"
    />
    <v-slider
      v-model="opacity"
      label="Opacity"
      :min="0"
      :max="1"
      :step="0.01"
      thumb-label
      hide-details
      density="compact"
    />
    <v-switch
      v-model="smooth"
      label="Smooth pixels"
      color="primary"
      hide-details
      density="compact"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from "vue";
import { ScaleTypes } from "@wwtelescope/engine-types";
import { ImageSetLayer, WWTControl } from "@wwtelescope/engine";
import { COLORMAPS, SCALES, type Colormaps, type Scales } from "./types";

interface Props {
  imagesetLayer: ImageSetLayer | null;
}

const props = defineProps<Props>();

const hasFits = computed(() => props.imagesetLayer?.getFitsImage() != null);

const dataMin = ref(0);
const dataMax = ref(1);
const cuts = ref<[number, number]>([0, 1]);
const scale = ref<Scales>("linear");
const colormap = ref<Colormaps>("viridis");
const opacity = ref(1);
const smooth = ref(false);

const rangeOk = computed(
  () => Number.isFinite(dataMin.value) && Number.isFinite(dataMax.value) && dataMax.value > dataMin.value,
);
const step = computed(() => (rangeOk.value ? (dataMax.value - dataMin.value) / 1000 : 1));

function formatValue(v: number) {
  return Number.isFinite(v) ? v.toPrecision(3) : "?";
}

// read the current settings off the layer; the range comes from the engine's
// FitsProperties (header DATAMIN/DATAMAX are often missing)
function readLayer(layer: ImageSetLayer | null) {
  if (!layer?.getFitsImage()) return;
  const fp = layer.get_imageSet().get_fitsProperties();
  dataMin.value = fp.minVal;
  dataMax.value = fp.maxVal;
  cuts.value = [fp.lowerCut, fp.upperCut];
  scale.value = (ScaleTypes[fp.scaleType] as Scales | undefined) ?? "linear";
  colormap.value = (layer.get_colorMapperName() as Colormaps) || "viridis";
  opacity.value = layer.get_opacity();
  smooth.value = layer.get_renderSmooth();
}

watch(() => props.imagesetLayer, readLayer, { immediate: true });

function render() {
  WWTControl.singleton.renderOneFrame();
}

watch([cuts, scale], ([[vmin, vmax], s]) => {
  if (!props.imagesetLayer || !rangeOk.value) return;
  props.imagesetLayer.setImageScalePhysical(ScaleTypes[s], vmin, vmax);
  render();
});

watch(colormap, (c) => {
  if (!props.imagesetLayer) return;
  props.imagesetLayer.set_colorMapperName(c);
  render();
});

watch(opacity, (o) => {
  if (!props.imagesetLayer) return;
  props.imagesetLayer.set_opacity(o);
  render();
});

watch(smooth, (s) => {
  if (!props.imagesetLayer) return;
  props.imagesetLayer.set_renderSmooth(s);
  render();
});
</script>

<style scoped>
.fits-layer-settings {
  width: min(320px, 40vw);
  pointer-events: auto;
  border-radius: 10px;
  outline: 1px solid white;
  padding: 1em;
  background-color: rgba(0, 0, 0, 0.5);
}
</style>
