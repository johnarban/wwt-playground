<template>
  <div id="wwt-time-control">
    <!-- <button 
      class="wwt-time-control-collapsor"
      @click="show=!show"
    >
      WWT Time Controls
    </button> -->
    <div 
      v-if="show" 
      class="wwt-control-container"
    >
      <div class="wwt-time-set">
        <label>
          UTC Time: 
          <input 
            v-model="selectedDateTime"
            class="wwt-time-control-input"
            type="datetime-local"
            @focus="inputFocused = true"
            @blur="inputFocused = false"
          >
        </label>
        <v-btn 
          style="text-transform:none;"
          rounded="lg"
          density="compact"
          @click="setTime"
          @keyup.enter="setTime"
        >
          Set time
        </v-btn>
      </div>
      <div class="wwt-clock-controls">
        <label>
          Rate:
          <input 
            v-model="clockRate" 
            type="number"
          />
        </label>
        <v-checkbox 
          v-model="clockSync" 
          label="Clock Sync" 
          density="compact"
          hide-details
        />
        <v-btn 
          rounded="lg"
          density="compact"
          @click="() => store.setTime(new Date())"
          @keyup.enter="() => store.setTime(new Date())"
        >
          Now
        </v-btn>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
/* eslint-disable @typescript-eslint/no-unused-vars */
import { ref, computed, watch, onMounted } from 'vue';
import { engineStore } from '@wwtelescope/engine-pinia';
import { useWwtClockStatus } from './wwtTimeRate';


const store = engineStore();
const { timeRate, isClockSynced } = useWwtClockStatus();

function isoString(date: Date) {
  return date.toISOString().replace('Z','').split('.')[0] as string;
}

const inputFocused = ref(false);
const show = ref(true);

const selectedDateTime = ref(isoString(store.currentTime));
const clockSync = ref(isClockSynced.value);
const clockRate = ref(timeRate.value);

watch(isClockSynced, (sync) => {
  if (clockSync.value !== sync) {
    clockSync.value = sync;
  }
}, {immediate: true});
watch(timeRate, (rate) => {
  if (clockRate.value !== rate) {
    clockRate.value = rate;
  }
}, {immediate: true});
watch(() => isoString(store.currentTime), (dateString: string) => {
  // make sure store.setClockSync(false) otherwise this will waste a lot of cylces
  if (!inputFocused.value && selectedDateTime.value !== dateString) {
    selectedDateTime.value = dateString;
  }
});

const setTime = () =>  store.setTime(new Date(selectedDateTime.value + 'Z'));
const setSync = () => store.setClockSync(clockSync.value);
const setRate = () => store.setClockRate(clockRate.value);

// updates from out internal values
// watch(selectedDateTime, setTime); // we set this manually using a button click
watch(clockSync, setSync);
watch(clockRate, setRate);



function formatTime(date: Date) {
  return date.toLocaleString(undefined, {
    timeZoneName: 'short',
    timeZone: 'utc',
  });
}

</script>

<style>
#wwt-time-control {
  --color: rgb(186, 186, 186);
  --radius: 4px;
  --spacing: 8px;
  --label-space: 1em;
  --bg: black;

  pointer-events: auto;
  border: 1px solid var(--color);
  border-radius: var(--radius);
  padding: calc(2 * var(--spacing)) var(--spacing);
  position: relative;
  margin-top: var(--label-space);
  background-color: rgba(255, 255,255, 0.15);
}

#wwt-time-control > .wwt-control-container {
  display: flex;
  flex-direction: column;
  gap: var(--spacing);
}

#wwt-time-control::before {
  content: 'WWT Time Controls';
  position: absolute;
  top: calc(-0.8 * var(--label-space));
  left: 0.5em;
  padding-inline: var(--spacing);
  padding-block: 1px;
  border: 1px solid var(--color);
  border-radius: var(--radius);
  background-color: var(--bg);
  white-space: nowrap;
}

#wwt-time-control > button.wwt-time-control-collapsor {
  display: none;
  position: absolute;
  top: calc(-0.8 * var(--label-space) - var(--spacing));
  left: 0.5em;
  border-inline: 1px solid var(--color);
  border-radius: var(--radius);
  padding-inline: var(--spacing);
  padding-block: calc(var(--spacing) / 2);
  color: white;
  background-color: var(--bg);
  white-space: nowrap;
}

#wwt-time-control label {
  user-select: none;
}

#wwt-time-control input {
  border: 1px solid var(--color);
  border-radius: var(--radius);
  padding: var(--spacing);
  background-color: var(--bg);
}

#wwt-time-control .wwt-time-set {
  display: flex;
  flex-direction: row;
  gap: var(--spacing);
  align-items: center;
}

#wwt-time-control .wwt-time-control-input {
  width: 230px;
}

#wwt-time-control .wwt-clock-controls {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  gap: var(--spacing);
}

#wwt-time-control .wwt-clock-controls input {
  width: 5em;
}

</style>
