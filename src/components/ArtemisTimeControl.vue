<template>
  <div class="artemis-tracker">
    <div class="artemis-labels">
      <span>{{ formatDate(MISSION_START) }}</span>
      <span class="current-time">{{ formatDate(currentTime) }}</span>
      <span>{{ formatDate(MISSION_END) }}</span>
    </div>
    <input
      type="range"
      class="time-slider"
      :min="MISSION_START.getTime()"
      :max="MISSION_END.getTime()"
      :step="STEP_MS"
      :value="currentTime.getTime()"
      @input="onSliderInput"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from "vue";
import { SpaceTimeController } from "@wwtelescope/engine";

interface Props {
  canCreate: boolean;
}

const props = defineProps<Props>();

const MISSION_START = new Date("2026-04-02T01:58:32Z");
const MISSION_END   = new Date("2026-04-10T23:54:30Z");
const STEP_MS       = 5 * 60 * 1000;

const INITIAL_TIME = new Date("2026-04-06T22:32:00Z");

const currentTime = ref(INITIAL_TIME);

function formatDate(d: Date): string {
  return d.toLocaleString(undefined, {
    month: "short", 
    day: "numeric",
    hour: "2-digit", 
    minute: "2-digit",
    timeZoneName: "short",
  });
}

function applyTime(date: Date) {
  currentTime.value = date;
  SpaceTimeController.set_now(date);
}

function onSliderInput(e: Event) {
  applyTime(new Date(parseInt((e.target as HTMLInputElement).value)));
}

watch(
  () => props.canCreate,
  (canCreate) => {
    if (canCreate) applyTime(INITIAL_TIME);
  },
  { immediate: true },
);
</script>

<style scoped lang="less">
.artemis-tracker {
  pointer-events: auto;
  display: flex;
  flex-direction: column;
  gap: 4px;
  width: 100%;
  max-width: 600px;
  color: #fff;
  font-size: 0.78rem;
}

.artemis-labels {
  display: flex;
  justify-content: space-between;
  opacity: 0.8;

}

.time-slider {
  width: 100%;
  accent-color: rgb(255, 160, 0);
}
</style>
