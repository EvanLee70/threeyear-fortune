// 니하이샤(倪海厦) 천기 체계 자미두수 — 별도 엔진 어댑터.
// 엔진 본체(algorithm.ts·patterns.ts)는 Renhuai123/ziwei-doushu(MIT)를 그대로 가져온 것이고,
// 이 파일만 우리 앱의 BirthInput을 그 엔진의 BirthInfo(시진 지지 번호)로 바꾼다.
//
// 일반 iztro 기본 설정과 결과가 다를 수 있는 이유:
//  1) 궁간자화·대한사화·유년사화 등 비성(飛星)파 도구를 쓰지 않는다 (격국 판정은 고서 조건만 사용).
//  2) 별 밝기는 《자미두수전서(全書)》표를 기본으로 쓴다.
//  3) 윤달은 월중 분계('split')를 기본으로 쓴다.
//  4) 늦은 자시(23:00~23:59)는 다음 날로 넘겨 배반한다.
// 시간 보정 규칙: 서울/미지정 = KST 고정 벽시계, 그 외 = 경도 기준 태양시.
import type { BirthInput } from '../../engine/types.ts'
import {
  DEFAULT_TIMEZONE, adjustBirthInputToKstWallClock, adjustBirthInputToSolarTime,
} from '../../engine/tz.ts'
import { generateChart } from './algorithm.ts'
import { detectPatterns, type Pattern } from './patterns.ts'
import type { BirthInfo, ZiweiChart } from './types.ts'

/** 시각(0~23) → 시진 지지 번호(0=자 … 11=해) */
export function hourToBranch(hour: number): number {
  return hour === 23 || hour === 0 ? 0 : Math.floor((hour + 1) / 2)
}

/** BirthInput → 엔진 입력. 시간 모름이면 null. */
export function toNihaiBirthInfo(input: BirthInput): BirthInfo | null {
  if (input.unknownTime) return null
  const t = input.timezone != null && input.timezone !== DEFAULT_TIMEZONE
    ? adjustBirthInputToSolarTime(input)
    : adjustBirthInputToKstWallClock(input)
  let { year, month, day } = t
  if (t.hour === 23) {
    // 늦은 자시는 다음 날 배반 — Date가 월말·연말 올림을 처리한다
    const next = new Date(Date.UTC(year, month - 1, day + 1))
    year = next.getUTCFullYear(); month = next.getUTCMonth() + 1; day = next.getUTCDate()
  }
  return {
    year, month, day,
    hour: hourToBranch(t.hour),
    gender: input.gender === 'M' ? 'male' : 'female',
    longitude: input.longitude,
  }
}

export interface NihaiResult {
  chart: ZiweiChart
  patterns: Pattern[]
}

/** 시간을 모르면 null. 잘못된 날짜면 엔진이 RangeError를 던진다. */
export function buildNihai(input: BirthInput): NihaiResult | null {
  const info = toNihaiBirthInfo(input)
  if (!info) return null
  const chart = generateChart(info)
  return { chart, patterns: detectPatterns(chart) }
}
