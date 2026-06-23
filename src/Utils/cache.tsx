const cache: any = {}; // Object to store cached data
const DEFAULT_CACHE_TTL: number = 1800; // Cache TTL in seconds (1/2 hour)

// Function to set data in the cache. `ttlSeconds` lets a caller shorten the
// TTL for data that goes stale fast (e.g. a live scoreboard) without
// affecting the default for everything else.
export function setCache(key: any, data: any, ttlSeconds: number = DEFAULT_CACHE_TTL) {
  cache[key] = {
    data: data,
    timestamp: Date.now(),
    ttl: ttlSeconds,
  };
}

// Function to get data from the cache
export function getCache(key: any) {
  const cachedData = cache[key];
  const ttl = cachedData?.ttl ?? DEFAULT_CACHE_TTL;
  if (cachedData && Date.now() - cachedData.timestamp < ttl * 1000) {
    // Data is within TTL, return it
    return cachedData.data;
  } else {
    // Data not found in cache or expired
    delete cache[key]; // Remove expired data from cache
    // console.log(`${cachedData && Date.now() - cachedData.timestamp} : deleting cache`);
    return null;
  }
}
