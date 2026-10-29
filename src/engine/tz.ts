// Birth-time validation against the zone of the birthplace (Intl time zone data, no extra dependency).
import tzLookup from '@photostructure/tz-lookup'

export type TzCheck = { ok: true; timezone: string } | { ok: false; reason: 'dst-gap' | 'no-timezone' }

const formatters = new Map<string, Intl.DateTimeFormat>()

/** UTC offset (ms) of a zone at an instant. */
function offsetAt(zone: string, utcMs: number): number {
  let f = formatters.get(zone)
  if (!f) {
    f = new Intl.DateTimeFormat('en-US', {
      timeZone: zone, hourCycle: 'h23', year: 'numeric', month: 'numeric', day: 'numeric',
      hour: 'numeric', minute: 'numeric', second: 'numeric',
    })
    formatters.set(zone, f)
  }
  const p: Record<string, number> = {}
  for (const x of f.formatToParts(new Date(utcMs))) if (x.type !== 'literal') p[x.type] = Number(x.value)
  return Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second) - Math.floor(utcMs / 1000) * 1000
}

export function validateBirthLocalTime(
  lat: number, lon: number, year: number, month: number, day: number, hour: number, minute: number,
): TzCheck {
  let timezone: string
  try { timezone = tzLookup(lat, lon) } catch { return { ok: false, reason: 'no-timezone' } }
  const local = Date.UTC(year, month - 1, day, hour, minute)
  const back = new Date(local)
  if (!Number.isFinite(local) || back.getUTCFullYear() !== year || back.getUTCMonth() !== month - 1 || back.getUTCDate() !== day
    || back.getUTCHours() !== hour || back.getUTCMinutes() !== minute) return { ok: false, reason: 'no-timezone' }
  try {
    // The wall time exists if some offset valid near it maps back to the same wall time.
    const DAY = 86_400_000
    const candidates = new Set([offsetAt(timezone, local - DAY), offsetAt(timezone, local + DAY)])
    for (const o of candidates) if (offsetAt(timezone, local - o) === o) return { ok: true, timezone }
    return { ok: false, reason: 'dst-gap' }
  } catch { return { ok: false, reason: 'no-timezone' } }
}

// ---- Local birth time -> chart clock helpers (appended; used by the Zi Wei engine) ----
import { fromZonedTime } from 'date-fns-tz'
import type { BirthInput } from './types.ts'

export const DEFAULT_TIMEZONE = 'Asia/Seoul'

/** Birth fields with the clock rewritten to another reference clock. */
export type ClockShifted = Pick<BirthInput, 'year' | 'month' | 'day' | 'hour' | 'minute'>

/** Local wall time of `input` in its zone -> UTC instant (ms). The tz database supplies the historical offsets (KST +8:30 in 1954-61, summer time 1948-51 and 1987-88). */
export function birthInstantUtc(input: BirthInput): number {
  const p = (n: number, w = 2) => String(n).padStart(w, '0')
  const wall = `${p(input.year, 4)}-${p(input.month)}-${p(input.day)}T${p(input.hour)}:${p(input.minute)}:00`
  return fromZonedTime(wall, input.timezone ?? DEFAULT_TIMEZONE).getTime()
}

function shiftedFields(utcMs: number, offsetMin: number): ClockShifted {
  const d = new Date(utcMs + offsetMin * 60000)
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate(), hour: d.getUTCHours(), minute: d.getUTCMinutes() }
}

/** Birth clock as fixed KST (UTC+9) wall time: removes summer time and the old +8:30 / +8:00 offsets. */
export function adjustBirthInputToKstWallClock(input: BirthInput): ClockShifted {
  return shiftedFields(birthInstantUtc(input), 9 * 60)
}

/** Birth clock as mean solar time of the birth longitude (default Seoul): UTC + longitude / 15 hours. */
export function adjustBirthInputToSolarTime(input: BirthInput): ClockShifted {
  return shiftedFields(birthInstantUtc(input), Math.round((input.longitude ?? 126.978) * 4))
}
