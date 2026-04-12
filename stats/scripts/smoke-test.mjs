/**
 * 2026-04-04 대규모 리팩터링 사후 Smoke Test
 * Usage: node scripts/smoke-test.mjs [port]
 */
import { chromium } from 'playwright'

const PORT = process.argv[2] || '3000'
const BASE = `http://127.0.0.1:${PORT}`
const results = []

function log(name, pass, detail = '') {
  const icon = pass ? '✅' : '❌'
  results.push({ name, pass, detail })
  console.log(`${icon} ${name}${detail ? ` — ${detail}` : ''}`)
}

/** Case-insensitive text check */
function hasText(body, ...keywords) {
  const lower = body.toLowerCase()
  return keywords.some(kw => lower.includes(kw.toLowerCase()))
}

async function run() {
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })

  // 1. Analysis Hub loads
  console.log('\n=== 1. Analysis Hub ===')
  await page.goto(`${BASE}/analysis`, { waitUntil: 'load', timeout: 60000 })
  await page.waitForTimeout(3000)
  const title = await page.title()
  log('Analysis Hub loads', title.length > 0, title)

  // 2. Browse All — descriptive 카테고리 존재 확인
  console.log('\n=== 2. Browse All — descriptive 카테고리 ===')
  // Try clicking browse/explore buttons
  const buttons = await page.getByRole('button').all()
  for (const btn of buttons) {
    const text = (await btn.textContent()).toLowerCase()
    if (text.includes('browse') || text.includes('전체') || text.includes('모든') || text.includes('explore')) {
      await btn.click()
      await page.waitForTimeout(2000)
      break
    }
  }
  const hubText = await page.textContent('body')
  log('Descriptive 카테고리 노출', hasText(hubText, '기술통계', 'descriptive', '기초통계'))
  log('Normality Test 노출', hasText(hubText, '정규성', 'normality'))

  // 3-9. Stats method pages
  const pages = [
    { name: 'Linear Regression', path: '/statistics/linear-regression', keywords: ['regression', '회귀', 'linear'] },
    { name: 'Independent T-Test', path: '/statistics/independent-t-test', keywords: ['t-test', 't 검정', 'independent'] },
    { name: 'ARIMA/Time Series', path: '/statistics/arima', keywords: ['arima', '시계열', 'time series'] },
    { name: 'Descriptive Statistics', path: '/statistics/descriptive', keywords: ['descriptive', '기술통계', '기초통계'] },
    { name: 'Chi-Square', path: '/statistics/chi-square-test', keywords: ['chi', '카이'] },
    { name: 'Pearson Correlation', path: '/statistics/pearson-correlation', keywords: ['correlation', '상관'] },
    { name: 'One-way ANOVA', path: '/statistics/one-way-anova', keywords: ['anova', '분산분석'] },
  ]

  for (let i = 0; i < pages.length; i++) {
    const p = pages[i]
    console.log(`\n=== ${i + 3}. ${p.name} 페이지 ===`)
    await page.goto(`${BASE}${p.path}`, { waitUntil: 'load', timeout: 60000 })
    await page.waitForTimeout(2000)
    const text = await page.textContent('body')
    log(`${p.name} 페이지 로드`, hasText(text, ...p.keywords))
  }

  // 10. Settings page
  console.log('\n=== 10. Settings 페이지 ===')
  await page.goto(`${BASE}/settings`, { waitUntil: 'load', timeout: 60000 })
  await page.waitForTimeout(1000)
  const settingsText = await page.textContent('body')
  log('Settings 페이지 로드', hasText(settingsText, '설정', 'settings', '테마', 'theme'))

  // 11. Console errors check on Analysis hub
  console.log('\n=== 11. 콘솔 에러 점검 ===')
  const errors = []
  page.on('pageerror', err => errors.push(err.message))
  await page.goto(`${BASE}/analysis`, { waitUntil: 'load', timeout: 60000 })
  await page.waitForTimeout(3000)
  log('Analysis Hub 콘솔 에러 없음', errors.length === 0, errors.length > 0 ? errors.slice(0, 3).join('; ') : '')

  await browser.close()

  // Summary
  console.log('\n' + '='.repeat(50))
  const passed = results.filter(r => r.pass).length
  const total = results.length
  console.log(`결과: ${passed}/${total} 통과`)
  if (passed < total) {
    console.log('실패 항목:')
    results.filter(r => !r.pass).forEach(r => console.log(`  ❌ ${r.name}: ${r.detail}`))
  }

  process.exit(passed === total ? 0 : 1)
}

run().catch(err => {
  console.error('Fatal:', err.message)
  process.exit(2)
})
