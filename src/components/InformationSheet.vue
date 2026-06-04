a<!-- eslint-disable vue/max-attributes-per-line -->
<template>
  <v-card
    class="info-sheet"
    height="100%"
    elevation="0"
  >
    <v-tabs
      id="tabs"
      v-model="tab"
      :color="tabColor"
      :slider-color="tabColor"
      dense
      align-tabs="start"
    >
      <v-tab
        class="info-tabs"
        tabindex="0"
      >
        <h3>{{ tabTitle ?? 'Information' }}</h3>
      </v-tab>
      <v-tab
        v-if="!hideUserGuide"
        class="info-tabs"
        tabindex="0"
      >
        <h3>User Guide</h3>
      </v-tab>
    </v-tabs>
    <font-awesome-icon
      class="close-text-icon"
      icon="times"
      size="lg"
      tabindex="0"
      @click="showTextSheet = false"
      @keyup.enter="showTextSheet = false"
    >
    </font-awesome-icon>

    <!-- Information Content -->
    <v-window
      id="tab-items"
      v-model="tab"
      class="pb-2"
      :style="cssVars"
    >
      <v-window-item>
        <v-card class="scrollable" elevation="0" rounded="0">
          <v-card-text class="info-text scrollable">
            <slot />
          </v-card-text>
        </v-card>
      </v-window-item>

      <!-- User Guide Content -->
      <v-window-item v-if="!hideUserGuide">
        <v-card class="scrollable" rounded="0">
          <v-card-text class="info-text scrollable">
            <h4 class="user-guide-header mt-5">
              Sky Navigation
            </h4>
            <p>
              To navigate the WWT view, use the following controls:
            </p>
            <v-row
              align="center"
              dense
              class="mt-2 mx-3"
            >
              <v-col cols="4">
                <v-chip
                  label
                  density="compact"
                  variant="outlined"
                >
                  Pan
                </v-chip>
              </v-col>
              <v-col
                cols="8"
                class="pt-1"
              >
                <strong>{{ touchscreen ? "press + drag" : "click + drag" }}</strong> {{ touchscreen ? "" : "or" }}
                <strong>{{ touchscreen ? "" : "W-A-S-D" }}</strong> {{ touchscreen ? "" : "keys" }}<br>
              </v-col>
            </v-row>
            <v-row
              align="center"
              dense
              class="mx-3"
            >
              <v-col cols="4">
                <v-chip
                  label
                  density="compact"
                  variant="outlined"
                >
                  Zoom
                </v-chip>
              </v-col>
              <v-col
                cols="8"
                class="pt-1"
              >
                <strong>{{ touchscreen ? "pinch in and out" : "scroll in and out" }}</strong> {{ touchscreen ? "" :
                  "or" }} <strong>{{ touchscreen ? "" : "I-O" }}</strong> {{ touchscreen ? "" : "keys" }}<br>
              </v-col>
            </v-row>
            <v-row
              align="center"
              dense
              class="mx-3"
            >
              <v-col cols="4">
                <v-chip
                  label
                  density="compact"
                  variant="outlined"
                >
                  Rotate
                </v-chip>
              </v-col>
              <v-col
                cols="8"
                class="pt-1"
              >
                {{ touchscreen ? "" : "press" }} <strong>{{ touchscreen ? "pinch and twist" : "control + click + drag"
                }}</strong> {{ touchscreen ? "" : "" }} <strong>{{ touchscreen ? "" : "" }}</strong> {{ touchscreen
                  ? "" : "" }}<br>
              </v-col>
            </v-row>

            <!-- Credits -->
            <v-row>
              <v-col cols="12">
                <div class="credits">
                  <h4 class="user-guide-header mt-3">
                    Credits
                  </h4>
                  <h5>
                    <easyLink
                      href="https://www.cosmicds.cfa.harvard.edu/"
                    >
                      CosmicDS
                    </easyLink>
                  </h5>
                  <p>Jon Carifio</p>
                  <p>John Lewis</p>
                  <p>Pat Udomprasert</p>
                  <p>Alyssa Goodman</p>

                  <h5>
                    <a
                      href="https://www.worldwidetelescope.org/home"
                      target="_blank"
                      rel="noopener noreferrer"
                    >WorldWide Telescope</a>
                  </h5>
                  <p>Jon Carifio</p>
                  <p>Peter Williams</p>
                  <p>David Weigel</p>
                </div>
                <v-spacer class="end-spacer"></v-spacer>
              </v-col>
            </v-row>
            <v-row>
              <v-col>
                <funding-acknowledgement />
              </v-col>
            </v-row>
            <!-- </v-container> -->
          </v-card-text>
        </v-card>
      </v-window-item>
    </v-window>
  </v-card>
</template>

<script setup lang="ts">
import { ref, computed, watch, h, type SetupContext} from 'vue';
import { supportsTouchscreen, FundingAcknowledgement } from '@cosmicds/vue-toolkit';

// https://v3-migration.vuejs.org/breaking-changes/functional-components
const easyLink = (props: { href: string }, { slots }: SetupContext) => {
  return h('a', { href: props.href, target: '_blank', rel: 'noopener noreferrer' }, slots.default?.());
};



const tab = ref(0);
const touchscreen = supportsTouchscreen();



const showTextSheet = defineModel<boolean>();

interface Props {
  tabColor: string,
  textColor?: string,
  headingColor?: string,
  accentColor?: string,
  tabTitle?: string,
  hideUserGuide?: boolean,
}

const props = defineProps<Props>();

watch(() => props.hideUserGuide, (hidden) => {
  if (hidden) tab.value = 0;
});

const cssVars = computed(() => {
  return {
    '--info-sheet-text-color': props.textColor ?? '#ffffff',
    '--info-sheet-heading-color': props.headingColor ?? props.textColor,
    '--info-sheet-accent-color': props.accentColor ?? props.tabColor,

  };
});

</script>

<style lang="less">
.intro-card {
  padding: 1em;
  container-type: size;
}

.info-tabs h3 {
  font-size: 0.9em;
}

.v-tab.v-tab.v-btn.info-tabs {
  height: auto;
}

.info-text {
  display: flex !important;
  flex-direction: column;
  color: var(--info-sheet-text-color);

  a {
    color: currentColor;
    text-decoration-style: dotted;
  }

  h3 {
    font-size: 1.4em;
    color: var(--info-sheet-heading-color);
  }

  h4 {
    font-size: 1.2em;
    color: var(--info-sheet-heading-color);
  }

  h5 {
    font-size: 1em;
    font-weight: bold;
    margin-top: 1em;
    color: var(--info-sheet-heading-color);
  }

  li {
    margin-block: 0.5em;
  }

  details {
    user-select: none;
    margin-block: 0.5em;
    outline: 1px solid rgba(255, 255, 255, 0.50);
    padding: 2px 1em;
    border-radius: 2px;
    cursor: pointer;
  }
  details:hover {
    outline: 2px solid #aeaeae;
  }

  pre {
    background-color: rgb(50, 50, 50);
    padding: 0.5em;
    font-family: 'Courier New', Courier, monospace;
    font-size: 0.8em;
  }
}

.bullet-icon {
  color: currentColor;
  width: 1.2em;
  padding-right: 0.5em;
}


.info-sheet {

  .info-text {
    height: fit-content;
  }


  #tabs {
    width: calc(100% - 3em);
    align-self: left;
  }

  .scrollable {
    overflow-y: visible;
    height: 100%;
  }

  #tab-items {
    height: calc(100% - 32px);
    overflow-y: auto;

    .v-card.border-radius-0 {
      border-radius: 0 !important;
    }

    .v-card-text {
      font-size: ~"max(13px, calc(0.6em + 0.3vw))";
      padding-top: ~"max(2vw, 16px)";
      padding-left: ~"max(4vw, 16px)";
      padding-right: ~"max(4vw, 16px)";


      .end-spacer {
        height: 25px;
      }
    }

  }

  .close-text-icon {
    position: absolute;
    top: calc(0.25em + 0.6875em / 2); // magic works;
    right: calc((3em - 0.6875em) / 3); // font-awesome-icons have width 0.6875em
    color: white;
    padding: 0.5em;
    margin: -0.5em;
    border-radius: 9999px;

    &:hover {
      cursor: pointer;
      background-color: rgba(255, 255, 255, 0.25);
    }
  }

  // This prevents the tabs from having some extra space to the left when the screen is small
  // (around 400px or less)
  .v-tabs:not(.v-tabs--vertical).v-tabs--right>.v-slide-group--is-overflowing.v-tabs-bar--is-mobile:not(.v-slide-group--has-affixes) .v-slide-group__next,
  .v-tabs:not(.v-tabs--vertical):not(.v-tabs--right)>.v-slide-group--is-overflowing.v-tabs-bar--is-mobile:not(.v-slide-group--has-affixes) .v-slide-group__prev {
    display: none;
  }
}
</style>
