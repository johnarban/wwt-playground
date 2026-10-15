<template>
  <div
    v-if="layers.length > 0"
    class="layer-list d-flex flex-column ga-1"
  >
    <button
      v-for="layer in layers"
      :key="layer.name"
      type="button"
      class="layer-item"
      :class="{ active: layer.name === selectedLayer }"
      :aria-pressed="layer.name === selectedLayer"
      @click="$emit('goto-layer', layer.name)"
    >
      {{ layer.name }}
      <span
        v-if="layer.sliceCount > 1"
        class="text-caption"
        >({{ layer.sliceCount }} planes)</span
      >
    </button>
  </div>
</template>

<script setup lang="ts">
interface LayerInfo {
  name: string;
  sliceCount: number;
}

interface Props {
  layers: LayerInfo[];
  selectedLayer: string;
}

defineProps<Props>();

defineEmits<{
  "goto-layer": [name: string];
}>();
</script>

<style scoped>
.layer-list {
  max-width: min(300px, 40vw);
  padding: 10px;
  border: 1px solid white;
  border-radius: 4px;
  background-color: rgba(0, 0, 0, 0.5);
  pointer-events: auto;
}

.layer-item {
  padding: 8px 12px;
  border-radius: 4px;
  background-color: #ffffff1a;
  color: white;
  text-align: left;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  outline: 1px solid slateblue;
}

.layer-item:hover {
  background-color: slategray;
}

.layer-item.active {
  background-color: rgba(0, 0, 0, 0.5);
  font-weight: bold;
}
</style>
