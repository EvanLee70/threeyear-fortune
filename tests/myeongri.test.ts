import { describe, expect, it } from 'vitest'
import type { BirthInput } from '../src/engine/types.ts'
import { computeThreeYear, type ThreeYearResult } from '../src/threeyear/compute.ts'
import { myeongriYearly } from '../src/yearly/myeongri.ts'

const NOW = new Date('2026-10-29T12:00:00+09:00')
const INPUT: BirthInput = { year: 1985, month: 3, day: 14, hour: 9, minute: 30, gender: 'M' }

describe('myeongriYearly', () => {
  it('정상 입력: 연도별 SystemYear 3개, 그래프마다 설명이 있다', async () => {
    const r = (await computeThreeYear(INPUT, '우리', NOW))!
    const out = myeongriYearly(r)
    expect(out.map((s) => s.year)).toEqual([2026, 2027, 2028])
    for (const [i, s] of out.entries()) {
      expect(s.system).toBe('myeongri')
      expect(s.score).toBe(r.years[i].overall)
      expect(s.headline).toContain(`${s.score}점`)
      expect(s.facts.map((f) => f.label)).toEqual(expect.arrayContaining(['세운', '십신(十神)']))
      expect(s.bars!.map((b) => b.label)).toEqual(['재물', '직장', '연애', '건강'])
      expect(s.months).toHaveLength(12)
      expect(s.explain.bars).toBeTruthy()
      expect(s.explain.months).toBeTruthy()
      expect(s.narrative.length).toBeGreaterThanOrEqual(2)
      expect(s.narrative.length).toBeLessThanOrEqual(5)
      expect(s.cautions.length).toBeLessThanOrEqual(5)
      expect(s.cautions.length).toBeGreaterThan(0)
    }
  })

  it('빈 입력: 연도가 없으면 빈 배열', () => {
    expect(myeongriYearly({ baseYear: 2026, years: [] })).toEqual([])
  })

  it('잘못된 입력: 계산 불가 날짜는 null이고, 월 데이터가 빈 해는 월 그래프를 뺀다', async () => {
    expect(await computeThreeYear({ ...INPUT, month: 13 }, '우리', NOW)).toBeNull()
    const r = (await computeThreeYear(INPUT, '우리', NOW))!
    const broken: ThreeYearResult = { ...r, years: [{ ...r.years[0], months: [] }] }
    const [s] = myeongriYearly(broken)
    expect(s.months).toBeUndefined()
    expect(s.explain.months).toBeUndefined()
    expect(s.headline).not.toContain('NaN')
  })
})
