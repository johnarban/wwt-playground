<template>
  <v-row align="center">
    <v-col cols="4">
      <v-chip label variant="outlined">
        Pan
      </v-chip>
    </v-col>
    <v-col cols="8" class="pt-1">
      <strong>{{ touchscreen ? "press + drag" : "click + drag" }}</strong> {{ touchscreen ? ":" : "or" }} <strong>{{
        touchscreen ? ":" : "W-A-S-D" }}</strong> {{ touchscreen ? ":" : "keys" }}<br>
    </v-col>
  </v-row>
  <v-row align="center">
    <v-col cols="4">
      <v-chip label variant="outlined">
        Zoom
      </v-chip>
    </v-col>
    <v-col cols="8" class="pt-1">
      <strong>{{ touchscreen ? "pinch in and out" : "scroll in and out" }}</strong> {{ touchscreen ? ":" : "or" }}
      <strong>{{ touchscreen ? ":" : "I-O" }}</strong> {{ touchscreen ? ":" : "keys" }}<br>
    </v-col>
  </v-row>
</template>

<script setup lang="ts">
import { supportsTouchscreen } from '@cosmicds/vue-toolkit';

const touchscreen = supportsTouchscreen();
</script>