const xpath = require('xpath');
const { getDecoder } = require('geotiff/dist/compression');
const { parseXml } = require('geotiff/dist/globals');

/*
async function getStats(image, options) {
  options = options || {};
  const maxBufferSize = options.maxBufferSize || 800; // this is 1 KB
  const debug = options.debug || false;

  if (debug) console.log("image:", image);

  const { fileDirectory } = image;

  const numBands = fileDirectory.SamplesPerPixel;

  const noDataValue = fileDirectory.GDAL_NODATA ? parseFloat(fileDirectory.GDAL_NODATA) : null;
  if (debug) console.log("noDataValue:", noDataValue);

  const bitsPerSample = Array.from(image.fileDirectory.BitsPerSample);
  console.log("bitsPerSample:", bitsPerSample);
  const chunkSizeInPixels = bitsPerSample.map(nbits => {
    return maxBufferSize / nbits;
  });
  console.log("chunkSizeInPixels:", chunkSizeInPixels);
  const sides = chunkSizeInPixels.map(size => Math.round(Math.sqrt(size)));
  if (debug) console.log("sides:", sides);
  const chunkHeights = sides.map(side => side);
  const chunkWidths = sides.map(side => side);
  console.log("width:", image.getWidth());
  const numRowsOfChunks = chunkHeights.map(chunkHeight => Math.ceil(image.getHeight() / chunkHeight));
  const numColumnsOfChunks = chunkWidths.map(chunkWidth => Math.ceil(image.getWidth() / chunkWidth));

  const maxes = [];
  const mins = [];

  for (let bandIndex = 0; bandIndex < numBands; bandIndex++) {
      const chunkHeight = chunkHeights[bandIndex];
      const chunkWidth = chunkWidths[bandIndex];
      for (let rowIndex = 0; rowIndex < numRowsOfChunks; rowIndex++) {
        for (let columnIndex = 0; columnIndex < numColumnsOfChunks; columnIndex++) {
          const top = rowIndex * chunkHeight;
          const left = columnIndex * chunkWidth;
          const right = left + chunkWidth;
          const bottom = top + chunkHeight;
          const params = {
            samples: [bandIndex],
            window: [left, top, right, bottom]
          };
          console.log("params:", params);
          const chunk = await image.readRasters(options);
          console.log("chunk:", chunk);
        }
      }
  }
}
*/

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