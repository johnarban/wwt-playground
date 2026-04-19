<!-- modified from https://developer.mozilla.org/en-US/docs/Web/API/HTML_Drag_and_Drop_API/File_drag_and_drop -->
<template>
  <div id="drop-target">
    <label 
      id="drop-zone" 
      ref="drop-zone"
      :class="{ 'over': isOverDropZone, 'hasFiles': hasFiles }"
    >
      Drop images here, or click to upload.
      <input
        id="file-input"
        type="file"
        :multiple="props.multiple"
        accept="image/*"
      />
    </label>
    <ul id="preview">
      <li 
        v-for="file in files" 
        :key="file.name"
      >
        <span> {{ file.name }} </span>
        <span> ({{ file.size }} bytes) </span>
      </li>
    </ul>
    <button
      id="clear-btn"
      @click="clearFiles"
    >
      Clear
    </button>
  </div>
</template>

<script setup lang="ts">
import { useTemplateRef, computed, ref } from 'vue';
import { useDropZone } from '@vueuse/core';
import { createStudyImageset, CreateStudyImagesetOptions } from '@/imageset_manipulation';
import {ImageSetLayer, WWTControl } from '@wwtelescope/engine';
import { engineStore } from '@wwtelescope/engine-pinia';

const dropZoneRef = useTemplateRef('drop-zone');

interface Props {
  multiple?: boolean;
}
const props = withDefaults(defineProps<Props>(), {
  multiple: false,
});


const emit = defineEmits<{
  'imageset-loaded': [layer: ImageSetLayer]
}>();

import { useImagesetLoader } from '@/composables/useWtmlLoader';
const imagesetLayer = ref<ImageSetLayer | null>(null);
  
const store = engineStore();

function getFov() {
  const w = WWTControl.singleton.renderContext.width;
  const h = WWTControl.singleton.renderContext.height;
  const fov = WWTControl.singleton.renderContext.get_fovAngle(); // is the height
  // return min fov
  return Math.min(fov, fov * w / h);
}

const R2D = 180 / Math.PI;
function onImageLoad(image: HTMLImageElement, name: string) {
  const width = image.naturalWidth;
  const height = image.naturalHeight;
  console.log('Image loaded:', { width, height });
  const fov = getFov();
  console.log('Current FOV:', fov);
  const options: CreateStudyImagesetOptions = {
    raDeg: store.raRad * R2D, 
    decDeg: store.decRad * R2D,
    rotationDeg: -store.rollRad * R2D,
    baseTileDegrees: fov / Math.max(width, height) / 1.5,
    name: name,
    creditsText: 'Uploaded Image',
    creditsUrl: 'localhost',
    offsetX: width / 2,
    offsetY: -height / 2,
  };
  console.log('Creating imageset with options:', options);
  const iset = createStudyImageset(image.src, options);
  const loader = useImagesetLoader(iset);
  loader.ready.then((layer) => {
    imagesetLayer.value = layer;
    imagesetLayer.value?.set_enabled(true);
    // console.log(imagesetLayer.value, loader.imagesetLayer.value);
    emit('imageset-loaded', layer);
    files.value = [];
  });
}

function onDrop(files: File[] | null) {
  if (!files) return;
  console.log('Dropped files:', files);
  files.forEach(file => {
    // put file as an image in the preview list
    const image = new Image();
    image.src = URL.createObjectURL(file);
    image.onload = () => {
      onImageLoad(image, file.name);
      // URL.revokeObjectURL(image.src);
    };  
  });
}

const { isOverDropZone, files } = useDropZone(dropZoneRef, {
  onDrop,
  dataTypes: ['image/jpeg', 'image/png'],
  multiple: props.multiple,
  preventDefaultForUnhandled: true,
});

const hasFiles = computed(() => (files.value ?? []).length > 0);
function clearFiles() {
  files.value = [];
}


</script>


<style>

#drop-zone {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 500px;
  max-width: 100%;
  height: 200px;
  padding: 1em;
  border: 1px solid #cccccc;
  border-radius: 4px;
  color: slategray;
  cursor: pointer;
  pointer-events: auto;
}

#drop-zone.over {
  border-color: #007BFF;
  background-color: #E0F0FF;
  transition: background-color 0.3s, border-color 0.3s;
}
#drop-zone.hasFiles {
  border-color: #28A745;
  background-color: #E6F4EA;
}
#file-input {
  display: none;
}

#preview {
  width: 500px;
  max-width: 100%;
  display: flex;
  flex-direction: column;
  gap: 0.5em;
  list-style: none;
  padding: 0;
}

#preview li {
  display: flex;
  align-items: center;
  gap: 0.5em;
  margin: 0;
  width: 100%;
  height: 100px;
}

#preview img {
  width: 100px;
  height: 100px;
  object-fit: cover;
}

</style>