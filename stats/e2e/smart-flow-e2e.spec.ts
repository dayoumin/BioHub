/**
 * Smart Flow E2E Tests — Phase 1: 핵심 워크플로우
 *
 * 설계 원칙:
 * - 모든 셀렉터는 data-testid 기반 (e2e/selectors.ts의 S 레지스트리 사용)
 * - UI 텍스트/디자인이 바뀌어도 data-testid만 유지하면 테스트가 안 깨짐
 * - 텍스트 매칭은 "데이터에 의존하는 경우"(변수명, 메서드명)만 허용
 *
 * 태그: @phase1, @smoke, @critical, @important, @ai-mock
 * 실행: pnpm e2e --grep "@phase1"
 */

import { test, expect } from '@playwright/test'
import { S } from './selectors'
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
} from './helpers/flow-helpers'

// baseURL은 playwright.config.ts에서 설정 (3000 포트)
test.setTimeout(180_000)

// ========================================
// 1.1 Hub 진입점 테스트 @phase1 @smoke
// ========================================

test.describe('@phase1 @smoke Hub 진입점', () => {
  test('TC-1.1.1: Hub 페이지 렌더링', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded', timeout: 60000 })
    await page.waitForFunction(
      () => document.querySelector('[data-testid="hub-upload-card"]') !== null,
      { timeout: 30000 },
    )

    await expect(page.locator(S.hubUploadCard)).toBeVisible()
    await expect(page.locator(S.hubVisualizationCard)).toBeVisible()
    await expect(page.locator(S.hubSampleSizeCard)).toBeVisible()
  })

  test('TC-1.1.2: Hub → 데이터 업로드 진입', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded', timeout: 60000 })
    await page.waitForFunction(
      () => document.querySelector('[data-testid="hub-upload-btn"]') !== null,
      { timeout: 30000 },
    )

    await page.locator(S.hubUploadBtn).click()
    // DataUploadStep 진입 확인 (stepper 또는 exploration step)
    await expect(
      page.locator(S.dataExplorationStep).or(page.locator(S.stepperStep(1))),
    ).toBeVisible({ timeout: 15000 })
  })

  test('TC-1.1.3: Hub → Graph Studio 진입', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded', timeout: 60000 })
    await page.waitForFunction(
      () => document.querySelector('[data-testid="hub-visualization-card"]') !== null,
      { timeout: 30000 },
    )

    await page.locator(S.hubVisualizationCard).click()
    await expect(page.locator(S.graphStudioPage)).toBeVisible({ timeout: 15000 })
  })

  test('TC-1.1.4: Hub → 표본크기 계산기', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded', timeout: 60000 })
    await page.waitForFunction(
      () => document.querySelector('[data-testid="hub-sample-size-card"]') !== null,
      { timeout: 30000 },
    )

    await page.locator(S.hubSampleSizeCard).click()
    // 모달이 열리거나 페이지 이동 확인
    await page.waitForTimeout(2000)
    const bodyText = await page.locator('body').innerText()
    expect(bodyText).toMatch(/표본|sample size|검정력/i)
  })
})

// ========================================
// 1.2 Step 1: 데이터 업로드/탐색 @phase1 @critical
// ========================================

test.describe('@phase1 @critical Step 1: 데이터 업로드', () => {
  test('TC-1.2.1: CSV 업로드 → 데이터 프로파일 표시', async ({ page }) => {
    await navigateToUploadStep(page)
    expect(await uploadCSV(page, 't-test.csv')).toBeTruthy()

    await expect(page.locator(S.dataProfileSummary)).toBeVisible({ timeout: 15000 })

    // 행/열 정보 텍스트 확인
    const profileText = await page.locator(S.dataProfileSummary).innerText()
    expect(profileText).toMatch(/\d+/)  // 최소 숫자가 있어야 함
  })

  test('TC-1.2.4: 잘못된 파일 업로드 → 에러 처리', async ({ page }) => {
    await navigateToUploadStep(page)

    // 빈 내용의 잘못된 파일 시뮬레이션: 이미지 파일처럼 처리
    const fileInput = page.locator('input[type="file"]')
    if ((await fileInput.count()) > 0) {
      // 빈 CSV를 업로드하고 에러 또는 빈 데이터 프로파일 확인
      // (앱이 에러 메시지를 보여주거나 프로파일이 비어있어야 함)
      await fileInput.first().setInputFiles({
        name: 'empty.csv',
        mimeType: 'text/csv',
        buffer: Buffer.from(''),
      })
      await page.waitForTimeout(3000)
      // 에러 메시지 또는 프로파일이 없어야 함
      const bodyText = await page.locator('body').innerText()
      const hasErrorOrEmpty =
        bodyText.includes('오류') ||
        bodyText.includes('에러') ||
        bodyText.includes('error') ||
        bodyText.includes('비어') ||
        !(await page.locator(S.dataProfileSummary).isVisible().catch(() => false))
      expect(hasErrorOrEmpty).toBeTruthy()
    }
  })

  test('TC-1.2.5: 데이터 교체 (replace-data-button)', async ({ page }) => {
    await navigateToUploadStep(page)
    expect(await uploadCSV(page, 't-test.csv')).toBeTruthy()
    await expect(page.locator(S.dataProfileSummary)).toBeVisible({ timeout: 15000 })

    // 교체 버튼 클릭
    const replaceBtn = page.locator(S.replaceDataButton)
    if (await replaceBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await replaceBtn.click()
      await page.waitForTimeout(1000)

      // 새 파일 업로드
      expect(await uploadCSV(page, 'anova.csv')).toBeTruthy()
      await expect(page.locator(S.dataProfileSummary)).toBeVisible({ timeout: 15000 })
    }
  })

  test('TC-1.2.6: 데이터 준비 가이드 토글', async ({ page }) => {
    await navigateToUploadStep(page)
    expect(await uploadCSV(page, 't-test.csv')).toBeTruthy()
    await expect(page.locator(S.dataProfileSummary)).toBeVisible({ timeout: 15000 })

    const toggle = page.locator(S.dataPrepGuideToggle)
    if (await toggle.isVisible({ timeout: 5000 }).catch(() => false)) {
      await toggle.click()
      await page.waitForTimeout(500)

      const content = page.locator(S.dataPrepGuideContent)
      const isVisible = await content.isVisible().catch(() => false)
      expect(isVisible).toBeTruthy()

      // 다시 토글
      await toggle.click()
      await page.waitForTimeout(500)
    }
  })
})

// ========================================
// 1.3 Step 2: 방법 선택 @phase1 @critical
// ========================================

test.describe('@phase1 @critical Step 2: 방법 선택', () => {
  test('TC-1.3.1: 직접 선택 탭 → 검색 → 메서드 선택', async ({ page }) => {
    await navigateToUploadStep(page)
    expect(await uploadCSV(page, 't-test.csv')).toBeTruthy()
    await expect(page.locator(S.dataProfileSummary)).toBeVisible({ timeout: 15000 })

    await goToMethodSelection(page)

    // 직접 선택 탭 확인
    await expect(page.locator(S.filterBrowse)).toBeVisible({ timeout: 5000 })
    await page.locator(S.filterBrowse).click()
    await page.waitForTimeout(1000)

    // 검색
    await expect(page.locator(S.methodSearchInput)).toBeVisible({ timeout: 3000 })
    await page.locator(S.methodSearchInput).fill('독립표본')
    await page.waitForTimeout(1500)

    // 메서드 클릭
    expect(
      await selectMethodDirect(page, '독립표본', /독립표본 t-검정/),
    ).toBeTruthy()

    // 선택 확인
    const selectedBar = page.locator(S.selectedMethodBar)
    const hasSelectedBar = await selectedBar.isVisible({ timeout: 3000 }).catch(() => false)
    const finalName = page.locator(S.finalSelectedMethodName)
    const hasFinalName = await finalName.isVisible({ timeout: 3000 }).catch(() => false)
    expect(hasSelectedBar || hasFinalName).toBeTruthy()
  })

  test('TC-1.3.2: AI 추천 탭 → 질문 → 추천 수락 @ai-mock', async ({ page }) => {
    await navigateToUploadStep(page)
    expect(await uploadCSV(page, 't-test.csv')).toBeTruthy()
    await expect(page.locator(S.dataProfileSummary)).toBeVisible({ timeout: 15000 })

    await mockOpenRouterAPI(page, 't-test', '독립표본 t-검정')
    await goToMethodSelection(page)

    // AI 탭
    await expect(page.locator(S.filterAi)).toBeVisible({ timeout: 5000 })
    await page.locator(S.filterAi).click()
    await page.waitForTimeout(500)

    // 질문 입력 & 전송
    await expect(page.locator(S.aiChatInput)).toBeVisible({ timeout: 5000 })
    await page.locator(S.aiChatInput).fill('두 그룹의 평균을 비교하고 싶어요')
    await page.locator(S.aiChatSubmit).click()

    // 추천 카드 대기
    await expect(page.locator(S.recommendationCard)).toBeVisible({ timeout: 30000 })

    // 수락
    await expect(page.locator(S.selectRecommendedMethod)).toBeVisible({ timeout: 5000 })
    await page.locator(S.selectRecommendedMethod).click()
    await page.waitForTimeout(1500)
  })

  test('TC-1.3.5: 예시 프롬프트 클릭 @ai-mock', async ({ page }) => {
    await navigateToUploadStep(page)
    expect(await uploadCSV(page, 't-test.csv')).toBeTruthy()
    await expect(page.locator(S.dataProfileSummary)).toBeVisible({ timeout: 15000 })

    await goToMethodSelection(page)

    // AI 탭
    const aiTab = page.locator(S.filterAi)
    if (await aiTab.isVisible({ timeout: 3000 }).catch(() => false)) {
      await aiTab.click()
      await page.waitForTimeout(500)
    }

    // 예시 프롬프트 영역 확인
    const examplePrompts = page.locator(S.examplePrompts)
    if (await examplePrompts.isVisible({ timeout: 5000 }).catch(() => false)) {
      // 첫 번째 예시 프롬프트 버튼 클릭
      const firstPrompt = examplePrompts.locator('button').first()
      if (await firstPrompt.isVisible().catch(() => false)) {
        await firstPrompt.click()
        await page.waitForTimeout(1000)
        // ai-chat-input에 텍스트가 채워졌는지 확인
        const inputValue = await page.locator(S.aiChatInput).inputValue()
        expect(inputValue.length).toBeGreaterThan(0)
      }
    }
  })
})

// ========================================
// 1.4 Step 3: 변수 선택 @phase1 @critical
// ========================================

test.describe('@phase1 @critical Step 3: 변수 선택', () => {
  test('TC-1.4.1: 자동 변수 할당 확인', async ({ page }) => {
    await navigateToUploadStep(page)
    expect(await uploadCSV(page, 't-test.csv')).toBeTruthy()
    await expect(page.locator(S.dataProfileSummary)).toBeVisible({ timeout: 15000 })

    await goToMethodSelection(page)
    expect(await selectMethodDirect(page, '독립표본', /독립표본 t-검정/)).toBeTruthy()

    await goToVariableSelection(page)

    // run-analysis-btn이 보이고 활성화된 경우 자동 할당 성공
    const runBtn = page.locator(S.runAnalysisBtn)
    await runBtn.waitFor({ state: 'visible', timeout: 15000 })
    await page.waitForTimeout(1000)

    // 변수 셀렉터가 렌더링되었는지 확인
    const varSelector = page.locator(S.variableSelectorModern)
    const hasVarSelector = await varSelector.isVisible({ timeout: 3000 }).catch(() => false)
    // variable-selection-step이 있거나 variable-selector가 보이면 OK
    const varStep = page.locator(S.variableSelectionStep)
    const hasVarStep = await varStep.isVisible({ timeout: 3000 }).catch(() => false)
    expect(hasVarSelector || hasVarStep).toBeTruthy()
  })
})

// ========================================
// 1.5 Step 4: 실행 & 결과 @phase1 @critical @slow
// ========================================

test.describe('@phase1 @critical @slow Step 4: 실행 & 결과', () => {
  test('TC-1.5.1: 분석 실행 → 결과 표시', async ({ page }) => {
    await navigateToUploadStep(page)
    expect(await uploadCSV(page, 't-test.csv')).toBeTruthy()
    await expect(page.locator(S.dataProfileSummary)).toBeVisible({ timeout: 15000 })

    await goToMethodSelection(page)
    expect(await selectMethodDirect(page, '독립표본', /독립표본 t-검정/)).toBeTruthy()

    await goToVariableSelection(page)
    await ensureVariablesOrSkip(page, 'TC-1.5.1', 'group', 'value')
    await clickAnalysisRun(page)

    expect(await waitForResults(page, 120000)).toBeTruthy()

    const r = await verifyStatisticalResults(page)
    log('TC-1.5.1', r.details)
    expect(r.hasStatistic).toBeTruthy()
    expect(r.hasPValue).toBeTruthy()
  })

  test('TC-1.5.2: 결과 카드 검증', async ({ page }) => {
    await navigateToUploadStep(page)
    expect(await uploadCSV(page, 't-test.csv')).toBeTruthy()
    await expect(page.locator(S.dataProfileSummary)).toBeVisible({ timeout: 15000 })

    await goToMethodSelection(page)
    expect(await selectMethodDirect(page, '독립표본', /독립표본 t-검정/)).toBeTruthy()

    await goToVariableSelection(page)
    await ensureVariablesOrSkip(page, 'TC-1.5.2', 'group', 'value')
    await clickAnalysisRun(page)

    expect(await waitForResults(page, 120000)).toBeTruthy()

    // results-main-card 존재
    await expect(page.locator(S.resultsMainCard)).toBeVisible({ timeout: 5000 })

    // detailed-results-section 또는 diagnostics-section 중 하나 이상 존재
    const hasDetailed = await page
      .locator(S.detailedResultsSection)
      .isVisible({ timeout: 3000 })
      .catch(() => false)
    const hasDiagnostics = await page
      .locator(S.diagnosticsSection)
      .isVisible({ timeout: 3000 })
      .catch(() => false)
    expect(hasDetailed || hasDiagnostics).toBeTruthy()
  })

  test('TC-1.5.3: 내보내기 드롭다운', async ({ page }) => {
    await navigateToUploadStep(page)
    expect(await uploadCSV(page, 't-test.csv')).toBeTruthy()
    await expect(page.locator(S.dataProfileSummary)).toBeVisible({ timeout: 15000 })

    await goToMethodSelection(page)
    expect(await selectMethodDirect(page, '독립표본', /독립표본 t-검정/)).toBeTruthy()

    await goToVariableSelection(page)
    await ensureVariablesOrSkip(page, 'TC-1.5.3', 'group', 'value')
    await clickAnalysisRun(page)

    expect(await waitForResults(page, 120000)).toBeTruthy()

    // export-dropdown 클릭
    const exportDD = page.locator(S.exportDropdown)
    if (await exportDD.isVisible({ timeout: 5000 }).catch(() => false)) {
      await exportDD.click()
      await page.waitForTimeout(500)

      // 내보내기 옵션 존재 확인
      const hasDocx = await page.locator(S.exportDocx).isVisible({ timeout: 2000 }).catch(() => false)
      const hasXlsx = await page.locator(S.exportXlsx).isVisible({ timeout: 2000 }).catch(() => false)
      const hasHtml = await page.locator(S.exportHtml).isVisible({ timeout: 2000 }).catch(() => false)
      expect(hasDocx || hasXlsx || hasHtml).toBeTruthy()
    }
  })

  test('TC-1.5.4: 새 분석 시작', async ({ page }) => {
    await navigateToUploadStep(page)
    expect(await uploadCSV(page, 't-test.csv')).toBeTruthy()
    await expect(page.locator(S.dataProfileSummary)).toBeVisible({ timeout: 15000 })

    await goToMethodSelection(page)
    expect(await selectMethodDirect(page, '독립표본', /독립표본 t-검정/)).toBeTruthy()

    await goToVariableSelection(page)
    await ensureVariablesOrSkip(page, 'TC-1.5.4', 'group', 'value')
    await clickAnalysisRun(page)

    expect(await waitForResults(page, 120000)).toBeTruthy()

    // 새 분석 버튼 클릭
    const newBtn = page.locator(S.newAnalysisBtn)
    if (await newBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await newBtn.click()
      await page.waitForTimeout(3000)

      // Hub로 복귀 또는 Step 1로 이동 확인
      const hubCard = page.locator(S.hubUploadCard)
      const fileInput = page.locator('input[type="file"]')
      const isReset =
        (await hubCard.isVisible({ timeout: 5000 }).catch(() => false)) ||
        ((await fileInput.count()) > 0)
      expect(isReset).toBeTruthy()
    }
  })
})

// ========================================
// 1.6 Stepper 내비게이션 @phase1 @important
// ========================================

test.describe('@phase1 @important Stepper 내비게이션', () => {
  test('TC-1.6.1: Stepper 클릭으로 Step 이동', async ({ page }) => {
    await navigateToUploadStep(page)
    expect(await uploadCSV(page, 't-test.csv')).toBeTruthy()
    await expect(page.locator(S.dataProfileSummary)).toBeVisible({ timeout: 15000 })

    // Step 2로 이동
    await goToMethodSelection(page)
    await page.waitForTimeout(1000)

    // Stepper Step 1 클릭 → Step 1로 되돌아가기
    const step1 = page.locator(S.stepperStep(1))
    if (await step1.isVisible({ timeout: 3000 }).catch(() => false)) {
      await step1.click()
      await page.waitForTimeout(2000)

      // Step 1이 보이는지 확인 (데이터 프로파일 또는 파일 입력)
      const hasProfile = await page
        .locator(S.dataProfileSummary)
        .isVisible({ timeout: 5000 })
        .catch(() => false)
      const hasFileInput = await page
        .locator('input[type="file"]')
        .count()
        .then((c) => c > 0)
      expect(hasProfile || hasFileInput).toBeTruthy()
    }
  })

  test('TC-1.6.2: 뒤로 가기 → 상태 유지', async ({ page }) => {
    await navigateToUploadStep(page)
    expect(await uploadCSV(page, 't-test.csv')).toBeTruthy()
    await expect(page.locator(S.dataProfileSummary)).toBeVisible({ timeout: 15000 })

    // Step 2로 이동 후 Step 1로 되돌아오면 데이터 유지 확인
    await goToMethodSelection(page)
    await page.waitForTimeout(1000)

    const step1 = page.locator(S.stepperStep(1))
    if (await step1.isVisible({ timeout: 3000 }).catch(() => false)) {
      await step1.click()
      await page.waitForTimeout(2000)

      // 데이터 프로파일이 여전히 표시
      const hasProfile = await page
        .locator(S.dataProfileSummary)
        .isVisible({ timeout: 5000 })
        .catch(() => false)
      expect(hasProfile).toBeTruthy()
    }
  })
})

// ========================================
// 기존 통합 테스트 (유지) @phase1 @critical @slow
// ========================================

test.describe('@phase1 @critical @slow 직접 선택 E2E 통합', () => {
  test('독립표본 t-검정: 업로드 → 직접선택 → 분석 → 결과', async ({ page }) => {
    await navigateToUploadStep(page)
    expect(await uploadCSV(page, 't-test.csv')).toBeTruthy()
    await expect(page.locator(S.dataProfileSummary)).toBeVisible({ timeout: 15000 })

    await goToMethodSelection(page)
    expect(await selectMethodDirect(page, '독립표본', /독립표본 t-검정/)).toBeTruthy()

    await goToVariableSelection(page)
    await ensureVariablesOrSkip(page, 't-test', 'group', 'value')
    await clickAnalysisRun(page)

    expect(await waitForResults(page, 120000)).toBeTruthy()
    const r = await verifyStatisticalResults(page)
    log('t-test', r.details)
    expect(r.hasStatistic).toBeTruthy()
    expect(r.hasPValue).toBeTruthy()

    await page.screenshot({
      path: 'e2e/results/screenshots/t-test-result.png',
      fullPage: true,
    })
  })

  test('카이제곱 독립성 검정: 업로드 → 직접선택 → 분석 → 결과', async ({ page }) => {
    await navigateToUploadStep(page)
    expect(await uploadCSV(page, 'chi-square-v2.csv')).toBeTruthy()
    await expect(page.locator(S.dataProfileSummary)).toBeVisible({ timeout: 15000 })

    await goToMethodSelection(page)
    expect(
      await selectMethodDirect(page, '카이제곱 독립', /카이제곱 독립성|chi.*square.*independence/),
    ).toBeTruthy()

    await goToVariableSelection(page)
    await ensureVariablesOrSkip(page, 'chi-square', 'gender', 'preference')
    await clickAnalysisRun(page)

    expect(await waitForResults(page, 120000)).toBeTruthy()
    const r = await verifyStatisticalResults(page)
    log('chi-square', r.details)
    expect(r.hasStatistic).toBeTruthy()
    expect(r.hasPValue).toBeTruthy()

    await page.screenshot({
      path: 'e2e/results/screenshots/chi-square-result.png',
      fullPage: true,
    })
  })
})

test.describe('@phase1 @critical @slow 추가 Variable Selectors', () => {
  test('일표본 t-검정 (OneSampleSelector)', async ({ page }) => {
    await navigateToUploadStep(page)
    expect(await uploadCSV(page, 'one-sample-t.csv')).toBeTruthy()
    await expect(page.locator(S.dataProfileSummary)).toBeVisible({ timeout: 15000 })

    await goToMethodSelection(page)
    expect(await selectMethodDirect(page, '일표본', /일표본.*t.*검정|one.*sample.*t/i)).toBeTruthy()

    await goToVariableSelection(page)
    const runBtn = page.locator(S.runAnalysisBtn)
    await runBtn.waitFor({ state: 'visible', timeout: 15000 })
    await page.waitForTimeout(500)

    await clickAnalysisRun(page)
    expect(await waitForResults(page, 120000)).toBeTruthy()

    const r = await verifyStatisticalResults(page)
    log('one-sample-t', r.details)
    expect(r.hasStatistic).toBeTruthy()
    expect(r.hasPValue).toBeTruthy()
  })

  test('대응표본 t-검정 (PairedSelector)', async ({ page }) => {
    await navigateToUploadStep(page)
    expect(await uploadCSV(page, 'paired-t-test.csv')).toBeTruthy()
    await expect(page.locator(S.dataProfileSummary)).toBeVisible({ timeout: 15000 })

    await goToMethodSelection(page)
    expect(await selectMethodDirect(page, '대응표본', /대응표본.*t.*검정|paired.*t/i)).toBeTruthy()

    await goToVariableSelection(page)
    const runBtn = page.locator(S.runAnalysisBtn)
    await runBtn.waitFor({ state: 'visible', timeout: 15000 })
    await page.waitForTimeout(500)

    if (!(await runBtn.isEnabled().catch(() => false))) {
      const preBtn = page.locator('button:not([disabled])').filter({ hasText: 'pre' })
      const postBtn = page.locator('button:not([disabled])').filter({ hasText: 'post' })
      if ((await preBtn.count()) > 0) {
        await preBtn.first().click()
        await page.waitForTimeout(500)
      }
      if ((await postBtn.count()) > 0) {
        await postBtn.first().click()
        await page.waitForTimeout(500)
      }
    }

    await clickAnalysisRun(page)
    expect(await waitForResults(page, 120000)).toBeTruthy()

    const r = await verifyStatisticalResults(page)
    log('paired-t', r.details)
    expect(r.hasStatistic).toBeTruthy()
    expect(r.hasPValue).toBeTruthy()
  })

  test('이원 분산분석 (TwoWayAnovaSelector)', async ({ page }) => {
    await navigateToUploadStep(page)
    expect(await uploadCSV(page, 'twoway-anova-test.csv')).toBeTruthy()
    await expect(page.locator(S.dataProfileSummary)).toBeVisible({ timeout: 15000 })

    await goToMethodSelection(page)
    expect(await selectMethodDirect(page, '이원', /이원.*분산|two.*way.*anova/i)).toBeTruthy()

    await goToVariableSelection(page)
    const runBtn = page.locator(S.runAnalysisBtn)
    await runBtn.waitFor({ state: 'visible', timeout: 15000 })
    await page.waitForTimeout(500)

    if (!(await runBtn.isEnabled().catch(() => false))) {
      const f1Btn = page.locator('button:not([disabled])').filter({ hasText: 'factor1' })
      const f2Btn = page.locator('button:not([disabled])').filter({ hasText: 'factor2' })
      const vBtn = page.locator('button:not([disabled])').filter({ hasText: 'value' })

      if ((await f1Btn.count()) > 0) await f1Btn.first().click()
      await page.waitForTimeout(500)
      if ((await f2Btn.count()) > 0) await f2Btn.first().click()
      await page.waitForTimeout(500)
      if ((await vBtn.count()) > 0) await vBtn.last().click()
      await page.waitForTimeout(500)
    }

    await clickAnalysisRun(page)
    expect(await waitForResults(page, 120000)).toBeTruthy()

    const r = await verifyStatisticalResults(page)
    log('two-way-anova', r.details)
    expect(r.hasStatistic).toBeTruthy()
    expect(r.hasPValue).toBeTruthy()
  })

  test('다중 회귀분석 (MultipleRegressionSelector)', async ({ page }) => {
    await navigateToUploadStep(page)
    expect(await uploadCSV(page, 'regression.csv')).toBeTruthy()
    await expect(page.locator(S.dataProfileSummary)).toBeVisible({ timeout: 15000 })

    await goToMethodSelection(page)
    const methodSelected = await selectMethodDirect(
      page,
      '다중회귀',
      /다중.*회귀|multiple.*regression/i,
    )

    if (!methodSelected) {
      log('multiple-regression', 'SKIPPED: disabled')
      test.skip()
      return
    }

    await goToVariableSelection(page)
    const runBtn = page.locator(S.runAnalysisBtn)
    await runBtn.waitFor({ state: 'visible', timeout: 15000 })
    await page.waitForTimeout(500)

    if (!(await runBtn.isEnabled().catch(() => false))) {
      const studyBtn = page.locator('button:not([disabled])').filter({ hasText: 'study_hours' })
      const attendBtn = page.locator('button:not([disabled])').filter({ hasText: 'attendance' })
      const scoreBtn = page.locator('button:not([disabled])').filter({ hasText: 'score' })

      if ((await studyBtn.count()) > 0) await studyBtn.first().click()
      await page.waitForTimeout(500)
      if ((await attendBtn.count()) > 0) await attendBtn.first().click()
      await page.waitForTimeout(500)
      if ((await scoreBtn.count()) > 0) {
        const cnt = await scoreBtn.count()
        await scoreBtn.nth(cnt > 1 ? 1 : 0).click()
      }
      await page.waitForTimeout(500)
    }

    await clickAnalysisRun(page)
    expect(await waitForResults(page, 120000)).toBeTruthy()

    const r = await verifyStatisticalResults(page)
    log('regression', r.details)
    expect(r.hasStatistic).toBeTruthy()
    expect(r.hasPValue).toBeTruthy()
  })
})

test.describe('@phase1 @critical @slow @ai-mock LLM 추천', () => {
  test('독립표본 t-검정 (LLM 추천)', async ({ page }) => {
    await navigateToUploadStep(page)
    expect(await uploadCSV(page, 't-test.csv')).toBeTruthy()
    await expect(page.locator(S.dataProfileSummary)).toBeVisible({ timeout: 15000 })

    await mockOpenRouterAPI(page, 't-test', '독립표본 t-검정')

    await goToMethodSelection(page)
    expect(
      await selectMethodViaLLM(page, '두 그룹의 평균이 다른지 비교하고 싶어요'),
    ).toBeTruthy()

    await ensureVariablesOrSkip(page, 'llm-t-test', 'group', 'value')
    await clickAnalysisRun(page)

    expect(await waitForResults(page, 120000)).toBeTruthy()
    const r = await verifyStatisticalResults(page)
    log('llm-t-test', r.details)
    expect(r.hasStatistic).toBeTruthy()
    expect(r.hasPValue).toBeTruthy()

    await expect(page.locator(S.resultsMainCard)).toBeVisible({ timeout: 5000 })
    await expect(page.locator(S.actionButtons)).toBeVisible({ timeout: 5000 })
  })
})
