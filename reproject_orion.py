#!/usr/bin/env python3
"""
Reproject Orion FITS image to optimal RA-Dec TAN projection.

This script reads the Orion_TAU353_full.fits file, determines the optimal
WCS for a TAN projection centered on the data, and reprojects the image.
"""

import numpy as np
from astropy.io import fits
from astropy.wcs import WCS
from astropy import units as u
from astropy.coordinates import ICRS
from reproject import reproject_interp
from reproject.mosaicking import find_optimal_celestial_wcs
import sys
from pathlib import Path


def reproject_fits(input_file, output_file, output_shape=None, pixel_scale=None, 
                   frame='icrs', tau_to_ak=None):
    """
    Reproject FITS image to optimal RA-Dec TAN projection.
    
    Parameters
    ----------
    input_file : str or Path
        Path to input FITS file
    output_file : str or Path
        Path to output FITS file
    output_shape : tuple, optional
        Desired output shape (ny, nx). If None, determined automatically.
    pixel_scale : float, optional
        Desired pixel scale in degrees. If None, uses input pixel scale.
    frame : str or astropy.coordinates frame, optional
        Coordinate frame for the output WCS (default: 'icrs')
    tau_to_ak : float, optional
        Conversion factor from tau_353 to Ak extinction.
        Common values:
        - ~2128: From Lada+ 2010 (Av/tau = 1.94e4) with Ak/Av = 0.112
        - ~3553: Alternative calibration from Planck/Herschel data
        If None, no conversion is applied.
    """
    print(f"\nReprojecting {input_file}...")
    
    # Load input data
    with fits.open(input_file) as hdul:
        data = hdul[0].data
        header = hdul[0].header
        input_wcs = WCS(header)
    
    # Find optimal celestial WCS using reproject's built-in function
    print("\nFinding optimal WCS...")
    wcs_out, shape_out = find_optimal_celestial_wcs(
        [(data, input_wcs)],
        frame=frame,
        resolution=pixel_scale * u.deg if pixel_scale else None
    )
    
    # Use custom shape if provided
    if output_shape is not None:
        shape_out = output_shape
    
    # Print WCS information
    print(f"Optimal WCS center: RA={wcs_out.wcs.crval[0]:.4f}°, Dec={wcs_out.wcs.crval[1]:.4f}°")
    print(f"Output shape: {shape_out}")
    pixel_scales = wcs_out.proj_plane_pixel_scales()
    pixel_scale_deg = np.mean([ps.to(u.deg).value for ps in pixel_scales])
    print(f"Pixel scale: {pixel_scale_deg:.6f}°/pixel ({pixel_scale_deg*3600:.2f} arcsec/pixel)")
    
    print("\nPerforming reprojection (this may take a moment)...")
    
    # Reproject using interpolation
    array, footprint = reproject_interp(
        (data, WCS(header)),
        wcs_out,
        shape_out=shape_out
    )
    
    print(f"Reprojection complete!")
    print(f"Output array shape: {array.shape}")
    print(f"Valid pixels: {np.sum(footprint > 0)} / {footprint.size}")
    
    # Apply tau_353 to Ak conversion if requested
    if tau_to_ak is not None:
        print(f"\nConverting tau_353 to Ak using factor: {tau_to_ak}")
        array = array * tau_to_ak
        output_unit = 'Ak (mag)'
        print(f"Data range after conversion: {np.nanmin(array):.4f} to {np.nanmax(array):.4f} mag")
    else:
        output_unit = header.get('BUNIT', 'tau_353')
    
    # Mark bad pixels with sentinel value
    sentinel_value = -9999.0
    bad_pixels = np.isnan(array) | (footprint <= 0)
    n_bad = np.sum(bad_pixels)
    print(f"\nMarking {n_bad} bad/empty pixels with sentinel value: {sentinel_value}")
    array[bad_pixels] = sentinel_value
    
    # Create output FITS file
    header_out = wcs_out.to_header()
    
    # Preserve some original header keywords
    preserve_keys = ['OBJECT', 'INSTRUME', 'TELESCOP', 'DATE-OBS', 'ORIGIN']
    for key in preserve_keys:
        if key in header:
            try:
                header_out[key] = header[key]
            except (ValueError, TypeError):
                # Skip if value can't be represented in FITS format
                pass
    
    # Set proper BUNIT
    header_out['BUNIT'] = output_unit
    
    # Document sentinel value for bad pixels
    header_out['BADPIX'] = (sentinel_value, 'Value marking bad/empty pixels')
    
    # Add processing information
    header_out['HISTORY'] = 'Reprojected to TAN projection'
    header_out['HISTORY'] = f'Original file: {Path(input_file).name}'
    header_out['HISTORY'] = f'Bad/empty pixels marked with value: {sentinel_value}'
    if tau_to_ak is not None:
        header_out['HISTORY'] = f'Converted tau_353 to Ak with factor {tau_to_ak}'
    
    # Set BSCALE and BZERO properly for float32 data
    # For floating point data, these should be default values
    header_out['BSCALE'] = 1.0
    header_out['BZERO'] = 0.0
    
    # Write output
    hdu_out = fits.PrimaryHDU(data=array.astype(np.float32), header=header_out)
    hdu_out.writeto(output_file, overwrite=True)
    
    print(f"\nSaved reprojected image to: {output_file}")
    
    # Also save the WCS as a separate file for reference
    wcs_file = Path(output_file).with_suffix('.wcs')
    with open(wcs_file, 'w') as f:
        f.write(header_out.tostring())
    print(f"Saved WCS header to: {wcs_file}")


def main():
    # Define paths (the FITS files are not in git; put them in public/ or pass them)
    # usage: python reproject_orion.py [input.fits] [output.fits]
    script_dir = Path(__file__).parent
    input_file = Path(sys.argv[1]) if len(sys.argv) > 1 else script_dir / 'public' / 'Orion_TAU353_full.fits'
    output_file = Path(sys.argv[2]) if len(sys.argv) > 2 else script_dir / 'public' / 'Orion_TAU353_reprojected.fits'
    
    # Check if input file exists
    if not input_file.exists():
        print(f"Error: Input file not found: {input_file}")
        return 1
    
    # Reproject the image
    # You can customize output_shape, pixel_scale, frame, and tau_to_ak here
    # Example: output_shape=(1000, 1000), pixel_scale=0.01, frame='galactic'
    # 
    # Conversion factors for tau_353 to Ak:
    # - Lada et al. 2010: Av/tau_353 = 1.94e4, with Ak/Av = 0.112 -> Ak/tau_353 ≈ 2173
    # - Lewis et al. 2022: May use different calibration -> Ak/tau_353 ≈ 3553
    reproject_fits(
        input_file, 
        output_file,
        output_shape=None,  # Use automatic sizing
        pixel_scale=None,   # Use input pixel scale
        frame='icrs',       # Use ICRS (RA/Dec) frame
        tau_to_ak=3553      # Convert tau_353 to Ak (set to None to keep as tau_353)
    )
    
    return 0


if __name__ == '__main__':
    exit(main())
