// 3개년운세 공용 계산 헬퍼 — 화면(ThreeYearView)과 스냅샷 리포트가 함께 사용한다.
// 전부 결정론(난수 없음, 시드 고정).
import { josa } from '../utils/josa.ts'

// ---- 십신(十神): 일간 vs 대상 천간 ----
const STEM_INFO: Record<string, { el: string; yang: boolean }> = {
  갑: { el: '목', yang: true }, 을: { el: '목', yang: false },
  병: { el: '화', yang: true }, 정: { el: '화', yang: false },
  무: { el: '토', yang: true }, 기: { el: '토', yang: false },
  경: { el: '금', yang: true }, 신: { el: '금', yang: false },
  임: { el: '수', yang: true }, 계: { el: '수', yang: false },
}
const GENERATES: Record<string, string> = { 목: '화', 화: '토', 토: '금', 금: '수', 수: '목' }
const CONTROLS: Record<string, string> = { 목: '토', 토: '수', 수: '화', 화: '금', 금: '목' }


export function tenGodOf(dayStem: string, targetStem: string): string {
  const d = STEM_INFO[dayStem], t = STEM_INFO[targetStem]
  if (!d || !t) return ''
  const same = d.yang === t.yang
  if (d.el === t.el) return same ? '비견(比肩)' : '겁재(劫財)'
  if (GENERATES[d.el] === t.el) return same ? '식신(食神)' : '상관(傷官)'
  if (CONTROLS[d.el] === t.el) return same ? '편재(偏財)' : '정재(正財)'
  if (CONTROLS[t.el] === d.el) return same ? '편관(偏官)' : '정관(正官)'
  return same ? '편인(偏印)' : '정인(正印)'
}

/** 세운 십신별 한 해 키워드 (결정론 서술) */
export const TEN_GOD_THEME: Record<string, string> = {
  '비견(比肩)': '내 힘이 보강되는 해 — 자립·협업·체력전에 유리하지만 지출 경쟁도 늘어납니다.',
  '겁재(劫財)': '경쟁과 분배의 해 — 동업·투자에는 신중하고, 실력으로 승부처를 잡는 것이 좋습니다.',
  '식신(食神)': '표현과 생산의 해 — 새 결과물·수입원을 만들기 좋고 건강 관리의 효과가 잘 붙습니다.',
  '상관(傷官)': '재능 발산의 해 — 성과가 눈에 띄기 쉬우나 말·문서로 인한 구설을 조심해야 합니다.',
  '편재(偏財)': '기회 재물의 해 — 유동적인 수입·투자 기회가 늘지만 변동성 관리가 핵심입니다.',
  '정재(正財)': '안정 재물의 해 — 꾸준한 수입·저축·계약에 유리하고 성실함이 그대로 성과가 됩니다.',
  '편관(偏官)': '도전과 압박의 해 — 책임이 커지는 만큼 지위가 오를 수 있으나 과로·사고수를 조심합니다.',
  '정관(正官)': '명예와 승진의 해 — 조직·시험·계약 등 공식적인 성취에 유리한 흐름입니다.',
  '편인(偏印)': '전환과 학습의 해 — 자격·공부·이직 준비에 좋고, 문서 계약은 이중 확인이 필요합니다.',
  '정인(正印)': '후원과 문서의 해 — 귀인·합격·승인 운이 따르고 배움에 투자할수록 이득입니다.',
}

// ---- 삼재(三災) ----
const SAMJAE_GROUP: [string[], string[]][] = [
  [['신', '자', '진'], ['인', '묘', '진']],
  [['인', '오', '술'], ['신', '유', '술']],
  [['사', '유', '축'], ['해', '자', '축']],
  [['해', '묘', '미'], ['사', '오', '미']],
]
export function samjaeOf(birthBranch: string, yearBranch: string): string | null {
  for (const [births, years] of SAMJAE_GROUP) {
    if (births.includes(birthBranch)) {
      const idx = years.indexOf(yearBranch)
      if (idx === 0) return '들삼재'
      if (idx === 1) return '눌삼재'
      if (idx === 2) return '날삼재'
      return null
    }
  }
  return null
}

// ---- 결정론 시드 난수 (별자리 연운용 — Math.random 금지) ----
export function seededSeq(seed: number): () => number {
  let s = seed >>> 0
  return () => {
    s = (Math.imul(s, 1103515245) + 12345) >>> 0
    return (s >>> 8) / 16777216
  }
}

export function scoreBandLabel(v: number): string {
  if (v >= 75) return '강한 상승'
  if (v >= 60) return '순풍'
  if (v >= 45) return '보합'
  return '수비 우선'
}

export const OFFSET_LABEL = ['올해', '내년', '내후년']

/** 관심사 순위(클릭률) — 재물 → 직장·성공 → 연애·결혼 → 건강·사고 */
export const THEME_RANK = [
  { rank: 1, key: '재물운', emoji: '💰', field: 'wealth' as const, desc: '투자 성과 · 자산 축적 · 예상치 못한 지출 방지' },
  { rank: 2, key: '직장운·성공운', emoji: '💼', field: 'career' as const, desc: '이직 · 승진 · 창업 · 계약 · 시험 합격' },
  { rank: 3, key: '연애운·결혼운', emoji: '💗', field: 'relationship' as const, desc: '인연의 등장 · 관계 확장 · 갈등 해결' },
  { rank: 4, key: '건강운·사고수', emoji: '🌿', field: 'health' as const, desc: '질병 예방 · 스트레스 관리 · 안전사고 예방' },
]

export function themeAdvice(score: number): string {
  return score >= 60 ? '적극적으로 움직일수록 이득입니다.' : score >= 45 ? '무리한 확장보다 내실을 다지기 좋습니다.' : '방어적으로 운용하고 큰 결정은 좋은 달로 미루세요.'
}

// =====================================================================
// 서사형 풀이 생성 — 전문 운세 서비스 수준의 다문장 해설 (전부 결정론)
// 화면(ThreeYearView)과 스냅샷 리포트가 동일한 문장을 공유한다.
// =====================================================================

/** 월운 최소 형태 (vendor WolunAnalysis에서 쓰는 필드만) */
export interface MonthLite {
  month: number
  monthPillar: string
  fortune: { overall: string; score: number; career: number; wealth: number; health: number; relationship: number }
  characteristics: { keywords: string[]; opportunities: string[]; cautions: string[] }
  advice: { doList: string[]; dontList: string[] }
}

export interface YearCtx {
  name: string
  targetYear: number
  yearLabel: string          // 올해/내년/내후년
  yearStem: string
  yearBranch: string
  dayStem: string
  birthBranch: string        // 생년 지지 (띠)
  tenGod: string
  samjae: string | null
  strengthLevel: string      // very_strong | strong | medium | weak | very_weak
  yongPrimary: string | null
  yongSecondary: string | null
  xiSin: string[]
  jiSin: string[]
  months: MonthLite[]
}

const STRENGTH_KR: Record<string, string> = {
  very_strong: '극신강', strong: '신강', medium: '중화', weak: '신약', very_weak: '극신약',
}

function peakMonth(months: MonthLite[], field: 'score' | 'career' | 'wealth' | 'health' | 'relationship') {
  return months.reduce((a, m) => ((field === 'score' ? m.fortune.score : m.fortune[field]) > (field === 'score' ? a.fortune.score : a.fortune[field]) ? m : a), months[0])
}
function troughMonth(months: MonthLite[], field: 'score' | 'career' | 'wealth' | 'health' | 'relationship') {
  return months.reduce((a, m) => ((field === 'score' ? m.fortune.score : m.fortune[field]) < (field === 'score' ? a.fortune.score : a.fortune[field]) ? m : a), months[0])
}

// ---- 띠(생년 지지)와 세운 지지의 관계 — 육합·충·삼합 (띠별 운세 요소) ----
const BRANCH_ANIMAL: Record<string, string> = {
  자: '쥐띠', 축: '소띠', 인: '호랑이띠', 묘: '토끼띠', 진: '용띠', 사: '뱀띠',
  오: '말띠', 미: '양띠', 신: '원숭이띠', 유: '닭띠', 술: '개띠', 해: '돼지띠',
}
const YUKHAP: Record<string, string> = { 자: '축', 축: '자', 인: '해', 해: '인', 묘: '술', 술: '묘', 진: '유', 유: '진', 사: '신', 신: '사', 오: '미', 미: '오' }
const CHUNG: Record<string, string> = { 자: '오', 오: '자', 축: '미', 미: '축', 인: '신', 신: '인', 묘: '유', 유: '묘', 진: '술', 술: '진', 사: '해', 해: '사' }
const SAMHAP: string[][] = [['신', '자', '진'], ['인', '오', '술'], ['사', '유', '축'], ['해', '묘', '미']]

/** 띠별 문장 — 생년 지지 vs 세운 지지 */
export function animalYearLine(birthBranch: string, yearBranch: string, targetYear: number): string {
  const animal = BRANCH_ANIMAL[birthBranch] ?? ''
  if (!animal) return ''
  if (birthBranch === yearBranch) return `${animal}에게 ${targetYear}년은 자신의 해(본명년)로, 존재감이 커지는 만큼 변화의 진폭도 큰 한 해입니다.`
  if (YUKHAP[birthBranch] === yearBranch) return `${animal}에게 ${targetYear}년은 세운과 육합(六合)을 이루는 해라 귀인의 도움과 화합의 기운이 유난히 잘 붙습니다.`
  if (CHUNG[birthBranch] === yearBranch) return `${animal}에게 ${targetYear}년은 세운과 충(沖)이 되는 해라 이동·변동수가 많으니, 변화를 피하기보다 계획된 변화로 바꾸는 것이 상책입니다.`
  if (SAMHAP.some((g) => g.includes(birthBranch) && g.includes(yearBranch))) return `${animal}에게 ${targetYear}년은 세운과 삼합(三合)의 기운이 통하는 해라 협력·모임에서 기회가 만들어집니다.`
  return ''
}

/** ① 종합운 서사 — 4~7문장 */
export function overallNarrative(ctx: YearCtx): string {
  const s: string[] = []
  const strengthKr = STRENGTH_KR[ctx.strengthLevel] ?? '중화'
  s.push(`${ctx.targetYear}년은 ${ctx.yearStem}${ctx.yearBranch}년으로, ${ctx.name}님의 일간 ${ctx.dayStem}(${STRENGTH_LABEL(ctx.dayStem)})에게 ${ctx.tenGod}${josa(ctx.tenGod, '이', '가')} 들어오는 해입니다.`)
  s.push(TEN_GOD_THEME[ctx.tenGod] ?? '')
  s.push(animalYearLine(ctx.birthBranch, ctx.yearBranch, ctx.targetYear))
  if (ctx.yongPrimary) {
    const favorable = ctx.xiSin.length > 0 ? ` 특히 ${ctx.xiSin.join('·')} 기운이 도우니 해당 색상·방향·활동을 가까이하면 흐름이 부드러워집니다.` : ''
    s.push(`${ctx.name}님의 명은 ${strengthKr} 사주로, 올해의 열쇠가 되는 오행은 ${ctx.yongPrimary}${ctx.yongSecondary ? `(보조 ${ctx.yongSecondary})` : ''}입니다.${favorable}`)
    if (ctx.jiSin.length > 0) s.push(`반대로 ${ctx.jiSin.join('·')} 기운이 강해지는 시기·장소·일에는 무리하지 않는 것이 좋습니다.`)
  }
  const fh = Math.round(ctx.months.slice(0, 6).reduce((a, m) => a + m.fortune.score, 0) / 6)
  const sh = Math.round(ctx.months.slice(6).reduce((a, m) => a + m.fortune.score, 0) / 6)
  const best = peakMonth(ctx.months, 'score'), worst = troughMonth(ctx.months, 'score')
  s.push(fh === sh
    ? `한 해의 기세는 상·하반기가 고르게 흐르며, 정점은 ${best.month}월(${best.monthPillar})이고 고비는 ${worst.month}월(${worst.monthPillar})입니다.`
    : fh > sh
      ? `기세는 상반기(평균 ${fh}점)에 먼저 열리니 중요한 시작은 앞당기고, 하반기(평균 ${sh}점)는 수확과 정리에 쓰는 것이 좋습니다. 정점은 ${best.month}월, 고비는 ${worst.month}월입니다.`
      : `상반기(평균 ${fh}점)는 씨를 뿌리는 준비의 시간이고, 하반기(평균 ${sh}점)에 본 승부가 열립니다. 정점은 ${best.month}월, 고비는 ${worst.month}월입니다.`)
  if (ctx.samjae) s.push(`아울러 올해는 ${ctx.samjae}에 해당하므로, 큰 계약·이동·확장은 길한 달을 골라 신중히 진행하는 것이 안전합니다.`)
  return s.filter(Boolean).join(' ')
}

function STRENGTH_LABEL(stem: string): string {
  const m: Record<string, string> = {
    갑: '큰 나무', 을: '화초', 병: '태양', 정: '촛불', 무: '큰 산', 기: '옥토', 경: '무쇠', 신: '보석', 임: '큰 물', 계: '이슬비',
  }
  return m[stem] ?? ''
}

/** 십신 → 주제별 가산 코멘트 */
const THEME_TEN_GOD_HINT: Record<string, Partial<Record<'wealth' | 'career' | 'relationship' | 'health', string>>> = {
  '편재(偏財)': { wealth: '세운 자체가 편재(偏財)의 해라 유동 자금·투자 기회가 평년보다 많이 지나갑니다. 기회가 잦은 만큼 원금을 지키는 규칙을 먼저 세우세요.' },
  '정재(正財)': { wealth: '세운이 정재(正財)의 해라 성실 소득·저축·장기 계약에 힘이 실립니다. 화려한 한 방보다 꾸준함이 통장을 불립니다.' },
  '편관(偏官)': { career: '세운이 편관(偏官)의 해라 책임과 부담이 커지는 대신 자리가 오르는 승부처가 옵니다. 건강 관리가 곧 커리어 관리입니다.', health: '편관(偏官)의 해에는 과로·사고수가 따라오기 쉬우니 속도를 줄이고 안전을 점검하세요.' },
  '정관(正官)': { career: '세운이 정관(正官)의 해라 승진·합격·공식 계약 등 이름이 걸리는 성취에 유리합니다. 원칙대로 움직일수록 결과가 좋습니다.' },
  '식신(食神)': { health: '식신(食神)의 해에는 몸을 돌보는 노력의 효과가 잘 붙습니다. 식습관 개선·꾸준한 운동을 시작하기 최적입니다.', relationship: '식신(食神)의 해에는 표현이 부드러워져 관계의 문이 자연스럽게 열립니다.' },
  '상관(傷官)': { relationship: '상관(傷官)의 해에는 매력이 드러나는 대신 말로 얻고 말로 잃기 쉽습니다. 표현은 풍부하게, 언약은 신중하게 하세요.', career: '상관(傷官)의 해에는 상사·조직과의 마찰이 생기기 쉬우니 성과로 말하게 하세요.' },
  '편인(偏印)': { career: '편인(偏印)의 해라 이직·자격·재교육 등 방향 전환의 준비에 특히 좋습니다. 문서는 이중으로 확인하세요.' },
  '정인(正印)': { career: '정인(正印)의 해라 시험·승인·문서운이 따릅니다. 배움에 투자한 것이 이력으로 돌아옵니다.' },
  '비견(比肩)': { wealth: '비견(比肩)의 해에는 나가는 돈도 함께 늘기 쉽습니다. 공동 지출·보증은 선을 그어 두세요.' },
  '겁재(劫財)': { wealth: '겁재(劫財)의 해에는 재물이 분산되기 쉬우니 동업·큰 투자 앞에서 두 번 계산하세요.' },
}

/** ② 주제별 서사 — 각 3~5문장 */
export function themeNarrative(ctx: YearCtx, field: 'wealth' | 'career' | 'relationship' | 'health', label: string): string {
  const avg = Math.round(ctx.months.reduce((a, m) => a + m.fortune[field], 0) / Math.max(1, ctx.months.length))
  const peak = peakMonth(ctx.months, field), trough = troughMonth(ctx.months, field)
  const band = scoreBandLabel(avg)
  const s: string[] = []
  s.push(avg >= 60
    ? `${ctx.targetYear}년 ${ctx.name}님의 ${label}${josa(label, '은', '는')} 연평균 ${avg}점으로 ${band}의 흐름입니다.`
    : avg >= 45
      ? `${ctx.targetYear}년 ${ctx.name}님의 ${label}${josa(label, '은', '는')} 연평균 ${avg}점의 ${band} 흐름 — 크게 밀어붙이기보다 때를 고르는 해입니다.`
      : `${ctx.targetYear}년 ${ctx.name}님의 ${label}${josa(label, '은', '는')} 연평균 ${avg}점으로 수비가 우선입니다. 잃지 않는 것이 버는 것입니다.`)
  const hint = THEME_TEN_GOD_HINT[ctx.tenGod]?.[field]
  if (hint) s.push(hint)
  s.push(`달의 흐름으로는 ${peak.month}월(${peak.monthPillar}, ${Math.round(peak.fortune[field])}점)에 기회가 가장 크게 열리고, ${trough.month}월(${trough.monthPillar}, ${Math.round(trough.fortune[field])}점)에는 속도를 늦추는 것이 좋습니다.`)
  if (field === 'wealth') s.push(avg >= 55 ? `굳히기 좋은 달(${peak.month}월) 전후로 저축·투자 계획을 실행하고, ${trough.month}월의 충동 지출·즉흥 투자만 피하면 곳간이 채워지는 해입니다.` : `${trough.month}월 전후의 큰 지출 약속은 미루고, 반복 지출(구독·수수료)을 정리하는 것만으로도 수지가 개선됩니다.`)
  if (field === 'career') s.push(avg >= 55 ? `이직·승진 제안이나 시험 일정은 ${peak.month}월 전후에 배치하면 순풍을 탑니다.` : `직장에서는 새 판을 벌이기보다 실적을 문서로 남기는 데 집중하면 다음 해의 도약대가 됩니다.`)
  if (field === 'relationship') s.push(avg >= 55 ? `새 인연이든 기존 관계든 ${peak.month}월의 만남 자리를 놓치지 마세요. 관계의 온도가 가장 높은 시기입니다.` : `관계에서는 서두르지 말고 오래된 인연을 다지는 데 마음을 쓰면 갈등이 줄어듭니다.`)
  if (field === 'health') s.push(avg >= 55 ? `컨디션이 받쳐주는 해이니 ${peak.month}월부터 운동 루틴을 만들어 두면 몸이 오래 기억합니다.` : `${trough.month}월 전후로 피로가 몰릴 수 있으니 수면·검진을 미리 챙기고 무리한 일정은 나누어 잡으세요.`)
  return s.join(' ')
}

/** ⑤ 조심할 점 서사 */
export function cautionNarrative(ctx: YearCtx): { intro: string | null; donts: string[]; worstLine: string } {
  const worst = troughMonth(ctx.months, 'score')
  const dontCount = new Map<string, number>()
  for (const m of ctx.months) for (const d of m.advice.dontList) dontCount.set(d, (dontCount.get(d) ?? 0) + 1)
  const donts = [...dontCount.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([d]) => d)
  const intro = ctx.samjae
    ? `${ctx.targetYear}년은 ${ctx.name}님의 ${ctx.samjae}에 해당합니다. 삼재라 하여 모든 일이 막히는 것은 아니나, 큰 계약·이사·확장 같은 되돌리기 어려운 결정은 길한 달을 골라 진행하고 문서와 안전을 이중으로 확인하는 지혜가 필요합니다.`
    : null
  const worstLine = `${worst.month}월(${worst.monthPillar})은 한 해 중 기운이 가장 낮은 달입니다. 이 달의 주의: ${worst.characteristics.cautions[0] ?? '무리한 확장'}. 큰 결정은 앞뒤 달로 옮기는 것이 좋습니다.`
  return { intro, donts, worstLine }
}
