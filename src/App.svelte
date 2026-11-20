<script>
  import MapView from './lib/MapView.svelte'
  import Controls from './lib/Controls.svelte'
  import InfoPanel from './lib/InfoPanel.svelte'
  import { LOCATIONS } from './lib/locations.js'
  import { getSun, addDaysWithinYear, daysInYearOf } from './lib/sun.js'

  // Where to look, and where the sun is calculated for.
  let locationId = $state(LOCATIONS[0].id)
  let location = $derived(LOCATIONS.find((place) => place.id === locationId))

  let minutes = $state(6 * 60) // solar time, minutes after midnight
  let dayLength = $state(30) // real seconds per simulated day
  let yearLength = $state(30) // real seconds per simulated year
  // What plays: 'day' runs the clock through one day; 'year' keeps the time fixed
  // and steps the date through every day of the year.
  let mode = $state('day')
  let playing = $state(true)
  const today = new Date().toISOString().slice(0, 10)
  let date = $state(today)
  let showCoastline = $state(false)
  let groundColor = $state('#ffffff') // the sunlit ground
  let shadowColor = $state('#000000') // shadows and the background behind the horizon
  let terrain3D = $state(false) // raise the land in 3D (the shadows look the same either way)

  // `|| today` covers the moment the date field is cleared.
  let sun = $derived(getSun(date || today, minutes, location))

  // Animation loop: advance the clock (or the date) every frame while playing.
  $effect(() => {
    if (!playing) return

    let last = performance.now()
    let partialDay = 0 // year mode: progress toward the next date, in days
    let frame = requestAnimationFrame(function tick(now) {
      const seconds = (now - last) / 1000
      last = now
      if (mode === 'day') {
        minutes = (minutes + (seconds / dayLength) * 1440) % 1440
      } else {
        const current = date || today
        partialDay += (seconds / yearLength) * daysInYearOf(current)
        const wholeDays = Math.floor(partialDay)
        if (wholeDays > 0) {
          partialDay -= wholeDays
          date = addDaysWithinYear(current, wholeDays)
        }
      }
      frame = requestAnimationFrame(tick)
    })

    return () => cancelAnimationFrame(frame)
  })
</script>

<MapView {sun} {location} {showCoastline} {terrain3D} {shadowColor} {groundColor} />
<InfoPanel />
<Controls
  bind:mode
  bind:minutes
  bind:dayLength
  bind:yearLength
  bind:playing
  bind:date
  bind:showCoastline
  bind:terrain3D
  bind:shadowColor
  bind:groundColor
  bind:locationId
  {sun}
  locationName={location.name}
/>
