// Scans the rendered result page for hanja that stand alone (not written as 한글(漢字)).
// Run: npm run build && node tests/e2e/hanja-scan.e2e.mjs      (E2E_URL=<site> for a live site)
import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { chromium } from 'playwright-core'

const CHROME = [process.env.CHROME_PATH, 'C:/Program Files/Google/Chrome/Application/chrome.exe', '/usr/bin/google-chrome', '/usr/bin/chromium'].find((p) => p && existsSync(p))
if (!CHROME) { console.error('No Chrome found. Set CHROME_PATH.'); process.exit(2) }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

let server = null
let base = process.env.E2E_URL
if (!base) {
  server = spawn('npx', ['vite', 'preview', '--port', '4191', '--strictPort'], { shell: true, stdio: 'ignore' })
  base = 'http://localhost:4191/'
  for (let i = 0; i < 40; i++) { try { if ((await fetch(base)).ok) break } catch { /* not up yet */ } await sleep(250) }
}

// A hanja run is fine when its Korean reading stands beside it: "한글(漢字)", or "한글(한글·漢字)" / "한글(漢字·6)".
const HANJA = /[\u3400-\u9FFF\uF900-\uFAFF]+/g
function bare(text) {
  const out = []
  for (const m of text.matchAll(HANJA)) {
    const before = text.slice(Math.max(0, m.index - 12), m.index)
    const after = text.slice(m.index + m[0].length, m.index + m[0].length + 3)
    const wrapped = (/[\uAC00-\uD7A3]\($/.test(before) && /^[)\u00B7]/.test(after)) || /\([\uAC00-\uD7A3]+\u00B7$/.test(before)
    if (!wrapped) out.push(`${before}[${m[0]}]${after}`)
  }
  return out
}

const CASES = [
  { y: '1990', m: '3', d: '14', h: '9', mi: '30', c: '0', gender: '남성' },
  { y: '1985', m: '11', d: '2', h: '23', mi: '10', c: '5', gender: '여성' },
  { y: '1972', m: '7', d: '30', h: '4', mi: '5', c: '2', gender: '남성', lunar: true },
  { y: '2001', m: '1', d: '9', h: '12', mi: '0', c: '1', gender: '여성', unknown: true },
]

const browser = await chromium.launch({ executablePath: CHROME, headless: true })
const context = await browser.newContext({ viewport: { width: 1280, height: 900 } })
const found = new Map() // finding -> where
const note = (where, list) => list.forEach((f) => { if (!found.has(f)) found.set(f, where) })

for (const [i, k] of CASES.entries()) {
  const parent = await context.newPage()
  await parent.goto(base)
  await parent.waitForSelector('form')
  if (k.lunar) await parent.locator('label:has-text("음력")').first().click()
  if (k.unknown) await parent.locator('label:has-text("태어난 시간을 몰라요")').click()
  await parent.selectOption('#y', k.y); await parent.selectOption('#m', k.m); await parent.selectOption('#d', k.d)
  if (!k.unknown) { await parent.selectOption('#h', k.h); await parent.selectOption('#mi', k.mi) }
  await parent.selectOption('#c', k.c)
  await parent.locator(`label:has-text("${k.gender}")`).first().click()
  const [tab] = await Promise.all([context.waitForEvent('page'), parent.locator('button:has-text("운세 보기")').click()])
  await tab.waitForSelector('[data-testid="birth-card"]', { timeout: 20000 })
  await sleep(500)
  // Pages with tabs/collapsed parts: collect every text node and every text-bearing attribute.
  const texts = await tab.evaluate(() => {
    const out = [document.title, document.body.textContent ?? '']
    for (const el of document.querySelectorAll('[aria-label],[title],[alt]')) out.push(el.getAttribute('aria-label') ?? '', el.getAttribute('title') ?? '', el.getAttribute('alt') ?? '')
    return out
  })
  note(`case ${i + 1}`, texts.flatMap(bare))
  await tab.close(); await parent.close()
}
await browser.close()
if (server) server.kill()

if (!found.size) { console.log('PASS  no bare hanja on the result page'); process.exit(0) }
console.log(`FAIL  ${found.size} bare hanja run(s):`)
for (const [f, where] of found) console.log(`  ${where}  ${f.replace(/\s+/g, ' ')}`)
process.exit(1)
