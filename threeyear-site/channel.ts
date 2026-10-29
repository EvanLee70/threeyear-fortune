// Hands the birth input from the input tab to the result tab without storing anything.
// The input tab keeps the payloads in memory. The new tab asks its opener (same origin only) for its own payload by a
// random id. The id is the only thing in the address bar; no birth data goes into the URL, storage, cookies, or network.
//
// Rules this file keeps:
//  - the parent answers "missing" for an unknown id, so the child can tell "no data" from "no answer";
//  - a silent parent is retried with the same id, and a late answer is still accepted until the child stops listening;
//  - the parent forgets a payload when its result tab is closed, when the child asks to release it, or past MAX_KEPT.
import type { BirthInput } from '../src/engine/types.ts'
import type { BirthMeta } from './birth.ts'

export interface ResultPayload { input: BirthInput; meta: BirthMeta }

const REQUEST = 'threeyear:request'
const PAYLOAD = 'threeyear:payload'
const MISSING = 'threeyear:missing'
const RELEASE = 'threeyear:release'

/** How many payloads the input tab keeps at once; the oldest goes first. */
export const MAX_KEPT = 20
const SWEEP_MS = 2000

interface Poster { postMessage(data: unknown, origin: string): void; closed?: boolean }

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

/** Input-tab side: opens result tabs, answers their requests, and forgets data nobody can ask for any more. */
export function createResultHub(win: WinLike) {
  const kept = new Map<string, { payload: ResultPayload; tab: { closed?: boolean } | null }>()
  const onMessage = (e: MessageEvent) => {
    if (e.origin !== win.location.origin) return
    const d = e.data as { type?: string; id?: string } | null
    if (!d?.id) return
    if (d.type === RELEASE) { kept.delete(d.id); return }
    if (d.type !== REQUEST) return
    const entry = kept.get(d.id)
    const reply = e.source as Poster | null
    reply?.postMessage(entry ? { type: PAYLOAD, id: d.id, payload: entry.payload } : { type: MISSING, id: d.id }, win.location.origin)
  }
  win.addEventListener('message', onMessage)
  // Drop the data of result tabs that were closed.
  const sweep = setInterval(() => { for (const [id, v] of kept) if (v.tab?.closed) kept.delete(id) }, SWEEP_MS)

  return {
    /** Opens a new tab with the result. Returns false when the browser blocked the tab. */
    open(payload: ResultPayload): boolean {
      const id = newId()
      kept.set(id, { payload, tab: null }) // registered first: the new tab asks right after it loads
      const tab = win.open(`${win.location.pathname}?view=result&id=${id}`, '_blank') as { closed?: boolean } | null
      if (!tab) { kept.delete(id); return false }
      kept.get(id)!.tab = tab
      while (kept.size > MAX_KEPT) kept.delete(kept.keys().next().value as string)
      return true
    },
    size: () => kept.size,
    stop() { clearInterval(sweep); win.removeEventListener('message', onMessage); kept.clear() },
  }
}

export type PayloadResult =
  | { status: 'ok'; payload: ResultPayload }
  | { status: 'missing' } // the parent is gone, or it does not know this id
  | { status: 'timeout' } // the parent did not answer (yet); a late answer still arrives as 'ok'

export interface RequestOptions {
  /** gap between automatic requests */
  retryMs?: number
  /** after this long without any answer the result is 'timeout' */
  timeoutMs?: number
}

/**
 * Result-tab side. Asks the opener for the payload, repeats the request while it stays silent, and reports through
 * `onResult`. After a 'timeout' the listener stays on, so a late answer still arrives as 'ok'. Call stop() to leave.
 */
export function requestPayload(win: WinLike, id: string, onResult: (r: PayloadResult) => void, opts: RequestOptions = {}) {
  const retryMs = opts.retryMs ?? 2000
  const timeoutMs = opts.timeoutMs ?? 6000
  let done = false
  let retryTimer: ReturnType<typeof setInterval> | undefined
  let timeoutTimer: ReturnType<typeof setTimeout> | undefined

  const opener = win.opener
  const finish = (r: PayloadResult) => { if (done) return; done = true; stop(); onResult(r) }
  const onMessage = (e: MessageEvent) => {
    if (e.origin !== win.location.origin) return
    const d = e.data as { type?: string; id?: string; payload?: ResultPayload } | null
    if (d?.id !== id) return
    if (d.type === PAYLOAD && d.payload) finish({ status: 'ok', payload: d.payload })
    else if (d.type === MISSING) finish({ status: 'missing' })
  }
  function stop() {
    clearInterval(retryTimer); clearTimeout(timeoutTimer)
    win.removeEventListener('message', onMessage)
  }
  const send = () => { if (opener && !opener.closed) opener.postMessage({ type: REQUEST, id }, win.location.origin) }
  const armTimers = () => {
    clearInterval(retryTimer); clearTimeout(timeoutTimer)
    retryTimer = setInterval(send, retryMs)
    timeoutTimer = setTimeout(() => { clearInterval(retryTimer); onResult({ status: 'timeout' }) }, timeoutMs) // listener stays on
  }

  if (!opener || opener.closed || !id) { queueMicrotask(() => finish({ status: 'missing' })); return { retry() {}, stop } }
  win.addEventListener('message', onMessage)
  send()
  armTimers()
  return { retry() { if (!done) { send(); armTimers() } }, stop }
}

/** Result-tab side: tells the opener to forget this payload (used by the "결과 지우기" button). */
export function releasePayload(win: WinLike, id: string): void {
  if (win.opener && !win.opener.closed && id) win.opener.postMessage({ type: RELEASE, id }, win.location.origin)
}
