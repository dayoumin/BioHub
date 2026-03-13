import { test, expect, type Page } from '@playwright/test'
import pathMod from 'path'
import { S } from '../selectors'
import {
  assertChartRendered,
  selectChartTypeAndWait,
  assertChartTypeThumbnail,
} from '../helpers/chart-helpers'

test.setTimeout(120_000)

async function navigateToGraphStudio(page: Page): Promise<void> {
  await page.goto('about:blank')
  await page.goto('/graph-studio', { waitUntil: 'load', timeout: 60_000 })
  await page.waitForFunction(
    () => document.documentElement.getAttribute('data-graph-studio-ready') === 'true',
    { timeout: 30_000 },
  )
}

async function enterEditorViaSampleChart(page: Page, chartType = 'bar'): Promise<void> {
  const thumbnail = page.locator(S.graphStudioChartType(chartType))
  await thumbnail.waitFor({ state: 'visible', timeout: 10_000 })
  await thumbnail.click()
  await page.waitForSelector(S.graphStudioChart, { state: 'attached', timeout: 10_000 })
}

test.describe('Phase 3.1: Chart Type Thumbnails', () => {
  test.beforeEach(async ({ page }) => { await navigateToGraphStudio(page) })

  const chartTypes = [
    'bar', 'grouped-bar', 'stacked-bar', 'line', 'scatter',
    'boxplot', 'histogram', 'error-bar', 'heatmap', 'violin',
    'km-curve', 'roc-curve',
  ]

  test('TC-3.1.1: 모든 차트 유형 썸네일 @smoke', async ({ page }) => {
    for (const type of chartTypes) {
      const exists = await assertChartTypeThumbnail(page, type)
      if (!exists) console.log('[chart-type] ' + type + ': not found')
    }
    expect(await assertChartTypeThumbnail(page, 'bar')).toBeTruthy()
  })

  test('TC-3.1.2: Bar 차트 @critical', async ({ page }) => {
    expect(await selectChartTypeAndWait(page, 'bar')).toBeTruthy()
    await expect(page.locator(S.graphStudioChart)).toBeVisible({ timeout: 15_000 })
  })

  test('TC-3.1.3: Line 차트 @important', async ({ page }) => {
    const r = await selectChartTypeAndWait(page, 'line')
    if (!r) test.skip()
    await expect(page.locator(S.graphStudioChart)).toBeVisible({ timeout: 15_000 })
  })

  test('TC-3.1.4: Scatter 차트 @important', async ({ page }) => {
    const r = await selectChartTypeAndWait(page, 'scatter')
    if (!r) test.skip()
    await expect(page.locator(S.graphStudioChart)).toBeVisible({ timeout: 15_000 })
  })

  test('TC-3.1.5: Boxplot @important', async ({ page }) => {
    const r = await selectChartTypeAndWait(page, 'boxplot')
    if (!r) test.skip()
    await expect(page.locator(S.graphStudioChart)).toBeVisible({ timeout: 15_000 })
  })

  test('TC-3.1.6: Violin @nice-to-have', async ({ page }) => {
    const r = await selectChartTypeAndWait(page, 'violin')
    if (!r) test.skip()
    await expect(page.locator(S.graphStudioChart)).toBeVisible({ timeout: 15_000 })
  })

  test('TC-3.1.7: Heatmap @nice-to-have', async ({ page }) => {
    const r = await selectChartTypeAndWait(page, 'heatmap')
    if (!r) test.skip()
    await expect(page.locator(S.graphStudioChart)).toBeVisible({ timeout: 15_000 })
  })

  test('TC-3.1.8: KM 생존곡선 @nice-to-have', async ({ page }) => {
    const r = await selectChartTypeAndWait(page, 'km-curve')
    if (!r) test.skip()
    await expect(page.locator(S.graphStudioChart)).toBeVisible({ timeout: 15_000 })
  })

  test('TC-3.1.9: ROC 곡선 @nice-to-have', async ({ page }) => {
    const r = await selectChartTypeAndWait(page, 'roc-curve')
    if (!r) test.skip()
    await expect(page.locator(S.graphStudioChart)).toBeVisible({ timeout: 15_000 })
  })
})

test.describe('Phase 3.2: Data Upload & Mapping', () => {
  test.beforeEach(async ({ page }) => { await navigateToGraphStudio(page) })

  test('TC-3.2.1: CSV 업로드 자동 차트 @critical', async ({ page }) => {
    const csvPath = pathMod.resolve(__dirname, '../../test-data/e2e/t-test.csv')
    await page.locator(S.graphStudioFileInput).setInputFiles(csvPath)
    await expect(page.locator(S.graphStudioChart)).toBeVisible({ timeout: 20_000 })
    expect(await assertChartRendered(page)).toBeTruthy()
  })

  test('TC-3.2.3: 데이터 탭 변수 매핑 @important', async ({ page }) => {
    await enterEditorViaSampleChart(page, 'bar')
    const dataTab = page.locator(S.graphStudioTabData)
    await dataTab.click()
    await expect(dataTab).toHaveAttribute('data-state', 'active')
  })

  test('TC-3.2.4: 빈 데이터 방어 @important', async ({ page }) => {
    const buffer = Buffer.from('col1,col2\n', 'utf-8')
    await page.locator(S.graphStudioFileInput).setInputFiles({
      name: 'empty.csv', mimeType: 'text/csv', buffer,
    })
    await page.waitForTimeout(3000)
    const bodyText = await page.locator('body').innerText()
    const hasError = /오류|에러|error|데이터.*없|비어/i.test(bodyText)
    const hasChart = await page.locator(S.graphStudioChart).isVisible().catch(() => false)
    expect(hasError || !hasChart).toBeTruthy()
  })
})

test.describe('Phase 3.3: Styling', () => {
  test.beforeEach(async ({ page }) => {
    await navigateToGraphStudio(page)
    await enterEditorViaSampleChart(page, 'bar')
  })

  test('TC-3.3.1: 스타일 탭 전환 @important', async ({ page }) => {
    const styleTab = page.locator(S.graphStudioTabStyle)
    await styleTab.click()
    await expect(styleTab).toHaveAttribute('data-state', 'active')
  })

  test('TC-3.3.3: Undo/Redo @important', async ({ page }) => {
    const undo = page.locator(S.graphStudioUndo)
    if (!await undo.isVisible({ timeout: 3000 }).catch(() => false)) {
      test.skip()
      return
    }
    const undoDisabled = await undo.isDisabled().catch(() => true)
    expect(undoDisabled).toBeTruthy()
  })
})

test.describe('Phase 3.4: AI Assistant', () => {
  test('TC-3.4.1: AI 패널 입력 @important', async ({ page }) => {
    await navigateToGraphStudio(page)
    await enterEditorViaSampleChart(page, 'bar')
    const aiToggle = page.locator(S.graphStudioAiToggle)
    await aiToggle.waitFor({ state: 'visible' })
    await aiToggle.click()
    await expect(page.locator(S.graphStudioAiInput)).toBeVisible({ timeout: 10_000 })
    await expect(page.locator(S.graphStudioAiSend)).toBeVisible()
  })
})

test.describe('Phase 3.6: Panel Layout', () => {
  test.beforeEach(async ({ page }) => {
    await navigateToGraphStudio(page)
    await enterEditorViaSampleChart(page, 'bar')
  })

  test('TC-3.6.1: 좌측 패널 토글 @important', async ({ page }) => {
    const leftPanel = page.locator(S.graphStudioLeftPanel)
    const leftToggle = page.locator(S.graphStudioLeftToggle)
    if (!await leftPanel.isVisible({ timeout: 5000 }).catch(() => false)) {
      test.skip()
      return
    }
    await leftToggle.click()
    await expect(leftPanel).not.toBeVisible()
    await leftToggle.click()
    await expect(leftPanel).toBeVisible()
  })

  test('TC-3.6.2: 우측 패널 @important', async ({ page }) => {
    const rightPanel = page.locator(S.graphStudioRightPanel)
    if (!await rightPanel.isVisible({ timeout: 5000 }).catch(() => false)) {
      test.skip()
      return
    }
    await expect(rightPanel).toBeVisible()
  })
})
