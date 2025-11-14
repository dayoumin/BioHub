/**
 * Pyodide Worker E2E 테스트 (Playwright)
 *
 * 목적: 실제 브라우저에서 Worker 초기화 및 helpers.py 등록 검증
 * 회귀 방지: handleInit에서 registerHelpersModule 호출 누락 감지
 */

import { test, expect } from '@playwright/test'

test.describe('Pyodide Worker 초기화 테스트', () => {
  test('handleInit이 helpers.py를 등록해야 함', async ({ page }) => {
    // Console 로그 수집
    const logs: string[] = []
    page.on('console', (msg) => {
      const text = msg.text()
      if (text.includes('[PyodideWorker]')) {
        logs.push(text)
      }
    })

    // Cluster Analysis 페이지 접속 (Worker 3 사용)
    await page.goto('http://localhost:3000/dashboard/statistics/cluster')

    // Worker 초기화 완료 대기 (최대 30초 - Pyodide 로드 시간 필요)
    await page.waitForTimeout(30000)

    // helpers.py 등록 확인
    const helpersRegistered = logs.some(log =>
      log.includes('helpers.py loaded and registered')
    )
    expect(helpersRegistered).toBe(true)

    // Worker 3 로드 확인
    const worker3Loaded = logs.some(log =>
      log.includes('Worker3') || log.includes('worker3')
    )
    expect(worker3Loaded).toBe(true)

    console.log('✅ Collected logs:', logs)
  })

  test('Worker 3가 statsmodels를 로드해야 함', async ({ page }) => {
    const logs: string[] = []
    page.on('console', (msg) => {
      const text = msg.text()
      if (text.includes('[PyodideWorker]')) {
        logs.push(text)
      }
    })

    await page.goto('http://localhost:3000/dashboard/statistics/cluster')
    await page.waitForTimeout(30000)

    // statsmodels 로드 확인
    const statsmodelsLoaded = logs.some(log =>
      log.includes('statsmodels') || log.includes('Additional packages loaded')
    )
    expect(statsmodelsLoaded).toBe(true)

    console.log('✅ Collected logs:', logs)
  })

  test('Worker 4가 statsmodels + scikit-learn을 로드해야 함', async ({ page }) => {
    const logs: string[] = []
    page.on('console', (msg) => {
      const text = msg.text()
      if (text.includes('[PyodideWorker]')) {
        logs.push(text)
      }
    })

    await page.goto('http://localhost:3000/dashboard/statistics/factor')
    await page.waitForTimeout(30000)

    // statsmodels + scikit-learn 로드 확인
    const packagesLoaded = logs.some(log =>
      log.includes('Additional packages loaded')
    )
    expect(packagesLoaded).toBe(true)

    console.log('✅ Collected logs:', logs)
  })

  test('Cluster Analysis가 에러 없이 실행되어야 함', async ({ page }) => {
    const errors: string[] = []
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text())
      }
    })

    await page.goto('http://localhost:3000/dashboard/statistics/cluster')
    await page.waitForTimeout(30000)

    // Python 에러 없음 확인
    const pythonErrors = errors.filter(err =>
      err.includes('ModuleNotFoundError') ||
      err.includes('ImportError') ||
      err.includes('helpers')
    )
    expect(pythonErrors).toHaveLength(0)

    if (errors.length > 0) {
      console.log('⚠️ Non-critical errors:', errors)
    }
  })
})

test.describe('회귀 방지 테스트', () => {
  test('helpers.py import가 성공해야 함', async ({ page }) => {
    const logs: string[] = []
    const errors: string[] = []

    page.on('console', (msg) => {
      const text = msg.text()
      if (text.includes('[PyodideWorker]')) {
        logs.push(text)
      }
      if (msg.type() === 'error') {
        errors.push(text)
      }
    })

    await page.goto('http://localhost:3000/dashboard/statistics/cluster')
    await page.waitForTimeout(30000)

    // helpers.py가 등록되지 않았다면 에러 발생
    const helpersError = errors.some(err =>
      err.includes('helpers') && err.includes('not found')
    )
    expect(helpersError).toBe(false)

    // helpers.py 등록 로그 확인
    const helpersRegistered = logs.some(log =>
      log.includes('helpers.py loaded and registered')
    )
    expect(helpersRegistered).toBe(true)
  })
})
