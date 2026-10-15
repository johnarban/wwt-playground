<template>
  <button
    :aria-label="label"
    type="button"
    @click="emit('click')"
  >
    <FontAwesomeIcon
      class="fa-close-icon"
      icon="xmark"
      size="lg"
      :style="{ color: color }"
      aria-hidden="true"
    />
  </button>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useTheme } from "vuetify";
import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";
import { library } from "@fortawesome/fontawesome-svg-core";
import { faXmark } from "@fortawesome/free-solid-svg-icons";

/** An interface describing props for the close button */
export interface CloseButtonProps {
  /** ARIA label for the button */
  label: string;
  /** The color of the close icon. Can be a theme color name, which will be resolved to its current value */
  color?: string;
}

library.add(faXmark);

const props = defineProps<CloseButtonProps>();

const emit = defineEmits<{ click: [] }>();

const theme = useTheme();
// get the theme color if that is what was passed in
const color = computed(() => {
  if (props.color && theme.current.value.colors[props.color]) {
    return theme.current.value.colors[props.color];
  }
  return props.color;
});
</script>

<style scoped>
button {
  line-height: 1;
}

/* font-awesome close (times) button */
.fa-close-icon {
  cursor: pointer;
  aspect-ratio: 1/1;
  width: auto;
  transition: scale 0.2s ease-in-out;
}
.fa-close-icon:hover {
  scale: 1.2;
}

</style>
