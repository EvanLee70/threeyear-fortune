// Juyeok (I Ching) casting engine. Own work, from public mathematics only.
// Yarrow-stalk line odds: old yin 6 = 1/16, young yang 7 = 5/16, young yin 8 = 7/16, old yang 9 = 3/16.
// A line 6 or 9 is "changing" and flips (6 -> 7, 9 -> 8) to give the changed hexagram.
import { HEXAGRAMS } from '../data/hexagrams.ts'

export type Line = 6 | 7 | 8 | 9

/** [value, probability] in cumulative order for inverse-CDF sampling */
export const LINE_PROB: readonly [Line, number][] = [[6, 1 / 16], [7, 5 / 16], [8, 7 / 16], [9, 3 / 16]]

export const isYang = (v: Line): boolean => v === 7 || v === 9
export const isChanging = (v: Line): boolean => v === 6 || v === 9

/** mulberry32: small deterministic PRNG, returns floats in [0, 1) */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Stable seed from birth year/month/day/hour and the target year (integer hash, same input -> same seed) */
export function seedFor(year: number, month: number, day: number, hour: number, targetYear: number): number {
  let h = 0x9e3779b9
  for (const v of [year, month, day, hour, targetYear]) {
    h = Math.imul(h ^ (v | 0), 0x85ebca6b)
    h ^= h >>> 13
    h = Math.imul(h, 0xc2b2ae35)
    h ^= h >>> 16
  }
  return h >>> 0
}

/** Trigram symbols in the order 111,110,101,100,011,010,001,000 (lines bottom first; 1 = yang) */
export const TRIGRAM_SYMBOLS = ['☰', '☱', '☲', '☳', '☴', '☵', '☶', '☷']
const TRIGRAM_KEYS = ['111', '110', '101', '100', '011', '010', '001', '000']

/** Trigram index 0..7 of three lines (bottom first) */
export function trigramIndex(three: readonly Line[]): number {
  return TRIGRAM_KEYS.indexOf(three.map((v) => (isYang(v) ? '1' : '0')).join(''))
}

// King Wen number by (lower, upper) trigram index, built from the symbol data (symbol = upper + lower).
const KING_WEN = new Map<string, number>()
for (const h of HEXAGRAMS) {
  const [upper, lower] = [...h.symbol]
  KING_WEN.set(`${TRIGRAM_SYMBOLS.indexOf(lower)}${TRIGRAM_SYMBOLS.indexOf(upper)}`, h.no)
}
if (KING_WEN.size !== 64) throw new Error('hexagram data does not cover all 64 trigram pairs')

/** King Wen number 1..64 of six lines (bottom first) */
export function hexagramNo(lines: readonly Line[]): number {
  return KING_WEN.get(`${trigramIndex(lines.slice(0, 3))}${trigramIndex(lines.slice(3))}`)!
}

/** Lines after the change: 6 -> 7 and 9 -> 8, other lines stay */
export const flipLines = (lines: readonly Line[]): Line[] => lines.map((v) => (v === 6 ? 7 : v === 9 ? 8 : v))

/** Same seed gives the same cast. Lines are bottom first. `changedNo` exists only when a line is changing. */
export function castHexagram(seed: number): { lines: Line[]; no: number; changedNo?: number } {
  const rand = mulberry32(seed)
  const lines: Line[] = []
  for (let i = 0; i < 6; i++) {
    const u = rand()
    let acc = 0
    let v: Line = 9
    for (const [value, p] of LINE_PROB) {
      acc += p
      if (u < acc) { v = value; break }
    }
    lines.push(v)
  }
  const no = hexagramNo(lines)
  return lines.some(isChanging) ? { lines, no, changedNo: hexagramNo(flipLines(lines)) } : { lines, no }
}
