


export const COLORMAPS = [
  'viridis',
  'plasma',
  'inferno',
  'magma',
  'cividis',
  'greys',
  'gray',
  'purples',
  'blues',
  'greens',
  'oranges',
  'reds',
  'rdylbu'
] as const;
export type Colormaps =  typeof COLORMAPS[number];
export type TypedNumberArray = Float32Array 
  | Float64Array 
  | Uint8Array 
  | Int16Array 
  | Int32Array;
