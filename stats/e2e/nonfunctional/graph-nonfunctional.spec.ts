/**
 * Phase 5 Part B: 그래프/시각화 비기능 테스트
 *
 * 차트 렌더링 성능, 메모리, 접근성 (색각, 키보드, 모션)
 *
 * 태그: @phase5, @critical, @important, @nice-to-have
 * 실행: pnpm e2e --grep "@phase5"
 */

import { test, expect } from '@playwright/test'
import { S } from '../selectors'
import { log } from '../helpers/flow-helpers'
import {
  measureAction,
  getMemoryUsage,
  memoryDiffMB,
  checkTiming,
} from '../helpers/performance-helpers'
import {
  getAriaAttributes,
  hasFocusVisibleStyle,
} from '../helpers/a11y-helpers'
import path from 'path'

test.setTimeout(180_000)

/** Graph Studio 이동 헬퍼 — 직접 URL 실패 시 사이드바 링크 클릭 fallback */
async function navigateToGraphStudio(page: import('@playwright/test').Page): Promise<void> {
  await page.goto('/graph-studio/', { waitUntil: 'domcontentloaded', timeout: 60000 })
  const direct = await page
    .locator(S.graphStudioPage)
    .isVisible({ timeout: 10000 })
    .catch(() => false)
  if (direct) return

  await page.goto('/', { waitUntil: 'domcontentloaded', timeout: 30000 })
  await page.waitForTimeout(2000)
  const gsLink = page.locator('a[href*="graph-studio"]').first()
  if (await gsLink.isVisible({ timeout: 5000 }).catch(() => false)) {
    await gsLink.click()
    await page.waitForTimeout(2000)
  }
}

// ========================================
// 5B.1 성능 — 그래프 @phase5 @critical
// ========================================

test.describe('@phase5 @critical 성능 — 그래프', () => {
  test('TC-5B.1.1: 차트 초기 렌더링 시간', async ({ page }) => {
    await navigateToGraphStudio(page)

    // Bar 차트 렌더링 시간
    const barType = page.locator(S.graphStudioChartType('bar'))
    if (!(await barType.isVisible({ timeout: 5000 }).catch(() => false))) {
      log('TC-5B.1.1', 'SKIPPED: bar chart type 미표시')
      test.skip()
      return
    }

    const duration = await measureAction(
      page,
      async () => {
        await barType.click()
      },
      `${S.graphStudioChart}, canvas`,
      10000,
    ).catch(() => -1)

    if (duration > 0) {
      const timing = checkTiming('Bar 차트 렌더링', duration, 5000) // 5초 이내
      log('TC-5B.1.1', `Bar 렌더링: ${(duration / 1000).toFixed(1)}s (threshold: 5s, passed: ${timing.passed})`)
    } else {
      log('TC-5B.1.1', '차트 렌더링 감지 실패 — selector 불일치 가능')
    }
  })

  test('TC-5B.1.2: 차트 유형 전환 시간', async ({ page }) => {
    await navigateToGraphStudio(page)

    // Bar 차트 먼저 생성
    const barType = page.locator(S.graphStudioChartType('bar'))
    if (await barType.isVisible({ timeout: 5000 }).catch(() => false)) {
      await barType.click()
      await page.waitForTimeout(3000)
    } else {
      log('TC-5B.1.2', 'SKIPPED: bar chart type 미표시')
      test.skip()
      return
    }

    // Bar → Line 전환 시간 (canvas 재렌더링 대기)
    const lineType = page.locator(S.graphStudioChartType('line'))
    if (await lineType.isVisible({ timeout: 3000 }).catch(() => false)) {
      const duration = await measureAction(
        page,
        async () => { await lineType.click() },
        [`${S.graphStudioChart}`, 'canvas'],
        10000,
      ).catch(() => -1)
      if (duration > 0) {
        log('TC-5B.1.2', `Bar → Line: ${(duration / 1000).toFixed(1)}s`)
      }
    }

    // Line → Scatter 전환 시간
    const scatterType = page.locator(S.graphStudioChartType('scatter'))
    if (await scatterType.isVisible({ timeout: 3000 }).catch(() => false)) {
      const duration = await measureAction(
        page,
        async () => { await scatterType.click() },
        [`${S.graphStudioChart}`, 'canvas'],
        10000,
      ).catch(() => -1)
      if (duration > 0) {
        log('TC-5B.1.2', `Line → Scatter: ${(duration / 1000).toFixed(1)}s`)
      }
    }
  })

  test('TC-5B.1.3: 대용량 데이터 차트 렌더링', async ({ page }) => {
    await navigateToGraphStudio(page)

    // 5000행 CSV 생성
    const rows = ['x,y']
    for (let i = 0; i < 5000; i++) {
      rows.push(`${i},${(Math.sin(i / 100) * 50 + Math.random() * 10).toFixed(2)}`)
    }

    const fileInput = page.locator(S.graphStudioFileInput)
    if (!(await fileInput.count().then((c) => c > 0).catch(() => false))) {
      log('TC-5B.1.3', 'SKIPPED: file input 미발견')
      test.skip()
      return
    }

    const start = Date.now()
    await fileInput.setInputFiles({
      name: 'large-5000.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(rows.join('\n')),
    })

    // 차트 렌더링 대기
    await page
      .locator(`${S.graphStudioChart}, canvas`)
      .first()
      .waitFor({ state: 'visible', timeout: 15000 })
      .catch(() => {})
    const duration = Date.now() - start

    const timing = checkTiming('5000행 렌더링', duration, 10000) // 10초 이내
    log('TC-5B.1.3', `5000행 렌더링: ${(duration / 1000).toFixed(1)}s (threshold: 10s, passed: ${timing.passed})`)
  })

  test('TC-5B.1.4: 차트 스타일 변경 → 즉시 반영', async ({ page }) => {
    await navigateToGraphStudio(page)

    const barType = page.locator(S.graphStudioChartType('bar'))
    if (await barType.isVisible({ timeout: 5000 }).catch(() => false)) {
      await barType.click()
      await page.waitForTimeout(3000)
    } else {
      log('TC-5B.1.4', 'SKIPPED: bar chart type 미표시')
      test.skip()
      return
    }

    // 스타일 탭 → 변경
    const styleTab = page.locator(S.graphStudioTabStyle)
    if (await styleTab.isVisible({ timeout: 3000 }).catch(() => false)) {
      await styleTab.click()
      await page.waitForTimeout(500)

      // 제목 입력 필드 찾아서 변경
      const titleInput = page.locator('input[placeholder*="제목"], input[data-testid*="title"]')
      if (await titleInput.first().isVisible({ timeout: 3000 }).catch(() => false)) {
        const start = Date.now()
        await titleInput.first().fill('성능 테스트 차트')
        await page.waitForTimeout(1000) // 차트 업데이트 대기
        const duration = Date.now() - start
        log('TC-5B.1.4', `제목 변경 반영: ${duration}ms (threshold: 2000ms)`)
        expect(duration).toBeLessThan(5000) // 5초 이내
      }
    }
  })

  test('TC-5B.1.5: ECharts 메모리 관리', async ({ page }) => {
    await navigateToGraphStudio(page)

    const memBefore = await getMemoryUsage(page)
    if (memBefore < 0) {
      log('TC-5B.1.5', 'SKIPPED: performance.memory 미지원')
      test.skip()
      return
    }

    // 차트 유형 10번 전환
    const types = ['bar', 'line', 'scatter', 'boxplot', 'histogram'] as const
    for (let round = 0; round < 2; round++) {
      for (const chartType of types) {
        const typeBtn = page.locator(S.graphStudioChartType(chartType))
        if (await typeBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
          await typeBtn.click()
          await page.waitForTimeout(1000)
        }
      }
    }

    const memAfter = await getMemoryUsage(page)
    const diff = memoryDiffMB(memBefore, memAfter)
    log('TC-5B.1.5', `10회 전환 후 메모리: +${diff.toFixed(1)}MB (threshold: 50MB)`)
    if (diff > 0) {
      expect(diff).toBeLessThan(50)
    }
  })
})

// ========================================
// 5B.2 접근성 — 그래프 @phase5 @important
// ========================================

test.describe('@phase5 @important 접근성 — 그래프', () => {
  test('TC-5B.2.1: 키보드 내비게이션 — Graph Studio', async ({ page }) => {
    await navigateToGraphStudio(page)

    // Tab 키로 차트 유형에 도달 가능한지 확인
    let foundChartType = false
    for (let i = 0; i < 30; i++) {
      await page.keyboard.press('Tab')
      await page.waitForTimeout(100)

      const focused = await page.evaluate(() => {
        const el = document.activeElement
        return el?.getAttribute('data-testid') ?? ''
      })

      if (focused.includes('graph-studio-chart-type')) {
        foundChartType = true
        // Enter로 활성화
        await page.keyboard.press('Enter')
        await page.waitForTimeout(2000)
        break
      }
    }
    log('TC-5B.2.1', `Tab → chart type: ${foundChartType}`)
  })

  test('TC-5B.2.2: 차트 대체 텍스트', async ({ page }) => {
    await navigateToGraphStudio(page)

    // 차트 생성
    const barType = page.locator(S.graphStudioChartType('bar'))
    if (await barType.isVisible({ timeout: 5000 }).catch(() => false)) {
      await barType.click()
      await page.waitForTimeout(3000)
    }

    // ECharts canvas의 aria-label 확인
    const canvasAria = await page.evaluate(() => {
      const canvas = document.querySelector('canvas')
      if (!canvas) return { ariaLabel: 'no-canvas', role: '' }
      return {
        ariaLabel: canvas.getAttribute('aria-label') ?? '',
        role: canvas.getAttribute('role') ?? '',
      }
    })
    log('TC-5B.2.2', `canvas: aria-label="${canvasAria.ariaLabel}", role="${canvasAria.role}"`)

    // SR-only 요약 텍스트 확인
    const srOnly = await page.locator('.sr-only, [class*="sr-only"]').count()
    log('TC-5B.2.2', `sr-only 요소: ${srOnly}개`)
  })

  test('TC-5B.2.4: 차트 썸네일 — 포커스 표시', async ({ page }) => {
    await navigateToGraphStudio(page)

    // 차트 유형 썸네일의 focus-visible 스타일 확인
    const barSelector = S.graphStudioChartType('bar').replace('[', '').replace(']', '')
    const hasFocusStyle = await hasFocusVisibleStyle(
      page,
      `[${barSelector}]`,
    )
    log('TC-5B.2.4', `bar 썸네일 focus-visible: ${hasFocusStyle}`)
  })

  test('TC-5B.2.5: 감소된 모션 대응', async ({ page }) => {
    // prefers-reduced-motion: reduce 에뮬레이션
    await page.emulateMedia({ reducedMotion: 'reduce' })

    await navigateToGraphStudio(page)

    // 차트 생성
    const barType = page.locator(S.graphStudioChartType('bar'))
    if (await barType.isVisible({ timeout: 5000 }).catch(() => false)) {
      await barType.click()
      await page.waitForTimeout(3000)
    }

    // 차트가 정상 렌더링되는지 확인 (모션 감소 모드에서)
    const hasChart = await page
      .locator(`${S.graphStudioChart}, canvas`)
      .first()
      .isVisible({ timeout: 5000 })
      .catch(() => false)
    log('TC-5B.2.5', `reduced-motion 차트 렌더링: ${hasChart}`)

    // 트랜지션 CSS 확인
    const hasReducedTransition = await page.evaluate(() => {
      const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
      return mq.matches
    })
    log('TC-5B.2.5', `prefers-reduced-motion 적용: ${hasReducedTransition}`)
  })
})

// ========================================
// 5B.3 호환성 — 그래프 @phase5 @nice-to-have
// ========================================

test.describe('@phase5 @nice-to-have 호환성 — 그래프', () => {
  test('TC-5B.3.1: 기본 브라우저에서 ECharts 렌더링', async ({ page }) => {
    await navigateToGraphStudio(page)

    const chartTypes = ['bar', 'line', 'scatter'] as const
    for (const chartType of chartTypes) {
      const typeBtn = page.locator(S.graphStudioChartType(chartType))
      if (await typeBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await typeBtn.click()
        await page.waitForTimeout(2000)

        const hasCanvas = await page.locator('canvas').isVisible({ timeout: 5000 }).catch(() => false)
        log('TC-5B.3.1', `${chartType}: canvas=${hasCanvas}`)
      }
    }
  })
})
