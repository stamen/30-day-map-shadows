import { getPosition } from 'suncalc'

/**
 * Where is the sun in the sky?
 *
 * @param {string} date     A day, like "2026-11-04"
 * @param {number} minutes  Local solar time, in minutes after midnight (0–1440)
 * @param {{ lng: number, lat: number }} location
 * @returns {{ azimuth: number, altitude: number }}
 *   azimuth:  compass direction the light comes from (0 = north, 90 = east)
 *   altitude: degrees above the horizon (negative = below the horizon)
 */
export function getSun(date, minutes, { lng, lat }) {
  // Solar time runs 4 minutes ahead of UTC for every degree east of Greenwich.
  const utcMinutes = minutes - lng * 4
  const time = new Date(`${date}T00:00:00Z`).getTime() + utcMinutes * 60_000

  // SunCalc returns degrees: azimuth clockwise from north, altitude above the horizon.
  const { azimuth, altitude } = getPosition(new Date(time), lat, lng)
  return { azimuth, altitude }
}

/** 390 → "06:30" */
export function formatTime(minutes) {
  const h = Math.floor(minutes / 60)
  const m = Math.floor(minutes % 60)
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}
