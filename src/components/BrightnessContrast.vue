<template>
  <fieldset id="brightness-contrast-fieldset">
    <legend>
      Brightness/Contrast
    </legend>
    <label>
      Brightness
      <v-slider 
        v-model="brightness"
        type="number"
        min="0"
        max="6"
        step="0.01"
        hide-details
      >
        <template #append>
          <v-text-field
            v-model="brightness"
            style="width:fit-content; max-width:7ch;"
            density="compact"
            type="number"
            variant="outlined"
            hide-details
          />
        </template>
      </v-slider>
    </label>
    <label>
      Contrast
      <v-slider 
        v-model="contrast"
        type="number"
        min="0.0"
        max="1.5"
        step="0.01"
        hide-details
      >
        <template #append>
          <v-text-field
            v-model="contrast"
            style="width:fit-content; max-width:7ch"
            density="compact"
            type="number"
            variant="outlined"
            hide-details
          />
        </template>
      </v-slider>
    </label>
  </fieldset>
</template>

<script setup lang="ts">
import { ref, onBeforeUnmount, onMounted, watch } from 'vue';

const brightness = ref<number>(1);
const contrast = ref<number>(1);

interface BrightnessContrastProps {
  element: string; // the element to apply the brightness/contrast to
  initialBrightness?: number;
  initialContrast?: number;
}

const props = defineProps<BrightnessContrastProps>();

const filterSet = ref(false);
let observer: MutationObserver | null = null;

function getTargetElement() {
  return document.querySelector(props.element) as HTMLElement | null;
}

function parseValues() {
  const el = getTargetElement();
  if (el) {
    // const filter = el.style.filter;
    // regex for decimal https://stackoverflow.com/a/14550569/11594175
    // const brightnessMatch = filter.match(/brightness\(((\d+(?:\.\d+)?))\)/);
    // const contrastMatch = filter.match(/contrast\(((\d+(?:\.\d+)?))\)/);
    if (el.dataset.brightness) {
      brightness.value = parseFloat(el.dataset.brightness);
      filterSet.value = true;
    }
    if (el.dataset.contrast) {
      contrast.value = parseFloat(el.dataset.contrast);
      filterSet.value = true;
    }
  }
}



function setValues(brightness: number, contrast: number) {
  const el = getTargetElement();
  if (el) {
    el.style.filter = `brightness(${brightness}) contrast(${contrast})`;
    el.dataset.brightness = brightness.toString();
    el.dataset.contrast = contrast.toString();
    filterSet.value = true;
  }
}

watch([brightness, contrast], ([b,c]) => setValues(b,c));

function initializeFilter() {
  const el = getTargetElement();
  if (el) {
    parseValues();
    if (!filterSet.value) {
      // If the element doesn't have brightness/contrast set, use the initial values
      const initialBrightness = props.initialBrightness ?? 1;
      const initialContrast = props.initialContrast ?? 1;
      brightness.value = initialBrightness;
      contrast.value = initialContrast;
      // this will trigger the watch to set the values on the element
      setValues(initialBrightness, initialContrast);
    }
  }
}

onMounted(() => {
  initializeFilter();

  if (!filterSet.value) {
    observer = new MutationObserver(() => {
      if (!filterSet.value && getTargetElement()) {
        initializeFilter();
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });
  }
});

onBeforeUnmount(() => {
  observer?.disconnect();
});

</script>

<style scoped>
fieldset {
  width: 300px;
}
fieldset > legend {
  padding: 0 0.5rem;
} 

.filter-defs {
  position: absolute;
  width: 0;
  height: 0;
  overflow: hidden;
}
</style>
