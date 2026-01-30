/* eslint-disable @typescript-eslint/naming-convention */

// 7085 Franksienkiewicz (1991 PE)
import { ReferenceFrame, EOE, LayerManager, LayerMap, Settings } from "@wwtelescope/engine";
import { ReferenceFrameTypes, ReferenceFrames, AltUnits } from "@wwtelescope/engine-types";
import { AU_KM, AU_M } from "./constants";

// JPL Small-Body Database elements interface and class
export interface JPLElementsType {
  eccentricity: number; // e
  semiMajorAxis: number; // a in au
  perihelionDistance: number; // q in au: a*(1-e)
  inclination: number; // i in deg
  longitudeOfAscendingNode: number; // node/Ω in deg
  argumentOfPerihelion: number; // peri/ω in deg
  meanAnnomoly: number; // M in deg
  timeOfPerihelion: number; // tp Barycentric Dynamical Time (TDB) JD
  siderealOrbitalPeriod: number; // epoch of osculation in JD
  meanMotion: number; // mean daily motion in deg/day
  aphelionDistance: number; // Q in au : a*(1+e)
  epoch: number; // Barycentric Dynamical Time (TDB) JD
  
  // optional body properties
  diameter?: number; // in km
  rotationalPeriod?: number; // in hours
  absoluteMagnitude?: number; // H
  geometricAlbedo?: number; // unitless
}

export class JPLElements implements JPLElementsType {
  eccentricity!: number;
  semiMajorAxis!: number;
  perihelionDistance!: number;
  inclination!: number;
  longitudeOfAscendingNode!: number;
  argumentOfPerihelion!: number;
  meanAnnomoly!: number;
  timeOfPerihelion!: number;
  siderealOrbitalPeriod!: number;
  meanMotion!: number;
  aphelionDistance!: number;
  epoch!: number;

  diameter?: number;
  rotationalPeriod?: number;
  absoluteMagnitude?: number;
  geometricAlbedo?: number;

  constructor(init?: Partial<JPLElementsType>) {
    Object.assign(this, init);
  }
  
  // convenience getters (matches WWT nomenclature)
  get e() { return this.eccentricity; }
  get a() { return this.semiMajorAxis; }
  get q() { return this.perihelionDistance; }
  get i() { return this.inclination; }
  get node() { return this.longitudeOfAscendingNode; } // Ω
  get omega() { return this.longitudeOfAscendingNode; }    // optional alias
  get peri() { return this.argumentOfPerihelion; }     // ω
  get w() { return this.argumentOfPerihelion; }        // optional alias
  get M() { return this.meanAnnomoly; }
  get tp() { return this.timeOfPerihelion; }
  get n() { return this.meanMotion; }
  get Q() { return this.aphelionDistance; }
}

export interface AsteroidDefinition {
  name: string;
  designation: string;
  epoch: number; // JD
  eoe: JPLElements;
}

/**
 * Parses a Horizons-style osculating elements block into JPLElements.
 * 
  Symbol meaning:

    JDTDB    Julian Day Number, Barycentric Dynamical Time
      EC     Eccentricity, e
      QR     Periapsis distance, q (km)
      IN     Inclination w.r.t X-Y plane, i (degrees)
      OM     Longitude of Ascending Node, OMEGA, (degrees)
      W      Argument of Perifocus, w (degrees)
      Tp     Time of periapsis (Julian Day Number)
      N      Mean motion, n (degrees/sec)
      MA     Mean anomaly, M (degrees)
      TA     True anomaly, nu (degrees)
      A      Semi-major axis, a (km)
      AD     Apoapsis distance (km)
      PR     Sidereal orbit period (sec)
 */
export function parseOsculatingBlockToJPLElements(block: string): JPLElements {
  const lines = block
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean);

  if (lines.length < 5) {
    throw new Error("Osculating block is incomplete");
  }

  const [jdLine, l1, l2, l3, l4] = lines as [string, string, string, string, string];

  // Common regex patterns for Horizons osculating elements
  const SCIENTIFIC_NUMBER = String.raw`[\d.E+-]+`; // Matches scientific notation numbers
  const WHITESPACE = String.raw`\s*`; // Optional whitespace
  
  const fieldPattern = (label: string): RegExp => {
    return new RegExp(`${label}${WHITESPACE}(${SCIENTIFIC_NUMBER})`);
  };

  const read = (pattern: RegExp, text: string, label: string): number => {
    const value = parseFloat(text.match(pattern)?.[1] ?? "NaN");
    if (Number.isNaN(value)) {
      throw new Error(`Missing ${label} in osculating block`);
    }
    return value;
  };

  // Input units from Horizons: KM-S, deg, Julian Day Number (Tp)
  const jd = read(/^(\d+\.\d+)/, jdLine, "JDTDB"); // Julian Day (TDB)
  
  const ec = read(fieldPattern("EC="), l1, "EC");     // eccentricity (unitless)
  const qrKm = read(fieldPattern("QR="), l1, "QR");   // perihelion distance (km)
  const incDeg = read(fieldPattern("IN="), l1, "IN"); // inclination (deg)

  const omDeg = read(fieldPattern("OM="), l2, "OM");  // longitude of ascending node (deg)
  const wDeg = read(fieldPattern("W ="), l2, "W");    // argument of perihelion (deg)
  const tpJd = read(fieldPattern("Tp="), l2, "Tp");   // time of perihelion (JD TDB)

  const nDegPerSec = read(fieldPattern("N ="), l3, "N");  // mean motion (deg/s)
  const maDeg = read(fieldPattern("MA="), l3, "MA");      // mean anomaly (deg)

  const aKm = read(fieldPattern("A ="), l4, "A");    // semi-major axis (km)
  const adKm = read(fieldPattern("AD="), l4, "AD");  // aphelion distance (km)
  const prSec = read(fieldPattern("PR="), l4, "PR"); // orbital period (s)

  // Convert Horizons units to JPLElements units
  const secondsPerDay = 86_400;
  const meanMotionDegPerDay = nDegPerSec * secondsPerDay; // deg/s → deg/day
  const periodDays = prSec / secondsPerDay;                // s → days
  
  const out = new JPLElements({
    eccentricity: ec,                      // unitless
    semiMajorAxis: aKm / AU_KM,           // km → AU
    perihelionDistance: qrKm / AU_KM,     // km → AU
    inclination: incDeg,                   // deg
    longitudeOfAscendingNode: omDeg,       // deg
    argumentOfPerihelion: wDeg,            // deg
    meanAnnomoly: maDeg,                   // deg
    timeOfPerihelion: tpJd,                // JD TDB
    siderealOrbitalPeriod: periodDays,     // days
    meanMotion: meanMotionDegPerDay,       // deg/day
    aphelionDistance: adKm / AU_KM,        // km → AU
    epoch: jd,                             // JD TDB
  });
  console.log("Parsed JPLElements from osculating block:", out);
  return out;
}

export const asteroidDefinitions: Record<number | string, AsteroidDefinition> = {
  // https://ssd.jpl.nasa.gov/tools/sbdb_lookup.html#/?sstr=franksienkiewicz
  7085: {
    name: "Franksienkiewicz",
    designation: "1991 PE",
    epoch: 2461000.5, // JD
    eoe: new JPLElements({
      eccentricity: 0.2533387806750991, // e
      semiMajorAxis: 3.100741687608352, // a in au
      inclination: 2.746114830368688, // i in deg
      longitudeOfAscendingNode: 121.2363072113608, // node/Ω in deg
      argumentOfPerihelion: 197.0037110781451, // peri/ω in deg
      meanAnnomoly: 120.168201538062, // M in deg
      // eslint-disable-next-line no-loss-of-precision
      timeOfPerihelion: 2460334.791856289684, // tp Barycentric Dynamical Time (TDB) JD
      siderealOrbitalPeriod: 1994.329021058084, // epoch of osculation in JD
      meanMotion: 0.1805118394200589, // mean daily motion in deg/day
      aphelionDistance: 3.886279805935501, // Q in au
      epoch: 2461000.5, // Barycentric Dynamical Time (TDB) JD
      // optional body properties
      diameter: 16.573, // in km
      rotationalPeriod: 3.615, // in hours
      absoluteMagnitude: 12.79, // H
      geometricAlbedo: 0.071, // unitless
    })
  },
  'frank' : {
    name: "Franksienkiewicz",
    designation: "1991 PE",
    epoch: 2461000.5, // JD
    eoe: parseOsculatingBlockToJPLElements(`2461000.500000000 = A.D. 2025-Nov-21 00:00:00.0000 TDB 
 EC= 2.533387807525261E-01 QR= 3.463495242190170E+08 IN= 2.746114830856594E+00
 OM= 1.212363071905519E+02 W = 1.970037110646961E+02 Tp=  2460334.791856191587
 N = 2.089257400211721E-06 MA= 1.201682015279498E+02 TA= 1.413290190615545E+02
 A = 4.638643541284855E+08 AD= 5.813791840379541E+08 PR= 1.723100274592869E+08`)
  },
  'Jupiter': {
    name: "Jupiter",
    designation: "Jupiter",
    epoch: 2461051.500000000, // JD
    eoe: parseOsculatingBlockToJPLElements(`2461051.500000000 = A.D. 2026-Jan-11 00:00:00.0000 TDB 
 EC= 4.836600969086237E-02 QR= 7.406168230947832E+08 IN= 1.303753097072399E+00
 OM= 1.005192737633649E+02 W = 2.735066827965420E+02 Tp=  2459965.640141142998
 N = 9.618341605792150E-07 MA= 9.023763794547298E+01 TA= 9.576992913995825E+01
 A = 7.782580599650443E+08 AD= 8.158992968353053E+08 PR= 3.742848972874997E+08`)
  },
  'Earth': {
    name: "Earth",
    designation: "Earth",
    epoch: 2461000.5, // JD
    eoe: parseOsculatingBlockToJPLElements(`2461000.500000000 = A.D. 2025-Nov-21 00:00:00.0000 TDB 
 EC= 1.729459436739474E-02 QR= 1.471360441715657E+08 IN= 3.165627927437963E-03
 OM= 1.717283136608077E+02 W = 2.895837866828079E+02 Tp=  2461042.572969460860
 N = 1.139293201313394E-05 MA= 3.185855008712533E+02 TA= 3.172530577984150E+02
 A = 1.497254857134407E+08 AD= 1.523149272553158E+08 PR= 3.159853842584039E+07`)
  },
  // should be flat in the the plane @ 4 au no inclination, etc, 0 eccentricity
  'TestAsteroid': {
    name: "TestAsteroid",
    designation: "TestAsteroid",
    epoch: 2461000.5, // JD
    eoe: new JPLElements({
      eccentricity: 0.8, // e
      semiMajorAxis: 10, // a in au
      inclination: 0.0, // i in deg
      longitudeOfAscendingNode: 0, // node/Ω in deg
      argumentOfPerihelion: 0, // peri/ω in deg
      meanAnnomoly: 0.0, // M in deg
      timeOfPerihelion: 2461000.5, // tp Barycentric Dynamical Time (TDB) JD
      meanMotion: (360.0/(365.25 * ((10)**1.5))), // mean daily motion in deg/day
      epoch: 2461000.5, // Barycentric Dynamical Time (TDB) JD
      // Not used
      siderealOrbitalPeriod: 24852.58, // epoch of osculation in JD
      aphelionDistance: 10 * (1 + 0.85), // Q in au
    })
  },
  'TestAsteroid2': {
    name: "TestAsteroid2",
    designation: "TestAsteroid2",
    epoch: 2461000.5, // JD
    eoe: new JPLElements({
      eccentricity: 0.8, // e
      semiMajorAxis: 10, // a in au
      inclination: 1.3 * 3.14/180, // i in deg
      longitudeOfAscendingNode: 0, // node/Ω in deg
      argumentOfPerihelion: 0, // peri/ω in deg
      meanAnnomoly: 0.0, // M in deg
      timeOfPerihelion: 2461000.5, // tp Barycentric Dynamical Time (TDB) JD
      meanMotion: (360.0/(365.25 * ((10)**1.5))), // mean daily motion in deg/day
      epoch: 2461000.5, // Barycentric Dynamical Time (TDB) JD
      // Not used
      siderealOrbitalPeriod: 24852.58, // epoch of osculation in JD
      aphelionDistance: 10 * (1 + 0.85), // Q in au
    })
  },
  'TestAsteroidX': {
    name: "TestAsteroidX",
    designation: "TestAsteroidX",
    epoch: 2461000.5, // JD
    eoe: new JPLElements({
      eccentricity: 0.8, // e
      semiMajorAxis: 10, // a in au
      inclination: 0.0, // i in deg
      longitudeOfAscendingNode: 180, // node/Ω in deg
      argumentOfPerihelion: 0, // peri/ω in deg
      meanAnnomoly: 0.0, // M in deg
      timeOfPerihelion: 2461000.5, // tp Barycentric Dynamical Time (TDB) JD
      meanMotion: (360.0/(365.25 * ((10)**1.5))), // mean daily motion in deg/day
      epoch: 2461000.5, // Barycentric Dynamical Time (TDB) JD
      // Not used
      siderealOrbitalPeriod: 24852.58, // epoch of osculation in JD
      aphelionDistance: 10 * (1 + 0.85), // Q in au
    })
  },
  'TestAsteroidY': {
    name: "TestAsteroidY",
    designation: "TestAsteroidY",
    epoch: 2461000.5, // JD
    eoe: new JPLElements({
      eccentricity: 0.8, // e
      semiMajorAxis: 10, // a in au
      inclination: 0.0, // i in deg
      longitudeOfAscendingNode: 270, // node/Ω in deg
      argumentOfPerihelion: 0, // peri/ω in deg
      meanAnnomoly: 0.0, // M in deg
      timeOfPerihelion: 2461000.5, // tp Barycentric Dynamical Time (TDB) JD
      meanMotion: (360.0/(365.25 * ((10)**1.5))), // mean daily motion in deg/day
      epoch: 2461000.5, // Barycentric Dynamical Time (TDB) JD
      // Not used
      siderealOrbitalPeriod: 24852.58, // epoch of osculation in JD
      aphelionDistance: 10 * (1 + 0.85), // Q in au
    })
  },
  'TestAsteroidZ': {
    name: "TestAsteroidZ",
    designation: "TestAsteroidZ",
    epoch: 2461000.5, // JD
    eoe: new JPLElements({
      eccentricity: 0.8, // e
      semiMajorAxis: 10, // a in au
      inclination: 90.0, // i in deg
      longitudeOfAscendingNode: 0, // node/Ω in deg
      argumentOfPerihelion: 270, // peri/ω in deg
      meanAnnomoly: 0.0, // M in deg
      timeOfPerihelion: 2461000.5, // tp Barycentric Dynamical Time (TDB) JD
      meanMotion: (360.0/(365.25 * ((10)**1.5))), // mean daily motion in deg/day
      epoch: 2461000.5, // Barycentric Dynamical Time (TDB) JD
      // Not used
      siderealOrbitalPeriod: 24852.58, // epoch of osculation in JD
      aphelionDistance: 10 * (1 + 0.85), // Q in au
    })
  },
  'X': {
    name: "X",
    designation: "X",
    epoch: 2461000.5, // JD
    eoe: new JPLElements({
      eccentricity: 1.0, // e
      semiMajorAxis: 5.5, // a in au
      inclination: 0.0, // i in deg
      longitudeOfAscendingNode: 180, // node/Ω in deg
      argumentOfPerihelion: 0, // peri/ω in deg
      meanAnnomoly: 0.0, // M in deg
      timeOfPerihelion: 2461000.5, // tp Barycentric Dynamical Time (TDB) JD
      meanMotion: (360.0/(365.25 * ((5.5)**1.5))), // mean daily motion in deg/day
      epoch: 2461000.5, // Barycentric Dynamical Time (TDB) JD
      // Not used
      siderealOrbitalPeriod: 24852.58, // epoch of osculation in JD
      aphelionDistance: 5.5 * (1 + 0.85), // Q in au
    })
  },
  'Y': {
    name: "Y",
    designation: "Y",
    epoch: 2461000.5, // JD
    eoe: new JPLElements({
      eccentricity: 1.0, // e
      semiMajorAxis: 5.5, // a in au
      inclination: 0.0, // i in deg
      longitudeOfAscendingNode: 270, // node/Ω in deg // should be 270
      argumentOfPerihelion: 0, // peri/ω in deg
      meanAnnomoly: 0.0, // M in deg
      timeOfPerihelion: 2461000.5, // tp Barycentric Dynamical Time (TDB) JD
      meanMotion: (360.0/(365.25 * ((5.5)**1.5))), // mean daily motion in deg/day
      epoch: 2461000.5, // Barycentric Dynamical Time (TDB) JD
      // Not used
      siderealOrbitalPeriod: 24852.58, // epoch of osculation in JD
      aphelionDistance: 5.5 * (1 + 0.85), // Q in au
    })
  },
  'Z': {
    name: "Z",
    designation: "Z",
    epoch: 2461000.5, // JD
    eoe: new JPLElements({
      eccentricity: 1.0, // e
      semiMajorAxis: 5.5, // a in au
      inclination: -90, // i in deg
      longitudeOfAscendingNode: 0, // node/Ω in deg
      argumentOfPerihelion: 90, // peri/ω in deg
      meanAnnomoly: 0.0, // M in deg
      timeOfPerihelion: 2461000.5, // tp Barycentric Dynamical Time (TDB) JD
      meanMotion: (360.0/(365.25 * ((5.5)**1.5))), // mean daily motion in deg/day
      epoch: 2461000.5, // Barycentric Dynamical Time (TDB) JD
      // Not used
      siderealOrbitalPeriod: 24852.58, // epoch of osculation in JD
      aphelionDistance: 5.5 * (1 + 0.85), // Q in au
    })
  },
};

// Generated by Copilot
// With the engine fix in place (orbit.js now uses basis vector approach),
// we can use standard J2000 ecliptic elements directly - no transformation needed.

export function asteroidDefinition2Frame(elements: AsteroidDefinition): ReferenceFrame {
  console.log(`\n[asteroidDefinition2Frame] Converting: ${elements.name}`);
  const frame = new ReferenceFrame();
  frame.name = elements.name.toLowerCase();
  frame.referenceFrameType = ReferenceFrameTypes.orbital;
  frame.reference = ReferenceFrames.custom; // custom
  frame.parent = "Sun";

  // we are using ReferenceFrameType = 1
  frame.showOrbitPath = true;
  

  // WWT's ReferenceFrame.semiMajorAxis is stored in meters.
  // The rendering code in _computeOrbital applies semiMajorAxisUnits scaling.

  frame.semiMajorAxis = elements.eoe.semiMajorAxis * AU_M; // convert AU to meters
  frame.semiMajorAxisUnits = AltUnits.meters; // 1
  frame.eccentricity = elements.eoe.eccentricity;
  // Use standard J2000 ecliptic elements directly.
  frame.inclination = elements.eoe.inclination;
  frame.argumentOfPeriapsis = elements.eoe.argumentOfPerihelion;
  frame.longitudeOfAscendingNode = elements.eoe.longitudeOfAscendingNode;
  
  // M0 at epoch, adjusted so WWT computes M correctly
  // WWT uses: M = n * (jNow - t), where t = epoch - M0/n
  // We want: M = n * (jNow - Tp)
  // So: t = Tp, which means epoch - M0/n = Tp
  // Therefore: M0 = n * (epoch - Tp)
  frame.meanAnomolyAtEpoch = elements.eoe.meanAnnomoly;
  
  frame.meanDailyMotion = elements.eoe.meanMotion;
  frame.epoch = elements.eoe.epoch; // JD

  if (elements.eoe.diameter) {
    frame.meanRadius = (elements.eoe.diameter * 1000) / 2; // in meters
  } else {
    frame.meanRadius = 1000; // default 1 km
  }

  if (elements.eoe.rotationalPeriod) {
    frame.rotationalPeriod = elements.eoe.rotationalPeriod / 24; // in days
  } else {
    frame.rotationalPeriod = 0; // non-rotating
  }

  frame.showAsPoint = true; // doesn't do anything. not implemented.
  frame.scale = 1;
  
  return frame;
}

export function asteroidDefinition2EOE(elements: AsteroidDefinition): EOE {
  // Generated by Copilot
  const Tp = elements.eoe.timeOfPerihelion;
  const epoch = elements.eoe.epoch;
  const n = elements.eoe.meanMotion;
  
  // M0 at epoch, adjusted so WWT computes M correctly
  const M0_adjusted = n ;//* (epoch - Tp);
  
  const eoe: EOE = {
    a: elements.eoe.semiMajorAxis,
    e: elements.eoe.eccentricity,
    i: elements.eoe.inclination,
    w: elements.eoe.argumentOfPerihelion,
    omega: elements.eoe.longitudeOfAscendingNode,
    meanAnnomolyOut: M0_adjusted,
    n: n,
    t: Tp,  // Time of perihelion
    jdEquinox: epoch,
  };
  return eoe;
}

export function frame2EOE(frame: ReferenceFrame): EOE {
  const eoe: EOE = {
    a: frame.semiMajorAxis / AU_M, // convert meters to AU
    e: frame.eccentricity,
    i: frame.inclination,
    w: frame.argumentOfPeriapsis,
    omega: frame.longitudeOfAscendingNode,
    meanAnnomolyOut: frame.meanAnomolyAtEpoch,
    n: frame.meanDailyMotion,
    t: frame.epoch, // approximate
    jdEquinox: frame.epoch,
  };
  return eoe;
}


// Register a custom orbital `ReferenceFrame` so WWT renders it as a child of `parent`.
//
// Why this helps:
// - Child-frame orbit paths are drawn in LayerManager using the parent's world matrix.
// - OrbitLayer.draw resets renderContext.world to worldBaseNonRotating
// eslint-disable-next-line @typescript-eslint/no-inferrable-types
export function renderFrameAsChild(frame: ReferenceFrame, parent: string = "Sun"): LayerMap {
  const allMaps = LayerManager.get_allMaps();
  // it is a layermap as seen here https://github.com/WorldWideTelescope/wwt-webgl-engine/blob/master/engine/esm/layers/layer_manager.js#L257
  const parentMap = allMaps[parent] as LayerMap | undefined;
  if (!parentMap) {
    throw new Error(`Parent frame '${parent}' not found in LayerManager maps`);
  }

  // Generated by Copilot
  // CRITICAL: Enable minor orbits setting so child-frame orbits render.
  // The engine gates child-map orbit rendering behind these settings (layer_manager.js:806).
  const active = Settings.get_active();
  if (active) {
    if (!active.get_solarSystemOrbits()) {
      active.set_solarSystemOrbits(true);
    }
    if (!active.get_solarSystemMinorOrbits()) {
      active.set_solarSystemMinorOrbits(true);
    }
  }
  

  // Ensure this is treated as an orbital child frame.
  frame.parent = parent;
  frame.showOrbitPath = true;

  const name = frame.name;
  const child = new LayerMap(); //(name, ReferenceFrames.custom);
  child.set_name(name);
  child.frame = frame;
  child.enabled = true;

  child.open = true;
  parentMap.open = true;

  parentMap.addChild(child);
  allMaps[name] = child;

  // Bump the layer version so UI/state notices changes.
  LayerManager.set_version(LayerManager.get_version() + 1);
  LayerManager.loadTree();
  return child;
}

