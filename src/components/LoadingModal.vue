<template>
  <transition name="fade">
    <div 
      v-show="show" 
      id="modal-loading" 
      class="modal"
    >
      <slot>
        <div class="container">
          <div 
            :style="{ backgroundImage: `url(${img})` }"
            class="spinner"
          ></div>
          
          <p>{{ loadingText }}</p>
        </div>
      </slot>
    </div>
  </transition>
</template>

<script setup lang="ts">
import { withDefaults } from 'vue';
withDefaults(defineProps<{ show?: boolean, loadingText?: string, img?: string }>(), {
  show: false,
  loadingText: 'Loading …',
  img: 'https://projects.cosmicds.cfa.harvard.edu/cds-website/misc/lunar_loader.gif',
});


</script>

<style scoped lang="less">

.modal {
  position: absolute;
  top: 0px;
  left: 0px;
  width: 100%;
  height: 100%;
  z-index: 100;
  color: #fff;
  background-color: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
}

#modal-loading {
  background-color: #000;
  .container {
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: center;
    .spinner {
      background-image: url("");
      background-repeat: no-repeat;
      background-size: contain;
      width: 3rem;
      height: 3rem;
    }
    p {
      margin: 0 0 0 1rem;
      padding: 0;
      font-size: 150%;
    }
  }
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s;
}
.fade-enter,
.fade-leave-to {
  opacity: 0;
}
</style>
