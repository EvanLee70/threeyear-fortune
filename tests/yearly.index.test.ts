import { describe, expect, it, vi } from 'vitest'
import type { BirthInput } from '../src/engine/types.ts'
import { SYSTEM_TITLE, type SystemKey } from '../src/yearly/types.ts'

const NOW = new Date('2026-10-30T12:00:00+09:00')
const input: BirthInput = { year: 1985, month: 3, day: 14, hour: 9, minute: 30, gender: 'M', timezone: 'Asia/Seoul', latitude: 37.5665, longitude: 126.978 }

vi.setConfig({ testTimeout: 30000 })

describe('computeAllYearly', () => {
  it('normal input: three bundles with all five systems and a composite equal to the rounded mean', async () => {
    const { computeAllYearly } = await import('../src/yearly/index.ts')
    const r = await computeAllYearly(input, '우리', NOW)
    expect(r).not.toBeNull()
    expect(r!.map((b) => b.year)).toEqual([2026, 2027, 2028])
    for (const b of r!) {
      expect(Object.keys(b.systems).sort()).toEqual(Object.keys(SYSTEM_TITLE).sort())
      const scores = (Object.keys(b.systems) as SystemKey[]).map((k) => b.systems[k]!.score)
      expect(scores.every((s) => s >= 0 && s <= 100)).toBe(true)
      expect(b.composite).toBe(Math.round(scores.reduce((a, c) => a + c, 0) / scores.length))
      for (const s of Object.values(b.systems)) {
        // every graph that is present has its explanation
        if (s!.bars) expect(s!.explain.bars).toBeTruthy()
        if (s!.months) expect(s!.explain.months).toBeTruthy()
        if (s!.palaces) expect(s!.explain.palaces).toBeTruthy()
        if (s!.aspects) expect(s!.explain.aspects).toBeTruthy()
        if (s!.hexagram) expect(s!.explain.hexagram).toBeTruthy()
        expect(s!.narrative.length).toBeGreaterThanOrEqual(2)
      }
    }
  }, 30000) // first call loads the large chart tables

  it('is deterministic', async () => {
    const { computeAllYearly } = await import('../src/yearly/index.ts')
    expect(await computeAllYearly(input, '우리', NOW)).toEqual(await computeAllYearly(input, '우리', NOW))
  })

  it('empty and invalid input give null', async () => {
    const { computeAllYearly } = await import('../src/yearly/index.ts')
    expect(await computeAllYearly({} as BirthInput, '우리', NOW)).toBeNull()
    expect(await computeAllYearly({ ...input, month: 13 }, '우리', NOW)).toBeNull()
  })

  it('a crashing system is left out and the others still work', async () => {
    vi.resetModules()
    vi.doMock('../src/yearly/astro.ts', () => ({ computeAstroYearly: () => { throw new Error('boom') } }))
    const { computeAllYearly } = await import('../src/yearly/index.ts')
    const r = await computeAllYearly(input, '우리', NOW)
    vi.doUnmock('../src/yearly/astro.ts')
    expect(r![0].systems.astro).toBeUndefined()
    expect(Object.keys(r![0].systems).sort()).toEqual(['juyeok', 'myeongri', 'tojeong', 'ziwei'])
  })

  it('unknown birth time still works', async () => {
    const { computeAllYearly } = await import('../src/yearly/index.ts')
    const r = await computeAllYearly({ ...input, hour: 12, minute: 0, unknownTime: true }, '우리', NOW)
    expect(r).not.toBeNull()
    expect(Object.keys(r![0].systems).length).toBeGreaterThanOrEqual(4)
  })
})
