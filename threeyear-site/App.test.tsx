import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { KOREAN_CITIES } from '../src/engine/cities.ts'
import { calculatePillarTable } from '../src/engine/pillars.ts'
import App from './App.tsx'
import BirthForm from './BirthForm.tsx'
import ResultView, { type Result } from './ResultView.tsx'
import { SOURCE_REPO_URL } from './config.ts'
import { resolveBirth } from './birth.ts'
import { computeThreeYear } from '../src/threeyear/compute.ts'

const NOW = new Date('2026-10-29T12:00:00+09:00')
const text = (html: string) => [...html.matchAll(/>([^<]+)</g)].map((m) => m[1])

describe('threeyear-site App', () => {
  const html = renderToStaticMarkup(<App />)

  it('입력 폼, 개인정보 문구, 고지 문구를 보여준다', () => {
    expect(html).toContain('입력한 정보는 저장되거나 서버로 전송되지 않습니다.')
    expect(html).toContain('재미·참고용')
    expect(html).toContain('MIT 라이선스')
    expect(html).toContain('사주 엔진 일부: fortuneteller (MIT, Hoshin)')
    expect(html).toContain('태어난 곳')
  })

  it('입력 전에는 결과가 없다 (빈 상태) 그리고 이름 문구도 없다', () => {
    expect(html).not.toContain('data-testid="compare"')
    expect(html).not.toContain('이름 미지정')
  })

  it('푸터에 소스 저장소 링크가 있다', () => {
    expect(SOURCE_REPO_URL).toMatch(/^https:\/\/github\.com\/[\w-]+\/[\w.-]+$/)
    expect(html).toContain(`href="${SOURCE_REPO_URL}"`)
    expect(html).toContain('소스 코드 보기')
  })

  it('양력이 기본이고 윤달 체크박스는 음력일 때만 나온다', () => {
    expect(renderToStaticMarkup(<BirthForm onResolved={() => {}} onInvalid={() => {}} />)).not.toContain('name="leap"')
    expect(html).toContain('양력')
    expect(html).toContain('음력')
    expect(html).not.toContain('윤달')
  })
})

describe('결과 화면', () => {
  const r = resolveBirth({ calendar: 'solar', leap: false, year: 1985, month: 3, day: 14, hour: 9, minute: 30, unknownTime: false, gender: 'M', city: 0 }, KOREAN_CITIES[0])

  async function render(unknownTime = false) {
    if (!r.ok) throw new Error('resolve')
    const input = unknownTime ? { ...r.input, hour: 12, minute: 0, unknownTime } : r.input
    const three = await computeThreeYear(input, '', NOW)
    const result: Result = { meta: { ...r.meta, unknownTime }, table: calculatePillarTable(input), years: three!.years }
    return renderToStaticMarkup(<ResultView result={result} />)
  }

  it('헤더 한 줄, 사주 표 행, 3열 비교가 위에서 아래로 나온다', async () => {
    const html = await render()
    expect(html).toContain('고길동님 · 양력 1985.03.14 (음력 1985.01.23) · 09:30 · 남 · 서울')
    expect(html.indexOf('header-line')).toBeLessThan(html.indexOf('<table'))
    expect(html.indexOf('<table')).toBeLessThan(html.indexOf('data-testid="compare"'))
    for (const row of ['십신', '천간', '지지', '운성', '신살', '장간', '공망']) expect(html).toContain(row)
    expect(html).not.toContain('role="tab"')
    expect(html).not.toContain('이름 미지정')
  })

  it('섹션 순서가 같고 섹션마다 3칸이다', async () => {
    const html = await render()
    const compare = html.slice(html.indexOf('data-testid="compare"'))
    const keys = [...compare.matchAll(/data-section="(\w+)"/g)].map((m) => m[1])
    expect(keys).toEqual(['sewoon', 'overall', 'themes', 'zodiac', 'months', 'cautions'])
    const sections = compare.split('<section').slice(1)
    for (const s of sections) expect(s.split('rounded-lg border border-gray-400').length - 1).toBe(3)
    expect(compare).toContain('올해')
    expect(compare).toContain('내년')
    expect(compare).toContain('내후년')
    expect(compare.match(/grid-cols-3/g)!.length).toBe(1 + sections.length)
  })

  it('비교 영역에는 긴 문장이 없다 (글자 덩어리 80자 이하)', async () => {
    const html = await render()
    const compare = html.slice(html.indexOf('data-testid="compare"'))
    const long = text(compare).filter((t) => t.length > 80)
    expect(long).toEqual([])
    expect(compare).not.toMatch(/해입니다|입니다\./)
  })

  it('시간 미상이면 사주 표의 시주가 미상으로 표시된다', async () => {
    const html = await render(true)
    expect(html).toContain('시간 미상')
    expect(html).toContain('>미상<')
  })
})
