import {ref, onMounted, watch} from "vue";
import { engineStore } from "@wwtelescope/engine-pinia";
import { Folder, Place, Imageset, ImageSetLayer } from "@wwtelescope/engine";


interface WtmlLoaderOptions {
  // any options we might want to add in the future. 
  onNewLayer?: ((layer: ImageSetLayer, index: number) => void); // callback for when a new layer is added, with the layer and its corresponding place as arguments
  onNewFolder?: (folder: Folder) => void;
  onNewPlace?: (place: Place, index: number) => void;
  goTo?: ((iset: Imageset) => boolean) | ((iset: Imageset, index: number) => boolean) | boolean; 
}

/**
 * onNewPlace(place, placeIndex)` gets run right after the place is loaded, but before its 
 * ImageSetLayer is loaded. One could use this to do a move, or something else that doesnt
 * require the imageset layer to be loaded.
 * 
 * `onNewLayer(layer, layerIndex)` is run right after on the return of `store.addImageSetLayer`, 
 *  this is where we would usually set initial opticiies or layer properties, or do a move on 
 * the the index ==== 0 layer, or something like that.
 * 
 * `onNewFolder(folder)` is there do something with the folder. We have 'loadChildFolders = false` set
 * 
 * `goTo` is a function to determine if we should `goTo` a layer when loaded. Should be true for only 1 layer. default is false.
 * 
 * 
 * returns:
 *  - `ready` ref that is true when the loading process is complete
 * - `places` ref with the loaded places, in the order they appear in the WTML file
 * - `imagesets` ref with the loaded imagesets, in the order they appear in the WTML file
 * - `imagesetLayers` ref with the loaded imageset layers, in the order they appear in the WTML file  
 * 
 * imagesetLayers is usually the thing you want to use.
 **/
export function useWtmlLoader(wtmlUrl: string, options?: WtmlLoaderOptions) {
  
  console.log("useWtmlLoader called with url:", wtmlUrl, "and options:", options);
  const ready = ref(false);
  
  const folder = ref<Folder | null>(null);

  const places = ref<Place[]>([]);
  const imagesets = ref<Imageset[]>([]);
  const imagesetLayers = ref<ImageSetLayer[]>([]);
  const opacities = ref<Map<string, number>>(new Map());
  
  function setOpacity(name: string, opactiy: number) {
    if (imagesetLayers.value.length === 0)  return;
    const layer = imagesetLayers.value.find(layer => layer.get_name() === name);
    if (!layer) {
      console.warn(`No layer found for place with name ${name}`);
      return;
    }
    layer.set_opacity(opactiy);
    opacities.value.set(name, opactiy);
  }
  
  function getOpacity(name: string): number | undefined {
    return opacities.value.get(name);
  }
  
  const store = engineStore();
  
  function thumbnails2Places(thumbnails: (ReturnType<Folder["get_children"]>)): Place[] {
    if (thumbnails == null) return [];
    return thumbnails.filter(child => child instanceof Place) as Place[];
  }
  
  function getOrdered<T>(array: [number, T][]): T[] {
    const tempArray: T[] = [];
    array.forEach(([index, item]) => {
      tempArray[index] = item;
    });
    return tempArray;
  }
  
  function resolveGoTo(iset: Imageset, index: number): boolean {
    if (options?.goTo === undefined) return false;
    
    if (typeof options.goTo === "boolean") return options.goTo;
    
    return options.goTo(iset, index); // js doesn't care if there are too many argument, and TS is happy :)
  }
  
  onMounted(() => {
    store.waitForReady().then(async () => {
      try {
        folder.value = await store.loadImageCollection({
          url: wtmlUrl,
          loadChildFolders: false,
        });
        if (options?.onNewFolder) options.onNewFolder(folder.value);
      } catch (error) {
        console.error(`Failed to load WTML file from ${wtmlUrl}:`, error);
        return;
      }
      
      const children = folder.value.get_children();
      if (children == null) {
        console.warn(`No children found in the provided WTML file at ${wtmlUrl}`);
        return;
      }
      
      places.value = thumbnails2Places(children);
      
      if (places.value.length === 0) {
        console.warn(`Folder had ${children.length} children, but no places found in the provided WTML file at ${wtmlUrl}`);
        return;
      }
      
      // keep track of the index so we don't need a sort operations
      const _isets: [number, Imageset][] = [];
      const _layers: [number, ImageSetLayer][] = [];
      // let _addedAtLeastOneLayer = false;
      
      console.log(`Found ${places.value.length} places in the WTML file. Starting to load imageset layers...`);
      
      places.value.forEach(async (child: Place, _index: number) => {
        const imageset = child.get_backgroundImageset() ?? child.get_studyImageset();
        
        if (imageset == null) {
          console.warn(`No imageset found for place with name ${child.get_name()} at index ${_index}`);
          return;
        };
        _isets.push([_index, imageset]);
        
        if (options?.onNewPlace) options.onNewPlace(child, _index);
        
        await store.addImageSetLayer({
          url: imageset.get_url(),
          mode: "autodetect",
          name: imageset.get_name(),
          goto: resolveGoTo(imageset, _index),
        }).then(layer => {
          console.log(`Successfully loaded layer for place with name ${child.get_name()} at index ${_index}`);
          _layers.push([_index,layer]);
          // _addedAtLeastOneLayer = true;
          if (options?.onNewLayer) options.onNewLayer(layer, _index);
        }).catch(error => {
          console.error("Failed to load imageset from", error, imageset);
        });
        
      });
      
      // this is not getting set, so just skip it
      // if (!_addedAtLeastOneLayer) {
      //   console.warn("No imageset layers were added.");
      //   return;
      // }
      // want to construct these so that they are in the same order as the places
      // just in case the order was important. 
      // want to do a set so that a watcher or something will respond to these being ready
      imagesetLayers.value = getOrdered(_layers);
      imagesets.value = getOrdered(_isets);
      
      ready.value = true;
    });
  });
  
  
  
  const show = (name: string) => {
    const index = places.value.findIndex(p => p.get_name() === name);
    if (index === -1) {
      console.warn(`No place found with name ${name}`);
      return;
    }
    const layer = imagesetLayers.value[index];
    if (!layer) {
      console.warn(`No layer found for place with name ${name}`);
      return;
    }
    layer.set_enabled(true);
    layer.set_opacity(getOpacity(name) ?? 1);
  };
  
  const hide = (name: string) => {
    const index = places.value.findIndex(p => p.get_name() === name);
    if (index === -1) {
      console.warn(`No place found with name ${name}`);
      return;
    }
    const layer = imagesetLayers.value[index];
    if (!layer) {
      console.warn(`No layer found for place with name ${name}`);
      return;
    }
    setOpacity(name, 0);
  };
    
  watch(opacities, (newOpacities) => {
    newOpacities.forEach((opacity, name) => {
      const index = places.value.findIndex(p => p.get_name() === name);
      if (index === -1) {
        console.warn(`No place found with name ${name}`);
        return;
      }
      const layer = imagesetLayers.value[index];
      if (!layer) {
        console.warn(`No layer found for place with name ${name}`);
        return;
      }
      layer.set_opacity(opacity);
    });
  }, { deep: true });
  
  return {
    ready,
    places,
    imagesets,
    imagesetLayers,
    show,
    hide,
    opacities
  };
    
    
}