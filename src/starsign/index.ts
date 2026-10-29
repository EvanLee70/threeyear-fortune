// 별자리운세 엔진 — nanamix/korean-fortune-system (Apache-2.0)의
// ZodiacFortuneService.java를 TypeScript로 이식. 원본과 동일한 결과를 내도록
// java.util.Random(LCG)을 BigInt로 포팅했다 (같은 시드 → 같은 점수).

/** java.util.Random 48비트 LCG 포팅 */
class JavaRandom {
  private seed: bigint
  private static readonly MULT = 0x5deece66dn
  private static readonly ADD = 0xbn
  private static readonly MASK = (1n << 48n) - 1n
  constructor(seed: number) {
    this.seed = (BigInt(Math.trunc(seed)) ^ JavaRandom.MULT) & JavaRandom.MASK
  }
  private next(bits: number): number {
    this.seed = (this.seed * JavaRandom.MULT + JavaRandom.ADD) & JavaRandom.MASK
    return Number(this.seed >> BigInt(48 - bits))
  }
  nextInt(bound: number): number {
    if ((bound & -bound) === bound) return Number((BigInt(bound) * BigInt(this.next(31))) >> 31n)
    let bits: number, val: number
    do { bits = this.next(31); val = bits % bound } while (bits - val + (bound - 1) < 0)
    return val
  }
}

export type ZodiacKey = 'ARIES' | 'TAURUS' | 'GEMINI' | 'CANCER' | 'LEO' | 'VIRGO' | 'LIBRA' | 'SCORPIO' | 'SAGITTARIUS' | 'CAPRICORN' | 'AQUARIUS' | 'PISCES'

interface ZodiacDef { key: ZodiacKey; ko: string; en: string; symbol: string; start: [number, number]; end: [number, number] }

export const ZODIACS: ZodiacDef[] = [
  { key: 'ARIES', ko: '양자리', en: 'Aries', symbol: '♈', start: [3, 21], end: [4, 19] },
  { key: 'TAURUS', ko: '황소자리', en: 'Taurus', symbol: '♉', start: [4, 20], end: [5, 20] },
  { key: 'GEMINI', ko: '쌍둥이자리', en: 'Gemini', symbol: '♊', start: [5, 21], end: [6, 20] },
  { key: 'CANCER', ko: '게자리', en: 'Cancer', symbol: '♋', start: [6, 21], end: [7, 22] },
  { key: 'LEO', ko: '사자자리', en: 'Leo', symbol: '♌', start: [7, 23], end: [8, 22] },
  { key: 'VIRGO', ko: '처녀자리', en: 'Virgo', symbol: '♍', start: [8, 23], end: [9, 22] },
  { key: 'LIBRA', ko: '천칭자리', en: 'Libra', symbol: '♎', start: [9, 23], end: [10, 22] },
  { key: 'SCORPIO', ko: '전갈자리', en: 'Scorpio', symbol: '♏', start: [10, 23], end: [11, 21] },
  { key: 'SAGITTARIUS', ko: '사수자리', en: 'Sagittarius', symbol: '♐', start: [11, 22], end: [12, 21] },
  { key: 'CAPRICORN', ko: '염소자리', en: 'Capricorn', symbol: '♑', start: [12, 22], end: [1, 19] },
  { key: 'AQUARIUS', ko: '물병자리', en: 'Aquarius', symbol: '♒', start: [1, 20], end: [2, 18] },
  { key: 'PISCES', ko: '물고기자리', en: 'Pisces', symbol: '♓', start: [2, 19], end: [3, 20] },
]

const PERSONALITY: Record<ZodiacKey, string> = {
  ARIES: '열정적이고 진취적인 성격으로 새로운 도전을 좋아합니다.',
  TAURUS: '안정적이고 신뢰할 수 있는 성격으로 꾸준함이 장점입니다.',
  GEMINI: '호기심이 많고 다재다능한 성격으로 적응력이 뛰어납니다.',
  CANCER: '감성적이고 배려심이 깊은 성격으로 가족을 소중히 여깁니다.',
  LEO: '자신감 있고 관대한 성격으로 타고난 리더십을 지녔습니다.',
  VIRGO: '완벽주의적이고 세심한 성격으로 분석력이 뛰어납니다.',
  LIBRA: '조화를 중시하고 우아한 성격으로 균형감각이 뛰어납니다.',
  SCORPIO: '강인하고 신비로운 성격으로 깊은 통찰력을 지녔습니다.',
  SAGITTARIUS: '자유롭고 낙천적인 성격으로 모험을 즐깁니다.',
  CAPRICORN: '책임감이 강하고 현실적인 성격으로 목표 달성에 집중합니다.',
  AQUARIUS: '독창적이고 인도주의적인 성격으로 혁신을 추구합니다.',
  PISCES: '상상력이 풍부하고 직감적인 성격으로 예술적 감각이 뛰어납니다.',
}

const LUCKY_COLOR: Record<ZodiacKey, string> = {
  ARIES: '빨간색', TAURUS: '녹색', GEMINI: '노란색', CANCER: '은색', LEO: '금색', VIRGO: '갈색',
  LIBRA: '분홍색', SCORPIO: '검은색', SAGITTARIUS: '보라색', CAPRICORN: '회색', AQUARIUS: '파란색', PISCES: '바다색',
}

const LUCKY_STONE: Record<ZodiacKey, string> = {
  ARIES: '다이아몬드', TAURUS: '에메랄드', GEMINI: '펄', CANCER: '루비', LEO: '페리도트', VIRGO: '사파이어',
  LIBRA: '오팔', SCORPIO: '토파즈', SAGITTARIUS: '터키석', CAPRICORN: '가넷', AQUARIUS: '자수정', PISCES: '아쿠아마린',
}

const COMPATIBILITY: Record<ZodiacKey, ZodiacKey[]> = {
  ARIES: ['LEO', 'SAGITTARIUS', 'GEMINI'],
  TAURUS: ['VIRGO', 'CAPRICORN', 'CANCER'],
  GEMINI: ['LIBRA', 'AQUARIUS', 'ARIES'],
  CANCER: ['SCORPIO', 'PISCES', 'TAURUS'],
  LEO: ['ARIES', 'SAGITTARIUS', 'LIBRA'],
  VIRGO: ['TAURUS', 'CAPRICORN', 'SCORPIO'],
  LIBRA: ['GEMINI', 'AQUARIUS', 'LEO'],
  SCORPIO: ['CANCER', 'PISCES', 'VIRGO'],
  SAGITTARIUS: ['ARIES', 'LEO', 'AQUARIUS'],
  CAPRICORN: ['TAURUS', 'VIRGO', 'PISCES'],
  AQUARIUS: ['GEMINI', 'LIBRA', 'SAGITTARIUS'],
  PISCES: ['CANCER', 'SCORPIO', 'CAPRICORN'],
}

export interface StarSignResult {
  zodiac: ZodiacDef
  ordinal: number
  targetDate: string
  daily: {
    overall: string
    love: { score: number; message: string }
    career: { score: number; message: string }
    health: { score: number; message: string }
    money: { score: number; message: string }
  }
  monthly: { month: number; score: number; theme: string; message: string; caution: string; opportunity: string }
  compatible: ZodiacDef[]
  luckyNumbers: number[]
  luckyColor: string
  luckyStone: string
  personality: string
}

/** 1970-01-01 기준 epoch day (java LocalDate.toEpochDay와 동일) */
function epochDay(y: number, m: number, d: number): number {
  return Math.floor(Date.UTC(y, m - 1, d) / 86400000)
}

export function determineZodiac(month: number, day: number): { def: ZodiacDef; ordinal: number } {
  const md = month * 100 + day
  for (let i = 0; i < ZODIACS.length; i++) {
    const z = ZODIACS[i]
    const s = z.start[0] * 100 + z.start[1]
    const e = z.end[0] * 100 + z.end[1]
    const inRange = s <= e ? md >= s && md <= e : md >= s || md <= e
    if (inRange) return { def: z, ordinal: i }
  }
  return { def: ZODIACS[0], ordinal: 0 }
}

function generateScore(ordinal: number, random: JavaRandom): number {
  const base = 50 + ordinal * 3
  const variation = random.nextInt(41) - 20
  return Math.max(0, Math.min(100, base + variation))
}

const scoreLabel = (s: number) =>
  s >= 80 ? '매우 활발한 편' : s >= 65 ? '안정적으로 상승하는 편' : s >= 50 ? '균형을 유지하는 편' : s >= 35 ? '신중한 조율이 필요한 편' : '회복과 정비가 우선인 편'

function loveMessage(score: number): string {
  if (score >= 80) return '마음을 표현했을 때 긍정적인 반응을 얻기 좋은 날입니다. 새로운 만남은 먼저 가볍게 대화를 열고, 가까운 관계에서는 고마움을 구체적으로 전해 보세요.'
  if (score >= 65) return '관계의 온도가 안정적으로 올라갑니다. 상대의 말을 끝까지 듣고 작은 약속을 지키는 태도가 신뢰를 더 단단하게 만듭니다.'
  if (score >= 50) return '큰 변화보다는 편안한 소통에 어울리는 날입니다. 결론을 서두르지 말고 서로의 기대를 확인하면 불필요한 오해를 줄일 수 있습니다.'
  if (score >= 35) return '말의 의도와 전달 방식이 다르게 받아들여질 수 있습니다. 감정적인 답변은 잠시 미루고 사실과 느낌을 나누어 표현하세요.'
  return '관계에서 거리와 휴식이 필요한 흐름입니다. 상대를 단정하기보다 자신의 감정을 먼저 정리하고 중요한 대화는 컨디션이 나아진 뒤 진행하세요.'
}

function careerMessage(score: number): string {
  if (score >= 80) return '주도권을 잡고 성과를 보여주기 좋은 날입니다. 핵심 과제를 먼저 마무리하고 결과와 근거를 함께 공유하면 평가와 협업 모두에 유리합니다.'
  if (score >= 65) return '계획한 업무가 안정적으로 진전됩니다. 오전에는 집중 과제를, 오후에는 협의와 피드백을 배치하면 흐름을 효율적으로 사용할 수 있습니다.'
  if (score >= 50) return '새 일을 벌이기보다 진행 중인 업무의 완성도를 높이기 좋습니다. 우선순위와 마감 조건을 다시 확인해 작은 누락을 막으세요.'
  if (score >= 35) return '일정 충돌이나 의사소통 지연이 생길 수 있습니다. 구두 합의는 문서로 남기고 의존 작업의 담당자와 완료 시점을 명확히 하세요.'
  return '무리한 확장보다 리스크를 줄이는 데 집중할 날입니다. 중요한 배포·계약·결재는 체크리스트와 동료 검토를 거쳐 진행하세요.'
}

function healthMessage(score: number): string {
  if (score >= 80) return '활력과 회복력이 좋은 편입니다. 적당한 유산소 운동이나 야외 활동으로 기운을 순환하되 과도한 운동으로 피로를 남기지는 마세요.'
  if (score >= 65) return '전반적인 컨디션은 안정적입니다. 수분 섭취와 규칙적인 식사, 짧은 스트레칭을 유지하면 집중력도 오래 이어집니다.'
  if (score >= 50) return '컨디션의 기복을 관리하는 것이 중요합니다. 긴 작업 사이에 눈과 어깨를 쉬고 늦은 카페인과 야식을 줄여 수면의 질을 지키세요.'
  if (score >= 35) return '피로가 평소보다 쉽게 누적될 수 있습니다. 강도 높은 운동보다 가벼운 걷기와 충분한 수면을 우선하고 몸의 신호를 무시하지 마세요.'
  return '회복을 최우선으로 둘 날입니다. 무리한 일정은 줄이고 불편한 증상이 지속되면 운세 해석이 아닌 의료 전문가의 진료를 받으세요.'
}

function moneyMessage(score: number): string {
  if (score >= 80) return '수입·협상·절약 기회를 발견하기 좋은 날입니다. 다만 기대감만으로 결정하지 말고 비용, 수익, 위험 조건을 숫자로 비교한 뒤 실행하세요.'
  if (score >= 65) return '재정 흐름이 비교적 안정적입니다. 정기 지출을 점검하고 남는 자금을 목적별로 나누면 안정성과 성취감을 함께 높일 수 있습니다.'
  if (score >= 50) return '수익 확대보다 지출 균형에 집중하기 좋습니다. 즉흥 구매는 하루 보류하고 구독·수수료처럼 반복되는 비용을 점검하세요.'
  if (score >= 35) return '예상하지 못한 지출이나 조건 변경에 유의하세요. 대출·투자·고액 구매는 총비용과 해지 조건을 확인하고 여유 자금을 보존하세요.'
  return '재정 방어가 우선인 날입니다. 충동적인 투자와 보증은 피하고 중요한 금융 판단은 객관적인 자료와 자격 있는 전문가의 조언을 함께 확인하세요.'
}

function monthlyTheme(month: number): string {
  if (month === 1 || month === 2 || month === 12) return '새로운 시작과 계획의 시기'
  if (month >= 3 && month <= 5) return '성장과 발전의 시기'
  if (month >= 6 && month <= 8) return '활동과 성취의 시기'
  return '수확과 정리의 시기'
}

function monthlyMessage(zodiacName: string, month: number, score: number): string {
  if (score >= 70) return `${month}월은 ${zodiacName}에게 확장과 성취의 흐름이 강한 달입니다. 새로운 제안은 목표와 자원 조건을 확인한 뒤 적극적으로 검토하고, 성과는 기록과 공유를 통해 다음 기회로 연결하세요.`
  if (score >= 50) return `${month}월은 ${zodiacName}에게 기반을 다지고 완성도를 높이기 좋은 달입니다. 진행 중인 일의 우선순위를 정리하고 관계·건강·재정의 균형을 유지하면 꾸준한 결과를 만들 수 있습니다.`
  return `${month}월은 ${zodiacName}에게 속도보다 점검과 회복이 중요한 달입니다. 새로운 부담을 늘리기보다 일정과 지출을 보수적으로 관리하고, 중요한 결정에는 충분한 검토 시간을 확보하세요.`
}

function cautionOf(score: number): string {
  if (score < 50) return '급한 결정과 과도한 일정 확장을 피하세요. 합의 조건·예산·마감일을 문서로 다시 확인하고 회복 시간을 먼저 확보하는 편이 좋습니다.'
  if (score < 70) return '큰 변화를 한꺼번에 추진하기보다 현재 상황을 안정화하세요. 익숙함 때문에 놓친 반복 비용이나 관계의 작은 불편도 점검해 보세요.'
  return '흐름이 좋더라도 과신은 피하세요. 약속한 범위와 자원 한계를 지키고 성과를 주변과 나누는 태도가 좋은 흐름을 오래 유지합니다.'
}

function opportunityOf(score: number): string {
  if (score >= 70) return '새로운 프로젝트 제안, 역할 확장, 협력 관계를 구체화하기 좋습니다. 관심 있는 기회에는 먼저 질문하고 작은 실행으로 가능성을 확인하세요.'
  if (score >= 50) return '기존 관계와 업무의 개선 지점에서 기회가 생깁니다. 반복 작업을 정리하거나 미뤄 둔 대화를 마치는 작은 변화가 다음 단계의 기반이 됩니다.'
  return '위험이 낮고 되돌릴 수 있는 작은 변화부터 시작하세요. 생활 리듬과 고정비, 업무 우선순위를 정비하는 과정 자체가 다음 기회를 준비합니다.'
}

export function calculateStarSign(birthYear: number, birthMonth: number, birthDay: number, target: Date): StarSignResult {
  const { def: zodiac, ordinal } = determineZodiac(birthMonth, birthDay)
  const ty = target.getFullYear(), tm = target.getMonth() + 1, td = target.getDate()

  // 오늘의 운세: seed = epochDay + ordinal, 카테고리 순서(love→career→health→money)로 같은 Random 진행
  const daily = new JavaRandom(epochDay(ty, tm, td) + ordinal)
  const love = generateScore(ordinal, daily)
  const career = generateScore(ordinal, daily)
  const health = generateScore(ordinal, daily)
  const money = generateScore(ordinal, daily)
  const categories: [string, number][] = [['관계', love], ['일과 성취', career], ['건강', health], ['재정', money]]
  const strongest = categories.reduce((a, b) => (b[1] > a[1] ? b : a))
  const weakest = categories.reduce((a, b) => (b[1] < a[1] ? b : a))
  const average = Math.trunc((love + career + health + money) / 4)
  const overall = `${zodiac.ko}의 오늘 종합 흐름은 ${scoreLabel(average)}입니다. ${strongest[0]} 영역(${strongest[1]}점)은 적극적으로 활용하고, ${weakest[0]} 영역(${weakest[1]}점)은 속도를 조절하며 확인하세요.`

  // 월별 운세: seed = ordinal + month
  const mRandom = new JavaRandom(ordinal + tm)
  const monthScore = 40 + mRandom.nextInt(40)

  // 행운의 숫자: seed = 생일 epochDay, 1..99 중 3개 (원본은 HashSet — 여기선 삽입 순서 유지)
  const lRandom = new JavaRandom(epochDay(birthYear, birthMonth, birthDay))
  const luckySet: number[] = []
  while (luckySet.length < 3) {
    const n = lRandom.nextInt(99) + 1
    if (!luckySet.includes(n)) luckySet.push(n)
  }

  const byKey = new Map(ZODIACS.map((z) => [z.key, z]))
  return {
    zodiac, ordinal,
    targetDate: `${ty}-${String(tm).padStart(2, '0')}-${String(td).padStart(2, '0')}`,
    daily: {
      overall,
      love: { score: love, message: loveMessage(love) },
      career: { score: career, message: careerMessage(career) },
      health: { score: health, message: healthMessage(health) },
      money: { score: money, message: moneyMessage(money) },
    },
    monthly: {
      month: tm, score: monthScore, theme: monthlyTheme(tm),
      message: monthlyMessage(zodiac.ko, tm, monthScore),
      caution: cautionOf(monthScore), opportunity: opportunityOf(monthScore),
    },
    compatible: COMPATIBILITY[zodiac.key].map((k) => byKey.get(k)!),
    luckyNumbers: luckySet,
    luckyColor: LUCKY_COLOR[zodiac.key],
    luckyStone: LUCKY_STONE[zodiac.key],
    personality: PERSONALITY[zodiac.key],
  }
}

// ---------- 별자리 상세 프로필 (원소·자질·수호성·성격 심화) ----------

export interface ZodiacDetail {
  element: '불' | '흙' | '공기' | '물'
  elementMeaning: string
  quality: '활동궁' | '고정궁' | '변통궁'
  qualityMeaning: string
  ruler: string
  rulerMeaning: string
  strength: string
  weakness: string
  relation: string
}

export const ZODIAC_DETAIL: Record<ZodiacKey, ZodiacDetail> = {
  ARIES: {
    element: '불', elementMeaning: '열정과 직관으로 움직이는 에너지', quality: '활동궁', qualityMeaning: '계절을 여는 개척자 — 시작에 강함',
    ruler: '화성', rulerMeaning: '추진력·용기·경쟁심을 관장',
    strength: '결단이 빠르고 두려움 없이 앞장서며, 위기에서 오히려 힘이 납니다.',
    weakness: '성급함과 욱하는 반응이 약점 — 시작은 빠르나 마무리가 흐려지기 쉽습니다.',
    relation: '관계에서도 직진형 — 밀당보다 솔직한 표현이 통하는 상대와 잘 맞습니다.',
  },
  TAURUS: {
    element: '흙', elementMeaning: '감각과 실리로 세상을 붙드는 에너지', quality: '고정궁', qualityMeaning: '계절을 지키는 수성가 — 유지·축적에 강함',
    ruler: '금성', rulerMeaning: '아름다움·소유·안정된 애정을 관장',
    strength: '한번 시작한 일을 끝까지 지키는 뚝심과 안정된 재물 감각이 최고의 자산입니다.',
    weakness: '변화를 미루는 고집이 약점 — 익숙함이 정체가 되지 않도록 주의가 필요합니다.',
    relation: '천천히 데워지는 사랑 — 신뢰가 쌓인 뒤에 깊어지는 관계를 선호합니다.',
  },
  GEMINI: {
    element: '공기', elementMeaning: '언어와 정보로 연결하는 에너지', quality: '변통궁', qualityMeaning: '계절을 잇는 전달자 — 적응·소통에 강함',
    ruler: '수성', rulerMeaning: '언변·학습·이동을 관장',
    strength: '호기심과 말솜씨로 어디서든 다리를 놓는 연결자 — 정보가 곧 무기입니다.',
    weakness: '산만함과 변덕이 약점 — 두 마리 토끼를 쫓다 둘 다 놓치지 않도록 선택이 필요합니다.',
    relation: '대화가 통해야 마음이 열립니다 — 함께 배우고 떠들 수 있는 상대와 오래갑니다.',
  },
  CANCER: {
    element: '물', elementMeaning: '감정과 기억으로 세상을 감싸는 에너지', quality: '활동궁', qualityMeaning: '계절을 여는 보호자 — 돌봄과 개척을 겸함',
    ruler: '달', rulerMeaning: '감정의 조수간만·가정·모성을 관장',
    strength: '공감과 보살핌의 힘 — 사람의 마음을 읽고 안전한 울타리를 만드는 재주가 있습니다.',
    weakness: '기분의 파도와 과거에 매이는 습관이 약점 — 껍질 속으로 숨는 대신 표현이 필요합니다.',
    relation: '가족 같은 애착을 원합니다 — 안정과 정서적 교감을 주는 상대와 깊어집니다.',
  },
  LEO: {
    element: '불', elementMeaning: '자기 표현과 창조의 에너지', quality: '고정궁', qualityMeaning: '계절의 한가운데 — 존재감과 지속력이 강함',
    ruler: '태양', rulerMeaning: '자아·명예·창조력을 관장',
    strength: '타고난 무대 체질 — 사람을 끌어모으는 카리스마와 통 큰 관대함이 빛납니다.',
    weakness: '인정 욕구가 약점 — 박수가 없을 때 시들지 않는 내면의 불씨를 길러야 합니다.',
    relation: '아낌없이 주는 대신 존중받고 싶어합니다 — 서로를 빛내주는 관계가 이상적입니다.',
  },
  VIRGO: {
    element: '흙', elementMeaning: '분석과 개선으로 다듬는 에너지', quality: '변통궁', qualityMeaning: '계절을 마무리하는 정리자 — 세부와 실무에 강함',
    ruler: '수성', rulerMeaning: '분석·위생·직무 능력을 관장',
    strength: '흠을 찾아 고치는 눈 — 실무·건강·루틴 관리에서 대체 불가의 완성도를 냅니다.',
    weakness: '자기비판과 걱정이 약점 — 완벽하지 않아도 충분히 좋다는 감각이 필요합니다.',
    relation: '말보다 행동으로 챙기는 사랑 — 신뢰는 디테일에서 쌓입니다.',
  },
  LIBRA: {
    element: '공기', elementMeaning: '균형과 조화를 재는 에너지', quality: '활동궁', qualityMeaning: '계절을 여는 조정자 — 관계의 시작에 강함',
    ruler: '금성', rulerMeaning: '미(美)·파트너십·사교를 관장',
    strength: '양쪽을 다 보는 공정한 눈과 세련된 사교술 — 갈등을 중재하는 타고난 외교관입니다.',
    weakness: '결정 장애가 약점 — 모두를 만족시키려다 자신을 잃지 않도록 기준이 필요합니다.',
    relation: '혼자보다 둘일 때 완성되는 별자리 — 대등하고 품위 있는 파트너십을 추구합니다.',
  },
  SCORPIO: {
    element: '물', elementMeaning: '깊이와 몰입으로 파고드는 에너지', quality: '고정궁', qualityMeaning: '계절을 지키는 탐구자 — 집중과 재생에 강함',
    ruler: '명왕성(전통 화성)', rulerMeaning: '변형·재생·숨은 힘을 관장',
    strength: '한 우물을 끝까지 파는 집중력과 위기에서 다시 태어나는 회복력이 무기입니다.',
    weakness: '의심과 독점욕이 약점 — 통제 대신 신뢰를 선택할 때 관계가 깊어집니다.',
    relation: '얕은 만남보다 전부를 거는 사랑 — 진심을 확인한 상대에게는 끝까지 의리를 지킵니다.',
  },
  SAGITTARIUS: {
    element: '불', elementMeaning: '의미와 모험을 향해 뻗는 에너지', quality: '변통궁', qualityMeaning: '계절을 잇는 탐험가 — 확장과 낙관에 강함',
    ruler: '목성', rulerMeaning: '행운·철학·원거리 확장을 관장',
    strength: '낙관과 큰 그림 — 남들이 못 보는 가능성을 향해 활을 쏘는 비전가입니다.',
    weakness: '과장과 산만한 확장이 약점 — 약속과 디테일을 지킬 때 행운이 실물이 됩니다.',
    relation: '자유를 존중해주는 상대와 잘 맞습니다 — 함께 성장하고 여행하는 관계가 이상적입니다.',
  },
  CAPRICORN: {
    element: '흙', elementMeaning: '구조와 성취로 쌓아 올리는 에너지', quality: '활동궁', qualityMeaning: '계절을 여는 건축가 — 목표 달성에 강함',
    ruler: '토성', rulerMeaning: '규율·시간·책임을 관장',
    strength: '산을 오르는 인내 — 장기 목표를 향해 묵묵히 쌓아 결국 정상에 서는 유형입니다.',
    weakness: '일 중독과 감정 억제가 약점 — 성취만큼 쉼과 곁의 사람도 자산임을 기억해야 합니다.',
    relation: '가볍게 시작하지 않는 대신 책임지는 사랑 — 함께 미래를 설계할 상대를 찾습니다.',
  },
  AQUARIUS: {
    element: '공기', elementMeaning: '독창과 연대를 잇는 에너지', quality: '고정궁', qualityMeaning: '계절을 지키는 혁신가 — 신념과 독립에 강함',
    ruler: '천왕성(전통 토성)', rulerMeaning: '혁신·자유·공동체를 관장',
    strength: '시대를 앞서 보는 눈과 편견 없는 우정 — 다름을 연결해 새 판을 짜는 재주가 있습니다.',
    weakness: '정서적 거리두기가 약점 — 머리의 이상만큼 가슴의 온도를 전할 때 사람이 남습니다.',
    relation: '친구에서 시작되는 사랑 — 서로의 자유와 개성을 침범하지 않는 관계가 오래갑니다.',
  },
  PISCES: {
    element: '물', elementMeaning: '공감과 상상으로 스며드는 에너지', quality: '변통궁', qualityMeaning: '계절을 마무리하는 몽상가 — 치유와 예술에 강함',
    ruler: '해왕성(전통 목성)', rulerMeaning: '꿈·영감·자비를 관장',
    strength: '경계 없는 공감과 예술적 감수성 — 사람과 세상을 치유하는 부드러운 힘이 있습니다.',
    weakness: '현실 도피와 거절 못 함이 약점 — 좋은 마음에도 울타리가 필요합니다.',
    relation: '영혼의 교감을 꿈꾸는 사랑 — 감정을 섬세하게 다뤄주는 상대에게 안착합니다.',
  },
}
