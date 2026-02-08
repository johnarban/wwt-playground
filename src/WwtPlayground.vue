<template>
  <v-app
    id="app"
    :style="cssVars"
  >
    <div
      id="main-content"
    >
      <WorldWideTelescope
        :wwt-namespace="wwtNamespace"
      ></WorldWideTelescope>


      <!-- This contains the splash screen content -->

      <transition name="fade">
        <div
          v-show="isLoading"
          id="modal-loading"
          class="modal"
        >
          <div class="container">
            <div class="spinner"></div>
            <p>Loading …</p>
          </div>
        </div>
      </transition>
    

      <!-- This block contains the elements (e.g. icon buttons displayed at/near the top of the screen -->

      <div id="top-content">
        <div id="left-buttons">
          <LayerList
            :layers="fitsLayers"
            :selected-layer="selectedLayerName"
            @goto-layer="gotoLayer"
          />
        </div>
        <div id="center-buttons">
        </div>
        <div id="right-buttons">
          <LayerControls
            @file-uploaded="onFileUploaded"
          />
          <FitsLayerSettings
            :imageset-layer="selectedLayer"
          />
        </div>
      </div>


      <!-- This block contains the elements (e.g. the project icons) displayed along the bottom of the screen -->

      <div id="bottom-content">
        <div class="slider-container">
          <v-slider
            v-model="fitsZ"
            class="z-input"
            :min="0"
            :max="Math.max(0, sliceCount - 1)"
            :label="`Velocity: ${velocity.toFixed(2)} km/s`"
            thumb-label
            track-size="10px"
          />
        </div>
      </div>
    </div>
  </v-app>
</template>

<script setup lang="ts">
/* eslint-disable @typescript-eslint/no-unused-vars */
import { ref, reactive, computed, onMounted, nextTick , watch, Ref} from "vue";
import { 
  GotoRADecZoomParams, 
  engineStore 
} from "@wwtelescope/engine-pinia";
import { 
  BackgroundImageset, 
  skyBackgroundImagesets, 
  supportsTouchscreen, 
  blurActiveElement, 
  useWWTKeyboardControls, 
  WWTEngineStore, 
  CreditLogos, 
  IconButton 
} from "@cosmicds/vue-toolkit";
import { useDisplay } from "vuetify";

import {
  Imageset,
  FitsImage,
  ImageSetLayer,
} from "@wwtelescope/engine";

import { ScaleTypes } from "@wwtelescope/engine-types";

import { D2R } from "@wwtelescope/astro";

import FitsLayerSettings from "./FITSLayerSettings.vue";
import LayerControls from "./components/LayerControls.vue";
import LayerList from "./components/LayerList.vue";


import { applyFitsSlice } from "./alt-hacks";
import { Colormaps } from "./types";

type SheetType = "text" | "video";
type CameraParams = Omit<GotoRADecZoomParams, "instant">;
export interface WwtPlaygroundProps {
  wwtNamespace?: string;
  initialCameraParams?: CameraParams;
}

const store = engineStore();

useWWTKeyboardControls(store);

const touchscreen = supportsTouchscreen();
const { smAndDown } = useDisplay();

const props = withDefaults(defineProps<WwtPlaygroundProps>(), {
  wwtNamespace: "wwt-playground",
  initialCameraParams: () => {
    return {
      raRad: 0,
      decRad: 0,
      zoomDeg: 60
    };
  }
});

const splash = new URLSearchParams(window.location.search).get("splash")?.toLowerCase() !== "false";
const showSplashScreen = ref(splash);
const backgroundImagesets = reactive<BackgroundImageset[]>([]);
const sheet = ref<SheetType | null>(null);
const layersLoaded = ref(false);
const positionSet = ref(false);
const accentColor = ref("#ffffff");
const buttonColor = ref("#ffffff");

interface FitsLayerInfo {
  name: string;
  layer: ImageSetLayer;
  fitsImage: FitsImage | null;
  dataUnit: Float64Array | Float32Array | Uint8Array | Int16Array | Int32Array | undefined;
}

const fitsLayers = ref<FitsLayerInfo[]>([]);
const selectedLayerName = ref<string>("");

const selectedLayer = computed(() => {
  const info = fitsLayers.value.find(l => l.name === selectedLayerName.value);
  return info?.layer ?? null;
});

const selectedLayerInfo = computed(() => {
  return fitsLayers.value.find(l => l.name === selectedLayerName.value);
});

const sliceCount = ref<number>(0);

onMounted(() => {
  store.waitForReady().then(async () => {
    skyBackgroundImagesets.forEach(iset => backgroundImagesets.push(iset));
    store.gotoRADecZoom({
      ...props.initialCameraParams,
      instant: true
    }).then(() => positionSet.value = true);
    // If there are layers to set up, do that here!
    
    store.loadFitsLayer({
      url: './13CO_final.vscale.fits',
      name: 'L 1478 (13CO)',
      gotoTarget: false,
    }).then((layer) => {
      layer.set_colorMapperName('inferno' as Colormaps);
      layer.setImageScalePhysical(ScaleTypes.linear, 0, 1);
      const fitsImage = layer.getFitsImage();
      const dataUnit = fitsImage?.dataUnit;
      
      fitsLayers.value.push({
        name: 'L 1478 (13CO)',
        layer,
        fitsImage,
        dataUnit
      });
      selectedLayerName.value = 'L 1478 (13CO)';
      
      if (fitsImage) {
        sliceCount.value = Math.max(1, fitsImage.axisSize[2] ?? 0);
      }
      return layer.get_imageSet();
    }).then((iset) => {
      store.gotoRADecZoom({
        raRad: iset.get_centerX() * D2R,
        decRad: iset.get_centerY() * D2R,
        zoomDeg: iset._guessZoomSetting() * 6 / 1.5,
        instant: true,
      });
      layersLoaded.value = true;
    });
    
    
  });
});

const ready = computed(() => layersLoaded.value && positionSet.value);

/* `isLoading` is a bit redundant here, but it could potentially have independent logic */
const isLoading = computed(() => !ready.value);

/* Properties related to device/screen characteristics */
const smallSize = computed(() => smAndDown.value);


/* This lets us inject component data into element CSS */
const cssVars = computed(() => {
  return {
    "--accent-color": accentColor.value,
  };
});


const fitsZ = ref(0);
watch(fitsZ, (z) => {
  const info = selectedLayerInfo.value;
  if (!info?.layer || !info?.dataUnit) {
    return;
  }
  applyFitsSlice(info.layer, info.dataUnit, z);
});

watch(selectedLayerName, () => {
  const info = selectedLayerInfo.value;
  if (info?.fitsImage) {
    sliceCount.value = Math.max(1, info.fitsImage.axisSize[2] ?? 0);
    fitsZ.value = 0;
  }
});

const velocity = computed(() => {
  const info = selectedLayerInfo.value;
  if (!info?.fitsImage?.header) return 0;
  
  const crval3 = parseFloat(info.fitsImage.header.CRVAL3 ?? '0');
  const cdelt3 = parseFloat(info.fitsImage.header.CDELT3 ?? '1');
  const crpix3 = parseFloat(info.fitsImage.header.CRPIX3 ?? '1');
  
  // FITS pixels are 1-indexed, array indices are 0-indexed
  const pixel = fitsZ.value + 1;
  
  return (crval3 + (pixel - crpix3) * cdelt3) / 1000;
});

function gotoLayer(name: string) {
  const info = fitsLayers.value.find(l => l.name === name);
  if (!info) return;
  
  selectedLayerName.value = name;
  
  const iset = info.layer.get_imageSet();
  store.gotoRADecZoom({
    raRad: iset.get_centerX() * D2R,
    decRad: iset.get_centerY() * D2R,
    zoomDeg: iset._guessZoomSetting() * 6 / 1.5,
    instant: false,
  });
}

function onFileUploaded(file: File) {
  const url = URL.createObjectURL(file);
  store.loadFitsLayer({
    url,
    name: file.name,
    gotoTarget: true,
  }).then((layer) => {
    fitsLayers.value.push({
      name: file.name,
      layer,
      fitsImage: layer.getFitsImage(),
      dataUnit: layer.getFitsImage()?.dataUnit
    });
    selectedLayerName.value = file.name;
    
    const fitsImage = layer.getFitsImage();
    if (fitsImage) {
      sliceCount.value = Math.max(1, fitsImage.axisSize[2] ?? 0);
    }
  });
};

</script>

<style lang="less">
@font-face {
  font-family: "Highway Gothic Narrow";
  src: url("./assets/HighwayGothicNarrow.ttf");
}

:root {
  font-size: 11pt;
  line-height: 1.2;
}

html {
  height: 100%;
  margin: 0;
  padding: 0;
  background-color: #000;
  overflow: hidden;

  
  -ms-overflow-style: none;
  // scrollbar-width: none;
}

body {
  position: fixed;
  width: 100%;
  height: 100%;
  margin: 0;
  padding: 0;
  overflow: hidden;

  font-family: Verdana, Arial, Helvetica, sans-serif;
}

#main-content {
  position: fixed;
  width: 100vw;
  height: 100vh;
  overflow: hidden;

  transition: height 0.1s ease-in-out;
}

#app {
  width: 100%;
  height: 100%;
  margin: 0;
  overflow: hidden;

  .wwtelescope-component {
    position: absolute;
    top: 0;
    width: 100%;
    height: 100%;
    border-style: none;
    border-width: 0;
    margin: 0;
    padding: 0;
  }
}


.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s;
}
.fade-enter,
.fade-leave-to {
  opacity: 0;
}

.modal {
  position: absolute;
  top: 0px;
  left: 0px;
  width: 100%;
  height: 100%;
  z-index: 100;
  color: #fff;
  background-color: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
}

#modal-loading {
  background-color: #000;
  .container {
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: center;
    .spinner {
      background-image: url("https://projects.cosmicds.cfa.harvard.edu/cds-website/misc/lunar_loader.gif");
      background-repeat: no-repeat;
      background-size: contain;
      width: 3rem;
      height: 3rem;
    }
    p {
      margin: 0 0 0 1rem;
      padding: 0;
      font-size: 2rem;
    }
  }
}

#top-content {
  position: absolute;
  top: 1rem;
  left: 1rem;
  width: calc(100% - 2rem);
  pointer-events: none;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

#left-buttons {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

#right-buttons {
  display: flex;
  flex-direction: column;
  gap: 10px;
  align-items: flex-end;
  height: auto;
}

#bottom-content {
  display: flex;
  flex-direction: column;
  position: absolute;
  bottom: 1rem;
  right: 1rem;
  width: calc(100% - 2rem);
  pointer-events: none;
  align-items: center;
  gap: 5px;
}

#bottom-content {
  #body-logos {
    align-self: flex-end;
  }
}

// From Sara Soueidan (https://www.sarasoueidan.com/blog/focus-indicators/) & Erik Kroes (https://www.erikkroes.nl/blog/the-universal-focus-state/)
:focus-visible,
button:focus-visible,
.focus-visible,
.v-selection-control--focus-visible .v-selection-control__input {
  outline: 9px double white !important;
  box-shadow: 0 0 0 6px black !important;
  border-radius: .125rem;
}

.layout-debug {
  #main-content {
    border: 2px solid red;
  }
  #main-content,
  #top-content,
  #left-buttons,
  #center-buttons,
  #right-buttons,
  #bottom-content {
    outline: 1px solid white;
    min-width: 1px;
    min-height: 1px;
  }
  
}

.z-input {
  pointer-events: auto;
}

.slider-container {
  pointer-events: auto;
  width: 100%;
}


</style>
