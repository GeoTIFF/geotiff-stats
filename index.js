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

async function getStats(image){

  const fd = image.fileDirectory;
  const numBands = fd.SamplesPerPixel;

  const tileWidth = image.getTileWidth();
  const tileHeight = image.getTileHeight();

  let bytesPerPixel = image.getBytesPerPixel();

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
  const numTilesPerCol = Math.ceil(image.getHeight() / image.getTileHeight());

  const noDataValue = fd.GDAL_NODATA ? parseFloat(fd.GDAL_NODATA) : null;

  const bandResults = [];

  for (let bandIndex = 0; bandIndex < numBands; bandIndex++) {
    let min = undefined;
    let max = undefined;
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
    } else {
      for (let rowIndex = 0; rowIndex < numTilesPerCol; rowIndex++) {
        for (let colIndex = 0; colIndex < numTilesPerRow; colIndex++) {
          const reader = sampleReaders[bandIndex];
          if (image.planarConfiguration === 2) {
            bytesPerPixel = image.getSampleByteSize(bandIndex);
          }
          const decoder = getDecoder(fd);
          const tile = await image.getTileOrStrip(colIndex, rowIndex, bandIndex, decoder);
          const dataView = new DataView(tile.data);
          for (let y = 0; y < tileHeight; y++) {
            for (let x = 0; x < tileWidth; x++) {
              const pixelOffset = ((y * tileWidth) + x) * bytesPerPixel;
              const value = reader.call(
                dataView, pixelOffset + srcSampleOffsets[bandIndex], image.littleEndian,
              );
              if (value != noDataValue && !isNaN(value)) {
                if (typeof min === 'undefined' || value < min) min = value;
                else if (typeof max === 'undefined' || value > max) max = value;
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