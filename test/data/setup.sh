# files used by geotiff.js for testing
wget https://github.com/EOxServer/autotest/raw/f8d9f4bde6686abbda09c711d4bf5239f5378aa9/autotest/data/meris/MER_FRS_1P_reduced/ENVISAT-MER_FRS_1PNPDE20060816_090929_000001972050_00222_23322_0058_uint16_reduced_compressed.tif -O initial.tiff

# statistics
cp initial.tiff stats.tiff
gdal_edit.py -stats stats.tiff


wget "https://landsat-pds.s3.amazonaws.com/L8/012/031/LC80120312013106LGN01/LC80120312013106LGN01_B6.TIF" -O LC80120312013106LGN01_B6.tif

# download Global Human Settlement Layer
wget wget http://cidportal.jrc.ec.europa.eu/ftp/jrc-opendata/GHSL/GHS_POP_MT_GLOBE_R2019A/GHS_POP_E2015_GLOBE_R2019A_54009_250/V1-0/GHS_POP_E2015_GLOBE_R2019A_54009_250_V1_0.zip
unzip GHS_POP_E2015_GLOBE_R2019A_54009_250_V1_0_8_4.zip

