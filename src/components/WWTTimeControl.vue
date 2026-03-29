<template>
  <fieldset id="wwt-time-control">
    <legend>WWT Time Control</legend>

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
  </fieldset>
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


fieldset#wwt-time-control {
  display: flex;
  flex-direction: column;
  gap: var(--spacing);
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
