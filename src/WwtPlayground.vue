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
        </div>
        <div id="center-buttons">
        </div>
        <div id="right-buttons">
        </div>
      </div>


      <!-- This block contains the elements (e.g. the project icons) displayed along the bottom of the screen -->

      <div id="bottom-content">
        <input 
          v-model="crossFade" 
          :class="{'wwt-use-pointer': !imagesHidden, 'opacity-slider': true, 'cross-fade-slider': true}"
          type="range"
          :min="0" 
          :max="100" 
          :step="1"
        />
        <div class="foreground-background-opacity-control">
          <button 
            class="wwt-use-pointer wwt-playground-button toggle-images-button" 
            @click="toggleImages"
          >
            {{ imagesHidden ? 'Show' : 'Hide' }} Sphere-X layers
          </button>
          <label> Fade Sphere-X layers:
            <input
              v-model="sphereXFade" 
              :class="{'wwt-use-pointer': !imagesHidden, 'opacity-slider': true, 'sphere-x-fade-slider': true}"
              type="range"
              :min="0" 
              :max="1" 
              :step="0.01"
            />
          </label>
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
import { ref, reactive, computed, onMounted, nextTick, watch, type Ref } from "vue";
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

const starsImageName = ref('');
const linesImageName = ref('');
import { ImageSetLayer } from "@wwtelescope/engine";
const starsImageset = ref<ImageSetLayer | null>(null);
const linesImageset = ref<ImageSetLayer | null>(null);
const crossFade = ref(0);
const sphereXFade = ref(1.0);
const starOpacity = computed(() => sphereXFade.value * Math.max(.5, crossFade.value / 100));
const linesOpacity = computed(() => sphereXFade.value * Math.max(.5, 1 - crossFade.value / 100));
function setLayerOrder() {
  if (starsImageset.value && linesImageset.value) {
    store.setImageSetLayerOrder({
      id: starsImageset.value.id.toString(),
      order: crossFade.value > 50 ? 0 : 1
    });
    
    store.setImageSetLayerOrder({
      id: linesImageset.value.id.toString(),
      order: crossFade.value <= 50 ? 1 : 0
    });
  }
}
watch([starOpacity,  linesOpacity, crossFade], (op, old) => {
  starsImageset.value?.set_opacity(starOpacity.value);
  linesImageset.value?.set_opacity(linesOpacity.value);
  if ((old[2] < 50 && op[2] >= 50) || (old[2] > 50 && op[2] <= 50) ) {
    setLayerOrder();
  }
});
const imagesHidden = ref(false);
function toggleImages() {
  starsImageset.value?.set_opacity(imagesHidden.value ? starOpacity.value : 0);
  linesImageset.value?.set_opacity(imagesHidden.value ? linesOpacity.value : 0);
  imagesHidden.value = !imagesHidden.value;
}

function addImageSetLayer(url: string, nameRef: Ref<string | null>, isetRef: Ref<ImageSetLayer | null>) {
  return store.loadImageCollection({ url: url, loadChildFolders: false })
    .then((folder) => {
      nameRef.value = folder['_proxyFolder']['_nameField'];
      const iset = store.availableImagesets.find(v => v.name === nameRef.value);
      
      if (!iset) {
        throw new Error(`ImageSet ${nameRef.value} not found in available imagesets`);
      }
      
      return store.addImageSetLayer({...iset, mode: 'preloaded', goto: false,})
        .then((iset => isetRef.value = iset));
    });
}


onMounted(() => {
  store.waitForReady().then(async () => {
    skyBackgroundImagesets.forEach(iset => backgroundImagesets.push(iset));
    store.setBackgroundImageByName("Deep Star Maps 2020");

    store.applySetting(['galacticMode', true]);
    positionSet.value = true;
    
    // Load SPHEREx image collections
    const p1 = addImageSetLayer(
      "/SPHEREx_LinesRB_equirectangular_toast/index.wtml",
      linesImageName,
      linesImageset
    );
    
    const p2 = addImageSetLayer(
      "/SPHEREx_StarsRGB_equirectangular_toast/index.wtml",
      starsImageName,
      starsImageset
    );
    
    
    Promise.all([p1, p2]).then(() => {
      console.log('SPHEREx image layers loaded:', {starsImageset: starsImageset.value, linesImageset: linesImageset.value});
      // setLayerOrder();
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
  gap: 1.5rem;
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

.wwt-use-pointer {
  pointer-events: auto;
}

input[type="range"].cross-fade-slider {
  width: 60vw;
}

.wwt-playground-button {
  background-color: rgba(100, 0, 100, 0.5);
  color: white;
  border: 1px solid white;
  padding: 0.5rem 1rem;
  font-size: 1rem;
  
  &:hover {
    background-color: rgba(150, 0, 150, 0.7);
  }
}

.foreground-background-opacity-control {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  gap: 10px;
  border: 1px solid white;
  padding: 0.5rem;
  width: fit-content;
  
  input[type="range"].sphere-x-fade-slider {
    flex: 1 1 auto;
    width: max-content;
  }
  
  button.toggle-images-button {
    flex: 1 0 auto;
    width: fit-content
  }
  
}

</style>
