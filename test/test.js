const { expect } = require('chai');
const { readFileSync } = require('fs');
const { fromArrayBuffer } = require('geotiff');
const { getStats } = require('../index.js');

const SECONDS_TO_MILLISECONDS = 1000;

describe("GeoTIFF.js Test Data", function() {
  this.timeout(50 * SECONDS_TO_MILLISECONDS);
  it('GeoTIFF without Statistics', async function() {
    const data = readFileSync('./test/data/initial.tiff');
    const arrayBuffer = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength);
    const geotiff = await fromArrayBuffer(arrayBuffer);
    const image = await geotiff.getImage();
    const { bands } = await getStats(image, true);
    expect(bands[0].min).to.equal(0);
    expect(bands[0].max).to.equal(65507);
  });
  it('GeoTIFF with Statistics', async function() {
    const data = readFileSync('./test/data/stats.tiff');
    const arrayBuffer = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength);
    const geotiff = await fromArrayBuffer(arrayBuffer);
    const image = await geotiff.getImage();
    const { bands } = await getStats(image, true);
    expect(bands[0].min).to.equal(0);
    expect(bands[0].max).to.equal(65507);
  });
});

describe("Landsat Data", function() {
  this.timeout(5 * SECONDS_TO_MILLISECONDS);
  it('should get stats for Landsat Scene', async function() {
    const data = readFileSync('./test/data/LC80120312013106LGN01_B6.tif');
    const arrayBuffer = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength);
    const geotiff = await fromArrayBuffer(arrayBuffer);
    const image = await geotiff.getImage();
    const { bands } = await getStats(image, true);
    expect(bands[0].min).to.equal(0);
    expect(bands[0].max).to.equal(62196);
  });
});

describe("GHSL Data", function() {
  it('should get stats for worldwide GHSL', async function() {
    const data = readFileSync('./test/data/GHS_POP_E2015_GLOBE_R2019A_54009_250_V1_0.tif');
    const arrayBuffer = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength);
    const geotiff = await fromArrayBuffer(arrayBuffer);
    const image = await geotiff.getImage();
    const { bands } = await getStats(image, true);
    expect(bands[0].min).to.equal(0);
    expect(bands[0].max).to.equal(442590.9375 );
  });
});
