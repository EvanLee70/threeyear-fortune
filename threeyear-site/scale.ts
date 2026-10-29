// 차트 공용 계산 (컴포넌트 파일에서 분리 — 순수 함수)

/** 점수 구간 색 (흰 글자 기준 대비 4.5:1 이상) */
export function bandHex(v: number): string {
  if (v >= 75) return '#0f766e'
  if (v >= 60) return '#047857'
  if (v >= 45) return '#b45309'
  return '#be123c'
}

export const clamp = (v: number) => Math.max(0, Math.min(100, v))

/** 월별 점수에서 최고·최저 달을 고른다 (동점이면 앞선 달). 빈 배열이면 null */
export function bestWorst(months: { month: number; score: number }[]) {
  if (!months.length) return null
  let best = months[0], worst = months[0]
  for (const m of months) {
    if (m.score > best.score) best = m
    if (m.score < worst.score) worst = m
  }
  return { best, worst }
}
