import { onMounted, onUnmounted} from 'vue';

export function watchWwtContainerSize(wwtContainerSelector: string, parentContainerSelector: string) {
  let resizeObserver: ResizeObserver | null = null;

  onMounted(() => {
    const container = document.querySelector(wwtContainerSelector) as HTMLElement;
    const parentContainer = document.querySelector(parentContainerSelector) as HTMLElement;

    if (container && parentContainer) {

      // Create a ResizeObserver to watch for changes in the parent container's size
      resizeObserver = new ResizeObserver(([entry]) => {
        const { width, height } = entry.contentRect;
        // Update the WWT container's size to match the parent container
        container.style.width = `${width}px`;
        container.style.height = `${height}px`;
      });
      resizeObserver.observe(parentContainer);
    }
  });

  onUnmounted(() => {
    if (resizeObserver) {
      resizeObserver.disconnect();
    }
  });

}   