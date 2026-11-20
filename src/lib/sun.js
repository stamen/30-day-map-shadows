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

const DAY_MS = 86_400_000

/**
 * Move a date forward by whole days, wrapping from Dec 31 back to Jan 1 of the same year.
 * "2026-12-30", 3 → "2026-01-02"
 */
export function addDaysWithinYear(date, days) {
  const year = Number(date.slice(0, 4))
  const start = Date.UTC(year, 0, 1)
  const daysInYear = (Date.UTC(year + 1, 0, 1) - start) / DAY_MS
  const dayOfYear = Math.round((new Date(`${date}T00:00:00Z`).getTime() - start) / DAY_MS)
  const next = (((dayOfYear + days) % daysInYear) + daysInYear) % daysInYear
  return new Date(start + next * DAY_MS).toISOString().slice(0, 10)
}

/** Number of days in the year of a date like "2026-11-04". */
export function daysInYearOf(date) {
  const year = Number(date.slice(0, 4))
  return (Date.UTC(year + 1, 0, 1) - Date.UTC(year, 0, 1)) / DAY_MS
}

/** "2026-03-14" → "Mar 14" */
export function formatDate(date) {
  return new Date(`${date}T00:00:00Z`).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  })
}
