<template>
  <v-app
    id="app"
    :style="cssVars"
    class="layout-debug"
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
        </div>
        <div id="center-buttons">
        </div>
        <div id="right-buttons">
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
          />
        </div>
      </div>
    </div>
  </v-app>
</template>

<script setup lang="ts">
/* eslint-disable @typescript-eslint/no-unused-vars */
import { ref, reactive, computed, onMounted, nextTick } from "vue";
import { GotoRADecZoomParams, engineStore } from "@wwtelescope/engine-pinia";
import { BackgroundImageset, skyBackgroundImagesets, supportsTouchscreen, blurActiveElement, useWWTKeyboardControls, WWTEngineStore, CreditLogos, IconButton } from "@cosmicds/vue-toolkit";
import { useDisplay } from "vuetify";
import { Imageset, ImageSetLayer, Place, WWTControl } from "@wwtelescope/engine";

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

const WTML_URL = "./Pleiades260211030923.wtml";
// const WTML_URL = "./public/new-image-bad-wtml.wtml";

const imagesets = ref<Map<string, Imageset>>(new Map());
const imagesetLayers = ref<Map<string, Promise<ImageSetLayer>>>(new Map());
onMounted(() => {
  store.waitForReady().then(async () => {
    skyBackgroundImagesets.forEach(iset => backgroundImagesets.push(iset));
    store.gotoRADecZoom({
      ...props.initialCameraParams,
      instant: true
    }).then(() => positionSet.value = true);
    // If there are layers to set up, do that here!
    
    // ==== loading image collection
    const loadIset = true;
    if (loadIset) {
      await store.loadImageCollection({url: WTML_URL, loadChildFolders: true,}) 
        .then((folder) => {
          const children = folder.get_children();
          if (!children) return;
          children.forEach((child) => {
            if (!(child instanceof Place)) return;
            const iset = child.get_backgroundImageset() ?? child.get_studyImageset();
            if (iset) {
              imagesets.value.set(child.get_name(), iset);
            }
          });
          return imagesets.value;
        })
        .then(layers => {
          if (layers && layers.size > 0) {
            let i = 0;
            for (const [name, iset] of layers) {
              console.log(iset);
              const _layerPromise = store.addImageSetLayer({
                url: iset.get_url(),
                mode: 'fits',
                name: iset.get_name(),
                goto: false
              });
              store.gotoRADecZoom({
                raRad: iset.get_centerX() * Math.PI / 180,
                decRad: iset.get_centerY() * Math.PI / 180,
                zoomDeg: iset.get_baseTileDegrees() * Math.max(iset.get_offsetX(), iset.get_offsetY()) * 20,
                instant: true,
              });
              _layerPromise.then(l => {
                l.set_opacity(0.5);
                l.set_colorMapperName('viridis');
                l.setImageScalePhysical(0, 1220, 1255);
              });
              i++;
            }
          };
        })
        .catch(e => {
          console.error(e);
        });
      // ==== done loading image collection
    } else {
      await store.loadFitsLayer({
        url: './Pleiades260211030923-fixed.fits', // for some reason this does not work
        // url: './new-image.FITS',
        name: 'test-image',
        gotoTarget: false,
      }).then((layer) => {
        layer.set_colorMapperName('inferno');
        // @ts-expect-error it is a fits image
        const vmin = layer.getFitsImage().header['DATAMIN'];
        // @ts-expect-error it is a fits image
        const vmax = layer.getFitsImage().header['DATAMAX'];
        layer.setImageScalePhysical(1, 1220 , 1255);
        console.log(vmin,vmax);
        // console.log(layer.getFitsImage()?.computeHistogram(100));
        return layer.get_imageSet();
      }).then((iset) => {
        store.gotoRADecZoom({
          raRad: iset.get_centerX() * Math.PI / 180,
          decRad: iset.get_centerY() * Math.PI / 180,
          //@ts-expect-error _guessZoomSetting does exist
          zoomDeg: iset._guessZoomSetting() * 6 / 1.5,
          instant: true,
        });
      });
    }
    
    layersLoaded.value = true;
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

canvas {
  filter: brightness(2.5) contrast(0.9) saturate(1.2);
}

</style>
