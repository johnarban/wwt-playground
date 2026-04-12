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
      <wwt-loader v-model="isLoading" />


      <!-- This contains the splash screen content -->


      <!-- This block contains the elements (e.g. icon buttons displayed at/near the top of the screen -->
      <div id="wwt-overlay">
        <div id="top-content">
          <div id="left-buttons">
            <icon-button
              icon="mdi-home"
              :color="buttonColor"
              tooltip-location="start"
              @activate="goHome"
            >
            </icon-button>
            <span class="zoom-label">+</span>
            <input
              type="range"
              class="zoom-slider"
              min="0"
              max="1"
              step="0.001"
              :value="zoomSliderValue"
              @input="onZoomSlider"
            />
            <span class="zoom-label">−</span>
          </div>
          <div id="center-buttons">
          </div>
          <div id="right-buttons">
            <button
              :class="['artemis-btn', 'copy-btn', copySuccess ? 'copy-success' : '']"
              @click="copyViewUrl"
              @keyup.enter="copyViewUrl"
            >
              <span>
                {{ copySuccess ? 'Copied URL!' : 'Copy view URL' }}
              </span>
            </button>
            <fieldset class="tracking-toggle">
              <legend>
                Path Reference frame:
              </legend>
              <EarthMoonToggle
                v-model="trackingCenter"
              />
            </fieldset>
            <div class="checkbox-settings text-body-small">
              <!-- show trajectory points -->
              <v-checkbox
                v-model="showTrajectoryPoints"
                label="Show Trajectory Points"
                density="compact"
                hide-details
              />
              <!-- show trajectory orbit -->
              <v-checkbox
                v-model="showTrajectoryLine"
                label="Show Trajectory Line"
                density="compact"
                hide-details
              />
              <!-- show moon comparison -->
              <v-checkbox
                v-model="showMoonRefLayer"
                label="Show Moon Reference Layer"
                density="compact"
                hide-details
              />
            </div>
          </div>
        </div>


        <!-- This block contains the elements (e.g. the project icons) displayed along the bottom of the screen -->

        <div id="bottom-content">
          <ArtemisTimeControl
            v-model:time="currentTime"
            :can-create="positionSet"
            :initial-time="INITIAL_TIME"
            :start-time="MISSION_START"
            :end-time="MISSION_END"
            :step="horizonTimeDelta"
          />
          <div
            v-if="!smallSize"
            id="body-logos"
          >
            <CreditLogos
              :default-logos="['cosmicds', 'wwt']"
            />
            <p class="toolkit-credit">
              Interactive developed using the
              <a
                href="https://github.com/cosmicds/vue-toolkit"
                target="_blank"
                rel="noopener"
              >CosmicDS toolkit</a>
            </p>
          </div>
        </div>
      </div>
    </div>
    <div
      v-show="sheet === 'text'"
      id="bottom-drawer"
    >
      <article class="pa-5">
        <h1>Bottom Drawer</h1>
        <p>
          Never gonna give you up.
        </p>
        <p>
          Never gonnna let you down.
        </p>
      </article>
    </div>
  </v-app>
</template>

<script setup lang="ts">
/* eslint-disable @typescript-eslint/no-unused-vars */
import { ref, reactive, computed, onMounted, watch } from "vue";
import { GotoRADecZoomParams, engineStore } from "@wwtelescope/engine-pinia";
import { BackgroundImageset, supportsTouchscreen, useWWTKeyboardControls, CreditLogos, IconButton } from "@cosmicds/vue-toolkit";
import { useDisplay } from "vuetify";
import { D2R, H2R  } from "@wwtelescope/astro";
import { AstroCalc, Color, SpreadSheetLayer, OrbitLineList, Vector3d } from "@wwtelescope/engine";
import { CoordinatesType, MarkerScales, ReferenceFrames, SolarSystemObjects } from "@wwtelescope/engine-types";
import ArtemisTimeControl from "./components/ArtemisTimeControl.vue";
import EarthMoonToggle from "./components/EarthMoonToggle.vue";

import { useCameraUrl } from "./composables/useCameraUrl";
import { 
  moveViewCamera, 
  type CameraView, 
  doWWTHacks,
  addToWWTRenderLoop,
  removeFromWWTRenderLoop,
} from "./wwt-hacks";

import { LayerManager, WWTControl } from "@wwtelescope/engine";

import { AltUnits } from "@wwtelescope/engine-types";
import { useStretchedZoom } from "./composables/useStretchedZoom";


import { 
  parseHorizonsVectorsForWwt, 
  setupHorizonsSpreadSheetLayer , 
  getHorizonsStartEndTimes
} from "./horizons";
import horizonsEarthData from "@/assets/horizons_results-earth.txt?raw";
import horizonsMoonData from "@/assets/horizons_results-moon.txt?raw";

const { zoomSliderValue, onZoomSlider, ZOOM_MAX } = useStretchedZoom();

// watchWwtContainerSize('.wwtelescope-component', '#main-content');

type SheetType = "text" | "video";
type CameraParams = Omit<GotoRADecZoomParams, "instant">;
export interface WwtPlaygroundProps {
  wwtNamespace?: string;
}

const store = engineStore();

useWWTKeyboardControls(store);

const touchscreen = supportsTouchscreen();
const { smAndDown } = useDisplay();

const props = withDefaults(defineProps<WwtPlaygroundProps>(), {
  wwtNamespace: "wwt-playground",
});

const splash = new URLSearchParams(window.location.search).get("splash")?.toLowerCase() !== "false";
const showSplashScreen = ref(splash);
const backgroundImagesets = reactive<BackgroundImageset[]>([]);
const sheet = ref<SheetType | null>(null);
const layersLoaded = ref(false);
const positionSet = ref(false);
const accentColor = ref("#ffffff");
const buttonColor = ref("#ffffff");



function clampTime(time: Date, min: Date, max: Date): Date {
  const clamped = Math.min(
    Math.max(time.getTime(), min.getTime()),
    max.getTime()   
  );
  return new Date(clamped);
}

const { start: MISSION_START, end: MISSION_END, deltaT: horizonTimeDelta } = getHorizonsStartEndTimes(horizonsEarthData);
  
const now = new Date();
const HOME_TIME = clampTime(now, MISSION_START, MISSION_END);
const urlTime = new URLSearchParams(window.location.search).get("time");
const INITIAL_TIME = ref(urlTime ? new Date(+urlTime) : HOME_TIME);

const INITIAL_VIEW: CameraView = {
  lng: 214.660687,
  lat: 13.418963,
  zoomDeg: 0.000511,
  rotationDeg: 0,
  angleDeg: 0,
  time: INITIAL_TIME.value.getTime()
};

const EARTH_VIEW: CameraView = {
  lng: 316.555988,
  lat: 74.277000,
  zoomDeg: 0.017202,
  rotationDeg: 0,
  angleDeg: 0,
  time: INITIAL_TIME.value.getTime()
};

const currentTime = ref(INITIAL_TIME.value);

function goHome() {
  currentTime.value =  INITIAL_TIME.value;
  trackingCenter.value = SolarSystemObjects.moon;
  moveViewCamera(INITIAL_VIEW, false);
}


const { copyViewUrl, copySuccess } = useCameraUrl(INITIAL_VIEW);

const layers = ref<SpreadSheetLayer[]>([]);

const trackingCenter = ref<SolarSystemObjects>(SolarSystemObjects.moon);
  
const createHorizonsSpreadSheetLayer = (name: string, dataCsv: string, referenceFrame: string = 'Sky') => {
  return store.createTableLayer({
    name,
    referenceFrame: referenceFrame,
    dataCsv,
  }).then(setupHorizonsSpreadSheetLayer);
};



const showTrajectoryPoints = ref(true);
const showMoonRefLayer = ref(false);

function createArtemisLayers(trackedObject: SolarSystemObjects) {
  
  const vec = parseHorizonsVectorsForWwt(horizonsEarthData, SolarSystemObjects.earth, trackedObject);

  // creating the path layer
  if (showTrajectoryPoints.value) {
    createHorizonsSpreadSheetLayer('Artemis', vec)
      .then(layer => {
        layer.set_markerScale(MarkerScales.world);
        layer.set_scaleFactor(0.0012);
        layer.set_color(Color.fromHex("#ffffff"));
        layer.set_opacity(25);
        layers.value.push(layer);
      });
  }
  
  // creating the time series layer
  createHorizonsSpreadSheetLayer('Artemis Time', vec)
    .then(layer => {
      layer.set_markerScale(MarkerScales.screen);
      layer.set_scaleFactor(40);
      layer.set_color(Color.fromHex("#ff0000"));
      layer.set_opacity(100);
      layer.set_startDateColumn(1);
      layer.set_endDateColumn(1);
      layer.set_decay(4.9/ (60 * 24));
      layer.set_timeSeries(true);
      layers.value.push(layer);
    });

  
  
  if (showMoonRefLayer.value) {
    const vecMoon = parseHorizonsVectorsForWwt(horizonsMoonData, SolarSystemObjects.moon, trackedObject);
    createHorizonsSpreadSheetLayer('Moon Reference', vecMoon)
      .then(layer => {
        layer.set_markerScale(MarkerScales.screen);
        layer.set_scaleFactor(5);
        layer.set_color(Color.fromHex("#00ffff"));
        layer.set_opacity(25);
        layers.value.push(layer);
      });
  
  }
  
}

function removeArtemisLayers() {
  layers.value.forEach(layer => store.deleteLayer(layer.id.toString()));
}


function createArtemisOrbitLineList(trackedObject: SolarSystemObjects) {
  const lineList = new OrbitLineList();
  const colorHex = "#ffffff";
  const color = Color.fromHex(colorHex);
  color.a = 255;
  const vec = parseHorizonsVectorsForWwt(horizonsEarthData, SolarSystemObjects.earth, trackedObject);
  const items = vec.split("\r\n");
  const header = items.shift();
  const points = items.map(line => {
    const parts = line.split(",");
    return Vector3d.create(
      +parts[2],
      +parts[4],
      +parts[3]
    );
  });
  for (let i = 1; i < points.length; i++) {
    lineList.addLine(
      points[i - 1], 
      points[i], 
      color,
      color,
    );
  }
  return lineList;
}

const artemisOrbitLineList = ref(createArtemisOrbitLineList(trackingCenter.value));
function setArtemisLineList() {
  artemisOrbitLineList.value = createArtemisOrbitLineList(trackingCenter.value);
}
const showTrajectoryLine = ref(true);
function drawArtemisOrbit () {
  if (showTrajectoryLine.value) {
    artemisOrbitLineList.value.set_depthBuffered(true);
    artemisOrbitLineList.value.drawLines(WWTControl.singleton.renderContext, 1, Color.fromHex("#ffffff"));
  }
}

function showArtemisLineList() {
  setArtemisLineList();
  addToWWTRenderLoop(drawArtemisOrbit);
}
function hideArtemisLineList() {
  removeFromWWTRenderLoop(drawArtemisOrbit);
}

onMounted(() => {
  store.waitForReady().then(async () => {
    WWTControl.singleton.set_zoomMax(ZOOM_MAX);
    WWTControl.singleton.setSolarSystemMaxZoom(ZOOM_MAX);

    WWTControl.singleton.renderOneFrame();
    doWWTHacks();

    store.setBackgroundImageByName("Solar System");
    store.applySetting(["actualPlanetScale", true]);
    store.applySetting(["solarSystemCosmos", true]);
    store.applySetting(["solarSystemMilkyWay", true]);
    store.setTrackedObject(SolarSystemObjects.moon);

    // @ts-expect-error this does exist
    WWTControl.singleton.shallowLayerTest = function(layer: unknown) {
      return true; // just pass true?????? this can't be right, but it works
    };


    store.setTrackedObject(trackingCenter.value);
    createArtemisLayers(trackingCenter.value);
    showArtemisLineList();
    
    positionSet.value = true;
    layersLoaded.value = true;
  });
});

watch(trackingCenter, (trackedObject, oldCenter) => {
  if (oldCenter !== trackedObject) {
    store.setTrackedObject(trackedObject);
    if (trackedObject === SolarSystemObjects.earth) {
      moveViewCamera(EARTH_VIEW, false);
    }
  }
});
watch([trackingCenter, showTrajectoryPoints, showMoonRefLayer, showTrajectoryLine], ([trackedObject, _, __ ]) => {
  removeArtemisLayers();
  hideArtemisLineList();
  createArtemisLayers(trackedObject);
  showArtemisLineList();
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

// #app is a column flex container with two children:
// #main-content and #bottom-drawer.
// #main-content contains the WWT display and the overlay content.

#app {
  // Vuetify's root app element fills the viewport.
  overflow: hidden;
  // Vuetify's root app element is a column flex layout
  // lets #main-content take the remaining height
  // after `#bottom-drawer` takes its own height.
}

// while #app is a flex, the direct parent
// is .v-application__wrap
// this takes the size of it's children
// so we need to apply height definitions here
// for a display with a side-panel this is generally
// what we want
.v-application__wrap {
  flex-direction: row-reverse;  // add for the side panel
  max-height: 100svh;  // force the application to be 100%
}

#app.app-is-small {
  .v-application__wrap {
    flex-direction: column;  // add for the side panel
    max-height: 100svh;  // force the application to be 100%
  }
}


#main-content {
  // This is the containing block for the absolutely positioned WWT host and overlay.
  position: relative;
  display: block; // don't need to set width. block elements stretch to fill their container by default.

  // Its height is determined by the flex layout in `#app`.
  flex: 1 0 auto;
  overflow: hidden;

  transition: height 0.1s ease-in-out;
}

/* The WWT host is out of flow so its measured size does not affect #main-content. */
// by using inset: 0, .wwttelescope-component fills #main-content and automatically resizes with it,
// without needing a height width set. this allows main-content to be more freely sizes.
/*
WWT can size itself from CSS alone here because #main-content has a real layout size (from the flex layout in #app)
and `.wwtelescope-component` is absolutely positioned to fill it.

This breaks if #main-content stops having a definite size from layout. Common failure modes:
  - `#main-content` loses `flex-grow`/flex sizing, so in a column layout it can collapse to zero height.
  - An ancestor no longer has a definite height, so percentage or flex-based heights stop resolving.
  - `#main-content` is changed to content-sized sizing (`auto`, `fit-content`, certain grid/flex min-content cases),
    so its size starts depending on descendants instead of the outer layout.
  - `.wwtelescope-component` is put back in normal flow, letting WWT's continuously resized canvas feed back into layout
    and recreate the growth loop.
  - Padding or other box-model changes are applied to the measured WWT host instead of an outer wrapper, which can
    reintroduce resize feedback.

If any of those happen, the ResizeObserver composable may be needed again to push the resolved size from
`#main-content` onto the WWT host explicitly.
*/
.wwtelescope-component {
  position: absolute; // putting this to relative will cause the growth loop, and will require the composable to prevent that
  top: 0;
  left: 0;
  bottom: 0;
  right: 0;
  // The composable sets the host element's inline width/height from #main-content.
  transition: height 0.2s ease-in-out;
  opacity: 1;
}

/*
#wwt-overlay is positioned against #main-content, not the viewport.
`position: absolute` makes it fill #main-content.
`position: fixed` would anchor it to the viewport instead.
The overlay itself is out of flow, but its children can use normal flex layout inside it.
you can also do position: relative, height: 100%. (and remove the inset: 0)
- absolute + inset: 0 says “this is a layer pinned to the container”
- relative + height: 100% says “this is a normal child trying to be as tall as its parent”
we use the absolute variant to stay more independent of the which can interact weirdly with WWT's resizing.
and the relative still requires the parent to have a definite size.
and remember, position:absolute is still a positioned parent, so children can be absolute against it
*/
#wwt-overlay {
  position: absolute;
  top: 0;
  left: 0;
  bottom: 0;
  right: 0;
  padding: 1rem;
  pointer-events: none;

  display: flex;
  flex-direction: column;
  justify-content: space-between; // pushes top and bottom content apart
  
  font-size: 1rem;
}

// moved modal content to Loader.vue

#top-content {
  width: 100%; // 100% of the overlay less the padding
  pointer-events: none;
  display: flex;
  justify-content: space-between; // keeps left, center, and right buttons spread
  align-items: flex-start;
}

#left-buttons {
  display: flex;
  flex-direction: column;
  gap: 10px;
  align-items: center;

  .zoom-slider {
    writing-mode: vertical-lr;
    height: 120px;
    accent-color: #fff;
    pointer-events: auto;
    cursor: pointer;
    opacity: 0.75;
    &:hover { opacity: 1; }
  }

  .zoom-label {
    background: #000;
    border: 1px solid #fff;
    border-radius: 3px;
    color: #fff;
    width: 20px;
    height: 20px;
    line-height: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    user-select: none;
  }
}

#center-buttons {
  display: flex;
  flex-direction: column;
  gap: 10px;
  align-items: center;
}
#right-buttons {
  display: flex;
  flex-direction: column;
  gap: 10px;
  align-items: flex-end;
  height: auto;

  .artemis-btn {
    pointer-events: auto;
    background: rgba(255, 255, 255, 0.12);
    border: 1px solid rgba(255, 255, 255, 0.45);
    border-radius: 4px;
    color: #fff;
    font-size: 1em;
    padding: 4px 10px;
    cursor: pointer;
    &:hover { background: rgba(255, 255, 255, 0.25); }
  }
  
  .copy-btn {
    transition: border-color 0.2s, box-shadow 0.2s;
    width: 15ch;

    &.copy-success {
      border-color: #0ee7e3;
      box-shadow: 0 0 6px 1px rgba(7, 105, 226, 0.6);
    }
  }
}

#app.app-is-small .artemis-btn {
  font-size: 1em;
}

#app.app-is-small  .copy-btn {
    width: 16ch;
}

.icon-wrapper {
  pointer-events: auto;
  background: rgba(255, 255, 255, 0.12);
  border: 1px solid rgba(255, 255, 255, 0.45);
  border-radius: 4px !important;
  color: #fff;
  font-size: 0.8rem;
  padding: 4px 10px;
  cursor: pointer;
  &:hover { background: rgba(255, 255, 255, 0.25); }
}



#bottom-content {
  display: flex;
  flex-direction: column;
  pointer-events: none;
  align-items: center;
  gap: 5px;
}

#bottom-content {
  #body-logos {
    align-self: flex-end;
  }

  #icons-container {
    display: flex;
    justify-content: flex-end;
  }

  .toolkit-credit {
    font-size: 0.65rem;
    color: rgba(255,255,255,0.55);
    text-align: right;
    margin: 2px 0 0;
    a { color: inherit; text-decoration: underline; }
  }
}

#app.app-is-small #bottom-content {
  margin-bottom: 1rem;
  padding-inline: 1rem;
}

// From Sara Soueidan (https://www.sarasoueidan.com/blog/focus-indicators/) & Erik Kroes (https://www.erikkroes.nl/blog/the-universal-focus-state/)
:focus-visible {
  /* Keep this override outside Vuetify's layers so it wins without !important. */
  outline: 4px double white;
  box-shadow: 0 0 0 2px black;
  border-radius: .025rem;
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
  #wwt-overlay {
    border: 3px solid aqua;
  }

}

#bottom-drawer {
  position: relative;
  // height: 200px;
  // flex: 0 0 200px;
  overflow: auto;
}

// Fix: @cosmicds/vue-toolkit bundles an older unlayered Vuetify whose
// `.v-selection-control__input { position: relative }` beats the layered
// `.v-switch .v-selection-control__input { position: absolute }` from the
// app's Vuetify (unlayered always beats @layer). This restores the correct value.
.v-switch .v-selection-control__input {
  position: absolute;
}

.v-input.moon-earth-swtich {
  .v-selection-control {
    gap: 1em;
  }
}

fieldset.tracking-toggle {
  padding: 0;
  padding-top: 0.5em;
  border: none;
  font-size: 1em;
}

fieldset.tracking-toggle legend {
  font-size: 0.9em;
}

.v-checkbox {
  font-size: 0.9rem;
}

.v-label {
  font-size: 1em;
}
</style>
