import { describe, expect, it } from 'vitest'
import { validateBirthLocalTime as v } from '../src/engine/tz.ts'

const NY = [40.7128, -74.006] as const
const SEOUL = [37.5665, 126.978] as const

describe('validateBirthLocalTime', () => {
  it('normal Seoul time', () => {
    expect(v(...SEOUL, 1985, 3, 14, 9, 30)).toEqual({ ok: true, timezone: 'Asia/Seoul' })
  })
  it('spring-forward gap is rejected, edges are not', () => {
    expect(v(...NY, 2021, 3, 14, 2, 30)).toEqual({ ok: false, reason: 'dst-gap' })
    expect(v(...NY, 2021, 3, 14, 2, 0)).toEqual({ ok: false, reason: 'dst-gap' })
    expect(v(...NY, 2021, 3, 14, 1, 59)).toEqual({ ok: true, timezone: 'America/New_York' })
    expect(v(...NY, 2021, 3, 14, 3, 0)).toEqual({ ok: true, timezone: 'America/New_York' })
  })
  it('fall-back ambiguous time is ok', () => {
    expect(v(...NY, 2021, 11, 7, 1, 30)).toEqual({ ok: true, timezone: 'America/New_York' })
  })
  it('bad coordinates or impossible date give no-timezone', () => {
    expect(v(999, 0, 2000, 1, 1, 0, 0)).toEqual({ ok: false, reason: 'no-timezone' })
    expect(v(Number.NaN, 0, 2000, 1, 1, 0, 0)).toEqual({ ok: false, reason: 'no-timezone' })
    expect(v(...SEOUL, 2000, 2, 30, 0, 0)).toEqual({ ok: false, reason: 'no-timezone' })
  })
  it('Korean daylight time 1988: the 02:00-03:00 hour on May 8 does not exist, 03:30 and midsummer do', () => {
    expect(v(...SEOUL, 1988, 5, 8, 2, 30)).toEqual({ ok: false, reason: 'dst-gap' })
    expect(v(...SEOUL, 1988, 5, 8, 3, 30)).toEqual({ ok: true, timezone: 'Asia/Seoul' })
    expect(v(...SEOUL, 1988, 7, 1, 12, 0)).toEqual({ ok: true, timezone: 'Asia/Seoul' })
  })
})
