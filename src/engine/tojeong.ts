// Tojeongbigyeol engine. Formula adapted from nanamix/korean-fortune-system (Apache-2.0), see NOTICE.
//  upper = mod(counted age + year-ganzi number, 8), middle = mod(lunar-month days + month-ganzi number, 6),
//  lower = mod(lunar birth day + day-ganzi number, 3); ganzi number = stem order (甲=1..癸=10) + branch order (子=1..亥=12).
// Month and day pillars come from this repo's pillar table; lunar dates come from lunar-javascript.
import { calculatePillarTable } from './pillars.ts'
// @ts-expect-error lunar-javascript has no type declarations
import { Solar } from 'lunar-javascript'

const SKY = '甲乙丙丁戊己庚辛壬癸'
const EARTH = '子丑寅卯辰巳午未申酉戌亥'

/** [month ganzi, day ganzi] of a birth, read from the pillar table (the site's displayed pillars) */
function monthDayGanzi(y: number, m: number, d: number, h: number, min: number): [string, string] {
  const t = calculatePillarTable({ year: y, month: m, day: d, hour: h, minute: min, gender: 'M' }).pillars
  return [t[2].pillar.ganzi, t[1].pillar.ganzi]
}

const UPPER_NAME = ['', '건', '태', '리', '진', '손', '감', '간', '곤']
const UPPER_SYMBOL = ['', '☰', '☱', '☲', '☳', '☴', '☵', '☶', '☷']
const UPPER_ELEM = [-1, 3, 3, 1, 0, 0, 4, 2, 2] // 0목 1화 2토 3금 4수
const UPPER_BASE = [0, 85, 75, 78, 72, 68, 55, 62, 66]
const UPPER_MEANING = ['',
  '강건한 하늘의 기운이 크게 형통하니 뜻을 세워 나아갈 때입니다.',
  '연못처럼 기쁨과 소통이 따르나 구설과 말조심이 필요합니다.',
  '밝은 불의 기운으로 명예와 문서가 빛나는 해입니다.',
  '우레처럼 움직임이 크니 놀라움 뒤에 성취가 따릅니다.',
  '바람처럼 두루 통하나 흔들림 속에 중심을 지켜야 합니다.',
  '험한 물을 건너는 형국이니 인내로 위기를 넘겨야 합니다.',
  '산처럼 멈추어 때를 기다리면 안정 속에 발전이 있습니다.',
  '대지처럼 포용하고 순응하면 결실이 따르는 해입니다.']
export const MIDDLE_NUANCE = ['', '기초가 굳건하여', '귀인의 도움을 받아', '노력한 만큼', '변화의 흐름 속에서', '구설과 시비를 다스리면', '때를 기다린 끝에']
const MIDDLE_DELTA = [0, 6, 8, 2, 0, -4, -2]
export const LOWER_CLAUSE = ['', '매사가 순조롭게 풀립니다.', '굴곡은 있으나 무난히 넘깁니다.', '조심하면 큰 탈은 없습니다.']
const LOWER_DELTA = [0, 6, 0, -6]

export interface TojeongMonthly { month: number; score: number; keywords: string[] }
export interface TojeongResult {
  targetYear: number
  upper: number; middle: number; lower: number
  gwaNumber: number
  gwaName: string
  gwaSymbol: string
  summary: string
  detailedFortune: string
  overallScore: number
  advice: string
  luckyMonths: string
  cautionMonths: string
  monthly: TojeongMonthly[]
  calcNote: string
}

const clamp = (s: number) => Math.max(0, Math.min(100, s))
const mod1 = (x: number, n: number) => { const r = ((x % n) + n) % n; return r === 0 ? n : r }

/** 간지(한자 2글자) → 수: 천간 순서수 + 지지 순서수 */
function ganjiNumber(ganzi: string): number {
  return (SKY.indexOf(ganzi[0]) + 1) + (EARTH.indexOf(ganzi[1]) + 1)
}

/** 연도 → 태세 간지 (1984=갑자 기준, 절기 무시 — 원본과 동일) */
function yearPillar(year: number): string {
  const s = ((year - 1984) % 10 + 10) % 10
  const b = ((year - 1984) % 12 + 12) % 12
  return SKY[s] + EARTH[b]
}

/** 지지 오행 index (0목 1화 2토 3금 4수) */
function branchElem(branchHan: string): number {
  if ('寅卯'.includes(branchHan)) return 0
  if ('巳午'.includes(branchHan)) return 1
  if ('辰戌丑未'.includes(branchHan)) return 2
  if ('申酉'.includes(branchHan)) return 3
  return 4
}

const gen = (e: number) => (e + 1) % 5
const overcome = (e: number) => (e + 2) % 5

/** 상괘 오행(u) vs 월 오행(m) 관계 가감: 비화+8 생입+12 설기-6 극입-12 그외+4 */
function relationDelta(u: number, m: number): number {
  if (u === m) return 8
  if (gen(m) === u) return 12
  if (gen(u) === m) return -6
  if (overcome(m) === u) return -12
  return 4
}

function lunarOf(y: number, m: number, d: number): { day: number; monthDays: number } {
  const lunar = Solar.fromYmd(y, m, d).getLunar()
  const day: number = lunar.getDay()
  // 음력월 대소 판정: 그 달 1일(양력) + 29일이 다음달 1일이면 29, 아니면 30 (원본 방식)
  const firstSolar = Solar.fromYmd(y, m, d).next(-(day - 1))
  const check = firstSolar.next(29).getLunar()
  const monthDays = check.getDay() === 1 ? 29 : 30
  return { day, monthDays }
}

export function calculateTojeong(birthYear: number, birthMonth: number, birthDay: number, birthHour: number, birthMinute: number, targetYear: number): TojeongResult {
  // month and day ganzi (solar-term based)
  const [monthGz, dayGz] = monthDayGanzi(birthYear, birthMonth, birthDay, birthHour, birthMinute)
  const taeseoNum = ganjiNumber(yearPillar(targetYear))
  const monthGeonNum = ganjiNumber(monthGz)
  const iljinNum = ganjiNumber(dayGz)

  const lunar = lunarOf(birthYear, birthMonth, birthDay)
  const age = targetYear - birthYear + 1 // 세는나이

  const upper = mod1(age + taeseoNum, 8)
  const middle = mod1(lunar.monthDays + monthGeonNum, 6)
  const lower = mod1(lunar.day + iljinNum, 3)

  const gwaNumber = (upper - 1) * 18 + (middle - 1) * 3 + lower // 1..144
  const overallScore = clamp(UPPER_BASE[upper] + MIDDLE_DELTA[middle] + LOWER_DELTA[lower])
  const gwaName = `${UPPER_NAME[upper]}괘 [${upper}${middle}${lower}]`
  const summary = `${UPPER_NAME[upper]}괘: ${UPPER_MEANING[upper]}`
  const detailedFortune = `${UPPER_MEANING[upper]} ${MIDDLE_NUANCE[middle]} ${LOWER_CLAUSE[lower]}`

  // 월별 운세: 대상년 각 월(15일 대표)의 월지 오행 vs 상괘 오행
  const upperElem = UPPER_ELEM[upper]
  const monthly: TojeongMonthly[] = []
  for (let month = 1; month <= 12; month++) {
    const mElem = branchElem(monthDayGanzi(targetYear, month, 15, 12, 0)[0][1])
    const score = clamp(overallScore + relationDelta(upperElem, mElem))
    const seasonKw = [['새시작', '희망', '성장'], ['활동', '에너지', '도전'], ['수확', '성과', '감사'], ['정리', '휴식', '계획']][Math.floor((month - 1) / 3)]
    const scoreKw = score >= 80 ? ['행운', '성공', '기회'] : score >= 60 ? ['안정', '노력', '진전'] : ['신중', '점검', '대비']
    monthly.push({ month, score, keywords: [...seasonKw, ...scoreKw] })
  }

  const lucky = monthly.filter((m) => m.score >= 70).map((m) => `${m.month}월(${m.score}점)`).join(', ') || '뚜렷한 길월 없음'
  const caution = monthly.filter((m) => m.score < 50).map((m) => `${m.month}월(${m.score}점)`).join(', ') || '특별 주의월 없음'

  let advice = `올해 당신의 운세는 '${gwaName}'입니다. `
  if (overallScore >= 90) advice += '매우 좋은 운세입니다. 적극적으로 행동하세요.'
  else if (overallScore >= 80) advice += '좋은 운세입니다. 기회를 놓치지 마세요.'
  else if (overallScore >= 70) advice += '평균 이상의 운세입니다. 꾸준히 노력하세요.'
  else if (overallScore >= 60) advice += '보통의 운세입니다. 신중하게 행동하세요.'
  else if (overallScore >= 50) advice += '주의가 필요한 해입니다. 조심스럽게 행동하세요.'
  else advice += '어려운 해가 될 수 있습니다. 인내심을 갖고 극복하세요.'

  return {
    targetYear, upper, middle, lower, gwaNumber, gwaName, gwaSymbol: UPPER_SYMBOL[upper],
    summary, detailedFortune, overallScore, advice, luckyMonths: lucky, cautionMonths: caution, monthly,
    calcNote: `세는나이 ${age} + 태세수 ${taeseoNum}(${yearPillar(targetYear)}) → 상괘 ${upper} · 음력생월 ${lunar.monthDays}일 + 월건수 ${monthGeonNum}(${monthGz}) → 중괘 ${middle} · 음력생일 ${lunar.day} + 일진수 ${iljinNum}(${dayGz}) → 하괘 ${lower}`,
  }
}
