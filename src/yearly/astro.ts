// Astrology yearly fortune: slow-planet transits to natal Sun / Moon / Ascendant. Own work, public astrology conventions.
//
// Scoring rule (deterministic, 0..100):
//  1. Start at 50. A transit hit = planet + aspect + natal point, inside the orb (Jupiter/Saturn 3 deg, outer 2 deg).
//  2. Points = weight x closeness x natal weight. closeness = 1 - orb/maxOrb. Natal weight: Sun/Asc 1.0, Moon 0.8.
//     Weights: Jupiter easy (conj, sextile, trine) +15, Saturn hard -15 / easy +5, Pluto hard -12, Uranus hard -12, Neptune hard -8, others 0.
//  3. Month score = 50 + points of that month's 15th-day sample + house modifier (Jupiter in 2/5/9/11 = +3, Saturn in 1/4/7/10 = -3).
//     Year bars use each distinct aspect once at its closest approach; year score = 50 + sum of the three bar offsets, clamped.
import { calculateAscendant } from '../engine/asc'
import { birthInstantUtc, planetLongitudes } from '../engine/planets'
import type { PlanetName } from '../engine/planets'
import type { BirthInput, ZodiacSign } from '../engine/types'
import { ZODIACS } from '../starsign'
import { josa } from '../utils/josa'
import type { AspectItem, BarItem, SystemYear } from './types'

type Slow = 'Jupiter' | 'Saturn' | 'Uranus' | 'Neptune' | 'Pluto'
type NatalKey = 'Sun' | 'Moon' | 'Asc'
type AspectKey = 'conj' | 'sext' | 'sq' | 'tri' | 'opp'

const SLOW: Slow[] = ['Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto']
const SIGNS: ZodiacSign[] = ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo', 'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces']
const SIGN_KO = Object.fromEntries(ZODIACS.map((z) => [z.en, z.ko])) as Record<ZodiacSign, string>
const ASPECTS: Record<AspectKey, { angle: number; sym: string; ko: string; easy: boolean }> = {
  conj: { angle: 0, sym: '☌', ko: '합(合)', easy: true },
  sext: { angle: 60, sym: '⚹', ko: '육분(六分)', easy: true },
  sq: { angle: 90, sym: '□', ko: '사각(四角)', easy: false },
  tri: { angle: 120, sym: '△', ko: '삼분(三分)', easy: true },
  opp: { angle: 180, sym: '☍', ko: '충(衝)', easy: false },
}
const PLANET_KO: Record<Slow, string> = { Jupiter: '목성', Saturn: '토성', Uranus: '천왕성', Neptune: '해왕성', Pluto: '명왕성' }
const NATAL_KO: Record<NatalKey, string> = { Sun: '태양', Moon: '달', Asc: '상승점' }
const NATAL_W: Record<NatalKey, number> = { Sun: 1, Moon: 0.8, Asc: 1 }
const ORB: Record<Slow, number> = { Jupiter: 3, Saturn: 3, Uranus: 2, Neptune: 2, Pluto: 2 }
const WEIGHT: Record<Slow, { easy: number; hard: number }> = {
  Jupiter: { easy: 15, hard: 0 },
  Saturn: { easy: 5, hard: -15 },
  Uranus: { easy: 0, hard: -12 },
  Neptune: { easy: 0, hard: -8 },
  Pluto: { easy: 0, hard: -12 },
}
const THEME: Record<Slow, string> = {
  Jupiter: '확장과 기회', Saturn: '책임과 정리', Uranus: '변화와 새로운 시도', Neptune: '감수성과 이상', Pluto: '깊은 변환',
}
const JUPITER_HOUSE_BONUS = new Set([2, 5, 9, 11])
const SATURN_HOUSE_PENALTY = new Set([1, 4, 7, 10])
const HOUSE_THEME = [
  '자기 자신과 첫인상', '일과 살림의 기반', '배움과 소통', '가정과 마음의 뿌리', '즐거움과 창작',
  '건강 습관과 일상 루틴', '동반자와 협력', '공유 자원과 깊은 유대', '여행과 더 넓은 배움', '직업과 사회적 역할',
  '친구와 모임', '쉼과 내면 정리',
]
const ELEMENT_TONE = ['불의 기운이 강해 추진력 있게', '흙의 기운이 강해 차분하고 현실적으로', '바람의 기운이 강해 가볍고 호기심 있게', '물의 기운이 강해 감정과 공감을 중심으로']

const clamp = (v: number) => Math.max(0, Math.min(100, Math.round(v)))
const norm = (d: number) => ((d % 360) + 360) % 360
const sep = (a: number, b: number) => { const d = Math.abs(norm(a) - norm(b)) % 360; return Math.min(d, 360 - d) }
const signIdx = (lon: number) => Math.floor(norm(lon) / 30) % 12

interface Hit { planet: Slow; natal: NatalKey; asp: AspectKey; orb: number; closeness: number; points: number }

/** Aspect hits of the five slow planets against the natal points for one sample. */
function hitsAt(lons: Record<PlanetName, { longitude: number }>, natal: Partial<Record<NatalKey, number>>): Hit[] {
  const out: Hit[] = []
  for (const planet of SLOW) {
    for (const natalKey of Object.keys(natal) as NatalKey[]) {
      const s = sep(lons[planet].longitude, natal[natalKey]!)
      for (const asp of Object.keys(ASPECTS) as AspectKey[]) {
        const orb = Math.abs(s - ASPECTS[asp].angle)
        if (orb > ORB[planet]) continue
        const closeness = 1 - orb / ORB[planet]
        // Saturn and the outer planets: a conjunction counts as hard, not easy.
        const easy = ASPECTS[asp].easy && !(asp === 'conj' && planet !== 'Jupiter')
        const weight = easy ? WEIGHT[planet].easy : WEIGHT[planet].hard
        out.push({ planet, natal: natalKey, asp, orb, closeness, points: weight * closeness * NATAL_W[natalKey] })
      }
    }
  }
  return out
}

const labelOf = (h: Hit) => `${PLANET_KO[h.planet]} ${ASPECTS[h.asp].sym} ${NATAL_KO[h.natal]}`
const toneOf = (h: Hit): AspectItem['tone'] => (h.points > 0 ? 'good' : h.points < 0 ? 'hard' : 'neutral')
const mode = (xs: number[]) => {
  const c = new Map<number, number>()
  for (const x of xs) c.set(x, (c.get(x) ?? 0) + 1)
  return [...c.entries()].sort((a, b) => b[1] - a[1] || a[0] - b[0])[0][0]
}

export function computeAstroYearly(input: BirthInput, years: number[]): SystemYear[] | null {
  const utc = birthInstantUtc(input)
  if (!utc || !Array.isArray(years) || !years.every(Number.isInteger)) return null
  const unknown = !!input.unknownTime
  const nat = planetLongitudes(utc)
  const asc = unknown ? null : calculateAscendant(input)
  if (!unknown && !asc) return null
  const natal: Partial<Record<NatalKey, number>> = { Sun: nat.Sun.longitude }
  if (!unknown) { natal.Moon = nat.Moon.longitude; natal.Asc = asc!.longitude }
  const ascIdx = asc ? SIGNS.indexOf(asc.sign) : -1
  const houseOf = (lon: number) => (signIdx(lon) - ascIdx + 12) % 12 + 1

  return years.map((year): SystemYear => {
    const samples = Array.from({ length: 12 }, (_, m) => planetLongitudes(new Date(Date.UTC(year, m, 15, 12))))
    const monthHits = samples.map((s) => hitsAt(s, natal))
    const jHouses = asc ? samples.map((s) => houseOf(s.Jupiter.longitude)) : []
    const sHouses = asc ? samples.map((s) => houseOf(s.Saturn.longitude)) : []
    const jBonus = (m: number) => (asc && JUPITER_HOUSE_BONUS.has(jHouses[m]) ? 3 : 0)
    const sBonus = (m: number) => (asc && SATURN_HOUSE_PENALTY.has(sHouses[m]) ? -3 : 0)

    // Distinct aspects at their closest approach during the year.
    const best = new Map<string, Hit>()
    for (const hs of monthHits) for (const h of hs) {
      const k = labelOf(h)
      if (!best.has(k) || best.get(k)!.orb > h.orb) best.set(k, h)
    }
    const all = [...best.values()].sort((a, b) => b.closeness - a.closeness || labelOf(a).localeCompare(labelOf(b)))
    const sumOf = (pl: Slow[]) => all.filter((h) => pl.includes(h.planet)).reduce((s, h) => s + h.points, 0)
    const avg = (f: (m: number) => number) => Array.from({ length: 12 }, (_, m) => f(m)).reduce((a, b) => a + b, 0) / 12
    const jOff = sumOf(['Jupiter']) + avg(jBonus)
    const sOff = sumOf(['Saturn']) + avg(sBonus)
    const oOff = sumOf(['Uranus', 'Neptune', 'Pluto'])
    const bars: BarItem[] = [
      { label: '재물·성장(목성)', score: clamp(50 + jOff) },
      { label: '책임·시련(토성)', score: clamp(50 + sOff) },
      { label: '변화(천왕성·해왕성·명왕성)', score: clamp(50 + oOff) },
    ]
    const score = clamp(50 + jOff + sOff + oOff)
    const months = monthHits.map((hs, m) => ({
      month: m + 1,
      score: clamp(50 + hs.reduce((s, h) => s + h.points, 0) + jBonus(m) + sBonus(m)),
    }))
    const aspects: AspectItem[] = all.slice(0, 8).map((h) => ({ label: labelOf(h), tone: toneOf(h), strength: clamp(h.closeness * 100) }))
    const top = all[0]
    const topText = top ? `${labelOf(top)} ${ASPECTS[top.asp].ko}` : '뚜렷한 각 없음'
    const jHouse = asc ? mode(jHouses) : 0
    const sHouse = asc ? mode(sHouses) : 0
    const jSign = SIGN_KO[SIGNS[signIdx(samples[5].Jupiter.longitude)]]
    const sSign = SIGN_KO[SIGNS[signIdx(samples[5].Saturn.longitude)]]

    const facts = asc
      ? [
          { label: '상승궁', value: SIGN_KO[asc.sign] },
          { label: '목성 하우스', value: `${jHouse}하우스` },
          { label: '토성 하우스', value: `${sHouse}하우스` },
          { label: '가장 강한 각', value: topText },
        ]
      : [
          { label: '목성 위치', value: jSign },
          { label: '토성 위치', value: sSign },
          { label: '가장 강한 각', value: topText },
        ]

    const headline = top
      ? `${PLANET_KO[top.planet]}의 ${ASPECTS[top.asp].ko}이 ${NATAL_KO[top.natal]}에 닿는 해, ${THEME[top.planet]}${josa(THEME[top.planet], '이', '가')} 화두`
      : `큰 별들의 뚜렷한 각이 없는 고요한 해${asc ? `, 목성은 ${jHouse}하우스` : ''}`

    return {
      system: 'astro', year, score, headline, facts, bars, months, aspects,
      explain: {
        aspects: '각(角)은 올해 움직이는 느린 행성이 태어난 때의 태양·달·상승점과 이루는 각도입니다. 막대가 길수록 각이 정확하게 맞는 것이고, 초록은 부드러운 흐름, 빨강은 긴장, 회색은 중립으로 읽습니다.',
        months: '매달 15일의 하늘을 기준으로 계산한 달별 점수입니다. 막대가 높은 달은 비교적 흐름이 부드럽고, 낮은 달은 긴장 각이나 하우스 영향이 큰 달로 참고하세요.',
        bars: '세 막대는 올해 별의 영향을 세 갈래로 나눈 점수입니다. 목성은 높을수록 확장과 기회, 토성은 높을수록 부담이 가볍고, 바깥 행성(천왕성·해왕성·명왕성)은 높을수록 변화가 잔잔하다는 뜻입니다. 50이 보통입니다.',
      },
      narrative: buildNarrative({ asc, nat, jHouse, sHouse, jSign, sSign, jHouses, sHouses, all, score }),
      cautions: buildCautions(all, unknown),
    }
  })
}

interface NarrIn {
  asc: { sign: ZodiacSign } | null; nat: Record<PlanetName, { longitude: number }>
  jHouse: number; sHouse: number; jSign: string; sSign: string; jHouses: number[]; sHouses: number[]
  all: Hit[]; score: number
}

function moveText(hs: number[]): string {
  const first = hs[0], last = hs[hs.length - 1]
  return first === last ? '' : ` 연중에는 ${first}하우스에서 ${last}하우스로 옮겨 가며 주제가 조금 달라집니다.`
}

function buildNarrative(n: NarrIn): string[] {
  const sunSign = SIGNS[signIdx(n.nat.Sun.longitude)]
  const el = ELEMENT_TONE[signIdx(n.nat.Sun.longitude) % 4]
  const out: string[] = []
  out.push(
    n.asc
      ? `태어난 때의 상승궁(上昇宮)은 ${SIGN_KO[n.asc.sign]}, 태양은 ${SIGN_KO[sunSign]}에 있습니다. 태양 별자리는 ${el} 움직이는 경향으로 읽습니다. 올해는 이 기본 바탕 위에 느린 행성들의 움직임이 겹쳐 보입니다.`
      : `출생 시각을 몰라 상승궁과 달은 계산에서 뺐고, 태양(${SIGN_KO[sunSign]})만 기준으로 봅니다. 태양 별자리는 ${el} 움직이는 경향으로 읽습니다.`,
  )
  out.push(
    n.asc
      ? `목성(木星)은 ${n.jHouse}하우스, 곧 ${HOUSE_THEME[n.jHouse - 1]}의 영역을 지나갑니다. 이 분야에서 기회와 배움이 늘어나기 쉬운 흐름으로 볼 수 있습니다.${moveText(n.jHouses)}`
      : `목성(木星)은 ${n.jSign} 부근을 지나며 확장과 기회의 분위기를 만듭니다. 하우스는 출생 시각이 있어야 정해집니다.`,
  )
  out.push(
    n.asc
      ? `토성(土星)은 ${n.sHouse}하우스, 곧 ${HOUSE_THEME[n.sHouse - 1]}의 영역에 머뭅니다. 이 분야에서는 책임과 정리를 요구받는 느낌이 들 수 있고, 차근차근 다지면 오래 가는 기반이 됩니다.${moveText(n.sHouses)}`
      : `토성(土星)은 ${n.sSign} 부근에서 책임과 정리의 주제를 다룹니다.`,
  )
  const top = n.all[0]
  if (top) {
    const asp = ASPECTS[top.asp]
    const second = n.all[1]
    const shape = top.points > 0 ? '부드럽게 이어지는' : top.points < 0 ? '긴장감 있게 맞서는' : '겹쳐 드러나는'
    out.push(
      `가장 정확한 각은 ${labelOf(top)} ${asp.ko}입니다. ${PLANET_KO[top.planet]}의 ${THEME[top.planet]} 주제가 ${NATAL_KO[top.natal]}과 ${shape} 모양입니다.` +
        (second ? ` 그다음으로 ${labelOf(second)}도 함께 작용합니다.` : ''),
    )
  } else {
    out.push('올해는 태양·달·상승점에 정확히 닿는 큰 행성의 각이 뚜렷하지 않습니다. 극적인 사건보다 일상의 흐름이 이어지는 해로 참고하세요.')
  }
  out.push(`종합 점수는 ${n.score}점으로, 50점이 보통입니다. 점성술은 재미와 참고를 위한 해석이며, 실제 결정은 본인의 상황을 우선해 판단하세요.`)
  return out
}

function buildCautions(all: Hit[], unknown: boolean): string[] {
  const c: string[] = []
  if (unknown) c.push('출생 시각을 몰라 달과 상승점은 계산에서 뺐습니다. 시각을 알면 더 정확해집니다.')
  const hard = all.find((h) => h.points < 0)
  if (hard) c.push(`${labelOf(hard)} 긴장 각이 있는 시기에는 서두르지 말고 일정과 계획에 여유를 두세요.`)
  if (all.some((h) => h.planet === 'Saturn' && h.points < 0)) c.push('토성의 압박이 느껴질 때는 무리한 약속을 줄이고 휴식을 챙기는 편이 좋습니다.')
  if (all.some((h) => (h.planet === 'Uranus' || h.planet === 'Pluto') && h.points < 0)) c.push('예상 밖의 변화가 있을 수 있으니 큰 결정은 한 번 더 살펴보고 정하세요.')
  c.push('이 내용은 재미와 참고용이며 건강·재정·법률 등 전문 판단을 대신하지 않습니다.')
  return c.slice(0, 5)
}
