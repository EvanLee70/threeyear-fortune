// Geocentric tropical planet longitudes (apparent, ecliptic of date) built on astronomy-engine (MIT).
import * as Astronomy from 'astronomy-engine'
import { formatInTimeZone, fromZonedTime } from 'date-fns-tz'
import type { BirthInput } from './types'

export type PlanetName =
  | 'Sun' | 'Moon' | 'Mercury' | 'Venus' | 'Mars' | 'Jupiter' | 'Saturn' | 'Uranus' | 'Neptune' | 'Pluto'

export const PLANET_NAMES: PlanetName[] = [
  'Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto',
]

export interface PlanetPos { longitude: number; speed: number; retrograde: boolean }

const BODY: Record<PlanetName, Astronomy.Body> = {
  Sun: Astronomy.Body.Sun, Moon: Astronomy.Body.Moon, Mercury: Astronomy.Body.Mercury,
  Venus: Astronomy.Body.Venus, Mars: Astronomy.Body.Mars, Jupiter: Astronomy.Body.Jupiter,
  Saturn: Astronomy.Body.Saturn, Uranus: Astronomy.Body.Uranus, Neptune: Astronomy.Body.Neptune,
  Pluto: Astronomy.Body.Pluto,
}

const norm = (d: number) => ((d % 360) + 360) % 360

/** Apparent longitude in degrees on the true ecliptic of date (aberration on, J2000 vector rotated to ECT). */
function lonOf(body: Astronomy.Body, time: Astronomy.AstroTime): number {
  const eqj = Astronomy.GeoVector(body, time, true)
  const ect = Astronomy.RotateVector(Astronomy.Rotation_EQJ_ECT(time), eqj)
  return norm(Astronomy.SphereFromVector(ect).lon)
}

/** Signed shortest difference b - a in degrees, range -180..180. */
const wrapDiff = (a: number, b: number) => ((b - a + 540) % 360) - 180

export function planetLongitudes(utc: Date): Record<PlanetName, PlanetPos> {
  const t = new Astronomy.AstroTime(utc)
  const h = 0.5 // half step in days for the central difference
  const t0 = t.AddDays(-h)
  const t1 = t.AddDays(h)
  const out = {} as Record<PlanetName, PlanetPos>
  for (const name of PLANET_NAMES) {
    const b = BODY[name]
    const speed = wrapDiff(lonOf(b, t0), lonOf(b, t1)) / (2 * h)
    out[name] = { longitude: lonOf(b, t), speed, retrograde: speed < 0 }
  }
  return out
}

/** Local civil birth time to UTC. Null for impossible dates or DST-gap times. Unknown time = 12:00 local. */
export function birthInstantUtc(input: BirthInput): Date | null {
  try {
    const { year, month, day } = input
    const hour = input.unknownTime ? 12 : input.hour
    const minute = input.unknownTime ? 0 : input.minute
    const tz = input.timezone ?? 'Asia/Seoul'
    if (![year, month, day, hour, minute].every(Number.isInteger)) return null
    const p = (n: number, w = 2) => String(n).padStart(w, '0')
    const wall = `${p(year, 4)}-${p(month)}-${p(day)}T${p(hour)}:${p(minute)}:00`
    const utc = fromZonedTime(wall, tz)
    if (Number.isNaN(utc.getTime())) return null
    // The wall clock must round-trip, otherwise the date was impossible (Feb 30) or fell in a DST gap.
    if (formatInTimeZone(utc, tz, "yyyy-MM-dd'T'HH:mm:ss") !== wall) return null
    return utc
  } catch {
    return null
  }
}
