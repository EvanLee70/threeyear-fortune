// 사주 전문 용어를 한글(漢字)로 병기한다. 한자 표기 예외는 프로젝트 CLAUDE.md 참조.
// 결정론·멱등: 이미 한자가 붙은 용어는 건드리지 않고, 漢字(한글) 순서는 한글(漢字)로 뒤집는다.
// 한 글자 오행·12운성과 일상어와 겹치는 말(세운)은 사전에서 빼고, 구분 기호 사이에 홀로 설 때만 따로 병기한다.
import { SIPSIN_INFO } from '../myeongri/data/sipsin.ts'
import { SINSAL_INFO } from '../myeongri/data/sinsal.ts'
import { SIBIUNSEONG_INFO } from '../myeongri/data/sibiunseong.ts'

const MANUAL: Record<string, string> = {
  사주팔자: '四柱八字', 사주명리: '四柱命理', '사주 원국': '四柱原局', 사주: '四柱', 팔자: '八字', 원국: '原局', 명식: '命式', 명리학: '命理學', 명리: '命理',
  일간: '日干', 월간: '月干', 년간: '年干', 일지: '日支', 월지: '月支', 년지: '年支',
  년주: '年柱', 월주: '月柱', 일주: '日柱', 시주: '時柱',
  천간: '天干', 지지: '地支', 간지: '干支', 지장간: '支藏干', 오행: '五行', 음양: '陰陽', 십신: '十神', 십성: '十星',
  비겁: '比劫', 식상: '食傷', 재성: '財星', 관성: '官星', 인성: '印星', 칠살: '七殺',
  식신격: '食神格', 상관격: '傷官格', 편재격: '偏財格', 정재격: '正財格', 편관격: '偏官格', 정관격: '正官格',
  편인격: '偏印格', 정인격: '正印格', 건록격: '建祿格', 양인격: '羊刃格', 칠살격: '七殺格', 종격: '從格', 격국: '格局',
  신강약: '身強弱', 신강: '身強', 신약: '身弱', 용신: '用神', 희신: '喜神', 기신: '忌神', 구신: '仇神', 한신: '閒神',
  조후: '調候', 억부: '抑扶', 통관: '通關',
  대운: '大運', 월운: '月運', 일운: '日運', 소운: '小運', 입춘: '立春', 절입: '節入', 월건: '月建',
  삼합: '三合', 육합: '六合', 방합: '方合', 반합: '半合', 천간합: '天干合', 지지합: '地支合', 삼형: '三刑',
  상충: '相沖', 상형: '相刑', 원진: '怨嗔', 암합: '暗合', 공망: '空亡', 상생: '相生', 상극: '相剋',
  신살: '神殺', 귀인: '貴人', 삼재: '三災', 납음: '納音', 장생: '長生', 건록: '建祿', 제왕: '帝旺', 십이운성: '十二運星',
  홍염살: '紅艶殺', 원진살: '怨嗔殺', 괴강살: '魁罡殺', 재살: '災殺', 천살: '天殺', 지살: '地殺', 장성살: '將星殺', 반안살: '攀鞍殺', 월살: '月殺', 육해살: '六害殺',
}

const dictionary: Record<string, string> = { ...MANUAL }
for (const [hangul, info] of Object.entries(SIPSIN_INFO)) dictionary[hangul] = info.han
for (const [hangul, info] of Object.entries(SINSAL_INFO)) dictionary[hangul] = info.han

const HAN = String.raw`一-鿿`
const ELEMENT_HAN: Record<string, string> = { 목: '木', 화: '火', 토: '土', 금: '金', 수: '水' }
const UNSEONG_HAN: Record<string, string> = Object.fromEntries(Object.entries(SIBIUNSEONG_INFO).map(([hangul, info]) => [hangul, info.han]))

// 간지·오행 한자가 홀로 있으면(甲申, 寅午戌) 읽는 소리를 앞에 붙인다. 이미 (…) 안에 든 한자는 건드리지 않는다.
const READ: Record<string, string> = {}
;[...'甲乙丙丁戊己庚辛壬癸子丑寅卯辰巳午未申酉戌亥木火土金水'].forEach((c, i) => {
  READ[c] = [...'갑을병정무기경신임계자축인묘진사오미신유술해목화토금수'][i]
})
const reading = (run: string) => [...run].map((c) => READ[c]).join('')
const READ_CLASS = Object.keys(READ).join('')

const FLIP = new RegExp(String.raw`([${HAN}]+)\(([가-힣]+)\)`, 'g')
const RUN = new RegExp(String.raw`(?<![${HAN}(])[${READ_CLASS}]+(?![${HAN}(])`, 'g')
// 긴 말부터 맞춘다(사주팔자 > 사주). '세운'은 "계획을 세운"과 겹쳐 조사나 용어가 바로 이어질 때만 용어로 본다.
// 용어 바로 뒤의 (巳)는 소리를 더해 "월지(月支) 사(巳)"로 만든다.
const alternatives = Object.keys(dictionary).sort((a, b) => b.length - a.length).join('|')
const TERM = new RegExp(
  String.raw`(?<![가-힣])세운(?=[은는이가과와을를의도에·,)]|\s(?:기준|분석|천간|지지|간지|오행|십신|흐름|점수))|(${alternatives})(?:\(([${READ_CLASS}]+)\))?`,
  'g',
)
const DURATION = new Set(['일간', '월간', '년간'])
const ANNOTATED = new RegExp(String.raw`^\s?\([${HAN}]`)
// 일간 경, 일지 진 처럼 간·지 용어 뒤에 한글로만 적힌 천간·지지
const STEM_AFTER = new RegExp(String.raw`(일간|월간|년간|시간)\(([${HAN}]+)\) ([갑을병정무기경신임계])(?=[의이은는가을를과와도에]?(?:[^가-힣(]|$))`, 'g')
const BRANCH_AFTER = new RegExp(String.raw`(일지|월지|년지|시지)\(([${HAN}]+)\) ([자축인묘진사오미신유술해])(?=[의이은는가을를과와도에]?(?:[^가-힣(]|$))`, 'g')
const STEM_HAN: Record<string, string> = Object.fromEntries([...'甲乙丙丁戊己庚辛壬癸'].map((c) => [READ[c], c]))
const BRANCH_HAN: Record<string, string> = Object.fromEntries([...'子丑寅卯辰巳午未申酉戌亥'].map((c) => [READ[c], c]))
// 한 글자 오행은 일상어("할 수 있다")와 겹쳐, 표 칸·목록처럼 구분 기호 사이에 홀로 있거나 용어 앞뒤 문맥이 분명할 때만 병기한다.
const ELEMENT_LIST = new RegExp(String.raw`(?<=^|[|*,·/(\[]\s?|\)\s|:\s|^\s*[-*>]\s)(목|화|토|금|수)(?=$|\s?[|*,·/)\]])`, 'gm')
const ELEMENT_WORD = new RegExp(
  String.raw`(?<![가-힣])(목|화|토|금|수)(?=이므로|이라|이며|이고|이면|이다|이 (?:많|강|약|없|부족|과다)|의 [양음]?기운|\s?(?:기운|과다|부족|보완|오행)|[을를] (?:용신|희신|기신))`,
  'g',
)
const UNSEONG_CELL = new RegExp(String.raw`(?<=[|*]\s?)(${Object.keys(UNSEONG_HAN).join('|')})(?=\s?[|*])`, 'g')

/** 한글 용어 뒤에 (漢字)를 붙이고, 漢字(한글) 짝은 한글(漢字)로 뒤집는다 */
export function withHanja(text: string): string {
  return text
    .replace(FLIP, (whole, han: string, ko: string) => (han.length === ko.length ? `${ko}(${han})` : whole))
    .replace(RUN, (run) => `${reading(run)}(${run})`)
    .replace(TERM, (match: string, term: string | undefined, run: string | undefined, at: number, whole: string) => {
      const word = term ?? match
      if (!run && ANNOTATED.test(whole.slice(at + match.length))) return match
      if (DURATION.has(word) && /[0-9가-힣]/.test(whole[at - 1] ?? '')) return match // 3개월간, 10년간, 이틀일간
      const han = dictionary[word] ?? '歲運'
      return run ? `${word}(${han}) ${reading(run)}(${run})` : `${word}(${han})`
    })
    .replace(STEM_AFTER, (_m, term: string, han: string, stem: string) => `${term}(${han}) ${stem}(${STEM_HAN[stem]})`)
    .replace(BRANCH_AFTER, (_m, term: string, han: string, branch: string) => `${term}(${han}) ${branch}(${BRANCH_HAN[branch]})`)
    .replace(ELEMENT_LIST, (el: string) => `${el}(${ELEMENT_HAN[el]})`)
    .replace(ELEMENT_WORD, (el: string) => `${el}(${ELEMENT_HAN[el]})`)
    .replace(UNSEONG_CELL, (name: string) => `${name}(${UNSEONG_HAN[name]})`)
    .replace(new RegExp(String.raw`\(([${HAN}]+)\)\((?=[^)])`, 'g'), '($1·') // 일간(日干)(나) → 일간(日干·나)
}
