<template>
  <div class="layer-control-panel">
    <h3>Layers</h3>
    <ul>
      <li v-for="layerId in wwt.activeLayers" :key="layerId">
        {{ getLayerName(layerId) }}
        <button @click="toggleLayerVisibility(layerId)">
          {{ getLayerVisibility(layerId) ? 'Hide' : 'Show' }}
        </button>
        <input type="range" min="0" max="100" v-model="layerOpacity[layerId]" @input="setLayerOpacity(layerId, layerOpacity[layerId])">
        <button @click="removeLayer(layerId)">Remove</button>
      </li>
    </ul>

    <button @click="addExampleSpreadsheetLayer">Add Example Spreadsheet Layer</button>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed } from "vue";
import { engineStore } from "@wwtelescope/engine-pinia";
import { Layer, Color, PlotTypes, MarkerScales } from "@wwtelescope/engine"; // Import necessary types and enums

const wwt = engineStore();
const layerOpacity = ref<{ [key: string]: number }>({});

// Watch for changes in wwt.activeLayers and initialize opacity for new layers
watch(() => wwt.activeLayers, (newLayers) => {
  newLayers.forEach(id => {
    if (!(id in layerOpacity.value)) {
      const layer = wwt.layerById(id);
      if (layer) {
        layerOpacity.value[id] = layer.get_opacity();
      }
    }
  });
  // Remove opacities for layers that no longer exist
  for (const id in layerOpacity.value) {
    if (!newLayers.includes(id)) {
      delete layerOpacity.value[id];
    }
  }
}, { immediate: true });

const getLayerName = (layerId: string): string => {
  const layer = wwt.layerById(layerId);
  return layer ? layer.get_name() : 'Unknown Layer';
};

const getLayerVisibility = (layerId: string): boolean => {
  const layer = wwt.layerById(layerId);
  return layer ? layer.get_enabled() : false;
};

const toggleLayerVisibility = (layerId: string): void => {
  const layer = wwt.layerById(layerId);
  if (layer) {
    wwt.applySetting(["Layer." + layerId + ".Enabled", !layer.get_enabled()]);
  }
};

const setLayerOpacity = (layerId: string, opacity: number): void => {
  wwt.applySetting(["Layer." + layerId + ".Opacity", opacity]);
};

const removeLayer = (layerId: string): void => {
  wwt.deleteLayer(layerId);
};

const addExampleSpreadsheetLayer = async (): Promise<void> => {
  const csv_data = `\
ra,dec,size,color\r
246.597,-24.350,1,#FF0000\r
246.679,-24.342,2,#00FF00\r
246.600,-24.413,3,#8888FF\r
`;
  const newLayer = await wwt.createTableLayer({
    name: "My Example Spreadsheet Layer",
    referenceFrame: "Sky",
    dataCsv: csv_data,
  });

  wwt.applyTableLayerSettings({
    id: newLayer.id.toString(),
    settings: [
      ["lngColumn", 0],
      ["latColumn", 1],
      ["sizeColumn", 2],
      ["astronomical", true],
      ["plotType", PlotTypes.circle],
      ["markerScale", MarkerScales.screen],
      ["color", Color.fromArgb(255, 255, 255, 0)],
    ],
  });
};
</script>

<style scoped>
.layer-control-panel {
  position: absolute;
  top: 10px;
  right: 10px;
  background-color: rgba(0, 0, 0, 0.7);
  color: white;
  padding: 10px;
  border-radius: 5px;
  z-index: 100;
}

ul {
  list-style: none;
  padding: 0;
}

li {
  margin-bottom: 5px;
}
</style>

