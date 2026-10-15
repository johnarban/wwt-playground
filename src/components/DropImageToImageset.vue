<!-- modified from https://developer.mozilla.org/en-US/docs/Web/API/HTML_Drag_and_Drop_API/File_drag_and_drop -->
<template>
  <div id="drop-target">
    <!-- dropping is a pointer-only extra. the file input inside is the keyboard path -->
    <!-- eslint-disable-next-line vuejs-accessibility/no-static-element-interactions -->
    <label
      id="drop-zone"
      for="file-input"
      :class="{ over: isOverDropZone, hasFiles: hasFiles }"
      @dragenter.prevent="isOverDropZone = true"
      @dragover.prevent="isOverDropZone = true"
      @dragleave="isOverDropZone = false"
      @drop.prevent="onDrop"
    >
      Drop a JPEG or PNG here, or click to upload.
      <input
        id="file-input"
        class="visually-hidden"
        type="file"
        :multiple="props.multiple"
        :accept="ACCEPTED_TYPES.join(',')"
        @change="onFileInput"
      />
    </label>
    <p
      v-if="errorMessage"
      class="drop-error"
      role="alert"
    >
      {{ errorMessage }}
    </p>
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
      v-if="hasFiles"
      id="clear-btn"
      @click="clearFiles"
    >
      Clear
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { ImageSetLayer, WWTControl } from "@wwtelescope/engine";
import { engineStore } from "@wwtelescope/engine-pinia";
import { createStudyImageset, type CreateStudyImagesetOptions } from "@/imageset_manipulation";
import { useImagesetLoader } from "@/composables/useImagesetLoader";

interface Props {
  multiple?: boolean;
}
const props = withDefaults(defineProps<Props>(), {
  multiple: false,
});

const emit = defineEmits<{
  "imageset-loaded": [layer: ImageSetLayer];
}>();

const ACCEPTED_TYPES = ["image/jpeg", "image/png"];

const store = engineStore();
const isOverDropZone = ref(false);
const files = ref<File[]>([]);
const errorMessage = ref("");
const hasFiles = computed(() => files.value.length > 0);

function getFov() {
  const w = WWTControl.singleton.renderContext.width;
  const h = WWTControl.singleton.renderContext.height;
  const fov = WWTControl.singleton.renderContext.get_fovAngle(); // is the height
  // return min fov
  return Math.min(fov, (fov * w) / h);
}

const R2D = 180 / Math.PI;
function onImageLoad(image: HTMLImageElement, name: string) {
  const width = image.naturalWidth;
  const height = image.naturalHeight;
  const fov = getFov();
  const options: CreateStudyImagesetOptions = {
    raDeg: store.raRad * R2D,
    decDeg: store.decRad * R2D,
    rotationDeg: -store.rollRad * R2D,
    baseTileDegrees: fov / Math.max(width, height) / 1.5,
    name: name,
    creditsText: "Uploaded Image",
    creditsUrl: "localhost",
    // the reference pixel is the image center (y counts down from the top, so it's +height/2)
    offsetX: width / 2,
    offsetY: height / 2,
  };
  const iset = createStudyImageset(image.src, options);
  const loader = useImagesetLoader(iset);
  loader.ready.then((layer) => {
    layer.set_enabled(true);
    emit("imageset-loaded", layer);
    files.value = [];
  });
}

function loadFiles(newFiles: File[]) {
  const images = newFiles.filter((file) => ACCEPTED_TYPES.includes(file.type));
  errorMessage.value = images.length < newFiles.length ? "Only JPEG and PNG images can be used." : "";
  files.value = props.multiple ? images : images.slice(0, 1);
  files.value.forEach((file) => {
    const image = new Image();
    // the engine re-reads this URL whenever the tiles are rebuilt, so it is never revoked
    image.src = URL.createObjectURL(file);
    image.onload = () => {
      onImageLoad(image, file.name);
      // URL.revokeObjectURL(image.src);
    };
  });
}

function onDrop(event: DragEvent) {
  isOverDropZone.value = false;
  loadFiles(Array.from(event.dataTransfer?.files ?? []));
}

function onFileInput(event: Event) {
  const input = event.target as HTMLInputElement;
  loadFiles(Array.from(input.files ?? []));
  // let the same file be picked again
  input.value = "";
}

function clearFiles() {
  files.value = [];
  errorMessage.value = "";
}
</script>

<style>
#drop-target {
  width: min(24rem, 40vw);
}

#drop-zone {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 8rem;
  padding: 1em;
  border: 1px dashed #cccccc;
  border-radius: 4px;
  color: #dddddd;
  background-color: rgba(0, 0, 0, 0.5);
  cursor: pointer;
  pointer-events: auto;
  text-align: center;
}

#drop-zone:focus-within {
  outline: 6px double white;
  box-shadow: 0 0 0 3px black;
}

#drop-zone.over {
  border-color: #007bff;
  color: black;
  background-color: #e0f0ff;
  transition:
    background-color 0.3s,
    border-color 0.3s;
}
#drop-zone.hasFiles {
  border-color: #28a745;
  color: black;
  background-color: #e6f4ea;
}

/* still focusable, so the upload works from the keyboard */
#file-input.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
}

.drop-error {
  color: #ff8a80;
  pointer-events: auto;
}

#preview {
  display: flex;
  flex-direction: column;
  gap: 0.5em;
  list-style: none;
  padding: 0;
  pointer-events: auto;
}

#clear-btn {
  pointer-events: auto;
}
</style>
