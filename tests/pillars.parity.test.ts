import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { calculatePillarTable } from '../src/engine/pillars.ts'
import type { BirthInput, PillarTableData } from '../src/engine/types.ts'

interface Fixture {
  id: number
  input: BirthInput
  saju?: PillarTableData
  error?: string
}

const fixtures: Fixture[] = JSON.parse(readFileSync(new URL('../fixtures/oracle.json', import.meta.url), 'utf-8').trimStart())
// The reference outputs spell the 建祿 life stage as '乾祿' (a typo). The engine prints the correct hanja.
const fixTypo = (d: PillarTableData): PillarTableData => JSON.parse(JSON.stringify(d).replaceAll('乾祿', '建祿'))
const ok = fixtures.filter((f) => !f.error && f.saju)

/** First differing path between two plain values, or null when equal. */
function firstDiff(a: unknown, b: unknown, path = ''): string | null {
  if (a === b) return null
  if (typeof a === 'object' && typeof b === 'object' && a && b) {
    for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) {
      const d = firstDiff((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k], `${path}.${k}`)
      if (d) return d
    }
    return null
  }
  return `${path}: got ${JSON.stringify(a)} expected ${JSON.stringify(b)}`
}

const base: BirthInput = { year: 1985, month: 3, day: 14, hour: 9, minute: 30, gender: 'M', timezone: 'Asia/Seoul' }

describe('calculatePillarTable oracle parity', () => {
  it(`matches all ${ok.length} fixtures`, () => {
    const fails: string[] = []
    for (const f of ok) {
      let diff: string | null
      try {
        diff = firstDiff(calculatePillarTable(f.input), fixTypo(f.saju!))
      } catch (e) {
        diff = `threw ${(e as Error).message}`
      }
      if (diff) fails.push(`id ${f.id} ${JSON.stringify(f.input)} -> ${diff}`)
    }
    if (fails.length) console.log(`${fails.length}/${ok.length} mismatches\n` + fails.slice(0, 20).join('\n'))
    expect(fails.length).toBe(0)
  })

  it('throws on the fixture whose local time falls in a daylight-time gap', () => {
    for (const f of fixtures.filter((x) => x.error)) expect(() => calculatePillarTable(f.input)).toThrow()
  })
})

describe('calculatePillarTable cases', () => {
  it('normal: 1985-03-14 09:30 Seoul has hour pillar 乙巳', () => {
    const t = calculatePillarTable(base)
    expect(t.pillars[0].pillar.ganzi).toBe('乙巳')
    expect(t.pillars).toHaveLength(4)
    expect(t.pillars[1].stemSipsin).toBe('本元')
  })

  it('empty/invalid: impossible dates and times throw', () => {
    expect(() => calculatePillarTable({ ...base, month: 2, day: 30 })).toThrow()
    expect(() => calculatePillarTable({ ...base, month: 0 })).toThrow()
    expect(() => calculatePillarTable({ ...base, hour: 24 })).toThrow()
    expect(() => calculatePillarTable({} as BirthInput)).toThrow()
  })

  it('unknown time uses 12:00 (午 hour)', () => {
    expect(calculatePillarTable({ ...base, hour: 0, minute: 0, unknownTime: true }).pillars[0].pillar.branch).toBe('午')
  })

  it('unusual: 1988-05-08 Seoul during Korean daylight time is computed from KST (-1h)', () => {
    // 1988-05-08 12:30 wall clock is 11:30 standard time -> 午 hour (11:00-13:00 is 午); 10:30 wall -> 09:30 standard -> 巳
    const t = calculatePillarTable({ ...base, year: 1988, month: 5, day: 8, hour: 10, minute: 30 })
    expect(t.pillars[0].pillar.branch).toBe('巳')
  })
})
