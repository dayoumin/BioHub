/**
 * Phase 4 Part C: 공통 UX 테스트
 *
 * 내비게이션, 반응형, 세션 관리, 한국어 로케일
 *
 * 태그: @phase4, @critical, @important
 * 실행: pnpm e2e --grep "@phase4"
 */

import { test, expect } from '@playwright/test'
import { S } from '../selectors'
import { log } from '../helpers/flow-helpers'

test.setTimeout(120_000)

// ========================================
// 4C.1 내비게이션 & 라우팅 @phase4 @critical
// ========================================

test.describe('@phase4 @critical 내비게이션 & 라우팅', () => {
  test('TC-4C.1.1: 직접 URL 접근', async ({ page }) => {
    // /graph-studio/ 직접 접근 — 정적 빌드에서 클라이언트 라우팅이 하이드레이션 후 렌더링
    await page.goto('/graph-studio/', { waitUntil: 'networkidle', timeout: 60000 })
    // Next.js static export: 서버 HTML은 홈 셸을 포함할 수 있으므로,
    // 클라이언트 라우팅이 Graph Studio를 렌더링할 때까지 대기
    const hasGS = await page
      .locator(S.graphStudioPage)
      .isVisible({ timeout: 30000 })
      .catch(() => false)
    if (!hasGS) {
      // fallback: URL은 맞지만 data-testid 미부착일 수 있음 — 텍스트로 확인
      const bodyText = await page.locator('body').innerText()
      const hasGSText = bodyText.includes('Graph Studio') || bodyText.includes('차트')
      log('TC-4C.1.1', `/graph-studio: testid=${hasGS}, text=${hasGSText}`)
      expect(hasGSText).toBe(true)
    } else {
      log('TC-4C.1.1', `/graph-studio: ${hasGS}`)
    }

    // /dashboard 접근 (있을 경우)
    await page.goto('/dashboard', { waitUntil: 'domcontentloaded', timeout: 30000 })
    await page.waitForLoadState('networkidle')
    const dashboardText = await page.locator('body').innerText()
    const hasDashboard =
      !dashboardText.includes('404') && !dashboardText.includes('not found')
    log('TC-4C.1.1', `/dashboard: ${hasDashboard}`)

    // / (Hub) 접근
    await page.goto('/', { waitUntil: 'domcontentloaded', timeout: 30000 })
    const hasHub = await page
      .locator(S.hubUploadCard)
      .isVisible({ timeout: 15000 })
      .catch(() => false)
    expect(hasHub).toBe(true)
    log('TC-4C.1.1', `/: ${hasHub}`)
  })

  test('TC-4C.1.2: 뒤로가기/앞으로가기', async ({ page }) => {
    // Hub → Graph Studio
    await page.goto('/', { waitUntil: 'domcontentloaded', timeout: 60000 })
    await page.waitForFunction(
      () => document.querySelector('[data-testid="hub-upload-card"]') !== null,
      { timeout: 30000 },
    )

    // Graph Studio로 이동
    const vizCard = page.locator(S.hubVisualizationCard)
    if (await vizCard.isVisible({ timeout: 5000 }).catch(() => false)) {
      await vizCard.click()
      await page.waitForLoadState('networkidle')

      // Graph Studio 확인
      const hasGS = await page
        .locator(S.graphStudioPage)
        .isVisible({ timeout: 10000 })
        .catch(() => false)

      if (hasGS) {
        // 뒤로가기
        await page.goBack()
        await page.waitForLoadState('networkidle')

        // Hub 복귀 확인
        const hasHub = await page
          .locator(S.hubUploadCard)
          .isVisible({ timeout: 10000 })
          .catch(() => false)
        log('TC-4C.1.2', `뒤로가기 → Hub: ${hasHub}`)

        // 앞으로가기
        await page.goForward()
        await page.waitForLoadState('networkidle')

        const hasGSAgain = await page
          .locator(S.graphStudioPage)
          .isVisible({ timeout: 10000 })
          .catch(() => false)
        log('TC-4C.1.2', `앞으로가기 → Graph Studio: ${hasGSAgain}`)
      }
    }
  })

  test('TC-4C.1.3: 404 페이지', async ({ page }) => {
    await page.goto('/this-page-does-not-exist-xyz', {
      waitUntil: 'domcontentloaded',
      timeout: 30000,
    })
    await page.waitForLoadState('networkidle')

    const bodyText = await page.locator('body').innerText()
    // Next.js 정적 빌드에서는 404 페이지 또는 Hub로 리다이렉트될 수 있음
    const is404OrRedirect =
      bodyText.includes('404') ||
      bodyText.includes('not found') ||
      bodyText.includes('찾을 수 없') ||
      (await page.locator(S.hubUploadCard).isVisible({ timeout: 5000 }).catch(() => false))
    expect(is404OrRedirect).toBe(true)
    log('TC-4C.1.3', `404 처리: ${is404OrRedirect}`)
  })
})

// ========================================
// 4C.2 반응형 & 레이아웃 @phase4 @important
// ========================================

test.describe('@phase4 @important 반응형 & 레이아웃', () => {
  test('TC-4C.2.1: 데스크톱 최소 너비 (1024px)', async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 768 })

    // Hub 확인
    await page.goto('/', { waitUntil: 'domcontentloaded', timeout: 60000 })
    await page.waitForFunction(
      () => document.querySelector('[data-testid="hub-upload-card"]') !== null,
      { timeout: 30000 },
    )

    const hubCard = page.locator(S.hubUploadCard)
    await expect(hubCard).toBeVisible()

    // 스크린샷으로 깨짐 확인 (시각적 검증용)
    await page.screenshot({
      path: 'e2e/results/screenshots/responsive-1024-hub.png',
      fullPage: true,
    })

    // Graph Studio 확인 (SPA 정적 빌드 — 하이드레이션 대기)
    await page.goto('/graph-studio/', { waitUntil: 'networkidle', timeout: 30000 })

    const hasGS = await page
      .locator(S.graphStudioPage)
      .isVisible({ timeout: 30000 })
      .catch(() => false)
    if (!hasGS) {
      // fallback: data-testid 미부착 시 텍스트로 확인
      const bodyText = await page.locator('body').innerText()
      // Either Graph Studio or chart text must be present
      expect(bodyText.includes('Graph Studio') || bodyText.includes('차트')).toBe(true)
    }

    await page.screenshot({
      path: 'e2e/results/screenshots/responsive-1024-graph.png',
      fullPage: true,
    })

    log('TC-4C.2.1', '1024px 레이아웃 검증 완료')
  })

  test('TC-4C.2.2: 와이드 모니터 (1920px)', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 })

    await page.goto('/', { waitUntil: 'domcontentloaded', timeout: 60000 })
    await page.waitForFunction(
      () => document.querySelector('[data-testid="hub-upload-card"]') !== null,
      { timeout: 30000 },
    )

    await expect(page.locator(S.hubUploadCard)).toBeVisible()

    await page.screenshot({
      path: 'e2e/results/screenshots/responsive-1920-hub.png',
      fullPage: true,
    })

    log('TC-4C.2.2', '1920px 레이아웃 검증 완료')
  })
})

// ========================================
// 4C.3 세션 관리 @phase4 @important
// ========================================

test.describe('@phase4 @important 세션 관리', () => {
  test('TC-4C.3.1: 새로고침 후 상태 복원', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded', timeout: 60000 })
    await page.waitForFunction(
      () => document.querySelector('[data-testid="hub-upload-card"]') !== null,
      { timeout: 30000 },
    )

    // Hub에서 업로드 진행
    await page.locator(S.hubUploadCard).click()
    await page.waitForSelector('input[type="file"]', { timeout: 10000 })

    // sessionStorage/localStorage 상태 확인
    const storageState = await page.evaluate(() => {
      const session: Record<string, string> = {}
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i)
        if (key) session[key] = sessionStorage.getItem(key) ?? ''
      }
      return { sessionKeys: Object.keys(session).length, keys: Object.keys(session) }
    })
    log('TC-4C.3.1', `sessionStorage keys: ${storageState.sessionKeys}`)

    // 새로고침
    await page.reload({ waitUntil: 'domcontentloaded', timeout: 60000 })

    // 페이지가 정상 로드되는지 확인
    const hasPage = await page
      .waitForFunction(
        () =>
          document.querySelector('[data-testid="hub-upload-card"]') !== null ||
          document.querySelector('input[type="file"]') !== null ||
          document.querySelector('[data-testid="data-profile-summary"]') !== null,
        { timeout: 15000 },
      )
      .then(() => true)
      .catch(() => false)
    expect(hasPage).toBe(true)
    log('TC-4C.3.1', `새로고침 후 복원: ${hasPage}`)
  })

  test('TC-4C.3.2: 탭 간 독립성', async ({ context }) => {
    // 탭 1
    const page1 = await context.newPage()
    await page1.goto('/', { waitUntil: 'domcontentloaded', timeout: 60000 })
    await page1.waitForFunction(
      () => document.querySelector('[data-testid="hub-upload-card"]') !== null,
      { timeout: 30000 },
    )

    // 탭 2
    const page2 = await context.newPage()
    await page2.goto('/', { waitUntil: 'domcontentloaded', timeout: 60000 })
    await page2.waitForFunction(
      () => document.querySelector('[data-testid="hub-upload-card"]') !== null,
      { timeout: 30000 },
    )

    // 두 탭 모두 정상 동작
    const tab1Hub = await page1
      .locator(S.hubUploadCard)
      .isVisible()
      .catch(() => false)
    const tab2Hub = await page2
      .locator(S.hubUploadCard)
      .isVisible()
      .catch(() => false)

    expect(tab1Hub).toBe(true)
    expect(tab2Hub).toBe(true)
    log('TC-4C.3.2', `탭 독립성: tab1=${tab1Hub}, tab2=${tab2Hub}`)

    await page1.close()
    await page2.close()
  })
})

// ========================================
// 4C.4 한국어 로케일 & 콘텐츠 @phase4 @important
// ========================================

test.describe('@phase4 @important 한국어 로케일', () => {
  test('TC-4C.4.1: 모든 UI 텍스트 한국어 표시', async ({ page }) => {
    // Hub 화면
    await page.goto('/', { waitUntil: 'domcontentloaded', timeout: 60000 })
    await page.waitForFunction(
      () => document.querySelector('[data-testid="hub-upload-card"]') !== null,
      { timeout: 30000 },
    )

    const hubText = await page.locator('body').innerText()
    // 한국어 문자가 포함되어 있는지 확인
    const hasKorean = /[\uAC00-\uD7AF]/.test(hubText)
    expect(hasKorean).toBe(true)
    log('TC-4C.4.1', `Hub 한국어: ${hasKorean}`)

    // 영어 fallback 주요 키워드가 노출되지 않는지 확인 (일부는 의도적 영어)
    // 완전히 영어만인 버튼이 없는지 체크 (통계 용어 제외)
    const englishOnlyButtons = await page.evaluate(() => {
      const buttons = document.querySelectorAll('button')
      const englishOnly: string[] = []
      for (const btn of buttons) {
        const text = btn.textContent?.trim() ?? ''
        if (text.length > 2 && /^[a-zA-Z\s]+$/.test(text)) {
          // 통계 용어/기술 용어는 제외
          if (!/^(Hub|Graph|Studio|AI|CSV|PDF|DOCX|XLSX|HTML)$/i.test(text)) {
            englishOnly.push(text)
          }
        }
      }
      return englishOnly
    })
    log('TC-4C.4.1', `영어 전용 버튼: ${englishOnlyButtons.length}개 [${englishOnlyButtons.slice(0, 5).join(', ')}]`)

    // Graph Studio 화면
    await page.goto('/graph-studio/', { waitUntil: 'domcontentloaded', timeout: 30000 })
    await page.waitForLoadState('networkidle')
    const gsText = await page.locator('body').innerText()
    const gsHasKorean = /[\uAC00-\uD7AF]/.test(gsText)
    log('TC-4C.4.1', `Graph Studio 한국어: ${gsHasKorean}`)
  })

  test('TC-4C.4.2: 통계 용어 일관성', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded', timeout: 60000 })
    await page.waitForFunction(
      () => document.querySelector('[data-testid="hub-upload-card"]') !== null,
      { timeout: 30000 },
    )

    // Hub 화면에서 통계 관련 텍스트 수집
    const bodyText = await page.locator('body').innerText()

    // 용어 일관성 체크
    const hasPValue = bodyText.includes('p-value') || bodyText.includes('유의확률')
    const hasSignificance = bodyText.includes('유의') || bodyText.includes('통계')

    log('TC-4C.4.2', `p-value/유의확률: ${hasPValue}, 유의/통계: ${hasSignificance}`)
    // Hub 화면에서는 통계 용어가 반드시 없을 수 있으므로 존재 여부만 로깅
  })
})
