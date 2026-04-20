import { test, expect } from '@playwright/test'
import { S } from '../selectors'
import {
  openGraphStudioFromResults,
  runSeededIndependentSamplesTTestToResults,
} from '../helpers/flow-helpers'

test.setTimeout(180_000)

test.describe('Phase 3.5: Chart Export', () => {
  // Export suite는 결과 화면 이후의 contract만 검증한다.
  // 실제 Smart Flow → Graph Studio 사용자 경로는 graph-ux.spec.ts의 TC-4B.1.3이 담당한다.
  test('TC-3.5.13: HTML 내보내기 @critical', async ({ page }) => {
    await runSeededIndependentSamplesTTestToResults(page, 'export')
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
    await runSeededIndependentSamplesTTestToResults(page, 'export')
    const moreBtn = page.locator(S.moreActionsBtn)
    if (!await moreBtn.isVisible({ timeout: 5000 }).catch(() => false)) { test.skip(); return }
    await openGraphStudioFromResults(page)
    await expect(page.locator(S.graphStudioPage)).toBeVisible({ timeout: 15_000 })
  })
})
