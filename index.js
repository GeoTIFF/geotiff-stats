const { getDecoder } = require('geotiff/dist/compression');

// took this from geotiff package
function sum(array, start, end) {
  let s = 0;
  for (let i = start; i < end; ++i) {
    s += array[i];
  }
  return s;
}

async function getStats(image, debug){

  const fd = image.fileDirectory;
  if (debug) console.log("fd:", fd);
  const numBands = fd.SamplesPerPixel;
  if (debug) console.log("numBands:", numBands);

  const tileWidth = image.getTileWidth();
  if (debug) console.log("tileWidth:", tileWidth);

  const tileHeight = image.getTileHeight();

  let bytesPerPixel = image.getBytesPerPixel();
  if (debug) console.log("bytesPerPixel:", bytesPerPixel);

  const srcSampleOffsets = [];
  const sampleReaders = [];
  for (let i = 0; i < numBands; ++i) {
    if (image.planarConfiguration === 1) {
      srcSampleOffsets.push(sum(fd.BitsPerSample, 0, i) / 8);
    } else {
      srcSampleOffsets.push(0);
    }
    sampleReaders.push(image.getReaderForSample(i));
  }

  const numTilesPerRow = Math.ceil(image.getWidth() / image.getTileWidth());
  if (debug) console.log("numTilesPerRow:", numTilesPerRow);
  const numTilesPerCol = Math.ceil(image.getHeight() / image.getTileHeight());
  if (debug) console.log("numTilesPerCol:", numTilesPerCol);

  const noDataValue = fd.GDAL_NODATA ? parseFloat(fd.GDAL_NODATA) : null;
  if (debug) console.log("noDataValue:", noDataValue);

  const bandResults = [];

  for (let bandIndex = 0; bandIndex < numBands; bandIndex++) {
    if (debug) console.log("bandIndex:", bandIndex);
    let min = undefined;
    let max = undefined;

    const gdalMetadata = image.getGDALMetadata(bandIndex);
    if (debug) console.log("gdalMetadata:", gdalMetadata);
    if (gdalMetadata) {
      if (typeof gdalMetadata.STATISTICS_MAXIMUM !== 'undefined') {
        max = parseFloat(gdalMetadata.STATISTICS_MAXIMUM);
      }
      if (typeof gdalMetadata.STATISTICS_MINIMUM !== 'undefined') {
        min = parseFloat(gdalMetadata.STATISTICS_MINIMUM);
      }
    }

    if (min === undefined || max === undefined) {
      for (let rowIndex = 0; rowIndex < numTilesPerCol; rowIndex++) {
        for (let colIndex = 0; colIndex < numTilesPerRow; colIndex++) {
          const reader = sampleReaders[bandIndex];
          if (image.planarConfiguration === 2) {
            bytesPerPixel = image.getSampleByteSize(bandIndex);
          }
          const decoder = getDecoder(fd);
          const tile = await image.getTileOrStrip(colIndex, rowIndex, bandIndex, decoder);
          const dataView = new DataView(tile.data);
          const { byteLength } = dataView;
          for (let y = 0; y < tileHeight; y++) {
            for (let x = 0; x < tileWidth; x++) {
              const pixelOffset = ((y * tileWidth) + x) * bytesPerPixel;

              const byteOffset = pixelOffset + srcSampleOffsets[bandIndex];
              if (byteOffset >= byteLength) {
                /* we've reached the end of this row,
                  so we can continue to the next row */
                continue;
              } else {
                const value = reader.call(dataView, byteOffset, image.littleEndian);
                if (value != noDataValue && !isNaN(value)) {
                  if (typeof min === 'undefined' || value < min) min = value;
                  else if (typeof max === 'undefined' || value > max) max = value;
                }
              }
            }
          }
        }
      }
    }
    bandResults.push({ max, min });
  }
  return { bands: bandResults };
}


module.exports = { getStats };