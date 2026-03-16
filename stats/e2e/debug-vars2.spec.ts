import { test, expect } from '@playwright/test'
import { S } from './selectors'
import { navigateToUploadStep, uploadCSV, goToMethodSelection, selectMethodDirect, goToVariableSelection, log } from './helpers/flow-helpers'

test('debug2: 메서드 ID + 슬롯 확인', async ({ page }) => {
  await navigateToUploadStep(page)
  expect(await uploadCSV(page, 't-test.csv')).toBe(true)
  await expect(page.locator(S.dataProfileSummary)).toBeVisible({ timeout: 15000 })
  await goToMethodSelection(page)
  expect(await selectMethodDirect(page, '독립표본', /독립표본 t-검정/)).toBe(true)
  await goToVariableSelection(page)
  await page.waitForTimeout(3000)

  // VariableSelectionStep의 진단 속성 확인
  const stepEl = page.locator('[data-testid="variable-selection-step"]')
  const methodId = await stepEl.getAttribute('data-method-id')
  const selectorType = await stepEl.getAttribute('data-selector-type')
  log('debug2', `method-id=${methodId}, selector-type=${selectorType}`)

  // 모든 data-testid 나열
  const testids = await page.evaluate(() => {
    const els = document.querySelectorAll('[data-testid]')
    return Array.from(els).map(el => el.getAttribute('data-testid')).filter(Boolean)
  })
  log('debug2', `testids: ${testids.join(', ')}`)

  // slot- 으로 시작하는 모든 testid
  const slotIds = testids.filter(id => id?.startsWith('slot-'))
  log('debug2', `slots: ${slotIds.join(', ')}`)

  // pool-var- 로 시작하는 모든 testid
  const poolVarIds = testids.filter(id => id?.startsWith('pool-var-'))
  log('debug2', `pool-vars: ${poolVarIds.join(', ')}`)

  // chip- 로 시작하는 모든 testid
  const chipIds = testids.filter(id => id?.startsWith('chip-'))
  log('debug2', `chips: ${chipIds.join(', ')}`)

  // 버튼 상태
  const nextBtn = page.locator('[data-testid="variable-selection-next"]')
  log('debug2', `next-btn visible=${await nextBtn.isVisible().catch(() => false)}, enabled=${await nextBtn.isEnabled().catch(() => false)}`)

  // 슬롯 클릭 → pool 클릭 시도 (independent 슬롯)
  const indepSlot = page.locator('[data-testid="slot-independent"]')
  if ((await indepSlot.count()) > 0) {
    await indepSlot.click()
    log('debug2', 'slot-independent 클릭')
    await page.waitForTimeout(500)
    
    const poolGroup = page.locator('[data-testid="pool-var-group"]')
    if ((await poolGroup.count()) > 0) {
      await poolGroup.click({ force: true })
      log('debug2', 'pool-var-group force 클릭')
      await page.waitForTimeout(1000)
    }
    
    // 재확인
    const chipIds2 = await page.evaluate(() => {
      const els = document.querySelectorAll('[data-testid^="chip-"]')
      return Array.from(els).map(el => el.getAttribute('data-testid'))
    })
    log('debug2', `chips after: ${chipIds2.join(', ')}`)
    log('debug2', `next-btn enabled=${await nextBtn.isEnabled().catch(() => false)}`)
  }

  await page.screenshot({ path: 'e2e/results/screenshots/debug-vars2.png', fullPage: true })
})
