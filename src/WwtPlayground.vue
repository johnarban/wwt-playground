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
          <WWTTimeControl />
          <v-btn
            density="compact"
            rounded="lg"
            @click="toggle3D"
            @keyup.enter="toggle3D"
          >
            Switch to {{ in3d ? '2D' : '3D' }}
          </v-btn>
          <AddShader
            :in3d="in3d"
            :location="location"
          />
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
              step="10"
              @input="onTimeChange"
            />
            <span id="time-label">{{ timeLabel }}</span>
          </div>
          <div
            v-if="!smallSize"
            id="body-logos"
          >
            <CreditLogos
              logo-size="20px"
              :default-logos="['cosmicds', 'wwt']"
              :extra-logos="[{
                alt: 'Windowpane Production.',
                href: 'https://johnarban.github.io',
                src:'windowpane.png'
              }
              ] as never[]"
            />
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
import { ref, reactive, computed, onMounted, nextTick, watch, type Ref } from "vue";
import { GotoRADecZoomParams, engineStore } from "@wwtelescope/engine-pinia";
import { BackgroundImageset, skyBackgroundImagesets, supportsTouchscreen, blurActiveElement, useWWTKeyboardControls, WWTEngineStore, CreditLogos, IconButton } from "@cosmicds/vue-toolkit";
import { useDisplay } from "vuetify";
import { D2R, R2D, H2D, R2H, H2R, D2H  } from "@wwtelescope/astro";
import { AstroCalc, WWTControl, SpaceTimeController, Settings, Coordinates } from "@wwtelescope/engine";
import { SolarSystemObjects } from "@wwtelescope/engine-types";

import { watchWwtContainerSize } from "./composables/wwtContainerSize";
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
import AddShader from "./components/AddShader.vue";
import WWTTimeControl from "./components/WWTTimeControl.vue";

interface LocationDeg {
  lat: number,
  lon: number
}
const defaultLocation: LocationDeg = { lat: 50,lon: -70};
const location = ref(defaultLocation);
const initialTime = new Date(Date.UTC(2026, 2, 20, 10, 46, 0)); // year is 0-indexed in JS Date, so this is March 20, 2026 at 6:52:00

const timeOfDay = ref(18 * 3600); // seconds from midnight, default 18:00
const timeLabel = computed(() => {
  const h = Math.floor(timeOfDay.value / 3600);
  const m = Math.floor((timeOfDay.value % 3600) / 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
});

// const galacticCenter = AstroCalc.galacticToJ2000(0, 0);
const center = Coordinates.horizonToEquitorial(
  Coordinates.fromLatLng(0,90), 
  Coordinates.fromLatLng(location.value.lat,location.value.lon), 
  initialTime
);
const initialCameraParams = {
  raRad: center.get_RA() * H2R, // convert hours to radian
  decRad: center.get_dec() * D2R, // convert degrees to radians
  rollRad: 0,
  zoomDeg: 360
};

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

function toggleSheet() {
  console.log("toggling sheet");
  if (sheet.value) {
    sheet.value = null;
  } else {
    sheet.value = "text";
  }
}

onMounted(() => {
  store.waitForReady().then(async () => {
    let logOnce = true;
    
    store.applySetting(['localHorizonMode', true]);
    setWWTLocation(location.value);
    store.applySetting(['showAltAzGrid', true]);
    store.applySetting(['showAltAzGridText', true]);
    store.setClockRate(1000);
    store.setClockSync(false);  // need this to prevent store.currentTime from being constantly set
    store.setTime(initialTime);
    skyBackgroundImagesets.forEach(iset => backgroundImagesets.push(iset));
    // store.applySetting(['showGrid', true]);
    // store.applySetting(['showEquatorialGridText', true]);
    renderOneFrame();
    const sunPos = AstroCalc.getPlanet(SpaceTimeController.utcToJulian(store.currentTime), SolarSystemObjects.sun, 0,0,0);
    store.gotoRADecZoom({
      ...initialCameraParams,
      // raRad: sunPos.RA * D2R,
      // decRad: sunPos.dec * D2R,
      // zoomDeg: props.initialCameraParams.zoomDeg,
      // rollRad: props.initialCameraParams.rollRad,
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
  opacity: 0.5;
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
  padding-inline: 1em;
  padding-block: 1em;
  pointer-events: none;
  
  display: flex;
  flex-direction: column;
  justify-content: space-between; // pushes top and bottom content apart
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
  align-items: flex-start;
  gap: 1rem;
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
}

#bottom-content {
  display: flex;
  flex-direction: column;
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
  img[alt="Windowpane Production."] {
    background-color: rgba(255, 255, 255, 0.3);
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
  #wwt-overlay {
    border: 3px solid aqua;
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
#bottom-drawer {
  position: relative;
  // height: 200px;
  // flex: 0 0 200px;
  overflow: auto;
}

</style>
