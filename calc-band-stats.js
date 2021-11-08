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
