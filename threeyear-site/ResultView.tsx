// 결과 화면: 헤더 한 줄 -> 사주팔자 표 -> 다섯 체계 3개년 비교. 탭·펼침 없이 한 번에 모두 보인다.
import type { PillarTableData } from '../src/engine/types.ts'
import type { YearlyBundle } from '../src/yearly/types.ts'
import PillarTable from '../src/components/PillarTable.tsx'
import { formatHeader, type BirthMeta } from './birth.ts'
import Compare from './Compare.tsx'
import { DISPLAY_NAME } from './config.ts'

export interface Result {
  meta: BirthMeta
  table: PillarTableData
  bundles: YearlyBundle[]
}

const card = 'rounded-lg border-2 border-gray-400 bg-white p-3'

export default function ResultView({ result }: { result: Result }) {
  const { meta, table, bundles } = result
  return (
    <section className="mt-6 space-y-4" aria-label="운세 결과">
      <p className="text-base font-bold text-gray-900" data-testid="header-line">{`${DISPLAY_NAME}님 · ${formatHeader(meta)}`}</p>
      <div className={card}>
        <h2 className="mb-2 text-base font-bold text-gray-900">사주팔자(四柱八字)</h2>
        <PillarTable data={table} unknownTime={meta.unknownTime} />
      </div>
      <Compare bundles={bundles} />
    </section>
  )
}
