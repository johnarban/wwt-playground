<template>
  <div class="earth-moon-toggle">
    <accessible-toggle
      v-model="state"
      true-color="#9f9f9f"
      false-color="#67ad89"
      :disaabled="disabled"
    >
      <template #true>
        <span>{{ moonEmoji }}</span>
      </template>
      <template #false>
        <span>{{ earthEmoji }}</span>
      </template>
      <template #label="props">
        <span class="toggle-label">
          {{ props.state ? 'Moon' : 'Earth' }}
        </span>
      </template>
    </accessible-toggle>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import AccessibleToggle from './AccessibleToggle.vue';
import { SolarSystemObjects } from '@wwtelescope/engine-types';

type ToggleState = SolarSystemObjects.earth | SolarSystemObjects.moon;
const moon = SolarSystemObjects.moon;
const earth = SolarSystemObjects.earth;

const model = defineModel<SolarSystemObjects>({default: SolarSystemObjects.moon});

function isToggleState(value: SolarSystemObjects): value is ToggleState {
  return [SolarSystemObjects.earth, SolarSystemObjects.moon].includes(value);
}
const disabled = computed(() => !isToggleState(model.value));

  
const emit = defineEmits<{
  'change': [state: ToggleState],
  'moon': [],
  'earth': [],
}>();


const state = computed({
  get() {
    return model.value === moon;
  },
  set(newValue: boolean) {
    model.value = newValue ? moon : earth;
    emit('change', model.value);
    if (model.value === moon) {
      emit('moon');
    } else {
      emit('earth');
    }
  }
});






const earthEmojis = ['🌍', '🌎', '🌏'];
const moonEmojis = ['🌙', '🌕', '🌖','🌗','🌘','🌑','🌒','🌓','🌔'];
const pickRandom = (list: string[]) => {
  const n = list.length;
  return list[Math.min(n - 1, Math.floor(Math.random() * n))];
};
const earthEmoji = pickRandom(earthEmojis);
const moonEmoji = pickRandom(moonEmojis);


</script>


<style>
.earth-moon-toggle {
  font-size: 0.9em;
}

.toggle-label {
  width: 10ch;
  text-align: left;
  white-space: nowrap;
}
</style>