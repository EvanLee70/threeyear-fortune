import { describe, expect, it } from 'vitest'
import { computeZiweiYearly } from '../src/yearly/ziwei.ts'
import { adjustBirthInputToKstWallClock } from '../src/engine/tz.ts'
import type { BirthInput } from '../src/engine/types.ts'

const base: BirthInput = { year: 1985, month: 3, day: 14, hour: 9, minute: 30, gender: 'M' }

describe('computeZiweiYearly', () => {
  it('normal: 3 years, 12 palaces, scores in range, every graph has its explanation', () => {
    const r = computeZiweiYearly(base, [2026, 2027, 2028])!
    expect(r).toHaveLength(3)
    r.forEach((y, i) => {
      expect(y.system).toBe('ziwei')
      expect(y.year).toBe(2026 + i)
      expect(y.score).toBeGreaterThanOrEqual(0)
      expect(y.score).toBeLessThanOrEqual(100)
      expect(y.palaces).toHaveLength(12)
      expect(y.bars!.map((b) => b.label)).toEqual(['재물', '직업', '연애', '건강'])
      for (const b of y.bars!) expect(b.score >= 0 && b.score <= 100).toBe(true)
      expect(y.months).toHaveLength(12)
      for (const m of y.months!) expect(m.score >= 0 && m.score <= 100).toBe(true)
      expect(y.explain.palaces).toBeTruthy()
      expect(y.explain.bars).toBeTruthy()
      expect(y.explain.months).toBeTruthy()
      expect(y.narrative.length).toBeGreaterThanOrEqual(2)
      expect(y.narrative.length).toBeLessThanOrEqual(5)
      expect(y.cautions.length).toBeLessThanOrEqual(5)
      expect(y.headline).toBeTruthy()
      expect(y.facts.some((f) => f.label === '대한')).toBe(true)
    })
    // yearly life palace is always the first cell and carries the name 명궁
    expect(r.every((y) => y.palaces![0].name === '명궁')).toBe(true)
  })

  it('empty input gives null', () => {
    expect(computeZiweiYearly({} as BirthInput, [2026])).toBeNull()
  })

  it('invalid input gives null', () => {
    expect(computeZiweiYearly({ ...base, month: 13 }, [2026])).toBeNull()
    expect(computeZiweiYearly({ ...base, month: 2, day: 30 }, [2026])).toBeNull()
    expect(computeZiweiYearly(base, [])).toBeNull()
  })

  it('unknown time assumes 12:00 and adds a caution', () => {
    const r = computeZiweiYearly({ ...base, hour: 0, minute: 0, unknownTime: true }, [2026])!
    expect(r[0].cautions.some((c) => c.includes('12시'))).toBe(true)
    expect(r[0].palaces).toHaveLength(12)
  })

  it('is deterministic', () => {
    expect(computeZiweiYearly(base, [2026, 2027])).toEqual(computeZiweiYearly(base, [2026, 2027]))
  })

  it('output differs between years and uses the transformations', () => {
    const r = computeZiweiYearly(base, [2026, 2027])!
    expect(r[0].headline).not.toBe(r[1].headline)
    expect(r[0].palaces!.flatMap((p) => p.marks).filter((m) => m === '화록(化祿)')).toHaveLength(1)
  })
})

describe('KST wall clock helper (tz database offsets)', () => {
  it('Seoul 2000 is +9; 1955 (+8:30) and 1987 summer time (+10) are normalised to +9', () => {
    const k = (year: number, month: number, day: number, hour: number) =>
      adjustBirthInputToKstWallClock({ year, month, day, hour, minute: 0, gender: 'M' })
    expect(k(2000, 6, 1, 12)).toMatchObject({ hour: 12 })
    expect(k(1955, 1, 15, 12)).toMatchObject({ hour: 12, minute: 30 })
    expect(k(1987, 7, 1, 12)).toMatchObject({ hour: 11 })
  })
})
