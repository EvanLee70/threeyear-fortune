import { afterEach, describe, expect, it, vi } from 'vitest'
import { createResultHub, requestPayload, type ResultPayload, type WinLike } from './channel.ts'
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
    open: vi.fn(() => ({})),
    opener: null,
    ...over,
  } as WinLike
  const deliver = (data: unknown, origin = ORIGIN, source: unknown = null) => fns.forEach((f) => f({ data, origin, source } as MessageEvent))
  return { win, deliver, count: () => fns.size }
}
const openedId = (win: WinLike) => new URL((win.open as ReturnType<typeof vi.fn>).mock.calls[0][0], ORIGIN).searchParams.get('id')!

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
  })

  it('answers a same-origin request with the matching payload only', () => {
    const { win, deliver } = fakeWin()
    const hub = createResultHub(win)
    hub.open(payload)
    const id = openedId(win)
    const reply = vi.fn()
    deliver({ type: 'threeyear:request', id }, ORIGIN, { postMessage: reply })
    expect(reply).toHaveBeenCalledWith({ type: 'threeyear:payload', id, payload }, ORIGIN)
  })

  it('ignores foreign origins, unknown ids, and other message types', () => {
    const { win, deliver } = fakeWin()
    const hub = createResultHub(win)
    hub.open(payload)
    const id = openedId(win)
    const reply = vi.fn()
    deliver({ type: 'threeyear:request', id }, 'https://evil.test', { postMessage: reply })
    deliver({ type: 'threeyear:request', id: 'nope' }, ORIGIN, { postMessage: reply })
    deliver({ type: 'other', id }, ORIGIN, { postMessage: reply })
    deliver(null, ORIGIN, { postMessage: reply })
    expect(reply).not.toHaveBeenCalled()
  })

  it('reports a blocked tab and forgets the payload', () => {
    const { win, deliver } = fakeWin({ open: vi.fn(() => null) })
    const hub = createResultHub(win)
    expect(hub.open(payload)).toBe(false)
    const reply = vi.fn()
    deliver({ type: 'threeyear:request', id: openedId(win) }, ORIGIN, { postMessage: reply })
    expect(reply).not.toHaveBeenCalled()
  })

  it('stop() removes the listener and clears memory', () => {
    const { win, count } = fakeWin()
    const hub = createResultHub(win)
    expect(count()).toBe(1)
    hub.stop()
    expect(count()).toBe(0)
  })
})

describe('requestPayload (result tab)', () => {
  it('resolves the payload the opener sends back', async () => {
    const opener = { postMessage: vi.fn() }
    const { win, deliver, count } = fakeWin({ opener })
    const p = requestPayload(win, 'abc123xyz')
    expect(opener.postMessage).toHaveBeenCalledWith({ type: 'threeyear:request', id: 'abc123xyz' }, ORIGIN)
    deliver({ type: 'threeyear:payload', id: 'abc123xyz', payload })
    await expect(p).resolves.toEqual(payload)
    expect(count()).toBe(0) // listener removed
  })

  it('ignores a reply from another origin or for another id, then times out with null', async () => {
    vi.useFakeTimers()
    const { win, deliver } = fakeWin({ opener: { postMessage: vi.fn() } })
    const p = requestPayload(win, 'abc123xyz', 1000)
    deliver({ type: 'threeyear:payload', id: 'abc123xyz', payload }, 'https://evil.test')
    deliver({ type: 'threeyear:payload', id: 'other', payload })
    vi.advanceTimersByTime(1001)
    await expect(p).resolves.toBeNull()
  })

  it('resolves null at once without an opener or without an id', async () => {
    await expect(requestPayload(fakeWin().win, 'abc')).resolves.toBeNull()
    await expect(requestPayload(fakeWin({ opener: { postMessage: vi.fn() } }).win, '')).resolves.toBeNull()
  })
})
