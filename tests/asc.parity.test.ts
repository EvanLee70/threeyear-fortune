import { describe, expect, it } from 'vitest'
import oracle from '../fixtures/oracle.json'
import { calculateAscendant } from '../src/engine/asc'
import type { BirthInput } from '../src/engine/types'

type Case = { id: number; input: BirthInput; asc: { longitude: number; sign: string } | null; error?: string }
const cases = oracle as unknown as Case[]
const usable = cases.filter((c) => c.asc)
const angDiff = (a: number, b: number) => {
  const d = Math.abs(a - b) % 360
  return Math.min(d, 360 - d)
}

describe('ascendant parity with fixtures/oracle.json', () => {
  it('matches sign and longitude', () => {
    let max = 0
    let within = 0
    for (const c of usable) {
      const r = calculateAscendant(c.input)
      expect(r, `id ${c.id}`).not.toBeNull()
      const err = angDiff(r!.longitude, c.asc!.longitude)
      max = Math.max(max, err)
      if (err <= 0.05) within++
      const nearEdge = c.asc!.longitude % 30 < 0.05 || c.asc!.longitude % 30 > 29.95
      if (!nearEdge) expect(r!.sign, `id ${c.id}`).toBe(c.asc!.sign)
    }
    console.log(`cases=${usable.length} maxErrDeg=${max.toFixed(6)}`)
    expect(within / usable.length).toBeGreaterThanOrEqual(0.99)
  })

  it('returns null where the reference errors (nonexistent local time)', () => {
    for (const c of cases.filter((x) => !x.asc)) expect(calculateAscendant(c.input), `id ${c.id}`).toBeNull()
  })
})

describe('calculateAscendant', () => {
  const base = { hour: 9, minute: 30, gender: 'M' } as const
  it('normal: Seoul 1985-03-14 09:30', () => {
    const r = calculateAscendant({ ...base, year: 1985, month: 3, day: 14 })!
    expect(r.longitude).toBeGreaterThanOrEqual(0)
    expect(r.longitude).toBeLessThan(360)
    expect(r.degreeInSign).toBeCloseTo(r.longitude % 30, 9)
  })
  it('invalid: month 13, NaN, nonexistent date -> null', () => {
    expect(calculateAscendant({ ...base, year: 1985, month: 13, day: 14 })).toBeNull()
    expect(calculateAscendant({ ...base, year: 1985, month: 3, day: NaN })).toBeNull()
    expect(calculateAscendant({ ...base, year: 1985, month: 2, day: 30 })).toBeNull()
  })
  it('unusual: Reykjavik latitude 64', () => {
    const r = calculateAscendant({ ...base, year: 1985, month: 3, day: 14, latitude: 64.1466, longitude: -21.9426, timezone: 'Atlantic/Reykjavik' })
    expect(r).not.toBeNull()
    expect(r!.sign).toMatch(/^[A-Z][a-z]+$/)
  })
})
