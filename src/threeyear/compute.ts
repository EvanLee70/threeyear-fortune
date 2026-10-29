// 3개년운세 순수 계산 코어 — 단독 사이트가 쓴다.
// JSX·마크다운·DOM 없음. 날짜는 today 인자로만 받는다(기본값 new Date()). 전부 결정론.
import type { BirthInput } from '../engine/types.ts'
import { calculateAscendant } from '../engine/asc.ts'
import { sajuVendorFeed } from '../engine/pillars.ts'
import { calculateSaju } from '../vendor/fortuneteller/lib/saju.ts'
import { selectYongSin } from '../vendor/fortuneteller/lib/yong_sin.ts'
import { analyzeYearlyWolun } from '../vendor/fortuneteller/lib/wolun_analysis.ts'
import { getHeavenlyStemFromYear, getEarthlyBranchFromYear } from '../vendor/fortuneteller/lib/helpers.ts'
import { ZODIACS, determineZodiac } from '../starsign/index.ts'
import {
  tenGodOf, samjaeOf, seededSeq, OFFSET_LABEL, THEME_RANK,
  overallNarrative, themeNarrative, cautionNarrative, type YearCtx,
} from './core.ts'

export type ZodiacDef = (typeof ZODIACS)[number]
export type ThemeField = (typeof THEME_RANK)[number]['field']

export interface ThemeResult {
  rank: number
  key: string
  emoji: string
  desc: string
  field: ThemeField
  score: number
  narrative: string
}

export interface ZodiacResult {
  def: ZodiacDef
  /** true = ASC(상승궁) 기준, false = 태양궁 폴백 */
  isAsc: boolean
  score: number
  peak: number
  low: number
}

export interface YearBase {
  offset: number
  label: string
  targetYear: number
  yearStem: string
  yearBranch: string
  tenGod: string
  samjae: string | null
  overall: number
  overallNarrative: string
  themes: ThemeResult[]
  months: ReturnType<typeof analyzeYearlyWolun>
  caution: ReturnType<typeof cautionNarrative>
}

export interface YearResult extends YearBase {
  zodiac: ZodiacResult
}

export interface ThreeYearResult {
  baseYear: number
  years: YearResult[]
}

/** 입력 → 사주·용신. 계산 실패(잘못된 날짜 등)면 null. */
export function prepare(input: BirthInput) {
  try {
    // The vendor engine reads the clock as KST. Feed it the pillar table's clock and exact offset (see sajuVendorFeed).
    const { wall, offsetMin } = sajuVendorFeed(input)
    const [birthDate, birthTime] = wall.split('T')
    const saju = calculateSaju(birthDate, birthTime, 'solar', false, input.gender === 'M' ? 'male' : 'female', `오프셋:${offsetMin}`)
    return { saju, yong: selectYongSin(saju) }
  } catch { return null }
}

/**
 * 한 해(offset 0=올해·1=내년·2=내후년)의 사주 부분(별자리 제외). 동기 계산.
 * 사주 계산 실패·월운이 비면 null.
 * 결정론 계산(난수 없음). 화면은 이 결과를 메모이즈해서 쓴다(ASC 가 늦게 도착해도 다시 계산하지 않게 별자리와 분리).
 */
export function computeYearBase(input: BirthInput, name: string, offset: number, today: Date = new Date()): YearBase | null {
  const p = prepare(input)
  if (!p) return null
  const { saju, yong } = p
  const targetYear = today.getFullYear() + offset
  const months = analyzeYearlyWolun(saju, targetYear)
  if (months.length === 0) return null

  const yearStem = getHeavenlyStemFromYear(targetYear)
  const yearBranch = getEarthlyBranchFromYear(targetYear)
  const ctx: YearCtx = {
    name, targetYear, yearLabel: OFFSET_LABEL[offset],
    yearStem, yearBranch, dayStem: saju.day.stem, birthBranch: saju.year.branch,
    tenGod: tenGodOf(saju.day.stem, yearStem),
    samjae: samjaeOf(saju.year.branch, yearBranch),
    strengthLevel: saju.dayMasterStrength?.level ?? 'medium',
    yongPrimary: yong?.primaryYongSin ?? null,
    yongSecondary: yong?.secondaryYongSin ?? null,
    xiSin: yong?.xiSin ?? [],
    jiSin: yong?.jiSin ?? [],
    months,
  }
  return {
    offset, label: OFFSET_LABEL[offset], targetYear, yearStem, yearBranch,
    tenGod: ctx.tenGod, samjae: ctx.samjae,
    overall: Math.round(months.reduce((a, m) => a + m.fortune.score, 0) / months.length),
    overallNarrative: overallNarrative(ctx),
    themes: THEME_RANK.map((t) => ({
      rank: t.rank, key: t.key, emoji: t.emoji, desc: t.desc, field: t.field,
      score: Math.round(months.reduce((a, m) => a + m.fortune[t.field], 0) / months.length),
      narrative: themeNarrative(ctx, t.field, t.key),
    })),
    months,
    caution: cautionNarrative(ctx),
  }
}

/**
 * ASC 별자리 연운 (결정론 시드). ascSign: natal ASC 영문 별자리명, 없으면 null → 태양궁 폴백.
 */
export function computeZodiac(input: BirthInput, targetYear: number, ascSign: string | null): ZodiacResult {
  const ascDef = ascSign ? ZODIACS.find((z) => z.key === ascSign.toUpperCase()) ?? null : null
  const def = ascDef ?? determineZodiac(input.month, input.day).def
  const zOrdinal = ZODIACS.findIndex((z) => z.key === def.key)
  const zRand = seededSeq(zOrdinal * 97 + targetYear * 131)
  const score = 45 + Math.floor(zRand() * 41)
  const peak = 1 + Math.floor(zRand() * 12)
  const low = 1 + ((peak - 1 + 5 + Math.floor(zRand() * 3)) % 12)
  return { def, isAsc: !!ascDef, score, peak, low }
}

/** 한 해 전체 결과 = 사주 부분 + 별자리. 사주 계산 실패면 null. */
export function computeYear(input: BirthInput, name: string, offset: number, ascSign: string | null, today: Date = new Date()): YearResult | null {
  const base = computeYearBase(input, name, offset, today)
  return base && { ...base, zodiac: computeZodiac(input, base.targetYear, ascSign) }
}

/** 출생 데이터로 ASC 영문 별자리명을 구한다. 시각 미상·계산 실패면 null. */
export function ascSignOf(input: BirthInput): string | null {
  if (input.unknownTime) return null
  try { return calculateAscendant(input)?.sign ?? null } catch { return null }
}

/** 올해·내년·내후년 3개년 결과. 사주 계산이 실패하면 null. */
export async function computeThreeYear(input: BirthInput, name: string, today: Date = new Date()): Promise<ThreeYearResult | null> {
  const ascSign = ascSignOf(input)
  const years: YearResult[] = []
  for (let offset = 0; offset < 3; offset++) {
    const y = computeYear(input, name, offset, ascSign, today)
    if (!y) return null
    years.push(y)
  }
  return { baseYear: today.getFullYear(), years }
}
