// 3개년운세 단독 사이트 입력 화면. 운세 해설은 여기에 나오지 않는다 — '운세 보기'를 누르면 새 탭에서 열린다.
// 입력 정보는 메모리에만 두고 새 탭이 요청할 때만 넘긴다(channel.ts): 저장소·쿠키·주소·네트워크 사용 없음.
import { useEffect, useRef, useState } from 'react'
import BirthForm from './BirthForm.tsx'
import Footer from './Footer.tsx'
import { createResultHub, type ResultPayload, type WinLike } from './channel.ts'

type Status = 'idle' | 'opened' | 'blocked'

const again = 'ml-2 rounded-lg bg-teal-700 px-3 py-1 text-base font-bold text-white hover:bg-teal-800'

export default function App() {
  const hub = useRef<ReturnType<typeof createResultHub> | null>(null)
  const last = useRef<ResultPayload | null>(null)
  const [status, setStatus] = useState<Status>('idle')

  useEffect(() => {
    const h = createResultHub(window as unknown as WinLike)
    hub.current = h
    return () => { h.stop(); hub.current = null }
  }, [])

  // Must run inside the click, or the browser blocks the new tab.
  const launch = (p: ResultPayload) => {
    last.current = p
    setStatus(hub.current?.open(p) ? 'opened' : 'blocked')
  }

  return (
    <div className="w-full px-1 py-6 md:px-2">
      <div className="mx-auto max-w-3xl px-2">
        <header className="mb-5">
          <h1 className="text-2xl font-bold text-gray-900">🔮 3개년 운세</h1>
          <p className="mt-1 text-base text-gray-800">올해 · 내년 · 내후년 운세를 명리·자미두수·점성술·토정비결·주역 다섯 가지로 비교해 봅니다. 출생 정보를 넣고 '운세 보기'를 누르면 새 탭에 결과가 열립니다.</p>
        </header>

        <BirthForm onInvalid={() => setStatus('idle')} onResolved={({ input, meta }) => launch({ input, meta })} />

        {status === 'opened' && (
          <p role="status" className="mt-4 rounded-lg bg-teal-50 p-3 text-base text-gray-900">
            새 탭에서 3개년 운세를 열었습니다. 탭이 보이지 않으면 브라우저 위쪽의 탭 목록을 확인해 주세요.
            <button type="button" className={again} onClick={() => last.current && launch(last.current)}>결과 다시 열기</button>
          </p>
        )}
        {status === 'blocked' && (
          <p role="alert" className="mt-4 rounded-lg bg-rose-50 p-3 text-base font-bold text-rose-800">
            브라우저가 새 탭을 막았습니다. 주소창 오른쪽의 팝업 차단을 풀고 다시 눌러 주세요.
            <button type="button" className={again} onClick={() => last.current && launch(last.current)}>다시 열기</button>
          </p>
        )}
      </div>
      <Footer />
    </div>
  )
}
