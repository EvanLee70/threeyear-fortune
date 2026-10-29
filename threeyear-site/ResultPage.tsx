// Result tab: asks the input tab for its payload, calculates, and shows the birth card and the 3-year comparison.
import { useEffect, useState } from 'react'
import { calculatePillarTable } from '../src/engine/pillars.ts'
import { computeAllYearly } from '../src/yearly/index.ts'
import { requestPayload, type WinLike } from './channel.ts'
import { DISPLAY_NAME } from './config.ts'
import Footer from './Footer.tsx'
import ResultView, { type Result } from './ResultView.tsx'

type State = { status: 'loading' } | { status: 'ready'; result: Result } | { status: 'nodata' } | { status: 'error' }

const back = 'inline-block rounded-lg bg-teal-700 px-4 py-2 text-lg font-bold text-white hover:bg-teal-800'

function Notice({ title, text }: { title: string; text: string }) {
  return (
    <div role="status" className="mx-auto mt-6 max-w-2xl rounded-lg bg-teal-50 p-4 text-gray-900">
      <p className="text-xl font-bold">{title}</p>
      <p className="mt-1 text-base">{text}</p>
      <a href="./" className={`${back} mt-3`}>입력 화면으로</a>
    </div>
  )
}

export default function ResultPage({ initial = null }: { initial?: Result | null }) {
  const [state, setState] = useState<State>(initial ? { status: 'ready', result: initial } : { status: 'loading' }) // `initial` is only a test seam

  useEffect(() => {
    if (initial) return
    let alive = true
    const win = window as unknown as WinLike
    const id = new URLSearchParams(window.location.search).get('id') ?? ''
    requestPayload(win, id).then(async (p) => {
      if (!alive) return
      if (!p) { setState({ status: 'nodata' }); return }
      try {
        const bundles = await computeAllYearly(p.input, DISPLAY_NAME)
        if (!alive) return
        if (!bundles) { setState({ status: 'error' }); return }
        document.title = '3개년 운세'
        setState({ status: 'ready', result: { meta: p.meta, table: calculatePillarTable(p.input), bundles } })
      } catch {
        if (alive) setState({ status: 'error' })
      }
    })
    return () => { alive = false }
  }, [initial])

  return (
    // Full width: padding 4px on phones, 8px from md up.
    <div className="w-full px-1 py-4 md:px-2">
      {state.status === 'loading' && <Notice title="운세를 계산하고 있습니다" text="잠시만 기다려 주세요. 처음 한 번은 1~3초 걸릴 수 있습니다." />}
      {state.status === 'nodata' && <Notice title="입력 정보를 찾지 못했습니다" text="이 탭은 입력 화면에서 '운세 보기'를 눌러 열어야 합니다. 입력 정보는 저장되지 않아서, 입력 화면을 닫으면 이 탭에서는 다시 볼 수 없습니다." />}
      {state.status === 'error' && <Notice title="사주 계산에 실패했습니다" text="입력한 날짜와 시각을 다시 확인해 주세요." />}
      {state.status === 'ready' && <ResultView result={state.result} />}
      <Footer />
    </div>
  )
}
