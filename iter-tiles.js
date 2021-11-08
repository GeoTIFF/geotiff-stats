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
