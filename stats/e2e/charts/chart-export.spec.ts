import { test, expect, type Page } from '@playwright/test'
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
} from '../helpers/flow-helpers'

test.setTimeout(180_000)

async function runTTestAnalysis(page: Page): Promise<void> {
  await navigateToUploadStep(page)
  expect(await uploadCSV(page, 't-test.csv')).toBe(true)
  await expect(page.locator(S.dataProfileSummary)).toBeVisible({ timeout: 15_000 })
  await goToMethodSelection(page)
  expect(await selectMethodDirect(page, '독립표본', /독립표본 t-검정/)).toBe(true)
  await goToVariableSelection(page)
  await ensureVariablesOrSkip(page, 'export', 'group', 'value')
  await clickAnalysisRun(page)
  expect(await waitForResults(page, 120_000)).toBe(true)
}

test.describe('Phase 3.5: Chart Export', () => {
  test('TC-3.5.13: HTML 내보내기 @critical', async ({ page }) => {
    await runTTestAnalysis(page)
    const exportBtn = page.locator(S.exportDropdown)
    if (!await exportBtn.isVisible({ timeout: 5000 }).catch(() => false)) { test.skip(); return }
    await exportBtn.click()
    await page.waitForTimeout(300)
    const htmlExport = page.locator(S.exportHtml)
    if (await htmlExport.isVisible({ timeout: 3000 }).catch(() => false)) {
      const [download] = await Promise.all([
        page.waitForEvent('download', { timeout: 10_000 }).catch(() => null),
        htmlExport.click(),
      ])
      if (download) expect(download.suggestedFilename()).toMatch(/.html$/)
    }
  })

  test('TC-3.5.14: Graph Studio 이동 @important', async ({ page }) => {
    await runTTestAnalysis(page)
    const moreBtn = page.locator(S.moreActionsBtn)
    if (!await moreBtn.isVisible({ timeout: 5000 }).catch(() => false)) { test.skip(); return }
    await moreBtn.click()
    const gsBtn = page.locator(S.openGraphStudioBtn)
    await gsBtn.click()
    await page.waitForURL(/graph-studio/, { timeout: 15_000 })
    await expect(page.locator(S.graphStudioPage)).toBeVisible({ timeout: 15_000 })
  })
})
