/**
 * 천간(天干) 데이터 - 10개
 *
 * 갑을병정무기경신임계 순서와 음양·오행은 모든 명리학 문헌이 일치하는
 * 고정된 고전 데이터다. 갑(甲)=인덱스 0부터 계(癸)=인덱스 9까지 순환한다.
 */

import type { HeavenlyStem, WuXing, YinYang } from '../types/index.js';

export interface HeavenlyStemData {
  /** 0(갑) ~ 9(계) */
  index: number;
  korean: HeavenlyStem;
  hanja: string;
  element: WuXing;
  yinYang: YinYang;
}

export const HEAVENLY_STEMS: readonly HeavenlyStemData[] = [
  { index: 0, korean: '갑', hanja: '甲', element: '목', yinYang: '양' },
  { index: 1, korean: '을', hanja: '乙', element: '목', yinYang: '음' },
  { index: 2, korean: '병', hanja: '丙', element: '화', yinYang: '양' },
  { index: 3, korean: '정', hanja: '丁', element: '화', yinYang: '음' },
  { index: 4, korean: '무', hanja: '戊', element: '토', yinYang: '양' },
  { index: 5, korean: '기', hanja: '己', element: '토', yinYang: '음' },
  { index: 6, korean: '경', hanja: '庚', element: '금', yinYang: '양' },
  { index: 7, korean: '신', hanja: '辛', element: '금', yinYang: '음' },
  { index: 8, korean: '임', hanja: '壬', element: '수', yinYang: '양' },
  { index: 9, korean: '계', hanja: '癸', element: '수', yinYang: '음' },
] as const;

/**
 * 인덱스로 천간 조회 (0-9 순환, 범위를 벗어나면 정규화)
 */
export function getHeavenlyStemByIndex(index: number): HeavenlyStemData {
  const normalized = ((index % 10) + 10) % 10;
  return HEAVENLY_STEMS[normalized]!;
}

/**
 * 한글 표기로 천간 조회
 */
export function getHeavenlyStemByKorean(korean: HeavenlyStem): HeavenlyStemData | undefined {
  return HEAVENLY_STEMS.find((stem) => stem.korean === korean);
}
