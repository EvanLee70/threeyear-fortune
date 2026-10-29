// Shared contract of the MIT engine. Own work; written from the public behaviour of the site, not from any copyleft source.

export type Gender = 'M' | 'F'

export interface BirthInput {
  year: number
  month: number
  day: number
  hour: number
  minute: number
  gender: Gender
  /** true = hour is unknown; the engine uses 12:00 and the hour pillar is not shown */
  unknownTime?: boolean
  /** degrees, north positive. Default: Seoul */
  latitude?: number
  /** degrees, east positive. Default: Seoul */
  longitude?: number
  /** IANA zone id. Default: 'Asia/Seoul' (KST wall-clock convention for Korean saju) */
  timezone?: string
}

export interface Pillar {
  /** sexagenary cycle name in hanja, e.g. '甲子' */
  ganzi: string
  /** heavenly stem in hanja */
  stem: string
  /** earthly branch in hanja */
  branch: string
}

/** One column of the pillar table. All strings are hanja, exactly as shown in the table. */
export interface PillarDetail {
  pillar: Pillar
  /** ten god of the stem, relative to the day stem (e.g. '偏印'; the day pillar itself shows '本元') */
  stemSipsin: string
  /** ten god of the branch (main hidden stem) */
  branchSipsin: string
  /** twelve life stage (e.g. '帝旺') */
  unseong: string
  /** twelve sinsal, based on the year branch (e.g. '將星') */
  sinsal: string
  /** hidden stems of the branch, concatenated (e.g. '丙己丁') */
  jigang: string
}

export interface Gongmang {
  /** the two empty branches of the day pillar's ten-day cycle */
  branches: [string, string]
  /** pillars that contain an empty branch: 0 = hour, 1 = day, 2 = month, 3 = year */
  pillarIndices: number[]
}

export interface PillarTableData {
  /** order: 0 = hour, 1 = day, 2 = month, 3 = year */
  pillars: PillarDetail[]
  gongmang: Gongmang
}

export type ZodiacSign =
  | 'Aries' | 'Taurus' | 'Gemini' | 'Cancer' | 'Leo' | 'Virgo'
  | 'Libra' | 'Scorpio' | 'Sagittarius' | 'Capricorn' | 'Aquarius' | 'Pisces'

export interface Ascendant {
  /** ecliptic longitude, degrees 0..360 */
  longitude: number
  sign: ZodiacSign
  /** degrees inside the sign, 0..30 */
  degreeInSign: number
}

export interface City {
  /** Korean display name, e.g. '서울' or '광주 (광주광역시)' */
  name: string
  /** Korean country name for foreign cities, e.g. '일본'. Absent for Korean cities. */
  country?: string
  /** degrees, north positive */
  lat: number
  /** degrees, east positive */
  lon: number
}
