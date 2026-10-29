// Tropical ascendant from local civil birth time. Public formulas (Meeus, Astronomical Algorithms).
import { formatInTimeZone, fromZonedTime } from 'date-fns-tz'
import type { Ascendant, BirthInput, ZodiacSign } from './types'

const SIGNS: ZodiacSign[] = [
  'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
  'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces',
]
const RAD = Math.PI / 180
const norm = (d: number) => ((d % 360) + 360) % 360

export function calculateAscendant(input: BirthInput): Ascendant | null {
  try {
    const { year, month, day } = input
    const hour = input.unknownTime ? 12 : input.hour
    const minute = input.unknownTime ? 0 : input.minute
    const lat = input.latitude ?? 37.5665
    const lon = input.longitude ?? 126.978
    const tz = input.timezone ?? 'Asia/Seoul'
    const nums = [year, month, day, hour, minute, lat, lon]
    if (!nums.every(Number.isFinite)) return null
    if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day) ||
        !Number.isInteger(hour) || !Number.isInteger(minute)) return null
    if (Math.abs(lat) > 90 || Math.abs(lon) > 180) return null

    const p = (n: number, w = 2) => String(n).padStart(w, '0')
    const wall = `${p(year, 4)}-${p(month)}-${p(day)}T${p(hour)}:${p(minute)}:00`
    const utc = fromZonedTime(wall, tz)
    if (Number.isNaN(utc.getTime())) return null
    // Reject impossible dates (Feb 30, month 13) and DST-gap times: the wall clock must round-trip.
    if (formatInTimeZone(utc, tz, "yyyy-MM-dd'T'HH:mm:ss") !== wall) return null

    const jd = utc.getTime() / 86400000 + 2440587.5
    const T = (jd - 2451545) / 36525 // UT; TT shifts the result by < 0.0001 deg
    const d = jd - 2451545

    // Nutation (Meeus ch. 22 short form), arcseconds
    const om = (125.04452 - 1934.136261 * T) * RAD
    const Ls = (280.4665 + 36000.7698 * T) * RAD
    const Lm = (218.3165 + 481267.8813 * T) * RAD
    const dpsi = (-17.2 * Math.sin(om) - 1.32 * Math.sin(2 * Ls) - 0.23 * Math.sin(2 * Lm) + 0.21 * Math.sin(2 * om)) / 3600
    const deps = (9.2 * Math.cos(om) + 0.57 * Math.cos(2 * Ls) + 0.1 * Math.cos(2 * Lm) - 0.09 * Math.cos(2 * om)) / 3600
    const eps0 = 23 + 26 / 60 + 21.448 / 3600 - (46.815 * T + 0.00059 * T * T - 0.001813 * T ** 3) / 3600
    const eps = (eps0 + deps) * RAD

    const gmst = 280.46061837 + 360.98564736629 * d + 0.000387933 * T * T - (T ** 3) / 38710000
    const ramc = norm(gmst + dpsi * Math.cos(eps) + lon) * RAD

    const y = Math.cos(ramc)
    const x = -(Math.sin(ramc) * Math.cos(eps) + Math.tan(lat * RAD) * Math.sin(eps))
    const longitude = norm(Math.atan2(y, x) / RAD)
    const idx = Math.min(11, Math.floor(longitude / 30))
    return { longitude, sign: SIGNS[idx], degreeInSign: longitude - idx * 30 }
  } catch {
    return null
  }
}
