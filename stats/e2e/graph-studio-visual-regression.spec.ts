import { test, expect, type Locator, type Page } from '@playwright/test'
import { S } from './selectors'

async function navigateToGraphStudio(page: Page): Promise<void> {
  await page.goto('/graph-studio/', { waitUntil: 'domcontentloaded', timeout: 60_000 })
  const direct = await page
    .locator(S.graphStudioPage)
    .isVisible({ timeout: 10_000 })
    .catch(() => false)
  if (!direct) {
    await page.goto('/', { waitUntil: 'domcontentloaded', timeout: 30_000 })
    await page.waitForLoadState('networkidle')
    const graphStudioLink = page.locator('a[href*="graph-studio"]').first()
    if (await graphStudioLink.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await graphStudioLink.click()
    }
  }
  await expect(page.locator(S.graphStudioPage)).toBeVisible({ timeout: 15_000 })
}

async function loadSampleData(page: Page): Promise<void> {
  const sampleBtn = page.locator(S.graphStudioSampleBtn)
  await sampleBtn.waitFor({ state: 'visible', timeout: 10_000 })
  await sampleBtn.click()
  await page.locator(S.graphStudioChartType('scatter')).waitFor({ state: 'visible', timeout: 10_000 })
}

async function createChart(page: Page, chartType = 'scatter'): Promise<void> {
  const typeBtn = page.locator(S.graphStudioChartType(chartType))
  await typeBtn.waitFor({ state: 'visible', timeout: 10_000 })
  await typeBtn.click()

  const createBtn = page.locator(S.graphStudioCreateBtn)
  await createBtn.waitFor({ state: 'visible', timeout: 5_000 })
  await createBtn.click()

  await page.waitForSelector(`${S.graphStudioChart} canvas`, { state: 'visible', timeout: 15_000 })
  await page.waitForTimeout(600)
}

async function ensureAccordionOpen(trigger: Locator): Promise<void> {
  const state = await trigger.getAttribute('data-state')
  if (state !== 'open') {
    await trigger.click()
  }
}

async function setChartTitle(page: Page, value: string): Promise<void> {
  const dataTab = page.locator(S.graphStudioTabData)
  await ensureAccordionOpen(dataTab)

  const input = page.locator(S.graphStudioChartTitleInput)
  await input.fill(value)
  await input.blur()
  await page.waitForTimeout(300)
}

async function setLegendOrient(page: Page, orient: 'top' | 'bottom'): Promise<void> {
  const styleTab = page.locator(S.graphStudioTabStyle)
  await ensureAccordionOpen(styleTab)

  const trigger = page.locator(S.graphStudioLegendOrientTrigger)
  await trigger.click()
  await page.locator(S.graphStudioLegendOrientOption(orient)).click()
  await page.waitForTimeout(400)
}

async function setTitleSize(page: Page, value: number): Promise<void> {
  const styleTab = page.locator(S.graphStudioTabStyle)
  await ensureAccordionOpen(styleTab)

  const input = page.locator(S.graphStudioTitleSizeInput)
  await input.fill(String(value))
  await input.blur()
  await page.waitForTimeout(400)
}

test.describe('Graph Studio visual regression', () => {
  const scenarios = [
    {
      name: 'top legend with default title size',
      snapshot: 'graph-studio-title-legend-top-default.png',
      title: 'Fish growth by species',
      legendOrient: 'top' as const,
      titleSize: 14,
      viewport: { width: 1600, height: 1000 },
    },
    {
      name: 'top legend with large title size',
      snapshot: 'graph-studio-title-legend-top-large.png',
      title: 'Fish growth relationship across species',
      legendOrient: 'top' as const,
      titleSize: 24,
      viewport: { width: 1600, height: 1000 },
    },
    {
      name: 'bottom legend with large title size',
      snapshot: 'graph-studio-title-legend-bottom-large.png',
      title: 'Fish growth relationship across species',
      legendOrient: 'bottom' as const,
      titleSize: 24,
      viewport: { width: 1600, height: 1000 },
    },
    {
      name: 'top legend with large title size on compact desktop viewport',
      snapshot: 'graph-studio-title-legend-top-large-compact.png',
      title: 'Fish growth relationship across species',
      legendOrient: 'top' as const,
      titleSize: 24,
      viewport: { width: 1280, height: 900 },
    },
  ] as const

  for (const scenario of scenarios) {
    test(scenario.name, async ({ page }) => {
      await page.setViewportSize(scenario.viewport)
      await navigateToGraphStudio(page)
      await loadSampleData(page)
      await createChart(page, 'scatter')
      await setChartTitle(page, scenario.title)
      await setTitleSize(page, scenario.titleSize)
      await setLegendOrient(page, scenario.legendOrient)

      const chart = page.locator(S.graphStudioChart)
      await expect(chart).toBeVisible()
      await expect(chart).toHaveScreenshot(scenario.snapshot, {
        animations: 'disabled',
        caret: 'hide',
        scale: 'css',
      })
    })
  }
})
