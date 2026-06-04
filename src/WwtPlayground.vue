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
      <SplashScreen
        v-model="showSplashScreen"
        :accent-color="accentColor"
        :highlight-color="accentColor2"
        :loaded="!isLoading"
      />
    

      <!-- This block contains the elements (e.g. icon buttons displayed at/near the top of the screen -->
      <div id="wwt-overlay">
        <div id="top-content">
          <div id="left-buttons">
            <icon-button
              icon="book-open"
              :color="buttonColor"
              tooltip-location="start"
              @activate="toggleSheet"
            >
            </icon-button>
          </div>
          <div id="center-buttons">
          </div>
          <div id="right-buttons">
            <brightness-contrast
              element=".wwtelescope-component > canvas"
              :initial-brightness="2.5"
              :initial-contrast="1"
            />
          </div>
        </div>


        <!-- This block contains the elements (e.g. the project icons) displayed along the bottom of the screen -->

        <div id="bottom-content">
          <div
            v-if="!smallSize"
            id="body-logos"
          >
            <CreditLogos
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
    <!-- Degrade gracefully if WebGL2 is unavailable. -->
    <WebGlTest @webgl2-disabled="webglDisabled = true" />

    
    <!-- using vuetify3 we need to set the width to otherwise navigation-drawer defaults to 256px width !inline-style!
    can't use strings in component the vite-vuetify-plugin only auto-imports explicity <v-*> components
    @Carifio24 - implement an info-sheet overlay with nav drawer and bottom sheet  -->
    <component
      :is="(isLandscape || !smallSize) ? VNavigationDrawer : VBottomSheet "
      id="side-drawer"
      v-model="showInfoSheet"
      :class="[
        (isLandscape || !smallSize) ? 'info-side' : 'info-bottom',
        showInfoSheet ? 'side-drawer-open' : 'side-drawer-closed'
      ]"
      width=""
    >
      <InformationSheet
        v-model="showInfoSheet"
        :tab-color="accentColor"
        text-color="#e6e6e6"
      >
        <!-- default slot renders under the "Information" heading -->
        <div>
        <p>
            The WWT Playground — a clean, reusable starting point for WorldWideTelescope based projects.
        </p>
        <p>
            This is built with Vue 3, Vuetify 3 on Vite 7 with TS 6. Hass LESS for styling
        </p>
    </div>
      </InformationSheet>
    </component>
  </v-app>
</template>

<script setup lang="ts">
/* eslint-disable @typescript-eslint/no-unused-vars */
import { ref, reactive, computed, onMounted, nextTick, watch, type Ref } from "vue";
import { useDisplay } from "vuetify";
import { VNavigationDrawer, VBottomSheet } from "vuetify/components";

import { GotoRADecZoomParams, engineStore } from "@wwtelescope/engine-pinia";
import { BackgroundImageset, skyBackgroundImagesets, supportsTouchscreen, blurActiveElement, useWWTKeyboardControls, useFullscreen, WWTEngineStore, CreditLogos, IconButton } from "@cosmicds/vue-toolkit";
import { D2R, R2D, H2D, R2H, H2R, D2H  } from "@wwtelescope/astro";
import { AstroCalc, WWTControl, SpaceTimeController, Settings } from "@wwtelescope/engine";
import { SolarSystemObjects } from "@wwtelescope/engine-types";

/* local components and composables */
import WebGlTest from "./components/WebGlTest.vue";
import SplashScreen from "./components/SplashScreen.vue";
import InformationSheet from "./components/InformationSheet.vue";
import { watchWwtContainerSize } from "./utils/wwtContainerSize.ts";
// watchWwtContainerSize('.wwtelescope-component', '#main-content');

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
/* Device / screen characteristics */
const { width: viewportWidth, height: viewportHeight } = useDisplay();
const smallSize = computed(() => smAndDown.value);
const isVertical = computed(() => viewportHeight.value > viewportWidth.value);
const isLandscape = computed(() => viewportWidth.value > viewportHeight.value * 1.25);

const webglDisabled = ref(false);
const showSplashScreen = ref(true);
const backgroundImagesets = reactive<BackgroundImageset[]>([]);
const showInfoSheet = ref(false);
const layersLoaded = ref(false);
const positionSet = ref(false);
const accentColor = ref("#306C9F");
const accentColor2 = ref("#FC9954");
const buttonColor = ref("#ffffff");


onMounted(() => {
  // Boilerplate to disable WWT and let the WebGlTest warning show if WebGL2 is not supported.
  if (webglDisabled.value) {
    showSplashScreen.value = false;
    // @ts-expect-error `canvas` is defined
    WWTControl.singleton.canvas.setAttribute("hidden", "true");
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    WWTControl.singleton.renderOneFrame = function () {};
    return;
  }

  store.waitForReady().then(async () => {
    skyBackgroundImagesets.forEach(iset => backgroundImagesets.push(iset));
    store.gotoRADecZoom({
      ...props.initialCameraParams,
      instant: true
    }).then(() => positionSet.value = true);
    // If there are layers to set up, do that here!
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

#bottom-content {
  #body-logos {
    align-self: flex-end;
  }
  img[alt="Windowpane Production."] {
    background-color: rgba(255, 255, 255, 0.3);
  }
}
// yes, we do need the border radius defined twice. 
// because we do not use overflow hidden. 
// note - this setup will not work in vuetify 4
#side-drawer {
  --bottom-sheet-height: 34vh;
  --side-panel-width: 36vw;
  --side-panel-border-radius: 20px;
  width: var(--side-panel-width);
  border-top-right-radius: var(--side-panel-border-radius);
  border-bottom-right-radius: var(--side-panel-border-radius);

  // &.side-drawer-open {
  //   transform: translateX(0);
  // }
  
  > .v-navigation-drawer__content > .v-card {
    border-top-right-radius: var(--side-panel-border-radius);
    border-bottom-right-radius: var(--side-panel-border-radius);
  }
}


#side-drawer.info-bottom {
  width: auto; // reset the width
  // borders are already set from original #side-drawer declaration
  
  > .v-overlay__content {
    max-height: var(--bottom-sheet-height);
  }
  
  &.side-drawer-open > .v-overlay__content {
    height: var(--bottom-sheet-height); // remove to have it size with the content up to the max-height
    
    > .v-card {
      border-top-left-radius: var(--side-panel-border-radius);
      border-top-right-radius: var(--side-panel-border-radius);
    }
  }
}

// From Sara Soueidan (https://www.sarasoueidan.com/blog/focus-indicators/) & Erik Kroes (https://www.erikkroes.nl/blog/the-universal-focus-state/)
:focus-visible, .focus-visible, .v-selection-control--focus-visible .v-selection-control__input {
  /* Keep this override outside Vuetify's layers so it wins without !important. */
  outline: 6px double white;
  box-shadow: 0 0 0 3px black;
  border-radius: .025rem;
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

#bottom-drawer {
  position: relative;
  // height: 200px;
  // flex: 0 0 200px;
  overflow: auto;
}

</style>
