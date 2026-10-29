// 비교 화면용 작은 차트 부품 — 순수 SVG/CSS. 모든 차트는 0~100 고정 눈금, 숫자는 항상 글자로도 표시한다.
import type { ReactNode } from 'react'
import { scoreBandLabel } from '../src/threeyear/core.ts'
import { bandHex, clamp } from './scale.ts'

export function Chip({ children, tone = 'gray' }: { children: ReactNode; tone?: 'gray' | 'rose' | 'indigo' | 'teal' }) {
  const t = { gray: 'bg-gray-100 text-gray-900 border-gray-500', rose: 'bg-rose-50 text-rose-900 border-rose-700', indigo: 'bg-indigo-50 text-indigo-900 border-indigo-700', teal: 'bg-teal-50 text-teal-900 border-teal-700' }[tone]
  return <span className={`inline-block rounded-md border px-1.5 py-0.5 text-sm font-medium leading-snug ${t}`}>{children}</span>
}

/** 반원 게이지 + 점수 + 구간 이름 */
export function Gauge({ value }: { value: number }) {
  const v = clamp(value)
  return (
    <div className="text-center">
      <svg viewBox="0 0 120 70" className="mx-auto block w-full max-w-[150px]" role="img" aria-label={`종합 ${v}점 ${scoreBandLabel(v)}`}>
        <path d="M12 62 A48 48 0 0 1 108 62" fill="none" stroke="#d1d5db" strokeWidth="13" strokeLinecap="round" pathLength={100} />
        <path d="M12 62 A48 48 0 0 1 108 62" fill="none" stroke={bandHex(v)} strokeWidth="13" strokeLinecap="round" pathLength={100} strokeDasharray={`${v} 100`} />
        <text x="60" y="58" textAnchor="middle" fontSize="28" fontWeight="700" fill="#111827">{v}</text>
      </svg>
      <p className="text-[13px] font-bold" style={{ color: bandHex(v) }}>{scoreBandLabel(v)}</p>
    </div>
  )
}

/** 가로 막대: [이름][막대][점수] — 막대 길이는 0~100 공통 눈금 */
export function HBar({ label, value, labelWidth = 'w-8' }: { label?: ReactNode; value: number; labelWidth?: string }) {
  const v = clamp(value)
  return (
    <div className="flex items-center gap-1">
      {label !== undefined && <span className={`${labelWidth} shrink-0 text-[13px] font-medium text-gray-900`}>{label}</span>}
      <div className="h-3 min-w-0 flex-1 rounded-full bg-gray-300" role="img" aria-label={`${v}점`}>
        <div className="h-full rounded-full" style={{ width: `${Math.max(v, 3)}%`, background: bandHex(v) }} />
      </div>
      <span className="w-8 shrink-0 text-right text-[13px] font-bold text-gray-900">{v}</span>
    </div>
  )
}

export interface MonthPoint { month: number; score: number }

/** 12개월 세로 막대 (0~100 고정 눈금). 최고 달은 굵은 테두리, 조심 달은 점선 테두리. */
export function MonthBars({ months, best, worst }: { months: MonthPoint[]; best: number; worst: number }) {
  return (
    <div>
      <div className="relative grid h-24 grid-cols-12 items-end gap-px border-b border-gray-700" role="img" aria-label="월별 점수 (0~100)">
        <div className="pointer-events-none absolute inset-x-0 top-1/2 border-t border-dashed border-gray-400" />
        {months.map((m) => (
          <div
            key={m.month}
            className="relative rounded-t-sm"
            style={{
              height: `${Math.max(clamp(m.score), 3)}%`,
              background: bandHex(m.score),
              outline: m.month === best ? '2px solid #111827' : m.month === worst ? '2px dashed #111827' : 'none',
              outlineOffset: 1,
            }}
            title={`${m.month}월 ${m.score}점`}
          />
        ))}
      </div>
      {/* 월 번호: 칸이 좁아 홀수 달은 윗줄, 짝수 달은 아랫줄에 어긋나게 놓는다 */}
      <div className="grid grid-cols-12 text-[13px] leading-tight text-gray-900" aria-hidden="true">
        {months.map((m) => (
          <span key={m.month} className="justify-self-center" style={{ gridColumn: m.month, gridRow: m.month % 2 === 1 ? 1 : 2, fontWeight: m.month === best || m.month === worst ? 700 : 400 }}>{m.month}</span>
        ))}
      </div>
    </div>
  )
}
