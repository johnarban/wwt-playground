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
          step="1"
          @focus="inputFocused = true"
          @blur="inputFocused = false"
          @keyup.enter="setTime"
        />
      </label>
      <v-btn
        class="text-none"
        rounded="lg"
        density="compact"
        @click="setTime"
      >
        Set time
      </v-btn>
    </div>

    <!-- rate and play/pause (clock sync) are the toolkit's SpeedControl -->
    <div class="wwt-clock-controls">
      <speed-control
        v-model="playing"
        :store="store"
        :default-rate="1000"
        :max-speed="100000"
        show-status
      />
      <v-btn
        class="text-none"
        rounded="lg"
        density="compact"
        @click="store.setTime(new Date())"
      >
        Now
      </v-btn>
    </div>
  </fieldset>
</template>

<script setup lang="ts">
import { ref, watch } from "vue";
import { engineStore } from "@wwtelescope/engine-pinia";
import { SpeedControl } from "@cosmicds/vue-toolkit";

const store = engineStore();

// whether time is running. v-model so the parent can pause it (e.g. when scrubbing)
const playing = defineModel<boolean>({ default: false });

function isoString(date: Date) {
  return date.toISOString().replace("Z", "").split(".")[0] as string;
}

const inputFocused = ref(false);
const selectedDateTime = ref(isoString(store.currentTime));

watch(
  () => isoString(store.currentTime),
  (dateString: string) => {
    if (!inputFocused.value && selectedDateTime.value !== dateString) {
      selectedDateTime.value = dateString;
    }
  },
);

const setTime = () => store.setTime(new Date(selectedDateTime.value + "Z"));
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
</style>
