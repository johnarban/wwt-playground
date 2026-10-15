<template>
  <div
    v-if="prop.wtmlUrl || prop.imageset"
    id="imageset-positioner-container"
  >
    <fieldset id="imageset-positioner">
      <legend>Imageset Position</legend>
      <div>
        X Offset (arcmin) {{ offsetXArcmin.toFixed(2) }}'
        <v-slider
          v-model="offsetXArcmin"
          aria-label="X offset (arcmin)"
          :min="-60"
          :max="60"
          :step="0.01"
          hide-details
        />
      </div>
      <div>
        Y Offset (arcmin) {{ offsetYArcmin.toFixed(2) }}'
        <v-slider
          v-model="offsetYArcmin"
          aria-label="Y offset (arcmin)"
          :min="-60"
          :max="60"
          :step="0.01"
          hide-details
        />
      </div>
      <div>
        Rotation (deg) {{ angle.toFixed(2) }}°
        <v-slider
          v-model="angle"
          aria-label="Rotation (deg)"
          :min="-180"
          :max="180"
          :step="0.01"
          hide-details
        />
      </div>
      <div>
        Scale {{ imagesetScale.toFixed(3) }}x
        <v-slider
          v-model="imagesetScale"
          aria-label="Scale"
          :min="0.1"
          :max="10"
          :step="0.001"
          hide-details
        />
      </div>
      <div>
        Opacity
        <v-slider
          v-model="opacity"
          aria-label="Opacity"
          :min="0.0"
          :max="1"
          :step="0.001"
          hide-details
        />
      </div>
      <!-- reset button -->
      <div class="ip-actions">
        <button
          class="ip--reset-button"
          @click="
            () => {
              offsetX = 0;
              offsetY = 0;
              angle = 0;
              imagesetScale = 1;
            }
          "
        >
          Reset
        </button>
        <button
          class="ip--reset-button wtml-export__button"
          @click="copyWtml"
        >
          {{ copyButtonLabel }}
        </button>
        <button
          class="ip--reset-button wtml-export__button"
          @click="downloadWtml"
        >
          Download WTML
        </button>
      </div>
      <p
        v-if="sessionOnlyUrl"
        class="wtml-warning"
      >
        This image only exists in this browser tab (a blob: URL). Host the image and replace the ImageSet Url in the
        exported WTML before using it anywhere else.
      </p>
    </fieldset>
    <div class="updated-values-display">
      <!-- show the updated WTML values -->
      <!-- TODO - we want to show and allow a copy download of the WTML -->
      <p>Updated WTML Values:</p>
      <ul v-if="originalLayerSettings">
        <li>Center X: {{ originalLayerSettings.centerX + offsetX }}</li>
        <li>Center Y: {{ originalLayerSettings.centerY + offsetY }}</li>
        <li>Rotation: {{ originalLayerSettings.rotation + angle }}</li>
        <li>Scale: {{ originalLayerSettings.baseDegreesPerTile * imagesetScale }}</li>
      </ul>
      <div
        v-if="layer"
        class="wtml-export"
      >
        <textarea
          v-if="wtmlText"
          readonly
          aria-label="WTML"
          class="wtml-export__text"
          :value="wtmlText"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, shallowRef } from "vue";
import { type ImageSetLayer } from "@wwtelescope/engine";
import { engineStore } from "@wwtelescope/engine-pinia";
import { useWtml } from "@/composables/useWtmlLoader";
import { useImageSetManipulation } from "@/imageset_manipulation";
import { imagesetToWtml, isSessionOnlyUrl } from "@/wtml";

// either a wtml url or an already loaded layer
const prop = defineProps<{
  wtmlUrl?: string | null;
  imageset?: ImageSetLayer | null;
}>();

const layer = shallowRef<ImageSetLayer | null>(null);
// the layer we loaded from wtmlUrl, so it can be removed when the url changes
let wtmlLayer: ImageSetLayer | null = null;

const store = engineStore();

function onFirstLayerLoad(newLayer: ImageSetLayer) {
  layer.value = newLayer;
  layer.value.set_opacity(opacity.value);
  const iset = newLayer.get_imageSet();
  store.gotoRADecZoom({
    raRad: (iset.get_centerX() * Math.PI) / 180,
    decRad: (iset.get_centerY() * Math.PI) / 180,
    zoomDeg: store.zoomDeg,
    instant: true,
  });
}

function loadWtml(url: string) {
  if (wtmlLayer) {
    store.deleteLayer(wtmlLayer.id);
    wtmlLayer = null;
  }
  useWtml(url, {
    onNewLayer: (newLayer) => {
      wtmlLayer = newLayer;
      onFirstLayerLoad(newLayer);
    },
    goTo: false,
  });
}

const opacity = ref(0.8);
watch(opacity, (newOpacity) => {
  if (layer.value) {
    layer.value.set_opacity(newOpacity);
  }
});

if (prop.wtmlUrl) {
  loadWtml(prop.wtmlUrl);
} else if (prop.imageset) {
  onFirstLayerLoad(prop.imageset);
}

const { angle, offsetX, offsetY, scale: imagesetScale, originalLayerSettings } = useImageSetManipulation(layer, true);

const offsetXArcmin = computed({
  get: () => -offsetX.value * 60,
  set: (value) => {
    offsetX.value = -value / 60;
  },
});
const offsetYArcmin = computed({
  get: () => offsetY.value * 60,
  set: (value) => {
    offsetY.value = value / 60;
  },
});

const sessionOnlyUrl = computed(() => (layer.value ? isSessionOnlyUrl(layer.value.get_imageSet().get_url()) : false));

const copyButtonLabel = ref("Copy WTML");
const wtmlText = ref("");

function generateWtml() {
  const imageset = layer.value?.get_imageSet();
  wtmlText.value = imageset ? imagesetToWtml(imageset) : "";
  return wtmlText.value;
}

async function copyWtml() {
  const text = generateWtml();
  if (!text) {
    return;
  }

  await navigator.clipboard.writeText(text);
  copyButtonLabel.value = "Copied";

  window.setTimeout(() => {
    copyButtonLabel.value = "Copy WTML";
  }, 1500);
}

function downloadWtml() {
  const text = generateWtml();
  if (!text) {
    return;
  }

  const imagesetName = layer.value?.get_imageSet().get_name() ?? "imageset";
  // safeName - get rid of file extensions and other special characters
  const safeName =
    imagesetName
      .replace(/\.[^/.]+$/, "")
      .replace(/[^a-z0-9_-]+/gi, "-")
      .replace(/^-+|-+$/g, "") || "imageset";
  const blob = new Blob([text], { type: "application/xml" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = `${safeName}.wtml`;
  link.click();

  URL.revokeObjectURL(url);
}

watch(
  () => prop.imageset,
  (newImageset) => {
    if (newImageset) {
      wtmlText.value = "";
      onFirstLayerLoad(newImageset);
    }
  },
);

watch(
  () => prop.wtmlUrl,
  (newWtmlUrl) => {
    if (newWtmlUrl) {
      wtmlText.value = "";
      loadWtml(newWtmlUrl);
    }
  },
);
</script>

<style>
#imageset-positioner-container {
  width: min(500px, 45vw);
  max-height: 75svh;
  overflow-y: auto;
  pointer-events: auto;
}

#imageset-positioner {
  padding: 0.5rem;
  background-color: rgba(0, 0, 0, 0.5);
}

#imageset-positioner > legend {
  padding: 0 0.5rem;
}

.wtml-warning {
  color: #ffd180;
  font-size: 0.85rem;
}

.updated-values-display {
  margin-top: 1rem;
  font-size: 0.9rem;
}

.wtml-export {
  margin-top: 1rem;
}

.ip-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
}

.wtml-export__button {
  margin-top: 0;
}

.wtml-export__text {
  width: 100%;
  min-height: 14rem;
  padding: 0.75rem;
  color: white;
  background-color: rgba(0, 0, 0, 0.8);
  border: 1px solid white;
  border-radius: 4px;
  font-family: monospace;
  font-size: 0.8rem;
  line-height: 1.4;
  resize: vertical;
}

button.ip--reset-button {
  margin-top: 1rem;
  padding: 0.5rem 1rem;
  background-color: black;
  color: white;
  border: 1px solid white;
  border-radius: 4px;
  cursor: pointer;
}
button.ip--reset-button:hover {
  background-color: rgb(55, 55, 55);
}
</style>
