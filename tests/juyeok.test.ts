import { describe, it, expect } from 'vitest'
import { castHexagram, seedFor, flipLines, hexagramNo, trigramIndex, LINE_PROB, type Line } from '../src/engine/juyeok.ts'
import { HEXAGRAMS } from '../src/data/hexagrams.ts'

// Independent King Wen table, rows = lower trigram, columns = upper trigram, order 건 태 리 진 손 감 간 곤.
const TABLE = [
  [1, 43, 14, 34, 9, 5, 26, 11], [10, 58, 38, 54, 61, 60, 41, 19], [13, 49, 30, 55, 37, 63, 22, 36], [25, 17, 21, 51, 42, 3, 27, 24],
  [44, 28, 50, 32, 57, 48, 18, 46], [6, 47, 64, 40, 59, 29, 4, 7], [33, 31, 56, 62, 53, 39, 52, 15], [12, 45, 35, 16, 20, 8, 23, 2],
]
const TRI: Line[][] = [[7, 7, 7], [7, 7, 8], [7, 8, 7], [7, 8, 8], [8, 7, 7], [8, 7, 8], [8, 8, 7], [8, 8, 8]]

describe('castHexagram', () => {
  it('line frequencies over 20000 seeds are within 1.5 points of 1/16, 5/16, 7/16, 3/16', () => {
    const n = { 6: 0, 7: 0, 8: 0, 9: 0 }
    for (let s = 0; s < 20000; s++) for (const v of castHexagram(s).lines) n[v]++
    for (const [v, p] of LINE_PROB) expect(Math.abs(n[v] / 120000 - p)).toBeLessThan(0.015)
  })
  it('hexagram numbers are 1..64 and changedNo exists only with changing lines', () => {
    for (let s = 0; s < 2000; s++) {
      const c = castHexagram(s)
      expect(c.lines).toHaveLength(6)
      expect(c.no).toBeGreaterThanOrEqual(1); expect(c.no).toBeLessThanOrEqual(64)
      expect(c.changedNo !== undefined).toBe(c.lines.some((v) => v === 6 || v === 9))
    }
  })
  it('every trigram pair maps to a unique number that matches the King Wen table and the data file', () => {
    const seen = new Set<number>()
    for (let u = 0; u < 8; u++) for (let l = 0; l < 8; l++) {
      expect(trigramIndex(TRI[u])).toBe(u)
      const no = hexagramNo([...TRI[l], ...TRI[u]])
      expect(no).toBe(TABLE[l][u])
      seen.add(no)
    }
    expect(seen.size).toBe(64)
    expect(new Set(HEXAGRAMS.map((h) => h.no)).size).toBe(64)
  })
  it('flips changing lines: 6 -> 7, 9 -> 8, others stay', () => {
    expect(flipLines([6, 7, 8, 9, 6, 9])).toEqual([7, 7, 8, 8, 7, 8])
    expect(hexagramNo([7, 7, 7, 7, 7, 7])).toBe(1)
    expect(hexagramNo([8, 8, 8, 8, 8, 8])).toBe(2)
    expect(hexagramNo(flipLines([9, 9, 9, 9, 9, 9]))).toBe(2)
    expect(hexagramNo(flipLines([6, 6, 6, 6, 6, 6]))).toBe(1)
  })
  it('changedNo equals the number of the flipped lines', () => {
    let checked = 0
    for (let s = 0; s < 500; s++) {
      const c = castHexagram(s)
      if (c.changedNo === undefined) continue
      // recompute lines from the same seed: lines are part of the result
      expect(c.changedNo).toBe(hexagramNo(flipLines(c.lines)))
      checked++
    }
    expect(checked).toBeGreaterThan(100)
  })
  it('is deterministic; seedFor depends on every argument', () => {
    expect(castHexagram(12345)).toEqual(castHexagram(12345))
    const base = seedFor(1985, 3, 14, 9, 2026)
    expect(seedFor(1985, 3, 14, 9, 2026)).toBe(base)
    for (const s of [seedFor(1986, 3, 14, 9, 2026), seedFor(1985, 4, 14, 9, 2026), seedFor(1985, 3, 15, 9, 2026), seedFor(1985, 3, 14, 10, 2026), seedFor(1985, 3, 14, 9, 2027)]) expect(s).not.toBe(base)
  })
})

import { josa } from '../src/data/juyeok-commentary.ts'
describe('josa', () => {
  it('picks the particle by final consonant', () => {
    expect(josa('우레', '이', '가')).toBe('가')
    expect(josa('못', '이', '가')).toBe('이')
    expect(josa('지뢰복', '으로', '로')).toBe('으로')
    expect(josa('풍뢰익', '으로', '로')).toBe('으로')
    expect(josa('천택리', '으로', '로')).toBe('로')
    expect(josa('곤위지', '으로', '로')).toBe('로')
    expect(josa('이효', '이', '가')).toBe('가')
  })
})
