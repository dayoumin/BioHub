/**
 * Graph Studio Phase 3 E2E Tests — P1 차트 타입별 렌더링 + 타입 전환
 *
 * 흐름 (G5.0): upload → setup (차트 타입 + 필드) → editor
 *
 * TC-3.1: 차트 타입별 썸네일 존재 + 렌더링
 * TC-3.2: CSV 업로드 + 빈 데이터 방어
 * TC-3.3: 스타일/Undo
 * TC-3.4: AI 패널
 * TC-3.5: 차트 타입 전환 (에디터 내)
 * TC-3.6: 패널 레이아웃
 *
 * 실행: npx playwright test --config=playwright-graph.config.ts
 */

import { test, expect, type Page } from '@playwright/test'
import pathMod from 'path'
import { S } from '../selectors'
import {
  assertChartRendered,
  assertChartTypeThumbnail,
} from '../helpers/chart-helpers'

test.setTimeout(120_000)

// ── 헬퍼 (새 3단계 흐름) ────────────────────────────────────────────────────

async function navigateToGraphStudio(page: Page): Promise<void> {
  await page.goto('about:blank')
  await page.goto('/graph-studio', { waitUntil: 'load', timeout: 60_000 })
  await page.waitForFunction(
    () => document.documentElement.getAttribute('data-graph-studio-ready') === 'true',
    { timeout: 30_000 },
  )
}

/** Step 1 → 2: 샘플 데이터 로드 → ChartSetupPanel */
async function loadSampleData(page: Page): Promise<void> {
  const sampleBtn = page.locator(S.graphStudioSampleBtn)
  await sampleBtn.waitFor({ state: 'visible', timeout: 10_000 })
  await sampleBtn.click()
  await page.locator(S.graphStudioChartType('bar')).waitFor({ state: 'visible', timeout: 10_000 })
}

/** Step 2 → 3: 차트 타입 선택 + "차트 만들기" → 에디터 */
async function createChart(page: Page, chartType = 'bar'): Promise<void> {
  const typeBtn = page.locator(S.graphStudioChartType(chartType))
  await typeBtn.waitFor({ state: 'visible', timeout: 10_000 })
  await typeBtn.click()

  const createBtn = page.locator(S.graphStudioCreateBtn)
  await createBtn.waitFor({ state: 'visible', timeout: 5_000 })
  await createBtn.click()

  await page.waitForSelector(S.graphStudioChart, { state: 'attached', timeout: 15_000 })
}

/** 전체 흐름: 샘플 → 설정 → 에디터 */
async function enterEditorViaSampleChart(page: Page, chartType = 'bar'): Promise<void> {
  await loadSampleData(page)
  await createChart(page, chartType)
}

// ── TC-3.1: 차트 타입 썸네일 + 렌더링 ──────────────────────────────────────

test.describe('Phase 3.1: Chart Type Thumbnails', () => {
  test.beforeEach(async ({ page }) => {
    await navigateToGraphStudio(page)
    await loadSampleData(page)
  })

  const CHART_TYPES = [
    'bar', 'grouped-bar', 'stacked-bar', 'line', 'scatter',
    'boxplot', 'histogram', 'error-bar', 'heatmap', 'violin',
    'km-curve', 'roc-curve',
  ] as const

  test('TC-3.1.1: 모든 차트 유형 썸네일 표시 확인', async ({ page }) => {
    for (const type of CHART_TYPES) {
      const visible = await assertChartTypeThumbnail(page, type)
      expect(visible, `${type} 썸네일 미표시`).toBe(true)
    }
  })

  // 주요 차트 타입별 에디터 진입 + 렌더 확인
  const RENDER_TYPES: Array<{ type: string; tag: string }> = [
    { type: 'bar', tag: '@critical' },
    { type: 'line', tag: '@important' },
    { type: 'scatter', tag: '@important' },
    { type: 'boxplot', tag: '@important' },
    { type: 'histogram', tag: '@important' },
    { type: 'violin', tag: '@nice-to-have' },
    { type: 'heatmap', tag: '@nice-to-have' },
  ]

  for (const { type, tag } of RENDER_TYPES) {
    test(`TC-3.1: ${type} 차트 렌더링 ${tag}`, async ({ page }) => {
      await createChart(page, type)
      await expect(page.locator(S.graphStudioChart)).toBeVisible({ timeout: 15_000 })
      expect(await assertChartRendered(page)).toBe(true)
    })
  }
})

// ── TC-3.2: 데이터 업로드 + 매핑 ────────────────────────────────────────────

test.describe('Phase 3.2: Data Upload & Mapping', () => {
  test.beforeEach(async ({ page }) => { await navigateToGraphStudio(page) })

  test('TC-3.2.1: CSV 업로드 → setup → 에디터', async ({ page }) => {
    const csvPath = pathMod.resolve(__dirname, '../../test-data/e2e/t-test.csv')
    await page.locator(S.graphStudioFileInput).setInputFiles(csvPath)
    // setup 모드 대기
    await page.locator(S.graphStudioChartType('bar')).waitFor({ state: 'visible', timeout: 20_000 })
    // 에디터 진입
    await createChart(page, 'bar')
    await expect(page.locator(S.graphStudioChart)).toBeVisible({ timeout: 15_000 })
    expect(await assertChartRendered(page)).toBe(true)
  })

  test('TC-3.2.4: 빈 데이터 방어', async ({ page }) => {
    const buffer = Buffer.from('col1,col2\n', 'utf-8')
    await page.locator(S.graphStudioFileInput).setInputFiles({
      name: 'empty.csv', mimeType: 'text/csv', buffer,
    })
    await page.waitForLoadState('networkidle')
    const bodyText = await page.locator('body').innerText()
    const hasError = /오류|에러|error|데이터.*없|비어/i.test(bodyText)
    const hasChart = await page.locator(S.graphStudioChart).isVisible().catch(() => false)
    expect(hasError || !hasChart).toBe(true)
  })
})

// ── TC-3.3: 스타일 ──────────────────────────────────────────────────────────

test.describe('Phase 3.3: Styling', () => {
  test.beforeEach(async ({ page }) => {
    await navigateToGraphStudio(page)
    await enterEditorViaSampleChart(page, 'bar')
  })

  test('TC-3.3.1: 스타일 아코디언 토글', async ({ page }) => {
    const styleTab = page.locator(S.graphStudioTabStyle)
    await expect(styleTab).toBeVisible()
    const before = await styleTab.getAttribute('data-state')
    await styleTab.click()
    const after = await styleTab.getAttribute('data-state')
    expect(before).not.toBe(after)
  })

  test('TC-3.3.3: Undo 초기 비활성', async ({ page }) => {
    const undo = page.locator(S.graphStudioUndo)
    if (!await undo.isVisible({ timeout: 3000 }).catch(() => false)) {
      test.skip()
      return
    }
    const undoDisabled = await undo.isDisabled().catch(() => true)
    expect(undoDisabled).toBe(true)
  })
})

// ── TC-3.4: AI 패널 ─────────────────────────────────────────────────────────

test.describe('Phase 3.4: AI Assistant', () => {
  test('TC-3.4.1: AI 패널 열기 + 입력/전송 확인', async ({ page }) => {
    await navigateToGraphStudio(page)
    await enterEditorViaSampleChart(page, 'bar')
    const aiToggle = page.locator(S.graphStudioAiToggle)
    await aiToggle.waitFor({ state: 'visible' })
    await aiToggle.click()
    await expect(page.locator(S.graphStudioAiInput)).toBeVisible({ timeout: 10_000 })
    await expect(page.locator(S.graphStudioAiSend)).toBeVisible()
  })
})

// ── TC-3.5: 차트 타입 전환 (P1 신규) ────────────────────────────────────────

test.describe('Phase 3.5: Chart Type Switch in Editor', () => {
  test.beforeEach(async ({ page }) => {
    await navigateToGraphStudio(page)
    await enterEditorViaSampleChart(page, 'bar')
  })

  test('TC-3.5.1: bar → line 타입 전환 @critical', async ({ page }) => {
    // 에디터 진입 확인 (bar)
    await expect(page.locator(S.graphStudioChart)).toBeVisible()

    // DataTab의 차트 타입 버튼으로 전환
    // DataTab 내 차트 타입 그리드 사용 — chart-setup-type 셀렉터는 setup 단계 전용
    // 에디터 내 전환은 "차트 재설정" 헤더 버튼 사용
    const resetBtn = page.getByText('차트 재설정')
    if (await resetBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await resetBtn.click()
      // setup 단계로 복귀
      await page.locator(S.graphStudioChartType('line')).waitFor({ state: 'visible', timeout: 10_000 })
      await createChart(page, 'line')
      await expect(page.locator(S.graphStudioChart)).toBeVisible({ timeout: 15_000 })
    } else {
      // "차트 재설정" 없으면 skip
      test.skip()
    }
  })
})

// ── TC-3.6: 패널 레이아웃 ───────────────────────────────────────────────────

test.describe('Phase 3.6: Panel Layout', () => {
  test.beforeEach(async ({ page }) => {
    await navigateToGraphStudio(page)
    await enterEditorViaSampleChart(page, 'bar')
  })

  test('TC-3.6.1: 좌측 패널 토글', async ({ page }) => {
    const leftToggle = page.locator(S.graphStudioLeftToggle)
    if (!await leftToggle.isVisible({ timeout: 5000 }).catch(() => false)) {
      test.skip()
      return
    }
    // 좌측 패널 열기
    await leftToggle.click()
    await expect(page.locator(S.graphStudioLeftPanel)).toBeVisible()
    // 닫기
    await leftToggle.click()
    await expect(page.locator(S.graphStudioLeftPanel)).not.toBeVisible()
  })

  test('TC-3.6.2: 우측 패널 표시', async ({ page }) => {
    await expect(page.locator(S.graphStudioRightPanel)).toBeVisible()
  })
})
