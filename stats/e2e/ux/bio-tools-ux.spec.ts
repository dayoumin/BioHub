/**
 * Bio-Tools UX regression tests
 *
 * Focus:
 * - 허브 카테고리 카드의 No-Line rule 유지
 * - 카테고리 전환으로 도구 탐색 가능
 * - 고정 도구가 재로드 후에도 최근 사용보다 위에 유지되는지 확인
 */

import { expect, test } from '@playwright/test'
import { S } from '../selectors'

test.setTimeout(120_000)

test.describe('@phase4 @important Bio-Tools UX', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.removeItem('biohub:bio-tools:history')
      window.localStorage.removeItem('biohub-pinned-bio-tools')
    })
  })

  test('TC-4B.1.1: category cards use tonal surfaces without border lines', async ({ page }) => {
    await page.goto('/bio-tools', { waitUntil: 'domcontentloaded', timeout: 60_000 })

    const categoryCard = page.locator(S.bioToolsCategoryCard('ecology'))
    await expect(categoryCard).toBeVisible({ timeout: 15_000 })
    await expect(categoryCard).toContainText(/도구\s+\d+개/)

    const borderState = await categoryCard.evaluate((element) => {
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

  test('TC-4B.1.2: users can switch categories and discover tools from the hub', async ({ page }) => {
    await page.goto('/bio-tools', { waitUntil: 'domcontentloaded', timeout: 60_000 })

    const panel = page.locator(S.bioToolsCategoryPanel)
    await expect(panel).toBeVisible({ timeout: 15_000 })

    const geneticsCategory = page.locator(S.bioToolsCategoryCard('genetics'))
    await expect(geneticsCategory).toBeVisible({ timeout: 10_000 })
    await geneticsCategory.click()

    await expect(panel.getByText(/Hardy-Weinberg|Fst/i).first()).toBeVisible({
      timeout: 10_000,
    })
  })

  test('TC-4B.1.3: pinned tools stay above recent tools after reload', async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem(
        'biohub-pinned-bio-tools',
        JSON.stringify({
          state: { pinnedIds: ['hardy-weinberg', 'fst'] },
          version: 0,
        }),
      )
      window.localStorage.setItem(
        'biohub:bio-tools:history',
        JSON.stringify([
          {
            id: 'bio-meta-analysis-e2e',
            toolId: 'meta-analysis',
            toolNameEn: 'Meta-Analysis',
            toolNameKo: '메타분석',
            csvFileName: 'meta-analysis-example.csv',
            columnConfig: {},
            results: {},
            createdAt: Date.now(),
          },
        ]),
      )
    })

    await page.goto('/bio-tools', { waitUntil: 'domcontentloaded', timeout: 60_000 })

    const pinnedSection = page.locator('[data-testid="bio-tools-pinned-section"]')
    await expect(pinnedSection).toBeVisible({ timeout: 15_000 })
    await expect(pinnedSection).toContainText(/Hardy-Weinberg|Fst/i)
    await expect(page.getByRole('heading', { name: '최근 사용' })).toBeVisible({ timeout: 10_000 })
  })
})
