// 올해 / 내년 / 내후년 나란히 비교 — 항상 3열(폰에서도). 섹션마다 제목 줄 + 3칸 grid 한 줄이라
// 같은 종류의 내용이 세 열에서 같은 높이에 놓인다. 긴 문장은 쓰지 않고 숫자·배지·차트만 쓴다.
import type { ReactNode } from 'react'
import type { YearResult } from '../src/threeyear/compute.ts'
import { Chip, Gauge, HBar, MonthBars } from './charts.tsx'
import { bestWorst } from './scale.ts'

const THEME_LABEL = { wealth: '재물', career: '직장', relationship: '연애', health: '건강' } as const
const ROW = 'grid grid-cols-3 gap-1.5'
const CELL = 'min-w-0 rounded-lg border border-gray-400 bg-white p-1.5'

interface Section { key: string; title: string; render: (y: YearResult) => ReactNode }

const SECTIONS: Section[] = [
  {
    key: 'sewoon', title: '세운',
    render: (y) => (
      <div className="space-y-1 text-center">
        <p className="text-xl font-bold leading-tight text-gray-900">{y.yearStem}{y.yearBranch}</p>
        <div className="flex flex-wrap justify-center gap-1">
          <Chip tone="indigo">{y.tenGod}</Chip>
          {y.samjae && <Chip tone="rose">⚠ {y.samjae}</Chip>}
        </div>
      </div>
    ),
  },
  { key: 'overall', title: '종합운', render: (y) => <Gauge value={y.overall} /> },
  {
    key: 'themes', title: '주제별',
    render: (y) => (
      <div className="space-y-1.5">
        {y.themes.map((t) => <HBar key={t.field} label={THEME_LABEL[t.field]} value={t.score} labelWidth="w-7" />)}
      </div>
    ),
  },
  {
    key: 'zodiac', title: '별자리 연운',
    render: (y) => (
      <div className="space-y-1">
        <p className="flex items-center justify-center gap-1 text-[13px] font-medium text-gray-900">
          <span className="text-xl leading-none" aria-hidden="true">{y.zodiac.def.symbol}</span>
          {y.zodiac.def.ko}
        </p>
        <HBar value={y.zodiac.score} />
        <p className="text-center text-[13px] text-gray-800">{y.zodiac.isAsc ? 'ASC 기준' : '태양궁 기준'}</p>
      </div>
    ),
  },
  {
    key: 'months', title: '월별 흐름',
    render: (y) => {
      const { best, worst } = bestWorst(y.months)
      return (
        <div className="space-y-1">
          <MonthBars months={y.months.map((m) => ({ month: m.month, score: m.fortune.score }))} best={best.month} worst={worst.month} />
          <p className="text-[13px] leading-snug text-gray-900">
            <b>▲ {best.month}월 {best.fortune.score}</b> <b>▼ {worst.month}월 {worst.fortune.score}</b>
          </p>
        </div>
      )
    },
  },
  {
    key: 'cautions', title: '조심할 점',
    render: (y) => (
      <div className="flex flex-wrap gap-1">
        <Chip tone="rose">조심 달 {bestWorst(y.months).worst.month}월</Chip>
        {y.caution.donts.map((d) => <Chip key={d}>{d}</Chip>)}
      </div>
    ),
  },
]

export default function Compare({ years }: { years: YearResult[] }) {
  return (
    <div className="overflow-x-auto">
      <div className="min-w-[340px] space-y-3" data-testid="compare">
        <div className={ROW} role="row">
          {years.map((y) => (
            <p key={y.offset} role="columnheader" className="rounded-lg bg-teal-700 px-1 py-1.5 text-center text-base font-bold leading-tight text-white">
              {y.label}<br /><span className="text-[13px] font-medium">{y.targetYear}년</span>
            </p>
          ))}
        </div>
        {SECTIONS.map((s) => (
          <section key={s.key} data-section={s.key} aria-label={s.title}>
            <h3 className="mb-1 text-base font-bold text-gray-900">{s.title}</h3>
            <div className={ROW}>
              {years.map((y) => <div key={y.offset} className={CELL}>{s.render(y)}</div>)}
            </div>
          </section>
        ))}
      </div>
    </div>
  )
}
