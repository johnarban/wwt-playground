import { ref, watch, onUnmounted, type Ref, computed, toValue, toRef } from 'vue';
import type { WWTEngineStore, Degree } from '../types';
import { waitForWWTReady } from '../wwt-hacks';


export function useTrackedPosition(_ra: Ref<Degree> | Degree, _dec: Ref<Degree> | Degree, store: WWTEngineStore)  {
  const ready = ref(false);
  const resizeObserver = ref<ResizeObserver | null>(null);
  const screenPoint = ref({ x: 0, y: 0 });
  
  let updatePosition = () => {
    console.warn('WWT Engine is not ready yet.');
  };
  
  waitForWWTReady(store).then(() => {
    ready.value = true;
    updatePosition = () => {
      if (!ready.value) {
        console.warn('WWT Engine is not ready yet.');
        return;
      }
      screenPoint.value = store.findScreenPointForRADec(worldPoint.value);
    };
    
    const parentElement = store.$wwt.inst.ctl.canvas as HTMLElement;
    if (parentElement) {
      resizeObserver.value = new ResizeObserver(() => {
        updatePosition();
      });
      resizeObserver.value.observe(parentElement);
    }
    
  });
  
  
  
  const ra = toRef(_ra) as Ref<Degree>;
  const dec = toRef(_dec) as Ref<Degree>;
  
  const worldPoint = computed(() => {
    return { ra: toValue(ra) as Degree, dec: toValue(dec) as Degree };
  });
  
  
  
  

  

  watch(() => [store.raRad, store.decRad, store.zoomDeg, store.rollRad], () => {
    updatePosition();
  });
  
  watch([ra, dec], () => {
    console.log(`Updating position for RA: ${ra.value}, Dec: ${dec.value}`);
    updatePosition();
  });
  
  
  updatePosition();
  
  onUnmounted(() => {
    resizeObserver.value?.disconnect();
  });
 
  return { screenPoint, worldPoint, ra, dec };
}
