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
          <icon-button
            icon="book-open"
            :color="buttonColor"
            tooltip-location="start"
          >
          </icon-button>
          <WWTTimeControl />
          <button 
            @click="toggle3D" 
            @keyup.enter="toggle3D"
          >
            Switch to {{ in3d ? '2D' : '3D' }}
          </button>
          <AddShader
            :in3d="in3d"
            :location="location"
          />
        </div>
        <div id="center-buttons">
        </div>
        <div id="right-buttons">
        </div>
      </div>


      <!-- This block contains the elements (e.g. the project icons) displayed along the bottom of the screen -->

      <div id="bottom-content">
        <div id="time-slider-container">
          <input
            id="time-slider"
            v-model.number="timeOfDay"
            type="range"
            min="0"
            max="86399"
            step="60"
            @input="onTimeChange"
          />
          <span id="time-label">{{ timeLabel }}</span>
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
import { ref, reactive, computed, onMounted, nextTick, watch } from "vue";
import { GotoRADecZoomParams, engineStore } from "@wwtelescope/engine-pinia";
import { BackgroundImageset, skyBackgroundImagesets, supportsTouchscreen, blurActiveElement, useWWTKeyboardControls, WWTEngineStore, CreditLogos, IconButton } from "@cosmicds/vue-toolkit";
import { useDisplay } from "vuetify";

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
      zoomDeg: 360
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

let in3d = ref(false);

function toggle3D() {
  if (!in3d.value) {
    store.setBackgroundImageByName('Solar System');
    in3d.value = true;
  } else {
    if (backgroundImagesets[0]) {
      store.setBackgroundImageByName(backgroundImagesets[0].imagesetName);
      in3d.value = false;
    }
  }
};

import { addToWWTRenderLoop , renderOneFrame} from "./wwt-hacks";
import { D2R } from "@wwtelescope/astro";
import { AstroCalc, SpaceTimeController, Settings } from "@wwtelescope/engine";
import { SolarSystemObjects } from "@wwtelescope/engine-types";
import AddShader from "./components/AddShader.vue";
import WWTTimeControl from "./components/WWTTimeControl.vue";

interface LocationDeg {
  lat: number,
  lon: number
}
const defaultLocation: LocationDeg = { lat: 42.3736,lon: -71.1097};
const location = ref(defaultLocation);

const timeOfDay = ref(18 * 3600); // seconds from midnight, default 18:00
const timeLabel = computed(() => {
  const h = Math.floor(timeOfDay.value / 3600);
  const m = Math.floor((timeOfDay.value % 3600) / 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
});

function onTimeChange() {
  const h = Math.floor(timeOfDay.value / 3600);
  const m = Math.floor((timeOfDay.value % 3600) / 60) ;
  const s = Math.floor(timeOfDay.value % 60);
  if (ready.value) {
    store.setClockSync(false);
    const today = store.currentTime;
    store.setTime(new Date(today.getFullYear(), today.getMonth(), today.getDate(), h, m, s));
  }
}

watch(() => store.currentTime, (date) => {
  const seconds = date.getHours() * 3600 + date.getMinutes() * 60 + date.getSeconds();
  timeOfDay.value = seconds;
});

function setWWTLocation(location: LocationDeg) {
  store.applySetting(['locationLat', location.lat]);
  store.applySetting(['locationLng', location.lon]);
}

onMounted(() => {
  store.waitForReady().then(async () => {
    let logOnce = true;
    
    store.applySetting(['localHorizonMode', true]);
    setWWTLocation(location.value);
    store.applySetting(['showAltAzGrid', true]);
    store.setClockRate(1000);
    store.setClockSync(false);  // need this to prevent store.currentTime from being constantly set
    store.setTime(new Date(2026, 2, 20, 18, 0, 0));
    skyBackgroundImagesets.forEach(iset => backgroundImagesets.push(iset));
    // store.applySetting(['showGrid', true]);
    renderOneFrame();
    const sunPos = AstroCalc.getPlanet(SpaceTimeController.utcToJulian(store.currentTime), SolarSystemObjects.sun, 0,0,0);
    store.gotoRADecZoom({
      raRad: sunPos.RA * D2R,
      decRad: sunPos.dec * D2R,
      zoomDeg: props.initialCameraParams.zoomDeg,
      rollRad: props.initialCameraParams.rollRad,
      instant: true
    }).then(() => positionSet.value = true);
    positionSet.value = true;
    // If there are layers to set up, do that here!
    layersLoaded.value = true;
    if (in3d.value) {
      store.setBackgroundImageByName('Solar System');
    }
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
  align-items: flex-start;
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

#time-slider-container {
  position: absolute;
  bottom: 3rem;
  left: 50%;
  transform: translateX(-50%);
  width: 80vw;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  pointer-events: auto;
}

#time-slider {
  flex: 1;
  cursor: pointer;
  accent-color: #fff;
}

#time-label {
  color: #fff;
  font-family: monospace;
  font-size: 1rem;
  text-shadow: 0 0 4px rgba(0,0,0,0.8);
  white-space: nowrap;
}

#bottom-content {
  #body-logos {
    align-self: flex-end;
  }
}

// From Sara Soueidan (https://www.sarasoueidan.com/blog/focus-indicators/) & Erik Kroes (https://www.erikkroes.nl/blog/the-universal-focus-state/)
// :focus-visible,
// button:focus-visible,
// .focus-visible,
// .v-selection-control--focus-visible .v-selection-control__input {
//   outline: 9px double white !important;
//   box-shadow: 0 0 0 6px black !important;
//   border-radius: .125rem;
// }

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

#app button {
  border: 1px solid white;
  padding: 4px 8px;
  border-radius: 9999px;
  pointer-events: auto;
}

#app button:hover {
  background-color: rgb(255, 255, 255, 0.1);
  color: black;
}

</style>
