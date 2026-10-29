// Aggregates the five systems into one bundle per target year. Own work.
import type { BirthInput } from '../engine/types.ts'
import { computeThreeYear } from '../threeyear/compute.ts'
import { myeongriYearly } from './myeongri.ts'
import { computeZiweiYearly } from './ziwei.ts'
import { computeAstroYearly } from './astro.ts'
import { computeTojeongYearly } from './tojeong.ts'
import { computeJuyeokYearly } from './juyeok.ts'
import type { SystemKey, SystemYear, YearlyBundle, YearlyComputer } from './types.ts'

const EXTRA: [SystemKey, YearlyComputer][] = [
  ['ziwei', computeZiweiYearly],
  ['astro', computeAstroYearly],
  ['tojeong', computeTojeongYearly],
  ['juyeok', computeJuyeokYearly],
]

/** Runs one system and turns a crash into "not available", so one broken system never hides the others. */
function safely(run: YearlyComputer, input: BirthInput, years: number[]): SystemYear[] | null {
  try { return run(input, years) } catch { return null }
}

/**
 * Three bundles (this year, next year, year after). Returns null when the base (myeongri) calculation fails,
 * for example for an impossible date. Other systems that fail are left out of `systems`.
 */
export async function computeAllYearly(input: BirthInput, name: string, today: Date = new Date()): Promise<YearlyBundle[] | null> {
  const base = await computeThreeYear(input, name, today)
  if (!base) return null
  const years = base.years.map((y) => y.targetYear)
  const bySystem: Partial<Record<SystemKey, SystemYear[]>> = { myeongri: myeongriYearly(base) }
  for (const [key, run] of EXTRA) {
    const r = safely(run, input, years)
    if (r && r.length === years.length) bySystem[key] = r
  }
  return years.map((year, offset) => {
    const systems: YearlyBundle['systems'] = {}
    for (const [key, list] of Object.entries(bySystem) as [SystemKey, SystemYear[]][]) systems[key] = list[offset]
    const scores = Object.values(systems).map((s) => s!.score)
    const composite = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0
    return { year, offset, systems, composite }
  })
}
