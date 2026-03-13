import { test, expect } from '@playwright/test'
import { S } from './selectors'
import { navigateToUploadStep, uploadCSV, goToMethodSelection, selectMethodDirect, goToVariableSelection, log } from './helpers/flow-helpers'

test('debug: 변수 설정 UI 상태 확인', async ({ page }) => {
  await navigateToUploadStep(page)
  expect(await uploadCSV(page, 't-test.csv')).toBeTruthy()
  await expect(page.locator(S.dataProfileSummary)).toBeVisible({ timeout: 15000 })

  await goToMethodSelection(page)
  expect(await selectMethodDirect(page, '독립표본', /독립표본 t-검정/)).toBeTruthy()
  await goToVariableSelection(page)

  // 3초 대기 (렌더링 완료)
  await page.waitForTimeout(3000)

  // 1. UnifiedVariableSelector 존재 확인
  const unified = page.locator(S.unifiedVariableSelector)
  const hasUnified = await unified.isVisible().catch(() => false)
  log('debug', `unified-variable-selector: ${hasUnified}`)

  // 2. 슬롯 확인
  for (const slotId of ['dependent', 'factor', 'independent']) {
    const slot = page.locator(S.slot(slotId))
    const count = await slot.count()
    log('debug', `slot-${slotId}: count=${count}`)
  }

  // 3. pool 변수 확인
  for (const varName of ['group', 'value']) {
    const pool = page.locator(S.poolVar(varName))
    const count = await pool.count()
    log('debug', `pool-var-${varName}: count=${count}`)
  }

  // 4. chip 확인
  for (const varName of ['group', 'value']) {
    const chip = page.locator(S.chip(varName))
    const count = await chip.count()
    log('debug', `chip-${varName}: count=${count}`)
  }

  // 5. variable-selection-next 상태
  const nextBtn = page.locator(S.variableSelectionNext)
  const nextVisible = await nextBtn.isVisible().catch(() => false)
  const nextEnabled = await nextBtn.isEnabled().catch(() => false)
  log('debug', `variable-selection-next: visible=${nextVisible}, enabled=${nextEnabled}`)

  // 6. run-analysis-btn 상태
  const runBtn = page.locator(S.runAnalysisBtn)
  const runVisible = await runBtn.isVisible().catch(() => false)
  log('debug', `run-analysis-btn: visible=${runVisible}`)

  // 7. 스크린샷
  await page.screenshot({ path: 'e2e/results/screenshots/debug-vars.png', fullPage: true })

  // 8. 슬롯에 할당 안 된 경우: slot-factor 클릭 → pool-var-group 클릭 시도
  const chipGroup = page.locator(S.chip('group'))
  if ((await chipGroup.count()) === 0) {
    log('debug', 'group 미할당 — slot-factor 활성화 후 pool-var-group 클릭')
    const factorSlot = page.locator(S.slot('factor'))
    if ((await factorSlot.count()) > 0) {
      await factorSlot.click()
      await page.waitForTimeout(500)
      log('debug', 'slot-factor 클릭 완료')
    }
    const poolGroup = page.locator(S.poolVar('group'))
    if ((await poolGroup.count()) > 0) {
      await poolGroup.click({ force: true })
      await page.waitForTimeout(1000)
      log('debug', 'pool-var-group force 클릭 완료')
    }
    // 재확인
    const chipGroupAfter = page.locator(S.chip('group'))
    log('debug', `chip-group after click: count=${await chipGroupAfter.count()}`)
    const nextEnabledAfter = await nextBtn.isEnabled().catch(() => false)
    log('debug', `variable-selection-next after click: enabled=${nextEnabledAfter}`)
    await page.screenshot({ path: 'e2e/results/screenshots/debug-vars-after.png', fullPage: true })
  }
})
