const { expect } = require('chai');
const { readFileSync } = require('fs');
const { fromArrayBuffer, fromUrls } = require('geotiff');
const { getStats } = require('../index.js');

const SECONDS_TO_MILLISECONDS = 1000;

async function getStatsFromFilepath(filepath, debug=false) {
    const data = readFileSync(filepath);

    if (data.byteLength === 0) {
      throw new Error("This file has 0 bytes: " + filepath);
    }

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
  it('should get stats for old downloaded Landsat Scene', async function() {
    this.timeout(20 * SECONDS_TO_MILLISECONDS);
    const debug = false;
    const { bands } = await getStatsFromFilepath('./test/data/LC80120312013106LGN01_B6.tif', debug);
    expect(bands[0].min).to.equal(0);
    expect(bands[0].max).to.equal(62196);
  });
  it('should get stats for newer downloaded Landsat Scene', async function() {
    this.timeout(20 * SECONDS_TO_MILLISECONDS);
    const debug = false;
    const { bands } = await getStatsFromFilepath('./test/data/LC08_L1TP_024030_20180723_20180731_01_T1_B1.TIF', debug);
    expect(bands[0].min).to.equal(0);
    // this gives different results than GDAL, but is consistent with rasterio
    // import rasterio; rasterio.open("./test/data/LC08_L1TP_024030_20180723_20180731_01_T1_B1.TIF").read()[0].max()
    expect(bands[0].max).to.equal(54590);
  });
  it('should get stats for online Landsat Scene with overview file', async function() {
    this.timeout(20 * SECONDS_TO_MILLISECONDS);
    const debug = false;
    const folder_url = "https://landsat-pds.s3.amazonaws.com/c1/L8/139/045/LC08_L1TP_139045_20170304_20170316_01_T1";
    const geotiff_url = folder_url + "/LC08_L1TP_139045_20170304_20170316_01_T1_B1.TIF";
    const overview_url = folder_url + "/LC08_L1TP_139045_20170304_20170316_01_T1_B1.TIF.ovr";
    const geotiff = await fromUrls(geotiff_url, [overview_url]);
    if (debug) console.log("geotiff.overviewFiles:", geotiff.overviewFiles);
    const image = await geotiff.getImage(1);
    if (debug) console.log("image:", image);
    const { bands } = await getStats(image, debug);
    expect(bands[0].min).to.equal(0);
    expect(bands[0].max).to.equal(25977);
  });
});

describe("GHSL Data", function() {
  it('should get stats for worldwide GHSL', async function() {
    const { bands } = await getStatsFromFilepath('./test/data/GHS_POP_E2015_GLOBE_R2019A_54009_250_V1_0.tif');
    expect(bands[0].min).to.equal(0);
    expect(bands[0].max).to.equal(442590.9375 );
  });
});
