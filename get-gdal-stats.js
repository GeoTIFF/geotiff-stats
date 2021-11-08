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
