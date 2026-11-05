# 30-day-map-shadows

A 3D terrain map where the sun circles overhead much faster than in real life. The hillshade follows the sun's real position for the chosen place and date, so slopes light up and fall into shadow as the day passes, and mountains cast shadows across the land around them.

Built with [Svelte](https://svelte.dev), [MapLibre GL JS](https://maplibre.org) and [Mapterhorn](https://mapterhorn.com) terrain tiles.

## Run it

```sh
yarn install
yarn dev
```

`yarn build` creates a static site in `dist/`.

## How it works

| File | What it does |
| --- | --- |
| `src/App.svelte` | Holds the clock (time, date, speed) and runs the animation loop |
| `src/lib/sun.js` | Turns a date + time + place into the sun's azimuth and altitude (via [SunCalc](https://github.com/mourner/suncalc)) |
| `src/lib/lighting.js` | Turns the sun's altitude into colors: night, twilight, golden hour, day |
| `src/lib/style.js` | The MapLibre style: Mapterhorn terrain, color by elevation, hillshade |
| `src/lib/MapView.svelte` | Creates the map and re-lights it whenever the sun moves |
| `src/lib/Controls.svelte` | Play/pause, time of day, day length and date |
| `src/lib/shadows/ShadowLayer.js` | A MapLibre custom layer that draws cast shadows onto the 3D terrain |
| `src/lib/shadows/shaders.js` | The GLSL for building horizon maps and drawing shadows |
| `src/lib/shadows/dem.js` | Loads and caches Mapterhorn elevation tiles |
| `src/lib/shadows/gl.js` | Small WebGL helpers |

The hillshade uses MapLibre's `basic` method, which shades each slope by the angle between it and the sun. Flat ground is neutral when the sun is 30° high, darker below that and brighter above it.

### Cast shadows

Hillshade only shades each slope on its own; it can't tell when a mountain blocks the sun from the valley next to it. The shadow layer handles that with **horizon maps**:

1. **Once per tile:** when a terrain tile comes into view, the layer loads the elevation around it (the 3×3 tiles at the same zoom, plus 3×3 tiles three zooms out for distant mountains). On the GPU, for every pixel and each of 16 compass directions, it marches outward and records how high the horizon rises. This doesn't depend on the sun, so it's done once and kept. The work is split into small pieces over several frames so the animation doesn't stutter; until a tile is ready, a blurrier zoomed-out tile stands in.
2. **Every frame:** each pixel looks up the horizon in the sun's direction (blending the two nearest of the 16). If the horizon is higher than the sun, the pixel is in shadow. That's a couple of texture reads, so the sun can move every frame.

MapLibre drapes the result onto the terrain through the custom layer's `renderToTerrainTile` hook (experimental in MapLibre GL JS v6). Shadow color and opacity over the day are set by `castShadow` in `lighting.js`.

## Limitations

- The sun is calculated for one fixed place (`location` in `App.svelte`), not wherever the map is looking.
- Shadows reach about 8 tiles out at the tile's zoom (roughly 70 km at zoom 12, 18 km at zoom 14). Longer shadows near sunrise and sunset are cut off.
- Time is local *solar* time (noon ≈ sun at its highest), not clock time.
