# Learnings

-- WWT is **very** picky about the type of FITs files it reads in. Converting data to float32 helps, but need to investigate what is going on with unit16 type data. It looks like it supports Int16 but not Uint16 ([engine/esm/fits_image.js#L170](https://github.com/WorldWideTelescope/wwt-webgl-engine/blob/c14542ad7b06a7f39234f536f7aa7c40f60fc0ba/engine/esm/layers/fits_image.js#L170))

-- It must be a TAN image
-- Must be a small field of view - otherwise there are obvious projection/distorion effects


Images used came from the [MicroObservatory](https://mo-www.cfa.harvard.edu/MicroObservatory/)