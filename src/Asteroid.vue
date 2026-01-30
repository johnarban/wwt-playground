<!-- eslint-disable @typescript-eslint/no-non-null-assertion -->
<template>
  <v-app id="app">
    <div
      id="main-content"
    > 
      <WorldWideTelescope
        :wwt-namespace="wwtNamespace"
      ></WorldWideTelescope>

      <orbit-comparison
        v-if="objectOrbitLayer && false"
        class="elements-panel"
        :orbit-layer="objectOrbitLayer"
      />
      <orbital-elements-editor
        v-if="objectOrbitLayer && false"
        class="orbital-editor-panel"
        :orbit-layer="objectOrbitLayer"
      />
      <div id="time">
        {{ formattedTime }}
      </div>
      <div id="Sky-SolarSystem-Toggle">
        <v-btn
          id="switch-to-3d-button"
          :color="buttonColor"
          :style="{ 'pointer-events': 'auto' }"
          @click="switchTo3dView"
        >
          3D View
        </v-btn>
        <v-btn
          id="switch-to-2d-button"
          :color="buttonColor"
          :style="{ 'pointer-events': 'auto' }"
          @click="switchTo2dView"
        >
          2D View
        </v-btn>
      </div>
      <!-- log the active layers -->
      <!-- <v-btn
        id="log-layers-button"
        :color="buttonColor"
        :style="{ 'pointer-events': isLoading ? 'none' : 'auto' }"
        @click="logActiveLayers"
      >
        Log Active Layers
      </v-btn> -->
      <div id="bottom-content">
        <speed-control
          :max-speed="10_000_000_000"
          :store="store"
          @reset="() => { store.setClockSync(false); store.setTime(initTime); }"
        />
      </div>
    </div>
  </v-app>
</template>

<script setup lang="ts">
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { 
  ref, 
  reactive, 
  computed, 
  onMounted, 
  onBeforeUpdate,
  nextTick, 
  toValue, 
  toRef, 
  toRefs,
  watch, 
  type Ref,
  render,
} from "vue";
import { 
  LayerManager, 
  Color, 
  Layer ,
  ELL,
  OrbitLayer,
  Place,
  Planets,
  SpaceTimeController,
  WWTControl,
  Matrix3d,
  Vector3d,
  Orbit,
} from "@wwtelescope/engine";
import { 
  GotoRADecZoomParams, 
  engineStore, 
  type WWTEnginePiniaState,
} from "@wwtelescope/engine-pinia";
import { WWTGlobalState } from "@wwtelescope/engine-pinia/src/store";
import { 
  BackgroundImageset, 
  skyBackgroundImagesets, 
  supportsTouchscreen, 
  blurActiveElement, 
  useWWTKeyboardControls,
  PlaybackControl,
} from "@cosmicds/vue-toolkit";
import { 
  useDisplay,
} from "vuetify";

// local components
import LoadingModal from "./components/LoadingModal.vue";
import LayerManagerPanel from "./components/LayerManagerPanel.vue";
import OrbitComparison from "./components/OrbitComparison.vue";
import OrbitalElementsEditor from "./components/OrbitalElementsEditor.vue";
import {
  attachToWindow,
} from "./utils";

import { asteroidDefinitions, asteroidDefinition2EOE } from "./asteroid_elements";
import { addObject, addObjectAsChild  } from "./createAsteroid";
// Keeping these imports for potential future use but not calling them now
import { comparePositions, logPatchedOrientationMatrix, calculatePerihelionLon, computePerihelionDirection } from "./orbitComparison";

import { activeLayersList, addDebugLines } from "./wwt-hacks";

import { show3dPoint } from "./spreadsheetLayer";


import { addToWWTRenderLoop } from "./wwt-hacks";

type CameraParams = Omit<GotoRADecZoomParams, "instant">;
export interface WwtPlaygroundProps {
  wwtNamespace?: string;
}
const store = engineStore();

useWWTKeyboardControls(store);

const props = withDefaults(defineProps<WwtPlaygroundProps>(), {
  wwtNamespace: "wwt-playground",
});

import { LayerMap } from "@wwtelescope/engine";

const backgroundImagesets = reactive<BackgroundImageset[]>([]);


const buttonColor = ref("#ffffff");
const objectOrbitLayer = ref<OrbitLayer | null>(null);

import { show3dPerihelion } from "./spreadsheetLayer";
import { Classification, SolarSystemObjects } from "@wwtelescope/engine-types";





function _doWWTModifications() {
  // WWTControl.singleton.renderOneFrame();
}

function switchTo3dView() {
  store.setBackgroundImageByName("Solar System");
}

function switchTo2dView() {
  store.setBackgroundImageByName("Digitized Sky Survey");
}



async function addAsteroidLayerFromMpc() {
  const asteroidName = "franksienkiewicz";
  

  const allMaps = LayerManager.get_allMaps();
  console.log('All maps:', allMaps);
  const parent = allMaps['Sun'] as LayerMap;


  LayerManager._getMpcAsTLE(asteroidName, parent);
  // LayerManager._getMpc(asteroidName, parent);
  
  // show3dPerihelion(asteroidDefinitions[7085]!, "#00aaff");
}

const initTime = ref(new Date());

function getPlaceForPlanet(planet: keyof typeof SolarSystemObjects): Place {
  const place = new Place();
  place.set_names([planet]);
  place.set_target(SolarSystemObjects[planet as keyof typeof SolarSystemObjects]);
  place.set_classification(Classification.solarSystem);
  return place;
}


onMounted(() => {
  store.waitForReady().then(async () => {
    skyBackgroundImagesets.forEach(iset => backgroundImagesets.push(iset));
    store.setBackgroundImageByName("Solar System");
    store.applySetting(["solarSystemOrbits", true]);
    store.applySetting(["solarSystemMinorOrbits", false]);
    store.applySetting(["solarSystemMinorPlanets", false]);
    // store.gotoTarget({
    //   place: getPlaceForPlanet("earth"),
    //   noZoom: true,
    //   trackObject: true,
    //   instant: true,
    // });
    
    _doWWTModifications();
    
    const epoch = 2461000.0; //2461042.573; // Earth's perihelion JD
    const date = SpaceTimeController.julianToUtc(epoch);
    initTime.value = date;
    store.setTime(date);
    store.setClockSync(false);

    addAsteroidLayerFromMpc();
    

    attachToWindow(LayerManager, 'LayerManager');
    attachToWindow(computePerihelionDirection, 'computePerihelionDirection');
    attachToWindow(store.$wwt, 'WWTInstance');
    attachToWindow(() => LayerManager.get_allMaps()['Sun']!.layers, 'listLayers');

    // store.setClockRate(50_000_000)
    store.gotoRADecZoom({
      raRad: 0,
      decRad: 90,
      zoomDeg: 120,
      rollRad: 0,
      instant: true
    });
    
  }).then(() => {
    console.log('WWT Playground is ready.');
    console.log('Adding asteroid layers');
    // addObjectAsChild('Jupiter', 'Sun', '#ff8800');
    // addObject('Jupiter', '#ff88aa');
    // addObject('TestAsteroid', '#00ffff');
    // addObject('TestAsteroid2', '#aaffaa');
    // addObjectAsChild('TestAsteroid', 'Sun', '#00ffff');
    // addObject('X', '#ff0000');
    // addObjectAsChild('TestAsteroidX', 'Sun', '#ff0000');
    // addObject('Y', '#00ff00');
    // addObjectAsChild('TestAsteroidY', 'Sun', '#00ff00');
    // addObject('Z', '#0000ff');
    // addObjectAsChild('TestAsteroidZ', 'Sun', '#0000ff');
    // show3dPoint( 5.00, -1.39, 0, {'inputConvention': 'horizons', colorHex: '#ffffffaa'});
    // show3dPoint( 0, 1, 0, {'inputConvention': 'horizons', colorHex: '#ff00ffaa'});
    // show3dPoint(-1,-1, 0, {'inputConvention': 'horizons', colorHex: '#ffff00ff'});
    // show3dPoint( 1,-1, 0, {'inputConvention': 'horizons', colorHex: '#ed971f'});
    // show3dPoint(-1, 1, 0, {'inputConvention': 'horizons', colorHex: '#0000ffff'});
    show3dPoint(0, 0, 1, {'inputConvention': 'horizons', colorHex: '#0000ffff'});
    show3dPoint(1, 0, 0, {'inputConvention': 'horizons', colorHex: '#ff0000ff'});
    show3dPoint(0, 1, 0, {'inputConvention': 'horizons', colorHex: '#00ff00ff'});
    
    // addObjectAsChild('TestAsteroid', 'Sun', '#56e0f0');
    // addAsteroidLayerFromMpc();
    
    // const elements = asteroidDefinition2EOE(asteroidDefinitions['Jupiter']!);
    // const  xyz = Orbit._orbitalToWwt.transform(ELL.calculateRectangularJD(2461000.0, elements) as Vector3d);
    // console.log('Jupiter position at JD 2461000.0:', xyz);
    // console.log('Showing Jupiter position as 3D point', Planets.getPlanetPositionDirect(SolarSystemObjects.jupiter, 2461000.0));
    // show3dPoint(xyz.x, xyz.y, xyz.z, {'inputConvention': 'horizons', colorHex: '#ff88aa'});
    
    addDebugLines();
  });
});

const { activeLayers } = toRefs(store);



watch(activeLayers, (newLayers) => {
  console.log('Active layers changed:', newLayers);
}, { immediate: true, deep: true });



const formattedTime = computed(() => 
  store.currentTime.toLocaleString(undefined, {
    month: 'short',
    weekday: 'short',
    year: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    minute: '2-digit',
    hour12: false,
    second: '2-digit',
    timeZoneName: 'short'
  })
);





</script>

<style lang="less">
@font-face {
  font-family: "Highway Gothic Narrow";
  src: url("./assets/HighwayGothicNarrow.ttf");
}

:root {
  --default-font-size: clamp(0.7rem, min(1.7vh, 1.7vw), 1.1rem);
  --default-line-height: clamp(1rem, min(2.2vh, 2.2vw), 1.6rem);
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
  font-size: 11pt;

  .wwtelescope-component {
    position: absolute;
    top: 0;
    width: 100%;
    height: 100%;
    border-style: none;
    border-width: 0;
    margin: 0;
    padding: 0;
    filter: brightness(1.25) contrast(1.1);
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


// From Sara Soueidan (https://www.sarasoueidan.com/blog/focus-indicators/) & Erik Kroes (https://www.erikkroes.nl/blog/the-universal-focus-state/)
:focus-visible,
button:focus-visible,
.focus-visible,
.v-selection-control--focus-visible .v-selection-control__input {
  outline: 9px double white !important;
  box-shadow: 0 0 0 6px black !important;
  border-radius: .125rem;
}

#time { 
  position: absolute; 
  top: 1rem; 
  left: 1rem; 
  color: white; 
  font-family: 'Highway Gothic Narrow', sans-serif; 
  font-size: 36px; 
  text-shadow: 2px 2px 4px #000000;
}

.elements-panel {
  position: absolute;
  bottom: 1rem;
  left: 1rem;
  max-height: 75vh;
  overflow-y: auto;
  pointer-events: auto;
  width: min(90vw, 960px);
}

.orbital-editor-panel {
  position: absolute;
  top: 5rem;
  right: 1rem;
  max-height: calc(100vh - 6rem);
  overflow-y: auto;
  pointer-events: auto;
  width: min(400px, 90vw);
}
</style>
