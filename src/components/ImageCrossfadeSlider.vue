<template>
  <div class="crossfade-slider">
    <!-- without the key, you get a warning about them having the same key -->
    <slot
      key="left"
      name="label"
      :label="leftLabel"
      :active="crossfade === 0"
      :layer="left"
      :on="{ onClick: selectLeft }"
    >
      <button
        class="crossfade-label"
        @click="selectLeft"
      >
        {{ leftLabel }}
      </button>
    </slot>
    <v-slider
      v-model="crossfade"
      class="crossfade-scrubber"
      :max="1"
      :min="0"
      :step="0.01"
      :disabled="hidden"
      hide-details
    ></v-slider>
    <slot
      key="right"
      name="label"
      :label="rightLabel"
      :active="crossfade === 1"
      :layer="right"
      :on="{ onClick: selectRight }"
    >
      <button
        class="crossfade-label"
        @click="selectRight"
      >
        {{ rightLabel }}
      </button>
    </slot>
  </div>
</template>

<script setup lang="ts">
import { WWTControl, type ImageSetLayer } from "@wwtelescope/engine";
import { engineStore } from "@wwtelescope/engine-pinia";
import { watch } from "vue";

const props = withDefaults(
  defineProps<{
    /** null until loaded; opacities are applied once it arrives */
    left: ImageSetLayer | null;
    right: ImageSetLayer | null;
    leftLabel: string;
    rightLabel: string;
    /** "linear": left 1-v, right v, so the background shows through mid-fade.
     * "over": the under layer stays opaque and only the top one fades; they swap draw order at 0.5 */
    blend?: "linear" | "over";
    /** overall opacity of the pair, i.e. fade both against the background */
    opacity?: number;
    /** hide both layers without losing the crossfade or opacity */
    hidden?: boolean;
  }>(),
  { blend: "linear", opacity: 1, hidden: false },
);

/* v-model for the crossfade value between 0 and 1, default 0. */
const crossfade = defineModel<number>({ default: 0 });

const SWITCH = 0.5;
// opacity of the top layer at the swap (from sphere-x, tuned by eye)
const SWITCH_OPACITY = 0.63;

function lerp(from: number, to: number, t: number) {
  return from + (to - from) * Math.min(1, Math.max(0, t));
}

function blendOpacities(v: number): [number, number] {
  if (props.blend === "linear") return [1 - v, v];
  return v <= SWITCH
    ? [lerp(1, SWITCH_OPACITY, v / SWITCH), 1]
    : [1, lerp(SWITCH_OPACITY, 1, (v - SWITCH) / (1 - SWITCH))];
}

const store = engineStore();
/* draw `top` after `under`, leaving every other layer where it is */
function putOnTop(top: ImageSetLayer, under: ImageSetLayer) {
  const t = store.activeLayers.indexOf(top.id.toString());
  const u = store.activeLayers.indexOf(under.id.toString());
  if (t < 0 || u < 0 || t > u) return;
  store.setImageSetLayerOrder({ id: top.id.toString(), order: u });
  WWTControl.singleton.renderOneFrame();
}

watch(
  [crossfade, () => props.left, () => props.right, () => props.blend, () => props.opacity, () => props.hidden],
  () => {
    const { left, right } = props;
    const [l, r] = blendOpacities(crossfade.value);
    const k = props.hidden ? 0 : props.opacity;
    left?.set_opacity(l * k);
    right?.set_opacity(r * k);
    if (props.blend === "over" && left && right) {
      if (crossfade.value <= SWITCH) putOnTop(left, right);
      else putOnTop(right, left);
    }
  },
  { immediate: true },
);

const selectLeft = () => (crossfade.value = 0);
const selectRight = () => (crossfade.value = 1);

defineSlots<{
  /** What to use for the labels. Same component for both left and right label */
  label: (props: {
    label: string;
    active: boolean;
    key: "left" | "right";
    layer: ImageSetLayer | null;
    on: { onClick: () => void };
  }) => void;
}>();
</script>

<style lang="less">
.crossfade-slider {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  pointer-events: auto;
  width: 50%;
  max-width: 400px;

  .crossfade-label {
    user-select: none;
    padding: 4px 8px;
    border-radius: 4px;
    background-color: rgba(0, 0, 0, 0.8);
    cursor: pointer;

    &:hover {
      outline: 3px solid rgb(var(--v-theme-primary));
    }
  }

  .crossfade-scrubber {
    flex: 1;
  }
}
</style>
