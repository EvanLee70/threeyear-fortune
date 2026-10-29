// 출생 정보 입력 폼. 값은 메모리(React state)에만 둔다. 저장·전송 없음.
import { useState, type FormEvent, type ReactNode } from 'react'
import { KOREAN_CITIES, WORLD_CITIES, formatCityName } from '../src/engine/cities.ts'
import { resolveBirth, type BirthFormState, type Resolved } from './birth.ts'

const CITIES = [...KOREAN_CITIES, ...WORLD_CITIES]
const thisYear = new Date().getFullYear()
const YEARS = Array.from({ length: thisYear - 1919 }, (_, i) => thisYear - i)
const range = (from: number, to: number) => Array.from({ length: to - from + 1 }, (_, i) => from + i)

const INITIAL: BirthFormState = { calendar: 'solar', leap: false, year: 1985, month: 1, day: 1, hour: 12, minute: 0, unknownTime: false, gender: 'M', city: 0 }

const field = 'h-12 w-full rounded-lg border-2 border-gray-600 bg-white px-3 text-base text-gray-900 focus:outline-none focus:ring-4 focus:ring-teal-600/40'
const label = 'block text-base font-bold text-gray-900 mb-1'
const check = 'h-6 w-6 accent-teal-700'

function Select({ id, value, onChange, children }: { id: string; value: number; onChange: (v: number) => void; children: ReactNode }) {
  return <select id={id} className={field} value={value} onChange={(e) => onChange(Number(e.target.value))}>{children}</select>
}

interface Props {
  onResolved: (r: Extract<Resolved, { ok: true }>) => void
  onInvalid: () => void
}

export default function BirthForm({ onResolved, onInvalid }: Props) {
  const [form, setForm] = useState<BirthFormState>(INITIAL)
  const [error, setError] = useState<string | null>(null)

  const set = (patch: Partial<BirthFormState>) => setForm((f) => {
    const next = { ...f, ...patch }
    if (next.calendar === 'solar') next.leap = false
    const maxDay = next.calendar === 'lunar' ? 30 : new Date(next.year, next.month, 0).getDate()
    return { ...next, day: Math.min(next.day, maxDay) }
  })
  const lunar = form.calendar === 'lunar'
  const maxDay = lunar ? 30 : new Date(form.year, form.month, 0).getDate()

  function submit(e: FormEvent) {
    e.preventDefault()
    const r = resolveBirth(form, CITIES[form.city])
    if (!r.ok) { setError(r.error); onInvalid(); return }
    setError(null)
    onResolved(r)
  }

  return (
    <form onSubmit={submit} className="space-y-4 rounded-lg border-2 border-teal-700 bg-white p-4" aria-label="출생 정보 입력">
      <fieldset className="flex flex-wrap items-center gap-x-6 gap-y-2">
        <legend className={label}>달력</legend>
        {([['solar', '양력'], ['lunar', '음력']] as const).map(([v, text]) => (
          <label key={v} className="flex items-center gap-2 text-base text-gray-900">
            <input type="radio" name="calendar" className={check} checked={form.calendar === v} onChange={() => set({ calendar: v })} />{text}
          </label>
        ))}
        {lunar && (
          <label className="flex items-center gap-2 text-base text-gray-900">
            <input type="checkbox" name="leap" className={check} checked={form.leap} onChange={(e) => set({ leap: e.target.checked })} />윤달
          </label>
        )}
      </fieldset>

      <div className="grid grid-cols-3 gap-3">
        <div><label htmlFor="y" className={label}>태어난 해</label>
          <Select id="y" value={form.year} onChange={(year) => set({ year })}>{YEARS.map((v) => <option key={v} value={v}>{v}년</option>)}</Select></div>
        <div><label htmlFor="m" className={label}>월</label>
          <Select id="m" value={form.month} onChange={(month) => set({ month })}>{range(1, 12).map((v) => <option key={v} value={v}>{v}월</option>)}</Select></div>
        <div><label htmlFor="d" className={label}>일</label>
          <Select id="d" value={form.day} onChange={(day) => set({ day })}>{range(1, maxDay).map((v) => <option key={v} value={v}>{v}일</option>)}</Select></div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div><label htmlFor="h" className={label}>태어난 시</label>
          <Select id="h" value={form.hour} onChange={(hour) => set({ hour })}>{range(0, 23).map((v) => <option key={v} value={v}>{v}시</option>)}</Select></div>
        <div><label htmlFor="mi" className={label}>분</label>
          <Select id="mi" value={form.minute} onChange={(minute) => set({ minute })}>{range(0, 59).map((v) => <option key={v} value={v}>{v}분</option>)}</Select></div>
      </div>
      <label className="flex items-center gap-2 text-base text-gray-900">
        <input type="checkbox" className={check} checked={form.unknownTime} onChange={(e) => set({ unknownTime: e.target.checked })} />
        태어난 시간을 몰라요 (정오 기준으로 계산합니다)
      </label>

      <fieldset className="flex items-center gap-6">
        <legend className={label}>성별</legend>
        {([['M', '남성'], ['F', '여성']] as const).map(([v, text]) => (
          <label key={v} className="flex items-center gap-2 text-base text-gray-900">
            <input type="radio" name="gender" className={check} checked={form.gender === v} onChange={() => set({ gender: v })} />{text}
          </label>
        ))}
      </fieldset>

      <div><label htmlFor="c" className={label}>태어난 곳</label>
        <Select id="c" value={form.city} onChange={(city) => set({ city })}>
          <optgroup label="한국">{KOREAN_CITIES.map((c, i) => <option key={i} value={i}>{formatCityName(c)}</option>)}</optgroup>
          <optgroup label="해외">{WORLD_CITIES.map((c, i) => <option key={i} value={KOREAN_CITIES.length + i}>{formatCityName(c)}</option>)}</optgroup>
        </Select></div>

      <button type="submit" className="h-12 w-full rounded-lg bg-teal-700 text-lg font-bold text-white hover:bg-teal-800 focus:outline-none focus:ring-4 focus:ring-teal-600/40">운세 보기</button>
      {error && <p role="alert" className="text-base font-bold text-rose-700">{error}</p>}
      <p className="text-base font-bold text-gray-900">🔒 입력한 정보는 저장되거나 서버로 전송되지 않습니다.</p>
    </form>
  )
}
