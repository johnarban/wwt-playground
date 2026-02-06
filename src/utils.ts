// useful utilities and helpers

function zpad(v: number, n = 2, s = '0') {
  return v.toString().padStart(n,s);
}
/**
 * Get degrees, (arc)minutes, (arc)seconds for a decimal degree
 * @returns:  {d, m, s}
 */
export function d2dms(d: number) {
  const deg = Math.floor(d);
  const min = Math.floor(60 * (d - deg));
  const sec = ((60 * (d - deg)) - min) * 60;
  return { d: deg, m: min, s: sec};
}


/**
 * Get hours, minutes, seconds for a decimal degree
 * @returns:  {h, m, s}
 */
export function h2hms(h: number) {
  const hour = Math.floor(h);
  const min = Math.floor(60 * (h - hour));
  const sec = ((60 * (h - hour)) - min) * 60;
  return { h: hour, m: min, s: sec};
}

/**
 * Get degrees, (arc)minutes, (arc)seconds for decimal hours
 * @returns:  {d, m, s}
 */
export function h2dms(h: number) {
  return d2dms(h * 15);
}

/**
 * Get hours, minutes, seconds for a decimal degree
 * @returns:  {h, m, s}
 */
export function d2hms(d: number) {
  return h2hms(d / 15);
}

/**
 * Conver decimal degrees to a Hour Minute Second string
 */
export function d2hmsString(d: number) {
  const {h, m, s} = d2hms(d);
  return `${zpad(h)} ${zpad(m)} ${s.toFixed(2)}`;
}
/** 
 * Convert decimal degrees to a +Degree (arc)Minute (arc)second string
*/
export function d2dmsString(v: number) {
  const {d, m, s} = d2dms(v);
  const sign = v < 0 ? '-' : '+'; 
  return `${sign}${zpad(Math.abs(d))} ${zpad(m)} ${s.toFixed(2)}`;
}

// {h,m,s} -> decimal hours
export function hms2h(val: {h: number , m: number, s: number}) {
  return val.h + val.m/60 + val.s/3600;
}
