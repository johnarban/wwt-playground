/* eslint-disable @typescript-eslint/no-explicit-any */
import { Imageset, HipsProperties, WWTControl } from "@wwtelescope/engine";
import { ImageSetType, BandPass,ProjectionType } from "@wwtelescope/engine-types";


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

export async function loadHips(url: string, name: string) {
  const base = url.endsWith('/') ? url : `${url}/`;
  const hipsUrl = `${base}Norder{0}/Dir{1}/Npix{2}`;
  const iset = Imageset.create(
    name, // name: string,
    hipsUrl, // url: string,
    ImageSetType.sky, // dataSetType: ImageSetType,
    BandPass.visible, // bandPass: BandPass,
    7 as ProjectionType, // projection ProjectionType.healpix defined in imageset.js but not on the type, // ProjectionType,
    getHashCode(hipsUrl), // imageSetID: number,
    0, // baseLevel: number,
    3, // levels: number,
    null, // unused_tileSize: null,
    180.0, // baseTileDegrees: number,
    'png jpg jpeg fits', // extension: string,
    false, // bottomsUp: boolean,
    '0123', // quadTreeMap: string,
    0.0, // centerX: number,
    0.0, // centerY: number,
    0.0, // rotation: number,
    true, // sparse: boolean,
    `${base}preview.jpg`, // thumbnailUrl: string,
    false, // defaultSet: boolean,
    false, // elevationModel: boolean,
    1, // widthFactor: number,
    0, // offsetX: number,
    0, // offsetY: number,
    'A HIPS Layer', // creditsText: string,
    base, // creditsUrl: string,
    '', // demUrl: string,
    '', // altUrl: string,
    1.0, // meanRadius: number,
    'Sky', // referenceFrame: string
  );
  
  // @ts-expect-error it actually does accept a single value, and Imageset
  const hipsProperties: any = new HipsProperties(iset);
  
  // we need to wait for the properties to be ready
  await new Promise((resolve) => {
    setTimeout(() => {
      if (hipsProperties._downloadComplete) {
        resolve(hipsProperties);
      }
    }, 100);
  });
  
  // Set values from the HiPS properties
  /**
   * Required HIPs keys
   * creator_did, obs_title, dataproduct_type
   * hips_version, hips_release_date, hips_status
   * hips_tile_format, hips_order, hips_frame
   * 
   */
  iset.set_levels(hipsProperties._properties.hips_order);
  if (hipsProperties._properties.hips_tile_format === 'fits') {
    console.error("WWT may not fully support fits formatted Hips tiles");
  }
  iset.set_extension(hipsProperties._properties.hips_tile_format.replace('fits','').trim());
  iset.set_name(hipsProperties._properties.obs_title ?? name);
  if (hipsProperties._properties.obs_description) {
    iset.set_creditsText(hipsProperties._properties.obs_description);
  }
  // @ts-expect-error set_hipsProperties exists
  iset.set_hipsProperties(hipsProperties); // accessible via iset.get_hipsProperties()
  
  WWTControl.addImageSetToRepository(iset);
  
  return iset;
}

