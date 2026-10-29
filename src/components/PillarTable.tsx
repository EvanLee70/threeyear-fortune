// Four-pillar table. Every hanja term is shown as 한글(漢字). Columns: hour, day, month, year.
import type { ReactNode } from 'react'
import type { PillarTableData } from '../engine/types.ts'
import { named } from './pillarNames.ts'

type El = 'tree' | 'fire' | 'earth' | 'metal' | 'water'

// Element of each stem / branch (wood, fire, earth, metal, water).
const ELEMENT: Record<string, El> = {
  甲: 'tree', 乙: 'tree', 丙: 'fire', 丁: 'fire', 戊: 'earth', 己: 'earth', 庚: 'metal', 辛: 'metal', 壬: 'water', 癸: 'water',
  寅: 'tree', 卯: 'tree', 巳: 'fire', 午: 'fire', 辰: 'earth', 戌: 'earth', 丑: 'earth', 未: 'earth', 申: 'metal', 酉: 'metal', 亥: 'water', 子: 'water',
}

const COLUMNS = ['時柱', '日柱', '月柱', '年柱']
const cell = 'border border-gray-400 px-1 py-2 text-center align-middle text-base text-gray-900'
const head = 'border border-gray-400 bg-gray-100 px-1 py-2 text-center text-base font-bold text-gray-900'

/** "한글(漢字)". A line may break only between the Korean part and the bracketed hanja part. */
function Named({ h }: { h: string }) {
  const { ko, hanja } = named(h)
  if (!ko) return <span className="whitespace-nowrap">{hanja}</span>
  return <><span className="whitespace-nowrap">{ko}</span><span className="whitespace-nowrap">({hanja})</span></>
}

/** Row title such as '십신(十神)': a line may break only before the bracket. */
function Label({ text }: { text: string }) {
  const at = text.indexOf('(')
  if (at < 0) return <span className="whitespace-nowrap">{text}</span>
  return <><span className="whitespace-nowrap">{text.slice(0, at)}</span><span className="whitespace-nowrap">{text.slice(at)}</span></>
}

/** Big stem/branch cell on a solid element colour. */
function Glyph({ ch }: { ch: string }) {
  const el = ELEMENT[ch]
  return <span className={`block whitespace-nowrap py-1 text-xl font-bold ${el ? `wx-fill-${el}` : ''}`} data-testid="glyph"><Named h={ch} /></span>
}

/** Hidden stems: each stem in its element colour, as 한글(漢字). */
function Hidden({ text }: { text: string }) {
  return <>{[...text].filter((ch) => ch.trim()).map((ch, i) => <span key={i} className={`mr-1 inline-block font-bold wx-text-${ELEMENT[ch] ?? ''}`}><Named h={ch} /></span>)}</>
}

export default function PillarTable({ data, unknownTime }: { data: PillarTableData; unknownTime: boolean }) {
  const { pillars, gongmang } = data
  const unknown = (i: number) => unknownTime && i === 0
  const row = (label: string | ReactNode, render: (i: number) => ReactNode, unknownText = '-') => (
    <tr>
      <th scope="row" className={head}>{typeof label === 'string' ? <Label text={label} /> : label}</th>
      {pillars.map((_, i) => <td key={i} className={cell}>{unknown(i) ? unknownText : render(i)}</td>)}
    </tr>
  )

  return (
    <div className="overflow-x-auto">
      <table className="w-full table-fixed border-collapse">
        <colgroup>
          <col className="w-[17%]" />
          {COLUMNS.map((c) => <col key={c} />)}
        </colgroup>
        <thead>
          <tr>
            <th className={head}><span className="sr-only">구분</span></th>
            {COLUMNS.map((c) => <th key={c} scope="col" className={head}><Named h={c} /></th>)}
          </tr>
        </thead>
        <tbody>
          {row('십신(十神)', (i) => <Named h={pillars[i].stemSipsin} />)}
          {row('천간(天干)', (i) => <Glyph ch={pillars[i].pillar.stem} />, '미상')}
          {row('지지(地支)', (i) => <Glyph ch={pillars[i].pillar.branch} />, '미상')}
          {row('십신(十神)', (i) => <Named h={pillars[i].branchSipsin} />)}
          {row('운성(運星)', (i) => <Named h={pillars[i].unseong} />)}
          {row('신살(神煞)', (i) => <Named h={pillars[i].sinsal} />)}
          {row('장간(藏干)', (i) => <Hidden text={pillars[i].jigang} />)}
          {row(
            <><Label text="공망(空亡)" /><span className="block font-normal">{gongmang.branches.map((b, k) => <span key={b} className={k ? 'ml-1' : ''}><Named h={b} /></span>)}</span></>,
            (i) => gongmang.pillarIndices.includes(i) ? <span className="font-bold text-rose-800"><Named h="空" /></span> : '-',
          )}
        </tbody>
      </table>
    </div>
  )
}
