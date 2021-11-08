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
