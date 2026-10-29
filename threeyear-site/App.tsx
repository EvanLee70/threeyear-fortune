// 3개년운세 단독 사이트 — 출생 정보 입력 -> 결과 한 화면(사주팔자 표 + 올해/내년/내후년 비교).
// 입력과 결과는 메모리(React state)에만 둔다: 저장소·쿠키·네트워크 사용 없음.
import { useRef, useState } from 'react'
import { calculatePillarTable } from '../src/engine/pillars.ts'
import { computeThreeYear } from '../src/threeyear/compute.ts'
import BirthForm from './BirthForm.tsx'
import ResultView, { type Result } from './ResultView.tsx'
import { DISPLAY_NAME, SOURCE_REPO_URL } from './config.ts'

export default function App() {
  const [result, setResult] = useState<Result | null>(null)
  const [failed, setFailed] = useState(false)
  const run = useRef(0) // 늦게 끝난 이전 계산이 최신 결과를 덮어쓰지 않게 한다

  return (
    <div className="mx-auto max-w-3xl px-3 py-6">
      <header className="mb-5">
        <h1 className="text-2xl font-bold text-gray-900">🔮 3개년 운세</h1>
        <p className="mt-1 text-base text-gray-800">올해 · 내년 · 내후년 운세를 사주명리(四柱命理)로 비교해 봅니다.</p>
      </header>

      <BirthForm
        onInvalid={() => { run.current++; setResult(null); setFailed(false) }}
        onResolved={({ input, meta }) => {
          const id = ++run.current
          setFailed(false)
          // 결과는 제출 때 한 번만 계산해 둔다 — 다시 그려져도 점수가 바뀌지 않는다.
          computeThreeYear(input, DISPLAY_NAME).then((r) => {
            if (id !== run.current) return
            if (!r) { setResult(null); setFailed(true); return }
            setResult({ meta, table: calculatePillarTable(input), years: r.years })
          }).catch(() => { if (id === run.current) { setResult(null); setFailed(true) } })
        }}
      />

      {failed && <p role="alert" className="mt-4 text-base font-bold text-rose-700">사주 계산에 실패했습니다. 입력을 확인해 주세요.</p>}
      {result && <ResultView result={result} />}

      <footer className="mt-8 space-y-1 border-t-2 border-gray-300 pt-4 text-base text-gray-800">
        <p>⚠️ 재미·참고용입니다. 결과를 보장하지 않으며 중요한 결정은 전문가와 상의하세요.</p>
        <p>소스 코드는 MIT 라이선스로 공개됩니다.{SOURCE_REPO_URL && <> <a className="font-bold text-teal-800 underline" href={SOURCE_REPO_URL} target="_blank" rel="noopener noreferrer">소스 코드 보기</a></>}</p>
        <p>사주 엔진 일부: fortuneteller (MIT, Hoshin)</p>
      </footer>
    </div>
  )
}
