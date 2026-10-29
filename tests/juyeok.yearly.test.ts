import { describe, it, expect } from 'vitest'
import { computeJuyeokYearly } from '../src/yearly/juyeok.ts'
import { computeTojeongYearly } from '../src/yearly/tojeong.ts'
import type { BirthInput } from '../src/engine/types.ts'
import type { SystemYear } from '../src/yearly/types.ts'

const normal: BirthInput = { year: 1985, month: 3, day: 14, hour: 9, minute: 30, gender: 'M' }
const years = [2026, 2027, 2028]
const commonChecks = (r: SystemYear[] | null, system: string) => {
  expect(r).toHaveLength(3)
  r!.forEach((y, i) => {
    expect(y.system).toBe(system)
    expect(y.year).toBe(years[i])
    expect(y.score).toBeGreaterThanOrEqual(0); expect(y.score).toBeLessThanOrEqual(100)
    expect(y.headline.length).toBeGreaterThan(0)
    expect(y.narrative.length).toBeGreaterThanOrEqual(2); expect(y.narrative.length).toBeLessThanOrEqual(5)
    expect(y.cautions.length).toBeLessThanOrEqual(5)
    expect(y.facts.length).toBeGreaterThan(0)
  })
}

describe.each([['juyeok', computeJuyeokYearly], ['tojeong', computeTojeongYearly]] as const)('%s yearly', (name, fn) => {
  it('normal input: 3 items with scores and explain', () => {
    const r = fn(normal, years)
    commonChecks(r, name)
    r!.forEach((y) => {
      if (name === 'juyeok') { expect(y.hexagram!.lines).toHaveLength(6); expect(y.explain.hexagram).toBeTruthy() }
      else { expect(y.months).toHaveLength(12); expect(y.explain.months).toBeTruthy() }
    })
  })
  it('empty input returns null', () => expect(fn({} as BirthInput, years)).toBeNull())
  it('invalid month returns null', () => expect(fn({ ...normal, month: 13 }, years)).toBeNull())
  it('invalid day (Feb 30) returns null', () => expect(fn({ ...normal, month: 2, day: 30 }, years)).toBeNull())
  it('is deterministic', () => expect(fn(normal, years)).toEqual(fn(normal, years)))
  it('unknown time still works', () => commonChecks(fn({ ...normal, unknownTime: true }, years), name))
})

describe('juyeok details', () => {
  it('changed hexagram appears exactly when a line is changing; facts match', () => {
    let withChange = 0
    for (let d = 1; d <= 28; d++) {
      const [y] = computeJuyeokYearly({ ...normal, day: d }, [2026])!
      const has = y.hexagram!.lines.some((v) => v === 6 || v === 9)
      if (has) withChange++
      expect(!!y.hexagram!.changed).toBe(has)
      expect(y.facts[2].value === '없음').toBe(!has)
    }
    expect(withChange).toBeGreaterThan(0)
  })
})

describe('tojeong details', () => {
  it('caution entries match the months below 50 (max 5)', () => {
    computeTojeongYearly(normal, years)!.forEach((y) => {
      const low = y.months!.filter((m) => m.score < 50).length
      expect(y.cautions.length).toBe(Math.min(low, 5))
    })
  })
})
