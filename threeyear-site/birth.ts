// 입력 폼 값 -> 계산용 BirthInput(양력) + 화면 표시용 메타. 순수 함수.
import type { BirthInput, City, Gender } from '../src/engine/types.ts'
import { formatCityName } from '../src/engine/cities.ts'
import { validateBirthLocalTime } from '../src/engine/tz.ts'
import { lunarToSolar, solarToLunar, type LunarYmd, type Ymd } from './lunar.ts'

export type Calendar = 'solar' | 'lunar'

export interface BirthFormState {
  calendar: Calendar
  leap: boolean // 음력일 때만 의미가 있다
  year: number; month: number; day: number
  hour: number; minute: number; unknownTime: boolean
  gender: Gender
  city: number
}

export interface BirthMeta {
  calendar: Calendar
  solar: Ymd
  lunar: LunarYmd
  hour: number; minute: number; unknownTime: boolean
  gender: Gender
  cityLabel: string
}

export type Resolved = { ok: true; input: BirthInput; meta: BirthMeta } | { ok: false; error: string }

const p2 = (n: number) => String(n).padStart(2, '0')
const solarText = (d: Ymd) => `양력 ${d.year}.${p2(d.month)}.${p2(d.day)}`
const lunarText = (d: LunarYmd) => `음력 ${d.year}.${d.leap ? '윤' : ''}${p2(d.month)}.${p2(d.day)}`

/** 예: 양력 1985.03.14 (음력 1985.01.23) · 09:30 · 남 · 서울 */
export function formatHeader(m: BirthMeta): string {
  const date = m.calendar === 'solar' ? `${solarText(m.solar)} (${lunarText(m.lunar)})` : `${lunarText(m.lunar)} (${solarText(m.solar)})`
  const time = m.unknownTime ? '시간 미상' : `${p2(m.hour)}:${p2(m.minute)}`
  return [date, time, m.gender === 'M' ? '남' : '여', m.cityLabel].join(' · ')
}

/** 폼 값을 해석한다. 음력이면 먼저 양력으로 바꾼다. 불가능한 날짜·시각은 오류 메시지. */
export function resolveBirth(f: BirthFormState, city: City | undefined): Resolved {
  if (!city) return { ok: false, error: '태어난 곳을 선택해 주세요.' }
  const hour = f.unknownTime ? 12 : f.hour
  const minute = f.unknownTime ? 0 : f.minute

  let solar: Ymd
  if (f.calendar === 'lunar') {
    const c = lunarToSolar(f.year, f.month, f.day, f.leap)
    if (!c.ok) return c
    solar = c.value
  } else {
    solar = { year: f.year, month: f.month, day: f.day }
  }
  const l = solarToLunar(solar.year, solar.month, solar.day)
  if (!l.ok) return l

  const tz = validateBirthLocalTime(city.lat, city.lon, solar.year, solar.month, solar.day, hour, minute)
  if (!tz.ok) {
    return { ok: false, error: tz.reason === 'dst-gap'
      ? '입력한 시각은 그 지역에서 서머타임 전환으로 존재하지 않습니다. 시각을 다시 확인해 주세요.'
      : '출생지의 시간대를 확인하지 못했습니다. 다른 도시를 선택해 주세요.' }
  }
  return {
    ok: true,
    input: { ...solar, hour, minute, gender: f.gender, unknownTime: f.unknownTime, latitude: city.lat, longitude: city.lon, timezone: tz.timezone },
    meta: { calendar: f.calendar, solar, lunar: l.value, hour, minute, unknownTime: f.unknownTime, gender: f.gender, cityLabel: formatCityName(city) },
  }
}

/**
 * Enter inside a field submits a form by itself (browsers do this for radios, checkboxes, and text fields).
 * Only the 운세 보기 button may open the result, so Enter anywhere else is blocked.
 */
export function isAccidentalSubmitKey(key: string, tagName: string): boolean {
  return key === 'Enter' && tagName.toUpperCase() !== 'BUTTON'
}
