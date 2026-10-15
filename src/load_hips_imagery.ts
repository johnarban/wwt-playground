// almagal's loader (src/wwt-helpers.ts, itself from this branch's first version of this file)
import { Imageset, HipsProperties, WWTControl } from "@wwtelescope/engine";
import { ImageSetType, BandPass, ProjectionType } from "@wwtelescope/engine-types";

// defined in the engine's imageset.js, missing from engine-types
const HEALPIX = 7 as ProjectionType;

// like wwtlib.Util.getHashCode, kept to 32 bits
function getHashCode(target: string) {
  let hash = 0;
  for (let i = 0; i < target.length; i++) {
    hash = (hash << 5) - hash + target.charCodeAt(i);
    hash |= 0;
  }
  return hash;
}

// obs_regime: "Radio" | "Millimeter" | "Infrared" | "Optical" | "UV" | "EUV" | "X-ray" | "Gamma-ray"
function regimeToBandPass(regime: string): BandPass | null {
  const r = regime.toLowerCase();
  if (r.includes("gamma")) return BandPass.gamma;
  if (r.includes("x-ray") || r.includes("xray")) return BandPass.xRay;
  if (r.includes("uv")) return BandPass.ultraviolet;
  if (r.includes("optical") || r.includes("visible")) return BandPass.visible;
  if (r.includes("infrared")) return BandPass.IR;
  if (r.includes("millimeter")) return BandPass.microwave;
  if (r.includes("radio")) return BandPass.radio;
  return null;
}

/**
 * The engine's HipsProperties downloads `properties` on construction, and only calls
 * its listener on success - so a timeout is the only way to see a failure.
 */
function waitForHipsProperties(props: HipsProperties, url: string, timeoutMs: number): Promise<HipsProperties> {
  return new Promise((resolve, reject) => {
    if (props.get_downloadComplete()) {
      resolve(props);
      return;
    }
    const timer = setTimeout(
      () => reject(new Error(`Getting HiPS properties for ${url} timed out after ${timeoutMs} ms`)),
      timeoutMs,
    );
    props.setDownloadCompleteListener(() => {
      clearTimeout(timer);
      resolve(props);
    });
  });
}

/**
 * Creates a sky Imageset from a HiPS service url (the folder that holds `properties` and `Norder*`).
 * Prefer a WTML with `Projection="Healpix"` (see public/hips_surveys.wtml) when the survey is known ahead of time -
 * the engine builds the HipsProperties itself on the first tile request. This is for urls only known at runtime.
 * HiPS standard: https://www.ivoa.net/documents/HiPS/20170519/REC-HIPS-1.0-20170519.pdf
 */
export async function hips2Imageset(url: string, name?: string, timeoutMs = 10000): Promise<Imageset> {
  const base = url.endsWith("/") ? url : `${url}/`;
  const hipsUrl = `${base}Norder{0}/Dir{1}/Npix{2}`;
  const iset = Imageset.create(
    name ?? base, // name: string                     , obs_title
    hipsUrl, // url: string                      ,
    ImageSetType.sky, // dataSetType: ImageSetType        ,
    BandPass.visible, // bandPass: BandPass               , obs_regime
    HEALPIX, // projection: ProjectionType       ,
    getHashCode(hipsUrl), // imageSetID: number               ,
    0, // baseLevel: number                ,
    1, // levels: number                   , hips_order
    null, // unused_tileSize: null            ,
    180.0, // baseTileDegrees: number          ,
    "png jpeg", // extension: string                , hips_tile_format
    false, // bottomsUp: boolean               ,
    "0123", // quadTreeMap: string              ,
    0.0, // centerX: number                  ,
    0.0, // centerY: number                  ,
    0.0, // rotation: number                 ,
    true, // sparse: boolean                  ,
    `${base}preview.jpg`, // thumbnailUrl: string             , may not exist
    false, // defaultSet: boolean              ,
    false, // elevationModel: boolean          ,
    1, // widthFactor: number              ,
    0, // offsetX: number                  ,
    0, // offsetY: number                  ,
    "", // creditsText: string              , obs_copyright, obs_description
    base, // creditsUrl: string               , obs_copyright_url
    "", // demUrl: string                   ,
    "", // altUrl: string                   ,
    1.0, // meanRadius: number               ,
    "Sky", // referenceFrame: string
  );

  // @ts-expect-error the constructor takes the imageset, 7.41's typings declare none
  const hipsProperties = await waitForHipsProperties(new HipsProperties(iset), base, timeoutMs);
  const props = hipsProperties.get_properties();

  // required keys: creator_did, obs_title, dataproduct_type, hips_version, hips_release_date,
  // hips_status, hips_tile_format, hips_order, hips_frame
  if (props.dataproduct_type?.toLowerCase() === "catalog") {
    throw new Error(`${base} is a catalog HiPS, not an image survey`);
  }
  iset.set_levels(Number(props.hips_order));
  // may be a space separated list. the engine picks png, then jpeg, then fits from it (HealpixTile._getHipsFileExtension)
  const format = props.hips_tile_format ?? "jpeg";
  if (format.trim() === "fits") {
    console.warn(`${base} only has fits tiles, which WWT may not render`);
  }
  iset.set_extension(format);
  iset.set_name(props.obs_title ?? name ?? base);
  iset.set_creditsText(props.obs_copyright ?? props.obs_description ?? "");
  if (props.obs_copyright_url) iset.set_creditsUrl(props.obs_copyright_url);
  const bandPass = props.obs_regime ? regimeToBandPass(props.obs_regime) : null;
  if (bandPass !== null) iset.set_bandPass(bandPass);

  // so the engine reuses these rather than downloading them again for the first tile
  iset.set_hipsProperties(hipsProperties);
  return iset;
}

/**
 * hips2Imageset + add it to the repository, so it can be added with
 * `store.addImageSetLayer({ url: iset.get_url(), mode: "preloaded", ... })`
 */
export async function loadHips(url: string, name?: string) {
  const iset = await hips2Imageset(url, name);
  WWTControl.addImageSetToRepository(iset);
  return iset;
}
