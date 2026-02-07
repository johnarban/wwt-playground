/* eslint-disable @typescript-eslint/naming-convention */

import { add2Window } from "./globals";
import { ResolvedObject} from '@/types';


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
  }
  
  let radec: number[] = [];
  if (coords !== '') {
    radec = coords.split(' ').map(v => parseFloat(v));
  } else {
    throw new Error("No coords found in returned object");
  }
  
  let sizes: number[] = [];
  let diameter: number | undefined = undefined;
  if (size !== '') {
    sizes = size.split(' ').map(v => parseFloat(v));
    if (sizes[0] && sizes[1]) {
      diameter = Math.sqrt(sizes[0]**2 + sizes[1]**2) ;
    }
  }
  
  if (radec.length !== 2) {
    throw new Error(`Coordinates we malformed: coordsRegex returned ${coords}`);
  }
  
  if (object === '') {
    console.error(`Coordinates Resolved to ${radec}, but no name found`);
  }
  if (object === '') {
    console.error(`No otype found`);
  }
  
  
  return {
    oname: object,
    otype: otype,
    raDeg: radec[0],
    decDeg: radec[1],
    size: diameter,
  };
}


/**
 * Use Simbad's name resolution service to identify the current coordinates
 */
export function simbadResolveCoordinates(raDeg, decDeg, radiusArcSec = 30, epoch = 2000) {
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
  return fetch(url)
    .then((res) => res.text())
    .then(text => parseSimbadASCII(text));
}



/**
 * Use Simbad's name resolution service to resolve an object name
 * @param name is the object name to resolve
 */
export function simbadNameResolver(name) {
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
  return fetch(url)
    .then((res) => res.text())
    .then(text => parseSimbadASCII(text));
}


add2Window('simbadName', simbadNameResolver);
add2Window('simbadCoo', simbadResolveCoordinates);