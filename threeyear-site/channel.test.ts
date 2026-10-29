import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createResultHub, MAX_KEPT, releasePayload, requestPayload, type PayloadResult, type ResultPayload, type WinLike } from './channel.ts'
import { resolveBirth } from './birth.ts'
import { KOREAN_CITIES } from '../src/engine/cities.ts'

const ORIGIN = 'https://site.test'
const r = resolveBirth({ calendar: 'solar', leap: false, year: 1985, month: 3, day: 14, hour: 9, minute: 30, unknownTime: false, gender: 'M', city: 0 }, KOREAN_CITIES[0])
if (!r.ok) throw new Error('fixture')
const payload: ResultPayload = { input: r.input, meta: r.meta }

type Fn = (e: MessageEvent) => void
/** A fake window: records listeners and lets a test deliver messages. */
function fakeWin(over: Partial<WinLike> = {}) {
  const fns = new Set<Fn>()
  const win = {
    location: { origin: ORIGIN, pathname: '/' },
    addEventListener: (_t: 'message', f: Fn) => { fns.add(f) },
    removeEventListener: (_t: 'message', f: Fn) => { fns.delete(f) },
    open: vi.fn(() => ({ closed: false })),
    opener: null,
    ...over,
  } as WinLike
  const deliver = (data: unknown, origin = ORIGIN, source: unknown = null) => fns.forEach((f) => f({ data, origin, source } as MessageEvent))
  return { win, deliver, count: () => fns.size }
}
const openedId = (win: WinLike, n = 0) => new URL((win.open as ReturnType<typeof vi.fn>).mock.calls[n][0], ORIGIN).searchParams.get('id')!
const ask = (deliver: ReturnType<typeof fakeWin>['deliver'], id: string) => { const reply = vi.fn(); deliver({ type: 'threeyear:request', id }, ORIGIN, { postMessage: reply }); return reply }

beforeEach(() => { vi.useFakeTimers() })
afterEach(() => { vi.useRealTimers() })

describe('result hub (input tab)', () => {
  it('opens a new tab whose address holds only a random id, never the birth data', () => {
    const { win } = fakeWin()
    const hub = createResultHub(win)
    expect(hub.open(payload)).toBe(true)
    const [url, target] = (win.open as ReturnType<typeof vi.fn>).mock.calls[0]
    expect(target).toBe('_blank')
    expect(url).toMatch(/^\/\?view=result&id=[\w-]{8,}$/)
    expect(String(url)).not.toMatch(/1985|서울|%/)
    hub.stop()
  })

  it('answers a same-origin request with the matching payload only', () => {
    const { win, deliver } = fakeWin()
    const hub = createResultHub(win)
    hub.open(payload)
    const id = openedId(win)
    expect(ask(deliver, id)).toHaveBeenCalledWith({ type: 'threeyear:payload', id, payload }, ORIGIN)
    hub.stop()
  })

  it('says "missing" for an unknown id, and ignores foreign origins and other message types', () => {
    const { win, deliver } = fakeWin()
    const hub = createResultHub(win)
    hub.open(payload)
    const id = openedId(win)
    expect(ask(deliver, 'nope')).toHaveBeenCalledWith({ type: 'threeyear:missing', id: 'nope' }, ORIGIN)
    const reply = vi.fn()
    deliver({ type: 'threeyear:request', id }, 'https://evil.test', { postMessage: reply })
    deliver({ type: 'other', id }, ORIGIN, { postMessage: reply })
    deliver(null, ORIGIN, { postMessage: reply })
    expect(reply).not.toHaveBeenCalled()
    hub.stop()
  })

  it('reports a blocked tab and forgets the payload', () => {
    const { win, deliver } = fakeWin({ open: vi.fn(() => null) })
    const hub = createResultHub(win)
    expect(hub.open(payload)).toBe(false)
    expect(hub.size()).toBe(0)
    expect(ask(deliver, openedId(win))).toHaveBeenCalledWith(expect.objectContaining({ type: 'threeyear:missing' }), ORIGIN)
    hub.stop()
  })

  it('forgets a payload when the result tab asks to release it', () => {
    const { win, deliver } = fakeWin()
    const hub = createResultHub(win)
    hub.open(payload)
    const id = openedId(win)
    deliver({ type: 'threeyear:release', id }, ORIGIN)
    expect(hub.size()).toBe(0)
    expect(ask(deliver, id)).toHaveBeenCalledWith({ type: 'threeyear:missing', id }, ORIGIN)
    hub.stop()
  })

  it('ignores a release from another origin', () => {
    const { win, deliver } = fakeWin()
    const hub = createResultHub(win)
    hub.open(payload)
    deliver({ type: 'threeyear:release', id: openedId(win) }, 'https://evil.test')
    expect(hub.size()).toBe(1)
    hub.stop()
  })

  it('forgets the payload of a result tab that was closed', () => {
    const tab = { closed: false }
    const { win } = fakeWin({ open: vi.fn(() => tab) })
    const hub = createResultHub(win)
    hub.open(payload)
    vi.advanceTimersByTime(5000)
    expect(hub.size()).toBe(1) // still open
    tab.closed = true
    vi.advanceTimersByTime(2100)
    expect(hub.size()).toBe(0)
    hub.stop()
  })

  it(`keeps at most ${MAX_KEPT} payloads; the oldest goes first`, () => {
    const { win, deliver } = fakeWin()
    const hub = createResultHub(win)
    for (let i = 0; i < MAX_KEPT + 5; i++) hub.open(payload)
    expect(hub.size()).toBe(MAX_KEPT)
    expect(ask(deliver, openedId(win, 0))).toHaveBeenCalledWith(expect.objectContaining({ type: 'threeyear:missing' }), ORIGIN)
    expect(ask(deliver, openedId(win, MAX_KEPT + 4))).toHaveBeenCalledWith(expect.objectContaining({ type: 'threeyear:payload' }), ORIGIN)
    hub.stop()
  })

  it('stop() removes the listener, the timer, and the memory', () => {
    const { win, count } = fakeWin()
    const hub = createResultHub(win)
    hub.open(payload)
    expect(count()).toBe(1)
    hub.stop()
    expect(count()).toBe(0)
    expect(hub.size()).toBe(0)
    expect(vi.getTimerCount()).toBe(0)
  })
})

describe('requestPayload (result tab)', () => {
  const setup = (over: Partial<WinLike> = {}) => {
    const opener = { postMessage: vi.fn(), closed: false }
    const w = fakeWin({ opener, ...over })
    const onResult = vi.fn<(r: PayloadResult) => void>()
    return { ...w, opener, onResult }
  }

  it('resolves the payload the opener sends back and then stops listening', () => {
    const { win, deliver, count, opener, onResult } = setup()
    requestPayload(win, 'abc123xyz', onResult)
    expect(opener.postMessage).toHaveBeenCalledWith({ type: 'threeyear:request', id: 'abc123xyz' }, ORIGIN)
    deliver({ type: 'threeyear:payload', id: 'abc123xyz', payload })
    expect(onResult).toHaveBeenCalledTimes(1)
    expect(onResult).toHaveBeenCalledWith({ status: 'ok', payload })
    expect(count()).toBe(0)
    expect(vi.getTimerCount()).toBe(0)
  })

  it('asks again with the same id while the parent stays silent', () => {
    const { win, opener, onResult } = setup()
    requestPayload(win, 'abc123xyz', onResult)
    vi.advanceTimersByTime(4100)
    expect(opener.postMessage.mock.calls.length).toBe(3) // at 0, 2 s, 4 s
    expect(opener.postMessage.mock.calls.every((c) => (c[0] as { id: string }).id === 'abc123xyz')).toBe(true)
    expect(onResult).not.toHaveBeenCalled()
  })

  it('times out after 6 s, and a late answer is still accepted (once)', () => {
    const { win, deliver, onResult } = setup()
    requestPayload(win, 'abc123xyz', onResult)
    vi.advanceTimersByTime(6100)
    expect(onResult).toHaveBeenCalledWith({ status: 'timeout' })
    vi.advanceTimersByTime(3000)
    deliver({ type: 'threeyear:payload', id: 'abc123xyz', payload }) // the parent was only slow
    expect(onResult).toHaveBeenLastCalledWith({ status: 'ok', payload })
    deliver({ type: 'threeyear:payload', id: 'abc123xyz', payload }) // a duplicate changes nothing
    expect(onResult).toHaveBeenCalledTimes(2)
  })

  it('retry() after a timeout asks again and a fresh answer arrives', () => {
    const { win, deliver, opener, onResult } = setup()
    const req = requestPayload(win, 'abc123xyz', onResult)
    vi.advanceTimersByTime(6100)
    const before = opener.postMessage.mock.calls.length
    req.retry()
    expect(opener.postMessage.mock.calls.length).toBe(before + 1)
    deliver({ type: 'threeyear:payload', id: 'abc123xyz', payload })
    expect(onResult).toHaveBeenLastCalledWith({ status: 'ok', payload })
  })

  it('"missing" from the parent is final at once: no retries, no later timeout', () => {
    const { win, deliver, opener, onResult } = setup()
    requestPayload(win, 'abc123xyz', onResult)
    deliver({ type: 'threeyear:missing', id: 'abc123xyz' })
    expect(onResult).toHaveBeenCalledWith({ status: 'missing' })
    vi.advanceTimersByTime(10000)
    expect(opener.postMessage).toHaveBeenCalledTimes(1)
    expect(onResult).toHaveBeenCalledTimes(1)
  })

  it('no opener, a closed opener, or an empty id is "missing" at once', async () => {
    for (const w of [fakeWin(), fakeWin({ opener: { postMessage: vi.fn(), closed: true } }), fakeWin({ opener: { postMessage: vi.fn() } })]) {
      const onResult = vi.fn()
      requestPayload(w.win, w.win.opener ? '' : 'abc', onResult)
      await Promise.resolve()
      expect(onResult).toHaveBeenCalledWith({ status: 'missing' })
    }
    const closed = fakeWin({ opener: { postMessage: vi.fn(), closed: true } })
    const onResult = vi.fn()
    requestPayload(closed.win, 'abc123xyz', onResult)
    await Promise.resolve()
    expect(onResult).toHaveBeenCalledWith({ status: 'missing' })
  })

  it('ignores a reply from another origin or for another id', () => {
    const { win, deliver, onResult } = setup()
    requestPayload(win, 'abc123xyz', onResult)
    deliver({ type: 'threeyear:payload', id: 'abc123xyz', payload }, 'https://evil.test')
    deliver({ type: 'threeyear:payload', id: 'other', payload })
    deliver({ type: 'threeyear:missing', id: 'other' })
    expect(onResult).not.toHaveBeenCalled()
  })

  it('stop() ends retries and ignores later answers', () => {
    const { win, deliver, opener, onResult, count } = setup()
    const req = requestPayload(win, 'abc123xyz', onResult)
    req.stop()
    vi.advanceTimersByTime(20000)
    deliver({ type: 'threeyear:payload', id: 'abc123xyz', payload })
    expect(opener.postMessage).toHaveBeenCalledTimes(1)
    expect(onResult).not.toHaveBeenCalled()
    expect(count()).toBe(0)
  })
})

describe('releasePayload', () => {
  it('tells the opener to forget the payload', () => {
    const opener = { postMessage: vi.fn(), closed: false }
    releasePayload(fakeWin({ opener }).win, 'abc123xyz')
    expect(opener.postMessage).toHaveBeenCalledWith({ type: 'threeyear:release', id: 'abc123xyz' }, ORIGIN)
  })

  it('does nothing without an opener, with a closed opener, or without an id', () => {
    const closed = { postMessage: vi.fn(), closed: true }
    const open = { postMessage: vi.fn(), closed: false }
    releasePayload(fakeWin().win, 'abc')
    releasePayload(fakeWin({ opener: closed }).win, 'abc')
    releasePayload(fakeWin({ opener: open }).win, '')
    expect(closed.postMessage).not.toHaveBeenCalled()
    expect(open.postMessage).not.toHaveBeenCalled()
  })
})
