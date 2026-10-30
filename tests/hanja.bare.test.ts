import { describe, expect, it, vi } from 'vitest'
import type { BirthInput } from '../src/engine/types.ts'

// Every hanja the 3-year result shows must have its Korean reading beside it: 한글(漢字), 한글(한글·漢字) or 한글(漢字·6).
const HANJA = /[㐀-鿿豈-﫿]+/g
export function bareHanja(text: string): string[] {
  const out: string[] = []
  for (const m of text.matchAll(HANJA)) {
    const before = text.slice(Math.max(0, m.index - 12), m.index)
    const after = text.slice(m.index + m[0].length, m.index + m[0].length + 3)
    const wrapped = (/[가-힣]\($/.test(before) && /^[)·]/.test(after)) || /\([가-힣]+·$/.test(before)
    if (!wrapped) out.push(`${before}[${m[0]}]${after}`)
  }
  return out
}

function strings(v: unknown, out: string[] = []): string[] {
  if (typeof v === 'string') out.push(v)
  else if (Array.isArray(v)) v.forEach((x) => strings(x, out))
  else if (v && typeof v === 'object') Object.values(v).forEach((x) => strings(x, out))
  return out
}

vi.setConfig({ testTimeout: 180000 })
const NOW = new Date('2026-10-30T12:00:00+09:00')

describe('bareHanja (the checker itself)', () => {
  it('accepts 한글(漢字) and the reading-beside forms', () => {
    expect(bareHanja('편재(偏財)와 노음(老陰·6), 땅(곤·坤)')).toEqual([])
  })
  it('flags hanja that stand alone, and an empty string is clean', () => {
    expect(bareHanja('화록 化祿')).toHaveLength(1)
    expect(bareHanja('(化祿)')).toHaveLength(1)
    expect(bareHanja('')).toEqual([])
  })
})

describe('result text has no bare hanja', () => {
  it('holds for 80 varied birth inputs across all five systems', async () => {
    const { computeAllYearly } = await import('../src/yearly/index.ts')
    let seed = 20261030
    const next = (n: number) => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed % n }
    const found = new Set<string>()
    for (let i = 0; i < 80; i++) {
      const input: BirthInput = {
        year: 1930 + next(90), month: 1 + next(12), day: 1 + next(28), hour: next(24), minute: next(60),
        gender: next(2) ? 'M' : 'F', timezone: 'Asia/Seoul', latitude: 37.5665, longitude: 126.978,
      }
      const bundles = await computeAllYearly(input, '우리', NOW)
      expect(bundles).not.toBeNull()
      for (const s of strings(bundles)) for (const f of bareHanja(s)) found.add(f)
    }
    expect([...found]).toEqual([])
  })
})
