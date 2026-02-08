<template>
  <div class="layer-controls">
    <input
      type="file"
      accept=".fits"
      @change="handleFileUpload"
    />
    <span class="disclaimer">* Only accepts images in TAN projection with PP(V) axis order</span>
  </div>
</template>

<script setup lang="ts">

const emit = defineEmits<{
  'file-uploaded': [file: File];
}>();

function handleFileUpload(event: Event) {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];
  if (file) {
    emit('file-uploaded', file);
  }
}

</script>

<style scoped>
.layer-controls {
  display: flex;
  flex-direction: column;
  gap: 0.5em;
}

.disclaimer {
  font-size: 0.6em;
}

input[type="file"] {
  font-size: 14px;
  color: white;
  border: 1px solid white;
  border-radius: 4px;
  pointer-events: auto;
}

input[type="file"]::file-selector-button {
  padding: 6px;
  cursor: pointer;
  background-color: slategray;
  border: 1px solid white;
  border-radius: 4px;
  color: black;
  pointer-events: auto;
}

input[type="file"]::file-selector-button:hover {
  background-color: lightblue;
}
</style>
