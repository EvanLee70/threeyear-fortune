import { describe, expect, it } from 'vitest'
import tzLookup from '@photostructure/tz-lookup'
import { KOREAN_CITIES, WORLD_CITIES, formatCityName } from '../src/engine/cities.ts'

const ALL = [...KOREAN_CITIES, ...WORLD_CITIES]

describe('cities', () => {
  it('Seoul is first and lists are non-trivial', () => {
    expect(KOREAN_CITIES[0].name).toBe('서울')
    expect(KOREAN_CITIES.length).toBeGreaterThanOrEqual(55)
    expect(WORLD_CITIES.length).toBeGreaterThanOrEqual(60)
  })

  it('has no duplicate labels, and the two Gwangju entries are disambiguated', () => {
    const labels = ALL.map(formatCityName)
    expect(new Set(labels).size).toBe(labels.length)
    expect(KOREAN_CITIES.map((c) => c.name)).toEqual(expect.arrayContaining(['광주 (광주광역시)', '광주 (경기도)']))
  })

  it('coordinates are in range and every city resolves to a zone', () => {
    for (const c of ALL) {
      expect(Math.abs(c.lat), c.name).toBeLessThanOrEqual(90)
      expect(Math.abs(c.lon), c.name).toBeLessThanOrEqual(180)
      expect(tzLookup(c.lat, c.lon), c.name).toMatch(/^[A-Za-z_]+\/[A-Za-z_/+-]+$/)
    }
  })

  it('all Korean cities are Asia/Seoul and have no country', () => {
    for (const c of KOREAN_CITIES) {
      expect(tzLookup(c.lat, c.lon), c.name).toBe('Asia/Seoul')
      expect(c.country).toBeUndefined()
    }
  })

  it('every foreign city has a country', () => {
    for (const c of WORLD_CITIES) expect(c.country, c.name).toBeTruthy()
  })

  it('formatCityName', () => {
    expect(formatCityName({ name: '서울', lat: 0, lon: 0 })).toBe('서울')
    expect(formatCityName({ name: '도쿄', country: '일본', lat: 0, lon: 0 })).toBe('도쿄, 일본')
    expect(formatCityName({ name: 'x', country: '', lat: 0, lon: 0 })).toBe('x')
  })
})
