// The 3-year fortune (vendor engine) and the pillar table must show the same four pillars for every birth.
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { calculatePillarTable } from '../src/engine/pillars.ts'
import { prepare } from '../src/threeyear/compute.ts'
import type { BirthInput } from '../src/engine/types.ts'

interface Fixture { id: number; input: BirthInput; error?: string }
const fixtures: Fixture[] = JSON.parse(readFileSync(new URL('../fixtures/oracle.json', import.meta.url), 'utf-8').trimStart())
const ok = fixtures.filter((f) => !f.error)

const STEM = Object.fromEntries([...'甲乙丙丁戊己庚辛壬癸'].map((h, i) => [h, [...'갑을병정무기경신임계'][i]]))
const BRANCH = Object.fromEntries([...'子丑寅卯辰巳午未申酉戌亥'].map((h, i) => [h, [...'자축인묘진사오미신유술해'][i]]))
const hangul = (ganzi: string) => STEM[ganzi[0]] + BRANCH[ganzi[1]]

describe('3-year engine vs pillar table', () => {
  it(`same four pillars for all ${ok.length} fixtures`, () => {
    const fails: string[] = []
    for (const f of ok) {
      const t = calculatePillarTable(f.input).pillars.map((p) => hangul(p.pillar.ganzi)) // hour, day, month, year
      const s = prepare(f.input)?.saju
      if (!s) { fails.push(`id ${f.id} prepare returned null`); continue }
      const v = [s.hour, s.day, s.month, s.year].map((p) => p.stem + p.branch)
      if (v.join() !== t.join()) fails.push(`id ${f.id} ${JSON.stringify(f.input)} vendor ${v.join('/')} table ${t.join('/')}`)
    }
    if (fails.length) console.log(`${fails.length}/${ok.length} mismatches\n` + fails.slice(0, 25).join('\n'))
    expect(fails.length).toBe(0)
  })

  it('the old engine-default offset (Seoul -32.09 min) is not used: 09:00 Seoul is the hour of 辰', () => {
    const s = prepare({ year: 1985, month: 3, day: 14, hour: 9, minute: 0, gender: 'M', timezone: 'Asia/Seoul' })!.saju
    expect(s.hour.branch).toBe('진') // 09:00 - 30 min = 08:30
  })

  it('empty and invalid input return null', () => {
    expect(prepare({} as BirthInput)).toBeNull()
    expect(prepare({ year: 1985, month: 13, day: 1, hour: 9, minute: 0, gender: 'M' })).toBeNull()
  })
})
