<template>
  <v-overlay
    id="splash-overlay"
    :model-value="showSplashScreen"
    absolute
    opacity="0.6"
  >
    <div
      id="splash-screen"
      v-click-outside="closeSplashScreen"
      class="space-background"
    >
      <div
        id="close-splash-button"
        @click="closeSplashScreen"
      >
        &times;
      </div>
      <slot name="title">
        <splash-screen-title
          :title="props.title"
          :color="props.textColor ?? props.color"
          :glow-color="props.glowColor ?? 'black'"
        />
      </slot>

      <slot 
        name="button" 
        class="splash-get-started"
      >
        <v-btn
          class="splash-get-started"
          :color="props.color"
          :density="$vuetify.display.smAndDown ? 'compact' : 'default'"
          tabindex="0"
          size="x-large"
          variant="elevated"
          rounded="lg"
          @click="closeSplashScreen"
        >
          Get Started
        </v-btn>
      </slot>
        
      <slot 
        v-if="$vuetify.display.height > 350"
        name="acknowledgements"
        :classes="['splash-screen-acknowledgements', 'splash-screen-small']"
      >
        <div
          class="splash-screen-acknowledgements splash-screen-small"
        >
          <span>This Data Story is brought to you by <a
            href="https://www.cosmicds.cfa.harvard.edu/"
            target="_blank"
            rel="noopener noreferrer"
          >Cosmic Data Stories</a> and <a
            href="https://www.worldwidetelescope.org/home/"
            target="_blank"
            rel="noopener noreferrer"
          >WorldWide Telescope</a>.</span>

          <div class="splash-screen-logos">
            <credit-logos logo-size="5vmin" />
          </div>
        </div>
      </slot>
      
      <div id="image-credit">
        Image credit: Google <a src="https://g.co/gemini/share/6801f3f88f26">Gemini</a>
      </div>
    </div>
  </v-overlay>
</template>


<script setup lang="ts">
import { defineProps, defineModel, defineEmits, withDefaults } from 'vue';
import SplashScreenTitle from './SplashScreenTitle.vue';


export interface Props {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  title?: string;
  color?: string;
  textColor: string | undefined;
  glowColor: string | undefined;
  
}

const props = withDefaults(defineProps<Props>(),{
  title: 'The Final Frontier',
  color: 'white',
});

const emits = defineEmits(['close']);

const showSplashScreen = defineModel<boolean>({default: true});


function closeSplashScreen() {
  showSplashScreen.value = false;
  emits('close');
}


</script>


<style lang="css">
#splash-overlay {
  align-items: center;
  justify-content: center;
}
#splash-screen {
  color: var(--accent-color, white);
  background-color: #000000;
  background-position: 80% bottom;
  display: flex;
  flex-direction: column;
  align-content: center;
  justify-content: space-around;
  font-family: 'Highway Gothic Narrow', 'Roboto', sans-serif;
  font-size: min(9vw, 6vh);
  border-radius: 30px;
  border: min(1.2vw, 0.9vh) solid var(--accent-color);
  overflow: auto;
  padding-top: clamp(1rem, 2vw, 4rem);
  padding-bottom: 1rem;
  padding-inline: 2rem;
}
@media (max-width: 699px) {
  #splash-screen {
    max-height: 80vh;
    max-width: 90vw;
  }
}
@media (min-width: 700px) {
  #splash-screen {
    max-height: 85vh;
    max-width: min(65vw, 800px);
  }
}
#splash-screen p:not(.splash-screen-title) {
  background-color: rgba(255, 255, 255, 0.3);
  border-radius: 15px;
  margin: 1rem;
}
#splash-screen .splash-screen-small {
  font-size: var(--default-font-size);
  font-weight: bold;
  margin-top: 1rem;
}
#splash-screen .splash-screen-acknowledgements {
  text-align: center;
  font-weight: normal;
}
#splash-screen .splash-screen-acknowledgements > span {
  background-color: rgba(0, 0, 0, 0.2);
  color: white;
  padding-block: 0.5rem;
  padding-inline: 0.5rem;
}
#splash-screen .splash-screen-logos {
  margin-top: 1.5rem;
}
#splash-screen #close-splash-button {
  position: absolute;
  top: calc(clamp(1rem, 2vw, 4rem)/3);
  color: var(--accent-color, white);
  right: 1rem;
  margin: 0;
  padding: 0;
  line-height: 1;
  text-align: end;
  font-size: max(2rem, min(8vw, 5vh));
  contain: layout;
}
#splash-screen #close-splash-button:hover {
  cursor: pointer;
}
#splash-screen #close-splash-button:before {
  content: "×";
  font-size: calc(1.1*max(2rem, min(8vw, 5vh)));
  font-weight: bold;
  color: white;
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: -1;
}
#splash-screen .splash-get-started {
  border: 2px solid rgba(255, 255, 255, 0.5);
  background-color: var(--accent-color);
  color: black;
  font-size: calc(1.8 * var(--default-font-size));
  margin-top: 5%;
  margin-bottom: 2%;
  font-weight: bold !important;
  margin-inline: auto;
}
#splash-screen #image-credit {
  position: absolute;
  bottom: 0.5rem;
  left: 1rem;
  font-size: calc(0.7 * var(--default-font-size));
  font-weight: 400;
  color: #DDDDDD;
}

.space-background {


  border-radius: 1rem; /* Rounded corners for the div */
  overflow: hidden; /* Ensures gradients stay within bounds */
  position: relative; /* Needed for pseudo-elements or absolute positioning of effects */
  box-shadow: 0 0 30px rgba(100, 100, 255, 0.5), /* Outer glow */
              0 0 60px rgba(150, 150, 255, 0.3); /* Larger, softer glow */

  /* Multiple background layers for the space effect */
  background:
      /* Layer 1: Tiny, distant stars (white dots) */
      radial-gradient(2px 2px at 20% 70%, #fff, rgba(255, 255, 255, 0)),
      radial-gradient(1.5px 1.5px at 80% 20%, #fff, rgba(255, 255, 255, 0)),
      radial-gradient(2.5px 2.5px at 50% 90%, #fff, rgba(255, 255, 255, 0)),
      radial-gradient(1px 1px at 10% 40%, #fff, rgba(255, 255, 255, 0)),
      radial-gradient(2px 2px at 90% 60%, #fff, rgba(255, 255, 255, 0)),
      radial-gradient(1.8px 1.8px at 30% 10%, #fff, rgba(255, 255, 255, 0)),
      radial-gradient(2.2px 2.2px at 70% 40%, #fff, rgba(255, 255, 255, 0)),
      radial-gradient(1.7px 1.7px at 40% 80%, #fff, rgba(255, 255, 255, 0)),
      radial-gradient(2px 2px at 60% 30%, #fff, rgba(255, 255, 255, 0)),
      radial-gradient(1.5px 1.5px at 5% 95%, #fff, rgba(255, 255, 255, 0)),
      radial-gradient(2.5px 2.5px at 95% 5%, #fff, rgba(255, 255, 255, 0)),
      radial-gradient(1px 1px at 25% 15%, #fff, rgba(255, 255, 255, 0)),
      radial-gradient(2px 2px at 75% 85%, #fff, rgba(255, 255, 255, 0)),
      radial-gradient(1.8px 1.8px at 15% 55%, #fff, rgba(255, 255, 255, 0)),
      radial-gradient(2.2px 2.2px at 85% 45%, #fff, rgba(255, 255, 255, 0)),
      radial-gradient(1.7px 1.7px at 55% 25%, #fff, rgba(255, 255, 255, 0)),

      /* Layer 2: Larger, brighter stars (subtle glowing dots) */
      radial-gradient(4px 4px at 60% 10%, rgba(255, 255, 255, 0.8), rgba(255, 255, 255, 0)),
      radial-gradient(3px 3px at 10% 80%, rgba(255, 255, 255, 0.7), rgba(255, 255, 255, 0)),
      radial-gradient(5px 5px at 90% 30%, rgba(255, 255, 255, 0.9), rgba(255, 255, 255, 0)),
      radial-gradient(3.5px 3.5px at 40% 50%, rgba(255, 255, 255, 0.6), rgba(255, 255, 255, 0)),

      /* Layer 3: Nebula effect (large, soft, colored gradient) */
      radial-gradient(circle at 70% 30%, rgba(138, 43, 226, 0.3), transparent 70%), /* Blue Violet */
      radial-gradient(circle at 30% 70%, rgba(0, 191, 255, 0.2), transparent 70%), /* Deep Sky Blue */
      radial-gradient(circle at 50% 50%, rgba(255, 105, 180, 0.2), transparent 60%), /* Hot Pink */
      radial-gradient(circle at 10% 10%, rgba(255, 215, 0, 0.15), transparent 70%), /* Gold */
      radial-gradient(circle at 90% 90%, rgba(0, 255, 255, 0.2), transparent 70%), /* Cyan */

      /* Base background color for deep space */
      #0a0a2a; /* Very dark blue */
    
  background-size: cover;
}



</style>