<template>
  <div 
    v-if="prop.wtmlUrl || prop.imageset"
    id="imageset-positioner-container"
  >
    <fieldset id="imageset-positioner">
      <legend>
        Imageset Position
      </legend>
      <label>
        X Offset (arcmin) {{ offsetXArcmin.toFixed(2) }}'
        <v-slider
          v-model="offsetXArcmin"
          :min="-60"
          :max="60"
          :step="0.01"
          hide-details
        />
      </label>
      <label>
        Y Offset (arcmin) {{ offsetYArcmin.toFixed(2) }}'
        <v-slider
          v-model="offsetYArcmin"
          :min="-60"
          :max="60"
          :step="0.01"
          hide-details
        />
      </label>
      <label>
        Rotation (deg) {{ angle.toFixed(2) }}°
        <v-slider
          v-model="angle"
          :min="-180"
          :max="180"
          :step="0.01"
          hide-details
        />
      </label>
      <label>
        Scale {{ imagesetScale.toFixed(3) }}x
        <v-slider
          v-model="imagesetScale"
          :min="0.1"
          :max="10"
          :step="0.001"
          hide-details
        />
      </label>
      <label>
        Opacity
        <v-slider
          v-model="opacity"
          :min="0.0"
          :max="1"
          :step="0.001"
          hide-details
        />
      </label>
      <!-- reset button -->
      <button
        class="ip--reset-button"
        @click="() => {
          offsetX = 0;
          offsetY = 0;
          angle = 0;
          imagesetScale = 1;
        }"
      >
        Reset
      </button>
    </fieldset>
    <div class="updated-values-display">
      <!-- show the updated WTML values -->
      <!-- TODO - we want to show and allow a copy download of the WTML -->
      <p>Updated WTML Values:</p>
      <ul v-if="originalLayerSettings">
        <li>Center X: {{ (originalLayerSettings.centerX + offsetX) }}</li>
        <li>Center Y: {{ (originalLayerSettings.centerY + offsetY) }}</li>
        <li>Rotation: {{ (originalLayerSettings.rotation + angle) }}</li>
        <li>Scale: {{ (originalLayerSettings.baseDegreesPerTile * imagesetScale) }}</li>
      </ul>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import  { type ImageSetLayer } from '@wwtelescope/engine';
import { engineStore } from '@wwtelescope/engine-pinia';
import { useWtmlLoader } from "@/composables/useWtmlLoader";
import { useImageSetManipulation } from "@/imageset_manipulation";


// only props is the wtml url
const prop = defineProps<{
  wtmlUrl?: string | null;
  imageset?: ImageSetLayer | null;
}>();


const layer = ref<ImageSetLayer | null>(null);

const store = engineStore();

function onFirstLayerLoad(newLayer: ImageSetLayer) {
  layer.value = newLayer;
  layer.value.set_opacity(0.8); 
  const iset = newLayer.get_imageSet();
  store.gotoRADecZoom({
    raRad: iset.get_centerX() * Math.PI / 180,
    decRad: iset.get_centerY() * Math.PI / 180,
    zoomDeg: store.zoomDeg,
    instant: true,
  });
}

if (prop.wtmlUrl) {
  useWtmlLoader(prop.wtmlUrl, {
    onNewLayer: onFirstLayerLoad,
    goTo: false,
  });
} else if (prop.imageset) {
  layer.value = prop.imageset;
  onFirstLayerLoad(prop.imageset);
}

const { angle, offsetX, offsetY, scale: imagesetScale, originalLayerSettings } = useImageSetManipulation(layer,true);



const offsetXArcmin = computed({
  get: () => -offsetX.value * 60,
  set: (value) => {
    offsetX.value = -value / 60;
  }
});
const offsetYArcmin = computed({
  get: () => offsetY.value * 60,
  set: (value) => {
    offsetY.value = value / 60;
  }
});

const opacity = ref(0.8);
watch(opacity, (newOpacity) => {
  if (layer.value) {
    layer.value.set_opacity(newOpacity);
  }
});

watch(() => prop.imageset, (newImageset) => {
  if (newImageset) {
    layer.value = newImageset;
    onFirstLayerLoad(newImageset);
  }
});

watch(() => prop.wtmlUrl, (newWtmlUrl) => {
  if (newWtmlUrl) {
    useWtmlLoader(newWtmlUrl, {
      onNewLayer: onFirstLayerLoad,
      goTo: false,
    });
  }
});

</script>

<style>
#imageset-positioner {
  width: 500px;
  pointer-events: auto;
}

#imageset-positioner > legend {
  padding: 0 0.5rem;
}

.updated-values-display {
  margin-top: 1rem;
  font-size: 0.9rem;
  pointer-events: auto;
}

button.ip--reset-button {
  margin-top: 1rem;
  padding: 0.5rem 1rem;
  background-color: black;
  color: white;
  border: 1px solid white;
  border-radius: 4px;
  cursor: pointer;
  pointer-events: auto;
}
button.ip--reset-button:hover {
  background-color: rgb(55, 55, 55);
} 
</style>
