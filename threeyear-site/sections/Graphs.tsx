// One graph per kind. `Graph` renders the graph and its explain text as adjacent siblings; no explain text means no graph.
import type { ReactNode } from 'react'
import type { AspectItem, HexagramDraw, PalaceCell } from '../../src/yearly/types.ts'
import { HBar, MonthBars } from '../charts.tsx'
import { bestWorst } from '../scale.ts'

export type GraphKind = 'bars' | 'months' | 'palaces' | 'aspects' | 'hexagram' | 'gauge'

export function Graph({ system, kind, explain, children }: { system: string; kind: GraphKind; explain?: string; children: ReactNode }) {
  if (!explain || !explain.trim()) return null
  return (
    <>
      <div data-testid={`graph-${system}-${kind}`} className="rounded-md border border-gray-400 bg-white p-1.5">{children}</div>
      <p data-testid={`explain-${system}-${kind}`} className="mt-1 text-base text-gray-900">{explain}</p>
    </>
  )
}

export function Bars({ items }: { items: { label: string; score: number }[] }) {
  return <div className="space-y-1.5">{items.map((b) => <HBar key={b.label} label={b.label} value={b.score} labelWidth="w-16" />)}</div>
}

export function Months({ months }: { months: { month: number; score: number }[] }) {
  const bw = bestWorst(months)
  if (!bw) return null
  return (
    <div className="space-y-1">
      <MonthBars months={months} best={bw.best.month} worst={bw.worst.month} />
      <p className="text-[13px] leading-snug text-gray-900"><b>▲ {bw.best.month}월 {bw.best.score}점</b> <b>▼ {bw.worst.month}월 {bw.worst.score}점</b></p>
    </div>
  )
}

const TONE_PALACE = {
  good: { box: 'border-teal-700 bg-teal-50', mark: '▲ 길' },
  bad: { box: 'border-rose-700 bg-rose-50 border-dashed', mark: '▼ 흉' },
  neutral: { box: 'border-gray-500 bg-gray-50', mark: '― 평' },
} as const

export function Palaces({ cells }: { cells: PalaceCell[] }) {
  return (
    <div className="grid grid-cols-4 gap-1">
      {cells.map((c, i) => (
        <div key={i} className={`min-w-0 rounded border-2 p-1 text-center text-gray-900 ${TONE_PALACE[c.tone].box}`}>
          <p className="text-sm font-bold leading-tight">{c.name}</p>
          <p className="text-[13px] leading-tight">{TONE_PALACE[c.tone].mark}</p>
          {c.marks.length > 0 && <p className="break-keep text-[13px] leading-tight">{c.marks.join(' ')}</p>}
        </div>
      ))}
    </div>
  )
}

const TONE_ASPECT = { good: '조화', hard: '긴장', neutral: '중립' } as const

export function Aspects({ items }: { items: AspectItem[] }) {
  return (
    <ul className="space-y-1.5">
      {items.map((a, i) => (
        <li key={i}>
          <p className="text-sm font-medium leading-snug text-gray-900">{a.label} <span className="text-[13px] font-bold">({TONE_ASPECT[a.tone]})</span></p>
          <HBar value={a.strength} />
        </li>
      ))}
    </ul>
  )
}

/** Six lines, bottom line first in data and at the bottom of the drawing. 6/9 are changing lines. */
export function Hexagram({ h }: { h: HexagramDraw }) {
  const W = 120, GAP = 14, H = 6 * GAP + 6
  const changing = h.lines.flatMap((l, i) => (l === 6 || l === 9 ? [`${i + 1}효`] : []))
  return (
    <div className="text-center">
      <svg viewBox={`0 0 ${W + 40} ${H}`} className="mx-auto block w-full max-w-[200px]" role="img" aria-label={`${h.no}괘 ${h.name}`}>
        {h.lines.map((l, i) => {
          const y = H - 8 - i * GAP
          const yang = l === 7 || l === 9
          const move = l === 6 || l === 9
          return (
            <g key={i} data-line={l}>
              {yang
                ? <rect x="20" y={y - 3} width={W} height="6" fill="#111827" />
                : <><rect x="20" y={y - 3} width={W * 0.44} height="6" fill="#111827" /><rect x={20 + W * 0.56} y={y - 3} width={W * 0.44} height="6" fill="#111827" /></>}
              {move && <text x={W + 30} y={y + 5} fontSize="16" fontWeight="700" fill="#b91c1c">{l === 9 ? '○' : '×'}</text>}
            </g>
          )
        })}
      </svg>
      <p className="text-sm font-bold text-gray-900">{h.no}괘 {h.name}{h.changed && <> → {h.changed.no}괘 {h.changed.name}</>}</p>
      <p className="text-[13px] text-gray-900">{changing.length ? `변하는 효: ${changing.join(', ')} (○ 양이 변함, × 음이 변함)` : '변하는 효 없음'}</p>
    </div>
  )
}

