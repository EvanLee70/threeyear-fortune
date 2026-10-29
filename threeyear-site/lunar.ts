// 음력 <-> 양력 변환 (순수 함수). lunar-javascript 사용: 윤달은 음수 월로 표현한다.
// 존재하지 않는 날짜는 예외 대신 { ok: false, error } 로 돌려준다.
// @ts-expect-error lunar-javascript has no type declarations
import { Lunar, LunarYear, Solar } from 'lunar-javascript'

export interface Ymd { year: number; month: number; day: number }
export interface LunarYmd extends Ymd { leap: boolean }
export type Conv<T> = { ok: true; value: T } | { ok: false; error: string }

const BAD = '날짜를 확인해 주세요.'
const isInt = (...n: unknown[]) => n.every((v) => Number.isInteger(v))

/** 음력(윤달 여부 포함) -> 양력. 없는 날짜·없는 윤달이면 한국어 오류 메시지. */
export function lunarToSolar(year: number, month: number, day: number, leap: boolean): Conv<Ymd> {
  if (!isInt(year, month, day) || month < 1 || month > 12 || day < 1 || day > 30) return { ok: false, error: BAD }
  try {
    if (leap && LunarYear.fromYear(year).getLeapMonth() !== month) {
      return { ok: false, error: `음력 ${year}년에는 윤${month}월이 없습니다.` }
    }
    const signed = leap ? -month : month
    const solar = Lunar.fromYmd(year, signed, day).getSolar()
    const out = { year: solar.getYear(), month: solar.getMonth(), day: solar.getDay() }
    // 되돌려 보아 같은 음력 날짜인지 확인 (라이브러리가 넘치는 날짜를 밀어내는 경우 방어)
    const back = Solar.fromYmd(out.year, out.month, out.day).getLunar()
    if (back.getYear() !== year || back.getMonth() !== signed || back.getDay() !== day) throw new Error('mismatch')
    return { ok: true, value: out }
  } catch {
    return { ok: false, error: `음력 ${year}년 ${leap ? '윤' : ''}${month}월 ${day}일은 없는 날짜입니다.` }
  }
}

/** 양력 -> 음력. 없는 날짜면 오류. */
export function solarToLunar(year: number, month: number, day: number): Conv<LunarYmd> {
  if (!isInt(year, month, day)) return { ok: false, error: BAD }
  try {
    const d = new Date(year, month - 1, day)
    if (d.getFullYear() !== year || d.getMonth() !== month - 1 || d.getDate() !== day) return { ok: false, error: BAD }
    const l = Solar.fromYmd(year, month, day).getLunar()
    const m = l.getMonth()
    return { ok: true, value: { year: l.getYear(), month: Math.abs(m), day: l.getDay(), leap: m < 0 } }
  } catch {
    return { ok: false, error: BAD }
  }
}
