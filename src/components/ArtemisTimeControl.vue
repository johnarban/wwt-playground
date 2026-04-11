<template>
  <div class="artemis-play-input">
    <v-btn
      class="artemis-play"
      :icon="play ? 'mdi-pause' : 'mdi-play'"
      color="#ffa000"
      variant="tonal"
      density="comfortable"
      title="play button"
      @click="play = !play"
    />
    <div class="artemis-tracker">
      <div class="artemis-labels">
        <span class="left-time">{{ formatDate(MISSION_START) }}</span>
        <span class="current-time">{{ formatDate(currentTime) }}</span>
        <span class="right-time">{{ formatDate(MISSION_END) }}</span>
      </div>
      <input
        type="range"
        class="time-slider"
        :min="MISSION_START.getTime()"
        :max="MISSION_END.getTime()"
        title="time slider"
        :step="STEP_MS"
        :value="currentTime.getTime()"
        @input="onSliderInput"
      />
    </div>
    <div class="artemis-rate">
      <!-- {{ rates[0][0] }} -->
      <button 
        class="now-btn" 
        title="Now" 
        @click="goToNow"
      >
        Now
      </button>

      <label for="artemis-rate-selector">Speed:
        <select 
          id="artemis-rate-selector"
          v-model="rate"
          name="playback rate" 
        >
          <option 
            v-for="[label, value] in rates" 
            :key="value" 
            :value="value"
          >
            {{ label }}
          </option>
        </select>
      </label>
    </div>
  </div>
</template>

<script setup lang="ts">
import { watch, ref } from "vue";
import { SpaceTimeController } from "@wwtelescope/engine";

interface Props {
  canCreate: boolean;
  initialTime: Date;
  startTime: Date;
  endTime: Date;
  step: number;
}

const props = defineProps<Props>();
  
const currentTime = defineModel<Date>('time', {default: new Date()});
SpaceTimeController.set_now(props.initialTime);

watch(currentTime, (date) => {
  SpaceTimeController.set_now(date);
});

function applyTime(date: Date) {
  currentTime.value = date;
}

function onSliderInput(e: Event) {
  applyTime(new Date(parseInt((e.target as HTMLInputElement).value)));
}

function goToNow() {
  play.value = false;
  const nowMs = Date.now();
  const roundedMs = Math.round(nowMs / STEP_MS) * STEP_MS;
  const clampedMs = Math.min(Math.max(roundedMs, MISSION_START.getTime()), MISSION_END.getTime());
  applyTime(new Date(clampedMs));
}



// 2026-Apr-02 01:59:00.0000
const MISSION_START = props.startTime ?? new Date("2026-04-02T01:59:00Z");
// 2026-Apr-10 23:54:00.0000
const MISSION_END   = props.endTime ?? new Date("2026-04-10T23:54:00Z");
const STEP_MS       = props.step ?? 5 * 60 * 1000;

const INITIAL_TIME = props.initialTime; //new Date("2026-04-06T22:32:00Z");

// const currentTime = ref(INITIAL_TIME);

function formatDate(d: Date): string {
  return d.toLocaleString(undefined, {
    month: "short", 
    day: "numeric",
    hour: "2-digit", 
    minute: "2-digit",
    timeZoneName: "short",
  });
}




watch(
  () => props.canCreate,
  (canCreate) => {
    if (canCreate) {
      applyTime(MISSION_START);
      applyTime(INITIAL_TIME);
    }
  },
  { immediate: true },
);



const PLAY_INTERVAL_MS = 5;

// step ms to advance per tick given desired playback speed
function stepMs(daysPerSecond: number): number {
  let realStep = daysPerSecond * 24 * 60 * 60 * 1000 * PLAY_INTERVAL_MS / 1000;
  realStep =  realStep + (realStep % STEP_MS); // round to nearest step
  return realStep;
}
const rates = [
  ['Real time', PLAY_INTERVAL_MS],
  ['1 hrs/sec', stepMs(1/24)],
  ['3 hrs/sec', stepMs(3/24)],
  ['6 hrs/sec', stepMs(6/24)],
  ['12 hrs/sec', stepMs(0.5)],
  ['1 day/sec', stepMs(1)],
] as const;

const rate = ref(rates[3][1]);

let interval: number | null = null;
function setupInterval(stepMs: number) {
  if (play.value) {
    interval = setInterval(() => {
      const newTime = new Date(currentTime.value.getTime() + stepMs);
      if (newTime >= MISSION_END) {
        play.value = false;
        setTimeout(() => {
          applyTime(MISSION_START);
        }, 750);
        return;
      }
      applyTime(newTime);
    }, PLAY_INTERVAL_MS);
  }
}

watch(rate, (newRate) => {
  console.log("Rate changed to", newRate);
  if (play.value) {
    if (interval) {
      clearInterval(interval);
    }
    setupInterval(newRate);
  }
}); 

const play = ref(false);
watch(play, (isPlaying) => {
  if (isPlaying) {
    if (!interval) {
      setupInterval(rate.value);
    }
  } else {
    if (interval) {
      clearInterval(interval);
      interval = null;
    }
  }
});

</script>

<style scoped>

.artemis-play-input {
  display: grid;
  grid-template-columns: auto 1fr;
  grid-template-rows: auto auto;
  align-items: center;
  gap: 0.5rem 1rem;
  pointer-events: auto;
  user-select: none;
}

.artemis-play {
  grid-area: 1 / 1 / 3 / 2;
  pointer-events: auto;
}

.artemis-tracker {
  grid-area: 1 / 2 / 2 / 3;
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
  gap: 2rem;

}

.artemis-labels > span.left-time {
  text-align: left;
}

.artemis-labels > span.current-time {
  text-align: center;
}

.artemis-labels > span.right-time {
  text-align: right;
}

.time-slider {
  width: 100%;
  accent-color: rgb(255, 160, 0);
  cursor: pointer;
}

.artemis-rate {
  grid-area: 2 / 2 / 3 / 3;
  pointer-events: auto;
  color: #fff;
  font-size: 0.8rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
}
.now-btn {
  pointer-events: auto;
  background: rgba(255, 255, 255, 0.12);
  border: 1px solid rgba(255, 255, 255, 0.45);
  border-radius: 4px;
  color: #fff;
  font-size: 0.8rem;
  padding: 2px 8px;
  cursor: pointer;
  user-select: none;
  &:hover { background: rgba(255, 255, 255, 0.25); }
}
.artemis-rate label {
  user-select: none;
}

.artemis-rate select {
  cursor: pointer;
  /* get back some browser defautls */
  appearance: revert;
  outline: 1px solid hsl(38, 50%, 50%);
  border-radius: 3px;
  background-color: black;
  padding: 1px 2px;
}
</style>
