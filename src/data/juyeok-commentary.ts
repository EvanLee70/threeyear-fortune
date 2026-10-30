// 주역 상세 해설 — 괘상(팔괘 구조) 읽기, 변효 자리·성질 풀이, 실천 가이드.
// 전부 결정론(괘 데이터에서 유도)이며 화면과 스냅샷이 함께 쓴다.
import type { Line } from '../engine/juyeok.ts'
import { isYang } from '../engine/juyeok.ts'

/** Korean particle by final consonant: josa('우레','이','가') -> '이'. Pass ('집','으로','로') for 으로/로 (ㄹ final takes 로). */
export function josa(word: string, withFinal: string, without: string): string {
  const c = word.charCodeAt(word.length - 1) - 0xac00
  if (c < 0 || c > 11171) return without
  const f = c % 28
  return f === 0 || (withFinal === '으로' && f === 8) ? without : withFinal
}

/** Meaning of each line position, bottom first */
export const LINE_STAGE = [
  '초효(初爻·맨 아래) — 막 시작하는 자리로, 아직 드러나지 않은 준비의 단계입니다.',
  '이효(二爻) — 아래 괘의 중심으로, 겉으로 드러나 실력을 인정받기 시작하는 자리입니다.',
  '삼효(三爻) — 안과 밖의 경계로, 욕심과 무리를 경계해야 하는 갈림길입니다.',
  '사효(四爻) — 위 괘로 막 올라선 자리로, 윗사람과 가까워지는 만큼 조심스러운 자리입니다.',
  '오효(五爻) — 위 괘의 중심으로, 가장 힘이 실리고 책임도 큰 자리입니다.',
  '상효(上爻·맨 위) — 끝에 다다른 자리로, 정점을 지나 물러나고 정리할 때를 말합니다.',
]

/** 팔괘(八卦) 상세 — index: 건0 태1 리2 진3 손4 감5 간6 곤7 (engine.trigramIndex와 동일 순서) */
export interface TrigramInfo {
  ko: string; hanja: string; symbol: string
  nature: string   // 자연물 상(象)
  virtue: string   // 덕(德) — 성질
  hint: string     // 생활 속 함의
}
export const TRIGRAMS: TrigramInfo[] = [
  { ko: '건', hanja: '乾', symbol: '☰', nature: '하늘', virtue: '굳셈(健)', hint: '주도·결단·아버지의 기운' },
  { ko: '태', hanja: '兌', symbol: '☱', nature: '못(澤)', virtue: '기쁨(說)', hint: '말·교류·즐거움의 기운' },
  { ko: '리', hanja: '離', symbol: '☲', nature: '불', virtue: '밝음(麗)', hint: '지혜·명예·드러남의 기운' },
  { ko: '진', hanja: '震', symbol: '☳', nature: '우레', virtue: '움직임(動)', hint: '시작·분발·놀람의 기운' },
  { ko: '손', hanja: '巽', symbol: '☴', nature: '바람', virtue: '스며듦(入)', hint: '설득·유연함·소문의 기운' },
  { ko: '감', hanja: '坎', symbol: '☵', nature: '물', virtue: '험난(陷)', hint: '시련·지혜·인내의 기운' },
  { ko: '간', hanja: '艮', symbol: '☶', nature: '산', virtue: '멈춤(止)', hint: '안정·신중·기다림의 기운' },
  { ko: '곤', hanja: '坤', symbol: '☷', nature: '땅', virtue: '순응(順)', hint: '포용·성실·어머니의 기운' },
]

function trigramIndexOf(l1: boolean, l2: boolean, l3: boolean): number {
  const key = `${l1 ? 1 : 0}${l2 ? 1 : 0}${l3 ? 1 : 0}`
  return ['111', '110', '101', '100', '011', '010', '001', '000'].indexOf(key)
}

/** 본괘의 상괘·하괘 팔괘 정보 */
export function trigramsOfCast(lines: readonly Line[]): { lower: TrigramInfo; upper: TrigramInfo } {
  const yangs = lines.map(isYang)
  return {
    lower: TRIGRAMS[trigramIndexOf(yangs[0], yangs[1], yangs[2])],
    upper: TRIGRAMS[trigramIndexOf(yangs[3], yangs[4], yangs[5])],
  }
}

/** 괘상(卦象) 해설 문단 — "위는 산, 아래는 바람…" */
export function hexagramImagery(lines: readonly Line[]): string {
  const { lower, upper } = trigramsOfCast(lines)
  const same = lower.ko === upper.ko
  const shape = same
    ? `${upper.nature}(${upper.ko}·${upper.hanja}) 위에 다시 ${lower.nature}${josa(lower.nature, '이', '가')} 겹친 순괘(純卦)로, ${upper.virtue}의 기운이 안팎으로 가득한 모습입니다.`
    : `위(바깥)는 ${upper.nature}(${upper.ko}·${upper.hanja}), 아래(안)는 ${lower.nature}(${lower.ko}·${lower.hanja}) — ${upper.nature} 아래 ${lower.nature}${josa(lower.nature, '이', '가')} 자리한 상(象)입니다.`
  return [
    shape,
    `바깥으로는 ${upper.virtue}, 즉 ${upper.hint}이 드러나고, 안으로는 ${lower.virtue}, 즉 ${lower.hint}이 바탕이 됩니다.`,
    `바깥 형세(${upper.ko})는 지금 상황이 흘러가는 방향을, 안의 바탕(${lower.ko})은 나의 마음가짐과 준비 상태를 비추어 읽습니다.`,
  ].join(' ')
}

/** 변효 하나의 상세 풀이 — 자리(位) + 노양/노음 성질 + 정위(正位) 여부 */
export function changingLineDetail(value: Line, index: number): string {
  const stage = LINE_STAGE[index]
  const oldYang = value === 9
  const nature = oldYang
    ? '노양(老陽·9) — 양의 기운이 정점에 달해 이제 꺾여 음으로 돌아서는 자리입니다. 잘 되는 일일수록 절제하고 다음을 준비하라는 신호입니다.'
    : '노음(老陰·6) — 움츠렸던 음의 기운이 다하여 양으로 펴지는 자리입니다. 오래 눌려 있던 일이 풀리기 시작한다는 신호입니다.'
  const oddPosition = index % 2 === 0 // 초(1)·3·5효가 양위
  const proper = isYang(value) === oddPosition
  const properText = proper
    ? '지금 모습이 제자리에 맞는 정위(正位)라 변화가 순리대로 흐릅니다.'
    : '지금 모습이 자리와 어긋난 부정위(不正位)라, 변화 과정에서 자리를 바로잡는 진통이 따를 수 있습니다.'
  return `${stage} ${nature} ${properText}`
}

/** 변효 개수에 따른 읽기 규칙 안내 */
export function changingCountGuide(count: number): string {
  if (count === 0) return '변효가 없으니 본괘의 괘사를 그대로 새깁니다. 형세가 안정되어 있어 큰 방향 전환 없이 지금의 길을 유지하는 것이 좋습니다.'
  if (count === 1) return '변효가 하나뿐이니 그 자리의 뜻이 올해의 핵심입니다. 해당 효가 가리키는 일에 집중하세요.'
  if (count <= 3) return '변효가 여럿이니 형세가 움직이는 중입니다. 본괘(현재)보다 지괘(방향)의 뜻에 무게를 두고, 변하는 자리들을 순서대로 정리해 보세요.'
  return '변효가 많아 판이 크게 바뀌는 해입니다. 개별 자리보다 지괘 전체의 뜻을 읽고, 큰 흐름의 전환을 받아들이는 것이 지혜롭습니다.'
}

/** 점수·괘 성격 기반 실천 가이드 (Do / Don't) */
export function castGuidance(score: number, lines: readonly Line[]): { dos: string[]; donts: string[] } {
  const s = score
  const { upper, lower } = trigramsOfCast(lines)
  const dos: string[] = []
  const donts: string[] = []
  if (s >= 85) {
    dos.push('미뤄둔 시작·제안·결정을 올해 안에 하나씩 실행에 옮기기', '도움을 준 사람에게 감사를 표현하기')
    donts.push('좋은 흐름을 믿고 과속하기 — 이길 때 멈출 줄 아는 것이 상책')
  } else if (s >= 70) {
    dos.push('진행 중인 일의 완성도 높이기', '작은 성취를 기록해 흐름을 굳히기')
    donts.push('무리한 확장이나 즉흥적인 약속')
  } else {
    dos.push('결정을 서두르지 말고 정보를 더 모으기', '생활 리듬과 인간관계 같은 기본기를 점검하기')
    donts.push('큰 결정과 다툼을 서두르는 것 — 올해는 지키는 해')
  }
  // 팔괘 성질에서 한 가지씩
  dos.push(`${upper.nature}의 ${upper.virtue}을 빌리기 — ${upper.hint}을 활용하는 해`)
  donts.push(`${lower.nature}의 그림자 경계 — ${lower.ko === '감' ? '무리한 모험' : lower.ko === '진' ? '성급한 행동' : lower.ko === '태' ? '말이 앞서는 것' : lower.ko === '리' ? '겉치레와 과시' : lower.ko === '건' ? '독단' : lower.ko === '손' ? '우유부단' : lower.ko === '간' ? '지나친 망설임' : '수동적 미루기'}`)
  return { dos, donts }
}
