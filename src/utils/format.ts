import { D2R, fmtDegLat, fmtHours, H2R, R2D, R2H } from "@wwtelescope/astro";

// astro's formatSexagesimal floors each part and toFixed()s the remainder, so 44.97s prints as "44.0s".
// round to the printed step first, then nudge a quarter step up so the floors land on the right digits
function snap(value: number, precision: number): number {
  const step = 1 / (3600 * 10 ** precision);
  const n = Math.round(Math.abs(value) / step);
  return n === 0 ? 0 : Math.sign(value) * (n + 0.25) * step;
}

export function fmtRA(raRad: number, precision = 1): string {
  let hours = snap((((raRad * R2H) % 24) + 24) % 24, precision);
  if (hours >= 24) hours -= 24;
  return fmtHours(hours * H2R, "h ", "m ", precision, "s");
}

export function fmtDec(decRad: number, precision = 0): string {
  return fmtDegLat(snap(decRad * R2D, precision) * D2R, "° ", "′ ", precision) + "″";
}

/** degrees, or arcminutes below 1° */
export function fmtAngle(deg: number): string {
  return deg >= 1 ? `${deg.toFixed(2)}°` : `${(deg * 60).toFixed(2)}′`;
}
