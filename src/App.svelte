<script>
  import MapView from './lib/MapView.svelte'
  import Controls from './lib/Controls.svelte'
  import { getSun } from './lib/sun.js'

  // Where to look, and where the sun is calculated for.
  const location = {
    name: 'Oʻahu',
    lng: -157.98,
    lat: 21.48,
    zoom: 9.6,
    pitch: 55,
    bearing: 20,
  }

  let minutes = $state(6 * 60) // solar time, minutes after midnight
  let dayLength = $state(30) // real seconds per simulated day
  let playing = $state(true)
  const today = new Date().toISOString().slice(0, 10)
  let date = $state(today)

  // `|| today` covers the moment the date field is cleared.
  let sun = $derived(getSun(date || today, minutes, location))

  // Animation loop: advance the clock every frame while playing.
  $effect(() => {
    if (!playing) return

    let last = performance.now()
    let frame = requestAnimationFrame(function tick(now) {
      const seconds = (now - last) / 1000
      last = now
      minutes = (minutes + (seconds / dayLength) * 1440) % 1440
      frame = requestAnimationFrame(tick)
    })

    return () => cancelAnimationFrame(frame)
  })
</script>

<MapView {sun} {location} />
<Controls bind:minutes bind:dayLength bind:playing bind:date {sun} locationName={location.name} />
