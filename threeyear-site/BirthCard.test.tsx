import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { KOREAN_CITIES, WORLD_CITIES } from '../src/engine/cities.ts'
import BirthCard from './BirthCard.tsx'
import { resolveBirth, type BirthFormState } from './birth.ts'

const base: BirthFormState = { calendar: 'solar', leap: false, year: 1985, month: 3, day: 14, hour: 9, minute: 30, unknownTime: false, gender: 'M', city: 0 }
function card(over: Partial<BirthFormState> = {}, hourBranch = '巳', city = KOREAN_CITIES[0]) {
  const r = resolveBirth({ ...base, ...over }, city)
  if (!r.ok) throw new Error(r.error)
  return renderToStaticMarkup(<BirthCard meta={r.meta} name="고길동" hourBranch={hourBranch} />)
}
const angle = (html: string, hand: string) => Number(html.match(new RegExp(`data-hand="${hand}" data-angle="([0-9.]+)"`))![1])
const days = (html: string) => [...html.matchAll(/data-testid="leaf-day">(\d+)</g)].map((m) => m[1])

describe('BirthCard', () => {
  it('shows solar and lunar dates, time, gender, and place as pictures', () => {
    const html = card()
    expect(html).toContain('고길동님의 출생 정보')
    expect(html).toContain('1985년 3월')
    expect(html).toContain('목요일')
    expect(html).toContain('1985년 1월') // lunar 1985.01.23
    expect(days(html)).toEqual(['14', '23'])
    expect(html).toContain('09:30')
    expect(html).toContain('사시(巳時)')
    expect(html).toContain('남성')
    expect(html).toContain('서울')
    expect(html).toContain('<svg') // clock, gender mark and pin are drawn
  })

  it('marks only the calendar the user entered', () => {
    expect(card().match(/입력 기준/g)).toHaveLength(1)
    const lunar = card({ calendar: 'lunar', month: 1, day: 24 })
    expect(lunar.match(/입력 기준/g)).toHaveLength(1)
    expect(lunar.indexOf('입력 기준')).toBeGreaterThan(lunar.indexOf('음력(陰曆)'))
  })

  it('draws the clock hands at the right angles', () => {
    const html = card() // 09:30
    expect(angle(html, 'hour')).toBeCloseTo(285, 5) // (9 + 30/60) * 30
    expect(angle(html, 'minute')).toBeCloseTo(180, 5)
    expect(angle(card({ hour: 0, minute: 0 }, '子'), 'hour')).toBe(0)
    expect(angle(card({ hour: 15, minute: 15 }, '申'), 'minute')).toBeCloseTo(90, 5)
  })

  it('unknown time: empty clock, plain words, no hour branch', () => {
    const html = card({ unknownTime: true })
    expect(html).toContain('시간 미상')
    expect(html).toContain('정오(12:00) 기준')
    expect(html).not.toContain('data-hand=')
    expect(html).not.toContain('시(巳時)')
  })

  it('leap lunar month, female, and a foreign city', () => {
    const html = card({ calendar: 'lunar', leap: true, year: 2023, month: 2, day: 10, gender: 'F' }, '午', WORLD_CITIES[0])
    expect(html).toContain('윤2월')
    expect(html).toContain('윤달')
    expect(html).toContain('여성')
    expect(html).toContain(`${WORLD_CITIES[0].name}, ${WORLD_CITIES[0].country}`)
  })

  it('keeps one plain sentence for screen readers and has no banned decoration', () => {
    const html = card()
    expect(html).toContain('data-testid="header-line"')
    expect(html).toContain('고길동님 · 양력 1985.03.14 (음력 1985.01.23) · 09:30 · 남 · 서울')
    for (const banned of ['gradient', 'shadow', 'border']) expect(html).not.toContain(banned)
    expect(html).not.toMatch(/text-(xs|\[1[0-3]px\])/)
  })

  it('a missing hour branch is simply left out', () => {
    expect(card({}, '')).not.toContain('시(')
  })
})
