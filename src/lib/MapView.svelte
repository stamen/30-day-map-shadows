<script>
  import { MapLibreMap, NavigationControl, setWorkerUrl } from 'maplibre-gl';
  import { untrack } from 'svelte';
  import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url';
  import 'maplibre-gl/dist/maplibre-gl.css';
  import { style, EXAGGERATION } from './style.js';
  import { cameraFor } from './locations.js';
  import { ShadowLayer, MIN_ZOOM } from './shadows/ShadowLayer.js';

  // MapLibre does its heavy lifting in a web worker. Tell it where Vite put the worker file.
  setWorkerUrl(workerUrl);

  /**
   * sun: { azimuth, altitude } in degrees. location: { lng, lat, zoom, pitch, bearing }
   * showCoastline: draw the coastline on top of the shadows
   * shadowColor: hex color for the shadows and the background behind the horizon
   * groundColor: hex color for the sunlit ground
   * terrain3D: raise the land in 3D. Off, the land lies flat but the shadows keep their
   *   shapes: the shadow layer works them out from its own copy of the elevation.
   */
  let { sun, location, showCoastline = false, terrain3D = false, shadowColor = '#000000', groundColor = '#ffffff' } = $props();

  let container;
  let map = $state.raw(null); // set once the map has loaded
  let shadows; // the cast-shadow layer

  // The map zoom where shadows appear. The shadow layer starts at terrain tile zoom MIN_ZOOM,
  // and MapLibre drapes 512px elevation tiles onto 1024px terrain tiles, so terrain tiles
  // are one zoom level below the map zoom. (With the map tilted, tiles near the camera
  // reach this a little sooner and tiles near the horizon a little later.)
  // Further out, we show a hint instead of blocking the zoom, so people can still
  // zoom out to get their bearings.
  const SHADOW_ZOOM = MIN_ZOOM + 1;
  let zoom = $state(Infinity); // read from the map once it loads

  $effect(() => {
    // Shadows always use the full exaggeration, so they match the 3D terrain when it's on.
    shadows = new ShadowLayer({ exaggeration: EXAGGERATION });
    // Create the map once, at the starting place. Later moves fly the camera instead.
    const start = untrack(() => location);
    const m = new MapLibreMap({
      container,
      style,
      ...cameraFor(start),
      maxPitch: 85
    });
    m.addControl(new NavigationControl({ visualizePitch: true }));
    m.on('zoom', () => (zoom = m.getZoom()));
    m.on('load', () => {
      m.addLayer(shadows, 'coastline'); // above the white ground, below the coastline
      zoom = m.getZoom();
      map = m;
    });

    return () => m.remove();
  });

  // Fly to a new place when one is picked.
  let shownLocation;
  $effect(() => {
    if (!map) return;
    if (shownLocation && shownLocation !== location) {
      map.flyTo(cameraFor(location));
    }
    shownLocation = location;
  });

  // Move the shadows whenever the sun moves. Below the horizon, everything is in shadow.
  $effect(() => {
    if (!map) return;
    shadows.setSun(sun.azimuth, sun.altitude);
  });

  $effect(() => {
    if (!map) return;
    map.setLayoutProperty(
      'coastline',
      'visibility',
      showCoastline ? 'visible' : 'none'
    );
  });

  $effect(() => {
    if (!map) return;
    // Exaggeration 0 keeps the terrain (which the shadows are draped onto) but with no height.
    map.setTerrain({
      ...style.terrain,
      exaggeration: terrain3D ? EXAGGERATION : 0
    });
  });

  // Shadows are fully opaque: lit or not, nothing in between.
  $effect(() => {
    if (!map) return;
    const rgb = [1, 3, 5].map((i) => parseInt(shadowColor.slice(i, i + 2), 16));
    shadows.setColor([...rgb, 1]);
    map.setPaintProperty('background', 'background-color', shadowColor);
  });

  // The sunlit ground: one color at every elevation.
  $effect(() => {
    if (!map) return;
    map.setPaintProperty('ground', 'color-relief-color', [
      'interpolate',
      ['linear'],
      ['elevation'],
      0,
      groundColor,
      1,
      groundColor
    ]);
  });
</script>

<div class="map" bind:this={container}></div>

{#if zoom < SHADOW_ZOOM}
  <div class="zoom-hint" role="status">
    Shadows appear at zoom {SHADOW_ZOOM} · you're at {zoom.toFixed(1)}
  </div>
{/if}

<style>
  .map {
    position: absolute;
    inset: 0;
  }
  .zoom-hint {
    position: absolute;
    top: 16px;
    left: 50%;
    transform: translateX(-50%);
    max-width: calc(100% - 32px);
    padding: 8px 14px;
    border-radius: 8px;
    background: rgba(10, 14, 30, 0.75);
    color: #f2f2f5;
    font-size: 13px;
    text-align: center;
    pointer-events: none;
  }
</style>
