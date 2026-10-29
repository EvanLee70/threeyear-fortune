// Parity of src/engine/tojeong.ts against fixtures/oracle-tojeong.json (300 cases from the previous implementation).
// Result: 300/300 cases equal on every field (upper/middle/lower/gwaNumber/gwaName/overallScore, 12 monthly scores,
// keywords, texts, calcNote). No time-convention difference was found, including 42 cases at hour 23, 0 and 1:
// the pillar table's unified 23:00 day roll and -30 min shift give the same day ganzi number (mod 3 for the lower
// trigram) as the old code in all of them. The old code mapped hour 0 to 12:00 (`hour || 12`); the new code reads
// 00:00 as given. No oracle case is affected.
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { calculateTojeong } from '../src/engine/tojeong.ts'

type Oracle = { id: number; input: { year: number; month: number; day: number; hour: number; minute: number; targetYear: number }; result: unknown }
const oracle: Oracle[] = JSON.parse(readFileSync(new URL('../fixtures/oracle-tojeong.json', import.meta.url), 'utf-8'))

describe('tojeong parity with oracle', () => {
  it('has 300 cases', () => expect(oracle.length).toBe(300))
  it('matches every case on every field', () => {
    const bad = oracle.filter((o) => {
      const i = o.input
      return JSON.stringify(calculateTojeong(i.year, i.month, i.day, i.hour, i.minute, i.targetYear)) !== JSON.stringify(o.result)
    })
    expect(bad.map((o) => o.id)).toEqual([])
  })
})

describe('tojeong shape', () => {
  it('normal input: ranges and 12 months', () => {
    const r = calculateTojeong(1985, 3, 14, 9, 30, 2026)
    expect(r.upper).toBeGreaterThanOrEqual(1); expect(r.upper).toBeLessThanOrEqual(8)
    expect(r.gwaNumber).toBeGreaterThanOrEqual(1); expect(r.gwaNumber).toBeLessThanOrEqual(144)
    expect(r.monthly).toHaveLength(12)
    expect(r.overallScore).toBeGreaterThanOrEqual(0); expect(r.overallScore).toBeLessThanOrEqual(100)
  })
  it('is deterministic', () => {
    expect(calculateTojeong(1985, 3, 14, 9, 30, 2027)).toEqual(calculateTojeong(1985, 3, 14, 9, 30, 2027))
  })
  it('invalid date throws', () => {
    expect(() => calculateTojeong(1985, 13, 40, 9, 30, 2026)).toThrow()
  })
})
