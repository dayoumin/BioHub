import { Page } from "@playwright/test"
import { S } from "../selectors"

const CHART_SELECTORS = [
  "canvas",
  ".js-plotly-plot",
  ".recharts-surface",
  '[data-testid="graph-studio-chart"]',
] as const

export async function assertChartRendered(page: Page): Promise<boolean> {
  for (const sel of CHART_SELECTORS) {
    if (await page.locator(sel).count() > 0) return true
  }
  return false
}

export async function waitForChart(page: Page, timeout = 15_000): Promise<boolean> {
  try {
    await page.waitForFunction(
      (selectors: string[]) => selectors.some((sel) => document.querySelector(sel) !== null),
      [...CHART_SELECTORS],
      { timeout },
    )
    return true
  } catch {
    return false
  }
}

export async function detectChartType(page: Page): Promise<"echarts" | "plotly" | "recharts" | "unknown"> {
  if (await page.locator(".js-plotly-plot").count() > 0) return "plotly"
  if (await page.locator(".recharts-surface").count() > 0) return "recharts"
  if (await page.locator("canvas").count() > 0) return "echarts"
  return "unknown"
}

export async function assertCanvasHasContent(page: Page): Promise<boolean> {
  const canvas = page.locator("canvas").first()
  if (await canvas.count() === 0) return false
  return page.evaluate(() => {
    const c = document.querySelector("canvas")
    if (!c) return false
    const ctx = c.getContext("2d")
    if (!ctx) return false
    const data = ctx.getImageData(0, 0, c.width, c.height).data
    for (let i = 3; i < data.length; i += 4) {
      if (data[i] > 0) return true
    }
    return false
  })
}

export async function hoverChartAndCheckTooltip(page: Page): Promise<boolean> {
  const chart = page.locator("canvas, .js-plotly-plot, .recharts-surface").first()
  if (await chart.count() === 0) return false
  const box = await chart.boundingBox()
  if (!box) return false
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
  await page.waitForTimeout(300)
  const tooltip = page.locator(".echarts-tooltip, .plotly-tooltip, .recharts-tooltip-wrapper")
  return tooltip.count().then(c => c > 0)
}

export async function captureChartScreenshot(page: Page, name: string): Promise<void> {
  const chart = page.locator('[data-testid="graph-studio-chart"], .js-plotly-plot, .recharts-wrapper, canvas').first()
  if (await chart.count() > 0) {
    await chart.screenshot({ path: `e2e/results/screenshots/charts/${name}.png` })
  }
}

export async function assertChartTypeThumbnail(page: Page, chartType: string): Promise<boolean> {
  const thumb = page.locator(S.graphStudioChartType(chartType))
  return thumb.isVisible({ timeout: 5000 }).catch(() => false)
}

export async function selectChartTypeAndWait(page: Page, chartType: string, timeout = 15_000): Promise<boolean> {
  const thumb = page.locator(S.graphStudioChartType(chartType))
  await thumb.waitFor({ state: "visible", timeout: 10_000 })
  await thumb.click()
  try {
    await page.waitForSelector(S.graphStudioChart, { state: "attached", timeout })
    return true
  } catch {
    return false
  }
}