const xpath = require('xpath');
const { getDecoder } = require('geotiff/dist/compression');
const { parseXml } = require('geotiff/dist/globals');

function times(numTimes, func) {
  const results = [];
  for (let i = 0; i < numTimes; i++) {
    results.push(func(i));
  }
  return results;
}

// took this from geotiff package
function sum(array, start, end) {
  let s = 0;
  for (let i = start; i < end; ++i) {
    s += array[i];
  }
  return s;
}

// takes in a sequence of functions that return promises
// and runs them one by one
// inspired by https://stackoverflow.com/questions/24586110/resolve-promises-one-after-another-i-e-in-sequence
function chain(funcs) {
  const results = [];
  return funcs.reduce((prev, func, i) => {
    return prev.then(func().then(result => {
      results.push(result);
    }));
  }, Promise.resolve())
  .then(() => results);
}

// gets stats for an individual tile
function getTileStats({ bandIndex, bytesPerPixel, colIndex, debug, decoder, image, littleEndian, noDataValue, reader, rowIndex, srcSampleOffsets, tileHeight, tileWidth }) {
  return image.getTileOrStrip(colIndex, rowIndex, bandIndex, decoder).then(tile => {
    //if (debug) console.log("got tile", bandIndex, rowIndex, colIndex);
    let min, max;
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
          const value = reader.call(dataView, byteOffset, littleEndian);
          if (value != noDataValue && !isNaN(value)) {
            if (typeof min === 'undefined' || value < min) min = value;
            if (typeof max === 'undefined' || value > max) max = value;
          }
        }
      }
    }
    return { min, max };
  });
}

async function getBandStats({ bandIndex, bytesPerPixel, debug, decoder, GDAL_METADATA, image, littleEndian, noDataValue, numTilesPerCol, numTilesPerRow, sampleReaders, srcSampleOffsets, tileHeight, tileWidth }) {
  try {
    if (debug) console.log("starting getBandStats for band " + bandIndex);
    let min = undefined;
    let max = undefined;

    if (image.planarConfiguration === 2) {
      bytesPerPixel = image.getSampleByteSize(bandIndex);
    }

    const reader = sampleReaders[bandIndex];

    // try to get min and max via GDAL Metadata
    if (GDAL_METADATA) {
      const { min: gdalMin, max: gdalMax } = getGDALStats({ bandIndex, debug, GDAL_METADATA });
      if (typeof gdalMin !== 'undefined' && (typeof min === 'undefined' || gdalMin < min)) min = gdalMin;
      if (typeof gdalMax !== 'undefined' && (typeof max === 'undefined' || gdalMax > max)) max = gdalMax;
    }

    if (min === undefined || max === undefined) {
      if (debug) console.log("min:", min);
      if (debug) console.log("max:", max);
      for (let rowIndex = 0; rowIndex < numTilesPerCol; rowIndex++) {
        for (let colIndex = 0; colIndex < numTilesPerRow; colIndex++) {
          const { min: tileMin, max: tileMax } = await getTileStats({ bandIndex, bytesPerPixel, colIndex, debug, decoder, image, littleEndian, noDataValue, reader, rowIndex, srcSampleOffsets, tileHeight, tileWidth });
          if (typeof tileMin !== 'undefined' && (typeof min === 'undefined' || tileMin < min)) min = tileMin;
          if (typeof tileMax !== 'undefined' && (typeof max === 'undefined' || tileMax > max)) max = tileMax;
        }
      }
    }
    if (debug) console.log("finishing getBandStats for band " + bandIndex);
    return { max, min };
  } catch (error) {
    console.error("error in getBandStats:", error);
    throw error;
  }
}

function getGDALStats({ bandIndex, debug, GDAL_METADATA }) {
  if (debug) console.log("starting getGDALStats with", arguments);
  let min, max;
  const string = GDAL_METADATA;
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
  const stats = { max, min };
  if (debug) console.log("finishing getGDALStats with", stats);
  return stats;
}

async function getStats(image, debug){

  const fd = image.fileDirectory;
  if (debug) console.log("fd:", fd);
  const numBands = fd.SamplesPerPixel;
  if (debug) console.log("numBands:", numBands);

  const decoder = getDecoder(fd);
  if (debug) console.log("decoder:", decoder);

  const littleEndian = image.littleEndian;
  if (debug) console.log("littleEndian:", littleEndian);

  const tileWidth = image.getTileWidth();
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
  if (debug) console.log("sampleReaders:", sampleReaders);

  const numTilesPerRow = Math.ceil(image.getWidth() / image.getTileWidth());
  if (debug) console.log("numTilesPerRow:", numTilesPerRow);

  const numTilesPerCol = Math.ceil(image.getHeight() / image.getTileHeight());
  if (debug) console.log("numTilesPerCol:", numTilesPerCol);

  const GDAL_METADATA = fd.GDAL_METADATA;
  if (debug) console.log("GDAL_METADATA:", GDAL_METADATA);

  const noDataValue = fd.GDAL_NODATA ? parseFloat(fd.GDAL_NODATA) : null;
  if (debug) console.log("noDataValue:", noDataValue);

  return chain(times(numBands, bandIndex => {
    return () => getBandStats({ bandIndex, bytesPerPixel, debug, decoder, GDAL_METADATA, image, littleEndian, noDataValue, numTilesPerCol, numTilesPerRow, sampleReaders, srcSampleOffsets, tileHeight, tileWidth });
  })).then(bandResults => {
    console.log("bandResults:", bandResults);
    return { bands: bandResults };
  });
}


module.exports = { chain, getStats, times };