import { describe, expect, it } from 'vitest'
import { KOREAN_CITIES } from '../src/engine/cities.ts'
import { formatHeader, isAccidentalSubmitKey, isRealClick, resolveBirth, type BirthFormState } from './birth.ts'

const base: BirthFormState = { calendar: 'solar', leap: false, year: 1985, month: 3, day: 14, hour: 9, minute: 30, unknownTime: false, gender: 'M', city: 0 }
const seoul = KOREAN_CITIES[0]

describe('resolveBirth', () => {
  it('양력: 헤더 문구에 음력이 병기된다', () => {
    const r = resolveBirth(base, seoul)
    expect(r.ok && formatHeader(r.meta)).toBe('양력 1985.03.14 (음력 1985.01.23) · 09:30 · 남 · 서울')
  })

  it('음력: 양력으로 바꿔서 BirthInput 에 담는다', () => {
    const r = resolveBirth({ ...base, calendar: 'lunar', month: 1, day: 24 }, seoul)
    expect(r.ok && r.input).toMatchObject({ year: 1985, month: 3, day: 15, hour: 9, minute: 30, gender: 'M' })
    expect(r.ok && formatHeader(r.meta)).toBe('음력 1985.01.24 (양력 1985.03.15) · 09:30 · 남 · 서울')
  })

  it('윤달과 시간 미상 표기', () => {
    const r = resolveBirth({ ...base, calendar: 'lunar', leap: true, year: 2023, month: 2, day: 10, unknownTime: true, gender: 'F' }, seoul)
    expect(r.ok && formatHeader(r.meta)).toBe('음력 2023.윤02.10 (양력 2023.03.31) · 시간 미상 · 여 · 서울')
    expect(r.ok && r.input.hour).toBe(12)
  })

  it('빈 입력: 도시가 없으면 오류, 값이 비면 오류', () => {
    expect(resolveBirth(base, undefined)).toEqual({ ok: false, error: '태어난 곳을 선택해 주세요.' })
    expect(resolveBirth({ ...base, calendar: 'lunar', year: Number.NaN }, seoul).ok).toBe(false)
  })

  it('잘못된 입력: 없는 음력 날짜·없는 윤달·존재하지 않는 양력 날짜', () => {
    expect(resolveBirth({ ...base, calendar: 'lunar', leap: true, year: 1985 }, seoul).ok).toBe(false)
    expect(resolveBirth({ ...base, calendar: 'lunar', month: 2, day: 31 }, seoul).ok).toBe(false)
    expect(resolveBirth({ ...base, month: 2, day: 30 }, seoul).ok).toBe(false)
  })
})

describe('isAccidentalSubmitKey', () => {
  it('blocks Enter everywhere except on the submit button', () => {
    for (const tag of ['INPUT', 'SELECT', 'LABEL', 'FIELDSET', 'FORM']) expect(isAccidentalSubmitKey('Enter', tag), tag).toBe(true)
    expect(isAccidentalSubmitKey('Enter', 'BUTTON')).toBe(false)
    expect(isAccidentalSubmitKey('Enter', 'button')).toBe(false)
  })

  it('never blocks other keys such as Space, Tab, and arrows', () => {
    for (const key of [' ', 'Tab', 'ArrowDown', 'a', '']) expect(isAccidentalSubmitKey(key, 'INPUT'), key).toBe(false)
  })
})

describe('isRealClick', () => {
  it('accepts only clicks made by the user', () => {
    expect(isRealClick({ isTrusted: true })).toBe(true)
    expect(isRealClick({ isTrusted: false })).toBe(false) // element.click() from a script or an extension
    expect(isRealClick({})).toBe(false)
  })
})
