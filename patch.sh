#!/bin/bash

filepath=node_modules/@wwtelescope/engine/src/index.js
if ! test -f ${filepath}; then
    filepath="../${filepath}"
fi

# Check whether the patch has already been run
# If so, no need to continue
altered_line=$(sed -n "/__WEBPACK_IMPORTED_MODULE_X/=" ${filepath} | head -n 1)
if [[ ! -z ${altered_line} ]]
then
    echo "Altered line found!"
else
    reexport_line=$(sed -n "/ ss: () => (\/\* reexport/=" ${filepath})
    reexport_line=$((${reexport_line} - 1))
    if [[ ! -z ${reexport_line} ]]
    then
        sed -i.bak "${reexport_line}a\\
            Planets3d: () => (_render_globals_js__WEBPACK_IMPORTED_MODULE_X__.Planets3d),
        " ${filepath}
        import_line=$((reexport_line + 5))
        sed -i.bak "${import_line}a\\
            var _render_globals_js__WEBPACK_IMPORTED_MODULE_X__ = __webpack_require__('./esm/planets_3d.js'); 
        " ${filepath}
        rm ${filepath}.bak
    fi
fi

# Patch TimeSeriesPointSpriteShader and KeplerPointSpriteShader fragment shaders
# to discard nearly-transparent fragments so they don't write to the depth buffer.
# Without this, point-sprite planets (e.g. Moon when zoomed out) render a black
# square that occludes objects behind them. (claude assisted with how to apply this patch)
# https://gamedev.stackexchange.com/questions/120493/webgl-weird-rendering-with-sprite-that-has-alpha#comment211931_120515 (discard!)
shader_patch_marker="gl_FragColor.a < 0.001"
if ! grep -q "${shader_patch_marker}" ${filepath}; then
    sed -i.bak '/gl_FragColor = lineColor \* vColor \* texColor;/{
s/$/\
            if (gl_FragColor.a < 0.001) discard;/
}' ${filepath}
    rm ${filepath}.bak
    echo "Shader alpha discard patch applied."
else
    echo "Shader alpha discard patch already applied."
fi
