/**
 * 오행(五行) 상생상극 및 속성 데이터
 * 목생화, 화생토, 토생금, 금생수, 수생목 (상생)
 * 목극토, 토극수, 수극화, 화극금, 금극목 (상극)
 */

import type { WuXing } from '../types/index.js';

interface WuXingInfo {
  hanja: string;
  personality: string[];
  color: string[];
  direction: string;
  season: string;
}

/** 오행별 속성 (한자, 성격 특성, 색상, 방향, 계절) */
export const WUXING_DATA: Record<WuXing, WuXingInfo> = {
  목: {
    hanja: '木',
    personality: ['창의적', '성장지향적', '유연함', '진취적'],
    color: ['초록색', '청색'],
    direction: '동',
    season: '봄',
  },
  화: {
    hanja: '火',
    personality: ['열정적', '사교적', '적극적', '표현력이 풍부함'],
    color: ['빨간색', '주황색'],
    direction: '남',
    season: '여름',
  },
  토: {
    hanja: '土',
    personality: ['안정적', '신뢰할 만함', '포용력 있음', '성실함'],
    color: ['노란색', '황토색'],
    direction: '중앙',
    season: '환절기',
  },
  금: {
    hanja: '金',
    personality: ['원칙적', '결단력 있음', '정의로움', '냉철함'],
    color: ['흰색', '은색'],
    direction: '서',
    season: '가을',
  },
  수: {
    hanja: '水',
    personality: ['지혜로움', '분석적', '유연함', '침착함'],
    color: ['검은색', '남색'],
    direction: '북',
    season: '겨울',
  },
};

/** 상생(相生): key가 생(生)하는 대상 오행 */
export const WUXING_GENERATION: Record<WuXing, WuXing> = {
  목: '화',
  화: '토',
  토: '금',
  금: '수',
  수: '목',
};

/** 상극(相克): key가 극(克)하는 대상 오행 */
export const WUXING_DESTRUCTION: Record<WuXing, WuXing> = {
  목: '토',
  토: '수',
  수: '화',
  화: '금',
  금: '목',
};

/**
 * 사주 내 오행 분포의 균형 분석
 * strong: 평균의 2배 이상 나타난 오행, weak: 아예 없는(0개) 오행
 */
export function analyzeWuXingBalance(
  wuxingCount: Record<WuXing, number>
): { balanced: boolean; strong: WuXing[]; weak: WuXing[] } {
  const elements: WuXing[] = ['목', '화', '토', '금', '수'];
  const total = elements.reduce((sum, e) => sum + wuxingCount[e], 0);
  const average = total / elements.length;

  const strong = elements.filter((e) => wuxingCount[e] >= average * 2);
  const weak = elements.filter((e) => wuxingCount[e] === 0);

  return { balanced: strong.length === 0 && weak.length === 0, strong, weak };
}

/**
 * 두 오행 사이의 상생상극 관계를 문장으로 설명
 * 호출부에서 반환 문자열에 '생'/'극'/'비화' 포함 여부로 판단하므로 반드시 해당 단어를 포함해야 함
 */
export function analyzeElementInteraction(from: WuXing, to: WuXing): string {
  if (from === to) {
    return `${from}과 ${to}는 비화(比化) 관계로 같은 기운이 힘을 더합니다.`;
  }
  if (WUXING_GENERATION[from] === to) {
    return `${from}이 ${to}를 생(生)하여 힘을 보태주는 관계입니다.`;
  }
  if (WUXING_GENERATION[to] === from) {
    return `${to}가 ${from}을 생(生)하여 도움을 받는 관계입니다.`;
  }
  if (WUXING_DESTRUCTION[from] === to) {
    return `${from}이 ${to}를 극(克)하여 억제하는 관계입니다.`;
  }
  return `${to}가 ${from}을 극(克)하여 부담을 주는 관계입니다.`;
}
// [local] added when re-syncing to upstream 844d9f6: the new lib code imports these four helpers
// (same semantics as upstream data/wuxing.ts).
/** 특정 오행을 생(生)하는 오행 */
export function getGeneratingElement(element: WuXing): WuXing {
  const reverseGeneration: Record<WuXing, WuXing> = { 목: '수', 화: '목', 토: '화', 금: '토', 수: '금' };
  return reverseGeneration[element]!;
}

/** 특정 오행이 생(生)하는 오행 */
export function getGeneratedElement(element: WuXing): WuXing {
  return WUXING_GENERATION[element]!;
}

/** 특정 오행을 극(克)하는 오행 */
export function getControllingElement(element: WuXing): WuXing {
  const reverseDestruction: Record<WuXing, WuXing> = { 목: '금', 화: '수', 토: '목', 금: '화', 수: '토' };
  return reverseDestruction[element]!;
}

/** 특정 오행이 극(克)하는 오행 */
export function getControlledElement(element: WuXing): WuXing {
  return WUXING_DESTRUCTION[element]!;
}