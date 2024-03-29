#!/bin/sh -e

# download from https://github.com/GeoTIFF/test-data/
wget https://github.com/GeoTIFF/test-data/archive/refs/heads/main.zip -O geotiff-test-data.zip
unzip -j -o geotiff-test-data.zip "test-data-*/files/*" -d .
rm geotiff-test-data.zip

# # files used by geotiff.js for testing
wget https://github.com/EOxServer/autotest/raw/f8d9f4bde6686abbda09c711d4bf5239f5378aa9/autotest/data/meris/MER_FRS_1P_reduced/ENVISAT-MER_FRS_1PNPDE20060816_090929_000001972050_00222_23322_0058_uint16_reduced_compressed.tif -O initial.tiff

# # statistics
# cp initial.tiff stats.tiff
# gdal_edit.py -stats stats.tiff


wget "https://landsat-pds.s3.amazonaws.com/L8/012/031/LC80120312013106LGN01/LC80120312013106LGN01_B6.TIF" -O LC80120312013106LGN01_B6.tif

wget "https://landsat-pds.s3.amazonaws.com/c1/L8/024/030/LC08_L1TP_024030_20180723_20180731_01_T1/LC08_L1TP_024030_20180723_20180731_01_T1_B1.TIF" -O LC08_L1TP_024030_20180723_20180731_01_T1_B1.TIF

# # download Global Human Settlement Layer
# wget http://cidportal.jrc.ec.europa.eu/ftp/jrc-opendata/GHSL/GHS_POP_MT_GLOBE_R2019A/GHS_POP_E2015_GLOBE_R2019A_54009_250/V1-0/GHS_POP_E2015_GLOBE_R2019A_54009_250_V1_0.zip
# unzip GHS_POP_E2015_GLOBE_R2019A_54009_250_V1_0.zip

# wget https://geotiff-stats.s3.amazonaws.com/rgb_raster.tif
