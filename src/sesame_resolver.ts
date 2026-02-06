/* eslint-disable @typescript-eslint/naming-convention */

import { add2Window } from "./globals";
import { ResolvedObject } from "./types";


function _parseSesameResolver(resolverElement: Element): Exclude<ResolvedObject,'name'> | null {
  const info = resolverElement.querySelector('INFO');
  if (!info || info.textContent === 'Zero (0) answers') {
    return null;
  }
  const oname = resolverElement.querySelector('oname');
  const otype = resolverElement.querySelector('otype');
  const jpos = resolverElement.querySelector('jpos');
  const jradeg = resolverElement.querySelector('jradeg');
  const jdedeg = resolverElement.querySelector('jdedeg');
  return {
    oname: oname ? oname.textContent : '<NO oname>',
    otype: otype ? otype.textContent : '<NO otype>',
    pos: jpos ? jpos.textContent : '<NO jpos>',
    raDeg: jradeg ? parseFloat(jradeg.textContent) : NaN,
    decDeg: jdedeg ? parseFloat(jdedeg.textContent) : NaN,
  };
}


interface SesameOptions  {
  svna: string; // SVNA
  ignoreCache: boolean, // default: false
  includeIdentifiers: boolean; // default: falsefalse
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

add2Window('sesame', sesameNameResolver);