// 출처: 사주명리 마스터 AI 완전판 시스템 프롬프트 v2.0 §1.2.4 (156~216행)

export interface SipsinInfo {
  han: string;
  keyword: string;
  positive: string;
  negative: string;
  yukchinMale: string;
  yukchinFemale: string;
  body: string;
  careers: string;
}

export const SIPSIN_INFO: Record<string, SipsinInfo> = {
  비견: {
    han: '比肩',
    keyword: '나와 같은 것, 경쟁자, 형제',
    positive: '독립, 자신감, 주체성, 협력',
    negative: '고집, 경쟁, 분리, 고독',
    yukchinMale: '형제, 친구',
    yukchinFemale: '자매, 친구',
    body: '어깨, 팔',
    careers: '동업, 프리랜서',
  },
  겁재: {
    han: '劫財',
    keyword: '빼앗는 자, 경쟁, 동업자',
    positive: '추진력, 승부욕, 사교성',
    negative: '탈재, 배신, 투기, 손재',
    yukchinMale: '이복형제',
    yukchinFemale: '이복자매',
    body: '어깨, 팔',
    careers: '영업, 투자',
  },
  식신: {
    han: '食神',
    keyword: '먹을 것, 재능, 표현, 여유',
    positive: '먹을복, 재능, 여유, 수명',
    negative: '게으름, 나태, 탐식',
    yukchinMale: '손자',
    yukchinFemale: '아들',
    body: '소화기',
    careers: '요리, 교육, 예술',
  },
  상관: {
    han: '傷官',
    keyword: '관을 상하게 함, 창의, 반항',
    positive: '창의력, 언변, 예술성, 자유',
    negative: '반항, 비판, 관재, 이혼',
    yukchinMale: '손녀',
    yukchinFemale: '딸',
    body: '생식기',
    careers: '예술, 법률, 언론',
  },
  편재: {
    han: '偏財',
    keyword: '편한 재물, 투기, 아버지',
    positive: '횡재, 투자, 사업수완, 인맥',
    negative: '투기실패, 바람, 사기',
    yukchinMale: '아버지, 첩',
    yukchinFemale: '시아버지',
    body: '위장',
    careers: '사업, 투자, 유통',
  },
  정재: {
    han: '正財',
    keyword: '정당한 재물, 월급, 아내',
    positive: '안정, 저축, 정직, 알뜰',
    negative: '인색, 소심, 융통성 부족',
    yukchinMale: '아내',
    yukchinFemale: '시어머니',
    body: '비장',
    careers: '회계, 금융, 사무',
  },
  편관: {
    han: '偏官',
    keyword: '칠살, 권위, 압박, 명예',
    positive: '권위, 명예, 결단력, 통솔',
    negative: '압박, 질병, 관재, 폭력',
    yukchinMale: '아들',
    yukchinFemale: '애인, 정부',
    body: '신장',
    careers: '군인, 경찰, 무술',
  },
  정관: {
    han: '正官',
    keyword: '정당한 관직, 직장, 남편',
    positive: '직장, 승진, 명예, 안정',
    negative: '스트레스, 규제, 구속',
    yukchinMale: '딸',
    yukchinFemale: '남편',
    body: '방광',
    careers: '공무원, 대기업',
  },
  편인: {
    han: '偏印',
    keyword: '도식, 계모, 특수 학문',
    positive: '특수재능, 종교, 영감, 연구',
    negative: '고독, 도식, 실직, 유산',
    yukchinMale: '계모, 양모',
    yukchinFemale: '계모',
    body: '담',
    careers: '종교, 철학, 연구',
  },
  정인: {
    han: '正印',
    keyword: '정당한 도움, 어머니, 학업',
    positive: '학업, 자격증, 보호, 명예',
    negative: '의존, 나태, 게으름',
    yukchinMale: '어머니',
    yukchinFemale: '어머니',
    body: '간',
    careers: '교육, 학문, 문서',
  },
};
