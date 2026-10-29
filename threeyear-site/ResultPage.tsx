// Result tab: asks the input tab for its payload, calculates, and shows the birth card and the 3-year comparison.
import { useCallback, useEffect, useRef, useState } from 'react'
import { calculatePillarTable } from '../src/engine/pillars.ts'
import { computeAllYearly } from '../src/yearly/index.ts'
import { releasePayload, requestPayload, type WinLike } from './channel.ts'
import { DISPLAY_NAME } from './config.ts'
import Footer from './Footer.tsx'
import ResultView, { type Result } from './ResultView.tsx'

type State =
  | { status: 'loading' }
  | { status: 'ready'; result: Result }
  | { status: 'nodata' } // the input tab is gone or does not know this tab
  | { status: 'timeout' } // the input tab is silent; a late answer is still accepted
  | { status: 'error' }
  | { status: 'cleared' } // the user removed the result from this tab

const btn = 'inline-block rounded-lg bg-teal-700 px-4 py-2 text-lg font-bold text-white hover:bg-teal-800'
const quiet = 'rounded-lg bg-gray-200 px-3 py-1 text-base font-bold text-gray-900 hover:bg-gray-300'

function Notice({ title, text, children }: { title: string; text: string; children?: React.ReactNode }) {
  return (
    <div role="status" className="mx-auto mt-6 max-w-2xl rounded-lg bg-teal-50 p-4 text-gray-900">
      <p className="text-xl font-bold">{title}</p>
      <p className="mt-1 text-base">{text}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {children}
        <a href="./" className={btn}>입력 화면으로</a>
      </div>
    </div>
  )
}

export default function ResultPage({ initial = null }: { initial?: Result | null }) {
  const [state, setState] = useState<State>(initial ? { status: 'ready', result: initial } : { status: 'loading' }) // `initial` is only a test seam
  const request = useRef<ReturnType<typeof requestPayload> | null>(null)
  const idRef = useRef('')

  useEffect(() => {
    if (initial) return
    let alive = true
    const win = window as unknown as WinLike
    const id = new URLSearchParams(window.location.search).get('id') ?? ''
    idRef.current = id
    request.current = requestPayload(win, id, async (r) => {
      if (!alive) return
      if (r.status === 'missing') { setState({ status: 'nodata' }); return }
      if (r.status === 'timeout') { setState((s) => (s.status === 'ready' ? s : { status: 'timeout' })); return }
      try {
        const bundles = await computeAllYearly(r.payload.input, DISPLAY_NAME)
        if (!alive) return
        if (!bundles) { setState({ status: 'error' }); return }
        document.title = '3개년 운세'
        setState({ status: 'ready', result: { meta: r.payload.meta, table: calculatePillarTable(r.payload.input), bundles } })
      } catch {
        if (alive) setState({ status: 'error' })
      }
    })
    return () => { alive = false; request.current?.stop() }
  }, [initial])

  const retry = useCallback(() => { setState({ status: 'loading' }); request.current?.retry() }, [])
  const clear = useCallback(() => {
    request.current?.stop()
    releasePayload(window as unknown as WinLike, idRef.current) // the input tab forgets this person's data too
    document.title = '3개년 운세'
    setState({ status: 'cleared' }) // drops the result from memory
  }, [])

  return (
    // Full width: padding 4px on phones, 8px from md up.
    <div className="w-full px-1 py-4 md:px-2">
      {state.status === 'loading' && <Notice title="운세를 계산하고 있습니다" text="잠시만 기다려 주세요. 처음 한 번은 1~3초 걸릴 수 있습니다." />}
      {state.status === 'timeout' && (
        <Notice title="입력 화면의 응답이 늦습니다" text="입력 화면이 바쁘거나 멈춰 있을 수 있습니다. 응답이 오면 자동으로 표시됩니다. 바로 다시 요청하려면 아래 버튼을 눌러 주세요.">
          <button type="button" className={btn} onClick={retry}>다시 시도</button>
        </Notice>
      )}
      {state.status === 'nodata' && <Notice title="입력 정보를 찾지 못했습니다" text="이 탭은 입력 화면에서 '운세 보기'를 눌러 열어야 합니다. 입력 정보는 저장되지 않아서, 입력 화면을 닫으면 이 탭에서는 다시 볼 수 없습니다." />}
      {state.status === 'error' && <Notice title="사주 계산에 실패했습니다" text="입력한 날짜와 시각을 다시 확인해 주세요." />}
      {state.status === 'cleared' && <Notice title="결과를 지웠습니다" text="이 탭의 결과와 입력 화면에 남아 있던 입력 정보를 지웠습니다. 다시 보려면 입력 화면에서 '운세 보기'를 눌러 주세요." />}
      {state.status === 'ready' && (
        <>
          <div className="mb-2 flex justify-end">
            <button type="button" className={quiet} onClick={clear} data-testid="clear-result">이 탭의 결과 지우기</button>
          </div>
          <ResultView result={state.result} />
        </>
      )}
      <Footer />
    </div>
  )
}
