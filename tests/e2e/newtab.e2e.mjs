// End-to-end check of the new-tab flow in a separate headless Chrome (it never touches a window the user may be using).
// Run: npm run build && npm run e2e            (starts `vite preview` itself)
//      E2E_URL=https://threeyear-fortune.vercel.app npm run e2e   (against a live site)
import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { chromium } from 'playwright-core'

const CHROME = [
  process.env.CHROME_PATH,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
].find((p) => p && existsSync(p))
if (!CHROME) { console.error('No Chrome found. Set CHROME_PATH.'); process.exit(2) }

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
let server = null
let base = process.env.E2E_URL
if (!base) {
  const port = 4190
  server = spawn('npx', ['vite', 'preview', '--port', String(port), '--strictPort'], { shell: true, stdio: 'ignore' })
  base = `http://localhost:${port}/`
  for (let i = 0; i < 40; i++) { try { if ((await fetch(base)).ok) break } catch { /* not up yet */ } await sleep(250) }
}

const results = []
async function check(name, fn) {
  try { await fn(); results.push([name, 'PASS', '']) } catch (e) { results.push([name, 'FAIL', String(e.message).split('\n')[0]]) }
}
const assert = (cond, msg) => { if (!cond) throw new Error(msg) }

const browser = await chromium.launch({ executablePath: CHROME, headless: true })
const context = await browser.newContext({ viewport: { width: 1280, height: 900 } })
// Record every window.open call with its stack, so a surprise tab shows who asked for it.
await context.addInitScript(() => {
  window.__opens = []
  const open = window.open
  window.open = function (...a) { window.__opens.push(String(new Error().stack).split('\n').slice(1, 4).join(' | ')); return open.apply(this, a) }
})
const pages = []
context.on('page', (p) => pages.push(p))
const parent = await context.newPage()
await parent.goto(base)
await parent.waitForSelector('form')
pages.length = 0 // the parent itself is not a surprise tab
const opens = () => parent.evaluate(() => window.__opens.length)
const settle = () => sleep(250)

await check('first load opens nothing', async () => {
  await sleep(1500)
  assert(pages.length === 0 && (await opens()) === 0, `tabs=${pages.length} opens=${await opens()}`)
})

await check('changing any field opens nothing', async () => {
  for (const [sel, v] of [['#y', '1990'], ['#m', '3'], ['#d', '14'], ['#h', '9'], ['#mi', '30'], ['#c', '5']]) { await parent.selectOption(sel, v); await settle() }
  for (const label of ['음력', '양력', '여성', '남성']) { await parent.locator(`label:has-text("${label}")`).first().click(); await settle() }
  await parent.locator('label:has-text("태어난 시간을 몰라요")').click(); await settle()
  await parent.locator('label:has-text("태어난 시간을 몰라요")').click(); await settle()
  await parent.locator('label:has-text("음력")').first().click(); await parent.locator('label:has-text("윤달")').click(); await settle()
  await parent.locator('label:has-text("양력")').first().click(); await settle()
  assert(pages.length === 0 && (await opens()) === 0, `tabs=${pages.length} opens=${await opens()}`)
})

await check('Enter or Space on any field (not the button) opens nothing', async () => {
  const targets = ['input[name=calendar] >> nth=0', 'input[name=calendar] >> nth=1', 'input[name=gender] >> nth=0', 'input[name=gender] >> nth=1',
    'input[type=checkbox] >> nth=0', '#y', '#m', '#d', '#h', '#mi', '#c']
  for (const t of targets) {
    await parent.locator(t).focus()
    await parent.keyboard.press('Enter'); await settle()
    await parent.keyboard.press('Space'); await settle()
    assert(pages.length === 0, `a tab opened after Enter/Space on ${t}`)
  }
  assert((await opens()) === 0, `window.open called ${await opens()} times`)
})

// Space on a select leaves its dropdown open; start the next scenarios from a fresh form.
await parent.reload()
await parent.waitForSelector('form')
pages.length = 0

let child
await check('clicking 운세 보기 opens exactly one tab with the typed values', async () => {
  await parent.selectOption('#y', '1990'); await parent.selectOption('#m', '3'); await parent.selectOption('#d', '14')
  await parent.selectOption('#h', '9'); await parent.selectOption('#mi', '30')
  const [tab] = await Promise.all([context.waitForEvent('page'), parent.locator('button:has-text("운세 보기")').click()])
  child = tab
  await child.waitForSelector('[data-testid="birth-card"]', { timeout: 15000 })
  const header = await child.locator('[data-testid="header-line"]').textContent()
  assert(/1990\.03\.14/.test(header ?? ''), `header was "${header}"`)
  assert(pages.length === 1, `tabs=${pages.length}`)
  assert(!/id=.*(1990|03|14)/.test(child.url().replace(/[0-9a-f-]{36}/, '')), 'birth data in the address')
})

await check('nothing is stored, cookies stay empty, address has no birth data', async () => {
  for (const p of [parent, child]) {
    const s = await p.evaluate(() => [Object.keys(localStorage).length, Object.keys(sessionStorage).length, document.cookie.length])
    assert(s.join() === '0,0,0', `storage ${s}`)
  }
  assert(/^\?view=result&id=[\w-]+$/.test(new URL(child.url()).search), `search ${new URL(child.url()).search}`)
})

await check('reloading the result tab shows the result again', async () => {
  await child.reload()
  await child.waitForSelector('[data-testid="birth-card"]', { timeout: 15000 })
})

await check('a click made by a script (element.click) opens nothing', async () => {
  await parent.bringToFront()
  const before = pages.length
  await parent.evaluate(() => document.querySelector('button').click())
  await sleep(800)
  assert(pages.length === before, `a script click opened ${pages.length - before} tab(s)`)
})

await check('the button is a plain button, so native form submission has nothing to submit', async () => {
  const t = await parent.locator('button:has-text("운세 보기")').getAttribute('type')
  assert(t === 'button', `type="${t}"`)
})

await check('"결과 지우기" clears the tab and the parent forgets the data', async () => {
  const [tab] = await Promise.all([context.waitForEvent('page'), parent.locator('button:has-text("운세 보기")').click()])
  await tab.waitForSelector('[data-testid="birth-card"]', { timeout: 15000 })
  const id = new URL(tab.url()).searchParams.get('id')
  await tab.locator('[data-testid="clear-result"]').click()
  await tab.getByText('결과를 지웠습니다').waitFor({ timeout: 5000 })
  assert((await tab.locator('[data-testid="birth-card"]').count()) === 0, 'the result is still in the page')
  await sleep(300)
  const answer = await parent.evaluate((id) => new Promise((resolve) => {
    const on = (e) => { if (e.data && e.data.id === id && e.data.type !== 'threeyear:request') { window.removeEventListener('message', on); resolve(e.data.type) } } // skip our own request
    window.addEventListener('message', on)
    window.postMessage({ type: 'threeyear:request', id }, location.origin)
    setTimeout(() => resolve('no answer'), 1000)
  }), id)
  assert(answer === 'threeyear:missing', `the parent answered "${answer}"`)
  await tab.close()
})

await check('slow parent (8 s busy): the result tab still recovers', async () => {
  const busy = parent.evaluate(() => { const end = Date.now() + 8000; while (Date.now() < end) { /* block the main thread */ } })
  await child.reload()
  await busy
  await child.waitForSelector('[data-testid="birth-card"]', { timeout: 30000 })
})

await check('Enter on the button itself opens a second tab (explicit activation)', async () => {
  await parent.bringToFront()
  await parent.locator('button:has-text("운세 보기")').focus()
  const [tab] = await Promise.all([context.waitForEvent('page'), parent.keyboard.press('Enter')])
  await tab.waitForSelector('[data-testid="birth-card"]', { timeout: 15000 })
  await tab.close()
})

await check('result tab whose id is unknown says so quickly', async () => {
  const lone = await context.newPage()
  const t0 = Date.now()
  await lone.goto(`${base}?view=result&id=deadbeef12345`)
  await lone.getByText('입력 정보를 찾지 못했습니다').waitFor({ timeout: 8000 })
  assert(Date.now() - t0 < 5000, `took ${Date.now() - t0} ms`)
  await lone.close()
})

await check('parent closed: the result tab ends with a clear notice, not a spinner', async () => {
  const p2 = await context.newPage()
  await p2.goto(base); await p2.waitForSelector('form')
  const [t2] = await Promise.all([context.waitForEvent('page'), p2.locator('button:has-text("운세 보기")').click()])
  await t2.waitForSelector('[data-testid="birth-card"]', { timeout: 15000 })
  await p2.close()
  await t2.reload()
  await t2.getByText('입력 정보를 찾지 못했습니다').waitFor({ timeout: 10000 })
  await t2.close()
})

await check('closed result tab: the parent releases its data', async () => {
  const p3 = await context.newPage()
  await p3.goto(base); await p3.waitForSelector('form')
  const [t3] = await Promise.all([context.waitForEvent('page'), p3.locator('button:has-text("운세 보기")').click()])
  await t3.waitForSelector('[data-testid="birth-card"]', { timeout: 15000 })
  const id = new URL(t3.url()).searchParams.get('id')
  await t3.close()
  await sleep(7000)
  const answered = await p3.evaluate((id) => new Promise((resolve) => {
    const on = (e) => { if (e.data && e.data.type === 'threeyear:payload' && e.data.id === id) { window.removeEventListener('message', on); resolve(true) } }
    window.addEventListener('message', on)
    window.postMessage({ type: 'threeyear:request', id }, location.origin)
    setTimeout(() => resolve(false), 1000)
  }), id)
  assert(answered === false, 'the parent still holds the data of a closed result tab')
  await p3.close()
})

await browser.close()
if (server) server.kill()
const w = Math.max(...results.map((r) => r[0].length))
for (const [n, s, m] of results) console.log(`${s}  ${n.padEnd(w)}  ${m}`)
const failed = results.filter((r) => r[1] === 'FAIL').length
console.log(`\n${results.length - failed}/${results.length} passed against ${base}`)
process.exit(failed ? 1 : 0)
