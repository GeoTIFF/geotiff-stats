const getGDALStats = require("./get-gdal-stats");
const calcBandStats = require("./calc-band-stats");

/**
 * @name getStats
 * @param {Object} image - the image object from tiff.getImage() using the geotiff.js library
 * @param {Object} options
 * @param {Object} options.debug - set to true to log more information
 * @param {Array<String>} options.enough - if these stats are in the GDAL Metadata, then we will avoid running calcStats on all the images' pixels. default is ["min", "max"]. valid values are "min", "max", "median", "mean", "sum", "mode", "modes"
 * @param {Object} options.calcStatsOptions - options to pass along to [calc-stats](https://github.com/danieljdufour/calc-stats#advanced-usage)
 * @returns {Array<Object>} - Array of Statistics Objects
 */
async function getStats(image, options = {}) {
  // support old getStats(image, debug)
  if (options === true) options = { calcStatsOptions: undefined, debug: true };

  const { debug, enough = ["min", "max"] } = options || {};
  if (debug) console.log("[geotiff-stats] debug:", debug);

  const calcStatsOptions = typeof options.calcStatsOptions === "object" ? { ...options.calcStatsOptions } : {};

  const noDataValue = image.getGDALNoData();
  if (debug) console.log("[geotiff-stats] noDataValue:", noDataValue);

  const samplesPerPixel = image.getSamplesPerPixel();
  if (debug) console.log("[geotiff-stats] samplesPerPixel:", samplesPerPixel);

  const stats = {
    bands: []
  };

  for (let bandIndex = 0; bandIndex < samplesPerPixel; bandIndex++) {
    if (debug) console.log("[geotiff-stats] bandIndex:", bandIndex);
    let bandStats = getGDALStats(image, bandIndex);

    const isFloat = image.getSampleFormat(bandIndex) === 3;

    const sufficient = enough.every(key => typeof bandStats[key] === "number");
    if (debug) console.log("[geotiff-stats] sufficient:", sufficient);

    if (!sufficient) {
      if (debug)
        console.log(
          "[geotiff-stats] we weren't able to parse enough stats from the image's metadata, so running calcStats"
        );

      // let rangeFilter;
      // if (typeof bandStats.max === "number" && typeof bandStats.min === "number") {
      //   rangeFilter = ({ value }) => value >= bandStats.min && value <= bandStats.max;
      // } else if (typeof bandStats.max === "number") {
      //   rangeFilter = ({ value }) => value <= bandStats.max;
      // } else if (typeof bandStats.min === "number") {
      //   rangeFilter = ({ value }) => value >= bandStats.min;
      // }

      let signFilter;
      if (isFloat && typeof bandStats.min === "number" && bandStats.min >= 0) {
        // sometimes there's an inconsistency in the GDAL NoData value for 32-bit floating point rasters
        // and I'm not sure why, but we can fix it
        // if all the values are positive (according to the GDAL Metadata), except for the No Data Value,
        // then if we see a negative number, it's probably going to supposed to be no data
        signFilter = ({ value }) => value >= 0;
      }

      if (typeof signFilter === "function") {
        if (typeof calcStatsOptions.filter === "function") {
          const userProvidedFilter = calcStatsOptions.filter;
          calcStatsOptions.filter = data => {
            return signFilter(data) && userProvidedFilter(data);
          };
        } else {
          calcStatsOptions.filter = signFilter;
        }
      }
      const calculated = await calcBandStats({ image, bandIndex, calcStatsOptions });
      Object.assign(bandStats, calculated);
    }

    stats.bands.push(bandStats);
  }
  if (debug) console.log("[geotiff-stats] returning: " + JSON.stringify(stats));
  return stats;
}

if (typeof module === "object") module.exports = { getStats };
if (typeof window === "object") window.getStats = getStats;
