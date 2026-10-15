from astropy.io import fits
from astropy.wcs import WCS
import numpy as np

def fix(filename):
    data = fits.getdata(filename)
    print(data.dtype)
    hdr = fits.getheader(filename)
    fits.writeto(f"{filename.split('.')[0]}-fixed.fits", np.float32(data), header = hdr, overwrite=True)


fix('Pleiades260211030923.FITS')