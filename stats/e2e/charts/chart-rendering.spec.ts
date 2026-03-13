import { test, expect, Page } from '@playwright/test'
import { S } from '../selectors'
import {
  navigateToUploadStep,
  uploadCSV,
  goToMethodSelection,
  selectMethodDirect,
  goToVariableSelection,
  ensureVariablesOrSkip,
  clickAnalysisRun,
  waitForResults,
  log,
} from '../helpers/flow-helpers'
import {
  waitForChart,
  detectChartType,
  captureChartScreenshot,
} from '../helpers/chart-helpers'
import { waitForAutoConfirm } from '../helpers/method-test-factory'

test.setTimeout(180_000)

async function runAndCheckChart(
  page: Page,
  csvFile: string,
  searchTerm: string,
  methodRegex: RegExp,
  tag: string,
  variableSetup?: (page: Page) => Promise<void>,
): Promise<void> {
  await navigateToUploadStep(page)
  expect(await uploadCSV(page, csvFile)).toBeTruthy()
  await expect(page.locator(S.dataProfileSummary)).toBeVisible({ timeout: 15_000 })

  await goToMethodSelection(page)
  const selected = await selectMethodDirect(page, searchTerm, methodRegex)
  if (!selected) { log(tag, 'method not found'); test.skip(); return }

  await goToVariableSelection(page)
  if (variableSetup) await variableSetup(page)
  else await ensureVariablesOrSkip(page, tag, 'group', 'value')

  await clickAnalysisRun(page)
  expect(await waitForResults(page, 120_000)).toBeTruthy()

  const hasChart = await waitForChart(page, 10_000)
  const chartType = await detectChartType(page)
  log(tag, 'chart=' + hasChart + ' type=' + chartType)
  if (hasChart) await captureChartScreenshot(page, tag + '-chart')
  expect(hasChart).toBeTruthy()
}

test.describe('Phase 3.5: Smart Flow Result Charts', () => {
  test('TC-3.5.1: t-검정 차트 @critical', async ({ page }) => {
    await runAndCheckChart(page, 't-test.csv', '독립표본', /독립표본 t-검정/, 'chart-ttest')
  })

  test('TC-3.5.2: ANOVA 차트 @critical', async ({ page }) => {
    await runAndCheckChart(page, 'anova.csv', '일원', /일원.*분산|one.*way.*anova/i, 'chart-anova')
  })

  test('TC-3.5.3: 상관 산점도 @critical', async ({ page }) => {
    await runAndCheckChart(page, 'correlation.csv', 'Pearson', /Pearson|피어슨/i, 'chart-corr', async (p) => {
      const runBtn = p.locator(S.runAnalysisBtn)
      await runBtn.waitFor({ state: 'visible', timeout: 15_000 })
      await p.waitForTimeout(500)
    })
  })

  test('TC-3.5.4: 회귀 잔차 플롯 @important', async ({ page }) => {
    await runAndCheckChart(page, 'regression.csv', '단순', /단순.*회귀|simple.*regression/i, 'chart-reg', async (p) => {
      await ensureVariablesOrSkip(p, 'chart-reg', 'study_hours', 'score')
    })
  })

  test('TC-3.5.5: 카이제곱 @important', async ({ page }) => {
    await runAndCheckChart(page, 'chi-square-v2.csv', '카이제곱 독립', /카이제곱 독립성/, 'chart-chi', async (p) => {
      await ensureVariablesOrSkip(p, 'chart-chi', 'gender', 'preference')
    })
  })

  test('TC-3.5.6: PCA Scree @important', async ({ page }) => {
    await runAndCheckChart(page, 'pca.csv', 'PCA', /PCA|주성분/i, 'chart-pca', async (p) => {
      await waitForAutoConfirm(p)
    })
  })

  test('TC-3.5.7: 생존곡선 @important', async ({ page }) => {
    await runAndCheckChart(page, 'survival.csv', 'Kaplan', /Kaplan.*Meier|카플란|생존분석/i, 'chart-km', async (p) => {
      await waitForAutoConfirm(p)
    })
  })

  test('TC-3.5.8: ROC 곡선 @important', async ({ page }) => {
    await runAndCheckChart(page, 'roc-diagnostic.csv', 'ROC', /ROC.*곡선|ROC.*curve|ROC/i, 'chart-roc', async (p) => {
      await waitForAutoConfirm(p)
    })
  })
})
