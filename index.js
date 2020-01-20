const xpath = require('xpath');
const { getDecoder } = require('geotiff/dist/compression');
const { parseXml } = require('geotiff/dist/globals');

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

    // try to get min and max via GDAL Metadata
    if (fd.GDAL_METADATA) {
      const string = fd.GDAL_METADATA;
      const xmlDom = parseXml(string.substring(0, string.length - 1));
      const evaluator = xmlDom.evaluate ? xmlDom : xpath;
      const result = evaluator.evaluate(`GDALMetadata/Item`, xmlDom, null, 6, null);
      for (let i = 0; i < result.snapshotLength; ++i) {
        const node = result.snapshotItem(i);
        if (node.getAttribute('sample') == bandIndex) {
          const nodeName = node.getAttribute('name');
          if (nodeName === "STATISTICS_MAXIMUM") {
            max = parseFloat(node.textContent);
          } else if (nodeName === "STATISTICS_MINIMUM") {
            min = parseFloat(node.textContent);
          }
        }
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