import { describe, expect, it } from 'vitest'
// @ts-expect-error lunar-javascript has no type declarations
import { Solar } from 'lunar-javascript'
import { lunarToSolar, solarToLunar } from './lunar.ts'

describe('lunar conversion', () => {
  it('정상: 라이브러리가 확인한 쌍 (음력 1985-01-24 = 양력 1985-03-15)', () => {
    // 라이브러리로 직접 교차 확인 — 양력 1985-03-14 는 음력 1월 23일이다.
    const l = Solar.fromYmd(1985, 3, 15).getLunar()
    expect([l.getYear(), l.getMonth(), l.getDay()]).toEqual([1985, 1, 24])
    expect(lunarToSolar(1985, 1, 24, false)).toEqual({ ok: true, value: { year: 1985, month: 3, day: 15 } })
    expect(solarToLunar(1985, 3, 14)).toEqual({ ok: true, value: { year: 1985, month: 1, day: 23, leap: false } })
  })

  it('정상: 윤달 (음력 2023 윤2월 10일 = 양력 2023-03-31)', () => {
    expect(lunarToSolar(2023, 2, 10, true)).toEqual({ ok: true, value: { year: 2023, month: 3, day: 31 } })
    expect(solarToLunar(2023, 3, 31)).toEqual({ ok: true, value: { year: 2023, month: 2, day: 10, leap: true } })
  })

  it('왕복 변환이 일치한다', () => {
    for (const [y, m, d] of [[1920, 5, 5], [1999, 12, 31], [2000, 2, 29], [2024, 7, 1]]) {
      const l = solarToLunar(y, m, d)
      expect(l.ok).toBe(true)
      if (!l.ok) continue
      expect(lunarToSolar(l.value.year, l.value.month, l.value.day, l.value.leap)).toEqual({ ok: true, value: { year: y, month: m, day: d } })
    }
  })

  it('빈/누락 입력은 예외 없이 오류', () => {
    const empty = [Number.NaN, Number.NaN, Number.NaN] as const
    expect(lunarToSolar(...empty, false).ok).toBe(false)
    expect(solarToLunar(...empty).ok).toBe(false)
    expect(lunarToSolar(undefined as unknown as number, 1, 1, false).ok).toBe(false)
  })

  it('잘못된 입력: 13월, 0일, 31일, 없는 윤달, 29일뿐인 윤달의 30일', () => {
    expect(lunarToSolar(1985, 13, 1, false).ok).toBe(false)
    expect(lunarToSolar(1985, 1, 0, false).ok).toBe(false)
    expect(lunarToSolar(1985, 2, 31, false).ok).toBe(false)
    expect(lunarToSolar(1985, 2, 10, true)).toEqual({ ok: false, error: '음력 1985년에는 윤2월이 없습니다.' })
    expect(lunarToSolar(2023, 2, 30, true).ok).toBe(false) // 2023 윤2월은 29일까지
    expect(solarToLunar(2023, 2, 30).ok).toBe(false)
  })
})
