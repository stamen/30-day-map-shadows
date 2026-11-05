# 30-day-map-shadows

A 3D terrain map where the sun circles overhead much faster than in real life. The hillshade follows the sun's real position for the chosen place and date, so slopes light up and fall into shadow as the day passes.

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

The hillshade uses MapLibre's `basic` method, which shades each slope by the angle between it and the sun. Flat ground is neutral when the sun is 30° high, darker below that and brighter above it.

## Limitations

- Hillshade shades each slope on its own. Mountains don't cast shadows onto nearby land yet.
- Time is local *solar* time (noon ≈ sun at its highest), not clock time.
