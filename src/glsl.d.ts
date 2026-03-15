/**
 * https://stackoverflow.com/questions/48741570/how-can-i-import-glsl-as-string-in-typescript
 * but
 * https://medium.com/@jarekmyjak/how-to-use-glsl-shader-files-with-typescript-c1d50fc72244
 * says, vite will handle this already, but useing ?raw
 * This is true, but let's keep these anyway so we can act like
 * we know what we're doing. 
 * who the heck is "we"!!!!!?????!??!?!?!?
*/
declare module '*.glsl' {
  const value: string;
  export default value;
}

declare module "*.vert" {
  const value: string;
  export default value;
}

declare module "*.frag" {
  const value: string;
  export default value;
}