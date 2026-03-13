/**
 * Accessibility (A11y) Verification Helpers for E2E Tests
 *
 * Phase 5 비기능 테스트용 접근성 검증 유틸리티.
 * - 키보드 내비게이션, ARIA 속성, 포커스 트랩 검증
 */

import { Page, Locator } from '@playwright/test'

/** ARIA 속성 결과 */
export interface AriaAttributes {
  role: string
  'aria-label': string
  'aria-live': string
  'aria-describedby': string
  'aria-hidden': string
}

/** 요소의 ARIA 속성 추출 */
export async function getAriaAttributes(
  page: Page,
  selector: string,
): Promise<AriaAttributes> {
  return page.evaluate((sel: string) => {
    const el = document.querySelector(sel)
    if (!el) {
      return {
        role: '',
        'aria-label': '',
        'aria-live': '',
        'aria-describedby': '',
        'aria-hidden': '',
      }
    }
    return {
      role: el.getAttribute('role') ?? '',
      'aria-label': el.getAttribute('aria-label') ?? '',
      'aria-live': el.getAttribute('aria-live') ?? '',
      'aria-describedby': el.getAttribute('aria-describedby') ?? '',
      'aria-hidden': el.getAttribute('aria-hidden') ?? '',
    }
  }, selector)
}

/** Tab 키로 포커스가 예상 순서대로 이동하는지 검증 */
export async function verifyTabOrder(
  page: Page,
  expectedSelectors: string[],
): Promise<{ passed: boolean; failedAt: number; actual: string }> {
  for (let i = 0; i < expectedSelectors.length; i++) {
    await page.keyboard.press('Tab')
    await page.waitForTimeout(100)

    const focused = await page.evaluate(() => {
      const el = document.activeElement
      if (!el) return 'none'
      const testId = el.getAttribute('data-testid')
      if (testId) return `[data-testid="${testId}"]`
      return el.tagName.toLowerCase() + (el.id ? `#${el.id}` : '')
    })

    const expected = expectedSelectors[i]
    const matches = await page.evaluate(
      ({ sel }: { sel: string }) => {
        const el = document.activeElement
        return el !== null && el.matches(sel)
      },
      { sel: expected },
    )

    if (!matches) {
      return { passed: false, failedAt: i, actual: focused }
    }
  }
  return { passed: true, failedAt: -1, actual: '' }
}

/** 포커스 트랩 검증: 모달/다이얼로그 내에서 Tab 순환 확인 */
export async function verifyFocusTrap(
  page: Page,
  containerSelector: string,
  tabCount: number,
): Promise<boolean> {
  for (let i = 0; i < tabCount; i++) {
    await page.keyboard.press('Tab')
    await page.waitForTimeout(100)

    const isInContainer = await page.evaluate(
      ({ sel }: { sel: string }) => {
        const container = document.querySelector(sel)
        const focused = document.activeElement
        return container !== null && focused !== null && container.contains(focused)
      },
      { sel: containerSelector },
    )

    if (!isInContainer) return false
  }
  return true
}

/** ESC 키로 모달 닫기 검증 */
export async function verifyEscClosesModal(
  page: Page,
  modalLocator: Locator,
): Promise<boolean> {
  if (!(await modalLocator.isVisible().catch(() => false))) return false
  await page.keyboard.press('Escape')
  await page.waitForTimeout(500)
  return !(await modalLocator.isVisible().catch(() => false))
}

/** 색상만으로 정보를 전달하지 않는지 확인 (아이콘/텍스트 보충) */
export async function hasNonColorIndicator(
  page: Page,
  selector: string,
): Promise<boolean> {
  return page.evaluate((sel: string) => {
    const el = document.querySelector(sel)
    if (!el) return false
    const text = el.textContent ?? ''
    // 텍스트, 아이콘(svg/img), aria-label 중 하나라도 있으면 OK
    const hasText = text.trim().length > 0
    const hasIcon = el.querySelector('svg, img, [role="img"]') !== null
    const hasAriaLabel = (el.getAttribute('aria-label') ?? '').length > 0
    return hasText || hasIcon || hasAriaLabel
  }, selector)
}

/** :focus-visible 스타일이 적용되는지 확인 */
export async function hasFocusVisibleStyle(
  page: Page,
  selector: string,
): Promise<boolean> {
  // 요소에 포커스 → outline/box-shadow 존재 확인
  return page.evaluate((sel: string) => {
    const el = document.querySelector(sel) as HTMLElement | null
    if (!el) return false
    el.focus()
    const styles = window.getComputedStyle(el)
    const hasOutline = styles.outlineStyle !== 'none' && styles.outlineWidth !== '0px'
    const hasBoxShadow = styles.boxShadow !== 'none'
    return hasOutline || hasBoxShadow
  }, selector)
}
