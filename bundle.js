(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
const calcStats = require("calc-stats");
const iterPixels = require("./iter-pixels");

module.exports = function calcBandStats({ image, bandIndex, calcStatsOptions = {} }) {
  const noDataValue = image.getGDALNoData();

  const pixels = iterPixels({ image, sample: bandIndex });

  // clone to preserve immutabilty
  calcStatsOptions = { ...calcStatsOptions };
  calcStatsOptions.async = true;
  if (noDataValue !== null) calcStatsOptions.noData = noDataValue;

  return calcStats(pixels, calcStatsOptions);
};

},{"./iter-pixels":4,"calc-stats":6}],2:[function(require,module,exports){
module.exports = function getGDALStats(image, bandIndex) {
  if (typeof bandIndex !== "number") throw new Error("you must specify bandIndex");

  const bandStats = {};

  const gdalMetadata = image.getGDALMetadata(bandIndex);

  if (gdalMetadata) {
    if (["string", "number"].includes(typeof gdalMetadata.STATISTICS_MAXIMUM)) {
      const max = Number(gdalMetadata.STATISTICS_MAXIMUM);
      if (!isNaN(max)) bandStats.max = max;
    }
    if (["string", "number"].includes(typeof gdalMetadata.STATISTICS_MINIMUM)) {
      const min = Number(gdalMetadata.STATISTICS_MINIMUM);
      if (!isNaN(min)) bandStats.min = min;
    }
    if (["string", "number"].includes(typeof gdalMetadata.STATISTICS_MEAN)) {
      const mean = Number(gdalMetadata.STATISTICS_MEAN);
      if (!isNaN(mean)) bandStats.mean = mean;
    }
    if (["string", "number"].includes(typeof gdalMetadata.STATISTICS_MEAN)) {
      const median = Number(gdalMetadata.STATISTICS_MEDIAN);
      if (!isNaN(median)) bandStats.median = median;
    }
    if (["string", "number"].includes(typeof gdalMetadata.STATISTICS_STDDEV)) {
      const stddev = Number(gdalMetadata.STATISTICS_STDDEV);
      if (!isNaN(stddev)) bandStats.stddev = stddev;
    }
  }

  return bandStats;
};

},{}],3:[function(require,module,exports){
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

},{"./calc-band-stats":1,"./get-gdal-stats":2}],4:[function(require,module,exports){
const { wrapNextFunction } = require("iter-fun");
const getGDALStats = require("./get-gdal-stats");
const iterTiles = require("./iter-tiles");

module.exports = function iterPixels({ image, sample }) {
  if (typeof sample !== "number") throw new Error("you must specify a bandIndex");

  const height = image.getHeight();
  const width = image.getWidth();
  const tileWidth = image.getTileWidth();
  const tileHeight = image.getTileHeight();
  const numTilesPerRow = Math.ceil(width / tileWidth);
  const numTilesPerCol = Math.ceil(height / tileHeight);
  const numTiles = numTilesPerRow * numTilesPerCol;

  let nums;
  let i = -1;
  let iend = 0;
  let tileRequests = 0;
  let tiles = iterTiles(image, [sample]);
  return wrapNextFunction(() => {
    i++;
    if (i === iend) {
      if (tileRequests === numTiles) {
        return { done: true };
      } else {
        return {
          done: false,
          value: tiles.next().value.then(tile => {
            tileRequests++;
            nums = tile[0];
            i = 0;
            iend = nums.length;
            return nums[i];
          })
        };
      }
    } else {
      return {
        done: false,
        value: nums[i]
      };
    }
  });
};

},{"./get-gdal-stats":2,"./iter-tiles":5,"iter-fun":8}],5:[function(require,module,exports){
const { wrapNextFunction } = require("iter-fun");

module.exports = function iterTiles(image, samples) {
  const height = image.getHeight();
  const width = image.getWidth();
  const tileWidth = image.getTileWidth();
  const tileHeight = image.getTileHeight();
  const numTilesPerRow = Math.ceil(width / tileWidth);
  const numTilesPerCol = Math.ceil(height / tileHeight);
  const numTiles = numTilesPerRow * numTilesPerCol;

  let tileIndex = -1;
  const iterTiles = wrapNextFunction(function next() {
    try {
      tileIndex++;
      if (tileIndex >= numTiles) {
        return { value: false, done: true };
      } else {
        const row = Math.floor(tileIndex / numTilesPerRow);
        const column = tileIndex % numTilesPerRow;
        const xmin = column * tileWidth;
        const ymin = row * tileHeight;
        const xmax = xmin + tileWidth;
        const ymax = ymin + tileHeight;
        const imageWindow = [xmin, ymin, Math.min(width, xmax), Math.min(height, ymax)];
        const rasters = image.readRasters({
          samples,
          window: imageWindow
        });
        return { value: rasters, done: false };
      }
    } catch (error) {
      console.error(error);
    }
  });
  return iterTiles;
};

},{"iter-fun":8}],6:[function(require,module,exports){
const { getOrCreateIterator } = require("iter-fun");
const fasterMedian = require("faster-median");

function calcStats(
  data,
  {
    async = false,
    noData = undefined,
    filter = undefined,
    calcHistogram = true,
    calcMax = true,
    calcMean = true,
    calcMedian = true,
    calcMin = true,
    calcMode = true,
    calcModes = true,
    calcSum = true
  } = { debugLevel: 0 }
) {
  const iter = getOrCreateIterator(data);

  let needCount = calcMean || calcMedian || typeof filter === "function";
  let needHistogram = calcHistogram || calcMedian || calcMode || calcModes;
  let needSum = calcSum || calcMean;

  let count = 0;
  let index = 0;
  let min;
  let max;
  let sum = 0;
  const histogram = {};

  // after it processes filtering
  const process = value => {
    if (needCount) count++;
    if (calcMin && (min === undefined || value < min)) min = value;
    if (calcMax && (max === undefined || value > max)) max = value;
    if (needSum) sum += value;
    if (needHistogram) {
      if (value in histogram) histogram[value].ct++;
      else histogram[value] = { n: value, ct: 1 };
    }
  };

  let step;
  if (typeof noData === "number" && typeof filter === "function") {
    step = value => {
      index++;
      if (value !== noData && filter({ count, index, value }) === true) {
        process(value);
      }
    };
  } else if (typeof noData === "number") {
    step = value => value !== noData && process(value);
  } else if (typeof filter === "function") {
    step = value => {
      index++;
      if (filter({ count, index, value }) === true) {
        process(value);
      }
    };
  } else {
    step = process;
  }

  const finish = () => {
    const results = {};
    if (calcMedian)
      results.median = fasterMedian({ counts: histogram, total: count });
    if (calcMin) results.min = min;
    if (calcMax) results.max = max;
    if (calcSum) results.sum = sum;
    if (calcMean) results.mean = sum / count;
    if (calcHistogram) results.histogram = histogram;
    if (calcMode || calcModes) {
      let highest_count = 0;
      let modes = [];
      for (let key in histogram) {
        const { n, ct } = histogram[key];
        if (ct === highest_count) {
          modes.push(n);
        } else if (ct > highest_count) {
          highest_count = ct;
          modes = [n];
        }
      }

      if (calcModes) results.modes = modes;

      // compute mean value of all the most popular numbers
      if (calcMode)
        results.mode = modes.reduce((acc, n) => acc + n, 0) / modes.length;
    }

    return results;
  };

  if (async) {
    return (async () => {
      for await (let value of iter) step(value);
      return finish();
    })();
  } else {
    for (let value of iter) step(value);
    return finish();
  }
}

module.exports = calcStats;

},{"faster-median":7,"iter-fun":8}],7:[function(require,module,exports){
const countWithTotal = ({ nums, no_data }) => {
  let len = nums.length;
  const counts = {};
  let total = 0;
  if (no_data !== undefined) {
    for (let i = 0; i < len; i++) {
      const n = nums[i];
      if (n !== no_data) {
        total++;
        if (n in counts) counts[n].ct++;
        else counts[n] = { n, ct: 1 };
      }
    }
  } else {
    for (let i = 0; i < len; i++) {
      const n = nums[i];
      total++;
      if (n in counts) counts[n].ct++;
      else counts[n] = { n, ct: 1 };
    }
  }
  return { counts, total };
};

const median_of_a_few = ({ nums, no_data }) => {
  nums = nums.filter(n => n !== no_data).sort((a, b) => a - b);
  switch (nums.length) {
    case 0:
      return undefined;
    case 1:
      return nums[0];
    default:
      const mid = nums.length / 2;
      if (nums.length % 2 === 0) {
        return (nums[mid - 1] + nums[mid]) / 2;
      } else {
        return nums[Math.floor(mid)];
      }
  }
};

const median_of_a_lot = ({ counts, nums, no_data, total }) => {
  if (counts === undefined || total === undefined) {
    ({ counts, total } = countWithTotal({ nums, no_data }));
  }

  // sort counts by value
  const countArray = Object.values(counts).sort((a, b) => a.n - b.n);
  const half = total / 2;
  const number_of_unique_values = countArray.length;
  if (number_of_unique_values === 0) {
    return undefined;
  } else if (number_of_unique_values === 1) {
    return countArray[0].n;
  } else {
    let x = 0;

    if (total % 2 === 0) {
      for (let i = 0; i < number_of_unique_values; i++) {
        const { n, ct } = countArray[i];
        x += ct;
        if (x > half) {
          // handle if odd or even
          // just barely pass cut off
          if (x - ct === half) {
            return (countArray[i - 1].n + n) / 2;
          } else {
            return n;
          }
        }
      }
    } else {
      for (let i = 0; i < number_of_unique_values; i++) {
        const { n, ct } = countArray[i];
        x += ct;
        if (x > half) return n;
      }
    }
  }
};

const fasterMedian = ({ nums, no_data, threshold = 50, counts, total }) => {
  if (counts !== undefined || total !== undefined || nums.length > threshold)
    return median_of_a_lot({ counts, total, nums, no_data });
  else return median_of_a_few({ nums, no_data });
};

if (typeof module === "object") module.exports = fasterMedian;
if (typeof window === "object") window.fasterMedian = fasterMedian;
if (typeof self === "object") self.fasterMedian = fasterMedian;

},{}],8:[function(require,module,exports){
function addSymbolIterator(obj) {
  try {
    obj[Symbol.iterator] = function () {
      return this;
    };
  } catch (error) {
    // pass
  }
}

function addSymbolIteratorFallback(obj) {
  obj["@@iterator"] = function () {
    return this;
  };
}

function wrapNextFunction(next) {
  const iter = { next };
  addSymbolIterator(iter);
  addSymbolIteratorFallback(iter);
  return iter;
}

function isArray(data) {
  try {
    return data.constructor.name.endsWith("Array");
  } catch {
    return false;
  }
}

function hasNext(data) {
  try {
    return typeof data.next === "function";
  } catch {
    return false;
  }
}

function hasIterator(data) {
  try {
    return "@@iterator" in data;
  } catch {
    return false;
  }
}

function hasSymbolIterator(data) {
  try {
    return Symbol.iterator in data.constructor.prototype;
  } catch {
    return false;
  }
}

function isIterator(data) {
  try {
    return (
      Symbol.iterator in data &&
      typeof data.next === "function" &&
      data.propertyIsEnumerable("next") === false
    );
  } catch {
    return false;
  }
}

function getIterator(data) {
  const iter = data["@@iterator"];
  if (hasNext(iter)) {
    return iter;
  } else if (typeof iter === "function") {
    return iter();
  }
}

function createIterator(data) {
  let i = 0;
  let len = data.length;
  const next = () =>
    i++ < len ? { value: data[i], done: false } : { done: true };
  return wrapNextFunction(next);
}

function getOrCreateIterator(data) {
  if (isIterator(data)) {
    return data;
  } else if (hasSymbolIterator(data)) {
    return data[Symbol.iterator]();
  } else if (hasNext(data)) {
    return wrapNextFunction(data.next);
  } else if (hasIterator(data)) {
    return getIterator(data);
  } else if (typeof data === "string" || isArray(data)) {
    return createIterator(data);
  } else {
    throw "[iter-fun] unable to determine iterator";
  }
}

if (typeof module === "object") {
  module.exports = {
    addSymbolIterator,
    addSymbolIteratorFallback,
    isIterator,
    isArray,
    hasNext,
    hasSymbolIterator,
    hasIterator,
    getIterator,
    createIterator,
    getOrCreateIterator,
    wrapNextFunction
  };
}

},{}]},{},[3]);
