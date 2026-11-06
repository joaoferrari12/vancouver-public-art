// Accessibility and end-to-end check of the built site.
//
// Serves `dist/` with `vite preview`, walks the app in Chromium at phone and
// desktop widths (map page, filters, a detail page, the visited list, about),
// runs axe-core on every screen, checks for horizontal overflow and page
// errors, and fails on any of them. The City API and the map tiles are stubbed
// with the test fixtures so the check never depends on the network.
//
// Usage: npm run build && npm run a11y      (SHOTS=1 also saves screenshots to shots/)

import { readFile } from 'node:fs/promises'
import { spawn } from 'node:child_process'
import { chromium } from 'playwright'
import { AxeBuilder } from '@axe-core/playwright'

const PORT = 4173
const BASE = `http://localhost:${PORT}/vancouver-public-art/`
const SHOTS = Boolean(process.env.SHOTS)

const catalogue = await readFile(new URL('../tests/fixtures/art-list.json', import.meta.url), 'utf8')
const artwork = await readFile(new URL('../tests/fixtures/artwork-200.json', import.meta.url), 'utf8')
const artists = await readFile(new URL('../tests/fixtures/artists.json', import.meta.url), 'utf8')
// 1×1 light-grey PNG for every tile.
const TILE = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mPcvW37fwAGwgLrIY/cEwAAAABJRU5ErkJggg==', 'base64')

function startPreview() {
  const child = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--port', String(PORT), '--strictPort'], {
    stdio: ['ignore', 'pipe', 'inherit'],
  })
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('vite preview did not start in 20s')), 20000)
    child.stdout.on('data', d => {
      if (String(d).includes('localhost')) {
        clearTimeout(timer)
        resolve(child)
      }
    })
    child.on('exit', code => reject(new Error(`vite preview exited with ${code}`)))
  })
}

async function stub(page) {
  await page.route('https://opendata.vancouver.ca/**', route => {
    const url = route.request().url()
    const body = url.includes('/exports/json') ? catalogue : url.includes('public-art-artists') ? artists : artwork
    return route.fulfill({ status: 200, contentType: 'application/json', body })
  })
  await page.route('https://*.basemaps.cartocdn.com/**', route => route.fulfill({ status: 200, contentType: 'image/png', body: TILE }))
}

async function axe(page, label, report) {
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'best-practice']).analyze()
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)
  report.screens++
  if (results.violations.length) {
    report.violations.push({ label, violations: results.violations })
    for (const v of results.violations) {
      console.log(`✗ ${label}: ${v.id} (${v.impact}) — ${v.help}`)
      for (const n of v.nodes.slice(0, 3)) console.log(`    ${n.target.join(' ')}`)
    }
  }
  if (overflow) {
    report.overflow.push(label)
    console.log(`✗ ${label}: horizontal overflow`)
  }
  if (SHOTS) await page.screenshot({ path: `shots/${label.replace(/[^a-z0-9]+/gi, '-')}.png`, fullPage: false })
}

async function walk(browser, { width, height, label }, report) {
  const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1 })
  const page = await context.newPage()
  await stub(page)
  page.on('pageerror', e => report.errors.push(`${label}: ${e.message}`))

  await page.goto(BASE, { waitUntil: 'networkidle' })
  await page.getByRole('heading', { name: '478 artworks' }).waitFor()
  await page.locator('.leaflet-container canvas').first().waitFor()
  await axe(page, `${label} map`, report)

  await page.getByLabel('Kind', { exact: true }).selectOption('Mural')
  await page.getByLabel('Search').fill('mount')
  await page.getByRole('heading', { name: /artworks?$/ }).waitFor()
  await axe(page, `${label} filtered`, report)
  report.notes.push(`${label}: filtered URL ${new URL(page.url()).search}`)

  // Select a card from the keyboard: Tab to its locate button and press Space.
  const locate = page.getByRole('button', { name: /^Show .* on the map$/ }).first()
  await locate.focus()
  await page.keyboard.press('Space')
  await page.locator('.card.is-selected').waitFor()
  await axe(page, `${label} selected`, report)

  await page.getByRole('button', { name: 'All' }).click()
  await page.getByRole('heading', { name: /artworks$/ }).waitFor()
  await page.getByRole('button', { name: 'Clear filters' }).click()
  await page.getByRole('heading', { name: '478 artworks' }).waitFor()

  await page.goto(`${BASE}art/200`, { waitUntil: 'networkidle' })
  await page.getByRole('heading', { name: 'About the work' }).waitFor()
  await page.getByRole('heading', { level: 3 }).first().waitFor()
  await axe(page, `${label} detail`, report)
  await page.getByRole('button', { name: 'Mark as visited' }).click()
  await page.getByRole('button', { name: '✓ Visited' }).waitFor()

  await page.getByRole('link', { name: 'Visited' }).click()
  await page.getByRole('status').filter({ hasText: '1 of 751' }).waitFor()
  await axe(page, `${label} visited`, report)

  await page.getByRole('link', { name: 'About' }).click()
  await page.getByRole('heading', { name: 'About' }).waitFor()
  await axe(page, `${label} about`, report)

  await context.close()
}

const preview = await startPreview()
const browser = await chromium.launch()
const report = { screens: 0, violations: [], overflow: [], errors: [], notes: [] }
try {
  await walk(browser, { width: 375, height: 812, label: 'phone' }, report)
  await walk(browser, { width: 1280, height: 900, label: 'desktop' }, report)
} finally {
  await browser.close()
  preview.kill()
}

console.log(`\naxe-core: ${report.screens} screens checked, ${report.violations.length} with violations`)
console.log(`horizontal overflow: ${report.overflow.length} screens`)
console.log(`page errors: ${report.errors.length}`)
for (const n of report.notes) console.log(n)
if (report.violations.length || report.overflow.length || report.errors.length) {
  for (const e of report.errors) console.log(e)
  process.exit(1)
}
