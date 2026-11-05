// A minimal MapLibre style: Mapterhorn elevation data, used three ways:
//   1. 3D terrain (the shape of the land)
//   2. color-relief (color by elevation)
//   3. hillshade (light and shadow from the sun)

const mapterhorn = {
  type: 'raster-dem',
  tiles: ['https://tiles.mapterhorn.com/{z}/{x}/{y}.webp'],
  tileSize: 512,
  encoding: 'terrarium',
  attribution: '<a href="https://mapterhorn.com/attribution">© Mapterhorn</a>'
};

export const style = {
  version: 8,
  // We update the lighting every frame ourselves, so paint changes should apply instantly.
  // (With 3D terrain, MapLibre's built-in transitions also leave stale colors on the ground.)
  transition: { duration: 0, delay: 0 },
  sources: {
    // MapLibre recommends separate sources for terrain and for layers.
    terrain: { ...mapterhorn, maxzoom: 14 },
    dem: { ...mapterhorn, maxzoom: 15 }
  },
  terrain: { source: 'terrain', exaggeration: 1.5 },
  layers: [
    {
      id: 'background',
      type: 'background',
      paint: { 'background-color': '#0b1026' }
    },
    {
      id: 'relief',
      type: 'color-relief',
      source: 'dem',
      paint: {
        'color-relief-color': [
          'interpolate',
          ['linear'],
          ['elevation'],
          0,
          '#dfe6e9',
          1,
          '#ffffff'
          // 0, '#6f8f5e',
          // 800, '#93aa74',
          // 1600, '#b7b386',
          // 2200, '#a89478',
          // 2800, '#bdb3a8',
          // 3400, '#e6e7ec',
          // 4500, '#ffffff',
        ]
      }
    },
    {
      id: 'hillshade',
      type: 'hillshade',
      source: 'dem',
      paint: {
        // "basic" lights each slope by the angle between it and the sun.
        'hillshade-method': 'basic',
        // Light direction is relative to north, not to the screen.
        'hillshade-illumination-anchor': 'map',
        'hillshade-exaggeration': 0.6
      }
    }
  ]
};
