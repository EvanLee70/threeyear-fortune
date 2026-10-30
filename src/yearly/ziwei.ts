// Zi Wei Dou Shu yearly layer (流年), read through the iztro horoscope API. Own work.
//
// Scoring rule (deterministic):
//  1. Year score = 50 + sum over the four key palaces (명궁, 재백, 관록, 천이) of the yearly-stem transformations
//     that land there (化祿 +8, 化權 +6, 化科 +5, 化忌 -10) + brightness of the main stars in the yearly 명궁
//     (mean of 庙+3 .. 陷-3, times 2, capped at +-6; an empty palace borrows its opposite palace). Clamped to 0..100.
//  2. Bar score of one palace = 50 + transformations landing there (化祿 +15, 化權 +11, 化科 +9, 化忌 -18)
//     + mean main-star brightness times 4. Clamped to 0..100.
//  3. Month score = 50 + (year score - 50) * 0.3 + monthly-stem transformations on the key palaces of that month's
//     layer (+6, +4, +3, -8). Month i is read at the 15th of solar month i.
import { astro } from 'iztro'
import type { BirthInput } from '../engine/types.ts'
import { toNihaiBirthInfo } from '../vendor/ziwei-nihai/nihaiChart.ts'
import type { BarItem, PalaceCell, SystemYear } from './types.ts'

type Astrolabe = ReturnType<typeof astro.bySolar>
type Layer = { palaceNames: readonly string[]; mutagen: readonly string[] } // yearly / monthly horoscope layer
type NatalPalace = Astrolabe['palaces'][number]

const KIND_HANJA = ['화록(化祿)', '화권(化權)', '화과(化科)', '화기(化忌)']
const KIND_KO = ['화록(化祿)은', '화권(化權)은', '화과(化科)는', '화기(化忌)는']
const KEY = ['명궁', '재백', '관록', '천이']
const W_YEAR = [8, 6, 5, -10]
const W_BAR = [15, 11, 9, -18]
const W_MONTH = [6, 4, 3, -8]

const TOPIC: Record<string, string> = {
  명궁: '나 자신과 한 해의 전반적인 흐름', 재백: '돈의 흐름과 씀씀이', 관록: '일과 직업', 천이: '바깥 활동과 이동, 대인 관계',
  부처: '연애와 배우자 관계', 질액: '컨디션과 생활 습관', 형제: '형제와 동료 관계', 자녀: '자녀와 후배, 창작 활동',
  노복: '친구와 아랫사람', 전택: '집과 가정 환경', 복덕: '마음의 여유와 취미', 부모: '부모와 윗사람, 문서 일',
}
const MEANING = [
  (t: string) => `${t} 쪽으로 기회와 보탬이 따르기 쉬운 해입니다`,
  (t: string) => `${t}에서 주도권과 책임이 커지기 쉬운 해입니다`,
  (t: string) => `${t}에서 평판과 주변의 도움이 따르기 쉬운 해입니다`,
  (t: string) => `${t}에서 마음 쓸 일과 막힘이 생기기 쉬우니 여유를 두는 편이 좋습니다`,
]

const clamp = (n: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, Math.round(n)))
const gung = (n: string) => (n.endsWith('궁') ? n : `${n}궁`)
const topic = (palaceName: string) => TOPIC[palaceName.replace('궁', '')] ?? '삶의 한 부분'
/** Attach a Korean particle by the final consonant of the word. */
function josa(word: string, withBatchim: string, without: string): string {
  const c = word.charCodeAt(word.length - 1)
  return word + (c >= 0xac00 && c <= 0xd7a3 && (c - 0xac00) % 28 !== 0 ? withBatchim : without)
}

/** ko-KR brightness text such as '[+3]' (庙) .. '[-3]' (陷) -> number. Undefined when absent. */
const bright = (b?: string) => { const m = (b ?? '').match(/\[([+-]?\d)\]/); return m ? Number(m[1]) : undefined }

function brightMean(a: Astrolabe, i: number): number {
  const vals = (p: NatalPalace) => p.majorStars.map((s) => bright(s.brightness)).filter((x): x is number => x !== undefined)
  let v = vals(a.palaces[i])
  if (!v.length) v = vals(a.palaces[(i + 6) % 12]) // empty palace borrows the opposite palace
  return v.length ? v.reduce((x, y) => x + y, 0) / v.length : 0
}

/** Natal palace index (0..11) holding each of the four transformed stars (祿 權 科 忌) of a layer; -1 if not found. */
function landings(a: Astrolabe, layer: Layer): number[] {
  return layer.mutagen.map((star) => a.palaces.findIndex((p) => [...p.majorStars, ...p.minorStars].some((s) => s.name === star)))
}

const nameIndex = (layer: Layer, name: string) => layer.palaceNames.indexOf(name)

function validate(input: BirthInput): boolean {
  if (!input || typeof input !== 'object') return false
  const { year, month, day, hour, minute } = input
  if (![year, month, day].every(Number.isInteger) || (input.gender !== 'M' && input.gender !== 'F')) return false
  if (year < 1900 || year > 2100 || month < 1 || month > 12 || day < 1) return false
  const probe = new Date(Date.UTC(year, month - 1, day))
  if (probe.getUTCMonth() !== month - 1 || probe.getUTCDate() !== day) return false
  if (input.unknownTime) return true
  return Number.isInteger(hour) && Number.isInteger(minute) && hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59
}

function buildChart(input: BirthInput): Astrolabe {
  // Unknown hour: assume 12:00 (午 hour).
  const info = toNihaiBirthInfo({
    ...input, unknownTime: false,
    hour: input.unknownTime ? 12 : input.hour, minute: input.unknownTime ? 0 : input.minute,
  })!
  return astro.bySolar(`${info.year}-${info.month}-${info.day}`, info.hour, info.gender === 'male' ? '男' : '女', true, 'ko-KR')
}

function monthScores(a: Astrolabe, year: number, yearScore: number): { month: number; score: number }[] {
  return Array.from({ length: 12 }, (_, k) => {
    const m = a.horoscope(new Date(year, k, 15, 12)).monthly
    let s = 50 + (yearScore - 50) * 0.3
    landings(a, m).forEach((idx, kind) => { if (idx >= 0 && KEY.includes(m.palaceNames[idx])) s += W_MONTH[kind] })
    return { month: k + 1, score: clamp(s) }
  })
}

function computeOne(a: Astrolabe, input: BirthInput, year: number): SystemYear {
  const h = a.horoscope(new Date(year, 5, 15, 12))
  const y = h.yearly
  const at = landings(a, y)
  const life = nameIndex(y, '명궁')
  const stemName = `${y.heavenlyStem}${y.earthlyBranch}년`

  const trans: number[][] = Array.from({ length: 12 }, () => [])
  at.forEach((idx, kind) => { if (idx >= 0) trans[idx].push(kind) })
  const sum = (idx: number, w: number[]) => trans[idx].reduce((s, k) => s + w[k], 0)

  let score = 50 + Math.max(-6, Math.min(6, Math.round(brightMean(a, life) * 2)))
  for (const k of KEY) score += sum(nameIndex(y, k), W_YEAR)
  score = clamp(score)

  const barOf = (label: string, palace: string): BarItem => {
    const i = nameIndex(y, palace)
    return { label, score: clamp(50 + sum(i, W_BAR) + brightMean(a, i) * 4) }
  }
  const bars = [barOf('재물', '재백'), barOf('직업', '관록'), barOf('연애', '부처'), barOf('건강', '질액')]

  // 12 cells, counter-clockwise from the yearly life palace (palace index falls by one per step)
  const palaces: PalaceCell[] = Array.from({ length: 12 }, (_, k) => {
    const i = (life - k + 12) % 12
    const net = sum(i, W_BAR)
    const stars = a.palaces[i].majorStars.map((s) => s.name).slice(0, 3)
    return { name: gung(y.palaceNames[i]), marks: [...trans[i].map((t) => KIND_HANJA[t]), ...stars], tone: net > 0 ? 'good' : net < 0 ? 'bad' : 'neutral' }
  })

  const natalAtLife = gung(a.palaces[life].name)
  const dec = h.decadal.index >= 0 ? a.palaces[h.decadal.index] : undefined
  const landName = (kind: number) => (at[kind] >= 0 ? gung(y.palaceNames[at[kind]]) : '없음')

  const facts = [
    { label: '유년 명궁', value: `${y.earthlyBranch}궁 · 본명 ${natalAtLife} 자리` },
    { label: '유년', value: stemName },
    { label: '대한', value: dec ? `${dec.decadal.range[0]}~${dec.decadal.range[1]}세 · 본명 ${gung(dec.name)}` : '확인 불가' },
    ...[0, 1, 2, 3].map((k) => ({ label: `${KIND_HANJA[k]} 궁`, value: landName(k) })),
  ]

  const flow = score >= 65 ? '비교적 순조롭게 흐르기 쉬운' : score >= 45 ? '무난하게 흐르기 쉬운' : '차분히 속도를 늦추는 편이 좋은'
  const headline = `${year}년은 ${at[0] >= 0 ? `화록이 ${landName(0)}에` : '화록 없이'} 들고 화기가 ${landName(3)}에 들어 ${flow} 해입니다`

  // narrative: every sentence is built from the chart facts
  const mainStars = a.palaces[life].majorStars.map((s) => s.name)
  const bm = brightMean(a, life)
  const hourNote = input.unknownTime ? ' (태어난 시각을 몰라 정오 12시로 가정한 결과입니다)' : ''
  const starNote = mainStars.length
    ? `이 자리에는 ${josa(mainStars.join('·'), '이', '가')} 있어 ${bm >= 1 ? '별의 힘이 받쳐 주는 편입니다' : bm <= -1 ? '별의 힘이 약해 무리하지 않는 편이 좋습니다' : '별의 힘이 보통 수준입니다'}.`
    : '이 자리에는 주성이 없어 맞은편 천이궁의 별을 빌려 읽습니다.'
  const p1 = `${year}년(${stemName})의 유년 명궁(流年命宮)은 본명반의 ${natalAtLife} 자리에 놓입니다${hourNote}. 그래서 올해는 ${josa(topic(a.palaces[life].name), '이', '가')} 한 해의 주제로 떠오르기 쉽습니다. ${starNote}`
  const p2 = [0, 1, 2, 3].filter((k) => at[k] >= 0).map((k) => {
    const name = y.palaceNames[at[k]]
    return `${KIND_KO[k]} 유년 ${gung(name)}에 들어, ${MEANING[k](topic(name))}.`
  }).join(' ')
  const p3 = dec
    ? `현재 대한(大限)은 ${dec.decadal.range[0]}세부터 ${dec.decadal.range[1]}세까지이며 본명 ${gung(dec.name)}에 해당합니다. 이 십 년은 ${topic(dec.name)}에 무게가 실리기 쉬운 시기이고, 올해의 사화는 그 큰 흐름 위에서 읽는 것이 좋습니다.`
    : '현재 대한(大限) 정보를 확인할 수 없어 유년 사화만으로 읽었습니다.'
  const sorted = [...bars].sort((p, q) => q.score - p.score)
  const top = sorted[0]
  const low = sorted[sorted.length - 1]
  const p4 = `네 가지 주제로 보면 ${josa(top.label, '이', '가')} 상대적으로 가장 수월하고(${top.score}점), ${josa(low.label, '은', '는')} 가장 신경 쓸 부분(${low.score}점)으로 나옵니다. 종합 점수는 ${score}점이며, 사화와 별의 밝기를 단순한 규칙으로 더한 참고 값입니다.`

  const cautions: string[] = []
  if (input.unknownTime) cautions.push('태어난 시각을 몰라 12시로 가정했습니다. 명반이 달라질 수 있어 참고만 하세요.')
  if (at[3] >= 0) cautions.push(`화기가 유년 ${gung(y.palaceNames[at[3]])}에 들어, ${topic(y.palaceNames[at[3]])} 쪽은 서두르지 않는 편이 좋습니다.`)
  if (trans[life].includes(3)) cautions.push('명궁에 화기가 걸려 큰 결정은 한 번 더 생각해 보는 편이 좋습니다.')
  cautions.push('자미두수는 재미와 참고용입니다. 재물·건강·법적 문제는 전문가와 상의하세요.')

  const explain = {
    palaces: '12칸은 올해의 유년 명궁에서 시작해 형제궁, 부처궁 순서로 이어지는 올해의 궁 배치입니다. 칸 안의 화록(化祿)·화권(化權)·화과(化科)는 올해 천간이 일으키는 도움이 되는 변화이고, 화기(化忌)는 마음 쓸 일이 생기기 쉬운 자리입니다. 별 이름은 그 칸의 주성입니다. 표시가 있는 칸이 올해 눈여겨볼 영역입니다.',
    bars: '재물은 재백궁, 직업은 관록궁, 연애는 부처궁, 건강은 질액궁을 읽은 점수입니다. 50점이 보통이고, 화록·화권·화과가 들어오거나 주성이 밝으면 올라가며, 화기가 들어오면 내려갑니다. 건강 점수는 생활 습관을 돌아보는 참고용입니다.',
    months: '1월부터 12월까지 달마다 같은 방식으로 읽은 점수입니다(각 달 15일 기준). 올해 전체 점수의 영향을 조금 받고, 그 달의 사화가 명궁·재백궁·관록궁·천이궁에 닿는지로 오르내립니다. 낮은 달은 서두르지 말고 일정에 여유를 두라는 신호로 보세요.',
  }

  return {
    system: 'ziwei', year, score, headline, facts, bars, months: monthScores(a, year, score), palaces, explain,
    narrative: [p1, p2, p3, p4].filter(Boolean), cautions: cautions.slice(0, 5),
  }
}

export function computeZiweiYearly(input: BirthInput, years: number[]): SystemYear[] | null {
  try {
    if (!validate(input) || !Array.isArray(years) || !years.length || !years.every(Number.isInteger)) return null
    const a = buildChart(input)
    return years.map((yr) => computeOne(a, input, yr))
  } catch {
    return null
  }
}
