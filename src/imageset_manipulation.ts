import { ref, watch, Ref }  from 'vue';
import { ImageSetLayer, Imageset, WWTControl } from '@wwtelescope/engine';
import { removeTilesForImageset } from './edit_tile_cache';

export function useImageSetManipulation(layer: Ref<ImageSetLayer | null>, update = true) {
  const rotationDegrees = ref(0);
  const offsetX = ref(0);
  const offsetY = ref(0);
  const scale = ref(1);

  const getOriginalLayerSettings = () => {
    if (!layer.value) return null;
    const iset = layer.value.get_imageSet() as Imageset;
    return {
      centerX: iset.get_centerX(),
      centerY: iset.get_centerY(),
      offsetX: iset.get_offsetX(),
      offsetY: iset.get_offsetY(),
      rotation: iset.get_rotation(),
      baseDegreesPerTile: iset.get_baseTileDegrees(),
    };
  };
  const originalLayerSettings = ref(getOriginalLayerSettings());

  function updateImageSet() {
    if (!update) return;
    if (!layer.value || !originalLayerSettings.value) return;

    const iset = layer.value.get_imageSet() as Imageset;

    layer.value.version = (layer.value.version ?? 0) + 1;
    layer.value.set_overrideDefaultLayer(true);

    const originalSettings = originalLayerSettings.value;
    const newCenterX = originalSettings.centerX + offsetX.value;
    const newCenterY = originalSettings.centerY + offsetY.value;
    const newBaseDegreesPerTile = originalSettings.baseDegreesPerTile * scale.value;
    const newRotationDeg = originalLayerSettings.value.rotation + rotationDegrees.value;
    
    iset.set_baseTileDegrees(newBaseDegreesPerTile);
    iset.set_centerX(newCenterX);
    iset.set_centerY(newCenterY);
    iset.set_rotation(newRotationDeg);
    removeTilesForImageset(iset);

    // i don't think we really need this
    WWTControl.singleton.renderOneFrame();
  }

  watch(() => layer.value, () => {
    originalLayerSettings.value = getOriginalLayerSettings();
    updateImageSet();
  });
  watch([rotationDegrees, offsetX, offsetY, scale], updateImageSet);

  return {
    angle: rotationDegrees,
    offsetX,
    offsetY,
    scale,
    originalLayerSettings
  };
}
