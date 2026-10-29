import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import PillarTable from './PillarTable.tsx'
import type { PillarDetail, PillarTableData } from '../engine/types.ts'

const d = (stem: string, branch: string, jigang: string): PillarDetail => ({
  pillar: { ganzi: stem + branch, stem, branch }, stemSipsin: '偏印', branchSipsin: '正官', unseong: '帝旺', sinsal: '將星', jigang,
})
const DATA: PillarTableData = {
  pillars: [d('乙', '巳', '戊庚丙'), d('壬', '子', '壬癸'), d('丁', '卯', '甲乙'), d('乙', '丑', '癸辛己')],
  gongmang: { branches: ['戌', '亥'], pillarIndices: [1] },
}

describe('PillarTable', () => {
  const html = renderToStaticMarkup(<PillarTable data={DATA} unknownTime={false} />)

  it('shows the four columns in order and all row labels', () => {
    const cols = ['時柱', '日柱', '月柱', '年柱'].map((c) => html.indexOf(c))
    expect(cols.every((i) => i > 0)).toBe(true)
    expect([...cols].sort((a, b) => a - b)).toEqual(cols)
    for (const l of ['십신(十神)', '천간(天干)', '지지(地支)', '운성(運星)', '신살(神煞)', '장간(藏干)', '공망(空亡)']) expect(html).toContain(l)
  })

  it('colours stems by element and marks gongmang only on listed pillars', () => {
    expect(html).toContain('wx-fill-tree')  // 乙
    expect(html).toContain('wx-fill-water') // 壬
    expect(html).toContain('wx-fill-fire')  // 丁
    expect(html).toContain('戌 亥')
    expect(html.match(/>空</g)).toHaveLength(1)
    expect(html).toContain('帝旺')
  })

  it('unknown time replaces the hour column with 미상', () => {
    const u = renderToStaticMarkup(<PillarTable data={DATA} unknownTime />)
    expect(u.match(/>미상</g)).toHaveLength(2)
    expect(html).toContain('>丙<') // hidden stem of the hour pillar
    expect(u).not.toContain('>丙<')
    expect(u).toContain('>癸<')
  })
})
