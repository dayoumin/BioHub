/**
 * Bio-Tools UX regression tests
 *
 * Focus:
 * - 허브 empty state의 No-Line rule 유지
 * - 빈 상태에서도 카테고리 탐색 가능
 */

import { test, expect } from '@playwright/test'
import { S } from '../selectors'

test.setTimeout(120_000)

test.describe('@phase4 @important Bio-Tools UX', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.removeItem('biohub:bio-tools:history')
      window.localStorage.removeItem('biohub-pinned-bio-tools')
    })
  })

  test('TC-4B.1.1: empty state uses tonal surface without border lines', async ({ page }) => {
    await page.goto('/bio-tools', { waitUntil: 'domcontentloaded', timeout: 60_000 })

    const emptyState = page.locator(S.bioToolsEmptyState)
    await expect(emptyState).toBeVisible({ timeout: 15_000 })
    await expect(emptyState).toContainText('고정하면 여기에서 바로 실행할 수 있습니다')

    const borderState = await emptyState.evaluate((element) => {
      const htmlElement = element as HTMLElement
      const styles = window.getComputedStyle(htmlElement)
      return {
        borderTopWidth: styles.borderTopWidth,
        borderRightWidth: styles.borderRightWidth,
        borderBottomWidth: styles.borderBottomWidth,
        borderLeftWidth: styles.borderLeftWidth,
        className: htmlElement.className,
      }
    })

    expect(borderState.borderTopWidth).toBe('0px')
    expect(borderState.borderRightWidth).toBe('0px')
    expect(borderState.borderBottomWidth).toBe('0px')
    expect(borderState.borderLeftWidth).toBe('0px')
    expect(borderState.className).not.toMatch(/\bborder(?:-[\w/]+)?\b/)
  })

  test('TC-4B.1.2: empty-state users can still expand a category and discover tools', async ({ page }) => {
    await page.goto('/bio-tools', { waitUntil: 'domcontentloaded', timeout: 60_000 })

    await expect(page.locator(S.bioToolsEmptyState)).toBeVisible({ timeout: 15_000 })

    const ecologyCategory = page.getByRole('button', { name: /군집생태/i })
    await expect(ecologyCategory).toBeVisible({ timeout: 10_000 })
    await ecologyCategory.click()

    await expect(page.getByText(/alpha diversity|베타 다양성|개체군/i).first()).toBeVisible({
      timeout: 10_000,
    })
  })
})
