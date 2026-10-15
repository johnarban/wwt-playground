<template>
  <v-app
    id="app"
    :style="cssVars"
    :class="[smallSize ? 'app-is-small' : '', sidePanel ? 'app-side-panel' : '']"
  >
    <div id="main-content">
      <WorldWideTelescope :wwt-namespace="wwtNamespace"></WorldWideTelescope>
      <wwt-loader v-model="isLoading" />

      <!-- This contains the splash screen content -->
      <SplashScreen
        v-model="showSplashScreen"
        :color="accentColor"
        :highlight-color="accentColor2"
        fullscreen-on-small
        :disabled="!ready"
      >
        <div class="splash-content">
          <p>Welcome to the</p>
          <p class="highlight">WWT Playground</p>
        </div>
      </SplashScreen>

      <!-- This block contains the elements (e.g. icon buttons displayed at/near the top of the screen -->
      <!-- Overlay: everything that sits on top of the WWT canvas. -->
      <div
        v-show="!showSplashScreen"
        id="wwt-overlay"
      >
        <div id="top-content">
          <div id="left-buttons">
            <icon-button
              icon="book-open"
              :color="buttonColor"
              aria-label="toggle info sheet"
              tooltip-location="start"
              title="toggle info sheet"
              @activate="() => (showInfoSheet = !showInfoSheet)"
            >
            </icon-button>
          </div>
          <div id="center-buttons">
            <v-select
              v-model="backgroundImageset"
              :items="backgroundImagesets.map((iset) => ({ title: iset.displayName, value: iset }))"
              label="Background"
              density="compact"
              hide-details
              class="background-select"
            />
          </div>
          <div id="right-buttons">
            <brightness-contrast
              element=".wwtelescope-component > canvas"
              :initial-brightness="2.5"
              :initial-contrast="1"
            />
          </div>
        </div>

        <!-- Bottom row: project / funder logos. -->
        <div id="bottom-content">
          <div
            id="body-logos"
            :class="{ 'small-logos': smallSize }"
          >
            <CreditLogos
              :default-logos="['cosmicds', 'wwt']"
              :logo-size="smallSize ? '1em' : '2.5em'"
              :extra-logos="[
                {
                  alt: 'Windowpane Production.',
                  href: 'https://johnarban.github.io',
                  src: 'windowpane.png',
                } as never,
              ]"
            />
          </div>
        </div>
      </div>

      <!-- labels for the brightest HYG stars. tracked elements are placed in canvas pixels, so they live in #main-content -->
      <WWTTrackedContent
        v-for="star in labelStars"
        :key="star.proper"
        :ra="star.ra * 15"
        :dec="star.dec"
        :label="star.proper"
        :visible="!showSplashScreen && showLabels && showStars && star.mag <= magLimit"
        center-on-click
      >
        <template #default="{ on, label }">
          <button
            type="button"
            class="hyg-star-label"
            @click="on.click"
            @dblclick="on.dblclick"
          >
            {{ label }}
          </button>
        </template>
      </WWTTrackedContent>
    </div>
    <!-- Degrade gracefully if WebGL2 is unavailable. -->
    <WebGlTest @webgl2-disabled="webglDisabled = true" />

    <!--
    This contains the informational content that is displayed when the book icon is clicked.
    It's an in-flow flex sibling of #main-content, so opening it shrinks the WWT view
    (from the side normally, from the bottom on small screens) instead of covering it.
  -->
    <!-- #drawer is providing the positioning in the flex-layout -->
    <div
      v-show="!showSplashScreen"
      id="drawer"
      :class="[sidePanel ? 'info-side' : 'info-bottom', showInfoSheet ? 'drawer-open' : 'drawer-closed']"
    >
      <tabbed-sheet
        v-show="showInfoSheet"
        id="side-panel-sheet"
        v-focus-toggle="showInfoSheet"
        align-tabs="start"
        @close="showInfoSheet = false"
      >
        <tab-page title="Information">
          <p>The WWT Playground — a clean, reusable starting point for WorldWideTelescope based projects.</p>
          <p>This is built with Vue 3, Vuetify 3 on Vite 7 with TS 6. Hass LESS for styling</p>
        </tab-page>

        <tab-page title="HYG Stars">
          <p>
            The {{ stars.length }} named stars of the HYG catalog as a WWT table layer, drawn as filled circles colored
            by their B-V color index and sized from their apparent magnitude with WWT's own stellar-magnitude scaling.
          </p>
          <v-switch
            v-model="showStars"
            label="Show stars"
            color="primary"
            hide-details
          />
          <v-switch
            v-model="showLabels"
            label="Label the brightest stars"
            color="primary"
            hide-details
          />
          <v-switch
            v-model="colorByBV"
            label="Color by B-V"
            color="primary"
            hide-details
          />
          <v-switch
            v-model="sizeByMag"
            label="Size by magnitude"
            color="primary"
            hide-details
          />
          <v-slider
            v-model="magLimit"
            :label="`Faintest magnitude: ${magLimit.toFixed(1)} (${shownCount} stars)`"
            :min="-1.5"
            :max="15"
            :step="0.1"
            hide-details
            class="mt-4"
          />
          <v-slider
            v-model="starSize"
            label="Star size"
            :min="0.02"
            :max="0.5"
            :step="0.01"
            hide-details
          />
          <v-slider
            v-model="opacity"
            label="Opacity"
            :min="0"
            :max="1"
            :step="0.05"
            hide-details
          />
        </tab-page>

        <tab-page
          title="User Guide"
          value="user-guide"
        >
          <user-guide />
        </tab-page>
      </tabbed-sheet>
    </div>
  </v-app>
</template>

<script setup lang="ts">
/* eslint-disable @typescript-eslint/no-unused-vars */
import { ref, reactive, computed, onMounted, nextTick, watch, type Ref } from "vue";
import { useDisplay } from "vuetify";

/* WWT imports */
import { GotoRADecZoomParams, engineStore } from "@wwtelescope/engine-pinia";
import {
  BackgroundImageset,
  skyBackgroundImagesets,
  supportsTouchscreen,
  blurActiveElement,
  useWWTKeyboardControls,
  useFullscreen,
  WWTEngineStore,
  CreditLogos,
  IconButton,
} from "@cosmicds/vue-toolkit";
import { D2R, R2D, H2D, R2H, H2R, D2H } from "@wwtelescope/astro";
import { AstroCalc, WWTControl, SpaceTimeController, Settings } from "@wwtelescope/engine";
import { SolarSystemObjects, PointScaleTypes } from "@wwtelescope/engine-types";

/* local components and composables */
import WebGlTest from "./components/WebGlTest.vue";
import SplashScreen from "./components/SplashScreen.vue";
import TabbedSheet from "./components/TabbedSheet.vue";
import TabPage from "./components/TabPage.vue";
import UserGuide from "./components/UserGuide.vue";
import WWTTrackedContent from "./components/WWTTrackedContent.vue";
import { useTrackedElements } from "./composables/useTrackedElements";
import { useSpreadsheetLayer } from "./composables/useSpreadsheetLayer";
import { getStarColor } from "./astronomy/star_colors";
import { watchWwtContainerSize } from "./utils/wwtContainerSize.ts";
import hygProperStars from "./assets/hyg_proper_stars.json";
// watchWwtContainerSize('.wwtelescope-component', '#main-content');

type CameraParams = Omit<GotoRADecZoomParams, "instant">;
export interface WwtPlaygroundProps {
  wwtNamespace?: string;
  initialCameraParams?: CameraParams;
}

const { smAndDown } = useDisplay();

const props = withDefaults(defineProps<WwtPlaygroundProps>(), {
  wwtNamespace: "wwt-playground",
  initialCameraParams: () => {
    const galacticCenter = AstroCalc.galacticToJ2000(0, 0);
    return {
      raRad: galacticCenter.RA * H2R,
      decRad: galacticCenter.dec * D2R,
      zoomDeg: 360,
    };
  },
});

const store = engineStore();
useWWTKeyboardControls(store);

/* URL params: ?kiosk=true hides outbound links; ?splash=false skips the splash. */
const searchParams = new URLSearchParams(window.location.search);
const kiosk = searchParams.get("kiosk")?.toLowerCase() === "true";
if (kiosk) {
  document.body.classList.add("kiosk");
}
const fullscreen = useFullscreen();

/* Device / screen characteristics */
const touchscreen = supportsTouchscreen();
const { width: viewportWidth, height: viewportHeight } = useDisplay();
const smallSize = computed(() => smAndDown.value);
const isVertical = computed(() => viewportHeight.value > viewportWidth.value);
const isLandscape = computed(() => viewportWidth.value > viewportHeight.value * 1.25);
// show side panel if clearly landscape, or a large screen must be just not portrait (it can be barely landscape).
// if we're even close to vertical on a small screen, push up instead of from the side.
const sidePanel = computed(() => isLandscape.value || (!smallSize.value && !isVertical.value));

const webglDisabled = ref(false);
const showSplashScreen = ref(true);
const backgroundImagesets = reactive<BackgroundImageset[]>([]);
const showInfoSheet = ref(false);
const layersLoaded = ref(false);
const positionSet = ref(false);
const accentColor = ref("#306C9F");
const accentColor2 = ref("#FC9954");
const buttonColor = ref("#ffffff");

/* HYG stars */
// RA in hours, dist in parsecs, ci is B-V
interface HygStar {
  proper: string;
  ra: number;
  dec: number;
  dist: number;
  mag: number;
  ci: number;
}

// row 0 is Sol, which would be plotted at RA 0 / Dec 0
const stars: HygStar[] = hygProperStars
  .filter((s) => s.proper !== "Sol")
  .map(({ proper, ra, dec, dist, mag, ci }) => ({ proper, ra, dec, dist, mag, ci }));
const labelStars = [...stars].sort((a, b) => a.mag - b.mag).slice(0, 12);

const showStars = ref(true);
const showLabels = ref(true);
const colorByBV = ref(true);
const sizeByMag = ref(true);
const magLimit = ref(6.5);
const starSize = ref(0.15);
const opacity = ref(1);

const shownCount = computed(() => stars.filter((s) => s.mag <= magLimit.value).length);

// stellarMagnitude sizes are 40 / 1.6^mag; constant is 1, so scale that up to about a 3rd magnitude star
const CONSTANT_SIZE_BOOST = 10;
const markerSize = computed(() => starSize.value * (sizeByMag.value ? 1 : CONSTANT_SIZE_BOOST));

const hygTable = useSpreadsheetLayer(
  stars.map((s) => ({ ...s, color: getStarColor(s.ci) })),
  {
    name: "HYG Stars",
    color: "#ffffff",
    markerType: "filledCircle",
    markerSize: markerSize.value,
    distanceColumn: "dist",
    colorColumn: colorByBV.value ? "color" : null,
    sizeColumn: "mag",
    sizeScale: sizeByMag.value ? PointScaleTypes.stellarMagnitude : PointScaleTypes.constant,
    opacity: opacity.value,
  },
);
hygTable.setFilter((row, header) => Number(row[header.indexOf("mag")]) <= magLimit.value);

watch(magLimit, hygTable.applyFilter);
watch(showStars, hygTable.setVisible);
watch(colorByBV, (on) => hygTable.setColorColumn(on ? "color" : null));
watch(sizeByMag, (on) =>
  hygTable.layer.value?.set_pointScaleType(on ? PointScaleTypes.stellarMagnitude : PointScaleTypes.constant),
);
watch(markerSize, hygTable.setMarkerSize);
watch(opacity, hygTable.setOpacity);

// the shared tracked-elements instance lives as long as the app, not the first label
useTrackedElements(store);

const backgroundImageset = computed({
  // the items' values are the imagesets, so return the matching one rather than its name
  get() {
    const name = store.backgroundImageset?.get_name();
    return backgroundImagesets.find((iset) => iset.imagesetName === name);
  },
  set(value: BackgroundImageset) {
    store.setBackgroundImageByName(value.imagesetName);
  },
});

onMounted(() => {
  // Boilerplate to disable WWT and let the WebGlTest warning show if WebGL2 is not supported.
  if (webglDisabled.value) {
    showSplashScreen.value = false;
    // @ts-expect-error `canvas` is defined
    WWTControl.singleton.canvas.setAttribute("hidden", "true");
    WWTControl.singleton.renderOneFrame = function () {};
    return;
  }

  store.waitForReady().then(async () => {
    skyBackgroundImagesets.forEach((iset) => backgroundImagesets.push(iset));
    // store.setBackgroundImageByName("SDSS");
    store
      .gotoRADecZoom({
        ...props.initialCameraParams,
        instant: true,
      })
      .then(() => (positionSet.value = true));
    // If there are layers to set up, do that here!
    await hygTable.createLayer();
    hygTable.applyFilter();
    hygTable.setVisible(showStars.value);
    layersLoaded.value = true;
  });
});

const ready = computed(() => layersLoaded.value && positionSet.value);

/* `isLoading` is a bit redundant here, but it could potentially have independent logic */
const isLoading = computed(() => !ready.value);

/* This lets us inject component data into element CSS */
const cssVars = computed(() => {
  return {
    "--accent-color": accentColor.value,
    "--accent-color-2": accentColor2.value,
  };
});
</script>

<style lang="less">
// #app is a column flex container with two children:
// #main-content and #drawer.
// #main-content contains the WWT display and the overlay content.

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
}

#app {
  width: 100%;
  height: 100%;
  margin: 0;
  overflow: hidden;
  overscroll-behavior: none;
}

#main-content {
  // containing block for the absolutely positioned WWT host and overlay
  position: relative;
  display: block;
  // shrinkable with no min-size floor, so an open drawer takes its share of the space
  flex: 1 1 auto;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
}

/* The WWT host is out of flow so its measured size does not affect #main-content. */
// by using inset: 0, .wwttelescope-component fills #main-content and automatically resizes with it,
// without needing a height width set. this allows main-content to be more freely sizes.
/*
WWT can size itself from CSS alone here because #main-content has a real layout size (from the flex layout in .v-application__wrap)
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

.wwtelescope-component > canvas {
  display: block;
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
  padding-inline: 1rem;
  padding-top: 1rem;
  padding-bottom: 0.5rem;
  pointer-events: none;

  display: flex;
  flex-direction: column;
  justify-content: space-between; // pushes top and bottom content apart
}

#wwt-overlay > * {
  // give each overlay child its own stacking context, so they layer in DOM order
  isolation: isolate;
}

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
  align-items: flex-start;
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

// override the styles from the @cosmicds/vue-toolkit for the icon-button wrapper
.icon-wrapper {
  pointer-events: auto !important;
  background-color: transparent !important;
  -webkit-backdrop-filter: blur(6px);
  backdrop-filter: blur(6px);
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

  #body-logos.small-logos {
    margin-top: 0.5em;
  }
  // img[alt="Windowpane Production."] {
  //   background-color: rgba(255, 255, 255, 0.3);
  // }
}

#app.app-is-small #bottom-content {
  padding: 0;
}

/** ====== Define our standard Side/Bottom panel layout
The default DOM structure is basically
<div #app>
  <div .v-application__wrap>
    <div #main-content>
      <WorldWideTelescope />
      <div #wwt-overlay />
    </div>
    <div #drawer />
  </div>
</div>
======== */

// Default is the column/bottom-panel layout; a side panel opts in with .app-side-panel
#app > .v-application__wrap {
  // default, but specify anyway
  flex-direction: column;
  max-height: 100svh;
}

#app.app-side-panel > .v-application__wrap {
  flex-direction: row;
}

// side-panel layout: #drawer follows #main-content in the DOM,
// so flipping the order is what puts the panel on the left of the view
// order sets the order of the children of a flex container
#app.app-side-panel {
  #main-content {
    order: 1; // on the right
  }

  #drawer {
    order: 0; // on the left
  }
}

// in-flow flex sibling of #main-content, so opening it shrinks the WWT view
// instead of covering it. Default is the bottom panel: full width, growing in height.
#drawer {
  flex: 0 0 auto;
  overflow: hidden;
  width: 100%;
  height: 0;
  border-radius: 5px 5px 0 0;

  &.drawer-open {
    height: 34%;
  }
}

// side panel: full height, growing in width
.app-side-panel #drawer {
  width: 0;
  height: 100%;
  border-radius: 0 5px 5px 0;

  &.drawer-open {
    width: 34%;
  }
}

/** ===================== */

// Basic text styling for the TabbedSheet's content
// it is better to set in the main app than to set things in the component
// since the component may end up being imported from the toolkit.
.cds-info-sheet .tab-page {
  h3 {
    color: steelblue;
  }

  padding: 1rem;
  display: flex;
  flex-direction: column;
}

// From Sara Soueidan (https://www.sarasoueidan.com/blog/focus-indicators/) & Erik Kroes (https://www.erikkroes.nl/blog/the-universal-focus-state/)
:focus-visible,
.focus-visible,
.v-selection-control--focus-visible .v-selection-control__input {
  /* Keep this override outside Vuetify's layers so it wins without !important. */
  outline: 6px double white;
  box-shadow: 0 0 0 3px black;
  border-radius: 0.025rem;
}

// Add the `layout-debug` class to #app to outline the overlay regions.
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

.background-select {
  width: 200px;
  pointer-events: auto;
}

.hyg-star-label {
  transform: translate(8px, -50%);
  padding: 0 0.25em;
  color: white;
  font-size: 0.8rem;
  white-space: nowrap;
  text-shadow: 0 0 3px black;
}

#bottom-drawer {
  position: relative;
  // height: 200px;
  // flex: 0 0 200px;
  overflow: auto;
}
</style>
