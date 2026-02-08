<template>
  <div
    v-if="layers.length > 0"
    class="layer-list"
  >
    <div 
      v-for="layer in layers" 
      :key="layer.name"
      class="layer-item"
      :class="{ active: layer.name === selectedLayer }"
      @click="$emit('goto-layer', layer.name)"
    >
      {{ layer.name }}
    </div>
  </div>
</template>

<script setup lang="ts">
interface LayerInfo {
  name: string;
}

interface Props {
  layers: LayerInfo[];
  selectedLayer: string;
}

defineProps<Props>();

defineEmits<{
  'goto-layer': [name: string];
}>();
</script>

<style scoped>
.layer-list {
  display: flex;
  flex-direction: column;
  gap: 5px;
  padding: 10px;
  border: 1px solid white;
  border-radius: 4px;
  pointer-events: auto;
}

.layer-item {
  padding: 8px 12px;
  cursor: pointer;
  border-radius: 4px;
  background-color: #ffffff1a;
  color: white;
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
