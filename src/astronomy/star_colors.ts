export const starTeff = [
  2300, 2400, 2500, 2600, 2700, 2800, 2900, 3000, 3100, 3200, 3300, 3400, 3500,
  3600, 3700, 3800, 3900, 4000, 4100, 4200, 4300, 4400, 4500, 4600, 4700, 4800,
  4900, 5000, 5100, 5200, 5300, 5400, 5500, 5600, 5700, 5800, 5900, 6000, 6100,
  6200, 6300, 6400, 6500, 6600, 6700, 6800, 6900, 7000, 7200, 7400, 7600, 7800,
  8000, 8200, 8400, 8600, 8800, 9000, 9200, 9400, 9600, 9800, 10000, 10200,
  10400, 10600, 10800, 11000, 11200, 11400, 11600, 11800, 12000
];
export const starR = [
  255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255,
  255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255,
  255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 252, 247, 242,
  238, 233, 229, 221, 214, 208, 202, 197, 192, 187, 183, 179, 175, 171, 168,
  165, 162, 160, 157, 155, 153, 150, 148, 147, 145, 143, 141, 140
];
export const starG = [
  104, 110, 115, 121, 126, 132, 137, 141, 146, 151, 155, 159, 164, 168, 172,
  175, 179, 183, 186, 190, 193, 196, 199, 202, 205, 208, 210, 213, 216, 218,
  221, 223, 225, 228, 230, 232, 234, 236, 238, 240, 242, 243, 243, 240, 237,
  234, 231, 228, 223, 218, 214, 210, 206, 203, 199, 196, 194, 191, 188, 186,
  184, 182, 180, 178, 176, 174, 173, 171, 170, 168, 167, 166, 164
];
export const starB = [
  19, 23, 27, 32, 36, 41, 46, 51, 56, 62, 67, 73, 79, 85, 91, 97, 103, 109, 115,
  121, 128, 134, 140, 146, 152, 159, 165, 171, 177, 183, 189, 195, 201, 207,
  212, 218, 224, 230, 235, 241, 246, 252, 255, 255, 255, 255, 255, 255, 255,
  255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255,
  255, 255, 255, 255, 255, 255, 255, 255, 255
];
export const starBV = [
  2.19, 2.16, 2.15, 2.14, 2.1, 2.02, 1.96, 1.88, 1.72, 1.65, 1.59, 1.54, 1.52,
  1.5, 1.47, 1.44, 1.41, 1.36, 1.34, 1.29, 1.24, 1.18, 1.13, 1.09, 1.05, 1.0,
  0.96, 0.92, 0.88, 0.84, 0.8, 0.77, 0.72, 0.7, 0.66, 0.64, 0.61, 0.58, 0.55,
  0.52, 0.5, 0.47, 0.45, 0.43, 0.4, 0.38, 0.35, 0.33, 0.3, 0.27, 0.25, 0.2,
  0.17, 0.15, 0.12, 0.1, 0.07, 0.06, 0.04, 0.03, 0.01, -0.01, -0.02, -0.04,
  -0.05, -0.06, -0.07, -0.08, -0.08, -0.09, -0.09, -0.1, -0.1
];
export const starHex = [
  '#ff6813','#ff6e17','#ff731b','#ff7920','#ff7e24','#ff8429','#ff892e',
  '#ff8d33','#ff9238','#ff973e','#ff9b43','#ff9f49','#ffa44f','#ffa855',
  '#ffac5b','#ffaf61','#ffb367','#ffb76d','#ffba73','#ffbe79','#ffc180',
  '#ffc486','#ffc78c','#ffca92','#ffcd98','#ffd09f','#ffd2a5','#ffd5ab',
  '#ffd8b1','#ffdab7','#ffddbd','#ffdfc3','#ffe1c9','#ffe4cf','#ffe6d4',
  '#ffe8da','#ffeae0','#ffece6','#ffeeeb','#fff0f1','#fff2f6','#fff3fc',
  '#fcf3ff','#f7f0ff','#f2edff','#eeeaff','#e9e7ff','#e5e4ff','#dddfff',
  '#d6daff','#d0d6ff','#cad2ff','#c5ceff','#c0cbff','#bbc7ff','#b7c4ff',
  '#b3c2ff','#afbfff','#abbcff','#a8baff','#a5b8ff','#a2b6ff','#a0b4ff',
  '#9db2ff','#9bb0ff','#99aeff','#96adff','#94abff','#93aaff','#91a8ff',
  '#8fa7ff','#8da6ff','#8ca4ff'
];

// Preprocess arrays to create a map for quick lookup of exact values
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const starTeffMap = new Map<number, number>(
  starTeff.map((teff, index) => [teff, index])
);
const starBvMap = new Map<number, number>(
  starBV.map((bv, index) => [bv, index])
);

// function binary search, for reverse ordered array
function binarySearchReverse(arr: number[], x: number): number {
  let low = 0;
  let high = arr.length - 1;
  while (low < high) {
    const mid = Math.floor((low + high) / 2);
    if (arr[mid] < x) {
      high = mid;
    } else {
      low = mid + 1;
    }
  }
  return low;
}


// lerp
function lerp(x: number, x0: number, y0: number, x1: number, y1: number): number {
  if (x1 === x0) {
    return (y0 + y1) / 2;
  }
  return y0 + (x - x0) * (y1 - y0) / (x1 - x0);
}

function rgbToHex(r: number, g: number, b: number): string {
  return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}

// get color of star from B-V
export function getStarColor(bv: number): string {
  const exactIndex = starBvMap.get(bv);
  let r = 0;
  let g = 0;
  let b = 0;
  let i = 0;
  if (exactIndex !== undefined) {
    i = exactIndex;
    r = starR[i];
    g = starG[i];
    b = starB[i];
  } else if (bv >= starBV[0]) {
    r = starR[0];
    g = starG[0];
    b = starB[0];
  } else if (bv <= starBV[starBV.length - 1]) {
    i = starBV.length - 1;
    r = starR[i];
    g = starG[i];
    b = starB[i];
  } else {
    i = binarySearchReverse(starBV, bv);
    r = Math.round(lerp(bv, starBV[i], starR[i], starBV[i + 1], starR[i + 1]));
    g = Math.round(lerp(bv, starBV[i], starG[i], starBV[i + 1], starG[i + 1]));
    b = Math.round(lerp(bv, starBV[i], starB[i], starBV[i + 1], starB[i + 1]));
  }

  // check if nan if so log out the values
  if (isNaN(r) || isNaN(g) || isNaN(b)) {
    console.log(bv, r, g, b);
  }
  // return 'rgb(' + r + ',' + g + ',' + b + ')';
  return rgbToHex(r, g, b);
}

function _fluxScale(mag: number): number {
  const maxRad = 25;
  const minRad = 2;
  const minMag = -1.33;
  const c = (maxRad - minRad) / Math.pow(10,-0.4 * minMag);
  return c * Math.pow(10, -0.4 * mag) + minRad;
}

function sigmoidScale(x, x0, xmin, max = 25, min = 5, steepness = 1): number {
  const xmax = -1.33; // magnitude of Sirus, the brightest star
  const g = 1 + Math.exp((xmax - x0) / steepness);
  const g2 = 1 + Math.exp((xmin - x0) / steepness);
  const c = (max - min) / ( (1 / g) - (1 / g2) );
  const b = max - c / g;
  return c / (1 + Math.exp((x - x0) / steepness)) + b;
}

export function magToRadius(mag: number | null | undefined): number | null {
  if (mag === null || mag === undefined) {
    return null;
  }
  return sigmoidScale(mag, 4, 6, 25, 3, 1);
}