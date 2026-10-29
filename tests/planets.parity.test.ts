import { describe, expect, it } from 'vitest'
import oracle from '../fixtures/oracle-planets.json'
import { birthInstantUtc, planetLongitudes, PLANET_NAMES } from '../src/engine/planets'
import type { PlanetName } from '../src/engine/planets'
import type { BirthInput } from '../src/engine/types'

type Case = {
  id: number
  input: BirthInput
  planets: { id: PlanetName; longitude: number; speed: number; isRetrograde: boolean }[]
  error?: string
}
const cases = (oracle as unknown as Case[]).filter((c) => !c.error && c.planets?.length)
const angDiff = (a: number, b: number) => {
  const d = Math.abs(a - b) % 360
  return Math.min(d, 360 - d)
}

describe('planet parity with fixtures/oracle-planets.json', () => {
  it('matches longitude and retrograde flag', () => {
    const maxErr = Object.fromEntries(PLANET_NAMES.map((n) => [n, 0])) as Record<PlanetName, number>
    let total = 0
    let ok = 0
    let retroTotal = 0
    let retroOk = 0
    for (const c of cases) {
      const utc = birthInstantUtc(c.input)
      expect(utc, `id ${c.id}`).not.toBeNull()
      const got = planetLongitudes(utc!)
      for (const ref of c.planets.filter((p) => PLANET_NAMES.includes(p.id))) {
        const g = got[ref.id]
        const err = angDiff(g.longitude, ref.longitude)
        maxErr[ref.id] = Math.max(maxErr[ref.id], err)
        total++
        if (err <= (ref.id === 'Moon' ? 0.1 : 0.05)) ok++
        if (Math.abs(ref.speed) >= 0.01) {
          retroTotal++
          if (g.retrograde === ref.isRetrograde) retroOk++
        }
      }
    }
    console.log('max error deg per planet', JSON.stringify(maxErr, (_k, v) => (typeof v === 'number' ? +v.toFixed(5) : v)))
    console.log(`cases=${cases.length} lonOk=${ok}/${total} retroOk=${retroOk}/${retroTotal}`)
    expect(ok / total).toBeGreaterThanOrEqual(0.99)
    expect(retroOk / retroTotal).toBeGreaterThanOrEqual(0.99)
  })

  it('birthInstantUtc handles normal, unknown time and invalid input', () => {
    const base: BirthInput = { year: 1985, month: 3, day: 14, hour: 9, minute: 30, gender: 'M' }
    expect(birthInstantUtc(base)!.toISOString()).toBe('1985-03-14T00:30:00.000Z')
    expect(birthInstantUtc({ ...base, unknownTime: true })!.toISOString()).toBe('1985-03-14T03:00:00.000Z')
    expect(birthInstantUtc({ ...base, month: 13 })).toBeNull()
    expect(birthInstantUtc({ ...base, day: 30, month: 2 })).toBeNull()
    expect(birthInstantUtc({} as BirthInput)).toBeNull()
  })
})
