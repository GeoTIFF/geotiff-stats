# geotiff-stats
Get Statistics from a Large GeoTIFF while Using a Low Amount of Memory
# install
`npm install geotiff-stats`

# problem
I wanted to load a Landsat scene into geotiff.io, but my Chromebook couldn't load all the values into memory in order to calculate the minimum and maximum.  This package was created, in order to enable people on low-memory devices to iteratively loop over pixel values in a GeoTIFF image and calculate aggregate statistics like minimum and maximum.

# usage
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

# accessing data from a specific band
getStats returns an object with the max and min for each band.  You can access the max for the 3rd band (index of 2) with the following: `results.bands[2].max`

# contact
Post an issue at https://github.com/GeoTIFF/geotiff-stats/issues or email the package author Daniel J. Dufour at daniel.j.dufour@gmail.com
