import { describe, it, expect } from 'vitest'
import type { BirthInput } from '../../engine/types.ts'
import { astro } from 'iztro'
import { buildNihai, hourToBranch, toNihaiBirthInfo } from './nihaiChart.ts'

const base: BirthInput = { year: 1990, month: 5, day: 15, hour: 8, minute: 30, gender: 'M' }

describe('니하이샤 엔진 어댑터', () => {
  it('정상: 명반과 격국 목록을 만든다', () => {
    const r = buildNihai(base)
    expect(r).not.toBeNull()
    expect(r!.chart.palaces).toHaveLength(12)
    for (const p of r!.patterns) {
      expect(p.name).toBeTruthy()
      expect(['excellent', 'good', 'neutral', 'caution']).toContain(p.level)
    }
  })

  it('빈 입력: 시간을 모르면 null', () => {
    expect(buildNihai({ ...base, unknownTime: true })).toBeNull()
  })

  it('잘못된 입력: 없는 날짜는 RangeError', () => {
    expect(() => buildNihai({ ...base, month: 2, day: 30 })).toThrow(RangeError)
  })

  it('시진 번호: 23·0시는 자(0), 1~2시는 축(1), 21~22시는 해(11)', () => {
    expect([23, 0, 1, 2, 3, 22].map(hourToBranch)).toEqual([0, 0, 1, 1, 2, 11])
  })

  it('늦은 자시(23시)는 다음 날로 넘기고 연말도 올린다', () => {
    const info = toNihaiBirthInfo({ ...base, year: 1999, month: 12, day: 31, hour: 23, minute: 30 })!
    expect([info.year, info.month, info.day, info.hour]).toEqual([2000, 1, 1, 0])
  })

  it('격리: 별도 엔진이 iztro 전역 설정을 바꾸지 않는다 (자미분석 탭 보호)', () => {
    const snap = () => JSON.stringify(astro.getConfig())
    const before = snap()
    buildNihai(base)
    expect(snap()).toBe(before)
  })
})
