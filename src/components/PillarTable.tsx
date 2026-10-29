// Four-pillar table (Korean labels, hanja values). Columns: hour, day, month, year.
import type { ReactNode } from 'react'
import type { PillarTableData } from '../engine/types.ts'

type El = 'tree' | 'fire' | 'earth' | 'metal' | 'water'

// Element of each stem / branch (wood, fire, earth, metal, water).
const ELEMENT: Record<string, El> = {
  甲: 'tree', 乙: 'tree', 丙: 'fire', 丁: 'fire', 戊: 'earth', 己: 'earth', 庚: 'metal', 辛: 'metal', 壬: 'water', 癸: 'water',
  寅: 'tree', 卯: 'tree', 巳: 'fire', 午: 'fire', 辰: 'earth', 戌: 'earth', 丑: 'earth', 未: 'earth', 申: 'metal', 酉: 'metal', 亥: 'water', 子: 'water',
}

const COLUMNS = ['時柱', '日柱', '月柱', '年柱']
const cell = 'border border-gray-400 px-1 py-2 text-center align-middle text-base text-gray-900'
const head = 'border border-gray-400 bg-gray-100 px-1 py-2 text-center text-base font-bold text-gray-900'

/** Big stem/branch cell on a solid element colour. */
function Glyph({ ch }: { ch: string }) {
  const el = ELEMENT[ch]
  return <span className={`block py-1 text-2xl font-bold ${el ? `wx-fill-${el}` : ''}`}>{ch}</span>
}

/** Hidden stems: each character in its element colour. */
function Hidden({ text }: { text: string }) {
  return <>{[...text].map((ch, i) => <span key={i} className={`font-bold wx-text-${ELEMENT[ch] ?? ''}`}>{ch}</span>)}</>
}

export default function PillarTable({ data, unknownTime }: { data: PillarTableData; unknownTime: boolean }) {
  const { pillars, gongmang } = data
  const unknown = (i: number) => unknownTime && i === 0
  const row = (label: ReactNode, render: (i: number) => ReactNode, unknownText = '-') => (
    <tr>
      <th scope="row" className={head}>{label}</th>
      {pillars.map((_, i) => <td key={i} className={cell}>{unknown(i) ? unknownText : render(i)}</td>)}
    </tr>
  )

  return (
    <div className="overflow-x-auto">
      <table className="w-full table-fixed border-collapse">
        <thead>
          <tr>
            <th className={head}><span className="sr-only">구분</span></th>
            {COLUMNS.map((c) => <th key={c} scope="col" className={head}>{c}</th>)}
          </tr>
        </thead>
        <tbody>
          {row('십신(十神)', (i) => pillars[i].stemSipsin)}
          {row('천간(天干)', (i) => <Glyph ch={pillars[i].pillar.stem} />, '미상')}
          {row('지지(地支)', (i) => <Glyph ch={pillars[i].pillar.branch} />, '미상')}
          {row('십신(十神)', (i) => pillars[i].branchSipsin)}
          {row('운성(運星)', (i) => pillars[i].unseong)}
          {row('신살(神煞)', (i) => pillars[i].sinsal)}
          {row('장간(藏干)', (i) => <Hidden text={pillars[i].jigang} />)}
          {row(
            <>공망(空亡)<span className="block font-normal">{gongmang.branches.join(' ')}</span></>,
            (i) => gongmang.pillarIndices.includes(i) ? <span className="font-bold text-rose-800">空</span> : '-',
          )}
        </tbody>
      </table>
    </div>
  )
}
