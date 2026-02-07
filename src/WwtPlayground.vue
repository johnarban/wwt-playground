<template>
  <v-app
    id="app"
    :style="cssVars"
    class=""
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
          <sesame-resolver goto />
        </div>
        <div id="center-buttons">
        </div>
        <div id="right-buttons">
        </div>
      </div>


      <!-- This block contains the elements (e.g. the project icons) displayed along the bottom of the screen -->

      <div id="bottom-content">
        <div 
          v-if="currentView" 
          id="current-view" 
        >
          <div>{{ currentView.ra }} {{ currentView.dec }} </div>
          | <div>FOV: {{ currentView.fov }} </div>
        </div>
        <div
          v-if="!smallSize"
          id="body-logos"
        >
          <CreditLogos
            :default-logos="['cosmicds', 'wwt']"
          />
        </div>
      </div>
    </div>
  </v-app>
</template>

<script setup lang="ts">
/* eslint-disable @typescript-eslint/no-unused-vars */
import { ref, reactive, computed, onMounted, nextTick, useTemplateRef, watch } from "vue";
import { GotoRADecZoomParams, engineStore } from "@wwtelescope/engine-pinia";
import { BackgroundImageset, skyBackgroundImagesets, supportsTouchscreen, blurActiveElement, useWWTKeyboardControls, WWTEngineStore, CreditLogos, IconButton } from "@cosmicds/vue-toolkit";
import { useDisplay } from "vuetify";

import { D2R, R2D } from "@wwtelescope/astro";
import { simbadResolveCoordinates } from "./simbad_resolvers";
import { addClickNoDragListeners } from "./onClickNoDrag";
import { d2dmsString, d2hmsString } from '@/utils';

import { WWTControl } from '@wwtelescope/engine';

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
      zoomDeg: 10
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

function resolveTargetAtCoordinatesOnClick(event: MouseEvent) {
  const {ra, dec} = store.findRADecForScreenPoint({x: event.clientX, y: event.clientY}); // in degrees
  simbadResolveCoordinates(ra, dec, 60);
}

onMounted(() => {
  store.waitForReady().then(async () => {
    skyBackgroundImagesets.forEach(iset => backgroundImagesets.push(iset));
    store.gotoRADecZoom({
      ...props.initialCameraParams,
      instant: true
    }).then(() => positionSet.value = true);
    // If there are layers to set up, do that here!
    layersLoaded.value = true;
  });
  const el = document.getElementById('wwtcmpt0');
  if (el) {
    addClickNoDragListeners(el, resolveTargetAtCoordinatesOnClick);
  }
  
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

function getWWTScreenDimensions() {
  const renderContext = WWTControl.singleton.renderContext;
  const fovH = renderContext.get_fovAngle() * D2R;
  const fovW = fovH * renderContext.width / renderContext.height;
  return {width: fovW * R2D, height: fovH * R2D};
}
const currentView = computed(() => {
  if (layersLoaded.value) {
    const ra = store.raRad * R2D;
    const dec = store.decRad * R2D;
    const zoomDeg = store.zoomDeg;
    const roll = store.rollRad * R2D;
    const {width, height} = getWWTScreenDimensions();
    return {
      ra: `${d2hmsString(ra)}`,
      dec: `${d2dmsString(dec)}`,
      fov: `${(zoomDeg/6).toFixed(2)}\u00b0`,
      width: `${width.toFixed(2)}`,
      height: `${height.toFixed(2)}`,
      roll: `${roll.toFixed(1)}\u00b0`,
    };
  }
  return null;
});
</script>

<style lang="less">
@import url('https://fonts.googleapis.com/css2?family=Source+Code+Pro:ital,wght@0,200..900;1,200..900&family=Source+Sans+3:ital,wght@0,200..900;1,200..900&display=swap');

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
  width:100%;
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
/*
:focus-visible,
button:focus-visible,
.focus-visible,
.v-selection-control--focus-visible .v-selection-control__input {
  outline: 9px double white !important;
  box-shadow: 0 0 0 6px black !important;
  border-radius: .125rem;
}
*/

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

#current-view {
  outline: 1px solid wheat;
  padding: 0.5em 0.5em;
  display: flex;
  flex-direction: row;
  gap: 1rem;
  align-self: flex-start;
  font-family: 'Source Code Pro';
}
</style>
