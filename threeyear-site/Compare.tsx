// Seven sections, each ONE grid row: 1 column below 768px (years stacked, labeled), 3 columns from 768px (md).
// Every cell has a year header, so the three years start at the same vertical position in a row.
import type { YearlyBundle } from '../src/yearly/types.ts'
import CautionCell from './sections/Cautions.tsx'
import { OFFSET_LABEL, SECTIONS, type SectionKey } from './sections/intro.ts'
import OverviewCell from './sections/Overview.tsx'
import SystemCell from './sections/SystemCell.tsx'

const ROW = 'grid grid-cols-1 gap-2 md:grid-cols-3'
const CELL = 'min-w-0 rounded-lg border border-gray-400 bg-white p-2'

function Cell({ k, b }: { k: SectionKey; b: YearlyBundle }) {
  if (k === 'overview') return <OverviewCell bundle={b} />
  if (k === 'cautions') return <CautionCell bundle={b} />
  return <SystemCell data={b.systems[k]} />
}

export default function Compare({ bundles }: { bundles: YearlyBundle[] }) {
  return (
    <div className="space-y-4" data-testid="compare">
      {SECTIONS.map((s) => (
        <section key={s.key} data-section={s.key} aria-label={s.title}>
          <h3 className="text-lg font-bold text-gray-900">{s.title}</h3>
          <p className="mb-1.5 text-base text-gray-900">{s.intro}</p>
          <div className={ROW} data-testid={`row-${s.key}`}>
            {bundles.map((b) => (
              <div key={b.offset} className={CELL} data-cell={b.offset}>
                <h4 className="mb-1.5 rounded-md bg-teal-700 px-2 py-1 text-base font-bold text-white">{OFFSET_LABEL[b.offset] ?? `${b.offset}년 뒤`} · {b.year}년</h4>
                <Cell k={s.key} b={b} />
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
