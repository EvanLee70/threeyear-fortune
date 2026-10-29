// 출처: 사주명리 마스터 AI 완전판 시스템 프롬프트 v2.0 §1.2.10 (454~472행)

export interface SibiunseongInfo {
  han: string;
  lifeStage: string;
  energy: number;
  keywords: string;
}

export const SIBIUNSEONG_INFO: Record<string, SibiunseongInfo> = {
  장생: {
    han: '長生',
    lifeStage: '탄생',
    energy: 4,
    keywords: '시작, 희망, 성장 가능성, 새로운 출발',
  },
  목욕: {
    han: '沐浴',
    lifeStage: '목욕(유아기)',
    energy: 2,
    keywords: '불안정, 변화, 유혹, 새 환경 적응',
  },
  관대: {
    han: '冠帶',
    lifeStage: '성인식',
    energy: 3,
    keywords: '성장, 준비, 자립, 독립, 패기',
  },
  건록: {
    han: '建祿',
    lifeStage: '직장인',
    energy: 5,
    keywords: '전성기, 안정, 실력 발휘, 녹봉',
  },
  제왕: {
    han: '帝旺',
    lifeStage: '왕',
    energy: 5,
    keywords: '최정점, 왕성함, 성공, 권력',
  },
  쇠: {
    han: '衰',
    lifeStage: '퇴직',
    energy: 3,
    keywords: '하강 시작, 안정 추구, 정리',
  },
  병: {
    han: '病',
    lifeStage: '병든 노인',
    energy: 2,
    keywords: '약해짐, 소극적, 휴식 필요',
  },
  사: {
    han: '死',
    lifeStage: '죽음',
    energy: 1,
    keywords: '멈춤, 정체, 전환점, 끝',
  },
  묘: {
    han: '墓',
    lifeStage: '무덤(저장)',
    energy: 2,
    keywords: '저장, 잠복, 내면 성찰, 축적',
  },
  절: {
    han: '絶',
    lifeStage: '영혼(공백)',
    energy: 1,
    keywords: '단절, 공백, 새로운 준비',
  },
  태: {
    han: '胎',
    lifeStage: '잉태',
    energy: 2,
    keywords: '잉태, 계획, 구상, 시작 전',
  },
  양: {
    han: '養',
    lifeStage: '태아 양육',
    energy: 3,
    keywords: '양육, 보호, 성장 대기',
  },
};
