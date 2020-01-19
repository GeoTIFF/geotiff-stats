const { expect } = require('chai');
const { readFileSync } = require('fs');
const { fromArrayBuffer } = require('geotiff');
const { getStats } = require('../index.js');

const SECONDS_TO_MILLISECONDS = 1000;

async function getStatsFromFilepath(filepath, debug=false) {
    const data = readFileSync(filepath);
    const arrayBuffer = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength);
    const geotiff = await fromArrayBuffer(arrayBuffer);
    const image = await geotiff.getImage();
    return await getStats(image, debug);
}

describe("GeoTIFF.js Test Data", function() {
  this.timeout(50 * SECONDS_TO_MILLISECONDS);
  it('GeoTIFF without Statistics', async function() {
    const { bands } = await getStatsFromFilepath('./test/data/initial.tiff');
    expect(bands[0].min).to.equal(0);
    expect(bands[0].max).to.equal(65507);
  });
  it('GeoTIFF with Statistics', async function() {
    const { bands } = await getStatsFromFilepath('./test/data/initial.tiff');
    expect(bands[0].min).to.equal(0);
    expect(bands[0].max).to.equal(65507);
  });
  it('GeoTIFF with Color Palette', async function() {
    const { bands } = await getStatsFromFilepath('./test/data/GeogToWGS84GeoKey5.tif');
    expect(bands[0].min).to.equal(0);
    expect(bands[0].max).to.equal(2);
  });
  it('RGB GeoTIFF that has GDAL Metadata without Stats', async function() {
    const { bands } = await getStatsFromFilepath('./test/data/rgb_raster.tif');
    expect(bands[0].min).to.equal(0);
    expect(bands[0].max).to.equal(182);
    expect(bands[1].min).to.equal(0);
    expect(bands[1].max).to.equal(255);
    expect(bands[2].min).to.equal(0);
    expect(bands[2].max).to.equal(255);
  })
});

describe("Landsat Data", function() {
  this.timeout(5 * SECONDS_TO_MILLISECONDS);
  it('should get stats for Landsat Scene', async function() {
    const { bands } = await getStatsFromFilepath('./test/data/LC80120312013106LGN01_B6.tif');
    expect(bands[0].min).to.equal(0);
    expect(bands[0].max).to.equal(62196);
  });
});

describe("GHSL Data", function() {
  it('should get stats for worldwide GHSL', async function() {
    const { bands } = await getStatsFromFilepath('./test/data/GHS_POP_E2015_GLOBE_R2019A_54009_250_V1_0.tif');
    expect(bands[0].min).to.equal(0);
    expect(bands[0].max).to.equal(442590.9375 );
  });
});
