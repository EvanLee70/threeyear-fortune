import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { KOREAN_CITIES, WORLD_CITIES } from '../src/engine/cities.ts'
import BirthCard from './BirthCard.tsx'
import { resolveBirth, type BirthFormState } from './birth.ts'

const base: BirthFormState = { calendar: 'solar', leap: false, year: 1985, month: 3, day: 14, hour: 9, minute: 30, unknownTime: false, gender: 'M', city: 0 }
function card(over: Partial<BirthFormState> = {}, hourBranch = '巳', city = KOREAN_CITIES[0]) {
  const r = resolveBirth({ ...base, ...over }, city)
  if (!r.ok) throw new Error(r.error)
  return renderToStaticMarkup(<BirthCard meta={r.meta} hourBranch={hourBranch} />)
}
const angle = (html: string, hand: string) => Number(html.match(new RegExp(`data-hand="${hand}" data-angle="([0-9.]+)"`))![1])
const days = (html: string) => [...html.matchAll(/data-testid="leaf-day">(\d+)</g)].map((m) => m[1])

describe('BirthCard', () => {
  it('shows solar and lunar dates, time, gender, and place as pictures', () => {
    const html = card()
    expect(html).toContain('>출생 정보<')
    expect(html).not.toContain('우리')
    expect(html).toContain('1985.03.14 (목)')
    expect(html).toContain('1985.01.23') // lunar
    expect(days(html)).toEqual(['14', '23'])
    expect(html).toContain('09:30')
    expect(html).toContain('사시(巳時)')
    expect(html).toContain('남성')
    expect(html).toContain('서울')
    expect(html).toContain('<svg') // clock, gender mark and pin are drawn
  })

  it('marks only the calendar the user entered', () => {
    expect(card().match(/>입력</g)).toHaveLength(1)
    const lunar = card({ calendar: 'lunar', month: 1, day: 24 })
    expect(lunar.match(/>입력</g)).toHaveLength(1)
    expect(lunar.indexOf('>입력<')).toBeGreaterThan(lunar.indexOf('>음력<'))
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
    expect(html).toContain('2023.윤02.10') // 윤 marks the leap month
    expect(html).toContain('여성')
    expect(html).toContain(`${WORLD_CITIES[0].name}, ${WORLD_CITIES[0].country}`)
  })

  it('keeps one plain sentence for screen readers and has no banned decoration', () => {
    const html = card()
    expect(html).toContain('data-testid="header-line"')
    expect(html).toContain('>양력 1985.03.14 (음력 1985.01.23) · 09:30 · 남 · 서울<')
    for (const banned of ['gradient', 'shadow', 'border']) expect(html).not.toContain(banned)
    expect(html).not.toMatch(/text-(xs|\[1[0-3]px\])/)
  })

  it('draws every picture two text lines tall (56px) next to its text', () => {
    const html = card()
    const pictures = html.match(/class="h-14 w-14 shrink-0/g) ?? []
    expect(pictures).toHaveLength(5) // two leaves, clock, gender mark, pin
    expect(html).not.toMatch(/h-(16|24|28)\b|md:h-24/) // the old tall sizes are gone
    expect(html.match(/leading-7/g)!.length).toBeGreaterThanOrEqual(10) // label line + value line per item
  })

  it('is one row: wraps only when the screen is narrow, and the title is for screen readers only', () => {
    const html = card()
    expect(html).toMatch(/data-testid="birth-row"/)
    expect(html).toMatch(/class="flex flex-wrap gap-2" data-testid="birth-row"/)
    expect(html).not.toContain('grid-cols') // no multi-row grid
    expect(html).toMatch(/<h2 class="sr-only">출생 정보<\/h2>/)
    expect(html.match(/whitespace-nowrap">(1985\.0|09:30)/g)!.length).toBeGreaterThanOrEqual(2) // date and time never wrap
  })

  it('a missing hour branch is simply left out', () => {
    expect(card({}, '')).not.toContain('시(')
  })
})
