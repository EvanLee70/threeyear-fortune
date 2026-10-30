// Contract of the five-system yearly fortune. Own work. Every system returns one SystemYear per target year.
// All strings are Korean text for display. Calculation is deterministic (no randomness, no clock reads except the `years` argument).

export type SystemKey = 'myeongri' | 'ziwei' | 'astro' | 'tojeong' | 'juyeok'

export const SYSTEM_TITLE: Record<SystemKey, string> = {
  myeongri: '명리(命理)',
  ziwei: '자미두수(紫微斗數)',
  astro: '점성술(占星術)',
  tojeong: '토정비결(土亭秘訣)',
  juyeok: '주역(周易)',
}

/** One horizontal bar: label + score 0..100 */
export interface BarItem { label: string; score: number }

/** One of the 12 palaces of a Zi Wei chart, in fixed order starting from the year's life palace (index 0) */
export interface PalaceCell {
  /** palace name, e.g. '재백궁' */
  name: string
  /** short marks to show inside the cell, e.g. ['화록(化祿)', '자미'] */
  marks: string[]
  tone: 'good' | 'bad' | 'neutral'
}

/** One astrological aspect between a transiting and a natal point */
export interface AspectItem {
  /** e.g. '목성 ☌ 태양' */
  label: string
  tone: 'good' | 'hard' | 'neutral'
  /** 0..100, 100 = exact */
  strength: number
}

/** A hexagram drawn as six lines, bottom line first. 6 = old yin (changing), 7 = young yang, 8 = young yin, 9 = old yang (changing) */
export interface HexagramDraw {
  lines: (6 | 7 | 8 | 9)[]
  no: number
  name: string
  /** present only when a line is changing */
  changed?: { no: number; name: string }
}

/** Plain-language explanation of each graph, shown right below it. Every graph present MUST have its text. */
export interface GraphExplain {
  bars?: string
  months?: string
  palaces?: string
  aspects?: string
  hexagram?: string
}

export interface SystemYear {
  system: SystemKey
  year: number
  /** 0..100, higher = smoother year. Rule-based and explained in `headline`/`narrative`. */
  score: number
  /** one line that says the main point of this year in this system */
  headline: string
  /** key facts shown as small chips, e.g. { label: '유년 명궁', value: '천이궁' } */
  facts: { label: string; value: string }[]
  /** horizontal bars (themes, sub-scores, ...) */
  bars?: BarItem[]
  /** 12 monthly scores, January..December */
  months?: { month: number; score: number }[]
  palaces?: PalaceCell[]
  aspects?: AspectItem[]
  hexagram?: HexagramDraw
  explain: GraphExplain
  /** 2..5 short paragraphs, plain Korean. Professional terms as 한글(漢字) where natural. */
  narrative: string[]
  /** short things to watch, 0..5 items */
  cautions: string[]
}

export interface YearlyBundle {
  year: number
  /** 0 = this year, 1 = next year, 2 = year after */
  offset: number
  systems: Partial<Record<SystemKey, SystemYear>>
  /** simple mean of the available system scores, rounded */
  composite: number
}

/** Signature every system module exports as `compute<System>Yearly`. Returns null when the input cannot be calculated. */
export type YearlyComputer = (input: import('../engine/types.ts').BirthInput, years: number[]) => SystemYear[] | null
