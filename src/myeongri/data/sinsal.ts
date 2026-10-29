// 출처: 사주명리 마스터 AI 완전판 시스템 프롬프트 v2.0 §1.2.13 (604~713행)

export interface SinsalInfo {
  han: string;
  kind: '길신' | '흉신';
  meaning: string;
  basis: string;
}

export const SINSAL_INFO: Record<string, SinsalInfo> = {
  // 길신(吉神) - 좋은 기운의 신살
  천을귀인: {
    han: '天乙貴人',
    kind: '길신',
    meaning: '귀인의 도움, 위기 탈출, 행운',
    basis: '일간',
  },
  천덕귀인: {
    han: '天德貴人',
    kind: '길신',
    meaning: '하늘의 덕, 재난 회피, 복',
    basis: '월지',
  },
  월덕귀인: {
    han: '月德貴人',
    kind: '길신',
    meaning: '달의 덕, 어려움 극복',
    basis: '월지',
  },
  문창귀인: {
    han: '文昌貴人',
    kind: '길신',
    meaning: '학업, 시험, 문서 운',
    basis: '일간',
  },
  학당귀인: {
    han: '學堂貴人',
    kind: '길신',
    meaning: '학문, 지식, 교육',
    basis: '일간',
  },
  금여록: {
    han: '金輿祿',
    kind: '길신',
    meaning: '좋은 배우자, 결혼 운',
    basis: '일간',
  },
  천주귀인: {
    han: '天廚貴人',
    kind: '길신',
    meaning: '먹을 복, 식록',
    basis: '일간',
  },
  복성귀인: {
    han: '福星貴人',
    kind: '길신',
    meaning: '복과 행운',
    basis: '일간',
  },
  // 흉신(凶神) - 주의가 필요한 신살
  도화살: {
    han: '桃花殺',
    kind: '흉신',
    meaning: '이성 인연, 바람기, 인기',
    basis: '년지/일지',
  },
  역마살: {
    han: '驛馬殺',
    kind: '흉신',
    meaning: '이동, 변동, 여행, 분주함',
    basis: '년지/일지',
  },
  화개살: {
    han: '華蓋殺',
    kind: '흉신',
    meaning: '종교, 예술, 고독, 영성',
    basis: '년지/일지',
  },
  양인살: {
    han: '羊刃殺',
    kind: '흉신',
    meaning: '칼날, 과격함, 사고, 수술',
    basis: '일간',
  },
  겁살: {
    han: '劫殺',
    kind: '흉신',
    meaning: '도둑, 손실, 위험',
    basis: '년지/일지',
  },
  망신살: {
    han: '亡身殺',
    kind: '흉신',
    meaning: '명예 손상, 망신',
    basis: '년지/일지',
  },
  백호살: {
    han: '白虎殺',
    kind: '흉신',
    meaning: '피, 사고, 수술',
    basis: '년지/일지',
  },
  귀문관살: {
    han: '鬼門關殺',
    kind: '흉신',
    meaning: '귀신, 정신 문제, 영적 민감',
    basis: '일지',
  },
};
