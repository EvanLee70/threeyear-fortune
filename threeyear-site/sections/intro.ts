// Fixed heading and one-sentence intro of each section, in display order.
import type { SystemKey } from '../../src/yearly/types.ts'

export type SectionKey = 'overview' | SystemKey | 'cautions'

export const SECTIONS: { key: SectionKey; title: string; intro: string }[] = [
  { key: 'overview', title: '종합', intro: '다섯 가지 운세 체계의 점수를 평균해 세 해를 한눈에 견주어 봅니다.' },
  { key: 'myeongri', title: '명리(命理)', intro: '태어난 해·달·날·시의 기운(사주)과 그해에 들어오는 기운(세운)이 어떻게 맞물리는지 봅니다.' },
  { key: 'ziwei', title: '자미두수(紫微斗數)', intro: '태어난 때를 열두 궁(宮)에 별을 배치한 지도로 만들고, 그해 어느 궁에 힘이 실리는지 봅니다.' },
  { key: 'astro', title: '점성술(占星術)', intro: '태어난 순간 하늘의 행성 위치와 그해 움직이는 행성이 이루는 각도(애스펙트)를 봅니다.' },
  { key: 'tojeong', title: '토정비결(土亭秘訣)', intro: '생년월일로 한 해의 괘(卦)를 뽑아 달마다의 흐름을 풀이하는 우리나라 전통 신수(身數) 풀이입니다.' },
  { key: 'juyeok', title: '주역(周易)', intro: '그해를 상징하는 괘(卦)를 여섯 줄로 그리고, 변하는 줄이 가리키는 변화의 방향을 읽습니다.' },
  { key: 'cautions', title: '조심할 점', intro: '다섯 체계에서 나온 주의사항을 겹치는 것끼리 묶어 한곳에 모았습니다.' },
]

export const OFFSET_LABEL = ['올해', '내년', '내후년']
