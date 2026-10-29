/**
 * 紫微斗数格局识别（v2 严格化版本）
 *
 * 设计原则：
 * 1. 古书条件优先：每个格局列出"必须 / 加分 / 破格"三层结构，出处可考
 * 2. 倪师立场：不使用宫干自化、大限四化、来因宫等飞星派工具
 * 3. 庙旺利陷：用 brightness 字段（bright=庙旺、normal=平、dim=陷）
 * 4. 三方四正会照：命宫 + 财帛 + 官禄 + 迁移
 * 5. 夹宫：命宫前后两宫
 *
 * 主要古籍出处：
 *  - 《紫微斗数全集》（陈抟祖师传，明代刊本）
 *  - 《紫微斗数全书》（罗洪先编，明代刊本）
 *  - 《骨髓赋》《女命骨髓赋》《十二宫诸星得地合格诀》
 *  - 倪师《天纪》紫微斗数讲义
 */

import type { ZiweiChart, Palace, Star } from './types';

// ────────────────── 类型 ──────────────────
export interface PatternCondition {
  required: string[];   // 必须满足条件（已通过的）
  bonus?: string[];     // 加分项（已触发）
  breaking?: string[];  // 破格警示（已触发）
}

export interface Pattern {
  name: string;
  level: 'excellent' | 'good' | 'neutral' | 'caution';
  description: string;
  palaces: string[];                 // 涉及宫位
  conditions?: PatternCondition;     // 成立条件分层（v2 新增）
  source?: string;                   // 古籍出处（v2 新增）
}

// ────────────────── 常量 ──────────────────
const SHA_NAMES = ['擎羊', '陀罗', '火星', '铃星', '地空', '地劫'];
const SHA_HARD = ['擎羊', '陀罗', '火星', '铃星'];   // 四煞
const SHA_KONG = ['地空', '地劫'];                  // 空劫
const ZUO_YOU = ['左辅', '右弼'];
const CHANG_QU = ['文昌', '文曲'];
const KUI_YUE = ['天魁', '天钺'];

// ────────────────── 辅助函数 ──────────────────
function getMajorStarNames(palace: Palace): string[] {
  return palace.stars.filter(s => s.type === 'major').map(s => s.name);
}
function findStar(palace: Palace, name: string): Star | undefined {
  return palace.stars.find(s => s.name === name);
}
function hasStar(palace: Palace, name: string): boolean {
  return palace.stars.some(s => s.name === name);
}
function findStarPalace(chart: ZiweiChart, name: string): Palace | undefined {
  return chart.palaces.find(p => p.stars.some(s => s.name === name));
}
function getPalaceByBranch(chart: ZiweiChart, branch: number): Palace | undefined {
  return chart.palaces.find(p => p.branch === ((branch % 12) + 12) % 12);
}
function shaCountInPalace(palace: Palace, list: string[] = SHA_HARD): number {
  return palace.stars.filter(s => list.includes(s.name)).length;
}
function hasShaInPalace(palace: Palace, list: string[] = SHA_NAMES): boolean {
  return palace.stars.some(s => list.includes(s.name));
}
function getSanFangPalaces(chart: ZiweiChart): Palace[] {
  const m = chart.mingGongBranch;
  const branches = [m, (m + 4) % 12, (m + 8) % 12, (m + 6) % 12];
  return chart.palaces.filter(p => branches.includes(p.branch));
}
function isInSanFang(chart: ZiweiChart, branch: number): boolean {
  const m = chart.mingGongBranch;
  return [m, (m + 4) % 12, (m + 8) % 12, (m + 6) % 12].includes(branch);
}
function getDuiGong(chart: ZiweiChart, branch: number): Palace | undefined {
  return getPalaceByBranch(chart, (branch + 6) % 12);
}
function getJiaPalaces(chart: ZiweiChart, branch: number): { prev?: Palace; next?: Palace } {
  return {
    prev: getPalaceByBranch(chart, (branch + 11) % 12),
    next: getPalaceByBranch(chart, (branch + 1) % 12),
  };
}
function sanFangAllStars(chart: ZiweiChart): Set<string> {
  return new Set(getSanFangPalaces(chart).flatMap(p => p.stars.map(s => s.name)));
}
function sanFangShaCount(chart: ZiweiChart, list: string[] = SHA_HARD): number {
  return getSanFangPalaces(chart).reduce((sum, p) => sum + shaCountInPalace(p, list), 0);
}
function isBright(palace: Palace, starName: string): boolean {
  const s = findStar(palace, starName);
  return s?.brightness === 'bright';
}
function isDim(palace: Palace, starName: string): boolean {
  const s = findStar(palace, starName);
  return s?.brightness === 'dim';
}
function getStarSiHua(palace: Palace, starName: string): Star['siHua'] | undefined {
  return findStar(palace, starName)?.siHua;
}
const BRANCH_NAMES = ['자(子)', '축(丑)', '인(寅)', '묘(卯)', '진(辰)', '사(巳)', '오(午)', '미(未)', '신(申)', '유(酉)', '술(戌)', '해(亥)'];

// [local change] 화면에 보이는 풀이를 한국어로 옮겼다. 별 이름이 문장에 끼는 곳은 ko()를 거친다.
// pattern.name은 그대로 둔다 (components/gyeokguk/names.ts가 이 이름을 키로 한글 제목을 붙인다).
export const STAR_KO: Record<string, string> = {
  '紫微': '자미(紫微)', '天机': '천기(天機)', '太阳': '태양(太陽)', '武曲': '무곡(武曲)', '天同': '천동(天同)',
  '廉贞': '염정(廉貞)', '天府': '천부(天府)', '太阴': '태음(太陰)', '贪狼': '탐랑(貪狼)', '巨门': '거문(巨門)',
  '天相': '천상(天相)', '天梁': '천량(天梁)', '七杀': '칠살(七殺)', '破军': '파군(破軍)',
  '火星': '화성(火星)', '铃星': '영성(鈴星)',
};
const ko = (n: string): string => STAR_KO[n] ?? n;

// ────────────────── 正格识别器 ──────────────────

/** 君臣庆会：紫微入命，左辅右弼同会（同宫或三方） */
function detectJunChenQingHui(chart: ZiweiChart, ming: Palace, patterns: Pattern[]) {
  if (!hasStar(ming, '紫微')) return;
  const sanFangSet = sanFangAllStars(chart);
  const hasZuo = sanFangSet.has('左辅');
  const hasYou = sanFangSet.has('右弼');
  if (!hasZuo || !hasYou) return;

  const required = ['자미(紫微)가 명궁에 있음', '좌보(左輔)·우필(右弼)이 삼방사정에서 함께 만남'];
  const bonus: string[] = [];
  const breaking: string[] = [];
  if (sanFangSet.has('文昌') || sanFangSet.has('文曲')) bonus.push('문창(文昌) 또는 문곡(文曲)을 다시 만남');
  if (sanFangSet.has('天魁') || sanFangSet.has('天钺')) bonus.push('천괴(天魁)·천월(天鉞) 귀인이 더해짐');
  if (getStarSiHua(ming, '紫微') === '权') bonus.push('자미(紫微)가 화권(化權)이 됨');
  if (sanFangShaCount(chart, SHA_KONG) >= 2) breaking.push('지공(地空)·지겁(地劫)이 함께 비춤 (자미는 공겁을 꺼림)');

  patterns.push({
    name: '君臣庆会',
    level: breaking.length ? 'good' : 'excellent',
    description: '자미(紫微)가 명궁에 있고 좌보(左輔)·우필(右弼)이 함께 모입니다. 군주가 어진 신하의 보좌를 받는 모양으로, 크게 귀하고 부유하며 사람을 이끄는 명으로 풀이합니다. 평생 귀인이 끊이지 않고, 정계·재계의 높은 자리나 여러 분야를 아우르는 지도자의 길이 어울린다고 봅니다.',
    palaces: ['命宫'],
    conditions: { required, bonus, breaking },
    source: '《자미두수전서(紫微斗數全書)·군신경회격(君臣慶會格)》',
  });
}

/** 紫府同宫：紫微+天府于命宫（限寅、申宫） */
function detectZiFu(chart: ZiweiChart, ming: Palace, patterns: Pattern[]) {
  const ziwei = findStarPalace(chart, '紫微');
  const tianfu = findStarPalace(chart, '天府');
  if (!ziwei || !tianfu || ziwei.branch !== tianfu.branch) return;

  const inMing = ziwei.branch === chart.mingGongBranch;
  const required = inMing
    ? ['자미(紫微)·천부(天府)가 함께 명궁에 듦']
    : ['자미(紫微)·천부(天府)가 동궁하나 명궁은 아님 (회조라 힘이 줄어듦)'];
  const bonus: string[] = [];
  const breaking: string[] = [];
  const sanFangSet = sanFangAllStars(chart);
  if (sanFangSet.has('左辅') && sanFangSet.has('右弼')) bonus.push('좌보(左輔)·우필(右弼)이 함께 만남');
  if (sanFangSet.has('文昌') || sanFangSet.has('文曲')) bonus.push('창곡(昌曲)을 다시 만남');
  if (hasShaInPalace(ziwei, SHA_KONG)) breaking.push('자부(紫府)궁에 공겁(空劫)이 앉음 (자부의 귀한 기운이 깨짐)');
  if (shaCountInPalace(ziwei, SHA_HARD) >= 2) breaking.push('자부(紫府)궁에 살성(煞星) 둘 이상이 함께 앉음');

  patterns.push({
    name: '紫府同宫',
    level: inMing && !breaking.length ? 'excellent' : 'good',
    description: inMing
      ? '자미(紫微)·천부(天府)가 함께 명궁에 들어 제왕과 재상이 나란히 임한 모양입니다. 품행이 바르고 의식이 넉넉하며 지도력이 있어 중책에 어울린다고 봅니다. 좌보·우필이 함께해야 온전한 큰 격이 됩니다.'
      : '자미(紫微)·천부(天府)가 동궁하지만 명궁은 아닙니다. 평생 귀인과 귀한 기운에 기댈 수 있으나 본인이 반드시 크게 귀하고 부유한 것은 아니며, 회조하는 길성과 살성을 함께 보아 정합니다.',
    palaces: [ziwei.name],
    conditions: { required, bonus, breaking },
    source: '《자미두수전서(紫微斗數全書)·자부동궁격(紫府同宮格)》',
  });
}

/** 府相朝垣：天府、天相分别坐守命宫的三方四正 */
function detectFuXiangChaoYuan(chart: ZiweiChart, ming: Palace, patterns: Pattern[]) {
  const tianfu = findStarPalace(chart, '天府');
  const tianxiang = findStarPalace(chart, '天相');
  if (!tianfu || !tianxiang) return;
  if (!isInSanFang(chart, tianfu.branch) || !isInSanFang(chart, tianxiang.branch)) return;
  if (tianfu.branch === chart.mingGongBranch && tianxiang.branch === chart.mingGongBranch) return;
  if (tianfu.branch === tianxiang.branch) return;

  const required = ['천부(天府)가 명궁 삼방에 있음', '천상(天相)이 명궁 삼방에 있음', '두 별이 같은 궁이 아님'];
  const bonus: string[] = [];
  const breaking: string[] = [];
  if (hasStar(ming, '禄存') || hasStar(ming, '化禄')) bonus.push('명궁에 녹(祿)이 보임');
  if (sanFangAllStars(chart).has('左辅')) bonus.push('좌보(左輔)를 다시 만남');
  if (hasShaInPalace(ming, SHA_HARD)) breaking.push('명궁에 살성(煞星)이 앉음');
  if (sanFangShaCount(chart, SHA_HARD) >= 3) breaking.push('삼방사정에 살성(煞星)이 너무 많음');

  patterns.push({
    name: '府相朝垣',
    level: breaking.length ? 'good' : 'excellent',
    description: '천부(天府)·천상(天相)이 명궁 삼방사정을 나누어 지킵니다. 문무를 겸하고 권위와 인장이 함께 빛나, 평생 의식이 넉넉하고 지위가 높다고 풀이합니다. 고서에 "부상조원 천종식록(府相朝垣千鍾食祿)"이라 했으며, 정계나 기업 관리자에게 흔히 보입니다.',
    palaces: [tianfu.name, tianxiang.name],
    conditions: { required, bonus, breaking },
    source: '《자미두수전서(紫微斗數全書)·부상조원격(府相朝垣格)》',
  });
}

/** 阳梁昌禄：太阳+天梁+文昌+禄存四星会命宫，大贵格 */
function detectYangLiangChangLu(chart: ZiweiChart, ming: Palace, patterns: Pattern[]) {
  const sanFangSet = sanFangAllStars(chart);
  if (!sanFangSet.has('太阳') || !sanFangSet.has('天梁') ||
      !sanFangSet.has('文昌') || !sanFangSet.has('禄存')) return;

  const sun = findStarPalace(chart, '太阳')!;
  const liang = findStarPalace(chart, '天梁')!;
  const required = [
    '태양(太陽)이 명궁 삼방에서 만남',
    '천량(天梁)이 명궁 삼방에서 만남',
    '문창(文昌)이 명궁 삼방에서 만남',
    '녹존(祿存)이 명궁 삼방에서 만남',
  ];
  const bonus: string[] = [];
  const breaking: string[] = [];
  if (isBright(sun, '太阳')) bonus.push('태양(太陽)이 묘왕(廟旺)');
  if (isBright(liang, '天梁')) bonus.push('천량(天梁)이 묘왕(廟旺)');
  if (sanFangSet.has('化科')) bonus.push('화과(化科)를 다시 만남');
  if (isDim(sun, '太阳')) breaking.push('태양(太陽)이 낙함(落陷) (양량이 빛을 잃음)');
  if (sanFangShaCount(chart, SHA_HARD) >= 2) breaking.push('삼방에 살성(煞星)이 무거움');

  patterns.push({
    name: '阳梁昌禄',
    level: breaking.length ? 'good' : 'excellent',
    description: '태양(太陽)·천량(天梁)·문창(文昌)·녹존(祿存) 네 별이 명궁 삼방에 모입니다. "과거의 별"이라 불리며, 맑고 귀하게 드러나고 시험운이 좋다고 봅니다. 학문·교육·연구·전문 자격의 길이 어울리고 공명을 이루기 쉽다고 풀이합니다.',
    palaces: [sun.name, liang.name],
    conditions: { required, bonus, breaking },
    source: '《자미두수전서(紫微斗數全書)·양량창록격(陽梁昌祿格)》',
  });
}

/** 火贪格 / 铃贪格：贪狼+火星 或 贪狼+铃星 同宫或会照 */
function detectHuoTanLingTan(chart: ZiweiChart, ming: Palace, patterns: Pattern[]) {
  const tan = findStarPalace(chart, '贪狼');
  if (!tan) return;
  const huo = findStarPalace(chart, '火星');
  const ling = findStarPalace(chart, '铃星');

  for (const [shaName, shaPalace] of [['火星', huo], ['铃星', ling]] as const) {
    if (!shaPalace) continue;
    const sameOrTrine =
      tan.branch === shaPalace.branch ||
      (tan.branch + 4) % 12 === shaPalace.branch ||
      (tan.branch + 8) % 12 === shaPalace.branch ||
      (tan.branch + 6) % 12 === shaPalace.branch;
    if (!sameOrTrine) continue;
    if (!isInSanFang(chart, tan.branch)) continue;

    const required = [`탐랑(貪狼)·${ko(shaName)} ${tan.branch === shaPalace.branch ? '동궁(同宮)' : '회조(會照)'}`, '탐랑(貪狼)이 명궁 삼방에서 만남'];
    const bonus: string[] = [];
    const breaking: string[] = [];
    if (isBright(tan, '贪狼')) bonus.push('탐랑(貪狼)이 묘왕(廟旺)');
    if (getStarSiHua(tan, '贪狼') === '禄' || getStarSiHua(tan, '贪狼') === '权') bonus.push('탐랑(貪狼)이 화록(化祿) 또는 화권(化權)');
    if (hasShaInPalace(tan, ['擎羊', '陀罗'])) breaking.push('탐랑(貪狼)궁에 양타(羊陀)도 보임 (횡발의 힘이 깨짐)');
    if (hasShaInPalace(tan, SHA_KONG)) breaking.push('탐랑(貪狼)이 공겁(空劫)을 만남 (재물이 들고 남)');

    patterns.push({
      name: shaName === '火星' ? '火贪格' : '铃贪格',
      level: breaking.length ? 'good' : 'excellent',
      description: `탐랑(貪狼)과 ${ko(shaName)}이 ${tan.branch === shaPalace.branch ? '동궁합니다' : '삼방에서 회조합니다'}. 갑작스러운 횡재와 뜻밖의 기회로 풀이합니다. 고서에 “탐랑이 화령을 만나면 반드시 횡재한다(貪狼遇火鈴，必發橫財)”고 했으나, 빨리 오는 만큼 빨리 나가므로 적당할 때 거두는 것이 좋다고 봅니다.${breaking.length ? ' 이 명반은 파격 조건이 걸려 힘이 줄어듭니다.' : ''}`,
      palaces: [tan.name, shaPalace.name],
      conditions: { required, bonus, breaking },
      source: '《자미두수골수부(紫微斗數骨髓賦)》',
    });
  }
}

/** 武贪格：武曲+贪狼 同宫（丑、未） 或 对照 */
function detectWuTan(chart: ZiweiChart, ming: Palace, patterns: Pattern[]) {
  const wu = findStarPalace(chart, '武曲');
  const tan = findStarPalace(chart, '贪狼');
  if (!wu || !tan) return;
  const sameOrOppose = wu.branch === tan.branch || (wu.branch + 6) % 12 === tan.branch;
  if (!sameOrOppose) return;
  if (!isInSanFang(chart, wu.branch) && !isInSanFang(chart, tan.branch)) return;

  const required = [
    wu.branch === tan.branch ? '무곡(武曲)·탐랑(貪狼)이 동궁 (축/미)' : '무곡(武曲)·탐랑(貪狼)이 대궁에서 공조(拱照)',
    '명궁 삼방에서 만남',
  ];
  const bonus: string[] = [];
  const breaking: string[] = [];
  if (sanFangAllStars(chart).has('火星') || sanFangAllStars(chart).has('铃星'))
    bonus.push('화성(火星)/영성(鈴星)을 다시 만남 (화탐/영탐이 겹침)');
  if (getStarSiHua(wu, '武曲') === '禄') bonus.push('무곡(武曲)이 화록(化祿)');
  if (hasShaInPalace(wu, ['擎羊', '陀罗'])) breaking.push('무탐(武貪)궁에 양타(羊陀)가 보임');
  if (hasShaInPalace(wu, SHA_KONG)) breaking.push('무탐(武貪)궁이 공겁(空劫)을 만남');

  patterns.push({
    name: '武贪格',
    level: breaking.length ? 'good' : 'excellent',
    description: '무곡(武曲)·탐랑(貪狼)이 명궁에 모입니다. 재물의 별과 도화·욕망의 별이 함께 빛나는 모양입니다. 고서에 "무탐은 젊은 사람에게는 발하지 않는다(武貪不發少年人)"고 했듯이 서른 이후에 차곡차곡 쌓인 힘이 터진다고 봅니다. 중년 이후 재물이 커지고 그 원천은 인맥·교제·욕망 관리라고 풀이하며, 금융·투자·영업·연예 분야가 어울립니다.',
    palaces: [wu.name, tan.name],
    conditions: { required, bonus, breaking },
    source: '《자미두수골수부(紫微斗數骨髓賦)》',
  });
}

/** 杀破狼：七杀、破军、贪狼三方齐聚 */
function detectShaPoLang(chart: ZiweiChart, ming: Palace, patterns: Pattern[]) {
  const sanFangSet = sanFangAllStars(chart);
  const has = ['七杀', '破军', '贪狼'].filter(s => sanFangSet.has(s));
  if (has.length < 3) return;

  const required = ['칠살(七殺)·파군(破軍)·탐랑(貪狼) 세 별이 명궁 삼방사정에 모두 듦'];
  const bonus: string[] = [];
  const breaking: string[] = [];
  if (sanFangSet.has('化禄') || sanFangSet.has('化权')) bonus.push('삼방에 화록(化祿) 또는 화권(化權)이 있음 (움직임에 힘이 실림)');
  if (sanFangSet.has('左辅') && sanFangSet.has('右弼')) bonus.push('좌보·우필이 함께 만남 (변동 중에 귀인을 얻음)');
  if (sanFangShaCount(chart, SHA_HARD) >= 3) breaking.push('살성(煞星)이 너무 무거움 (움직여도 이루지 못함)');
  if (hasShaInPalace(ming, SHA_KONG)) breaking.push('명궁에 공겁(空劫)이 앉음 (움직임이 고단함)');

  patterns.push({
    name: '杀破狼',
    level: breaking.length ? 'caution' : 'good',
    description: '칠살(七殺)·파군(破軍)·탐랑(貪狼) 세 별이 명궁에 모입니다. 새로 열고 부딪치며 나아가는 명격입니다. 평생 변동이 많고 평범함에 만족하지 못하며, 창업·군경·영업·판매가 어울립니다. 중년 이후에야 안정적으로 지킬 수 있고 젊을 때는 충동으로 손해 보기 쉽다고 봅니다.',
    palaces: getSanFangPalaces(chart).filter(p => has.includes(getMajorStarNames(p)[0])).map(p => p.name),
    conditions: { required, bonus, breaking },
    source: '《자미두수전서(紫微斗數全書)·살파랑(殺破狼)》',
  });
}

/** 机月同梁：天机、太阴、天同、天梁四星齐入命迁财官 */
function detectJiYueTongLiang(chart: ZiweiChart, ming: Palace, patterns: Pattern[]) {
  const sanFangSet = sanFangAllStars(chart);
  const has = ['天机', '太阴', '天同', '天梁'].filter(s => sanFangSet.has(s));
  if (has.length < 4) return;

  const required = ['천기(天機)·태음(太陰)·천동(天同)·천량(天梁) 네 별이 명궁 삼방사정에 모두 듦'];
  const bonus: string[] = [];
  const breaking: string[] = [];
  if (sanFangSet.has('文昌') || sanFangSet.has('文曲')) bonus.push('창곡(昌曲)을 다시 만남');
  if (sanFangSet.has('化科')) bonus.push('화과(化科)를 다시 만남');
  if (sanFangShaCount(chart, SHA_HARD) >= 3) breaking.push('살성(煞星)이 너무 많음 (기월동량은 살성을 꺼림)');
  if (hasShaInPalace(ming, SHA_HARD)) breaking.push('명궁에 살성(煞星)이 앉음');

  patterns.push({
    name: '机月同梁',
    level: breaking.length ? 'good' : 'excellent',
    description: '천기(天機)·태음(太陰)·천동(天同)·천량(天梁) 네 별이 명궁·천이·재백·관록에 모입니다. 점잖고 총명하며 꾀가 많다고 봅니다. 공직·학문·예술·의료·서비스처럼 꾸준한 축적이 필요한 분야에 가장 어울리고, 큰 모험이나 투기는 맞지 않다고 풀이합니다.',
    palaces: getSanFangPalaces(chart).filter(p => has.some(s => getMajorStarNames(p).includes(s))).map(p => p.name),
    conditions: { required, bonus, breaking },
    source: '《자미두수전서(紫微斗數全書)·기월동량격(機月同梁格)》',
  });
}

/** 廉贞天相：同宫 */
function detectLianXiang(chart: ZiweiChart, patterns: Pattern[]) {
  const lian = findStarPalace(chart, '廉贞');
  const xiang = findStarPalace(chart, '天相');
  if (!lian || !xiang || lian.branch !== xiang.branch) return;

  const inMing = lian.branch === chart.mingGongBranch;
  const required = ['염정(廉貞)·천상(天相)이 동궁'];
  const bonus: string[] = [];
  const breaking: string[] = [];
  if (hasStar(lian, '禄存') || getStarSiHua(lian, '廉贞') === '禄') bonus.push('녹존(祿存)이 보이거나 염정(廉貞)이 화록(化祿)');
  if (sanFangAllStars(chart).has('左辅')) bonus.push('좌보(左輔)가 회조');
  if (hasShaInPalace(lian, ['擎羊'])) breaking.push('염상(廉相)궁에 경양(擎羊)이 앉음 (염살양으로 기우는 경향)');
  if (getStarSiHua(lian, '廉贞') === '忌') breaking.push('염정(廉貞)이 화기(化忌)');

  patterns.push({
    name: '廉贞天相格',
    level: breaking.length ? 'caution' : (inMing ? 'good' : 'neutral'),
    description: '염정(廉貞)·천상(天相)이 동궁하는 인수(印綬) 격국입니다. 공정하게 처리하고 청렴하다는 평을 얻으며, 공직·행정 관리·법무·기획이 어울립니다. 경양(擎羊)이나 화기(化忌)를 만나면 도리어 관재 구설로 기운다고 봅니다.',
    palaces: [lian.name],
    conditions: { required, bonus, breaking },
    source: '《자미두수전서(紫微斗數全書)》',
  });
}

/** 武曲七杀：同宫，将星配财星 */
function detectWuQiSha(chart: ZiweiChart, patterns: Pattern[]) {
  const wu = findStarPalace(chart, '武曲');
  const qi = findStarPalace(chart, '七杀');
  if (!wu || !qi || wu.branch !== qi.branch) return;

  const inMing = wu.branch === chart.mingGongBranch;
  const required = ['무곡(武曲)·칠살(七殺)이 동궁'];
  const bonus: string[] = [];
  const breaking: string[] = [];
  if (getStarSiHua(wu, '武曲') === '权') bonus.push('무곡(武曲)이 화권(化權)');
  if (getStarSiHua(wu, '武曲') === '禄') bonus.push('무곡(武曲)이 화록(化祿)');
  if (getStarSiHua(wu, '武曲') === '忌') breaking.push('무곡(武曲)이 화기(化忌) (재물을 겁탈당하는 조짐으로 봄)');
  if (hasShaInPalace(wu, ['擎羊', '陀罗', '火星', '铃星'])) breaking.push('무살(武殺)궁에 살성(煞星)이 너무 많음');

  patterns.push({
    name: '武曲七杀',
    level: breaking.length ? 'caution' : (inMing ? 'excellent' : 'good'),
    description: '무곡(武曲)·칠살(七殺)이 동궁합니다. 장수의 별과 재물의 별이 짝을 이루어 결단력이 있고 강직하며 재물을 다루는 힘이 강하다고 봅니다. 금융·군경·창업이 어울립니다. 다만 화기(化忌)나 살성을 만나면 좋지 않게 봅니다. 평생 애써 재물을 쌓지만 마음 쓸 일이 많습니다.',
    palaces: [wu.name],
    conditions: { required, bonus, breaking },
    source: '《자미두수전서(紫微斗數全書)》',
  });
}

/** 天同天梁：同宫 */
function detectTongLiang(chart: ZiweiChart, patterns: Pattern[]) {
  const tong = findStarPalace(chart, '天同');
  const liang = findStarPalace(chart, '天梁');
  if (!tong || !liang || tong.branch !== liang.branch) return;

  const required = ['천동(天同)·천량(天梁)이 동궁'];
  const bonus: string[] = [];
  const breaking: string[] = [];
  if (sanFangAllStars(chart).has('文昌')) bonus.push('문창(文昌)이 회조');
  if (getStarSiHua(tong, '天同') === '禄') bonus.push('천동(天同)이 화록(化祿)');
  if (hasShaInPalace(tong, SHA_HARD)) breaking.push('살성(煞星)이 함께 앉음');

  patterns.push({
    name: '天同天梁格',
    level: breaking.length ? 'neutral' : 'good',
    description: '천동(天同)·천량(天梁)이 동궁하여 복의 별과 음덕의 별이 함께합니다. 너그럽고 온화하며 남을 돕기 좋아한다고 봅니다. 의료·교육·종교·사회 공익이 어울립니다. 다만 온화하고 보수적이어서 크게 귀하고 부유한 국면을 이루기는 어렵다고 풀이합니다.',
    palaces: [tong.name],
    conditions: { required, bonus, breaking },
    source: '《자미두수전서(紫微斗數全書)》',
  });
}

/** 日月同宫：太阳太阴丑或未宫同宫 */
function detectRiYueTongGong(chart: ZiweiChart, patterns: Pattern[]) {
  const sun = findStarPalace(chart, '太阳');
  const moon = findStarPalace(chart, '太阴');
  if (!sun || !moon || sun.branch !== moon.branch) return;
  if (sun.branch !== 1 && sun.branch !== 7) return;  // 必须丑(1) 或 未(7)

  const inMing = sun.branch === chart.mingGongBranch;
  const required = [`태양(太陽)·태음(太陰)이 함께 ${BRANCH_NAMES[sun.branch]}궁에 듦`];
  const bonus: string[] = [];
  const breaking: string[] = [];
  if (sun.branch === 7) bonus.push('미궁의 일월이 함께 빛남 (고서에 미궁 일월쌍미라 함)');
  if (sanFangAllStars(chart).has('文昌') && sanFangAllStars(chart).has('文曲')) bonus.push('창곡(昌曲)이 회조');
  if (hasShaInPalace(sun, SHA_HARD)) breaking.push('일월(日月)궁에 살성(煞星)이 함께 앉음');

  patterns.push({
    name: '日月同宫',
    level: breaking.length ? 'good' : (inMing ? 'excellent' : 'good'),
    description: `태양(太陽)·태음(太陰)이 ${BRANCH_NAMES[sun.branch]}궁에서 동궁합니다. 음양이 균형을 이루고 문무를 겸한다고 봅니다. 이성 인연이 좋고 일이 순조로우며 이름이 멀리 퍼진다고 풀이합니다. ${sun.branch === 7 ? '미궁의 일월은 쌍으로 아름다워 특히 좋다고 봅니다.' : '축궁의 일월동궁은 힘이 비교적 평범합니다.'}`,
    palaces: [sun.name],
    conditions: { required, bonus, breaking },
    source: '《자미두수전서(紫微斗數全書)》',
  });
}

/** 日月夹命：太阳太阴在命宫前后两宫 */
function detectRiYueJiaMing(chart: ZiweiChart, patterns: Pattern[]) {
  const { prev, next } = getJiaPalaces(chart, chart.mingGongBranch);
  if (!prev || !next) return;
  const prevHasSun = hasStar(prev, '太阳');
  const prevHasMoon = hasStar(prev, '太阴');
  const nextHasSun = hasStar(next, '太阳');
  const nextHasMoon = hasStar(next, '太阴');
  const ok = (prevHasSun && nextHasMoon) || (prevHasMoon && nextHasSun);
  if (!ok) return;

  const sunPalace = prevHasSun ? prev : next;
  const moonPalace = prevHasMoon ? prev : next;
  const required = ['태양(太陽)·태음(太陰)이 명궁 앞뒤 두 궁에 나뉘어 있음'];
  const bonus: string[] = [];
  const breaking: string[] = [];
  if (isBright(sunPalace, '太阳')) bonus.push('태양(太陽)이 묘왕(廟旺)');
  if (isBright(moonPalace, '太阴')) bonus.push('태음(太陰)이 묘왕(廟旺)');
  if (isDim(sunPalace, '太阳') || isDim(moonPalace, '太阴')) breaking.push('일월(日月)이 낙함(落陷) (협명해도 빛이 없음)');

  patterns.push({
    name: '日月夹命',
    level: breaking.length ? 'good' : 'excellent',
    description: '태양(太陽)·태음(太陰)이 명궁 양옆에서 협조(夾照)합니다. 마음이 밝고 떳떳하며 평생 귀인의 도움을 받고 일이 왕성하다고 봅니다. 남자는 관귀(官貴)를, 여자는 남편과 집안을 일으키는 것으로 풀이합니다. 일월이 낙함하지 않아야 참된 협입니다.',
    palaces: [sunPalace.name, moonPalace.name],
    conditions: { required, bonus, breaking },
    source: '《자미두수전서(紫微斗數全書)·일월협명(日月夾命)》',
  });
}

/** 巨日同宫：巨门太阳同入寅或申 */
function detectJuRiTongGong(chart: ZiweiChart, patterns: Pattern[]) {
  const ju = findStarPalace(chart, '巨门');
  const sun = findStarPalace(chart, '太阳');
  if (!ju || !sun || ju.branch !== sun.branch) return;
  if (ju.branch !== 2 && ju.branch !== 8) return;  // 必须寅(2) 或 申(8)

  const inMing = ju.branch === chart.mingGongBranch;
  const required = [`거문(巨門)·태양(太陽)이 함께 ${BRANCH_NAMES[ju.branch]}궁에 듦`];
  const bonus: string[] = [];
  const breaking: string[] = [];
  if (ju.branch === 2) bonus.push('인궁의 태양이 묘왕(廟旺)이라 거문이 햇빛으로 시비를 풂');
  if (getStarSiHua(ju, '巨门') === '禄' || getStarSiHua(ju, '巨门') === '权') bonus.push('거문(巨門)이 화록(化祿)/화권(化權) (말솜씨로 재물을 얻음)');
  if (getStarSiHua(ju, '巨门') === '忌') breaking.push('거문(巨門)이 화기(化忌) (구설과 관재)');
  if (ju.branch === 8) breaking.push('신궁은 태양이 서쪽으로 기울어 거문의 어두운 기운이 더 드러남');

  patterns.push({
    name: '巨日同宫',
    level: breaking.length ? 'caution' : (inMing && ju.branch === 2 ? 'excellent' : 'good'),
    description: `거문(巨門)·태양(太陽)이 ${BRANCH_NAMES[ju.branch]}궁에서 동궁합니다. 태양이 거문의 어두운 기운을 풀어 주어, 말솜씨·언론·외국어·전문 분야로 자리를 잡는다고 봅니다. 인궁이 좋고 신궁은 힘이 줄어듭니다. 거문이 화기(化忌)가 되면 관재를 꺼립니다.`,
    palaces: [ju.name],
    conditions: { required, bonus, breaking },
    source: '《자미두수전서(紫微斗數全書)·거일동궁(巨日同宮)》',
  });
}

/** 石中隐玉：巨门入命于子午宫 */
function detectShiZhongYinYu(chart: ZiweiChart, ming: Palace, patterns: Pattern[]) {
  if (!hasStar(ming, '巨门')) return;
  if (ming.branch !== 0 && ming.branch !== 6) return;  // 子(0) 或 午(6)

  const required = [`거문(巨門)이 ${BRANCH_NAMES[ming.branch]}궁 명궁에 듦`];
  const bonus: string[] = [];
  const breaking: string[] = [];
  if (getStarSiHua(ming, '巨门') === '禄' || getStarSiHua(ming, '巨门') === '权') bonus.push('거문(巨門)이 화록(化祿)/화권(化權)');
  if (sanFangAllStars(chart).has('文昌')) bonus.push('문창(文昌)이 회조 (돌 속의 옥이 밝아짐)');
  if (getStarSiHua(ming, '巨门') === '忌') breaking.push('거문(巨門)이 화기(化忌) (옥이 깊은 진흙에 묻힘)');
  if (hasShaInPalace(ming, SHA_HARD)) breaking.push('명궁에 살성(煞星)이 앉음');

  patterns.push({
    name: '石中隐玉',
    level: breaking.length ? 'caution' : 'excellent',
    description: '거문(巨門)이 자·오궁 명궁에 앉습니다. 겉은 평범하나 안에 재능과 학식을 품고 있다고 봅니다. 젊을 때는 알려지지 않다가 중년에야 귀한 기운이 드러나며, 전문 분야·연구·말솜씨·언론이 어울립니다. 녹(祿)·권(權)이나 문창(文昌)의 도움이 있어야 "돌을 깨어 옥을 본다(鑿石見玉)"고 풀이합니다.',
    palaces: ['命宫'],
    conditions: { required, bonus, breaking },
    source: '《자미두수골수부(紫微斗數骨髓賦)·석중은옥(石中隱玉)》',
  });
}

/** 明珠出海：命宫在未空宫，对宫丑宫为太阳太阴 */
function detectMingZhuChuHai(chart: ZiweiChart, ming: Palace, patterns: Pattern[]) {
  if (ming.branch !== 7) return;   // 命在未
  if (getMajorStarNames(ming).length > 0) return;   // 命宫为空宫
  const dui = getDuiGong(chart, ming.branch);
  if (!dui) return;
  if (!hasStar(dui, '太阳') || !hasStar(dui, '太阴')) return;

  const required = ['명궁이 미궁이며 공궁(空宮)임', '대궁인 축궁에 태양(太陽)·태음(太陰)이 함께 있음'];
  const bonus: string[] = [];
  const breaking: string[] = [];
  if (sanFangAllStars(chart).has('文昌') || sanFangAllStars(chart).has('文曲')) bonus.push('창곡(昌曲)을 다시 만남');
  if (sanFangAllStars(chart).has('左辅') || sanFangAllStars(chart).has('右弼')) bonus.push('좌보·우필이 도움');
  if (sanFangShaCount(chart, SHA_HARD) >= 2) breaking.push('살성(煞星)이 회조 (구슬 빛이 흐려짐)');

  patterns.push({
    name: '明珠出海',
    level: breaking.length ? 'good' : 'excellent',
    description: '명궁이 미궁 공궁이고 대궁인 축궁의 일월이 함께 빛나 공조(拱照)합니다. "명주출해(明珠出海)"라 부릅니다. 출신은 평범해도 후천적 노력으로 두각을 나타낸다고 봅니다. 타향으로 멀리 나가거나 학술 연구, 큰 회사의 높은 자리가 어울리고 크게 귀하고 부유해진다고 풀이합니다.',
    palaces: ['命宫', dui.name],
    conditions: { required, bonus, breaking },
    source: '《자미두수전집(紫微斗數全集)·명주출해(明珠出海)》',
  });
}

/** 紫微独坐入命 */
function detectZiWeiInMing(chart: ZiweiChart, ming: Palace, patterns: Pattern[]) {
  if (!hasStar(ming, '紫微') || hasStar(ming, '天府')) return;

  const required = ['자미(紫微)가 홀로 명궁에 앉음 (천부 동좌 없음)'];
  const bonus: string[] = [];
  const breaking: string[] = [];
  const sanFangSet = sanFangAllStars(chart);
  if (sanFangSet.has('左辅') && sanFangSet.has('右弼')) bonus.push('좌보(左輔)·우필(右弼)이 함께 만남');
  if (sanFangSet.has('文昌') && sanFangSet.has('文曲')) bonus.push('문창(文昌)·문곡(文曲)이 함께 만남');
  if (!sanFangSet.has('左辅') && !sanFangSet.has('右弼')) breaking.push('좌보·우필이 없음 (외로운 군주에 신하가 없음)');
  if (hasShaInPalace(ming, SHA_KONG)) breaking.push('자미(紫微)가 공겁(空劫)을 만남 (고서에서 가장 꺼림)');

  patterns.push({
    name: '紫微入命',
    level: breaking.length ? 'caution' : (bonus.length ? 'excellent' : 'good'),
    description: '자미(紫微)가 홀로 명궁에 앉은 제왕의 별입니다. 자존심이 강하고 지도자의 매력이 있다고 봅니다. 다만 자미는 "재야의 외로운 군주"를 가장 꺼립니다. 좌보·우필이 만나지 않으면 도리어 고고하고 오만해져 비방을 부르기 쉽다고 풀이합니다.',
    palaces: ['命宫'],
    conditions: { required, bonus, breaking },
    source: '《자미두수전서(紫微斗數全書)》',
  });
}

/** 辅弼夹命 */
function detectFuBiJiaMing(chart: ZiweiChart, patterns: Pattern[]) {
  const { prev, next } = getJiaPalaces(chart, chart.mingGongBranch);
  if (!prev || !next) return;
  const prevHasZuo = hasStar(prev, '左辅');
  const prevHasYou = hasStar(prev, '右弼');
  const nextHasZuo = hasStar(next, '左辅');
  const nextHasYou = hasStar(next, '右弼');
  if (!((prevHasZuo && nextHasYou) || (prevHasYou && nextHasZuo))) return;

  const required = ['좌보(左輔)·우필(右弼)이 명궁 앞뒤 두 궁에 나뉘어 있음'];
  const bonus: string[] = [];
  const breaking: string[] = [];
  if (sanFangAllStars(chart).has('天魁') || sanFangAllStars(chart).has('天钺')) bonus.push('괴월(魁鉞)을 다시 만남');

  patterns.push({
    name: '辅弼夹命',
    level: 'excellent',
    description: '좌보(左輔)·우필(右弼)이 명궁을 끼고 있습니다. 전통 해설은 이 격을 귀인의 도움과 두터운 복의 상징으로 봅니다. 관직이나 대기업 관리처럼 조직 능력을 발휘하는 방향이 어울립니다. 고서에 "좌보우필 종신복후(左輔右弼，終身福厚)"라 했으며, 조직을 조율하는 데 강점이 있다는 뜻입니다.',
    palaces: ['命宫', prev.name, next.name],
    conditions: { required, bonus, breaking },
    source: '《자미두수전서(紫微斗數全書)·보필협명(輔弼夾命)》',
  });
}

/** 昌曲夹命 */
function detectChangQuJiaMing(chart: ZiweiChart, patterns: Pattern[]) {
  const { prev, next } = getJiaPalaces(chart, chart.mingGongBranch);
  if (!prev || !next) return;
  const prevHasChang = hasStar(prev, '文昌');
  const prevHasQu = hasStar(prev, '文曲');
  const nextHasChang = hasStar(next, '文昌');
  const nextHasQu = hasStar(next, '文曲');
  if (!((prevHasChang && nextHasQu) || (prevHasQu && nextHasChang))) return;

  patterns.push({
    name: '昌曲夹命',
    level: 'excellent',
    description: '문창(文昌)·문곡(文曲)이 명궁을 끼고 있습니다. 총명하고 수려하며 글재주가 빛난다고 봅니다. 문화·교육·학술·예술·글쓰기가 어울립니다. 고서에 "창곡협명 주과갑(昌曲夾命主科甲)"이라 했으며 시험운에 가장 이롭다고 풀이합니다.',
    palaces: ['命宫', prev.name, next.name],
    conditions: { required: ['문창(文昌)·문곡(文曲)이 명궁 앞뒤 두 궁에 나뉘어 있음'] },
    source: '《자미두수전서(紫微斗數全書)》',
  });
}

/** 魁钺夹命 */
function detectKuiYueJiaMing(chart: ZiweiChart, patterns: Pattern[]) {
  const { prev, next } = getJiaPalaces(chart, chart.mingGongBranch);
  if (!prev || !next) return;
  const okA = hasStar(prev, '天魁') && hasStar(next, '天钺');
  const okB = hasStar(prev, '天钺') && hasStar(next, '天魁');
  if (!okA && !okB) return;

  patterns.push({
    name: '魁钺夹命',
    level: 'good',
    description: '천괴(天魁)·천월(天鉞)이 명궁을 끼고 있습니다. 남자는 천을(天乙), 여자는 옥당(玉堂)이라 부르며 평생 귀인이 이끌어 준다고 봅니다. 시험·구직·중요한 순간에 뜻밖의 귀인이 돕는 일이 잦다고 풀이합니다.',
    palaces: ['命宫', prev.name, next.name],
    conditions: { required: ['천괴(天魁)·천월(天鉞)이 명궁 앞뒤 두 궁에 나뉘어 있음'] },
    source: '《자미두수전서(紫微斗數全書)》',
  });
}

/** 双禄朝垣：化禄 + 禄存 同会三方 */
function detectShuangLuChaoYuan(chart: ZiweiChart, ming: Palace, patterns: Pattern[]) {
  const sanFang = getSanFangPalaces(chart);
  let huaLuFound = false;
  let luCunFound = false;
  for (const p of sanFang) {
    if (p.stars.some(s => s.siHua === '禄')) huaLuFound = true;
    if (hasStar(p, '禄存')) luCunFound = true;
  }
  if (!huaLuFound || !luCunFound) return;

  patterns.push({
    name: '双禄朝垣',
    level: 'excellent',
    description: '화록(化祿)과 녹존(祿存)이 명궁 삼방사정에서 함께 만납니다. 재물의 원천이 솟고 의식이 넉넉하다고 봅니다. 고서에 "쌍록조원 부비도주(雙祿朝垣，富比陶朱)"라 했으며, 평생 재물 걱정이 적고 정재와 횡재를 함께 얻는 경우가 많다고 풀이합니다.',
    palaces: sanFang.map(p => p.name),
    conditions: {
      required: ['화록(化祿)이 삼방사정에서 회조', '녹존(祿存)이 삼방사정에서 회조'],
      breaking: hasShaInPalace(ming, SHA_KONG) ? ['명궁에 공겁(空劫)이 앉음 (쌍록이 공을 만나 재물이 들고 남)'] : undefined,
    },
    source: '《자미두수전서(紫微斗數全書)·쌍록조원(雙祿朝垣)》',
  });
}

/** 三奇加会：化禄 化权 化科 同会三方 */
function detectSanQiJiaHui(chart: ZiweiChart, patterns: Pattern[]) {
  const sanFangPalaces = getSanFangPalaces(chart);
  let lu = false, quan = false, ke = false;
  for (const p of sanFangPalaces) {
    for (const s of p.stars) {
      if (s.siHua === '禄') lu = true;
      if (s.siHua === '权') quan = true;
      if (s.siHua === '科') ke = true;
    }
  }
  if (!(lu && quan && ke)) return;

  patterns.push({
    name: '三奇加会',
    level: 'excellent',
    description: '화록(化祿)·화권(化權)·화과(化科) 세 길화가 명궁 삼방사정에 모입니다. "삼기가회(三奇加會)"라 부릅니다. 평생 공명·재물·귀인을 모두 갖춘다고 보며, 자미두수에서 가장 좋은 길격의 하나입니다.',
    palaces: sanFangPalaces.map(p => p.name),
    conditions: { required: ['화록(化祿)·화권(化權)·화과(化科) 세 길화가 명궁 삼방사정에 모임'] },
    source: '《자미두수전서(紫微斗數全書)·삼기가회(三奇加會)》',
  });
}

/** 化禄入命/官/财 */
function detectHuaLuRuMing(chart: ZiweiChart, ming: Palace, patterns: Pattern[]) {
  const huaLuStar = ming.stars.find(s => s.siHua === '禄' && s.type === 'major');
  if (!huaLuStar) return;

  patterns.push({
    name: `${huaLuStar.name}化禄入命`,
    level: 'good',
    description: `${ko(huaLuStar.name)}이(가) 화록(化祿)으로 명궁에 앉습니다. 재물이 순조롭고 사람 복이 좋으며 기회가 많다고 봅니다.${huaLuStar.name === '武曲' ? ' 무곡 화록은 정재(正財)에 속해 실업·금융이 어울립니다.' : huaLuStar.name === '太阴' ? ' 태음 화록은 음재(陰財), 곧 부동산 쪽 재물에 속합니다.' : huaLuStar.name === '贪狼' ? ' 탐랑 화록은 인맥으로 얻는 재물, 도화 재물에 속합니다.' : ''}`,
    palaces: ['命宫'],
    conditions: { required: [`${ko(huaLuStar.name)}이(가) 화록(化祿)으로 명궁에 앉음`] },
    source: '《자미두수전서(紫微斗數全書)》',
  });
}

// ────────────────── 恶格识别器 ──────────────────

/** 化忌入命/迁 */
function detectHuaJiRuMingQian(chart: ZiweiChart, patterns: Pattern[]) {
  const qianBranch = (chart.mingGongBranch + 6) % 12;
  for (const palace of chart.palaces) {
    if (palace.branch !== chart.mingGongBranch && palace.branch !== qianBranch) continue;
    const jiStar = palace.stars.find(s => s.siHua === '忌' && s.type === 'major');
    if (!jiStar) continue;

    const inMing = palace.branch === chart.mingGongBranch;
    patterns.push({
      name: `${jiStar.name}化忌入${inMing ? '命' : '迁'}`,
      level: 'caution',
      description: inMing
        ? `${ko(jiStar.name)}이(가) 화기(化忌)로 명궁에 앉습니다. 스스로의 고집, 마음의 걸림돌, 건강상의 염려를 살피고 매사 한 걸음 물러서 생각하라는 뜻으로 봅니다. 화기가 반드시 나쁜 것은 아니며, 그 별의 에너지에 특별히 신경 쓰라는 신호입니다.`
        : `${ko(jiStar.name)}이(가) 화기(化忌)로 천이궁에 앉습니다. 외출·원행·대인 관계에 굴곡이 생기기 쉬우므로 움직이기보다 지키는 편이 낫다고 봅니다.`,
      palaces: [palace.name],
      conditions: { required: [`${ko(jiStar.name)}이(가) 화기(化忌)로 ${inMing ? '명궁' : '천이궁'}에 앉음`] },
      source: '《자미두수전서(紫微斗數全書)》',
    });
  }
}

/** 羊陀夹忌：化忌坐宫，左右被擎羊陀罗夹 */
function detectYangTuoJiaJi(chart: ZiweiChart, patterns: Pattern[]) {
  for (const palace of chart.palaces) {
    const jiStar = palace.stars.find(s => s.siHua === '忌');
    if (!jiStar) continue;
    if (palace.branch !== chart.mingGongBranch) continue;   // 只看命宫被夹

    const { prev, next } = getJiaPalaces(chart, palace.branch);
    if (!prev || !next) continue;
    const aPrev = hasStar(prev, '擎羊') && hasStar(next, '陀罗');
    const aNext = hasStar(prev, '陀罗') && hasStar(next, '擎羊');
    if (!aPrev && !aNext) continue;

    patterns.push({
      name: '羊陀夹忌',
      level: 'caution',
      description: '화기(化忌)가 명궁에 앉고 좌우에서 경양(擎羊)·타라(陀羅)가 끼고 있습니다. 고서에 "양타협기는 패국(羊陀夾忌為敗局)"이라 했으며, 평생 고되게 오가고 순탄치 않아 몸과 마음이 지치기 쉽다고 봅니다. 덕행을 닦고 적극적으로 일하며 매사 신중히 하는 것으로 풀어 나가야 합니다.',
      palaces: ['命宫', prev.name, next.name],
      conditions: { required: ['화기(化忌)가 명궁에 앉음', '경양(擎羊)·타라(陀羅)가 명궁 앞뒤 두 궁에 나뉘어 있음'] },
      source: '《자미두수골수부(紫微斗數骨髓賦)·양타협기(羊陀夾忌)》',
    });
    return;
  }
}

/** 火铃夹命：火星铃星分居命宫前后 */
function detectHuoLingJiaMing(chart: ZiweiChart, patterns: Pattern[]) {
  const { prev, next } = getJiaPalaces(chart, chart.mingGongBranch);
  if (!prev || !next) return;
  const okA = hasStar(prev, '火星') && hasStar(next, '铃星');
  const okB = hasStar(prev, '铃星') && hasStar(next, '火星');
  if (!okA && !okB) return;

  patterns.push({
    name: '火铃夹命',
    level: 'caution',
    description: '화성(火星)·영성(鈴星)이 명궁 앞뒤 두 궁에서 명궁을 끼고 있습니다. 성미가 급하고 충동적이며 갑작스러운 사고나 다툼이 생기기 쉽다고 봅니다. 인내심을 기르고 충동적인 결정을 피해야 합니다.',
    palaces: ['命宫', prev.name, next.name],
    conditions: { required: ['화성(火星)·영성(鈴星)이 명궁 앞뒤 두 궁에 나뉘어 있음'] },
    source: '《자미두수전서(紫微斗數全書)》',
  });
}

/** 空劫夹命：地空地劫分居命宫前后 */
function detectKongJieJiaMing(chart: ZiweiChart, patterns: Pattern[]) {
  const { prev, next } = getJiaPalaces(chart, chart.mingGongBranch);
  if (!prev || !next) return;
  const okA = hasStar(prev, '地空') && hasStar(next, '地劫');
  const okB = hasStar(prev, '地劫') && hasStar(next, '地空');
  if (!okA && !okB) return;

  patterns.push({
    name: '空劫夹命',
    level: 'caution',
    description: '지공(地空)·지겁(地劫)이 명궁을 끼고 있습니다. 재물이 들고 나며 생각이 세속을 벗어나 종교나 철학으로 기울기 쉽다고 봅니다. 고서에 "공겁협명 재불취(空劫夾命，財不聚)"라 했습니다. 기예·종교·연구처럼 물질을 중시하지 않는 일이 어울립니다.',
    palaces: ['命宫', prev.name, next.name],
    conditions: { required: ['지공(地空)·지겁(地劫)이 명궁 앞뒤 두 궁에 나뉘어 있음'] },
    source: '《자미두수전서(紫微斗數全書)》',
  });
}

/** 廉杀羊：廉贞、七杀、擎羊三星会照（流年大限最凶） */
function detectLianShaYang(chart: ZiweiChart, patterns: Pattern[]) {
  const sanFangSet = sanFangAllStars(chart);
  if (!(sanFangSet.has('廉贞') && sanFangSet.has('七杀') && sanFangSet.has('擎羊'))) return;

  patterns.push({
    name: '廉杀羊',
    level: 'caution',
    description: '염정(廉貞)·칠살(七殺)·경양(擎羊) 세 별이 명궁 삼방에서 회조합니다. 전통 해설에서 특별히 주의할 조합으로 표시합니다. 대한·유년에 이 격이 발동할 때는 운전 안전, 인간관계의 평화, 의료 결정에서 이성적으로 신중하라는 신호이며, 체념하는 운명론이 아니라 스스로 관리하라는 뜻입니다.',
    palaces: ['命宫'],
    conditions: { required: ['염정(廉貞)·칠살(七殺)·경양(擎羊) 세 별이 삼방사정에서 회조'] },
    source: '《자미두수전서(紫微斗數全書)·염살양(廉殺羊)》',
  });
}

/** 巨火羊：巨门、火星、擎羊会照 */
function detectJuHuoYang(chart: ZiweiChart, patterns: Pattern[]) {
  const sanFangSet = sanFangAllStars(chart);
  if (!(sanFangSet.has('巨门') && sanFangSet.has('火星') && sanFangSet.has('擎羊'))) return;

  patterns.push({
    name: '巨火羊',
    level: 'caution',
    description: '거문(巨門)·화성(火星)·경양(擎羊) 세 별이 회조합니다. 전통 고서는 이 격을 경계할 조합으로 기록합니다 (옛 글의 "종신액사(終身縊死)"는 운명론적 표현이어서 지금은 맞지 않습니다). 오늘날에는 직언이 충돌을 부르기 쉽고 감정이 격할 때 스스로를 살펴야 한다는 뜻으로 이해합니다. 부드럽게 말하는 연습, 대립을 먼저 풀기, 감정 관리를 기르는 것이 수양의 방향입니다.',
    palaces: ['命宫'],
    conditions: { required: ['거문(巨門)·화성(火星)·경양(擎羊) 세 별이 삼방사정에서 회조'] },
    source: '《자미두수골수부(紫微斗數骨髓賦)·거화양(巨火羊)》',
  });
}

/** 铃昌陀武：铃星、文昌、陀罗、武曲会照（限至投河） */
function detectLingChangTuoWu(chart: ZiweiChart, patterns: Pattern[]) {
  const sanFangSet = sanFangAllStars(chart);
  if (!(sanFangSet.has('铃星') && sanFangSet.has('文昌') && sanFangSet.has('陀罗') && sanFangSet.has('武曲'))) return;

  patterns.push({
    name: '铃昌陀武',
    level: 'caution',
    description: '영성(鈴星)·문창(文昌)·타라(陀羅)·무곡(武曲) 네 별이 함께 모입니다. 전통 고서는 이 격을 특별히 주의할 조합으로 기록합니다 (옛 글의 "한지투하(限至投河)"는 운명론적 표현이며 오늘날의 이해가 아닙니다). 오늘날의 권고는, 대한·유년에 이 조합이 발동할 때 중요한 결정을 이성적으로 처리하고 감정의 기복을 살피며 생활의 안정을 유지하라는 것입니다. 소극적으로 기다리지 말고 스스로 관리하라는 뜻입니다.',
    palaces: ['命宫'],
    conditions: { required: ['영성(鈴星)·문창(文昌)·타라(陀羅)·무곡(武曲) 네 별이 삼방사정에서 회조'] },
    source: '《자미두수골수부(紫微斗數骨髓賦)·영창타무(鈴昌陀武)》',
  });
}

/** 马头带箭：擎羊在午宫坐命 */
function detectMaTouDaiJian(chart: ZiweiChart, ming: Palace, patterns: Pattern[]) {
  if (ming.branch !== 6) return;   // 必须午
  if (!hasStar(ming, '擎羊')) return;

  const required = ['경양(擎羊)이 오궁 명궁에 앉음'];
  const bonus: string[] = [];
  const breaking: string[] = [];
  if (sanFangAllStars(chart).has('七杀') || sanFangAllStars(chart).has('破军')) bonus.push('칠살(七殺) 또는 파군(破軍)을 다시 만남 (무직으로 크게 귀함)');
  if (sanFangAllStars(chart).has('天魁') || sanFangAllStars(chart).has('天钺')) bonus.push('괴월(魁鉞)이 더해져 비춤');

  patterns.push({
    name: '马头带箭',
    level: bonus.length ? 'good' : 'caution',
    description: '경양(擎羊)이 오궁 명궁에 앉아 "마두대전(馬頭帶箭)"이라 부릅니다. 고서에 "위진변강(威鎮邊疆)"이라 했습니다. 이 격은 결단력 있는 행동력과 경쟁 정신을 상징하며, 실행력과 과감한 결정이 필요한 직업에 어울립니다. 전통 해설은 길성이 함께해야 가장 잘 발휘된다고도 일러 줍니다. 한 별만 따로 보지 않고 조합의 영향을 보라는 뜻입니다.',
    palaces: ['命宫'],
    conditions: { required, bonus },
    source: '《자미두수골수부(紫微斗數骨髓賦)·마두대전(馬頭帶箭)》',
  });
}

// ────────────────── 基础格局（提升识别覆盖率）──────────────────
// 设计：让普通命盘也能识别出 1-3 个常见格局，而不是 30+ 严格古书格局都不匹配。
// 这些都是单一条件触发的轻量识别，level 多为 neutral / good。

/** 禄存守身：禄存入身宫（或命宫与身宫同宫） */
function detectLuCunShouShen(chart: ZiweiChart, patterns: Pattern[]) {
  const luCunPalace = findStarPalace(chart, '禄存');
  if (!luCunPalace) return;
  const inMing = luCunPalace.branch === chart.mingGongBranch;
  const inShen = luCunPalace.branch === chart.shenGongBranch;
  if (!inMing && !inShen) return;
  patterns.push({
    name: inMing ? '禄存守命' : '禄存守身',
    level: 'good',
    description: inMing
      ? '녹존(祿存)이 명궁에 앉았습니다. 평생 의식 걱정이 적고 재물과 녹이 안정적이라고 봅니다. 성격이 보수적이고 쌓는 데 능하나, 양타(羊陀)가 녹을 끼고 있으면 소인을 조심해야 합니다. 화록(化祿)이나 좌보·우필이 함께해야 큰 격이 됩니다.'
      : '녹존(祿存)이 신궁에 들었습니다. 중년 이후 재물의 원천이 안정되고 얻은 녹을 스스로 누린다고 봅니다. 니하이샤(倪海厦) 선생은 「녹존이 신궁에 들면 재물의 기운이 몸 가까이 있다」고 했으며, 배우자나 일의 방향에서 안정적인 재물과 녹을 얻을 수 있다는 뜻입니다.',
    palaces: [inMing ? '命宫' : '身宫'],
    conditions: { required: [inMing ? '녹존(祿存)이 명궁에 듦' : '녹존(祿存)이 신궁에 듦'] },
    source: '《자미두수전서(紫微斗數全書)·녹존성(祿存星)》',
  });
}

/** 天马入命/迁：驿马星动 */
function detectTianMaRuMing(chart: ZiweiChart, patterns: Pattern[]) {
  const tianMaPalace = findStarPalace(chart, '天马');
  if (!tianMaPalace) return;
  const inMing = tianMaPalace.branch === chart.mingGongBranch;
  const inQian = tianMaPalace.branch === ((chart.mingGongBranch + 6) % 12);
  if (!inMing && !inQian) return;
  patterns.push({
    name: inMing ? '天马入命' : '天马在迁',
    level: 'neutral',
    description: inMing
      ? '천마(天馬)가 명궁에 앉았습니다. 평생 분주히 오가며 움직이는 가운데 재물을 얻는다고 봅니다. 상업·여행·외근·여러 분야에 걸친 활동이 어울립니다. 니하이샤(倪海厦) 선생은 「천마가 명궁에 들어도 녹이 없으면 발하지 못한다」고 했으며, 녹존이나 화록을 다시 만나면 "녹마교치(祿馬交馳)"라는 부유한 격이 됩니다.'
      : '천마(天馬)가 천이궁에 있습니다. 밖으로 나가는 일이 이롭고 멀리 가서 재물을 얻으며 타향에서의 발전이 어울린다고 봅니다. 화록과 함께하면 타지에서 재물을 얻고, 살성과 함께하면 여정에 굴곡이 많다고 풀이합니다.',
    palaces: [tianMaPalace.name],
    conditions: { required: [inMing ? '천마(天馬)가 명궁에 듦' : '천마(天馬)가 천이궁에 듦'] },
    source: '《자미두수전서(紫微斗數全書)·천마성(天馬星)》',
  });
}

/** 化禄入财：财帛宫主星化禄 */
function detectHuaLuRuCai(chart: ZiweiChart, patterns: Pattern[]) {
  const cai = chart.palaces.find(p => p.name === '财帛');
  if (!cai) return;
  const luStar = cai.stars.find(s => s.type === 'major' && s.siHua === '禄');
  if (!luStar) return;
  patterns.push({
    name: '化禄入财',
    level: 'good',
    description: `${ko(luStar.name)}이(가) 화록(化祿)으로 재백궁에 듭니다. 재물의 흐름이 트이고 수입이 안정적이라고 봅니다. 니하이샤(倪海厦) 선생은 화록을 「정재(正財)」의 상징으로 보았습니다. 이 화록성이 나타내는 능력(${ko(luStar.name)}의 핵심 특질)이 재물을 버는 중심축입니다. 녹존이나 천마와 함께하면 재물의 길이 더 넓어집니다.`,
    palaces: ['财帛'],
    conditions: { required: [`${ko(luStar.name)}이(가) 화록(化祿)으로 재백궁에 듦`] },
    source: '《자미두수전서(紫微斗數全書)·사화론(四化論)》',
  });
}

/** 化权入官：官禄宫主星化权 */
function detectHuaQuanRuGuan(chart: ZiweiChart, patterns: Pattern[]) {
  const guan = chart.palaces.find(p => p.name === '官禄');
  if (!guan) return;
  const quanStar = guan.stars.find(s => s.type === 'major' && s.siHua === '权');
  if (!quanStar) return;
  patterns.push({
    name: '化权入官',
    level: 'good',
    description: `${ko(quanStar.name)}이(가) 화권(化權)으로 관록궁에 듭니다. 일에서 장악력이 있고 한 방면을 독자적으로 맡을 자리를 감당한다고 봅니다. 화권은 권력과 실행력을 뜻합니다. ${ko(quanStar.name)} 화권은 일에서 결정권자나 핵심 실행자가 될 수 있음을 보여 주며, 관리직이나 기술 권위자의 길이 어울립니다.`,
    palaces: ['官禄'],
    conditions: { required: [`${ko(quanStar.name)}이(가) 화권(化權)으로 관록궁에 듦`] },
    source: '《자미두수전서(紫微斗數全書)·사화론(四化論)》',
  });
}

/** 化科入命/身：科名加身 */
function detectHuaKeRuMingShen(chart: ZiweiChart, patterns: Pattern[]) {
  const ming = chart.palaces.find(p => p.branch === chart.mingGongBranch);
  const shen = chart.palaces.find(p => p.branch === chart.shenGongBranch);
  const target = [ming, shen].filter((p): p is Palace => Boolean(p));
  for (const p of target) {
    const keStar = p.stars.find(s => s.type === 'major' && s.siHua === '科');
    if (!keStar) continue;
    const isMing = p.branch === chart.mingGongBranch;
    patterns.push({
      name: isMing ? '化科入命' : '化科入身',
      level: 'good',
      description: `${ko(keStar.name)}이(가) 화과(化科)로 ${isMing ? '명궁' : '신궁'}에 듭니다. 명성·문서·학술의 운으로 봅니다. 니하이샤(倪海厦) 선생은 화과를 「귀인성」이라 했습니다. ${ko(keStar.name)} 화과는 남에게 존중받는 특질을 가져오며, 문서·교육·연구·상담·문화 창작처럼 “이름으로 이익을 얻는” 방향이 어울립니다.`,
      palaces: [isMing ? '命宫' : '身宫'],
      conditions: { required: [`${ko(keStar.name)}이(가) 화과(化科)로 ${isMing ? '명궁' : '신궁'}에 듦`] },
      source: '《자미두수전서(紫微斗數全書)·사화론(四化論)》',
    });
    return; // 命和身重复时只识别一次
  }
}

/** 机月同梁三星会（3 星不全格，非四星真格）：天机/太阴/天同/天梁 任 3 星齐入三方四正 */
function detectJiYueTongLiangPartial(chart: ZiweiChart, ming: Palace, patterns: Pattern[]) {
  const sanFangSet = sanFangAllStars(chart);
  const has = ['天机', '太阴', '天同', '天梁'].filter(s => sanFangSet.has(s));
  if (has.length !== 3) return; // 4 星齐由 detectJiYueTongLiang 处理
  // 避免和上面 detectJiYueTongLiang 重复（4 星齐的不进这里）
  const missing = ['天机', '太阴', '天同', '天梁'].filter(s => !sanFangSet.has(s));
  patterns.push({
    name: '机月同梁三星会',
    level: 'neutral',
    description: `기월동량은 천기·태음·천동·천량 네 별이 삼방사정에 모두 모여야 온전한 참된 격입니다. 이 명반은 그중 3개(${has.map(ko).join('·')})만 모이고 ${missing.map(ko).join('·')}이(가) 빠져 온전한 격이 아니므로 힘이 한 단계 줄어듭니다. 점잖고 꾀가 있으며, 공직·교육·연구·의료·서비스처럼 쌓아 가며 안정적인 분야가 어울립니다. 빠진 별과 사화가 어떻게 맞물리는지가 관건입니다.`,
    palaces: getSanFangPalaces(chart).filter(p => has.some(s => getMajorStarNames(p).includes(s))).map(p => p.name),
    conditions: { required: [`삼방사정에서 ${has.map(ko).join('·')}이(가) 만남 (기월동량에서 ${missing.map(ko).join('·')} 빠짐)`] },
    source: '《자미두수전서(紫微斗數全書)·기월동량격(機月同梁格)》',
  });
  void ming;
}

/** 昌曲同会：文昌+文曲都在命三方四正 */
function detectChangQuTongHui(chart: ZiweiChart, patterns: Pattern[]) {
  const sanFangSet = sanFangAllStars(chart);
  if (!sanFangSet.has('文昌') || !sanFangSet.has('文曲')) return;
  const ming = chart.palaces.find(p => p.branch === chart.mingGongBranch);
  if (!ming) return;
  const inMing = hasStar(ming, '文昌') && hasStar(ming, '文曲');
  patterns.push({
    name: inMing ? '昌曲坐命' : '昌曲同会',
    level: 'good',
    description: inMing
      ? '문창(文昌)·문곡(文曲)이 함께 명궁에 듭니다. 총명하고 수려하며 글재주가 빛난다고 봅니다. 문학·교육·글쓰기·상담이 어울립니다. 화기(化忌)를 가장 꺼리며, 창곡이 화기가 되면 문서와 계약에서 보이지 않는 손해를 입는다고 풀이합니다.'
      : '문창(文昌)·문곡(文曲)이 삼방사정에서 함께 만납니다. 재능이 넘치고 말솜씨와 글솜씨가 모두 좋다고 봅니다. 표현력과 문채가 필요한 분야가 어울리며, 화과(化科)가 더해지면 명성이 크게 드러납니다.',
    palaces: ['命宫'],
    conditions: { required: ['문창(文昌)·문곡(文曲)이 명궁 삼방사정에서 함께 만남'] },
    source: '《자미두수전서(紫微斗數全書)·문성론(文星論)》',
  });
}

/** 辅弼同会：左辅+右弼都在命三方四正 */
function detectFuBiTongHui(chart: ZiweiChart, patterns: Pattern[]) {
  const sanFangSet = sanFangAllStars(chart);
  if (!sanFangSet.has('左辅') || !sanFangSet.has('右弼')) return;
  patterns.push({
    name: '辅弼同会',
    level: 'good',
    description: '좌보(左輔)·우필(右弼)이 명궁 삼방사정에서 함께 만납니다. 평생 귀인이 끊이지 않고 사람 복이 매우 좋다고 봅니다. 지도적 위치와 팀 협업형 일이 가장 어울립니다. 니하이샤(倪海厦) 선생은 「보필이 명궁을 끼면 평생 귀인이 많다」고 했습니다. 혼자 싸우는 명이 아니므로 인적 네트워크를 잘 활용해야 합니다.',
    palaces: ['命宫'],
    conditions: { required: ['좌보(左輔)·우필(右弼)이 명궁 삼방사정에서 함께 만남'] },
    source: '《자미두수전서(紫微斗數全書)·보필론(輔弼論)》',
  });
}

/** 魁钺同会：天魁+天钺都在命三方四正 */
function detectKuiYueTongHui(chart: ZiweiChart, patterns: Pattern[]) {
  const sanFangSet = sanFangAllStars(chart);
  if (!sanFangSet.has('天魁') || !sanFangSet.has('天钺')) return;
  patterns.push({
    name: '魁钺同会',
    level: 'good',
    description: '천괴(天魁)·천월(天鉞)이 명궁 삼방사정에서 함께 만납니다. "천을귀인(天乙貴人)"의 도움이 더해져 중요한 순간마다 귀인이 이끌어 준다고 봅니다. 니하이샤(倪海厦) 선생은 「괴월이 명궁을 끼면 반드시 귀인이 된다」고 했습니다. 어려울 때 곁에 도와줄 사람이 나타나므로 인맥을 먼저 챙기는 편이 좋습니다.',
    palaces: ['命宫'],
    conditions: { required: ['천괴(天魁)·천월(天鉞)이 명궁 삼방사정에서 함께 만남'] },
    source: '《자미두수전서(紫微斗數全書)·괴월론(魁鉞論)》',
  });
}

/** 科权双会：化科 + 化权 同会三方四正 */
function detectKeQuanShuangHui(chart: ZiweiChart, patterns: Pattern[]) {
  const sfPalaces = getSanFangPalaces(chart);
  let hasKe = false, hasQuan = false;
  for (const p of sfPalaces) {
    for (const s of p.stars) {
      if (s.type === 'major' && s.siHua === '科') hasKe = true;
      if (s.type === 'major' && s.siHua === '权') hasQuan = true;
    }
  }
  if (!hasKe || !hasQuan) return;
  patterns.push({
    name: '科权双会',
    level: 'good',
    description: '화과(化科)와 화권(化權)이 삼방사정에서 함께 만납니다. 이름과 권위가 둘 다 아름답다고 봅니다. 학식·명성(科)과 장악력(權)을 함께 갖추어 "전문 권위자" 노선(의사·변호사·교수·기술 핵심 인력 등)이 어울리며, 이름과 이익을 함께 얻고 기반도 탄탄하다고 풀이합니다.',
    palaces: ['命宫'],
    conditions: { required: ['화과(化科)·화권(化權)이 명궁 삼방사정에서 함께 만남'] },
    source: '《자미두수전서(紫微斗數全書)·사화회조(四化會照)》',
  });
}

// ────────────────── 主入口 ──────────────────
export function detectPatterns(chart: ZiweiChart): Pattern[] {
  const patterns: Pattern[] = [];
  const ming = chart.palaces.find(p => p.branch === chart.mingGongBranch);
  if (!ming) return patterns;

  // 上格
  detectJunChenQingHui(chart, ming, patterns);
  detectZiFu(chart, ming, patterns);
  detectFuXiangChaoYuan(chart, ming, patterns);
  detectYangLiangChangLu(chart, ming, patterns);
  detectHuoTanLingTan(chart, ming, patterns);
  detectWuTan(chart, ming, patterns);
  detectShaPoLang(chart, ming, patterns);
  detectJiYueTongLiang(chart, ming, patterns);

  // 中格
  detectLianXiang(chart, patterns);
  detectWuQiSha(chart, patterns);
  detectTongLiang(chart, patterns);
  detectRiYueTongGong(chart, patterns);
  detectRiYueJiaMing(chart, patterns);
  detectJuRiTongGong(chart, patterns);
  detectShiZhongYinYu(chart, ming, patterns);
  detectMingZhuChuHai(chart, ming, patterns);
  detectZiWeiInMing(chart, ming, patterns);

  // 助力格
  detectFuBiJiaMing(chart, patterns);
  detectChangQuJiaMing(chart, patterns);
  detectKuiYueJiaMing(chart, patterns);
  detectShuangLuChaoYuan(chart, ming, patterns);
  detectSanQiJiaHui(chart, patterns);
  detectHuaLuRuMing(chart, ming, patterns);

  // 恶格
  detectHuaJiRuMingQian(chart, patterns);
  detectYangTuoJiaJi(chart, patterns);
  detectHuoLingJiaMing(chart, patterns);
  detectKongJieJiaMing(chart, patterns);
  detectLianShaYang(chart, patterns);
  detectJuHuoYang(chart, patterns);
  detectLingChangTuoWu(chart, patterns);
  detectMaTouDaiJian(chart, ming, patterns);

  // 基础格局（提升识别覆盖率，让普通命盘也能识别 1-3 个）
  detectLuCunShouShen(chart, patterns);
  detectTianMaRuMing(chart, patterns);
  detectHuaLuRuCai(chart, patterns);
  detectHuaQuanRuGuan(chart, patterns);
  detectHuaKeRuMingShen(chart, patterns);
  detectJiYueTongLiangPartial(chart, ming, patterns);
  detectChangQuTongHui(chart, patterns);
  detectFuBiTongHui(chart, patterns);
  detectKuiYueTongHui(chart, patterns);
  detectKeQuanShuangHui(chart, patterns);

  return patterns;
}

// ────────────────── 命宫摘要（保持向后兼容）──────────────────
export function getMingGongSummary(chart: ZiweiChart): {
  stars: string[];
  keywords: string[];
  nature: string;
} {
  const mingPalace = chart.palaces.find(p => p.branch === chart.mingGongBranch);
  if (!mingPalace) return { stars: [], keywords: [], nature: '' };

  const majorStars = mingPalace.stars.filter(s => s.type === 'major');
  const starNames = majorStars.map(s => s.name);

  const keywordMap: Record<string, string[]> = {
    '紫微': ['尊贵', '独立', '领导'],
    '天机': ['智慧', '机变', '善谋'],
    '太阳': ['阳刚', '官贵', '慷慨'],
    '武曲': ['财富', '刚毅', '果断'],
    '天同': ['温和', '享福', '随缘'],
    '廉贞': ['才艺', '桃花', '多变'],
    '天府': ['财库', '稳重', '保守'],
    '太阴': ['柔美', '财富', '细腻'],
    '贪狼': ['欲望', '桃花', '多才'],
    '巨门': ['善辩', '多思', '口才'],
    '天相': ['辅佐', '行政', '稳健'],
    '天梁': ['荫护', '医药', '长辈'],
    '七杀': ['将星', '果决', '孤克'],
    '破军': ['开创', '变动', '破旧'],
  };

  const natureMap: Record<string, string> = {
    '紫微': '帝王星', '天机': '智慧星', '太阳': '贵人星',
    '武曲': '财帛星', '天同': '福德星', '廉贞': '桃花星',
    '天府': '财库星', '太阴': '财富星', '贪狼': '桃花星',
    '巨门': '是非星', '天相': '印绶星', '天梁': '荫庇星',
    '七杀': '将帅星', '破军': '变动星',
  };

  const keywords = starNames.flatMap(n => keywordMap[n] ?? []).slice(0, 5);
  const nature = starNames.length > 0 ? (natureMap[starNames[0]] ?? '') : '空宫';

  return { stars: starNames, keywords, nature };
}
