// Loads Mapterhorn elevation tiles as images, with a small cache.
// Each tile is a 512×512 WebP in Terrarium encoding:
//   elevation (m) = red × 256 + green + blue / 256 − 32768

export const DEM_TILE_SIZE = 512
const TILE_URL = 'https://tiles.mapterhorn.com/{z}/{x}/{y}.webp'
const MAX_CACHED_TILES = 300

const cache = new Map() // "z/x/y" → Promise<ImageBitmap | null>

/**
 * Load one elevation tile. Resolves to null when there is no tile
 * (off the top or bottom of the map, or a failed request); treat that as sea level.
 */
export function loadDemTile(z, x, y) {
  const n = 2 ** z
  if (y < 0 || y >= n) return Promise.resolve(null)
  x = ((x % n) + n) % n // wrap around the antimeridian

  const key = `${z}/${x}/${y}`
  if (cache.has(key)) {
    // Move to the end of the Map so it counts as recently used.
    const tile = cache.get(key)
    cache.delete(key)
    cache.set(key, tile)
    return tile
  }

  const url = TILE_URL.replace('{z}', z).replace('{x}', x).replace('{y}', y)
  const tile = fetch(url)
    .then((response) => (response.ok ? response.blob() : null))
    // Keep the raw bytes: any color conversion would corrupt the elevations.
    .then((blob) => blob && createImageBitmap(blob, { premultiplyAlpha: 'none', colorSpaceConversion: 'none' }))
    .catch(() => {
      cache.delete(key) // let a later request try again
      return null
    })

  cache.set(key, tile)
  if (cache.size > MAX_CACHED_TILES) cache.delete(cache.keys().next().value) // drop the oldest
  return tile
}
