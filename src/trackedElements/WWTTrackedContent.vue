
<script setup lang="ts">
/* eslint-disable @typescript-eslint/no-unused-vars */
import { onMounted, ref, watch, inject} from 'vue';
import { useTrackedElements, type TrackedHTMLElement } from './useTrackedElements';

import { Place } from '@wwtelescope/engine';


import { computed } from 'vue';
import type { WWTEngineStore, Degree, HourAngle, Pixel } from '../types';
import { engineStore } from '@wwtelescope/engine-pinia';
const store = inject<WWTEngineStore>('wwtStore') ?? engineStore();
const D2R = Math.PI / 180;
const R2D = 180 / Math.PI;


interface OffsetWorld {
  xDeg: Degree; // Optional X offset in pixels
  yDeg: Degree; // Optional Y offset in pixels
}

interface OffsetPixel {
  xDeg: Pixel; // Optional X offset in pixels
  yDeg: Pixel; // Optional Y offset in pixels
}

interface WWTTrackedContentProps {
  containerID?: string;
  ra?: Degree;
  dec?: Degree;
  label?: string;
  size?: number; // Optional size for the content, if needed
  place?: Place; // Optional place object, if needed
  offset:  OffsetPixel; 
  visible?: boolean;
  centerOnClick?: boolean;
  zoomDeg?: Degree | null; // Optional zoom level, if needed
  clickInstant?: boolean; // Optional, if you want to control the instant navigation
  doubleClickInstant?: boolean; // Optional, if you want to control the instant navigation
  goToPlace?: boolean; // Optional, if you want it to go to the place and ignore zoomDeg
  debug?: boolean; // Optional, for debugging purposes
}

const props = withDefaults(defineProps<WWTTrackedContentProps>(), {
  visible: true,
  containerID: '',
  centerOnClick: false,
  zoomDeg: null, // use current zoom level if not provided
  clickInstant: false,
  doubleClickInstant: true,
  place: undefined,
  goToPlace: false,
  debug: false,
  label: 'default name',
  size: 100, // Default size for the content
  ra: 0 as Degree, // Default RA
  dec: 0 as Degree, // Default Dec
});

const ra = ref<number>(props.ra as unknown as number);
const dec = ref<number>(props.dec as unknown as number);
const label = ref(props.label);
const zoomDeg = computed(() => {
  return props.zoomDeg !== null ? props.zoomDeg : store.zoomDeg;
});

if (props.place) {
  const iset = props.place.get_backgroundImageset() ?? props.place.get_studyImageset();
  
  if (iset === null) {
    console.warn(`Place ${props.place.get_name()} does not have a background or study imageset.`);
  } else {
    ra.value = (props.place.get_RA() as HourAngle) * 15 as Degree;
    dec.value = props.place.get_dec();
    label.value = props.label ?? iset.get_name();
  }
}


const ready = ref(false);
const parent = ref<HTMLElement | null>(null);
const trackedElement = ref<TrackedHTMLElement | null>(null);

function goTo(instant=false) {
  if (ready.value && trackedElement.value !== null) {
    console.log("Current zoomDeg", zoomDeg.value);
    console.log("Current wwt zoomDeg", store.zoomDeg);
    if (props.place && props.goToPlace) {
      store.gotoTarget({
        place: props.place,
        instant,
        noZoom: false,
        trackObject: true,
      });
      
    } else if (ra.value && dec.value) {
      store.gotoRADecZoom({
        raRad: ra.value * (D2R), 
        decRad: dec.value * (D2R), 
        zoomDeg: zoomDeg.value,
        instant: false,
      });
    }
    
  }
}

function onClick() {
  if (props.centerOnClick && ready.value && trackedElement.value !== null) {
    goTo(props.clickInstant);
  }
}

function onDoubleClick() {
  if (props.centerOnClick && ready.value && trackedElement.value !== null) {
    goTo(props.doubleClickInstant);
  }
}


const ute = useTrackedElements(store);
onMounted(() => {
  store.waitForReady().then(() => {

    
    
    if (!ute) {
      console.error('useTrackedElements returned null');
      return;
    }
    const pos = {ra: ra.value, dec: dec.value};
    trackedElement.value = ute.placeElement(parent.value, pos, label.value);
    updateVisibility(props.visible);
  })
    .then(() => {
      ready.value = true;
    })
    .catch((error) => {
      console.error(error);
    });
});

function updateVisibility(visible: boolean) {
  const element = trackedElement.value;
  if (element) {
    element.style.visibility = visible ? "visible" : "hidden";
  }
}

watch(() => props.visible, updateVisibility);

watch(() => [props.ra, props.dec,], ([newRa, newDec]) => {
  if (!trackedElement.value) return;
  trackedElement.value.move({
    ra: (newRa ?? ra.value) ,
    dec: (newDec ?? dec.value)
  });
  if (ready.value && ute) {
    ute.updateElements();
  }
}, { immediate: true });



const slots = defineSlots<{
  default: { 
    on: {
      click: (event: MouseEvent) => void,
      doubleClick: (event: MouseEvent) => void,
      'keydown.enter': (event: KeyboardEvent) => void
    },
    ra: Degree,
    dec: Degree,
    label: string,
  };
}>();


</script>

<template>
<!-- eslint-disable vue/html-indent -->
  <div 
    ref="parent" 
    class="wwt-tracked-content" 
    :class="['wwt-tracked-content', { debug: debug }]" 
    tabindex="0" 
    >
    <slot 
      :on="{'click': onClick, 'onDoubleClick': onDoubleClick, 'keydown.enter': onClick}" 
      :ra="ra" 
      :dec="dec" 
      :label="label"
      >
      <div 
        :class="['default-wwt-tracked-content-content', { debug: debug }]" 
        :style="{
          width: props.size + 'px',
          height: props.size + 'px',
        }"
        @click="onClick" 
        @dblclick="onDoubleClick" 
        @keydown.enter="onClick"
      >
      {{ label }}
      </div>
    </slot>
    <div
v-if="debug"
class="tracking-debug-circle tracked-element"
></div>
</div>
</template>

<style lang="less">
.wwt-tracked-content {
  pointer-events: auto;
  user-select: none;
  cursor: pointer;
}

.wwt-tracked-content.debug {
  outline: 1px solid magenta;
}

.default-wwt-tracked-content-content {
  width: 100px;
  height: 100px;
  border-radius: 50%;
  background-color: rgba(255, 255, 255, 0.5);
  transform: translate(-50%, -50%);
}

.tracking-debug-circle {
  position: absolute;
  top: 0;
  left: 0;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background-color: transparent;
  border: 2px solid red;
  transform: translate(-50%, -50%);
}

</style>
