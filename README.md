# geotiff-stats
Get Statistics from a GeoTIFF without Crashing Your Browser

# usage
```javascript
import { getStats } from 'geotiff-stats';

const stats = await getStats(image, { maximum: true, minimum: true, bufferSize: 10000 });
```
