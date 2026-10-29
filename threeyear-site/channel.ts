// Hands the birth input from the input tab to the result tab without storing anything.
// The input tab keeps the payloads in memory. The new tab asks its opener (same origin only) for its own payload by a
// random id. The id is the only thing in the address bar; no birth data goes into the URL, storage, cookies, or network.
import type { BirthInput } from '../src/engine/types.ts'
import type { BirthMeta } from './birth.ts'

export interface ResultPayload { input: BirthInput; meta: BirthMeta }

const REQUEST = 'threeyear:request'
const PAYLOAD = 'threeyear:payload'

interface Poster { postMessage(data: unknown, origin: string): void }

/** The few window members used here, so tests can pass a fake. */
export interface WinLike {
  location: { origin: string; pathname: string }
  addEventListener(type: 'message', fn: (e: MessageEvent) => void): void
  removeEventListener(type: 'message', fn: (e: MessageEvent) => void): void
  open(url: string, target: string): unknown
  opener?: Poster | null
}

function newId(): string {
  return typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`
}

/** Input-tab side: opens result tabs and answers their requests. */
export function createResultHub(win: WinLike) {
  const payloads = new Map<string, ResultPayload>()
  const onMessage = (e: MessageEvent) => {
    if (e.origin !== win.location.origin) return
    const d = e.data as { type?: string; id?: string } | null
    if (d?.type !== REQUEST || !d.id) return
    const payload = payloads.get(d.id)
    if (!payload) return
    ;(e.source as Poster | null)?.postMessage({ type: PAYLOAD, id: d.id, payload }, win.location.origin)
  }
  win.addEventListener('message', onMessage)
  return {
    /** Opens a new tab with the result. Returns false when the browser blocked the tab. */
    open(payload: ResultPayload): boolean {
      const id = newId()
      payloads.set(id, payload) // registered first: the new tab asks right after it loads
      const tab = win.open(`${win.location.pathname}?view=result&id=${id}`, '_blank')
      if (!tab) { payloads.delete(id); return false }
      return true
    },
    stop() { win.removeEventListener('message', onMessage); payloads.clear() },
  }
}

/** Result-tab side: asks the opener for the payload. Resolves null when there is no opener, no answer, or a foreign origin. */
export function requestPayload(win: WinLike, id: string, timeoutMs = 3000): Promise<ResultPayload | null> {
  const opener = win.opener
  if (!opener || !id) return Promise.resolve(null)
  return new Promise((resolve) => {
    const onMessage = (e: MessageEvent) => {
      if (e.origin !== win.location.origin) return
      const d = e.data as { type?: string; id?: string; payload?: ResultPayload } | null
      if (d?.type === PAYLOAD && d.id === id && d.payload) finish(d.payload)
    }
    const timer = setTimeout(() => finish(null), timeoutMs)
    function finish(v: ResultPayload | null) { clearTimeout(timer); win.removeEventListener('message', onMessage); resolve(v) }
    win.addEventListener('message', onMessage)
    opener.postMessage({ type: REQUEST, id }, win.location.origin)
  })
}
