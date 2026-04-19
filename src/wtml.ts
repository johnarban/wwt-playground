import { Imageset, Place } from "@wwtelescope/engine";
import { Classification } from "@wwtelescope/engine-types";


function stripXmlDeclaration(xml: string): string {
  return xml.replace("<?xml version='1.0' encoding='UTF-8'?>", '').trim();
}


function createPlaceForImageset(imageset: Imageset): Place {
  const place = new Place();
  place.set_names([imageset.get_name()]);
  place.set_type(imageset.get_dataSetType());
  place.set_classification(Classification.unfiltered);
  place.set_zoomLevel(1);
  place.angularSize = 0;
  place.set_studyImageset(imageset);
  place.set_RA(imageset.get_centerX() / 15);
  place.set_dec(imageset.get_centerY());
  
  return place;
}

export interface ImagesetWtmlOptions {
  folderName?: string;
}

export function imagesetToWtml(imageset: Imageset, options: ImagesetWtmlOptions = {}): string {
  const place = createPlaceForImageset(imageset);
  const placeXml = stripXmlDeclaration(place.asXml("Place"));
  const folderName = options.folderName ?? imageset.get_name();

  return [
    `<Folder Name="${folderName}" Group="Imported-IDK" Searchable="True" Type="Sky">`,
    placeXml,
    "</Folder>",
    "",
  ].join("\n");
}
