// Synthetic five-system bundles for site tests. Every graph kind is present with its explain text.
import type { SystemKey, SystemYear, YearlyBundle } from '../../src/yearly/types.ts'

const MONTHS = (seed: number) => Array.from({ length: 12 }, (_, i) => ({ month: i + 1, score: 30 + ((i * 17 + seed * 13) % 60) }))
const TEXT = (s: string) => `${s} 설명 문장입니다. 쉬운 말로 읽는 법을 적었습니다.`

export function makeSystemYear(system: SystemKey, year: number, seed: number): SystemYear {
  const base: SystemYear = {
    system, year, score: 50 + ((seed * 7) % 40), headline: `${year}년 ${system} 한 줄 요약`,
    facts: [{ label: '핵심', value: `값${seed}` }],
    bars: [{ label: '재물', score: 40 + seed }, { label: '직장', score: 55 }, { label: '연애', score: 62 }, { label: '건강', score: 71 }],
    explain: { bars: TEXT(`${system} 막대`) },
    narrative: [`${system} 첫째 문단입니다.`, `${system} 둘째 문단입니다.`],
    cautions: ['큰 계약은 서두르지 않기', `${system} 전용 주의`],
  }
  if (system === 'myeongri' || system === 'tojeong') {
    base.months = MONTHS(seed)
    base.explain.months = TEXT(`${system} 월별`)
  }
  if (system === 'ziwei') {
    base.palaces = Array.from({ length: 12 }, (_, i) => ({ name: `${i + 1}번궁`, marks: i % 3 === 0 ? ['化祿', '紫微'] : [], tone: (['good', 'bad', 'neutral'] as const)[i % 3] }))
    base.explain.palaces = TEXT('궁 지도')
  }
  if (system === 'astro') {
    base.aspects = [
      { label: '목성 ☌ 태양', tone: 'good', strength: 90 },
      { label: '토성 □ 달', tone: 'hard', strength: 60 },
      { label: '금성 ⚹ 수성', tone: 'neutral', strength: 30 },
    ]
    base.explain.aspects = TEXT('애스펙트')
  }
  if (system === 'juyeok') {
    base.hexagram = { lines: [7, 8, 9, 6, 7, 8], no: 14, name: '대유(大有)', changed: { no: 1, name: '건(乾)' } }
    base.explain.hexagram = TEXT('괘')
  }
  return base
}

const KEYS: SystemKey[] = ['myeongri', 'ziwei', 'astro', 'tojeong', 'juyeok']

export function makeBundles(baseYear = 2026): YearlyBundle[] {
  return [0, 1, 2].map((offset) => {
    const systems: YearlyBundle['systems'] = {}
    KEYS.forEach((k, i) => { systems[k] = makeSystemYear(k, baseYear + offset, i + offset * 2) })
    const scores = Object.values(systems).map((s) => s!.score)
    return { year: baseYear + offset, offset, systems, composite: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) }
  })
}
