<script>
  import { MapLibreMap, NavigationControl, setWorkerUrl } from 'maplibre-gl'
  import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url'
  import 'maplibre-gl/dist/maplibre-gl.css'
  import { style } from './style.js'
  import { getLighting } from './lighting.js'
  import { ShadowLayer } from './shadows/ShadowLayer.js'

  // MapLibre does its heavy lifting in a web worker. Tell it where Vite put the worker file.
  setWorkerUrl(workerUrl)

  /** sun: { azimuth, altitude } in degrees. location: { lng, lat, zoom, pitch, bearing } */
  let { sun, location } = $props()

  let container
  let map = $state.raw(null) // set once the map has loaded
  let shadows // the cast-shadow layer

  $effect(() => {
    // Shadows use the same height exaggeration as the 3D terrain, so they match what you see.
    shadows = new ShadowLayer({ exaggeration: style.terrain.exaggeration })
    const m = new MapLibreMap({
      container,
      style,
      center: [location.lng, location.lat],
      zoom: location.zoom,
      pitch: location.pitch,
      bearing: location.bearing,
      maxPitch: 85,
    })
    m.addControl(new NavigationControl({ visualizePitch: true }))
    m.on('load', () => {
      m.addLayer(shadows) // on top of the hillshade
      map = m
    })

    return () => m.remove()
  })

  // Re-light the map whenever the sun moves.
  $effect(() => {
    if (!map) return
    const light = getLighting(sun.altitude)

    map.setPaintProperty('hillshade', 'hillshade-illumination-direction', sun.azimuth)
    // Hillshade only accepts 0–90°. Below the horizon, keep the light flat.
    map.setPaintProperty('hillshade', 'hillshade-illumination-altitude', Math.max(sun.altitude, 0))
    map.setPaintProperty('hillshade', 'hillshade-shadow-color', light.shadow)
    map.setPaintProperty('hillshade', 'hillshade-highlight-color', light.highlight)
    map.setPaintProperty('relief', 'color-relief-opacity', light.reliefOpacity)
    map.setPaintProperty('background', 'background-color', light.background)
    map.setSky(light.sky)
    shadows.setSun(sun.azimuth, sun.altitude)
    shadows.setColor(light.castShadow)
  })
</script>

<div class="map" bind:this={container}></div>

<style>
  .map {
    position: absolute;
    inset: 0;
  }
</style>
