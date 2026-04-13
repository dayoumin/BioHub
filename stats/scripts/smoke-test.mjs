/**
 * 2026-04-04 대규모 리팩터링 사후 Smoke Test
 * 2026-04-13 현재 진입점 기준으로 갱신:
 * - Analysis 중심 허브
 * - Bio-Tools / Graph Studio / Papers / Projects / Settings 핵심 진입 라우트
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

function hasText(body, ...keywords) {
  const lower = body.toLowerCase()
  return keywords.some((keyword) => lower.includes(keyword.toLowerCase()))
}

function isNotFound(body) {
  return hasText(body, '페이지를 찾을 수 없습니다', 'page not found', 'not found')
}

async function loadRoute(page, route) {
  const errors = []
  const handlePageError = (error) => errors.push(error.message)
  const handleConsole = (message) => {
    if (message.type() === 'error') {
      errors.push(message.text())
    }
  }

  page.on('pageerror', handlePageError)
  page.on('console', handleConsole)

  try {
    await page.goto(`${BASE}${route.path}`, { waitUntil: 'load', timeout: 60000 })
    await page.waitForTimeout(route.waitMs ?? 2500)

    const title = await page.title()
    const body = await page.textContent('body') ?? ''
    const containsExpected = hasText(`${title}\n${body}`, ...route.keywords)
    const pass = containsExpected && !isNotFound(body) && errors.length === 0
    const detail = [
      title ? `title=${title}` : '',
      errors.length > 0 ? `errors=${errors.slice(0, 2).join('; ')}` : '',
    ].filter(Boolean).join(' | ')

    log(route.name, pass, detail)
  } finally {
    page.off('pageerror', handlePageError)
    page.off('console', handleConsole)
  }
}

async function run() {
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })

  const routes = [
    {
      name: 'Analysis Hub loads',
      path: '/analysis/',
      keywords: ['biohub', '통계분석', 'analysis'],
      waitMs: 3000,
    },
    {
      name: 'Analysis Hub exposes core navigation',
      path: '/analysis/',
      keywords: ['bio-tools', 'graph studio', '자료 작성', 'biohub'],
      waitMs: 3000,
    },
    {
      name: 'Bio-Tools hub loads',
      path: '/bio-tools/',
      keywords: ['bio-tools', '생물학'],
    },
    {
      name: 'Graph Studio loads',
      path: '/graph-studio/',
      keywords: ['graph studio', '시각화'],
    },
    {
      name: 'Papers workspace loads',
      path: '/papers/',
      keywords: ['자료 작성', 'biohub', 'papers'],
    },
    {
      name: 'Projects workspace loads',
      path: '/projects/',
      keywords: ['프로젝트', 'project', 'biohub'],
    },
    {
      name: 'Settings loads',
      path: '/settings/',
      keywords: ['설정', 'settings', 'theme'],
    },
  ]

  for (const route of routes) {
    console.log(`\n=== ${route.name} ===`)
    await loadRoute(page, route)
  }

  await browser.close()

  console.log('\n' + '='.repeat(50))
  const passed = results.filter((result) => result.pass).length
  const total = results.length
  console.log(`결과: ${passed}/${total} 통과`)
  if (passed < total) {
    console.log('실패 항목:')
    results
      .filter((result) => !result.pass)
      .forEach((result) => console.log(`  ❌ ${result.name}: ${result.detail}`))
  }

  process.exit(passed === total ? 0 : 1)
}

run().catch((error) => {
  console.error('Fatal:', error.message)
  process.exit(2)
})
