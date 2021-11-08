const findAndRead = require("find-and-read");
const test = require("flug");
const toab = require("toab");

const { fromArrayBuffer, fromUrls } = require("geotiff");
const { getStats } = require("./index.js");
const getGDALStats = require("./get-gdal-stats");
const calcBandStats = require("./calc-band-stats");
const iterTiles = require("./iter-tiles.js");
const iterPixels = require("./iter-pixels.js");

const findAndReadGeoTIFF = async name => {
  const buf = await findAndRead(name);
  if (buf.byteLength === 0) throw new Error("file has 0 bytes");
  const ab = await toab(buf);
  return fromArrayBuffer(ab);
};

test("tile iteration", async ({ eq }) => {
  const geotiff = await findAndReadGeoTIFF("GeogToWGS84GeoKey5.tif");
  const image = await geotiff.getImage(0);
  const iter = iterTiles(image);
  let count = 0;

  let tile;
  for await (tile of iter) {
    count++;
    eq(tile.length, 1);
    eq([5, 8].includes(tile.height), true);
    eq(tile.width, 101);
    eq([101 * 8, 101 * 5].includes(tile[0].length), true);
  }
});

test("pixel iteration", async ({ eq }) => {
  const geotiff = await findAndReadGeoTIFF("GeogToWGS84GeoKey5.tif");
  const image = await geotiff.getImage(0);
  const height = image.getHeight();
  eq(height, 101);
  const width = image.getWidth();
  eq(width, 101);
  const area = height * width;
  eq(area, 10201);
  const iter = iterPixels({ image, sample: 0 });
  let count = 0;
  for await (pixel of iter) {
    count++;
  }
  eq(count, area);
});

test("GeoTIFF with Color Palette", async ({ eq }) => {
  const geotiff = await findAndReadGeoTIFF("GeogToWGS84GeoKey5.tif");
  const image = await geotiff.getImage(0);
  const stats = await getStats(image, false);
  eq(stats, {
    bands: [
      {
        median: 2,
        min: 0,
        max: 2,
        sum: 18327,
        mean: 1.796588569748064,
        histogram: {
          0: { n: 0, ct: 1037 },
          1: { n: 1, ct: 1 },
          2: { n: 2, ct: 9163 }
        },
        modes: [2],
        mode: 2
      }
    ]
  });
});

test("GeoTIFF with 50 Bands and Sufficient GDAL Metadata", async ({ eq }) => {
  const geotiff = await findAndReadGeoTIFF(
    "abetow-ERD2018-EBIRD_SCIENCE-20191109-a5cf4cb2_hr_2018_abundance_median.tiff"
  );
  const image = await geotiff.getImage(0);
  const stats = await getStats(image, false);
  eq(stats, {
    bands: [
      { max: 9.7544279098511, min: 0 },
      { max: 8.0268106460571, min: 0 },
      { max: 7.5575194358826, min: 0 },
      { max: 8.1030435562134, min: 0 },
      { max: 7.8772916793823, min: 0 },
      { max: 8.1386680603027, min: 0 },
      { max: 8.0033168792725, min: 0 },
      { max: 7.8162579536438, min: 0 },
      { max: 7.7347140312195, min: 0 },
      { max: 7.3182582855225, min: 0 },
      { max: 7.2544522285461, min: 0 },
      { max: 6.4744348526001, min: 0 },
      { max: 5.9061455726624, min: 0 },
      { max: 6.0884804725647, min: 0 },
      { max: 6.1409721374512, min: 0 },
      { max: 6.9471464157104, min: 0 },
      { max: 6.7919926643372, min: 0 },
      { max: 7.1424775123596, min: 0 },
      { max: 7.8350172042847, min: 0 },
      { max: 8.4386291503906, min: 0 },
      { max: 8.8700618743896, min: 0 },
      { max: 10.158813476562, min: 0 },
      { max: 10.562696456909, min: 0 },
      { max: 9.9366149902344, min: 0 },
      { max: 10.163953781128, min: 0 },
      { max: 9.8941698074341, min: 0 },
      { max: 9.4827003479004, min: 0 },
      { max: 8.7912473678589, min: 0 },
      { max: 8.0593023300171, min: 0 },
      { max: 8.3999433517456, min: 0 },
      { max: 8.6393766403198, min: 0 },
      { max: 9.123348236084, min: 0 },
      { max: 9.5504579544067, min: 0 },
      { max: 10.156976699829, min: 0 },
      { max: 10.826090812683, min: 0 },
      { max: 10.796345710754, min: 0 },
      { max: 11.531585693359, min: 0 },
      { max: 11.836143493652, min: 0 },
      { max: 12.17227268219, min: 0 },
      { max: 12.052537918091, min: 0 },
      { max: 11.457691192627, min: 0 },
      { max: 11.130515098572, min: 0 },
      { max: 11.44605255127, min: 0 },
      { max: 11.915058135986, min: 0 },
      { max: 11.952184677124, min: 0 },
      { max: 12.19713306427, min: 0 },
      { max: 12.336188316345, min: 0 },
      { max: 12.513179779053, min: 0 },
      { max: 12.301235198975, min: 0 },
      { max: 11.876184463501, min: 0 },
      { max: 11.081751823425, min: 0 },
      { max: 10.436447143555, min: 0 }
    ]
  });
});

test("GeoTIFF Negative Float NoData Value", async ({ eq }) => {
  const geotiff = await findAndReadGeoTIFF("eu_pasture.tiff");
  const image = await geotiff.getImage(0);
  const stats = await getStats(image, { calcStatsOptions: { calcHistogram: false } });
  eq(stats, {
    bands: [
      {
        median: 0.07599999755620956,
        min: 0,
        max: 1,
        sum: 13169.575007609557,
        mean: 0.12035362450293864,
        modes: [0],
        mode: 0
      }
    ]
  });
});

// NoData Value EU Pasture: -3.4028234663852886e+38
// GDAL_NODATA: '-3.39999999999999996e+38\x00'    (11111111011111111100100110011110)
// getGDALNoData(): -3.4e+38                      (11111111011111111100100110011110)
// gdalinfo NoData Value:"-3.39999995214436425e+38"
// Math.fround(-3.4e+38): -3.3999999521443642e+38 (11111111011111111100100110011110) (0xff7fc99e)
// from readRasters -3.4028234663852886e+38 (1 11111110 11111111111111111111111) (0xff7fffff)
// negative float has 1 as first bit
test("GeoTIFF Very Small Floating Point No Data", async ({ eq }) => {
  const geotiff = await findAndReadGeoTIFF("nt_20201024_f18_nrt_s.tif");
  const image = await geotiff.getImage(0);

  const stats_from_gdal = await getGDALStats(image, 0);
  const stats_from_calc_stats = await calcBandStats({
    image,
    bandIndex: 0,
    calcStatsOptions: { calcHistogram: false }
  });

  eq(stats_from_gdal.min === 0, true);

  eq(stats_from_calc_stats.min < 0, true);

  const stats_from_both = await getStats(image, {
    calcStats: true,
    calcStatsOptions: {
      calcHistogram: false,
      calcModes: false
    },
    enough: ["min", "max", "mean", "median"]
  });
  eq(stats_from_both, {
    bands: [
      {
        max: 100,
        min: 0,
        mean: 28.56028866907934,
        stddev: 39.349526064368,
        median: 0,
        sum: 2366591.1999859214,
        mode: 0
      }
    ]
  });
});

test("utm.tif", async ({ eq }) => {
  const geotiff = await findAndReadGeoTIFF("utm.tif");
  const image = await geotiff.getImage(0);
  const stats = await getStats(image, { calcStatsOptions: { calcHistogram: false } });
  eq(stats, { bands: [{ median: 1, min: 0, max: 12, sum: 29700, mean: 2.97, modes: [1], mode: 1 }] });
});

test("Another 32-Bit with Very Small NoData Value and GDAL Stats", async ({ eq }) => {
  const geotiff = await findAndReadGeoTIFF("vestfold.tif");
  const image = await geotiff.getImage(0);
  const stats = await getStats(image, {
    enough: ["min", "max", "median"],
    calcStatsOptions: { calcHistogram: false, calcModes: false }
  });
  eq(stats, {
    bands: [
      {
        max: 332.6073303222656,
        min: 18.10380744934082,
        mean: 83.63895923263823,
        stddev: 69.590554367352,
        median: 59.32421112060547,
        sum: 32327043.216129303,
        mode: 47.442052046457924
      }
    ]
  });
});

test("Float32 with Implicit NoData Value", async ({ eq }) => {
  const geotiff = await findAndReadGeoTIFF("wind_direction.tif");
  const image = await geotiff.getImage(0);
  const stats = await getStats(image, {
    calcStatsOptions: { calcHistogram: false, noData: -32767 }
  });
  eq(stats, {
    bands: [
      {
        median: 143.40000915527344,
        min: 0.800000011920929,
        max: 358.3999938964844,
        sum: 4715553.3886889815,
        mean: 145.5013542129958,
        modes: [143.8000030517578],
        mode: 143.8000030517578
      }
    ]
  });
});

test("should get stats for old downloaded Landsat Scene", async ({ eq }) => {
  const geotiff = await findAndReadGeoTIFF("LC80120312013106LGN01_B6.tif");
  const image = await geotiff.getImage(0);
  const stats = await getStats(image, { calcStatsOptions: { calcHistogram: false, calcModes: false } });
  eq(stats, {
    bands: [
      {
        median: 5901,
        min: 0,
        max: 62196,
        sum: 414171673183,
        mean: 7021.089224143871,
        mode: 0
      }
    ]
  });
});

test("should get stats for newer downloaded Landsat Scene", async ({ eq }) => {
  const geotiff = await findAndReadGeoTIFF("LC08_L1TP_024030_20180723_20180731_01_T1_B1.TIF");
  const image = await geotiff.getImage(0);
  const stats = await getStats(image, { calcStatsOptions: { calcHistogram: false, calcModes: false } });
  eq(stats, {
    bands: [
      {
        median: 10636,
        min: 0,
        max: 54590,
        sum: 534118092789,
        mean: 8396.294254804296,
        mode: 0
      }
    ]
  });
});

test("geotiff.js test file", async ({ eq }) => {
  const geotiff = await findAndReadGeoTIFF("initial.tiff");
  const image = await geotiff.getImage(0);
  const stats = await getStats(image, { calcStatsOptions: { calcHistogram: false, calcModes: false } });
  eq(stats.bands[0], {
    median: 3654,
    min: 0,
    max: 65507,
    sum: 1077702375,
    mean: 4463.053169725683,
    mode: 0
  });
});

test("Landsat 8 overview", async ({ eq }) => {
  const folder_url = "https://landsat-pds.s3.amazonaws.com/c1/L8/139/045/LC08_L1TP_139045_20170304_20170316_01_T1";
  const geotiff_url = folder_url + "/LC08_L1TP_139045_20170304_20170316_01_T1_B1.TIF";
  const overview_url = folder_url + "/LC08_L1TP_139045_20170304_20170316_01_T1_B1.TIF.ovr";
  const geotiff = await fromUrls(geotiff_url, [overview_url]);
  const image = await geotiff.getImage(1);
  const stats = await getStats(image, { calcStatsOptions: { calcHistogram: false } });
  eq(stats, {
    bands: [
      {
        median: 11655,
        min: 0,
        max: 25977,
        sum: 54734416270,
        mean: 8326.69410820969,
        modes: [0],
        mode: 0
      }
    ]
  });
});

/*
describe("GHSL Data", function() {
  it('should get stats for worldwide GHSL', async function() {
    this.timeout(20 * SECONDS_TO_MILLISECONDS);
    const { bands } = await getStatsFromFilepath('./test/data/GHS_POP_E2015_GLOBE_R2019A_54009_250_V1_0.tif');
    expect(bands[0].min).to.equal(0);
    expect(bands[0].max).to.equal(442590.9375 );
  });
});
*/
