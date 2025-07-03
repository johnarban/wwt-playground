<template>
  <p 
    class="splash-screen-title"
    :style="{ '--color': color, '--glow-color': glowColor }"
  >
    {{ title }}
  </p>
</template>
<script setup lang="ts">
import { defineProps, withDefaults } from 'vue';  

export interface Props {
  title?: string;
  color?: string;
  glowColor?: string;
}

withDefaults(defineProps<Props>(), {
  title: 'The Final Frontier',
  color: 'white',
  glowColor: 'black',
});

</script>

<style>
p.splash-screen-title {
    color: var(--color);
    text-transform: uppercase;
    font-weight: bolder;
    text-shadow: 0 0 16px var(--glow-color);
    filter: drop-shadow(0 0 5px white);
    font-size: 1.2em;
    text-align: center;
}

@media (max-width: 750px) {
  p.splash-screen-title {
    font-weight: bold;
  }
}


</style>