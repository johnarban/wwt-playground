/* eslint-disable @typescript-eslint/naming-convention */
export interface ResolvedObject {
  name?: string // user provided name
  oname?: string  // official name
  otype?: string // object type
  raDeg?: number, // ra in degress
  decDeg?: number, // ra in degrees
  size?: number, // size (diameter) in deg, if available
}


/**
 * Simbad resolution functions
 * 
 */


function parseSimbadASCII(text: string): ResolvedObject {
  const coordRegex = /Coordinates.*: (\d*\.\d* [+-]\d*\.\d*)/;
  let coords = '';
  const cmatch = text.match(coordRegex);
  if (cmatch && cmatch[1]) {
    coords = cmatch[1]; // the ra dec decimal degree string
  }
  
  let size = '';
  const sizeRegex = /Angular size: ([\d. ]*)/;
  const smatch = text.match(sizeRegex);
  if (smatch && smatch[1]) {
    size = smatch[1]; // the ra dec decimal degree string
  }
  
  let object: string | undefined = undefined;
  let otype: string | undefined = undefined;
  const objectRegex = /Object (.*?)---(.*?)---/; 
  const omatch = text.match(objectRegex);
  if (omatch && omatch[1]) {
    object = omatch[1].trim();
  }
  if (omatch && omatch[2]) {
    otype = omatch[2].trim();
    if (otype.startsWith('NAME')) {
      otype = otype.replace('NAME', '').trim();
    }
  }
  
  let radec: number[] = [];
  if (coords !== '') {
    radec = coords.split(' ').map(v => parseFloat(v));
  }
  

  let diameter: number | undefined = undefined;
  if (size !== '') {
    const sizes = size.split(' ').map(v => parseFloat(v));
    if (sizes[0] && sizes[1]) {
      diameter = Math.sqrt(sizes[0]**2 + sizes[1]**2) / 60 ;
    }
  }
  return {
    oname: object,
    otype: otype,
    raDeg: radec.length > 0 ? radec[0] : undefined,
    decDeg: radec.length > 0 ? radec[1] : undefined,
    size: diameter,
  };
}


/**
 * Use Simbad's name resolution service to identify the current coordinates
 * A good idea would be to have the search radius scale with zoom
 */
export async function simbadResolveCoordinates(raDeg, decDeg, radiusArcSec = 60, epoch = 2000) {
  const simdadCoordinateQueryUrl = 'https://simbad.cds.unistra.fr/simbad/sim-coo';
  const params = new URLSearchParams({
    'Coord': `${raDeg} ${decDeg}`,
    'Radius': `${radiusArcSec}`,
    'Radius.unit': 'arcsec',
    'CooFrame': 'ICRS', // FK5 J2000 is also fine
    'CooEpoch': `${epoch}`,
    'CooEquinox': `${2000}`, // Using FK5 J2000 equinox
    //  general parameters
    'output.format': 'ASCII',
    'output.max': '2',
    // Object type
    'list.otypesel': 'on',
    'otypedisp': 'S',
    // Coordinates
    'obj.coo1': 'on',
    'frame1': 'ICRS',
    'epoch1': 'J2000',
    'equi1': '2000',
    'coodisp1': 's',
    'obj.coo2': 'on',
    'frame2': 'ICRS',
    'epoch2': 'J2000',
    'equi2': '2000',
    'coodisp2': 'd',
    'obj.coo3': 'off',
    'obj.coo4': 'off',
    // Proper motions
    'obj.pmsel': 'off',
    // Parallaxes
    'obj.plxsel': 'off',
    //Radial velocities
    'obj.rvsel': 'off',
    // Spectral type
    'obj.spsel': 'on',
    // Morphological type
    'obj.mtsel': 'on',
    // Angular size
    'obj.sizesel': 'on',
    // Fluxes
    'obj.fluxsel': 'off',
    // Identifiers
    'list.idsel': 'off',
    'list.idopt': 'FIRST',
    // Bibliography
    'obj.bibsel': 'off',
    // Measurements
    'obj.messel': 'off',
    // Notes
    'list.spsel': 'off',
    'obj.notesel' : 'off',
  });
  const url = simdadCoordinateQueryUrl + '?' + params.toString();
  const res = await fetch(url);
  const text = await res.text();
  const out =  parseSimbadASCII(text);
  if (!out.oname) {
    throw new Error('Could not resolve coordinates');
  }
  return out; 
}



/**
 * @deprecated -- use simbadNameResolver instead, which uses the json return
 * Use Simbad's name resolution service to resolve an object name
 * @param name is the object name to resolve
 * Will return the oname (official name)
 */
async function _simbadId(name) {
  const simbadNameQueryUrl = 'https://simbad.cds.unistra.fr/simbad/sim-id';
  const params = new URLSearchParams({
    'Ident': name,
    //  general parameters
    'output.format': 'ASCII',
    'output.max': '1',
    // Object type
    'list.otypesel': 'off',
    'otypedisp': 'S',
    // Coordinates
    'obj.coo1': 'on',
    'frame1': 'ICRS',
    'epoch1': 'J2000',
    'equi1': '2000',
    'coodisp1': 'd',
    'obj.coo2': 'off',
    'frame2': 'ICRS',
    'epoch2': 'J2000',
    'equi2': '2000',
    'coodisp2': 'd',
    'obj.coo3': 'off',
    'obj.coo4': 'off',
    // Proper motions
    'obj.pmsel': 'off',
    'list.pmsel': 'off',
    // Parallaxes
    'obj.plxsel': 'off',
    'list.plxsel': 'off',
    //Radial velocities
    'obj.rvsel': 'off',
    // Spectral type
    'obj.spsel': 'off',
    'list.spsel': 'off',
    // Morphological type
    'obj.mtsel': 'off',
    'list.mtsel': 'off',
    // Angular size (arcmin)
    'obj.sizesel': 'on', 
    'list.sizesel': 'on',
    // Fluxes
    'obj.fluxsel': 'off',
    'list.fluxsel':'off',
    // Identifiers
    'obj.idsel': 'off',
    'list.idsel': 'off',
    'list.idopt': 'CATLIST',
    // Bibliography
    'obj.bibsel': 'off',
    'list.bibsel': 'off',
    // Measurements
    'obj.messel': 'off',
    // Notes
    'obj.notesel' : 'off',
  });
  const url = simbadNameQueryUrl + '?' + params.toString();
  const res = await fetch(url);
  const text = await res.text();
  const out =  parseSimbadASCII(text);
  if (!out.oname) {
    console.error(`The name is bad ${out.oname}`);
    throw new Error('Could not resolve name');
  }
  return out;
}


interface SimbadNameResolverJSON {
  dec?:            number;
  coo_bibcode?:    string;
  oid?:            number;
  redshift?:       number;
  dim_angle?:      number;
  idlist?:         string[];
  dim_minaxis?:    number;
  radvel?:         number;
  ra?:             number;
  dim_majaxis?:    number;
  otype?:          string;
  mainId?:         string;
  plx?:            number;
}


function parseSimbadJson(json: SimbadNameResolverJSON): ResolvedObject {
  return {
    raDeg: json.ra,
    decDeg: json.dec,
    oname: json.mainId,
    size: Math.sqrt((json.dim_majaxis ?? 0)**2 + (json.dim_minaxis??0)**2) / 60, // in degrees
    otype: json.otype,
  };
}

export async function simbadNameResolver(name: string) {
  const simbadNameResolverUrl = 'https://simbad.u-strasbg.fr/simbad/sim-nameresolver';
  const params = new URLSearchParams({
    ident: name,
    output: 'json',
    option: 'strict',
  });
  const url = simbadNameResolverUrl + '?' + params.toString();
  try {
    const res = await fetch(url);
    const json = await res.json();
    let out: ResolvedObject = {};
    if (Array.isArray(json) && json.length > 0) {
      out = parseSimbadJson(json[0]);
    } else {
      out = parseSimbadJson(json);
    }
    if (!out.oname || !out.raDeg || !out.decDeg) {
      console.error(`The name is bad ${out.oname}`);
      throw new Error('Could not resolve name');
    }
    return out;
  } catch (e) {
    console.error(e);
    throw new Error('Could not resolve name');
  }

}



function _parseSesameResolver(resolverElement: Element): Exclude<ResolvedObject,'name'> | null {
  const info = resolverElement.querySelector('INFO');
  if (!info || info.textContent === 'Zero (0) answers') {
    return null;
  }
  const oname = resolverElement.querySelector('oname');
  const otype = resolverElement.querySelector('otype');
  const jradeg = resolverElement.querySelector('jradeg');
  const jdedeg = resolverElement.querySelector('jdedeg');
  return {
    oname: (oname && oname.textContent) ? oname.textContent : '<NO oname>',
    otype: (otype && otype.textContent) ? otype.textContent : '<NO otype>',
    raDeg: (jradeg && jradeg.textContent) ? parseFloat(jradeg.textContent) : NaN,
    decDeg: (jdedeg && jdedeg.textContent) ? parseFloat(jdedeg.textContent) : NaN,
  };
}

/**
 * Sesame name resolution functions
**/

interface SesameOptions  {
  svna: string; // SVNA
  ignoreCache: boolean, // default: true
  includeIdentifiers: boolean; // default: false
  includeFluxes: boolean; // defautl: false
}
/**
 * Thin interface for SESAME name resolver https://vizier.cds.unistra.fr/vizier/doc/sesame.htx
 * @params object_name The object name
 * @params options {SesameOptions} 
 *    `svna`: [default: SVN] **S**imbad, **N**ED, **V**izier, **A** catalogs. In order of precendence. Without **A**, result of the first positive answer is listed only. _This function ignores **A**.
 *    `ignoreCache`: ignores cached results. (idk what they really means here.). Can also enable ignoring the cache by prepending `~` to the `svna` parameter.
 *    `includeIdentifiers` : ignored, will not be included in output
 *    `includeFluxes: ignored, will not be included in output
 */
export async function sesameNameResolver(object_name: string, options?: SesameOptions): Promise<ResolvedObject> {
  // https://vizier.cds.unistra.fr/vizier/doc/sesame.htx
  
  let opt = '-oxp';
  // output options
  if (options?.includeIdentifiers) {
    opt = opt + 'I';
  }
  if (options?.includeFluxes) {
    opt = opt + 'F';
  }
  
  let db = options?.svna || 'SNV';
  if (options?.ignoreCache) {
    db = '~' + db;
  }
  // we will always do a Simbad first search
  const queryUrl = `https://cds.unistra.fr/cgi-bin/nph-sesame/${opt}/${db}?${object_name}`;
  const res = await fetch(queryUrl);
  
  const parser = new DOMParser();
  const doc = parser.parseFromString(await res.text(), 'application/xml');
  const errorNode = doc.querySelector("parsererror");
  if (errorNode) {
    throw new Error("error while parsing sesame xml");
  }
  const resolver = doc.querySelectorAll('Resolver');
  for (const r of resolver) {
    const out = _parseSesameResolver(r);
    if (out) return {name: object_name, ...out};
  }
  // should not reach this point because query should have thrown an error if there were no results at all
  throw new Error("Somehow we reached this far, btw, there are no results for your query");
  
}
