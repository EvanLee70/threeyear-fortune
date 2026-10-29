// Korean readings of every hanja term the pillar table shows. Own work, from standard saju vocabulary.
// `named('偏財')` gives the display parts of "편재(偏財)".

const STEM = ['갑', '을', '병', '정', '무', '기', '경', '신', '임', '계']
const BRANCH = ['자', '축', '인', '묘', '진', '사', '오', '미', '신', '유', '술', '해']

const pairs = (hanja: string, ko: string[]): [string, string][] => [...hanja].map((h, i) => [h, ko[i]])

const TEN_GODS: [string, string][] = [
  ['比肩', '비견'], ['劫財', '겁재'], ['食神', '식신'], ['傷官', '상관'], ['偏財', '편재'],
  ['正財', '정재'], ['偏官', '편관'], ['正官', '정관'], ['偏印', '편인'], ['正印', '정인'], ['本元', '본원'],
]
const STAGES: [string, string][] = [
  ['長生', '장생'], ['沐浴', '목욕'], ['冠帶', '관대'], ['建祿', '건록'], ['帝旺', '제왕'], ['衰', '쇠'],
  ['病', '병'], ['死', '사'], ['墓', '묘'], ['絶', '절'], ['胎', '태'], ['養', '양'],
]
const SINSAL: [string, string][] = [
  ['劫殺', '겁살'], ['災殺', '재살'], ['天殺', '천살'], ['地殺', '지살'], ['年殺', '년살'], ['月殺', '월살'],
  ['亡身', '망신'], ['將星', '장성'], ['攀鞍', '반안'], ['驛馬', '역마'], ['六害', '육해'], ['華蓋', '화개'],
]
const OTHER: [string, string][] = [['時柱', '시주'], ['日柱', '일주'], ['月柱', '월주'], ['年柱', '연주'], ['空', '공']]

export const KO_OF: Readonly<Record<string, string>> = Object.fromEntries([
  ...pairs('甲乙丙丁戊己庚辛壬癸', STEM),
  ...pairs('子丑寅卯辰巳午未申酉戌亥', BRANCH),
  ...TEN_GODS, ...STAGES, ...SINSAL, ...OTHER,
])

/** Display parts of "한글(한문)". Unknown terms come back as hanja only (ko is empty), so nothing is lost. */
export function named(hanja: string): { ko: string; hanja: string } {
  return { ko: KO_OF[hanja] ?? '', hanja }
}

/** Plain text form, e.g. '편재(偏財)'. */
export function namedText(hanja: string): string {
  const { ko, hanja: h } = named(hanja)
  return ko ? `${ko}(${h})` : h
}
