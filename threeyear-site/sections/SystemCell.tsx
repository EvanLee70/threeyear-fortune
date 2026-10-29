// One system in one year: headline, fact chips, graphs (each with its explain text), narrative, cautions.
import type { SystemYear } from '../../src/yearly/types.ts'
import { Chip } from '../charts.tsx'
import { Aspects, Bars, Graph, Hexagram, Months, Palaces } from './Graphs.tsx'

export function CautionList({ items }: { items: string[] }) {
  if (!items.length) return null
  return (
    <div>
      <p className="text-base font-bold text-rose-900">⚠ 조심할 점</p>
      <ul className="list-disc space-y-1 pl-5 text-base text-gray-900">{items.map((c) => <li key={c}>{c}</li>)}</ul>
    </div>
  )
}

export default function SystemCell({ data }: { data: SystemYear | undefined }) {
  if (!data) return <p className="text-base text-gray-900">이 체계는 이번 입력으로 계산하지 못했습니다.</p>
  const s = data.system, e = data.explain
  return (
    <div className="space-y-2">
      <p className="text-base font-bold text-gray-900">{data.headline}</p>
      <div className="flex flex-wrap gap-1">
        <Chip tone="teal">점수 {data.score}점</Chip>
        {data.facts.map((f) => <Chip key={f.label}>{f.label} {f.value}</Chip>)}
      </div>
      {data.bars && <Graph system={s} kind="bars" explain={e.bars}><Bars items={data.bars} /></Graph>}
      {data.months && <Graph system={s} kind="months" explain={e.months}><Months months={data.months} /></Graph>}
      {data.palaces && <Graph system={s} kind="palaces" explain={e.palaces}><Palaces cells={data.palaces} /></Graph>}
      {data.aspects && <Graph system={s} kind="aspects" explain={e.aspects}><Aspects items={data.aspects} /></Graph>}
      {data.hexagram && <Graph system={s} kind="hexagram" explain={e.hexagram}><Hexagram h={data.hexagram} /></Graph>}
      {data.narrative.map((p, i) => <p key={i} className="text-base text-gray-900">{p}</p>)}
      <CautionList items={data.cautions} />
    </div>
  )
}
