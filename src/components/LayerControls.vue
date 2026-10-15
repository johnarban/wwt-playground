<template>
  <div class="layer-controls d-flex flex-column ga-2">
    <div class="d-flex flex-wrap ga-2">
      <v-btn
        v-for="d in datasets"
        :key="d.id"
        size="small"
        variant="tonal"
        :disabled="!d.url || loading"
        :title="d.note"
        @click="emit('load-dataset', d)"
      >
        {{ d.name }}
      </v-btn>
    </div>
    <label class="text-body-2">
      Load a local FITS file
      <input
        type="file"
        accept=".fits,.fit,.fts"
        class="d-block mt-1"
        :disabled="loading"
        @change="handleFileUpload"
      />
    </label>
    <span class="disclaimer">* Only accepts images in TAN projection with PP(V) axis order</span>
  </div>
</template>

<script setup lang="ts">
import type { FitsDataset } from "../types";

defineProps<{
  datasets: FitsDataset[];
  loading: boolean;
}>();

const emit = defineEmits<{
  "file-uploaded": [file: File];
  "load-dataset": [dataset: FitsDataset];
}>();

function handleFileUpload(event: Event) {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];
  if (file) {
    emit("file-uploaded", file);
  }
  // allow picking the same file again
  target.value = "";
}
</script>

<style scoped>
.layer-controls {
  max-width: 320px;
  padding: 10px;
  border-radius: 4px;
  background-color: rgba(0, 0, 0, 0.5);
  pointer-events: auto;
}

.disclaimer {
  font-size: 0.75em;
}

input[type="file"] {
  font-size: 14px;
  color: white;
}

input[type="file"]::file-selector-button {
  padding: 4px 8px;
  cursor: pointer;
  background-color: slategray;
  border: 1px solid white;
  border-radius: 4px;
  color: black;
}

input[type="file"]::file-selector-button:hover {
  background-color: lightblue;
}
</style>
