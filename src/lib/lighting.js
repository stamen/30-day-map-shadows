// The look of the map at different sun altitudes (degrees above the horizon).
// Between two keyframes, every color is blended smoothly.
// Colors are [red, green, blue, alpha].
const KEYFRAMES = [
  {
    altitude: -18, // night
    background: [11, 16, 38, 1],
    reliefOpacity: 0.15,
    shadow: [3, 5, 20, 0.5],
    highlight: [140, 160, 220, 0],
    sky: [2, 4, 15, 1],
    horizon: [11, 16, 38, 1],
    fog: [11, 16, 38, 1],
  },
  {
    altitude: -6, // civil twilight
    background: [38, 36, 78, 1],
    reliefOpacity: 0.35,
    shadow: [20, 15, 50, 0.7],
    highlight: [255, 150, 120, 0.1],
    sky: [28, 35, 80, 1],
    horizon: [176, 96, 122, 1],
    fog: [58, 51, 96, 1],
  },
  {
    altitude: 0, // sunrise / sunset
    background: [60, 50, 80, 1],
    reliefOpacity: 0.7,
    shadow: [40, 20, 60, 0.75],
    highlight: [255, 140, 60, 0.5],
    sky: [91, 123, 181, 1],
    horizon: [255, 154, 90, 1],
    fog: [232, 160, 122, 1],
  },
  {
    altitude: 8, // golden hour
    background: [60, 60, 70, 1],
    reliefOpacity: 0.9,
    shadow: [40, 30, 70, 0.6],
    highlight: [255, 200, 130, 0.45],
    sky: [127, 166, 216, 1],
    horizon: [255, 215, 160, 1],
    fog: [240, 208, 176, 1],
  },
  {
    altitude: 25, // full daylight
    background: [60, 60, 70, 1],
    reliefOpacity: 1,
    shadow: [30, 40, 70, 0.5],
    highlight: [255, 255, 240, 0.35],
    sky: [93, 156, 230, 1],
    horizon: [216, 232, 245, 1],
    fog: [230, 238, 245, 1],
  },
]

const mix = (a, b, t) => a + (b - a) * t
const mixColor = (a, b, t) => a.map((value, i) => mix(value, b[i], t))
const css = ([r, g, b, a]) => `rgba(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)}, ${a.toFixed(3)})`

/** Find the two keyframes around this altitude and how far we are between them. */
function surroundingKeyframes(altitude) {
  const first = KEYFRAMES[0]
  const last = KEYFRAMES[KEYFRAMES.length - 1]
  if (altitude <= first.altitude) return [first, first, 0]
  if (altitude >= last.altitude) return [last, last, 0]

  const i = KEYFRAMES.findIndex((k) => k.altitude > altitude)
  const before = KEYFRAMES[i - 1]
  const after = KEYFRAMES[i]
  const t = (altitude - before.altitude) / (after.altitude - before.altitude)
  return [before, after, t]
}

/** Colors and opacities for the map, given the sun's altitude in degrees. */
export function getLighting(altitude) {
  const [a, b, t] = surroundingKeyframes(altitude)
  return {
    background: css(mixColor(a.background, b.background, t)),
    reliefOpacity: mix(a.reliefOpacity, b.reliefOpacity, t),
    shadow: css(mixColor(a.shadow, b.shadow, t)),
    highlight: css(mixColor(a.highlight, b.highlight, t)),
    sky: {
      'sky-color': css(mixColor(a.sky, b.sky, t)),
      'horizon-color': css(mixColor(a.horizon, b.horizon, t)),
      'fog-color': css(mixColor(a.fog, b.fog, t)),
      'sky-horizon-blend': 0.6,
      'horizon-fog-blend': 0.6,
      'fog-ground-blend': 0.7,
    },
  }
}
