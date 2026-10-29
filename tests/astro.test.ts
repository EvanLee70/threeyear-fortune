import { describe, expect, it } from 'vitest'
import { computeAstroYearly } from '../src/yearly/astro'
import type { BirthInput } from '../src/engine/types'

const base: BirthInput = { year: 1985, month: 3, day: 14, hour: 9, minute: 30, gender: 'M' }
const inRange = (n: number) => Number.isInteger(n) && n >= 0 && n <= 100

describe('computeAstroYearly', () => {
  it('normal input gives 3 valid years with explained graphs', () => {
    const r = computeAstroYearly(base, [2026, 2027, 2028])!
    expect(r).toHaveLength(3)
    for (const y of r) {
      expect(y.system).toBe('astro')
      expect(inRange(y.score)).toBe(true)
      expect(y.months).toHaveLength(12)
      expect(y.months!.every((m) => inRange(m.score))).toBe(true)
      expect(y.bars).toHaveLength(3)
      expect(y.bars!.every((b) => inRange(b.score))).toBe(true)
      expect(y.aspects!.length).toBeLessThanOrEqual(8)
      expect(y.aspects!.every((a) => inRange(a.strength))).toBe(true)
      expect(y.explain.months && y.explain.bars && y.explain.aspects).toBeTruthy()
      expect(y.narrative.length).toBeGreaterThanOrEqual(2)
      expect(y.narrative.length).toBeLessThanOrEqual(5)
      expect(y.cautions.length).toBeLessThanOrEqual(5)
      expect(y.facts.map((f) => f.label)).toEqual(['상승궁', '목성 하우스', '토성 하우스', '가장 강한 각'])
    }
    expect(r.map((y) => y.year)).toEqual([2026, 2027, 2028])
  })

  it('empty input gives null', () => {
    expect(computeAstroYearly({} as BirthInput, [2026])).toBeNull()
  })

  it('invalid date gives null', () => {
    expect(computeAstroYearly({ ...base, month: 13 }, [2026])).toBeNull()
  })

  it('unknown time skips Moon and Ascendant and adds a caution', () => {
    const r = computeAstroYearly({ ...base, unknownTime: true }, [2026, 2027])!
    expect(r).toHaveLength(2)
    for (const y of r) {
      expect(y.facts.some((f) => f.label === '상승궁')).toBe(false)
      expect(y.aspects!.every((a) => a.label.includes('태양'))).toBe(true)
      expect(y.cautions.some((c) => c.includes('출생 시각'))).toBe(true)
      expect(y.explain.months && y.explain.bars && y.explain.aspects).toBeTruthy()
    }
  })

  it('is deterministic', () => {
    expect(computeAstroYearly(base, [2026, 2027, 2028])).toEqual(computeAstroYearly(base, [2026, 2027, 2028]))
  })

  it('varies across inputs', () => {
    const a = computeAstroYearly(base, [2027])![0]
    const b = computeAstroYearly({ ...base, year: 1992, month: 9, day: 2, hour: 22 }, [2027])![0]
    expect(a.narrative).not.toEqual(b.narrative)
  })
})
