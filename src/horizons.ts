import { SpaceTimeController, Planets, Vector3d } from "@wwtelescope/engine";
import { SolarSystemObjects } from "@wwtelescope/engine-types";
const FIVE_MINUTES = 5 * 60 * 1000;
const D2S = 24 * 60 * 60;


/** relative to normal ecliptic coordinates, (used by spreadsheetlayer)
 * this returns (X, Z, Y)
**/
function correctionVector(jd: number, coordinateReferenceFrame: SolarSystemObjects, wwtReferenceFrame: SolarSystemObjects) {
  // const sun = Planets.getPlanet3dLocationJD(SolarSystemObjects.sun, jd);
  const coordRef = Planets.getPlanet3dLocationJD(coordinateReferenceFrame, jd);
  const trackingRef = Planets.getPlanet3dLocationJD(wwtReferenceFrame, jd);
  return Vector3d.subtractVectors(trackingRef,coordRef); // returns a vector ordered x, z, y
}

export async function loadHorizonsVectorsForWwt(url: string, horizonsCenter = SolarSystemObjects.earth, wwtTrackingObject = SolarSystemObjects.moon): Promise<string> {
  const rawText = await fetch(url).then(r => r.text());
  return parseHorizonsVectorsForWwt(rawText, horizonsCenter, wwtTrackingObject);
}


export function parseHorizonsVectorsForWwt(rawText: string, horizonsCenter = SolarSystemObjects.earth, wwtTrackingObject = SolarSystemObjects.moon): string {
  const lines = rawText.split(/\r?\n/);
  const start = lines.findIndex(l => l.trim() === "$$SOE");
  const end   = lines.findIndex(l => l.trim() === "$$EOE");
  const rows  = lines.slice(start + 1, end).map(l => {
    const values = l.split(",").slice(0, 6).map(v => v.trim());
    // const tbd = new Date(values[1]);
    // values.splice(2,1);
    const deltaT = +values.splice(2,1); // TBD - UT
    const jd = +values[0] - (deltaT / D2S);
    const time = SpaceTimeController.julianToUtc( jd );
    const ut = new Date(Date.UTC(
      time.getFullYear(),
      time.getMonth(),
      time.getDate(),
      time.getHours(),
      time.getMinutes(),
      time.getMilliseconds(),
    ));
    // console.log(deltaT);
    // const ut = new Date(tbd.getTime() - (+deltaT * 1000));
    // transform date to utc
    values[1] = `${ut.toISOString()}`;
    
    values.push(`${(new Date(ut.getTime() + FIVE_MINUTES).toISOString())}`);
    
    // if they are not the same apple the correct frame shift
    if (horizonsCenter !== wwtTrackingObject) {
      // Ecliptic coordinates are: X=vernal equinox, X-Y plane=ecliptic plane, Z=ecliptic north pole.
      // WWT's 3d ecliptic: x=vernal equinox, y=ecliptic north pole, x-z plane =ecliptic plane.
      // So Horizons (X, Y, Z) => WWT (X, Z, Y).
      let xzyVector = Vector3d.create(+values[2], +values[4], +values[3]);
      xzyVector = Vector3d.subtractVectors(xzyVector, correctionVector(jd, horizonsCenter, wwtTrackingObject));
      values[2] = `${xzyVector.x}`;
      values[3] = `${xzyVector.z}`;
      values[4] = `${xzyVector.y}`;
    }
    
    return values.join(",");
  }
  );
  return ["jdtdb,date,x,y,z,end", ...rows].join("\r\n");
}
