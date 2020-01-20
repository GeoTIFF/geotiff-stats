# geotiff-stats
Get Statistics from a Large GeoTIFF while Using a Low Amount of Memory
# install
`npm install geotiff-stats`

# problem
I wanted to load a Landsat scene into geotiff.io, but my Chromebook couldn't load all the values into memory in order to calculate the minimum and maximum.  This package was created, in order to enable people on low-memory devices to iteratively loop over pixel values in a GeoTIFF image and calculate aggregate statistics like minimum and maximum.

# usage
## downloaded GeoTIFF
```javascript
const { readFileSync } = require('fs');
const { fromArrayBuffer } = require('geotiff');
const { getStats } = require('geotiff-stats');


const data = readFileSync('LC80120312013106LGN01_B6.tif');
const arrayBuffer = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength);
const geotiff = await fromArrayBuffer(arrayBuffer);
const image = await geotiff.getImage();
const results = await getStats(image);
console.log(results);
// { bands: [{ min: 0, max: 62196 }] }
```

## remote Cloud Optimized GeoTIFF
For large Cloud Optimized GeoTIFFs, it is recommended to calculate statistics from the overview file instead of the raw full-resolution GeoTIFF.  Calculating from the overview file will be roughly 10x faster than the full-resolution GeoTIFF.
```javascript
const { fromUrls } = require('geotiff');
const { getStats } = require('geotiff-stats');


const folder_url = "https://landsat-pds.s3.amazonaws.com/c1/L8/139/045/LC08_L1TP_139045_20170304_20170316_01_T1";
const geotiff_url = folder_url + "/LC08_L1TP_139045_20170304_20170316_01_T1_B1.TIF";
const overview_url = folder_url + "/LC08_L1TP_139045_20170304_20170316_01_T1_B1.TIF.ovr";
const geotiff = await fromUrls(geotiff_url, [overview_url]);
const image = await geotiff.getImage(1); // grabs the overview file
const results = await getStats(image);
console.log(results);
// { bands: [{ min: 0, max: 25977 }] }
```

# accessing data from a specific band
getStats returns an object with the max and min for each band.  You can access the max for the 3rd band (index of 2) with the following: `results.bands[2].max`

# contact
Post an issue at https://github.com/GeoTIFF/geotiff-stats/issues or email the package author Daniel J. Dufour at daniel.j.dufour@gmail.com
