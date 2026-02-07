<template>
  <div class="resolver-and-output-and-selector">
    <div class="resolver-and-output">
      <div class="sesame-resolver ga-2">
        <v-text-field
          v-model="name"
          label="Object name"
          variant="solo-filled"
          :error-messages="errorMessage"
          @keyup.enter="resolveName"
          @keydown.stop
        >
          <template #prepend>
            Go to:
          </template>
        </v-text-field>


        <v-btn 
          class="sesame-search-button" 
          @click="resolveName"
        >
          Search
        </v-btn>
      </div>
      
      <div 
        v-if="details ||true" 
        class="details-display"
      >
        <div><strong>Name:</strong> {{ details?.oname }}</div>
        <div><strong>RA:</strong> {{ details?.raDeg?.toFixed(6) }}°</div>
        <div><strong>Dec:</strong> {{ details?.decDeg?.toFixed(6) }}°</div>
      </div>
    </div>
    
    <v-radio-group
      v-model="whichResolver"
      density="compact"
      hide-details
      style="font-size: 0.8em; pointer-events: auto;"
    >
      <v-radio 
        value="sesame" 
        label="Sesame (SVN)"
      ></v-radio>
      <v-radio
        value="simbad"
        label="SIMBAD"></v-radio>
    </v-radio-group>
  </div>
</template>
<script lang="ts" setup>
import {ref, watch, computed} from 'vue';
import { ResolvedObject } from './types';
import { sesameNameResolver } from './sesame_resolver';
import { simbadNameResolver } from './simbad_resolvers';
import { engineStore } from '@wwtelescope/engine-pinia';
import { D2R } from "@wwtelescope/astro";

const store = engineStore();

interface SesameResolverComonentProps {
  goto?: boolean
}
const props = withDefaults(defineProps<SesameResolverComonentProps>(),{goto: true});

  
const name = ref<string | null>(null);
const details = ref<ResolvedObject | null>(null);
const errorMessage = ref('');
const whichResolver = ref<'simbad' | 'sesame'>('sesame');
const emits = defineEmits<{
  resolved: [value: ResolvedObject]
}>();

function goTo(object: ResolvedObject) {
  if (object?.raDeg && object?.decDeg) {
    store.gotoRADecZoom({
      raRad: object.raDeg * D2R,
      decRad: object.decDeg * D2R,
      zoomDeg: 30,
      instant: false,
    });
  }
}

watch(details, (value) => {
  if (value && props.goto) {
    goTo(value);
  }
});

const resolver = computed(() => 
  whichResolver.value === 'sesame' 
    ? sesameNameResolver 
    : simbadNameResolver
);

function setDetails(d: ResolvedObject) {
  details.value = d;
  emits('resolved', d);
  console.log(d);
  errorMessage.value = '';
}

function resolveName() {
  errorMessage.value = '';
  if (name.value) {
    resolver.value(name.value).then(setDetails)
      .catch(() => {
        console.error(`${whichResolver.value} failed on first try, trying again...`);
        if (name.value) return resolver.value(name.value).then(setDetails);
      })
      .catch((e: Error) => {
        errorMessage.value = e.message;
        console.error(e.message);
      });
  } else {
    errorMessage.value = `Enter a valid name. ${name.value} is not valid`;
  }
}
</script>

<style>
.resolver-and-output {
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  pointer-events: auto;
}
.sesame-resolver {
  display: flex;
  flex-direction: row;
  align-items: center;
  pointer-events: auto;
  outline: 1px solid crimson;
  padding: 1em 0.5em;
  border-radius: 12px;
  width: 100%;
  flex: 1 1 auto;
}

.sesame-resolver > * {
}

.sesame-search-button {
  margin-bottom: 22px; /* align it with the text input details which is 22px */
}

.details-display {
  margin-left: 16px;
  margin-bottom: 22px;
  padding: 8px 12px;
  background-color: rgba(255, 255, 255, 0.05);
  border-radius: 4px;
  font-size: 14px;
  pointer-events: none;
  user-select: none;
}

.details-display > div {
  margin: 4px 0;
}
</style>