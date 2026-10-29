// Maps the existing saju three-year result to the common SystemYear contract. Own work.
import type { ThreeYearResult, YearResult } from '../threeyear/compute.ts'
import { scoreBandLabel } from '../threeyear/core.ts'
import type { SystemYear } from './types.ts'

const THEME_LABEL = { wealth: '재물', career: '직장', relationship: '연애', health: '건강' } as const

const EXPLAIN_BARS = '네 개의 막대는 재물·직장·연애·건강을 열두 달 평균 점수로 보여 줍니다. 막대가 길수록(100점에 가까울수록) 그 분야가 순탄하다고 읽고, 짧은 분야는 서두르지 말고 조심해서 다루세요.'
const EXPLAIN_MONTHS = '1월부터 12월까지 달마다 기운의 세기를 세운 막대입니다. 높은 달은 일을 벌이기 좋고, 낮은 달은 큰 결정을 앞뒤 달로 미루는 편이 안전합니다. 굵은 테두리가 가장 좋은 달, 점선 테두리가 가장 조심할 달입니다.'

function one(y: YearResult): SystemYear {
  const months = y.months.map((m) => ({ month: m.month, score: m.fortune.score }))
  let best = months[0], worst = months[0]
  for (const m of months) {
    if (m.score > best.score) best = m
    if (m.score < worst.score) worst = m
  }
  const flow = `${y.yearStem}${y.yearBranch}년 세운(歲運)의 흐름은 ${scoreBandLabel(y.overall)}(${y.overall}점)입니다.`
  const headline = best ? `${flow} ${best.month}월이 가장 좋고 ${worst.month}월은 조심할 달입니다.` : flow

  const facts = [{ label: '세운', value: `${y.yearStem}${y.yearBranch}` }, { label: '십신(十神)', value: y.tenGod }]
  if (y.samjae) facts.push({ label: '삼재(三災)', value: y.samjae })

  // 2..5 paragraphs: overall + four themes = 5
  const narrative = [y.overallNarrative, ...y.themes.map((t) => t.narrative)].filter(Boolean).slice(0, 5)
  const cautions = [y.caution.intro, y.caution.worstLine, ...y.caution.donts].filter((s): s is string => !!s).slice(0, 5)

  return {
    system: 'myeongri',
    year: y.targetYear,
    score: y.overall,
    headline,
    facts,
    bars: y.themes.map((t) => ({ label: THEME_LABEL[t.field], score: t.score })),
    ...(months.length ? { months } : {}),
    explain: { bars: EXPLAIN_BARS, ...(months.length ? { months: EXPLAIN_MONTHS } : {}) },
    narrative,
    cautions,
  }
}

export function myeongriYearly(result: ThreeYearResult): SystemYear[] {
  return result.years.map(one)
}
