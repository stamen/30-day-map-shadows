<script>
  import { formatTime } from './sun.js'

  let {
    minutes = $bindable(),
    dayLength = $bindable(),
    playing = $bindable(),
    date = $bindable(),
    sun,
    locationName,
  } = $props()
</script>

<div class="panel">
  <div class="row">
    <button onclick={() => (playing = !playing)}>{playing ? 'Pause' : 'Play'}</button>
    <span class="time">{formatTime(minutes)}</span>
    <span class="muted">solar time · {locationName}</span>
  </div>

  <label>
    Time of day
    <input type="range" min="0" max="1439" step="1" bind:value={minutes} />
  </label>

  <label>
    One day lasts {dayLength} seconds
    <input type="range" min="5" max="120" step="1" bind:value={dayLength} />
  </label>

  <label>
    Date
    <input type="date" bind:value={date} />
  </label>

  <div class="muted">
    Sun: {sun.altitude.toFixed(1)}° high, from {sun.azimuth.toFixed(0)}°
  </div>
</div>

<style>
  .panel {
    position: absolute;
    left: 16px;
    bottom: 32px;
    width: 260px;
    padding: 14px;
    display: flex;
    flex-direction: column;
    gap: 10px;
    border-radius: 8px;
    background: rgba(10, 14, 30, 0.75);
    color: #f2f2f5;
    font-size: 13px;
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
