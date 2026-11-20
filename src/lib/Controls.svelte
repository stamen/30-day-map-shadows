<script>
  import { formatTime, formatDate } from './sun.js'
  import { LOCATIONS } from './locations.js'

  let {
    mode = $bindable(),
    minutes = $bindable(),
    dayLength = $bindable(),
    yearLength = $bindable(),
    playing = $bindable(),
    date = $bindable(),
    showCoastline = $bindable(),
    terrain3D = $bindable(),
    shadowColor = $bindable(),
    groundColor = $bindable(),
    locationId = $bindable(),
    sun,
    locationName,
  } = $props()

  const MODES = [
    { id: 'day', label: 'Time of day' },
    { id: 'year', label: 'Day of year' },
  ]

  // Only one thing plays at a time, so switching modes pauses.
  function setMode(next) {
    if (next === mode) return
    playing = false
    mode = next
  }

  // Tell the page how tall the color panel is, so the map's zoom buttons can sit below it.
  let colorsHeight = $state(0)
  $effect(() => {
    document.documentElement.style.setProperty('--colors-panel-height', `${colorsHeight}px`)
  })
</script>

<!-- Bottom left: the clock -->
<div class="panel bottom-left">
  <div class="modes" role="radiogroup" aria-label="What plays">
    {#each MODES as { id, label }}
      <button class="heavy" role="radio" aria-checked={mode === id} class:active={mode === id} onclick={() => setMode(id)}>
        {label}
      </button>
    {/each}
  </div>

  <div class="row">
    <button class="heavy" onclick={() => (playing = !playing)}>{playing ? 'Pause' : 'Play'}</button>
    {#if mode === 'day'}
      <span class="time">{formatTime(minutes)}</span>
      <span class="muted">solar time · {locationName}</span>
    {:else}
      <span class="time">{date ? formatDate(date) : '—'}</span>
      <span class="muted">at {formatTime(minutes)} · {locationName}</span>
    {/if}
  </div>

  <label>
    <span class="heavy">Time of day</span>
    <input type="range" min="0" max="1439" step="1" bind:value={minutes} />
  </label>

  {#if mode === 'day'}
    <label>
      <span class="heavy">One day lasts {dayLength} seconds</span>
      <input type="range" min="5" max="120" step="1" bind:value={dayLength} />
    </label>
  {:else}
    <label>
      <span class="heavy">One year lasts {yearLength} seconds</span>
      <input type="range" min="5" max="120" step="1" bind:value={yearLength} />
    </label>
  {/if}

  <label>
    <span class="heavy">Date</span>
    <input type="date" bind:value={date} />
  </label>

  <div class="muted">
    Sun: {sun.altitude.toFixed(1)}° high, from {sun.azimuth.toFixed(0)}°
  </div>
</div>

<!-- Top right: colors. The map's zoom buttons sit just below (see app.css). -->
<div class="panel top-right" bind:offsetHeight={colorsHeight}>
  <h2 class="heavy">Color</h2>

  <label class="toggle">
    <input type="color" bind:value={shadowColor} />
    Shadow color
  </label>

  <label class="toggle">
    <input type="color" bind:value={groundColor} />
    Background color
  </label>
</div>

<!-- Bottom right: where to look, and how -->
<div class="panel bottom-right">
  <label>
    <span class="heavy">Place</span>
    <select bind:value={locationId}>
      {#each LOCATIONS as place}
        <option value={place.id}>{place.name}</option>
      {/each}
    </select>
  </label>

  <label class="toggle">
    <input type="checkbox" bind:checked={showCoastline} />
    Show coastline
  </label>

  <label class="toggle">
    <input type="checkbox" bind:checked={terrain3D} />
    3D terrain
  </label>
</div>

<style>
  .panel {
    position: absolute;
    box-sizing: border-box;
    padding: 14px;
    display: flex;
    flex-direction: column;
    gap: 10px;
    border-radius: 8px;
    background: rgba(0, 0, 0, 0.75);
    color: #f2f2f5;
    font-size: 13px;
  }
  .bottom-left {
    left: 16px;
    bottom: 32px;
    width: 288px;
  }
  .top-right {
    top: 16px;
    right: 16px;
  }
  .bottom-right {
    right: 16px;
    bottom: 32px;
    width: 200px;
  }
  h2 {
    margin: 0;
    font-size: 13px;
    font-weight: 400;
  }
  .row {
    display: flex;
    align-items: baseline;
    gap: 8px;
  }
  .time {
    font-size: 20px;
    font-variant-numeric: tabular-nums;
  }
  .muted {
    opacity: 0.7;
  }
  label {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  label.toggle {
    flex-direction: row;
    align-items: center;
    gap: 6px;
    cursor: pointer;
  }
  .modes {
    display: flex;
    border: 1px solid rgba(255, 255, 255, 0.4);
    border-radius: 4px;
    overflow: hidden;
  }
  .modes button {
    flex: 1;
    width: auto;
    border: none;
    border-radius: 0;
  }
  .modes button.active {
    background: rgba(255, 255, 255, 0.85);
    color: #000000;
  }
  input[type='range'] {
    accent-color: #000000;
  }
  select {
    padding: 4px;
    border: 1px solid rgba(255, 255, 255, 0.4);
    border-radius: 4px;
    background: rgba(0, 0, 0, 0.9);
    color: inherit;
    font: inherit;
  }
  input[type='color'] {
    width: 28px;
    height: 20px;
    padding: 0;
    border: 1px solid rgba(255, 255, 255, 0.4);
    border-radius: 4px;
    background: none;
    cursor: pointer;
  }
  button {
    width: 64px;
    padding: 4px 0;
    border: 1px solid rgba(255, 255, 255, 0.4);
    border-radius: 4px;
    background: transparent;
    color: inherit;
    cursor: pointer;
  }
</style>
