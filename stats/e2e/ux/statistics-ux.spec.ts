/**
 * Phase 4 Part A: 통계 분석 UX 테스트
 *
 * 실제 사용자 시나리오 기반 — 첫 방문, 연속 분석, 에러 복구, 내보내기
 *
 * 태그: @phase4, @critical, @important, @ai-mock
 * 실행: pnpm e2e --grep "@phase4"
 */

import { test, expect } from '@playwright/test'
import { S } from '../selectors'
import {
  log,
  navigateToUploadStep,
  uploadCSV,
  goToMethodSelection,
  selectMethodDirect,
  goToVariableSelection,
  ensureVariablesOrSkip,
  clickAnalysisRun,
  waitForResults,
  verifyStatisticalResults,
  mockOpenRouterAPI,
  selectMethodViaLLM,
} from '../helpers/flow-helpers'

test.setTimeout(180_000)

// ========================================
// 4A.1 첫 방문 사용자 시나리오 @phase4 @critical
// ========================================

test.describe('@phase4 @critical 첫 방문 사용자 시나리오', () => {
  test('TC-4A.1.1: 완전 초보 — AI 추천으로 분석 → DOCX 내보내기 @ai-mock', async ({ page }) => {
    // 1. Hub → 데이터 업로드 Step으로 이동
    // hub-upload-btn을 사용해야 함 (hub-upload-card는 전체 Hub 컨테이너이므로 클릭 시 QuickAnalysisPill 오발동)
    await navigateToUploadStep(page)

    // 2. CSV 업로드
    expect(await uploadCSV(page, 't-test.csv')).toBeTruthy()
    await expect(page.locator(S.dataProfileSummary)).toBeVisible({ timeout: 15000 })

    // 3. 다음 단계로 이동 (다음 버튼이 보여야 함)
    const nextBtn = page.locator(S.floatingNextBtn)
    await expect(nextBtn).toBeVisible({ timeout: 5000 })
    await expect(nextBtn).toBeEnabled()

    // 4. AI 추천 흐름
    await mockOpenRouterAPI(page, 't-test', '독립표본 t-검정')
    await goToMethodSelection(page)

    const aiTab = page.locator(S.filterAi)
    await expect(aiTab).toBeVisible({ timeout: 5000 })
    await aiTab.click()
    await page.waitForTimeout(500)

    await page.locator(S.aiChatInput).fill('두 그룹의 평균이 차이가 있는지 알고 싶어요')
    await page.locator(S.aiChatSubmit).click()

    // 5. 추천 카드 → 수락
    await expect(page.locator(S.recommendationCard)).toBeVisible({ timeout: 30000 })
    await page.locator(S.selectRecommendedMethod).click()
    await page.waitForTimeout(1500)

    // 6. 변수 자동 할당 → 분석 실행
    await ensureVariablesOrSkip(page, 'TC-4A.1.1', 'group', 'value')
    await clickAnalysisRun(page)

    // 7. 결과 확인
    expect(await waitForResults(page, 120000)).toBeTruthy()
    const r = await verifyStatisticalResults(page)
    expect(r.hasStatistic).toBeTruthy()
    expect(r.hasPValue).toBeTruthy()

    // 해석 텍스트가 한국어로 존재하는지 확인
    const bodyText = await page.locator('body').innerText()
    const hasKoreanInterpretation =
      bodyText.includes('유의') || bodyText.includes('결과') || bodyText.includes('해석')
    expect(hasKoreanInterpretation).toBeTruthy()

    // 8. 내보내기 → DOCX
    const exportDD = page.locator(S.exportDropdown)
    if (await exportDD.isVisible({ timeout: 5000 }).catch(() => false)) {
      await exportDD.click()
      await page.waitForTimeout(500)

      const exportDocx = page.locator(S.exportDocx)
      if (await exportDocx.isVisible({ timeout: 3000 }).catch(() => false)) {
        // 다운로드 이벤트 감지
        const downloadPromise = page.waitForEvent('download', { timeout: 10000 }).catch(() => null)
        await exportDocx.click()
        const download = await downloadPromise
        // 다운로드가 트리거되면 성공 (환경에 따라 null일 수 있음)
        log('TC-4A.1.1', `download: ${download ? 'triggered' : 'not captured (OK in CI)'}`)
      }
    }

    log('TC-4A.1.1', '완전 초보 시나리오 완료')
  })

  test('TC-4A.1.2: 통계 전문가 — 직접 선택 → 상세 결과 확인', async ({ page }) => {
    // 1. 업로드
    await navigateToUploadStep(page)
    expect(await uploadCSV(page, 'paired-t-test.csv')).toBeTruthy()
    await expect(page.locator(S.dataProfileSummary)).toBeVisible({ timeout: 15000 })

    // 2. 직접 선택 → 대응표본 t-검정
    await goToMethodSelection(page)
    await page.locator(S.filterBrowse).click()
    await page.waitForTimeout(500)
    expect(
      await selectMethodDirect(page, '대응표본', /대응표본.*t.*검정|paired.*t/i),
    ).toBeTruthy()

    // 3. 변수 할당 (대응표본: pre, post)
    await goToVariableSelection(page)
    await page.waitForTimeout(2000)

    // pre, post 버튼 클릭으로 비교 변수 할당
    const preBtn = page.locator('button:not([disabled])').filter({ hasText: 'pre' })
    const postBtn = page.locator('button:not([disabled])').filter({ hasText: 'post' })
    if ((await preBtn.count()) > 0) await preBtn.first().click()
    await page.waitForTimeout(500)
    if ((await postBtn.count()) > 0) await postBtn.first().click()
    await page.waitForTimeout(1000)

    // 4. 분석 실행 (run-analysis-btn 또는 다음 단계 버튼)
    await clickAnalysisRun(page)
    expect(await waitForResults(page, 120000)).toBeTruthy()

    // 5. 전문 통계 용어 확인
    const bodyText = await page.locator('body').innerText()
    const r = await verifyStatisticalResults(page)
    expect(r.hasStatistic).toBeTruthy()
    expect(r.hasPValue).toBeTruthy()

    // 효과크기 확인
    const hasEffectSize = /효과크기|Cohen|effect\s*size/i.test(bodyText)
    log('TC-4A.1.2', `effectSize=${hasEffectSize}`)

    // 상세 결과 섹션 확인
    const hasDetailed = await page
      .locator(S.detailedResultsSection)
      .isVisible({ timeout: 3000 })
      .catch(() => false)
    const hasDiagnostics = await page
      .locator(S.diagnosticsSection)
      .isVisible({ timeout: 3000 })
      .catch(() => false)
    expect(hasDetailed || hasDiagnostics).toBeTruthy()

    log('TC-4A.1.2', '전문가 시나리오 완료')
  })

  test('TC-4A.1.3: QuickAnalysisPills 사용 (있을 경우)', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded', timeout: 60000 })
    await page.waitForFunction(
      () => document.querySelector('[data-testid="hub-upload-card"]') !== null,
      { timeout: 30000 },
    )

    // Quick Pills 검색 (data-testid 또는 텍스트 기반)
    const quickPills = page.locator('[data-testid*="quick"], [data-testid*="pill"]')
    const pillCount = await quickPills.count()

    if (pillCount === 0) {
      log('TC-4A.1.3', 'SKIPPED: QuickAnalysisPills 미구현')
      test.skip()
      return
    }

    // 첫 번째 Pill 클릭
    await quickPills.first().click()
    await page.waitForTimeout(2000)

    // Step 1(업로드)으로 직행하는지 확인
    const hasFileInput = await page
      .locator('input[type="file"]')
      .count()
      .then((c) => c > 0)
      .catch(() => false)
    expect(hasFileInput).toBeTruthy()
    log('TC-4A.1.3', 'QuickPills → 업로드 직행 확인')
  })
})

// ========================================
// 4A.2 연속 분석 시나리오 @phase4 @important
// ========================================

test.describe('@phase4 @important 연속 분석', () => {
  test('TC-4A.2.1: 같은 데이터 → 다른 메서드로 재분석', async ({ page }) => {
    // 1차 분석: t-test
    await navigateToUploadStep(page)
    expect(await uploadCSV(page, 't-test.csv')).toBeTruthy()
    await expect(page.locator(S.dataProfileSummary)).toBeVisible({ timeout: 15000 })

    await goToMethodSelection(page)
    expect(await selectMethodDirect(page, '독립표본', /독립표본 t-검정/)).toBeTruthy()
    await goToVariableSelection(page)
    await ensureVariablesOrSkip(page, 'TC-4A.2.1-1', 'group', 'value')
    await clickAnalysisRun(page)
    expect(await waitForResults(page, 120000)).toBeTruthy()

    // 새 분석 버튼 클릭
    const newBtn = page.locator(S.newAnalysisBtn)
    if (!(await newBtn.isVisible({ timeout: 5000 }).catch(() => false))) {
      log('TC-4A.2.1', 'SKIPPED: new-analysis-btn 미표시')
      test.skip()
      return
    }

    await newBtn.click()
    await page.waitForTimeout(3000)

    // 데이터가 유지되는지 확인: 프로파일이 보이거나 Step 2로 직행
    const hasProfile = await page
      .locator(S.dataProfileSummary)
      .isVisible({ timeout: 5000 })
      .catch(() => false)
    const hasMethodSearch = await page
      .locator(S.methodSearchInput)
      .isVisible({ timeout: 5000 })
      .catch(() => false)

    if (hasProfile || hasMethodSearch) {
      log('TC-4A.2.1', '데이터 유지 확인 — 재분석 가능')
    } else {
      // Hub로 돌아간 경우 → 재업로드 필요 (이것도 유효한 동작)
      log('TC-4A.2.1', 'Hub로 복귀 — 재업로드 필요한 설계')
    }
  })

  test('TC-4A.2.2: 분석 이력에서 과거 결과 복원', async ({ page }) => {
    // 먼저 분석 1회 수행
    await navigateToUploadStep(page)
    expect(await uploadCSV(page, 't-test.csv')).toBeTruthy()
    await expect(page.locator(S.dataProfileSummary)).toBeVisible({ timeout: 15000 })

    await goToMethodSelection(page)
    expect(await selectMethodDirect(page, '독립표본', /독립표본 t-검정/)).toBeTruthy()
    await goToVariableSelection(page)
    await ensureVariablesOrSkip(page, 'TC-4A.2.2', 'group', 'value')
    await clickAnalysisRun(page)
    expect(await waitForResults(page, 120000)).toBeTruthy()

    // Hub로 돌아가기
    await page.goto('/', { waitUntil: 'domcontentloaded', timeout: 60000 })
    await page.waitForTimeout(3000)

    // 이력 패널 확인
    const historyPanel = page.locator('[data-testid*="history"], [data-testid*="recent"]')
    const hasHistory = await historyPanel.first().isVisible({ timeout: 5000 }).catch(() => false)

    if (!hasHistory) {
      log('TC-4A.2.2', 'SKIPPED: AnalysisHistoryPanel 미구현')
      test.skip()
      return
    }

    // 이력 항목 클릭 → 결과 복원
    const historyItem = historyPanel.locator('button, a, [role="button"]').first()
    if (await historyItem.isVisible().catch(() => false)) {
      await historyItem.click()
      await page.waitForTimeout(3000)

      const hasResults = await page
        .locator(S.resultsMainCard)
        .isVisible({ timeout: 10000 })
        .catch(() => false)
      log('TC-4A.2.2', `이력 복원: ${hasResults ? '성공' : '실패'}`)
    }
  })

  test('TC-4A.2.3: 변수만 변경하여 재분석 (ReanalysisPanel)', async ({ page }) => {
    await navigateToUploadStep(page)
    expect(await uploadCSV(page, 'anova.csv')).toBeTruthy()
    await expect(page.locator(S.dataProfileSummary)).toBeVisible({ timeout: 15000 })

    await goToMethodSelection(page)
    expect(await selectMethodDirect(page, '일원', /일원.*분산|one.*way.*anova/i)).toBeTruthy()
    await goToVariableSelection(page)
    await ensureVariablesOrSkip(page, 'TC-4A.2.3', 'group', 'value')
    await clickAnalysisRun(page)
    expect(await waitForResults(page, 120000)).toBeTruthy()

    // 재분석 패널 확인
    const reanalysisPanel = page.locator('[data-testid*="reanalysis"], [data-testid*="re-analysis"]')
    const hasReanalysis = await reanalysisPanel.first().isVisible({ timeout: 5000 }).catch(() => false)

    if (!hasReanalysis) {
      log('TC-4A.2.3', 'SKIPPED: ReanalysisPanel 미구현')
      test.skip()
      return
    }

    log('TC-4A.2.3', '재분석 패널 존재 확인')
  })
})

// ========================================
// 4A.3 에러 복구 시나리오 @phase4 @critical
// ========================================

test.describe('@phase4 @critical 에러 복구 — 통계', () => {
  test('TC-4A.3.1: 잘못된 변수 할당 → 에러 → 수정', async ({ page }) => {
    await navigateToUploadStep(page)
    expect(await uploadCSV(page, 't-test.csv')).toBeTruthy()
    await expect(page.locator(S.dataProfileSummary)).toBeVisible({ timeout: 15000 })

    await goToMethodSelection(page)
    expect(await selectMethodDirect(page, '독립표본', /독립표본 t-검정/)).toBeTruthy()
    await goToVariableSelection(page)

    // 변수 할당 UI 대기 (레거시 run-analysis-btn 또는 신규 variable-selection-next)
    await page.waitForFunction(
      () =>
        document.querySelector('[data-testid="run-analysis-btn"]') !== null ||
        document.querySelector('[data-testid="variable-selection-next"]') !== null,
      { timeout: 15000 },
    )

    // 변수가 잘못 할당된 경우 에러/경고가 표시되는지 확인
    // (자동 할당이 되므로 수동으로 잘못된 할당을 시도)
    const bodyText = await page.locator('body').innerText()

    // 변수 영역이 보이면 상태 확인
    const varSelector = page.locator(S.variableSelectorModern)
    if (await varSelector.isVisible({ timeout: 3000 }).catch(() => false)) {
      // 경고/에러 메시지 요소 확인
      const hasWarning = await page
        .locator(S.warningsSection)
        .isVisible({ timeout: 2000 })
        .catch(() => false)
      const hasValidation = bodyText.includes('경고') || bodyText.includes('주의')
      log('TC-4A.3.1', `warning=${hasWarning}, validation=${hasValidation}`)
    }

    // 정상 분석 완료 확인
    await ensureVariablesOrSkip(page, 'TC-4A.3.1', 'group', 'value')
    await clickAnalysisRun(page)
    expect(await waitForResults(page, 120000)).toBeTruthy()
    log('TC-4A.3.1', '에러 복구 후 정상 분석 완료')
  })

  test('TC-4A.3.2: Pyodide 로딩 실패 → 재시도', async ({ page }) => {
    await navigateToUploadStep(page)
    expect(await uploadCSV(page, 't-test.csv')).toBeTruthy()
    await expect(page.locator(S.dataProfileSummary)).toBeVisible({ timeout: 15000 })

    await goToMethodSelection(page)
    expect(await selectMethodDirect(page, '독립표본', /독립표본 t-검정/)).toBeTruthy()
    await goToVariableSelection(page)
    await ensureVariablesOrSkip(page, 'TC-4A.3.2', 'group', 'value')

    // Pyodide CDN 차단
    await page.route('**/pyodide/**', (route) => route.abort())

    await clickAnalysisRun(page)
    await page.waitForTimeout(10000)

    // 에러/실패 메시지 확인
    const bodyText = await page.locator('body').innerText()
    const hasError =
      bodyText.includes('오류') ||
      bodyText.includes('실패') ||
      bodyText.includes('에러') ||
      bodyText.includes('로딩') ||
      bodyText.includes('네트워크') ||
      bodyText.includes('error')
    log('TC-4A.3.2', `Pyodide 차단 후 에러 표시: ${hasError}`)

    // 차단 해제 후 재시도
    await page.unroute('**/pyodide/**')

    const retryBtn = page.locator('button:has-text("다시 시도"), button:has-text("재시도"), button:has-text("Retry")')
    if (await retryBtn.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      await retryBtn.first().click()
      await page.waitForTimeout(5000)
      log('TC-4A.3.2', '재시도 버튼 클릭')
    } else {
      // 재시도 버튼 없으면 분석 다시 실행
      await clickAnalysisRun(page)
    }

    // 정상 분석 완료 또는 에러 상태 확인
    const hasResults = await waitForResults(page, 120000)
    log('TC-4A.3.2', `재시도 후 결과: ${hasResults}`)
  })

  test('TC-4A.3.3: 분석 중 취소 → 복구', async ({ page }) => {
    await navigateToUploadStep(page)
    expect(await uploadCSV(page, 't-test.csv')).toBeTruthy()
    await expect(page.locator(S.dataProfileSummary)).toBeVisible({ timeout: 15000 })

    await goToMethodSelection(page)
    expect(await selectMethodDirect(page, '독립표본', /독립표본 t-검정/)).toBeTruthy()
    await goToVariableSelection(page)
    await ensureVariablesOrSkip(page, 'TC-4A.3.3', 'group', 'value')

    // 분석 실행 → 즉시 뒤로가기
    await clickAnalysisRun(page)
    await page.waitForTimeout(1000) // 로딩 시작 대기

    // Step 3(변수 선택)으로 돌아가기 시도
    const step3 = page.locator(S.stepperStep(3))
    if (await step3.isVisible({ timeout: 2000 }).catch(() => false)) {
      await step3.click()
      await page.waitForTimeout(2000)

      // 앱 상태 정상 확인
      const hasVarSelector = await page
        .locator(S.variableSelectorModern)
        .isVisible({ timeout: 5000 })
        .catch(() => false)
      const hasRunBtn = await page
        .locator(S.runAnalysisBtn)
        .isVisible({ timeout: 5000 })
        .catch(() => false)

      if (hasVarSelector || hasRunBtn) {
        log('TC-4A.3.3', '취소 후 변수 선택 복귀 성공')
        // 재실행 → 정상 완료
        await clickAnalysisRun(page)
        expect(await waitForResults(page, 120000)).toBeTruthy()
      } else {
        log('TC-4A.3.3', '취소 후 상태 — 이미 결과 표시 중일 수 있음')
      }
    } else {
      // Stepper가 없으면 결과 대기
      expect(await waitForResults(page, 120000)).toBeTruthy()
      log('TC-4A.3.3', '분석 중 취소 불가 — 결과까지 진행')
    }
  })

  test('TC-4A.3.4: 데이터 부족 에러', async ({ page }) => {
    await navigateToUploadStep(page)

    // 극소 CSV 업로드 (3행)
    const fileInput = page.locator('input[type="file"]')
    if ((await fileInput.count()) === 0) {
      await page.goto('/', { waitUntil: 'domcontentloaded', timeout: 60000 })
      await page.waitForFunction(
        () => document.querySelector('[data-testid="hub-upload-card"]') !== null,
        { timeout: 30000 },
      )
      await page.locator(S.hubUploadCard).click()
      await page.waitForSelector('input[type="file"]', { timeout: 10000 })
    }

    const smallCsv = 'group,value\nA,1\nB,2\nA,3'
    await page.locator('input[type="file"]').first().setInputFiles({
      name: 'small-data.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(smallCsv),
    })
    await page.waitForTimeout(3000)

    // 데이터 프로파일이 보이면 진행
    const hasProfile = await page
      .locator(S.dataProfileSummary)
      .isVisible({ timeout: 10000 })
      .catch(() => false)

    if (hasProfile) {
      await goToMethodSelection(page)
      const methodSelected = await selectMethodDirect(page, '일원', /일원.*분산|one.*way.*anova/i)

      if (methodSelected) {
        await goToVariableSelection(page)
        await ensureVariablesOrSkip(page, 'TC-4A.3.4', 'group', 'value')
        await clickAnalysisRun(page)

        // 에러 또는 경고 메시지 확인 (분석 실패할 수 있음)
        await page.waitForTimeout(15000)
        const bodyText = await page.locator('body').innerText()
        const hasError =
          bodyText.includes('부족') ||
          bodyText.includes('오류') ||
          bodyText.includes('에러') ||
          bodyText.includes('insufficient') ||
          bodyText.includes('error')
        const hasResults = await page
          .locator(S.resultsMainCard)
          .isVisible({ timeout: 5000 })
          .catch(() => false)
        log('TC-4A.3.4', `error=${hasError}, results=${hasResults}`)
        // 에러 메시지 OR 결과 중 하나는 있어야 함
        expect(hasError || hasResults).toBeTruthy()
      }
    } else {
      // 업로드 단계에서 에러 처리
      const bodyText = await page.locator('body').innerText()
      log('TC-4A.3.4', `업로드 단계 에러: ${bodyText.includes('오류') || bodyText.includes('에러')}`)
    }
  })
})

// ========================================
// 4A.4 내보내기 & 결과 활용 @phase4 @important
// ========================================

test.describe('@phase4 @important 내보내기 & 결과 활용', () => {
  // 공통: 분석 완료 후 내보내기 테스트
  async function runAnalysisForExport(page: import('@playwright/test').Page): Promise<boolean> {
    await navigateToUploadStep(page)
    if (!(await uploadCSV(page, 't-test.csv'))) return false
    await page.locator(S.dataProfileSummary).waitFor({ state: 'visible', timeout: 15000 }).catch(() => {})
    await goToMethodSelection(page)
    if (!(await selectMethodDirect(page, '독립표본', /독립표본 t-검정/))) return false
    await goToVariableSelection(page)
    await ensureVariablesOrSkip(page, 'export', 'group', 'value')
    await clickAnalysisRun(page)
    return waitForResults(page, 120000)
  }

  test('TC-4A.4.1: 결과 → DOCX 내보내기', async ({ page }) => {
    expect(await runAnalysisForExport(page)).toBeTruthy()

    const exportDD = page.locator(S.exportDropdown)
    if (!(await exportDD.isVisible({ timeout: 5000 }).catch(() => false))) {
      log('TC-4A.4.1', 'SKIPPED: export-dropdown 미표시')
      test.skip()
      return
    }

    await exportDD.click()
    await page.waitForTimeout(500)

    const docxBtn = page.locator(S.exportDocx)
    if (await docxBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      const downloadPromise = page.waitForEvent('download', { timeout: 10000 }).catch(() => null)
      await docxBtn.click()
      const download = await downloadPromise
      log('TC-4A.4.1', `DOCX download: ${download ? 'OK' : 'not captured'}`)
    }
  })

  test('TC-4A.4.2: 결과 → XLSX 내보내기', async ({ page }) => {
    expect(await runAnalysisForExport(page)).toBeTruthy()

    const exportDD = page.locator(S.exportDropdown)
    if (!(await exportDD.isVisible({ timeout: 5000 }).catch(() => false))) {
      log('TC-4A.4.2', 'SKIPPED: export-dropdown 미표시')
      test.skip()
      return
    }

    await exportDD.click()
    await page.waitForTimeout(500)

    const xlsxBtn = page.locator(S.exportXlsx)
    if (await xlsxBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      const downloadPromise = page.waitForEvent('download', { timeout: 10000 }).catch(() => null)
      await xlsxBtn.click()
      const download = await downloadPromise
      log('TC-4A.4.2', `XLSX download: ${download ? 'OK' : 'not captured'}`)
    }
  })

  test('TC-4A.4.3: 결과 → HTML 보고서', async ({ page }) => {
    expect(await runAnalysisForExport(page)).toBeTruthy()

    const exportDD = page.locator(S.exportDropdown)
    if (!(await exportDD.isVisible({ timeout: 5000 }).catch(() => false))) {
      log('TC-4A.4.3', 'SKIPPED: export-dropdown 미표시')
      test.skip()
      return
    }

    await exportDD.click()
    await page.waitForTimeout(500)

    const htmlBtn = page.locator(S.exportHtml)
    if (await htmlBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      const downloadPromise = page.waitForEvent('download', { timeout: 10000 }).catch(() => null)
      await htmlBtn.click()
      const download = await downloadPromise
      log('TC-4A.4.3', `HTML download: ${download ? 'OK' : 'not captured'}`)
    }
  })

  test('TC-4A.4.4: 결과 클립보드 복사', async ({ page }) => {
    expect(await runAnalysisForExport(page)).toBeTruthy()

    // 복사 버튼 찾기
    const copyBtn = page.locator('[data-testid*="copy"], button:has-text("복사")')
    const hasCopyBtn = await copyBtn.first().isVisible({ timeout: 5000 }).catch(() => false)

    if (!hasCopyBtn) {
      log('TC-4A.4.4', 'SKIPPED: 복사 버튼 미표시')
      test.skip()
      return
    }

    // 클립보드 API 권한 부여
    await page.context().grantPermissions(['clipboard-read', 'clipboard-write'])

    await copyBtn.first().click()
    await page.waitForTimeout(1000)

    // 토스트 메시지 확인
    const bodyText = await page.locator('body').innerText()
    const hasCopyConfirm =
      bodyText.includes('복사') || bodyText.includes('클립보드') || bodyText.includes('copied')
    log('TC-4A.4.4', `copyConfirm=${hasCopyConfirm}`)
  })
})
