// A shadows-only MapLibre style. Mapterhorn elevation gives the 3D shape of the land,
// which is painted pure white. The cast-shadow layer (added in MapView) paints pure black
// wherever the sun can't reach. Nothing else: no hillshade, no elevation colors, no sky.

const mapterhorn = {
  type: 'raster-dem',
  tiles: ['https://tiles.mapterhorn.com/{z}/{x}/{y}.webp'],
  tileSize: 512,
  encoding: 'terrarium',
  attribution: '<a href="https://mapterhorn.com/attribution">© Mapterhorn</a>'
};

// How much to stretch elevation. The shadows always use this, so their lengths stay the same;
// the 3D terrain uses it only when "3D terrain" is on.
export const EXAGGERATION = 1.5;

export const style = {
  version: 8,
  // With 3D terrain, MapLibre's built-in transitions leave stale colors on the ground.
  transition: { duration: 0, delay: 0 },
  sources: {
    // MapLibre recommends separate sources for terrain and for layers.
    terrain: { ...mapterhorn, maxzoom: 14 },
    dem: { ...mapterhorn, maxzoom: 15 },
    // OpenMapTiles-schema vector tiles, only used for the optional coastline.
    openmaptiles: {
      type: 'vector',
      url: 'https://tiles.openfreemap.org/planet',
      attribution:
        '<a href="https://openfreemap.org">OpenFreeMap</a> © <a href="https://www.openmaptiles.org/">OpenMapTiles</a> Data from <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    }
  },
  // Starts flat (exaggeration 0): the land has no height, but the shadows still drape onto it.
  terrain: { source: 'terrain', exaggeration: 0 },
  layers: [
    {
      // Seen above the horizon when the map is tilted.
      id: 'background',
      type: 'background',
      paint: { 'background-color': '#000000' }
    },
    {
      // The lit ground: white everywhere, at every elevation.
      id: 'ground',
      type: 'color-relief',
      source: 'dem',
      paint: {
        'color-relief-color': [
          'interpolate',
          ['linear'],
          ['elevation'],
          0,
          '#ffffff',
          1,
          '#ffffff'
        ]
      }
    },
    {
      // Optional: the outline of the ocean polygons is the coastline. Drawn above the shadows.
      id: 'coastline',
      type: 'line',
      source: 'openmaptiles',
      'source-layer': 'water',
      filter: ['==', ['get', 'class'], 'ocean'],
      layout: { visibility: 'none', 'line-join': 'round' },
      paint: { 'line-color': '#000000', 'line-width': 1.5 }
    }
  ]
};
