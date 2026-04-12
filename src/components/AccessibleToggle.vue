<!--
This component is based (basically a copy with vue sprinkled in)
of the accessible button version of the toggle/switch component designed by 
  https://kittygiraudel.com/2021/04/05/an-accessible-toggle/ (@kittygiraudel on github)
  The codepen and article are public, and codepen public pens are default MIT licensed. 
  The basic working principle is to switch the aria-pressed attribute and style based on that. 
  I used the button version since it has an immediate action (per the article advice and the
  advice from https://adrianroselli.com/2019/08/under-engineered-toggles-too.html)
  - main class is prefixed with KG to avoid conflicts that could crop up down the road.
  - the true and false icons are now slots
    - note a limitation of them is that the toggle doesn't resize to fit whatever is in the slots, 
      so make sure content as the correct size
  
  -->
<template>
  <button
    ref="toggle"
    class="KG-Toggle"
    :style="{
      '--kg-accessible-toggle-color__true': trueColor, 
      '--kg-accessible-toggle-color__false': falseColor
    }"
    type="button"
    :aria-pressed="state"
    :disabled="disabled"
    @click="state = !state"
  >
    <span
      class="KG-Toggle__display"
      hidden
    >
      <!-- <slot name="true"> <span>{{ moon }}</span> </slot>
      <slot name="false"><span>{{ earth }}</span></slot> -->
      <slot name="true">
        <svg
          aria-hidden="true"
          focusable="false"
          class="KG-Toggle__icon KG-Toggle__icon--checkmark"
          width="18"
          height="14"
          viewBox="0 0 18 14"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M6.08471 10.6237L2.29164 6.83059L1 8.11313L6.08471 13.1978L17 2.28255L15.7175 1L6.08471 10.6237Z"
            fill="currentcolor"
            stroke="currentcolor"
          />
        </svg>
      </slot>
      <slot name="false">
        <svg
          aria-hidden="true"
          focusable="false"
          class="KG-Toggle__icon KG-Toggle__icon--cross"
          width="13"
          height="13"
          viewBox="0 0 13 13"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M11.167 0L6.5 4.667L1.833 0L0 1.833L4.667 6.5L0 11.167L1.833 13L6.5 8.333L11.167 13L13 11.167L8.333 6.5L13 1.833L11.167 0Z"
            fill="currentcolor"
          />
        </svg>
      </slot>
    </span>
    <slot 
      name="label" 
      :state="state"
    >
      {{ label }}
    </slot>
  </button>
</template>

<script setup lang="ts">
import { useTemplateRef, watch } from 'vue';
const toggle = useTemplateRef('toggle');
const state = defineModel<boolean>({default: false});

interface AccessibleKGToggleProps {
  disabled?: boolean;
  trueColor?: string;
  falseColor?: string;
  label?: string | undefined;
}

withDefaults(defineProps<AccessibleKGToggleProps>(), {
  disabled: false,
  trueColor: '#e3f5eb',
  falseColor: '#fbe4e2',
  label: undefined,
});

defineSlots<{
  true: () => unknown;
  false: () => unknown;
  label: (props: { state: boolean }) => unknown;
}>();

const emit = defineEmits<{
  'true': [],
  'false': [],
  'change': [state: boolean],
}>();

watch(state, (newState) => {
  if (newState) {
    emit('true');
  } else {
    emit('false');
  }
  emit('change', newState);
});

</script>

<style>
  /**
 * 1. Reset default <button> styles.
 */
  button.KG-Toggle {
    border: 0; /* 1 */
    padding: 0; /* 1 */
    background: transparent; /* 1 */
    font: inherit; /* 1 */
  }

  /**
 * 1. Vertically center the toggle and the label. `flex` could be used if a 
 *    block-level display is preferred.
 * 2. Make sure the toggle remains clean and functional even if the label is
 *    too wide to fit on one line. Thanks @jouni_kantola for the heads up!
 * 3. Grant a position context for the visually hidden and absolutely
 *    positioned input.
 * 4. Provide spacing between the toggle and the text regardless of layout
 *    direction. If browser support is considered insufficient, use
 *    a right margin on `.KG-Toggle__display` in LTR, and left margin in RTL.
 *    See: https://caniuse.com/flexbox-gap
 */
  .KG-Toggle {
    display: inline-flex; /* 1 */
    align-items: center; /* 1 */
    flex-wrap: wrap; /* 2 */
    position: relative; /* 3 */
    gap: 1ch; /* 4 */
  }

  /**
 * 1. Vertically center the icons and space them evenly in the available 
 *    horizontal space, essentially giving something like: [ ✔ ✗ ]
 * 2. Size the display according to the size of the handle. `box-sizing`
 *    could use `border-box` but the border would have to be considered
 *    in the `width` computation. Either way works.
 * 3. For the toggle to be visible in Windows High-Contrast Mode, we apply a
 *    thin semi-transparent (or fully transparent) border.
 *    Kind thanks to Adrian Roselli for the tip:
 *    https://twitter.com/aardrian/status/1379786724222631938?s=20
 * 4. Grant a position context for the pseudo-element making the handle.
 * 5. Give a pill-like shape with rounded corners, regardless of the size.
 * 6. The default state is considered unchecked, hence why this pale red is
 *    used as a background color.
 */
  .KG-Toggle__display {
    --offset: 0.25em;
    --diameter: 1.5em;
    --transition-duration: 250ms;

    display: inline-flex; /* 1 */
    align-items: center; /* 1 */
    justify-content: space-around; /* 1 */

    width: calc(var(--diameter) * 2 + var(--offset) * 2); /* 2 */
    height: calc(var(--diameter) + var(--offset) * 2); /* 2 */
    box-sizing: content-box; /* 2 */

    border: 0.1em solid rgb(0 0 0 / 0.2); /* 3 */

    position: relative; /* 4 */
    border-radius: 100vw; /* 5 */
    background-color: var(--kg-accessible-toggle-color__false); /* 6 */

    transition: var(--transition-duration);
    cursor: pointer;
  }

  /**
 * 1. Size the round handle according to the diameter custom property.
 * 2. For the handle to be visible in Windows High-Contrast Mode, we apply a
 *    thin semi-transparent (or fully transparent) border.
 *    Kind thanks to Adrian Roselli for the tip:
 *    https://twitter.com/aardrian/status/1379786724222631938?s=20
 * 3. Absolutely position the handle on top of the icons, vertically centered
 *    within the container and offset by the spacing amount on the left.
 * 4. Give the handle a solid background to hide the icon underneath. This
 *    could be dark in a dark mode theme, as long as it’s solid.
 */
  .KG-Toggle__display::before {
    content: '';

    width: var(--diameter); /* 1 */
    height: var(--diameter); /* 1 */
    border-radius: 50%; /* 1 */

    box-sizing: border-box; /* 2 */
    border: 0.1 solid rgb(0 0 0 / 0.2); /* 2 */

    position: absolute; /* 3 */
    z-index: 2; /* 3 */
    top: 50%; /* 3 */
    left: var(--offset); /* 3 */
    transform: translate(0, -50%); /* 3 */

    background-color: #fff; /* 4 */
    transition: inherit;
  }
  /*  The transition here is so the handle gently slides from one side to the other. This might be a little distracting or unsettling for some people, so it’s advised to disable this transition when the reduced motion is enabled. This could be done with the following snippet: */

  @media (prefers-reduced-motion: reduce) {
    .KG-Toggle__display {
      transition-duration: 0ms;
    }
  }

  .KG-Toggle__input {
    position: absolute;
    opacity: 0;
    width: 100%;
    height: 100%;
  }

  /**
 * 1. When the input is focused, provide the display the default outline
 *    styles from the browser to mimic a native control. This can be
 *    customised to have a custom focus outline.
 */
  .KG-Toggle:focus .KG-Toggle__display,
  .KG-Toggle__input:focus + .KG-Toggle__display {
    outline: 1px dotted #212121; /* 1 */
    outline: 1px auto -webkit-focus-ring-color; /* 1 */
  }

  /**
 * 1. When the toggle is interacted with with a mouse click (and therefore
 *    the focus does not have to be ‘visible’ as per browsers heuristics),
 *    remove the focus outline. This is the native checkbox’s behaviour where
 *    the focus is not visible when clicking it.
 */
  .KG-Toggle:focus:not(:focus-visible) .KG-Toggle__display,
  .KG-Toggle__input:focus:not(:focus-visible) + .KG-Toggle__display {
    outline: 0; /* 1 */
  }

  /**
 * 1. When the input is checked, change the display background color to a
 *    pale green instead. 
 */
  .KG-Toggle[aria-pressed='true'] .KG-Toggle__display,
  .KG-Toggle__input:checked + .KG-Toggle__display {
    background-color: var(--kg-accessible-toggle-color__true); /* 1 */
  }

  /**
 * 1. When the input is checked, slide the handle to the right so it covers
 *    the cross icon instead of the checkmark one.
 */
  .KG-Toggle[aria-pressed='true'] .KG-Toggle__display::before,
  .KG-Toggle__input:checked + .KG-Toggle__display::before {
    transform: translate(100%, -50%); /* 1 */
  }

  /**
 * 1. When the input is disabled, tweak the toggle styles so it looks dimmed 
 *    with less sharp colors, softer opacity and a relevant cursor.
 */
  .KG-Toggle[disabled] .KG-Toggle__display,
  .KG-Toggle__input:disabled + .KG-Toggle__display {
    opacity: 0.6; /* 1 */
    filter: grayscale(40%); /* 1 */
    cursor: not-allowed; /* 1 */
  }

  /**
 * 1. Flip the original position of the unchecked toggle in RTL.
 */
  [dir='rtl'] .KG-Toggle__display::before {
    left: auto; /* 1 */
    right: var(--offset); /* 1 */
  }

  /**
 * 1. Move the handle in the correct direction in RTL.
 */
  [dir='rtl'] .KG-Toggle[aria-pressed='true'] + .KG-Toggle__display::before,
  [dir='rtl'] .KG-Toggle__input:checked + .KG-Toggle__display::before {
    transform: translate(-100%, -50%); /* 1 */
  }
</style>
