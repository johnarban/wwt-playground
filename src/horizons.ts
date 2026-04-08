export async function loadHorizonsVectorsForWwt(url: string): Promise<string> {
  const rawText = await fetch(url).then(r => r.text());
  return parseHorizonsVectorsForWwt(rawText);
}

const FIVE_MINUTES = 5 * 60 * 1000;
const D2S = 24 * 60 * 60;
import { SpaceTimeController } from "@wwtelescope/engine";

export function parseHorizonsVectorsForWwt(rawText: string): string {
  const lines = rawText.split(/\r?\n/);
  const start = lines.findIndex(l => l.trim() === "$$SOE");
  const end   = lines.findIndex(l => l.trim() === "$$EOE");
  const rows  = lines.slice(start + 1, end).map(l => {
    const values = l.split(",").slice(0, 6).map(v => v.trim());
    // const tbd = new Date(values[1]);
    // values.splice(2,1);
    const deltaT = +values.splice(2,1); // TBD - UT
    const time = SpaceTimeController.julianToUtc(+values[0] - (deltaT / D2S) );
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
    
    return values.join(",");
  }
  );
  return ["jdtdb,date,x,y,z,end", ...rows].join("\r\n");
}
