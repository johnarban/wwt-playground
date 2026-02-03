# Toast SPHEREx equirectangular TIF files
from toasty import samplers, builder, pyramid
import numpy as np
from PIL import Image
import math
import os

# Load and toast each TIF file
files = ['SPHEREx_LinesRB_equirectangular.tif', 'SPHEREx_StarsRGB_equirectangular.tif']

for filename in files:
    # Load image
    img = Image.open(filename)
    data = np.array(img)
    
    # Calculate appropriate depth based on image resolution
    # TOAST creates 256 x 256 images
    # For plate carree, we want the longer dimension (width) to match
    width = max(*data.shape)
    depth = int(math.ceil(math.log2(width / 256)))
    
    # Create sampler - data is already in galactic coords
    sampler = samplers.plate_carree_galactic_sampler(data)
    
    # Setup builder
    outdir = filename.replace('.tif', '_toast')
    name = filename.replace('.tif', '')#.replace('_', ' ')
    pio = pyramid.PyramidIO(outdir, default_format='png')
    b = builder.Builder(pio)
    
    # Toast and generate WTML
    b.toast_base(sampler, depth, cli_progress=True)
    b.cascade(cli_progress=True)  # Create parent tiles
    b.set_name(name)
    b.write_index_rel_wtml()
    
    # Rewrite WTML with absolute URLs
    base_url = f"/{outdir}/"
    os.system(f'wwtdatatool wtml rewrite-urls "{outdir}/index_rel.wtml" "{base_url}" "{outdir}/index.wtml"')
    print(f'Rewrote WTML URLs with base: {base_url}')

    
    print(f'Toasted {filename} to {outdir}')

# Move output directories to public folder
import shutil

public_dir = '../../public'
for filename in files:
    outdir = filename.replace('.tif', '_toast')
    dest = os.path.join(public_dir, outdir)
    
    # Remove existing destination if it exists and move
    if os.path.exists(dest):
        shutil.rmtree(dest)
    shutil.move(outdir, dest)
    print(f'Moved {outdir} to {dest}')
