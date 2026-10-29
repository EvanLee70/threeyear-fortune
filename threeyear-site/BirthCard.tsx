// Birth information as pictures: two calendar leaves (solar and lunar), a clock, a gender symbol, and a map pin.
// One row on wide screens (wraps on narrow ones). Each item is as wide as its own text and picture; spare width is shared equally. Every picture is two text lines tall (h-14 = 56px = 2 x leading-7),
// with its label and value beside it, so the whole card is about 88px high.
// Flat colour fields only: no outlines, gradients, shadows, or emoji. Body text is at least 16px.
import type { ReactNode } from 'react'
import { formatHeader, type BirthMeta } from './birth.ts'

const WEEKDAY = ['일', '월', '화', '수', '목', '금', '토']
const BRANCH_HANJA = [...'子丑寅卯辰巳午未申酉戌亥']
const BRANCH_KO = [...'자축인묘진사오미신유술해']

const INK = '#134e4a' // teal-900, same as the card ground
const ACCENT = '#b45309'
const PICTURE = 'h-14 w-14 shrink-0' // two text lines tall
const p2 = (n: number) => String(n).padStart(2, '0')

function Item({ title, note, badge, wrap, picture, children }: { title: string; note?: string; badge?: boolean; wrap?: boolean; picture: ReactNode; children: ReactNode }) {
  return (
    <div className="flex flex-auto items-center gap-2 rounded-lg bg-teal-800 p-2">
      {picture}
      <div className="min-w-0">
        <p className="flex flex-wrap items-center gap-x-2 text-base font-bold leading-7 text-white">
          <span className="whitespace-nowrap">{title}</span>
          {badge === true && <span className="whitespace-nowrap rounded-full bg-amber-300 px-2 text-sm font-bold leading-6 text-gray-900">입력</span>}
          {note && <span className="text-base font-normal">{note}</span>}
        </p>
        <p className={`text-base font-black leading-7 ${wrap ? 'break-words' : 'whitespace-nowrap'}`}>{children}</p>
      </div>
    </div>
  )
}

/** Calendar leaf: a colour band on top and the day number big below. Month and weekday are written beside it. */
function Leaf({ day, band }: { day: number; band: string }) {
  return (
    <div className={`${PICTURE} flex flex-col overflow-hidden rounded-md bg-white text-gray-900`} aria-hidden="true">
      <div className={`h-3 ${band}`} />
      <div className="flex flex-1 items-center justify-center text-3xl font-black leading-none" data-testid="leaf-day">{day}</div>
    </div>
  )
}

/** Clock face: hour hand (thick, dark) and minute hand (accent). `unknown` draws an empty face with a question mark. */
export function Clock({ hour, minute, unknown }: { hour: number; minute: number; unknown: boolean }) {
  const hourAngle = ((hour % 12) + minute / 60) * 30
  const minuteAngle = minute * 6
  return (
    <svg viewBox="0 0 120 120" className={PICTURE} role="img" aria-label={unknown ? '시간 미상' : `${hour}시 ${minute}분`} data-testid="clock">
      <circle cx="60" cy="60" r="58" fill="#ffffff" />
      {Array.from({ length: 12 }, (_, i) => (
        <line key={i} x1="60" y1="8" x2="60" y2={i % 3 === 0 ? 24 : 17} stroke={INK} strokeWidth={i % 3 === 0 ? 8 : 5} strokeLinecap="round" transform={`rotate(${i * 30} 60 60)`} />
      ))}
      {unknown ? (
        <text x="60" y="78" textAnchor="middle" fontSize="56" fontWeight="900" fill={INK}>?</text>
      ) : (
        <>
          <line x1="60" y1="60" x2="60" y2="36" stroke={INK} strokeWidth="11" strokeLinecap="round" transform={`rotate(${hourAngle} 60 60)`} data-hand="hour" data-angle={hourAngle} />
          <line x1="60" y1="60" x2="60" y2="22" stroke={ACCENT} strokeWidth="8" strokeLinecap="round" transform={`rotate(${minuteAngle} 60 60)`} data-hand="minute" data-angle={minuteAngle} />
          <circle cx="60" cy="60" r="7" fill={INK} />
        </>
      )}
    </svg>
  )
}

/** Mars (male) and Venus (female) symbols drawn as thick strokes. */
function GenderMark({ gender }: { gender: 'M' | 'F' }) {
  return (
    <svg viewBox="0 0 100 100" className={PICTURE} aria-hidden="true">
      <g fill="none" stroke="#ffffff" strokeWidth="11" strokeLinecap="round" strokeLinejoin="round">
        {gender === 'M' ? (
          <>
            <circle cx="42" cy="58" r="22" />
            <line x1="58" y1="42" x2="82" y2="18" />
            <polyline points="58,16 84,16 84,42" />
          </>
        ) : (
          <>
            <circle cx="50" cy="36" r="22" />
            <line x1="50" y1="58" x2="50" y2="90" />
            <line x1="34" y1="76" x2="66" y2="76" />
          </>
        )}
      </g>
    </svg>
  )
}

function Pin() {
  return (
    <svg viewBox="0 0 100 100" className={PICTURE} aria-hidden="true">
      <path d="M50 6C31 6 18 20 18 38c0 24 32 56 32 56s32-32 32-56C82 20 69 6 50 6Z" fill="#ffffff" />
      <circle cx="50" cy="38" r="12" fill={INK} />
    </svg>
  )
}

/** Hour branch label from the pillar table, e.g. '사시(巳時)'. */
function branchLabel(branch?: string): string | null {
  const i = branch ? BRANCH_HANJA.indexOf(branch) : -1
  return i < 0 ? null : `${BRANCH_KO[i]}시(${BRANCH_HANJA[i]}時)`
}

export default function BirthCard({ meta, hourBranch }: { meta: BirthMeta; hourBranch?: string }) {
  const { solar, lunar } = meta
  const weekday = WEEKDAY[new Date(Date.UTC(solar.year, solar.month - 1, solar.day)).getUTCDay()]
  const sijin = branchLabel(hourBranch)
  const male = meta.gender === 'M'
  return (
    <section className="rounded-xl bg-teal-900 p-2 text-white" aria-label="출생 정보" data-testid="birth-card">
      <h2 className="sr-only">출생 정보</h2>
      {/* the same facts as one plain sentence, for screen readers and copy */}
      <p className="sr-only" data-testid="header-line">{formatHeader(meta)}</p>
      <div className="flex flex-wrap gap-2" data-testid="birth-row">
        <Item title="양력" badge={meta.calendar === 'solar'} picture={<Leaf day={solar.day} band="bg-teal-950" />}>
          {`${solar.year}.${p2(solar.month)}.${p2(solar.day)} (${weekday})`}
        </Item>
        <Item title="음력" badge={meta.calendar === 'lunar'} picture={<Leaf day={lunar.day} band="bg-amber-600" />}>
          {`${lunar.year}.${lunar.leap ? '윤' : ''}${p2(lunar.month)}.${p2(lunar.day)}`}
        </Item>
        <Item title="태어난 시간" note={meta.unknownTime ? '정오(12:00) 기준' : undefined} picture={<Clock hour={meta.hour} minute={meta.minute} unknown={meta.unknownTime} />}>
          {meta.unknownTime ? (
            '시간 미상'
          ) : (
            <>
              <span data-testid="clock-time">{String(meta.hour).padStart(2, '0')}:{String(meta.minute).padStart(2, '0')}</span>
              {sijin && ` · ${sijin}`}
            </>
          )}
        </Item>
        <Item title="성별" picture={<GenderMark gender={meta.gender} />}>
          {male ? '남성' : '여성'}
        </Item>
        <Item title="태어난 곳" wrap picture={<Pin />}>
          {meta.cityLabel}
        </Item>
      </div>
    </section>
  )
}
