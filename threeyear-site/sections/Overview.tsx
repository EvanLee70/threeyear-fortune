// Composite gauge + one small bar per system + one sentence, for one year.
import type { SystemKey, YearlyBundle } from '../../src/yearly/types.ts'
import { scoreBandLabel } from '../../src/threeyear/core.ts'
import { Gauge } from '../charts.tsx'
import { Bars, Graph } from './Graphs.tsx'

const SHORT: Record<SystemKey, string> = { myeongri: '명리', ziwei: '자미두수', astro: '점성술', tojeong: '토정비결', juyeok: '주역' }
const ORDER = Object.keys(SHORT) as SystemKey[]

function summarySentence(b: YearlyBundle): string {
  const list = ORDER.flatMap((k) => (b.systems[k] ? [{ k, score: b.systems[k]!.score }] : []))
  const head = `${b.year}년은 평균 ${b.composite}점으로 ${scoreBandLabel(b.composite)} 흐름입니다`
  if (list.length < 2) return `${head}.`
  const hi = list.reduce((a, c) => (c.score > a.score ? c : a))
  const lo = list.reduce((a, c) => (c.score < a.score ? c : a))
  return `${head} — 가장 좋게 본 곳은 ${SHORT[hi.k]}(${hi.score}점), 가장 조심스럽게 본 곳은 ${SHORT[lo.k]}(${lo.score}점)입니다.`
}

export default function OverviewCell({ bundle }: { bundle: YearlyBundle }) {
  const items = ORDER.flatMap((k) => (bundle.systems[k] ? [{ label: SHORT[k], score: bundle.systems[k]!.score }] : []))
  return (
    <div className="space-y-2">
      <p className="text-base font-bold text-gray-900">{summarySentence(bundle)}</p>
      <Graph system="overview" kind="gauge" explain="반원이 많이 찰수록, 가운데 숫자가 100에 가까울수록 다섯 체계가 평균으로 본 그해가 순탄하다는 뜻입니다.">
        <Gauge value={bundle.composite} />
      </Graph>
      {items.length > 0 && (
        <Graph system="overview" kind="bars" explain="체계마다 점수를 따로 보여 줍니다. 막대 길이가 비슷하면 여러 체계가 같은 결론을 낸 것이고, 크게 다르면 보는 관점에 따라 해석이 갈린다는 뜻입니다.">
          <Bars items={items} />
        </Graph>
      )}
    </div>
  )
}
