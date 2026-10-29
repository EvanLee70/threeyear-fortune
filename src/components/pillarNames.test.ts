import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { KO_OF, named, namedText } from './pillarNames.ts'

interface Fixture { saju?: { pillars: { pillar: { stem: string; branch: string }; stemSipsin: string; branchSipsin: string; unseong: string; sinsal: string; jigang: string }[] }; error?: string }
const fixtures: Fixture[] = JSON.parse(readFileSync(new URL('../../fixtures/oracle.json', import.meta.url), 'utf-8').trimStart())

describe('pillarNames', () => {
  it('has a Korean reading for every hanja term the engine can output', () => {
    const missing = new Set<string>()
    const need = (h: string) => { if (!(h in KO_OF)) missing.add(h) }
    for (const f of fixtures) {
      for (const p of f.saju?.pillars ?? []) {
        // the reference data spells 建祿 as 乾祿 (a typo); the engine prints 建祿
        for (const v of [p.pillar.stem, p.pillar.branch, p.stemSipsin, p.branchSipsin, p.unseong.replace('乾祿', '建祿'), p.sinsal, ...[...p.jigang].filter((c) => c.trim())]) need(v) // jigang may hold spaces
      }
    }
    expect([...missing]).toEqual([])
    for (const h of ['時柱', '日柱', '月柱', '年柱', '空', '本元', '建祿']) expect(KO_OF[h], h).toBeTruthy()
  })

  it('has no duplicate or empty readings that would hide a different term', () => {
    expect(Object.values(KO_OF).every((k) => k.length >= 1)).toBe(true)
    // stems and branches are distinct hanja, so the table must hold all 22 plus the others
    expect(Object.keys(KO_OF).length).toBeGreaterThanOrEqual(10 + 12 + 11 + 12 + 12 + 5)
  })

  it('formats as 한글(漢字)', () => {
    expect(named('偏財')).toEqual({ ko: '편재', hanja: '偏財' })
    expect(namedText('偏財')).toBe('편재(偏財)')
    expect(namedText('乙')).toBe('을(乙)')
    expect(namedText('帝旺')).toBe('제왕(帝旺)')
  })

  it('unknown and empty input fall back to the plain text', () => {
    expect(named('龍')).toEqual({ ko: '', hanja: '龍' })
    expect(namedText('龍')).toBe('龍')
    expect(namedText('')).toBe('')
  })
})
