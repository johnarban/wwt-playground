import { ref, watch, Ref }  from 'vue';
import { ImageSetLayer, Imageset, WWTControl } from '@wwtelescope/engine';
import { removeTilesForImageset } from './edit_tile_cache';
import { ImageSetType, BandPass,ProjectionType } from "@wwtelescope/engine-types";


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

// Util.getHashCode
const getHashCode = function (target) {
  let hash = 0;
  if (!target.length) {
    return hash;
  }
  for (let i = 0; i < target.length; i++) {
    const c = target.charCodeAt(i);
    hash = ((hash << 5) - hash) + c;
  }
  return hash;
};


export interface CreateStudyImagesetOptions {
  raDeg?: number,
  decDeg?: number,
  rotationDeg?: number,
  offsetX?: number,
  offsetY?: number,
  baseTileDegrees?: number,
  name?: string,
  creditsText?: string,
  creditsUrl?: string,
}
export function createStudyImageset(url: string, options?: CreateStudyImagesetOptions): Imageset {
  return Imageset.create(
    options?.name ?? 'test-imageset', // name: string,
    url, // url: string,
    ImageSetType.sky, // dataSetType: ImageSetType,
    BandPass.visible, // bandPass: BandPass,
    ProjectionType.skyImage, // projection ProjectionType.healpix defined in imageset.js but not on the type, // ProjectionType,
    getHashCode(url), // imageSetID: number,
    0, // baseLevel: number,
    0, // levels: number,
    null, // unused_tileSize: null,
    0.0004404218362, // baseTileDegrees: number,
    'png jpg jpeg', // extension: string,
    false, // bottomsUp: boolean,
    '', // quadTreeMap: string,
    options?.raDeg ?? 0.0, // centerX: number,
    options?.decDeg ?? 0.0, // centerY: number,
    options?.rotationDeg ?? 0.0, // rotation: number,
    false, // sparse: boolean,
    'https://cdn.worldwidetelescope.org/wwtweb/thumbnail.aspx?name=test', // thumbnailUrl: string,
    false, // defaultSet: boolean,
    false, // elevationModel: boolean,
    1, // widthFactor: number,
    options?.offsetX ?? 0.0, // offsetX: number,
    options?.offsetX ?? 0.0, // offsetY: number,
    options?.creditsText ?? 'No Credit Text Provided', // creditsText: string,
    options?.creditsUrl ?? 'No Credit Url Provided', // creditsUrl: string,
    '', // demUrl: string,
    '', // altUrl: string,
    1.0, // meanRadius: number,
    'Sky', // referenceFrame: string
  );
  
  
}

