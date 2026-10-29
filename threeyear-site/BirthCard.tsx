// Birth information as pictures: two calendar leaves (solar and lunar), a clock, a gender symbol, and a map pin.
// Flat colour fields only: no outlines, gradients, shadows, or emoji. Body text is at least 16px.
import type { ReactNode } from 'react'
import { formatHeader, type BirthMeta } from './birth.ts'

const WEEKDAY = ['일', '월', '화', '수', '목', '금', '토']
const BRANCH_HANJA = [...'子丑寅卯辰巳午未申酉戌亥']
const BRANCH_KO = [...'자축인묘진사오미신유술해']

const INK = '#134e4a' // teal-900, same as the card ground
const ACCENT = '#b45309'

function Tile({ title, badge, children, className = '' }: { title: string; badge?: boolean; children: ReactNode; className?: string }) {
  return (
    <div className={`flex min-w-0 flex-col gap-2 rounded-lg bg-teal-800 p-3 ${className}`}>
      <div className="flex min-h-7 flex-wrap items-center justify-between gap-x-2 gap-y-1">
        <span className="whitespace-nowrap text-base font-bold text-white">{title}</span>
        {badge === true && <span className="whitespace-nowrap rounded-full bg-amber-300 px-2 py-0.5 text-sm font-bold text-gray-900">입력 기준</span>}
        {/* keeps both calendar leaves at the same height when the badge wraps under the title on phones */}
        {badge === false && <span aria-hidden="true" className="invisible whitespace-nowrap px-2 py-0.5 text-sm">.</span>}
      </div>
      {children}
    </div>
  )
}

function Leaf({ strip, day, foot }: { strip: string; day: number; foot: string }) {
  return (
    <div className="overflow-hidden rounded-md bg-white text-gray-900">
      <div className="bg-teal-950 px-2 py-1 text-center text-base font-bold text-white">{strip}</div>
      <div className="py-1 text-center text-6xl font-black leading-none" data-testid="leaf-day">{day}</div>
      <div className="pb-2 text-center text-lg font-bold">{foot}</div>
    </div>
  )
}

/** Clock face: hour hand (thick, dark) and minute hand (accent). `unknown` draws an empty face with a question mark. */
export function Clock({ hour, minute, unknown }: { hour: number; minute: number; unknown: boolean }) {
  const hourAngle = ((hour % 12) + minute / 60) * 30
  const minuteAngle = minute * 6
  return (
    <svg viewBox="0 0 120 120" className="h-28 w-28 shrink-0" role="img" aria-label={unknown ? '시간 미상' : `${hour}시 ${minute}분`} data-testid="clock">
      <circle cx="60" cy="60" r="58" fill="#ffffff" />
      {Array.from({ length: 12 }, (_, i) => (
        <line key={i} x1="60" y1="8" x2="60" y2={i % 3 === 0 ? 20 : 15} stroke={INK} strokeWidth={i % 3 === 0 ? 5 : 3} strokeLinecap="round" transform={`rotate(${i * 30} 60 60)`} />
      ))}
      {unknown ? (
        <text x="60" y="76" textAnchor="middle" fontSize="48" fontWeight="900" fill={INK}>?</text>
      ) : (
        <>
          <line x1="60" y1="60" x2="60" y2="34" stroke={INK} strokeWidth="7" strokeLinecap="round" transform={`rotate(${hourAngle} 60 60)`} data-hand="hour" data-angle={hourAngle} />
          <line x1="60" y1="60" x2="60" y2="20" stroke={ACCENT} strokeWidth="5" strokeLinecap="round" transform={`rotate(${minuteAngle} 60 60)`} data-hand="minute" data-angle={minuteAngle} />
          <circle cx="60" cy="60" r="5" fill={INK} />
        </>
      )}
    </svg>
  )
}

/** Mars (male) and Venus (female) symbols drawn as thick strokes. */
function GenderMark({ gender }: { gender: 'M' | 'F' }) {
  return (
    <svg viewBox="0 0 100 100" className="h-16 w-16 shrink-0 md:h-24 md:w-24" aria-hidden="true">
      <g fill="none" stroke="#ffffff" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round">
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
    <svg viewBox="0 0 100 100" className="h-16 w-16 shrink-0 md:h-24 md:w-24" aria-hidden="true">
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

export default function BirthCard({ meta, name, hourBranch }: { meta: BirthMeta; name: string; hourBranch?: string }) {
  const { solar, lunar } = meta
  const weekday = WEEKDAY[new Date(Date.UTC(solar.year, solar.month - 1, solar.day)).getUTCDay()]
  const hour12 = meta.hour % 12 === 0 ? 12 : meta.hour % 12
  const sijin = branchLabel(hourBranch)
  const male = meta.gender === 'M'
  return (
    <section className="rounded-xl bg-teal-900 p-3 text-white md:p-4" aria-label="출생 정보" data-testid="birth-card">
      <h2 className="mb-3 text-2xl font-bold">{name}님의 출생 정보</h2>
      {/* the same facts as one plain sentence, for screen readers and copy */}
      <p className="sr-only" data-testid="header-line">{`${name}님 · ${formatHeader(meta)}`}</p>
      <div className="grid grid-cols-2 gap-2 md:grid-cols-5">
        <Tile title="양력(陽曆)" badge={meta.calendar === 'solar'}>
          <Leaf strip={`${solar.year}년 ${solar.month}월`} day={solar.day} foot={`${weekday}요일`} />
        </Tile>
        <Tile title="음력(陰曆)" badge={meta.calendar === 'lunar'}>
          <Leaf strip={`${lunar.year}년 ${lunar.leap ? '윤' : ''}${lunar.month}월`} day={lunar.day} foot={lunar.leap ? '윤달' : '평달'} />
        </Tile>
        <Tile title="태어난 시간" className="col-span-2 md:col-span-1">
          <div className="flex items-center gap-3 md:flex-col md:items-start">
            <Clock hour={meta.hour} minute={meta.minute} unknown={meta.unknownTime} />
            {meta.unknownTime ? (
              <div>
                <p className="text-2xl font-black leading-tight">시간 미상</p>
                <p className="text-base">정오(12:00) 기준으로 계산합니다</p>
              </div>
            ) : (
              <div>
                <p className="text-base font-bold">{meta.hour < 12 ? '오전' : '오후'} {hour12}시</p>
                <p className="text-4xl font-black leading-none" data-testid="clock-time">{String(meta.hour).padStart(2, '0')}:{String(meta.minute).padStart(2, '0')}</p>
                {sijin && <p className="mt-1 text-lg font-bold">{sijin}</p>}
              </div>
            )}
          </div>
        </Tile>
        <Tile title="성별">
          <div className="flex flex-col items-start gap-2 md:flex-row md:items-center md:gap-3">
            <GenderMark gender={meta.gender} />
            <p className="text-3xl font-black">{male ? '남성' : '여성'}</p>
          </div>
        </Tile>
        <Tile title="태어난 곳">
          <div className="flex flex-col items-start gap-2 md:flex-row md:items-center md:gap-3">
            <Pin />
            <p className="min-w-0 text-2xl font-black leading-tight">{meta.cityLabel}</p>
          </div>
        </Tile>
      </div>
    </section>
  )
}
