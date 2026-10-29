// Juyeok (I Ching) yearly reading. Own work. One deterministic cast per target year from the birth date/time.
// For fun and reference only; it makes no claim about health, money, lawsuits or medicine.
//
// Score rule (0..100), transparent:
//   1. Start from the rating of the primary hexagram in src/data/hexagrams.ts (45..95).
//   2. With n changing lines, blend toward the changed hexagram's rating: weight w = min(n, 4) * 0.15 (0.15 .. 0.60).
//      score = round((1 - w) * primary + w * changed). No changing line: score = primary rating.
import type { BirthInput } from '../engine/types.ts'
import type { HexagramDraw, SystemYear } from './types.ts'
import { castHexagram, isChanging, seedFor, type Line } from '../engine/juyeok.ts'
import { hexagramByNo, type Hexagram } from '../data/hexagrams.ts'
import { castGuidance, changingCountGuide, changingLineDetail, hexagramImagery, josa } from '../data/juyeok-commentary.ts'

const POS = ['초효', '이효', '삼효', '사효', '오효', '상효']
// Sentences about money, health or law are dropped from the source text; the site gives no such claims.
const RISKY = /투자|재물|재산|건강|소송|법적|수입|저축|부동산|질병|수술|의료|병원/

/** True when the birth input is a real calendar date and a valid clock time. Shared by the tojeong module. */
export function validBirth(b: BirthInput): boolean {
  const { year, month, day, hour, minute } = b ?? ({} as BirthInput)
  if (![year, month, day, hour, minute].every(Number.isInteger)) return false
  if (year < 1900 || year > 2200 || hour < 0 || hour > 23 || minute < 0 || minute > 59) return false
  const d = new Date(Date.UTC(year, month - 1, day))
  return d.getUTCFullYear() === year && d.getUTCMonth() === month - 1 && d.getUTCDate() === day
}

const safeDetail = (h: Hexagram): string => h.detail.split(/(?<=\.)\s+/).filter((s) => !RISKY.test(s)).join(' ')

export function juyeokScore(primary: number, changed: number | undefined, n: number): number {
  if (changed === undefined || n === 0) return primary
  const w = Math.min(n, 4) * 0.15
  return Math.round((1 - w) * primary + w * changed)
}

export function computeJuyeokYearly(input: BirthInput, years: number[]): SystemYear[] | null {
  if (!validBirth(input) || !years.every(Number.isInteger)) return null
  const hour = input.unknownTime ? 12 : input.hour
  return years.map((year) => {
    const cast = castHexagram(seedFor(input.year, input.month, input.day, hour, year))
    const prim = hexagramByNo(cast.no)!
    const chg = cast.changedNo ? hexagramByNo(cast.changedNo)! : undefined
    const changing = cast.lines.flatMap((v, i) => (isChanging(v) ? [i] : []))
    const score = juyeokScore(prim.score, chg?.score, changing.length)
    const hexagram: HexagramDraw = { lines: cast.lines, no: prim.no, name: prim.name, ...(chg ? { changed: { no: chg.no, name: chg.name } } : {}) }
    const posText = changing.map((i) => POS[i]).join('·')
    const guide = castGuidance(score, cast.lines)
    const lineTexts = changing.slice(0, 2).map((i) => changingLineDetail(cast.lines[i] as Line, i))

    const narrative = [
      `${year}년의 본괘(本卦)는 ${prim.no}번 ${prim.name}(${prim.symbol})입니다. ${prim.summary}. ${safeDetail(prim)}`,
      hexagramImagery(cast.lines),
      chg
        ? `${posText}${josa(posText, '이', '가')} 변하는 효(爻)입니다. ${changingCountGuide(changing.length)} ${lineTexts.join(' ')} 변괘(變卦)는 ${chg.no}번 ${chg.name}${josa(chg.name, '으로', '로')}, ${chg.summary}는 방향을 가리킵니다.`
        : changingCountGuide(0),
      `실천 가이드 — 해 보기: ${guide.dos.join(' / ')}. 삼가기: ${guide.donts.join(' / ')}.`,
      '재미와 참고를 위한 풀이입니다. 건강·재산·법률·의료처럼 중요한 결정은 이 풀이로 정하지 말고 전문가와 상의하세요.',
    ]
    const cautions = [...guide.donts]
    if (chg && chg.score <= prim.score - 10) cautions.push('변괘로 갈수록 기운이 가라앉는 모양이니, 잘 풀릴 때일수록 속도를 늦추고 점검하기')
    if (changing.length >= 4) cautions.push('바뀌는 효가 많은 해이니, 한꺼번에 많은 것을 바꾸지 않기')
    if (score < 60) cautions.push('이 해의 괘는 신중함을 권하니, 일정에 여유를 두기')

    return {
      system: 'juyeok', year, score,
      headline: chg ? `${prim.name} → ${chg.name} · ${prim.summary}` : `${prim.name} · ${prim.summary}`,
      facts: [
        { label: '본괘', value: `${prim.no}번 ${prim.name}` },
        { label: '변괘', value: chg ? `${chg.no}번 ${chg.name}` : '없음' },
        { label: '변효 위치', value: posText || '없음' },
      ],
      hexagram,
      explain: {
        hexagram: `여섯 줄은 아래(초효)에서 위(상효)로 읽습니다. 이어진 줄(—)은 양, 끊어진 줄(- -)은 음입니다. 7과 8은 그대로 있는 효이고, 6(노음)과 9(노양)은 변하는 효입니다. ` +
          (chg ? `이 해에는 ${posText}${josa(posText, '이', '가')} 변하여 ${prim.name}${josa(prim.name, '이', '가')} ${chg.name}${josa(chg.name, '으로', '로')} 바뀝니다. 본괘는 지금의 모습, 변괘는 흘러가는 방향으로 읽습니다.` : '이 해에는 변하는 효가 없어 본괘의 뜻을 그대로 읽습니다.'),
      },
      narrative,
      cautions: cautions.slice(0, 5),
    } satisfies SystemYear
  })
}
