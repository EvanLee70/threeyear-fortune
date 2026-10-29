// Tojeongbigyeol yearly reading: wraps src/engine/tojeong.ts into the SystemYear contract. For fun and reference only.
import type { BirthInput } from '../engine/types.ts'
import type { SystemYear } from './types.ts'
import { calculateTojeong } from '../engine/tojeong.ts'
import { validBirth } from './juyeok.ts'

export function computeTojeongYearly(input: BirthInput, years: number[]): SystemYear[] | null {
  if (!validBirth(input) || !years.every(Number.isInteger)) return null
  const [hour, minute] = input.unknownTime ? [12, 0] : [input.hour, input.minute]
  try {
    return years.map((year) => {
      const r = calculateTojeong(input.year, input.month, input.day, hour, minute, year)
      const upperText = r.summary.replace(/^[^:]+: /, '')
      const middleLower = r.detailedFortune.startsWith(upperText) ? r.detailedFortune.slice(upperText.length).trim() : r.detailedFortune
      const cautionMonths = r.monthly.filter((m) => m.score < 50)
      const best = r.monthly.reduce((a, b) => (b.score > a.score ? b : a))
      const worst = r.monthly.reduce((a, b) => (b.score < a.score ? b : a))
      return {
        system: 'tojeong', year, score: r.overallScore,
        headline: `${r.gwaName} — ${upperText}`,
        facts: [
          { label: '상괘·중괘·하괘', value: `${r.upper}·${r.middle}·${r.lower}` },
          { label: '괘 번호', value: `${r.gwaNumber}번 (144괘 중)` },
          { label: '괘 이름', value: r.gwaName },
          { label: '상괘 상징', value: r.gwaSymbol },
        ],
        months: r.monthly.map((m) => ({ month: m.month, score: m.score })),
        explain: {
          months: `달마다 그 해의 괘 점수(${r.overallScore}점)에 '그 달의 기운과 상괘 기운의 어울림'을 더하거나 뺀 값입니다. 이 해에는 ${best.month}월(${best.score}점)이 가장 높고 ${worst.month}월(${worst.score}점)이 가장 낮습니다. 막대가 길수록 수월한 달입니다.`,
        },
        narrative: [
          r.summary,
          middleLower,
          r.advice.replace(/^올해/, `${year}년`),
          `길한 달: ${r.luckyMonths}. 조심할 달: ${r.cautionMonths}.`,
          '재미와 참고를 위한 풀이입니다. 중요한 결정은 이 풀이로 정하지 말고 전문가와 상의하세요.',
        ],
        cautions: cautionMonths.slice(0, 5).map((m) => `${m.month}월(${m.score}점): 평소보다 말과 일정을 신중하게 다루기`),
      } satisfies SystemYear
    })
  } catch {
    return null
  }
}
