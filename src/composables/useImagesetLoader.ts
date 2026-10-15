import { shallowRef, ref, watch } from "vue";
import { engineStore } from "@wwtelescope/engine-pinia";
import { Imageset, ImageSetLayer, WWTControl } from "@wwtelescope/engine";

interface ImagesetLoaderOptions {
  goTo?: boolean;
  onNewLayer?: (layer: ImageSetLayer, index: number) => void;
}

/**
 * Add an Imageset built in code (not from a WTML) to the repository and give it a layer.
 * The useWtml counterpart for a single imageset. `ready` resolves with the layer.
 */
export function useImagesetLoader(imageset: Imageset, options?: ImagesetLoaderOptions) {
  let resolver: ((value: ImageSetLayer) => void) | null = null;
  const ready = new Promise<ImageSetLayer>((resolve) => {
    resolver = resolve;
  });

  const imagesetLayer = shallowRef<ImageSetLayer | null>(null);
  const opacity = ref(1);
  const store = engineStore();

  store.waitForReady().then(async () => {
    if (imageset === null) {
      console.warn("provided imageset is null");
      return;
    }
    const iset = WWTControl.addImageSetToRepository(imageset);

    try {
      imagesetLayer.value = await store.addImageSetLayer({
        url: iset.get_url(),
        mode: "autodetect",
        name: iset.get_name(),
        goto: options?.goTo ?? false,
      });
    } catch (error) {
      console.error("Failed to load imageset from", error, iset);
      return;
    }

    if (options?.onNewLayer) options.onNewLayer(imagesetLayer.value, 0);

    resolver?.(imagesetLayer.value);
  });

  const show = () => {
    if (!imagesetLayer.value) {
      console.warn(`No layer found for imageset ${imageset.get_name()}`);
      return;
    }
    if (!imagesetLayer.value.get_enabled()) imagesetLayer.value.set_enabled(true);
    imagesetLayer.value.set_opacity(opacity.value);
  };

  const hide = () => {
    if (!imagesetLayer.value) return;
    imagesetLayer.value.set_opacity(0);
  };

  watch(opacity, (newOpacity) => {
    if (imagesetLayer.value) {
      imagesetLayer.value.set_opacity(newOpacity);
    }
  });

  return {
    ready,
    imageset,
    imagesetLayer,
    show,
    hide,
    opacity,
  };
}
