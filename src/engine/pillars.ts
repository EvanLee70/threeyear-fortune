// Four-pillar table (saju). Own implementation; solar-term table comes from the MIT vendor data.
import { formatInTimeZone, fromZonedTime } from 'date-fns-tz'
import { getPreviousSolarTermByInstant, getSolarTermMonthIndex } from '../vendor/fortuneteller/data/solar_terms.ts'
import type { BirthInput, Gongmang, PillarDetail, PillarTableData } from './types.ts'

const STEMS = [...'甲乙丙丁戊己庚辛壬癸']
const BRANCHES = [...'子丑寅卯辰巳午未申酉戌亥']
// Hidden stems per branch, residual -> middle -> main (the last one is the main stem).
const HIDDEN = ['壬癸', '癸辛己', '戊丙甲', '甲乙', '乙癸戊', '戊庚丙', '丙己丁', '丁乙己', '戊壬庚', '庚辛', '辛丁戊', '戊甲壬']
// Two-stem entries are shown with a space between them (子 卯 酉), matching the table layout.
const jigangText = (b: number) => (HIDDEN[b].length === 2 ? `${HIDDEN[b][0]} ${HIDDEN[b][1]}` : HIDDEN[b])

const TEN_GODS = ['比肩', '劫財', '食神', '傷官', '偏財', '正財', '偏官', '正官', '偏印', '正印']
const UNSEONG = ['長生', '沐浴', '冠帶', '建祿', '帝旺', '衰', '病', '死', '墓', '絶', '胎', '養']
// Branch where each stem is at 長生: yang stems count forward, yin stems backward.
const BIRTH_BRANCH = [11, 6, 2, 9, 2, 9, 5, 0, 8, 3]
const SINSAL = ['劫殺', '災殺', '天殺', '地殺', '年殺', '月殺', '亡身', '將星', '攀鞍', '驛馬', '六害', '華蓋']
// 劫殺 branch by year-branch triad (申子辰 / 亥卯未 / 寅午戌 / 巳酉丑), indexed by branch % 4.
const SINSAL_START = [5, 2, 11, 8]

const mod = (n: number, m: number) => ((n % m) + m) % m

/** Ten god of `other` stem relative to the day stem `me` (both 0..9). */
function tenGod(me: number, other: number): string {
  const rel = mod(Math.floor(other / 2) - Math.floor(me / 2), 5) // element offset: 0 same, 1 I make, 2 I control, 3 controls me, 4 makes me
  const same = me % 2 === other % 2
  const pair = [0, 2, 4, 6, 8][rel]
  return TEN_GODS[pair + (same ? 0 : 1)]
}

function unseong(dayStem: number, branch: number): string {
  const step = dayStem % 2 === 0 ? branch - BIRTH_BRANCH[dayStem] : BIRTH_BRANCH[dayStem] - branch
  return UNSEONG[mod(step, 12)]
}

/** Sexagenary index (0 = 甲子) of a UTC calendar day count. 1900-01-01 is 甲戌 (10). */
const dayIndex = (utcDay: number) => mod(utcDay + 25567 + 10, 60)

/** Equation of time in minutes (common sine approximation); n = day of year of the birth date. */
function equationOfTime(n: number): number {
  const b = (2 * Math.PI * (n - 81)) / 364
  return 9.87 * Math.sin(2 * b) - 7.53 * Math.cos(b) - 1.5 * Math.sin(b)
}

/**
 * Validates a birth and returns its UTC instant plus the saju clock shift in minutes.
 * Throws Error only for impossible input (non-existent calendar date, or a wall-clock time skipped by a daylight-time jump).
 * Shift: always -30 min (hour boundaries fall on :30). Seoul zone: KST wall clock. Other zones: true solar time
 * = longitude offset vs 135E plus equation of time.
 */
function resolveClock(input: BirthInput): { instant: number; shiftMin: number } {
  const { year, month, day } = input
  const hour = input.unknownTime ? 12 : input.hour
  const minute = input.unknownTime ? 0 : input.minute
  const zone = input.timezone ?? 'Asia/Seoul'
  const p2 = (n: number) => String(n).padStart(2, '0')
  const wall = `${String(year).padStart(4, '0')}-${p2(month)}-${p2(day)}T${p2(hour)}:${p2(minute)}:00`
  const probe = new Date(Date.UTC(year, month - 1, day))
  if (probe.getUTCMonth() !== month - 1 || probe.getUTCDate() !== day || hour < 0 || hour > 23 || minute < 0 || minute > 59) {
    throw new Error(`Invalid birth date/time: ${wall}`)
  }
  const instant = fromZonedTime(wall, zone).getTime()
  if (Number.isNaN(instant) || formatInTimeZone(instant, zone, "yyyy-MM-dd'T'HH:mm:00") !== wall) {
    throw new Error(`Local time does not exist in ${zone}: ${wall}`)
  }
  let shiftMin = -30
  if (zone !== 'Asia/Seoul') {
    const doy = Math.round((Date.UTC(year, month - 1, day) - Date.UTC(year, 0, 0)) / 86400000)
    shiftMin += ((input.longitude ?? 126.978) - 135) * 4 + equationOfTime(doy)
  }
  return { instant, shiftMin }
}

/**
 * Input for an engine that reads the clock as KST by itself (the vendor engine): the clock it must see for the
 * solar-term decision (year and month pillars) and the exact offset it must add for the day and hour pillars.
 * Mirrors calculatePillarTable: -30 min, solar time abroad, unified 23:00 day roll, and the one-minute term margin.
 */
export function sajuVendorFeed(input: BirthInput): { wall: string; offsetMin: number } {
  const { instant, shiftMin } = resolveClock(input)
  const shifted = instant + shiftMin * 60000
  const target = new Date(shifted + 9 * 3600000).getUTCHours() >= 23 ? shifted + 3600000 : shifted
  const wallMs = Math.floor((instant + (shiftMin + 30) * 60000 - 60001) / 60000) * 60000
  return { wall: formatInTimeZone(wallMs, 'Asia/Seoul', "yyyy-MM-dd'T'HH:mm"), offsetMin: (target - wallMs) / 60000 }
}

/** Pillar table for a birth. Throws Error only for impossible input (see resolveClock). The site validates first. */
export function calculatePillarTable(input: BirthInput): PillarTableData {
  const { instant, shiftMin } = resolveClock(input)
  // Unified 23:00 rule: from 23:00 on, the day (and the 子 hour stem) belongs to the next day.
  const clock = instant + 9 * 3600000 + shiftMin * 60000 + 3600000
  const clockHour = new Date(clock).getUTCHours()
  const utcDay = Math.floor(clock / 86400000)

  // Year and month pillars switch at the solar-term instant (table is in KST), compared with the same clock
  // before the -30 min shift. A birth within one minute after a table time still counts as before the term
  // (the table has minute precision; this matches the reference data).
  const termInstant = instant + (shiftMin + 30) * 60000 - 60001
  const term = getPreviousSolarTermByInstant(new Date(termInstant))
  if (!term) throw new Error('Birth date is outside the supported range (1900-2200)')
  const monthNo = getSolarTermMonthIndex(term.term) // 0 = 寅 month
  const seoulYear = Number(formatInTimeZone(termInstant, 'Asia/Seoul', 'yyyy'))
  const seoulMonth = Number(formatInTimeZone(termInstant, 'Asia/Seoul', 'M'))
  const sajuYear = seoulMonth <= 2 && monthNo >= 10 ? seoulYear - 1 : seoulYear
  const yearStem = mod(sajuYear - 4, 10)
  const yearBranch = mod(sajuYear - 4, 12)
  const monthBranch = (monthNo + 2) % 12
  const monthStem = (mod(yearStem, 5) * 2 + 2 + monthNo) % 10

  const dayIdx = dayIndex(utcDay)
  const dayStem = dayIdx % 10
  const dayBranch = dayIdx % 12
  const hourBranch = Math.floor(clockHour / 2)
  const hourStem = (dayStem * 2 + hourBranch) % 10

  const cols: [number, number][] = [[hourStem, hourBranch], [dayStem, dayBranch], [monthStem, monthBranch], [yearStem, yearBranch]]
  const sinsalBase = SINSAL_START[yearBranch % 4]
  const pillars: PillarDetail[] = cols.map(([s, b], i) => ({
    pillar: { ganzi: STEMS[s] + BRANCHES[b], stem: STEMS[s], branch: BRANCHES[b] },
    stemSipsin: i === 1 ? '本元' : tenGod(dayStem, s),
    branchSipsin: tenGod(dayStem, STEMS.indexOf(HIDDEN[b].at(-1)!)),
    unseong: unseong(dayStem, b),
    sinsal: SINSAL[mod(b - sinsalBase, 12)],
    jigang: jigangText(b),
  }))

  const empty = [mod(dayBranch - dayStem - 2, 12), mod(dayBranch - dayStem - 1, 12)] // two branches after the ten-day cycle
  const gongmang: Gongmang = {
    branches: [BRANCHES[empty[0]], BRANCHES[empty[1]]],
    pillarIndices: cols.flatMap(([, b], i) => (empty.includes(b) ? [i] : [])),
  }
  return { pillars, gongmang }
}
