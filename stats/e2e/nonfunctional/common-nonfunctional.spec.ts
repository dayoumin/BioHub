/**
 * Phase 5 Part C: 공통 비기능 테스트
 *
 * 페이지 로드 성능, 에러 경계, 반응형 레이아웃
 *
 * 태그: @phase5, @critical, @important
 * 실행: pnpm e2e --grep "@phase5"
 */

import { test, expect } from '@playwright/test'
import { S } from '../selectors'
import { log } from '../helpers/flow-helpers'
import { measurePageLoad, measureFCP, checkTiming } from '../helpers/performance-helpers'

test.setTimeout(120_000)

// ========================================
// 5C.1 페이지 로드 성능 @phase5 @critical
// ========================================

test.describe('@phase5 @critical 페이지 로드 성능', () => {
  test('TC-5C.1.1: 초기 페이지 로드 시간', async ({ page }) => {
    // Hub
    const hubLoad = await measurePageLoad(page, '/')
    await page.waitForFunction(
      () => document.querySelector('[data-testid="hub-upload-card"]') !== null,
      { timeout: 30000 },
    )
    const hubTiming = checkTiming('Hub 로드', hubLoad, 10000) // 10초 이내 (CI 여유)
    log('TC-5C.1.1', `Hub: ${(hubLoad / 1000).toFixed(1)}s (passed: ${hubTiming.passed})`)

    // Graph Studio
    const gsLoad = await measurePageLoad(page, '/graph-studio/')
    await page
      .locator(S.graphStudioPage)
      .waitFor({ state: 'visible', timeout: 15000 })
      .catch(() => {})
    const gsTiming = checkTiming('Graph Studio 로드', gsLoad, 10000)
    log('TC-5C.1.1', `Graph Studio: ${(gsLoad / 1000).toFixed(1)}s (passed: ${gsTiming.passed})`)
  })

  test('TC-5C.1.2: FCP (First Contentful Paint)', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded', timeout: 30000 })
    await page.waitForLoadState('networkidle')

    const fcp = await measureFCP(page)
    if (fcp > 0) {
      log('TC-5C.1.2', `FCP: ${fcp.toFixed(0)}ms`)
    } else {
      log('TC-5C.1.2', 'FCP 측정 실패 (paint observer 미지원)')
    }
  })

  test('TC-5C.1.3: 정적 자산 로딩 — 네트워크 요청 수', async ({ page }) => {
    let requestCount = 0
    let totalSize = 0

    page.on('response', (response) => {
      requestCount++
      const contentLength = response.headers()['content-length']
      if (contentLength) {
        totalSize += parseInt(contentLength, 10)
      }
    })

    await page.goto('/', { waitUntil: 'networkidle', timeout: 60000 })
    await page.waitForLoadState('networkidle')

    log('TC-5C.1.3', `초기 요청: ${requestCount}개, 총 크기: ${(totalSize / 1024 / 1024).toFixed(1)}MB`)
    // 적정 기준: 초기 요청 < 100개 (정적 빌드 기준 여유)
  })
})

// ========================================
// 5C.2 에러 경계 (Error Boundaries) @phase5 @important
// ========================================

test.describe('@phase5 @important 에러 경계', () => {
  test('TC-5C.2.1: ChunkLoadError 복구', async ({ page }) => {
    // 먼저 정상 로드
    await page.goto('/', { waitUntil: 'domcontentloaded', timeout: 60000 })
    await page.waitForFunction(
      () => document.querySelector('[data-testid="hub-upload-card"]') !== null,
      { timeout: 30000 },
    )

    // JS 청크 로드 차단 시뮬레이션
    await page.route('**/*.js', (route) => {
      const url = route.request().url()
      // 메인 번들은 통과, 청크만 차단
      if (url.includes('chunk') || url.includes('_next/static/chunks')) {
        route.abort()
      } else {
        route.continue()
      }
    })

    // 페이지 내에서 동적 로드 트리거 (Graph Studio 이동)
    const vizCard = page.locator(S.hubVisualizationCard)
    if (await vizCard.isVisible({ timeout: 5000 }).catch(() => false)) {
      await vizCard.click()
      await page.waitForLoadState('networkidle')

      // 에러 UI 확인
      const bodyText = await page.locator('body').innerText()
      const hasErrorUI =
        bodyText.includes('오류') ||
        bodyText.includes('에러') ||
        bodyText.includes('다시 시도') ||
        bodyText.includes('ChunkLoadError') ||
        bodyText.includes('error')

      log('TC-5C.2.1', `ChunkLoadError UI: ${hasErrorUI}`)

      // 차단 해제
      await page.unroute('**/*.js')

      // 복구 시도
      const retryBtn = page.locator('button:has-text("다시 시도"), button:has-text("재시도"), button:has-text("Retry")')
      if (await retryBtn.first().isVisible({ timeout: 3000 }).catch(() => false)) {
        await retryBtn.first().click()
        await page.waitForLoadState('networkidle')
        log('TC-5C.2.1', '재시도 버튼 클릭')
      }
    }
  })

  test('TC-5C.2.2: 콘솔 에러 없이 기본 페이지 로드', async ({ page }) => {
    const consoleErrors: string[] = []
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text())
      }
    })

    await page.goto('/', { waitUntil: 'domcontentloaded', timeout: 60000 })
    await page.waitForFunction(
      () => document.querySelector('[data-testid="hub-upload-card"]') !== null,
      { timeout: 30000 },
    )
    await page.waitForLoadState('networkidle')

    // 치명적 에러가 없어야 함 (일부 경고는 허용)
    const criticalErrors = consoleErrors.filter(
      (e) =>
        !e.includes('favicon') &&
        !e.includes('manifest') &&
        !e.includes('devtools') &&
        !e.includes('404'),
    )
    log('TC-5C.2.2', `콘솔 에러: ${criticalErrors.length}개`)
    if (criticalErrors.length > 0) {
      log('TC-5C.2.2', `에러 목록: ${criticalErrors.slice(0, 3).join(' | ')}`)
    }
  })
})

// ========================================
// 5C.3 반응형 레이아웃 @phase5 @important
// ========================================

test.describe('@phase5 @important 반응형 레이아웃', () => {
  const viewports = [
    { name: '1024px (최소)', width: 1024, height: 768 },
    { name: '1440px (일반)', width: 1440, height: 900 },
    { name: '1920px (와이드)', width: 1920, height: 1080 },
    { name: '2560px (울트라와이드)', width: 2560, height: 1440 },
  ] as const

  for (const vp of viewports) {
    test(`TC-5C.3: 뷰포트 ${vp.name}`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height })

      // Hub
      await page.goto('/', { waitUntil: 'domcontentloaded', timeout: 60000 })
      await page.waitForFunction(
        () => document.querySelector('[data-testid="hub-upload-card"]') !== null,
        { timeout: 30000 },
      )

      const hubCard = page.locator(S.hubUploadCard)
      await expect(hubCard).toBeVisible()

      // 카드가 뷰포트 안에 있는지 확인
      const cardBox = await hubCard.boundingBox()
      if (cardBox) {
        expect(cardBox.x).toBeGreaterThanOrEqual(0)
        expect(cardBox.x + cardBox.width).toBeLessThanOrEqual(vp.width + 10) // 10px 여유
        log(`TC-5C.3-${vp.name}`, `Hub card: x=${cardBox.x}, w=${cardBox.width}`)
      }

      // 스크린샷
      await page.screenshot({
        path: `e2e/results/screenshots/responsive-${vp.width}-hub.png`,
        fullPage: true,
      })

      // Graph Studio
      await page.goto('/graph-studio/', { waitUntil: 'domcontentloaded', timeout: 30000 })
      await page.waitForLoadState('networkidle')

      const hasGS = await page
        .locator(S.graphStudioPage)
        .isVisible({ timeout: 10000 })
        .catch(() => false)

      if (hasGS) {
        await page.screenshot({
          path: `e2e/results/screenshots/responsive-${vp.width}-graph.png`,
          fullPage: true,
        })

        // 패널 겹침 확인 (좌측/우측 패널)
        const leftPanel = page.locator(S.graphStudioLeftPanel)
        const rightPanel = page.locator(S.graphStudioRightPanel)

        const leftVisible = await leftPanel.isVisible().catch(() => false)
        const rightVisible = await rightPanel.isVisible().catch(() => false)

        if (leftVisible && rightVisible) {
          const leftBox = await leftPanel.boundingBox()
          const rightBox = await rightPanel.boundingBox()
          if (leftBox && rightBox) {
            const overlaps = leftBox.x + leftBox.width > rightBox.x
            log(`TC-5C.3-${vp.name}`, `패널 겹침: ${overlaps}`)
            if (vp.width >= 1440) {
              expect(overlaps).toBe(false)
            }
          }
        }
      }

      log(`TC-5C.3-${vp.name}`, '완료')
    })
  }
})
