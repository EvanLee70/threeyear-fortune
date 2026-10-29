// Merged cautions of all systems for one year, deduplicated.
import type { YearlyBundle } from '../../src/yearly/types.ts'
import { CautionList } from './SystemCell.tsx'

const norm = (s: string) => s.replace(/[\s.,!?·]+/g, '')

function mergeCautions(b: YearlyBundle): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const sys of Object.values(b.systems)) {
    for (const c of sys?.cautions ?? []) {
      const k = norm(c)
      if (k && !seen.has(k)) { seen.add(k); out.push(c.trim()) }
    }
  }
  return out
}

export default function CautionCell({ bundle }: { bundle: YearlyBundle }) {
  const items = mergeCautions(bundle)
  return items.length ? <CautionList items={items} /> : <p className="text-base text-gray-900">모아 둘 주의사항이 없습니다.</p>
}
