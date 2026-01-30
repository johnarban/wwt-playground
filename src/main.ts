import { createApp, type DirectiveBinding, type Plugin } from "vue";
import { FundingAcknowledgement, CreditLogos, PlaybackControl, SpeedControl } from "@cosmicds/vue-toolkit";
import WwtPlayground from "./Asteroid.vue";

import vuetify from "@/plugins/vuetify";



import { WWTComponent, wwtPinia } from "@wwtelescope/engine-pinia";



import { library } from "@fortawesome/fontawesome-svg-core";
import {
  faBookOpen,
  faTimes,
  faVideo,
} from "@fortawesome/free-solid-svg-icons";

library.add(faBookOpen);
library.add(faTimes);
library.add(faVideo);

/** v-hide directive taken from https://www.ryansouthgate.com/2020/01/30/vue-js-v-hide-element-whilst-keeping-occupied-space/ */
// Extract the function out, up here, so I'm not writing it twice
const update = (el: HTMLElement, binding: DirectiveBinding) => el.style.visibility = (binding.value) ? "hidden" : "";

createApp(WwtPlayground, {
  wwtNamespace: "wwt-playground"
})

  // Plugins
  .use(wwtPinia as unknown as Plugin<[]>)
  .use(vuetify)

  // Directives
  .directive(
    /**
    * Hides an HTML element, keeping the space it would have used if it were visible (css: Visibility)
    */
    "hide", {
      // Run on initialisation (first render) of the directive on the element
      beforeMount(el, binding, _vnode, _prevVnode) {
        update(el, binding);
      },
      // Run on subsequent updates to the value supplied to the directive
      updated(el, binding, _vnode, _prevVnode) {
        update(el, binding);
      }
    })

  // Components
  .component("WorldWideTelescope", WWTComponent)
  .component('funding-acknowledgement', FundingAcknowledgement)
  .component('credit-logos', CreditLogos)
  .component('playback-control', PlaybackControl)
  .component('speed-control', SpeedControl)

  // Mount
  .mount("#app");
