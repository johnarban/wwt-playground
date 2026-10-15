<template>
  <div class="layer-control-panel">
    <h4>Layers</h4>
    <v-list density="compact">
      <v-list-item
        v-for="layerId in wwt.activeLayers"
        :key="layerId"
      >
        <v-list-item-title>{{ getLayerName(layerId) }}</v-list-item-title>
        <div class="d-flex align-center ga-2">
          <v-btn
            size="small"
            variant="tonal"
            @click="toggleLayerVisibility(layerId)"
          >
            {{ getLayerVisibility(layerId) ? "Hide" : "Show" }}
          </v-btn>
          <v-slider
            v-model="layerOpacity[layerId]"
            :aria-label="`${getLayerName(layerId)} opacity`"
            :min="0"
            :max="1"
            :step="0.01"
            density="compact"
            hide-details
            @update:model-value="(v: number) => setLayerOpacity(layerId, v)"
          />
          <v-btn
            size="small"
            variant="text"
            @click="removeLayer(layerId)"
          >
            Remove
          </v-btn>
        </div>
      </v-list-item>
    </v-list>

    <v-btn
      size="small"
      variant="tonal"
      @click="addExampleSpreadsheetLayer"
    >
      Add Example Spreadsheet Layer
    </v-btn>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from "vue";
import { engineStore } from "@wwtelescope/engine-pinia";
import { Color } from "@wwtelescope/engine";
import { PlotTypes, MarkerScales } from "@wwtelescope/engine-types";

const wwt = engineStore();
const layerOpacity = ref<Record<string, number>>({});

// Watch for changes in wwt.activeLayers and initialize opacity for new layers
watch(
  () => wwt.activeLayers,
  (newLayers) => {
    newLayers.forEach((id) => {
      if (!(id in layerOpacity.value)) {
        const layer = wwt.layerById(id);
        if (layer) {
          layerOpacity.value[id] = layer.get_opacity();
        }
      }
    });
    // Drop opacities for layers that no longer exist
    const kept: Record<string, number> = {};
    newLayers.forEach((id) => {
      if (id in layerOpacity.value) kept[id] = layerOpacity.value[id]!;
    });
    layerOpacity.value = kept;
  },
  { immediate: true },
);

const getLayerName = (layerId: string): string => wwt.layerById(layerId)?.get_name() ?? "Unknown Layer";

const getLayerVisibility = (layerId: string): boolean => wwt.layerById(layerId)?.get_enabled() ?? false;

// the branch used applySetting(["Layer.<id>.Enabled", ...]), which is not an engine setting
const toggleLayerVisibility = (layerId: string): void => {
  const layer = wwt.layerById(layerId);
  layer?.set_enabled(!layer.get_enabled());
};

const setLayerOpacity = (layerId: string, opacity: number): void => {
  wwt.layerById(layerId)?.set_opacity(opacity);
};

const removeLayer = (layerId: string): void => {
  wwt.deleteLayer(layerId);
};

const addExampleSpreadsheetLayer = async (): Promise<void> => {
  const csvData = `\
ra,dec,size,color\r
246.597,-24.350,1,#FF0000\r
246.679,-24.342,2,#00FF00\r
246.600,-24.413,3,#8888FF\r
`;
  const newLayer = await wwt.createTableLayer({
    name: "My Example Spreadsheet Layer",
    referenceFrame: "Sky",
    dataCsv: csvData,
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
