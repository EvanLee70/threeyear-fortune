import { describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { KOREAN_CITIES } from '../src/engine/cities.ts'
import { calculatePillarTable } from '../src/engine/pillars.ts'
import App from './App.tsx'
import BirthForm from './BirthForm.tsx'
import ResultView, { type Result } from './ResultView.tsx'
import ResultPage from './ResultPage.tsx'
import { SOURCE_REPO_URL } from './config.ts'
import { resolveBirth } from './birth.ts'
import { makeBundles, makeSystemYear } from './__fixtures__/bundle.ts'
import type { YearlyBundle } from '../src/yearly/types.ts'

// The real aggregator pulls five engines; the site tests use synthetic bundles.
vi.mock('../src/yearly/index.ts', async () => {
  const { makeBundles: make } = await import('./__fixtures__/bundle.ts')
  return { computeAllYearly: async () => make() }
})

const SYSTEMS = ['myeongri', 'ziwei', 'astro', 'tojeong', 'juyeok'] as const
const ALL_SECTIONS = ['overview', ...SYSTEMS, 'cautions']
const testids = (html: string) => [...html.matchAll(/data-testid="([^"]+)"/g)].map((m) => m[1])

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
    expect(html).not.toContain('aria-label="운세 결과"')
    expect(html).not.toContain('data-section=')
    expect(html).not.toContain('graph-')
    expect(html).not.toContain('이름 미지정')
  })

  it('입력 화면에는 운세 해설이 없고, 새 탭에서 열린다고 안내한다', () => {
    expect(html).toContain('새 탭')
    for (const t of ['data-section=', 'data-testid="birth-card"', 'explain-', 'graph-', '조심할 점', '자미두수(紫微斗數)']) expect(html, t).not.toContain(t)
  })

  it('푸터에 소스 저장소 링크가 있다', () => {
    expect(SOURCE_REPO_URL).toMatch(/^https:\/\/github\.com\/[\w-]+\/[\w.-]+$/)
    expect(html).toContain(`href="${SOURCE_REPO_URL}"`)
    expect(html).toContain('소스 코드 보기')
    expect(html).toContain(`href="${SOURCE_REPO_URL}/blob/main/NOTICE"`)
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

  function result(unknownTime = false, bundles: YearlyBundle[] = makeBundles()): Result {
    if (!r.ok) throw new Error('resolve')
    const input = unknownTime ? { ...r.input, hour: 12, minute: 0, unknownTime } : r.input
    return { meta: { ...r.meta, unknownTime }, table: calculatePillarTable(input), bundles }
  }
  const render = (unknownTime = false, bundles?: YearlyBundle[]) => renderToStaticMarkup(<ResultView result={result(unknownTime, bundles)} />)

  it('헤더 한 줄, 사주 표 행, 비교 영역이 위에서 아래로 나온다', () => {
    const html = render()
    expect(html).toContain('>양력 1985.03.14 (음력 1985.01.23) · 09:30 · 남 · 서울<')
    expect(html.indexOf('header-line')).toBeLessThan(html.indexOf('<table'))
    expect(html.indexOf('<table')).toBeLessThan(html.indexOf('data-testid="compare"'))
    for (const row of ['십신', '천간', '지지', '운성', '신살', '장간', '공망']) expect(html).toContain(row)
    expect(html).not.toContain('role="tab"')
    expect(html).not.toContain('이름 미지정')
  })

  it('섹션이 종합, 다섯 체계, 조심할 점 순서로 나오고 제목 뒤에 한 문장 설명이 붙는다', () => {
    const html = render()
    expect([...html.matchAll(/data-section="(\w+)"/g)].map((m) => m[1])).toEqual(ALL_SECTIONS)
    for (const t of ['종합', '명리(命理)', '자미두수(紫微斗數)', '점성술(占星術)', '토정비결(土亭秘訣)', '주역(周易)', '조심할 점']) {
      expect(html).toMatch(new RegExp(`<h3 class="[^"]*">${t.replace(/[()]/g, '\\$&')}</h3><p class="[^"]*text-base[^"]*">[^<]{10,}</p>`))
    }
  })

  it('섹션마다 한 줄 grid에 세 칸이 있고 연도 머리글이 붙는다', () => {
    const html = render()
    for (const key of ALL_SECTIONS) {
      const row = html.slice(html.indexOf(`data-testid="row-${key}"`)).split('data-section=')[0]
      expect(row.match(/data-cell="\d"/g)).toHaveLength(3)
      expect(row).toContain('올해 · 2026년')
      expect(row).toContain('내년 · 2027년')
      expect(row).toContain('내후년 · 2028년')
    }
  })

  it('작은 화면은 세로로 쌓고(grid-cols-1) md부터 3열이다', () => {
    const rows = [...render().matchAll(/<div class="([^"]*)" data-testid="row-\w+"/g)].map((m) => m[1])
    expect(rows).toHaveLength(7)
    for (const c of rows) {
      expect(c.split(/\s+/)).toEqual(expect.arrayContaining(['grid-cols-1', 'md:grid-cols-3']))
      expect(c.split(/\s+/)).not.toContain('grid-cols-3') // never 3 tiny columns on a phone
    }
  })

  it('모든 그래프 바로 다음에 설명이 온다', () => {
    const ids = testids(render())
    const graphs = ids.filter((t) => t.startsWith('graph-'))
    const expected = ['overview-gauge', 'overview-bars', ...SYSTEMS.map((s) => `${s}-bars`), 'myeongri-months', 'tojeong-months', 'ziwei-palaces', 'astro-aspects', 'juyeok-hexagram']
    for (const e of expected) expect(graphs.filter((g) => g === `graph-${e}`), e).toHaveLength(3) // one per year
    expect(graphs).toHaveLength(expected.length * 3)
    ids.forEach((t, i) => {
      if (t.startsWith('graph-')) expect(ids[i + 1]).toBe(t.replace('graph-', 'explain-'))
    })
    expect(ids.filter((t) => t.startsWith('explain-'))).toHaveLength(graphs.length)
  })

  it('설명 글이 없는 그래프는 그리지 않는다', () => {
    const bundles = makeBundles()
    for (const b of bundles) {
      b.systems.juyeok = { ...makeSystemYear('juyeok', b.year, 3), explain: { bars: '막대 설명입니다.' } }
      b.systems.astro = { ...makeSystemYear('astro', b.year, 2), explain: { bars: '막대 설명입니다.', aspects: '   ' } }
    }
    const spy = vi.spyOn(console, 'warn')
    const err = vi.spyOn(console, 'error')
    const ids = testids(render(false, bundles))
    expect(ids).not.toContain('graph-juyeok-hexagram')
    expect(ids).not.toContain('graph-astro-aspects')
    expect(ids).toContain('graph-juyeok-bars')
    expect(ids.filter((t) => t.startsWith('graph-'))).toHaveLength(ids.filter((t) => t.startsWith('explain-')).length)
    expect(spy).not.toHaveBeenCalled()
    expect(err).not.toHaveBeenCalled()
  })

  it('주역은 여섯 줄을 그리고 변하는 줄에 표시가 붙는다', () => {
    const html = render()
    const hex = html.slice(html.indexOf('data-testid="graph-juyeok-hexagram"'), html.indexOf('data-testid="explain-juyeok-hexagram"'))
    expect(hex.match(/data-line="\d"/g)).toHaveLength(6)
    // lines [7,8,9,6,7,8]: yang = 1 bar, yin = 2 bars -> 3 + 3x2 = 9 rects
    expect(hex.match(/<rect/g)).toHaveLength(9)
    expect(hex).toContain('○')
    expect(hex).toContain('×')
    expect(hex).toContain('변하는 효: 3효, 4효')
    expect(hex).toContain('14괘 대유(大有)')
    expect(hex).toContain('1괘 건(乾)')
  })

  it('궁 지도는 4열 12칸, 애스펙트는 목록이다', () => {
    const html = render()
    const pal = html.slice(html.indexOf('data-testid="graph-ziwei-palaces"'), html.indexOf('data-testid="explain-ziwei-palaces"'))
    expect(pal).toContain('grid-cols-4')
    expect(pal.match(/min-w-0 rounded border-2/g)).toHaveLength(12)
    expect(html).toContain('목성 ☌ 태양')
  })

  it('조심할 점은 다섯 체계 것을 겹침 없이 모은다', () => {
    const sec = render().slice(render().indexOf('data-testid="row-cautions"'))
    expect(sec.match(/큰 계약은 서두르지 않기/g)).toHaveLength(3) // once per year, not once per system
    expect(sec).toContain('juyeok 전용 주의')
  })

  it('결과를 감싸는 max-w-3xl 컨테이너가 없고 좌우 여백이 최소다', () => {
    expect(render()).not.toContain('max-w-3xl')
    const full = renderToStaticMarkup(<ResultPage initial={result()} />)
    // walk the tags up to the results section: no still-open element may carry max-w-3xl
    const stack: string[] = []
    for (const m of full.slice(0, full.indexOf('aria-label="운세 결과"')).matchAll(/<(\/?)([a-z0-9]+)([^>]*)>/g)) {
      const [, close, tag, rest] = m
      if (['input', 'br', 'hr', 'img', 'meta', 'link'].includes(tag) || rest.endsWith('/')) continue
      if (close) stack.pop()
      else stack.push(rest)
    }
    expect(stack.some((a) => a.includes('max-w-3xl'))).toBe(false)
    expect(stack[0]).toContain('w-full')
    expect(stack[0]).toMatch(/\bpx-1\b/)
    expect(stack[0]).toMatch(/\bmd:px-2\b/)
    expect(full).toContain('data-testid="compare"')
  })

  it('글자 크기: 설명은 text-base, 칩은 14px 이상, 작은 글자 지정이 없다', () => {
    const html = render()
    const explains = html.match(/data-testid="explain-[^"]+" class="[^"]*"/g)!
    expect(explains.length).toBeGreaterThan(10)
    for (const e of explains) expect(e).toContain('text-base')
    expect(html).not.toMatch(/<span class="inline-block[^"]*text-\[1[0-3]px\]/) // chips
  })

  it('시간 미상이면 사주 표의 시주가 미상으로 표시된다', () => {
    const html = render(true)
    expect(html).toContain('시간 미상')
    expect(html).toContain('>미상<')
  })

  it('계산하지 못한 체계는 안내 문구로 대체되고 섹션은 유지된다', () => {
    const bundles = makeBundles()
    delete bundles[1].systems.ziwei
    const html = render(false, bundles)
    expect(html).toContain('이 체계는 이번 입력으로 계산하지 못했습니다.')
    expect([...html.matchAll(/data-section="(\w+)"/g)]).toHaveLength(7)
  })
})

describe('결과 탭 (ResultPage)', () => {
  it('기다리는 동안 계산 안내만 보이고 해설은 없다', () => {
    const page = renderToStaticMarkup(<ResultPage />)
    expect(page).toContain('운세를 계산하고 있습니다')
    expect(page).not.toContain('data-section=')
    expect(page).toContain('소스 코드 보기')
  })

  it('준비되면 출생 정보 카드가 맨 위, 그 다음 사주 표와 비교가 나온다', () => {
    const r = resolveBirth({ calendar: 'solar', leap: false, year: 1985, month: 3, day: 14, hour: 9, minute: 30, unknownTime: false, gender: 'M', city: 0 }, KOREAN_CITIES[0])
    if (!r.ok) throw new Error('resolve')
    const page = renderToStaticMarkup(<ResultPage initial={{ meta: r.meta, table: calculatePillarTable(r.input), bundles: makeBundles() }} />)
    expect(page.indexOf('data-testid="birth-card"')).toBeLessThan(page.indexOf('<table'))
    expect(page.indexOf('<table')).toBeLessThan(page.indexOf('data-testid="compare"'))
    expect(page).toContain('사시(巳時)')
  })
})
