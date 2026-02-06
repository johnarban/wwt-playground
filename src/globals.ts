/* eslint-disable @typescript-eslint/no-explicit-any */

// Globally available functions

// arguablly a very bad, very unsafe thing to do -- no protection against name collisions
type WindowKeys = Extract<keyof Window, string>;
export function add2Window<K extends string>(id: K & Exclude<K, WindowKeys>, func: (...args: any[]) => any) {
  (window as any)[id] = func;
  console.log(`added ${id} to window namespace`);
}