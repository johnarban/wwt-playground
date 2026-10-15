import type { FitsDataset } from "./types";

// the FITS files are not in git; they load from johnarban/data_repo (raw.githubusercontent sends CORS *)
const DATA = "https://raw.githubusercontent.com/johnarban/data_repo/main";

export const DATASETS: FitsDataset[] = [
  {
    id: "l1478-13co",
    name: "L 1478 (13CO)",
    url: `${DATA}/13CO_final.vscale.fits`,
    colormap: "inferno",
    range: [0, 1],
    note: "13CO(2-1) velocity cube, 364×181×116, 30.6 MB",
  },
  {
    id: "orion-ak",
    name: "Orion (Planck A_K)",
    // made by reproject_orion.py
    url: `${DATA}/Orion_TAU353_reprojected.fits`,
    colormap: "inferno",
    note: "Planck τ353 → A_K, RA/Dec TAN, 1067×1093",
  },
];
