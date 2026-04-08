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
              class="artemis-btn"
              @click="copyViewUrl"
              @keyup.enter="copyViewUrl"
            >
              Copy view URL
            </button>
            <button
              class="artemis-btn"
              @click="trackingCenter = SolarSystemObjects.moon"
              @keyup.enter="trackingCenter = SolarSystemObjects.moon"
            >
              Track Moon
            </button>
            <button
              class="artemis-btn"
              @click="trackingCenter = SolarSystemObjects.earth"
              @keyup.enter="trackingCenter = SolarSystemObjects.earth"
            >
              Track Earh
            </button>
          </div>
        </div>


        <!-- This block contains the elements (e.g. the project icons) displayed along the bottom of the screen -->

        <div id="bottom-content">
          <ArtemisTimeControl :can-create="positionSet" />
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
import { AstroCalc, Color, SpreadSheetLayer } from "@wwtelescope/engine";
import { CoordinatesType, MarkerScales, ReferenceFrames, SolarSystemObjects } from "@wwtelescope/engine-types";
import ArtemisTimeControl from "./components/ArtemisTimeControl.vue";

import { useCameraUrl } from "./composables/useCameraUrl";
import { moveViewCamera, layerManagerDraw, getDepth, getCoordinatesForScreenPoint,getScreenPointForCoordinates, transformPickPointToWorldSpace, transformWorldPointToPickSpace, renderOneFrame, makeFrustum, type CameraView } from "./wwt-hacks";
import { LayerManager, WWTControl } from "@wwtelescope/engine";

const ZOOM_MIN   = 0.00006;
const ZOOM_MAX   = 240;
const LOG_MIN    = Math.log(ZOOM_MIN);
const LOG_MAX    = Math.log(ZOOM_MAX);
// Power < 1 stretches the small-fov (zoomed-in) end of the slider.
const ZOOM_POWER = 3.5;

// Map linear slider position [0,1] → stretched slider position [0,1].
const stretchSlider   = (t: number) => Math.pow(t, ZOOM_POWER);
// Inverse: stretched slider position → linear slider position.
const unstretchSlider = (t: number) => Math.pow(t, 1 / ZOOM_POWER);

function fovToSlider(fov: number): number {
  const linear = (Math.log(fov) - LOG_MIN) / (LOG_MAX - LOG_MIN);
  return unstretchSlider(linear);
}
function sliderToFov(t: number): number {
  return Math.exp(LOG_MIN + stretchSlider(t) * (LOG_MAX - LOG_MIN));
}
// watchWwtContainerSize('.wwtelescope-component', '#main-content');

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
    const galacticCenter = AstroCalc.galacticToJ2000(0, 0);
    return {
      raRad: galacticCenter.RA * H2R ,
      decRad: galacticCenter.dec * D2R,
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
const INITIAL_VIEW: CameraView = {
  lng: 169.906038,
  lat: 1.323000,
  zoomDeg: 0.000163,
  rotationDeg: 0,
  angleDeg: 0,
  opacity: 100,
};

const zoomSliderValue = computed(() => fovToSlider(store.zoomDeg));

function onZoomSlider(e: Event) {
  const fov = sliderToFov(+(e.target as HTMLInputElement).value);
  const rc = WWTControl.singleton.renderContext;
  rc.targetCamera.zoom = fov;
  rc.viewCamera.zoom   = fov;
  WWTControl.singleton.renderOneFrame();
}

function goHome() {
  moveViewCamera(INITIAL_VIEW, false);
}

function doWWTHacks() {
  WWTControl.singleton.getScreenPointForCoordinates = getScreenPointForCoordinates.bind(WWTControl.singleton);
  WWTControl.singleton.getCoordinatesForScreenPoint = getCoordinatesForScreenPoint.bind(WWTControl.singleton);
  // @ts-expect-error this does exist
  WWTControl.singleton.transformWorldPointToPickSpace = transformWorldPointToPickSpace.bind(WWTControl.singleton);
  // @ts-expect-error this does exist
  WWTControl.singleton.transformPickPointToWorldSpace = transformPickPointToWorldSpace.bind(WWTControl.singleton);
  WWTControl.singleton.renderOneFrame = renderOneFrame.bind(WWTControl.singleton);
  // @ts-expect-error this does exist
  WWTControl.singleton.getDepth = getDepth.bind(WWTControl.singleton);
  // @ts-expect-error this does exist
  WWTControl.singleton.renderContext.makeFrustum = makeFrustum.bind(WWTControl.singleton.renderContext);
  // @ts-expect-error this does exist
  LayerManager._draw = layerManagerDraw;
}

import { AltUnits } from "@wwtelescope/engine-types";
// eslint-disable-next-line @typescript-eslint/no-empty-function
let copyViewUrl: () => Promise<void> = async () => {};
import { loadHorizonsVectorsForWwt } from "./horizons";
const layers = ref<SpreadSheetLayer[]>([]);

const trackingCenter = ref<SolarSystemObjects>(SolarSystemObjects.moon);

async function createArtemisLayers(trackedObject: SolarSystemObjects) {
  
  const vec = await loadHorizonsVectorsForWwt('./horizons_results-earth.txt', SolarSystemObjects.earth, trackedObject);
  const items = vec.split("\r\n");
  const header = items.shift();
  let bounds: [number, number][] = [];
  // eslint-disable-next-line @typescript-eslint/naming-convention
  const N = 10;
  const centerStart = 1300;
  const centerEnd = 1500;
  const end = 2600;
  for (let i = centerStart; i < centerEnd; i += N) {
    bounds.push([i, i + N]);
  }
  bounds = [[0, centerStart], ...bounds, [centerEnd, end]];
  bounds.forEach((bds) => {
    const data = items.slice(...bds).join("\r\n");
    store.createTableLayer({
      name: 'Artemis',
      referenceFrame: 'Sky',
      dataCsv: `${header}\r\n${data}`,
    }).then(layer => {
      layer.set_xAxisColumn(2);
      layer.set_yAxisColumn(3);
      layer.set_zAxisColumn(4);
      layer.set_coordinatesType(CoordinatesType.rectangular);
      layer.set_astronomical(true);
      layer.set_cartesianScale(AltUnits.astronomicalUnits);
      layer.set_altUnit(AltUnits.astronomicalUnits);
      layer.set_markerScale(MarkerScales.screen);
      layer.set_scaleFactor(10);
      layer.set_color(Color.fromHex("#ffffff"));
      layer.set_showFarSide(true);
      layer.set_opacity(25);
    });
  

    
    store.createTableLayer({
      name: 'Artemis Time',
      referenceFrame: 'Sky',
      dataCsv: `${header}\r\n${data}`,
    }).then(layer => {
      layer.set_xAxisColumn(2);
      layer.set_yAxisColumn(3);
      layer.set_zAxisColumn(4);
      layer.set_coordinatesType(CoordinatesType.rectangular);
      layer.set_astronomical(true);
      layer.set_cartesianScale(AltUnits.astronomicalUnits);
      layer.set_altUnit(AltUnits.astronomicalUnits);
      layer.set_markerScale(MarkerScales.screen);
      layer.set_scaleFactor(20);
      layer.set_color(Color.fromHex("#ff0000"));
      layer.set_showFarSide(true);
      layer.set_opacity(100);
      layer.set_startDateColumn(1);
      layer.set_endDateColumn(5);
      layer.set_decay(5 / (60 * 24));
      layer.set_timeSeries(true);

    });
  });
  
  const showMoonRefLayer = false;
  if (showMoonRefLayer) {
    const vecMoon = await loadHorizonsVectorsForWwt('./horizons_results-moon.txt', SolarSystemObjects.moon, trackedObject);
    store.createTableLayer({
      name: 'Artemis Moon',
      referenceFrame: 'Sky',
      dataCsv: vecMoon,
    }).then(layer => {
      layer.set_xAxisColumn(2);
      layer.set_yAxisColumn(3);
      layer.set_zAxisColumn(4);
      layer.set_coordinatesType(CoordinatesType.rectangular);
      layer.set_astronomical(true);
      layer.set_cartesianScale(AltUnits.astronomicalUnits);
      layer.set_altUnit(AltUnits.astronomicalUnits);
      layer.set_markerScale(MarkerScales.screen);
      layer.set_scaleFactor(5);
      layer.set_color(Color.fromHex("#00ffff"));
      layer.set_showFarSide(true);
      layer.set_opacity(25);
      layers.value.push(layer);
    });
  
  }
  
}

function removeArtemisLayers() {
  layers.value.forEach(layer => store.deleteLayer(layer.id.toString()));
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
    WWTControl.singleton.shallowLayerTest = function(layer) {
      const table = layer.get__table();
      const rows = table.rows;
      const count = rows.length;
      const center = Math.floor(count / 2);
      const centerRow = rows[center];
      const x = Number(centerRow[layer.get_xAxisColumn()]);
      const y = Number(centerRow[layer.get_yAxisColumn()]);
      const z = Number(centerRow[layer.get_zAxisColumn()]);
      // @ts-expect-error this does exist
      const depth = WWTControl.singleton.getDepth(x, y, z);
      // @ts-expect-error this does exist
      const moonDepth = WWTControl.singleton.getDepth(0, 0, 0);
      return depth <= moonDepth;
    }.bind(this);


    store.setTrackedObject(trackingCenter.value);
    createArtemisLayers(trackingCenter.value);
    

    ({ copyViewUrl } = useCameraUrl(INITIAL_VIEW));
    positionSet.value = true;
    layersLoaded.value = true;
  });
});

watch(trackingCenter, (trackedObject) => {
  removeArtemisLayers();
  store.setTrackedObject(trackedObject);
  createArtemisLayers(trackedObject);
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
    font-size: 0.9rem;
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
    font-size: 0.8rem;
    padding: 4px 10px;
    cursor: pointer;
    &:hover { background: rgba(255, 255, 255, 0.25); }
  }
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

// From Sara Soueidan (https://www.sarasoueidan.com/blog/focus-indicators/) & Erik Kroes (https://www.erikkroes.nl/blog/the-universal-focus-state/)
:focus-visible, .focus-visible, .v-selection-control--focus-visible .v-selection-control__input {
  /* Keep this override outside Vuetify's layers so it wins without !important. */
  outline: 6px double white;
  box-shadow: 0 0 0 3px black;
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

</style>
