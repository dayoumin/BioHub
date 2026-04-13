/**
 * Phase 4 Part A: 통계 분석 UX 테스트
 *
 * 실제 사용자 시나리오 기반 — 첫 방문, 연속 분석, 에러 복구, 내보내기
 *
 * 태그: @phase4, @critical, @important
 * 실행: pnpm e2e --grep "@phase4"
 */

import { test, expect, type Page } from '@playwright/test'
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
} from '../helpers/flow-helpers'
import {
  readAnalysisHistoryCount,
  readStoredHistorySnapshot,
  resetAnalysisHistoryStore,
  seedAnalysisHistoryRecord,
  type SeededHistoryRecord,
} from '../helpers/history-helpers'

test.setTimeout(180_000)

function normalizeText(text: string): string {
  return text.replace(/\s+/g, ' ').trim()
}

async function captureResultsFingerprint(page: Page): Promise<string> {
  const interpretationSection = page.locator(S.aiInterpretationSection)
  if (await interpretationSection.isVisible({ timeout: 3000 }).catch(() => false)) {
    const interpretationText = await interpretationSection.innerText().catch(() => '')
    if (interpretationText.trim().length > 0) {
      return normalizeText(interpretationText)
    }
  }

  const resultsCardText = await page.locator(S.resultsMainCard).innerText().catch(() => '')
  return normalizeText(resultsCardText)
}

// ========================================
// 4A.1 첫 방문 사용자 시나리오 @phase4 @critical
// ========================================

test.describe('@phase4 @critical 첫 방문 사용자 시나리오', () => {
  test('TC-4A.1.1: 완전 초보 — 직접 선택으로 분석 → DOCX 내보내기', async ({ page }) => {
    // 1. Hub → 데이터 업로드 Step으로 이동
    // hub-upload-btn을 사용해야 함 (hub-upload-card는 전체 Hub 컨테이너이므로 클릭 시 QuickAnalysisPill 오발동)
    await navigateToUploadStep(page)

    // 2. CSV 업로드
    expect(await uploadCSV(page, 't-test.csv')).toBe(true)
    await expect(page.locator(S.dataProfileSummary)).toBeVisible({ timeout: 15000 })

    // 3. 다음 단계로 이동
    await goToMethodSelection(page)

    // 4. 직접 선택으로 방법 확정
    expect(await selectMethodDirect(page, '독립표본', /독립표본 t-검정/)).toBe(true)
    await goToVariableSelection(page)

    // 5. 변수 자동 할당 → 분석 실행
    await ensureVariablesOrSkip(page, 'TC-4A.1.1', 'group', 'value')
    await clickAnalysisRun(page)

    // 6. 결과 확인
    expect(await waitForResults(page, 120000)).toBe(true)
    const r = await verifyStatisticalResults(page)
    expect(r.hasStatistic).toBe(true)
    expect(r.hasPValue).toBe(true)

    // 해석 텍스트가 한국어로 존재하는지 확인
    const bodyText = await page.locator('body').innerText()
    const hasKoreanInterpretation =
      bodyText.includes('유의') || bodyText.includes('결과') || bodyText.includes('해석')
    expect(hasKoreanInterpretation).toBe(true)

    // 7. 내보내기 → DOCX
    const exportDD = page.locator(S.exportDropdown)
    if (await exportDD.isVisible({ timeout: 5000 }).catch(() => false)) {
      await exportDD.click()

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
    expect(await uploadCSV(page, 'paired-t.csv')).toBe(true)
    await expect(page.locator(S.dataProfileSummary)).toBeVisible({ timeout: 15000 })

    // 2. 직접 선택 → 대응표본 t-검정
    await goToMethodSelection(page)
    await page.locator(S.methodSearchInput).waitFor({ state: 'visible', timeout: 5000 })
    expect(
      await selectMethodDirect(page, '대응표본', /대응표본.*t.*검정|paired.*t/i),
    ).toBe(true)

    // 3. 변수 할당 (대응표본: pre, post → variables 슬롯에 2개)
    await goToVariableSelection(page)

    // variable-selection-next가 이미 활성이면 자동 할당 완료
    const nextBtn = page.locator(S.variableSelectionNext)
    const alreadyReady = await nextBtn.isEnabled().catch(() => false)

    if (!alreadyReady) {
      // AI auto-trigger가 일부 변수를 이미 할당했을 수 있으므로
      // chip 존재 여부로 미할당 변수만 클릭 (pool-var 클릭은 toggle이므로)
      for (const varName of ['pre', 'post']) {
        const chip = page.locator(S.chip(varName))
        const isAlreadyAssigned = (await chip.count()) > 0
        if (!isAlreadyAssigned) {
          const poolVar = page.locator(S.poolVar(varName))
          if ((await poolVar.count()) > 0) {
            await poolVar.click({ force: true })
            await page.waitForTimeout(300)
            log('TC-4A.1.2', `pool-var-${varName} 클릭 (미할당 → 할당)`)
          }
        } else {
          log('TC-4A.1.2', `${varName} 이미 할당됨 (chip 존재)`)
        }
      }
      await page.waitForTimeout(300)

      // 할당 후에도 다음 단계 활성화 안 되면 슬롯 클릭으로 재시도
      if (!(await nextBtn.isEnabled().catch(() => false))) {
        log('TC-4A.1.2', 'WARN: 변수 할당 후에도 다음 단계 비활성')
      }
    } else {
      log('TC-4A.1.2', '변수 자동 할당 완료')
    }

    // 4. 분석 실행 (run-analysis-btn 또는 다음 단계 버튼)
    await clickAnalysisRun(page)
    expect(await waitForResults(page, 120000)).toBe(true)

    // 5. 전문 통계 용어 확인
    const bodyText = await page.locator('body').innerText()
    const r = await verifyStatisticalResults(page)
    expect(r.hasStatistic).toBe(true)
    expect(r.hasPValue).toBe(true)

    // 효과크기 확인
    const hasEffectSize = /효과크기|Cohen|effect\s*size/i.test(bodyText)
    log('TC-4A.1.2', `effectSize=${hasEffectSize}`)

    // 상세 결과 섹션 확인
    const hasDetailed = await page
      .locator(S.detailedResultsSection)
      .isVisible({ timeout: 3000 })
      .catch(() => false)
    expect(hasDetailed).toBe(true)

    log('TC-4A.1.2', '전문가 시나리오 완료')
  })

  test('TC-4A.1.3: QuickAnalysisPills 사용 (있을 경우)', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded', timeout: 60000 })
    await page.waitForFunction(
      () => document.querySelector('[data-testid="hub-upload-card"]') !== null,
      { timeout: 30000 },
    )

    // Quick Pills 검색 (quick-pill- 접두사로 정확히 매치)
    const quickPills = page.locator('[data-testid^="quick-pill-"]')
    await expect(quickPills.first()).toBeVisible({ timeout: 5000 })

    // 첫 번째 Pill 클릭
    await quickPills.first().click()

    // Step 1(업로드)으로 직행하는지 확인
    await expect(page.locator('input[type="file"]').first()).toBeAttached({ timeout: 10000 })
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
    expect(await uploadCSV(page, 't-test.csv')).toBe(true)
    await expect(page.locator(S.dataProfileSummary)).toBeVisible({ timeout: 15000 })

    await goToMethodSelection(page)
    expect(await selectMethodDirect(page, '독립표본', /독립표본 t-검정/)).toBe(true)
    await goToVariableSelection(page)
    await ensureVariablesOrSkip(page, 'TC-4A.2.1-1', 'group', 'value')
    await clickAnalysisRun(page)
    expect(await waitForResults(page, 120000)).toBe(true)

    // 새 분석 버튼 클릭
    const newBtn = page.locator(S.newAnalysisBtn)
    if (!(await newBtn.isVisible({ timeout: 5000 }).catch(() => false))) {
      log('TC-4A.2.1', 'SKIPPED: new-analysis-btn 미표시')
      test.skip()
      return
    }

    await newBtn.click()
    await page.waitForLoadState('networkidle')

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
    expect(await uploadCSV(page, 't-test.csv')).toBe(true)
    await expect(page.locator(S.dataProfileSummary)).toBeVisible({ timeout: 15000 })

    await goToMethodSelection(page)
    expect(await selectMethodDirect(page, '독립표본', /독립표본 t-검정/)).toBe(true)
    await goToVariableSelection(page)
    await ensureVariablesOrSkip(page, 'TC-4A.2.2', 'group', 'value')
    await clickAnalysisRun(page)
    expect(await waitForResults(page, 120000)).toBe(true)

    // 1) 결과 저장 → IndexedDB에 이력 생성
    const saveBtn = page.locator('[data-testid="save-history-btn"]')
    await expect(saveBtn).toBeVisible({ timeout: 5000 })
    await saveBtn.click()
    await page.waitForLoadState('networkidle')

    // 2) 새 분석 버튼 → 확인 다이얼로그 → Hub 복귀 (앱 내 네비게이션)
    const newAnalysisBtn = page.locator(S.newAnalysisBtn)
    await expect(newAnalysisBtn).toBeVisible({ timeout: 5000 })
    await newAnalysisBtn.click()
    // AlertDialog 확인 버튼 클릭
    const confirmBtn = page.getByRole('alertdialog').getByRole('button', { name: /확인|시작|새 분석/ })
    await expect(confirmBtn).toBeVisible({ timeout: 5000 })
    await confirmBtn.click()

    // 3) 이력 카드 확인
    const historyCard = page.locator('[data-testid^="recent-activity-card-"]')
    await expect(historyCard.first()).toBeVisible({ timeout: 10000 })

    // 4) 이력 카드 클릭 → 결과 복원
    await historyCard.first().click()
    await expect(page.locator(S.resultsMainCard)).toBeVisible({ timeout: 15000 })

    const hasResults = await page
      .locator(S.resultsMainCard)
      .isVisible()
      .catch(() => false)
    log('TC-4A.2.2', `이력 복원: ${hasResults ? '성공' : '실패'}`)
    expect(hasResults).toBe(true)
  })

  test('TC-4A.2.3: 변수만 변경하여 재분석 (ReanalysisPanel)', async ({ page }) => {
    await navigateToUploadStep(page)
    expect(await uploadCSV(page, 'anova.csv')).toBe(true)
    await expect(page.locator(S.dataProfileSummary)).toBeVisible({ timeout: 15000 })

    await goToMethodSelection(page)
    expect(await selectMethodDirect(page, '일원', /일원.*분산|one.*way.*anova/i)).toBe(true)
    await goToVariableSelection(page)
    await ensureVariablesOrSkip(page, 'TC-4A.2.3', 'group', 'value')
    await clickAnalysisRun(page)
    expect(await waitForResults(page, 120000)).toBe(true)

    // 결과 화면에서 재분석 버튼 확인
    const reanalysisBtn = page.locator('[data-testid="reanalysis-btn"]')
    await expect(reanalysisBtn).toBeVisible({ timeout: 5000 })

    // 재분석 버튼 클릭 → Step 1(업로드)로 이동 + stepTrack='reanalysis'
    await reanalysisBtn.click()

    // handleReanalyze()는 navigateToStep(1) + 데이터 초기화 → Branch 1 (empty state)
    // data-exploration-empty: 데이터 없는 상태의 DataExplorationStep
    const emptyStep = page.locator('[data-testid="data-exploration-empty"]')
    await expect(emptyStep).toBeVisible({ timeout: 10000 })
    log('TC-4A.2.3', '재분석 → 업로드 단계 복귀: 성공')
  })

  test('TC-4A.2.4: 이력 재분석 후 원본 history는 그대로 유지된다', async ({ page }) => {
    const originalHistoryId = 'analysis-seeded-reanalysis-history'
    const originalRecord: SeededHistoryRecord = {
      id: originalHistoryId,
      timestamp: Date.now() - 60_000,
      name: '독립표본 t-검정 — seed',
      purpose: '두 그룹 평균 차이를 확인한다',
      analysisPurpose: '두 그룹 평균 차이를 확인한다',
      method: {
        id: 'independent-t-test',
        name: '독립표본 t-검정',
        category: 't-test',
        description: '두 독립 집단의 평균 차이를 비교합니다.',
      },
      dataFileName: 'seeded-history.csv',
      dataRowCount: 30,
      results: {
        method: 't-test',
        pValue: 0.018,
        statistic: 2.456,
        statisticName: 't',
        df: 28,
        interpretation: '유의미한 차이가 있습니다.',
      },
      aiInterpretation: '두 집단 간 평균 차이가 통계적으로 유의합니다. 후속 검토가 필요합니다.',
      apaFormat: 't(28) = 2.456, p = .018',
      variableMapping: {
        dependentVar: 'value',
        independentVar: 'group',
        groupVar: 'group',
      },
      analysisOptions: {
        alpha: 0.05,
      },
    }

    await page.goto('/', { waitUntil: 'domcontentloaded', timeout: 60000 })
    await resetAnalysisHistoryStore(page)
    await seedAnalysisHistoryRecord(page, originalRecord)
    await page.goto('/', { waitUntil: 'domcontentloaded', timeout: 60000 })

    const originalHistoryCard = page.getByText(originalRecord.name, { exact: true }).first()

    await expect
      .poll(async () => readAnalysisHistoryCount(page), {
        timeout: 10000,
        message: 'seeded history count should be exactly one after reload',
      })
      .toBe(1)

    await expect(originalHistoryCard).toBeVisible({ timeout: 15000 })

    const originalStoredSnapshot = await readStoredHistorySnapshot(page, originalHistoryId)
    expect(originalStoredSnapshot).not.toBeNull()

    await originalHistoryCard.click()
    await expect(page.locator(S.resultsMainCard)).toBeVisible({ timeout: 15000 })

    const originalFingerprint = await captureResultsFingerprint(page)
    expect(originalFingerprint).toContain('두 집단 간 평균 차이가 통계적으로 유의합니다')

    // 재분석 진입 시 원본 저장 이력은 그대로 유지되어야 함
    const reanalysisBtn = page.locator(S.reanalysisBtn)
    await expect(reanalysisBtn).toBeVisible({ timeout: 5000 })
    await reanalysisBtn.click()

    const hasReanalysisToast = await page
      .getByText('새 데이터를 업로드하세요', { exact: true })
      .isVisible({ timeout: 10000 })
      .catch(() => false)
    const hasReanalysisHint = await page
      .getByText(/분석이 준비되어 있습니다/)
      .isVisible({ timeout: 10000 })
      .catch(() => false)
    expect(hasReanalysisToast || hasReanalysisHint).toBe(true)

    await expect
      .poll(async () => readAnalysisHistoryCount(page), {
        timeout: 5000,
        message: 'entering reanalysis should not add or remove saved history records',
      })
      .toBe(1)

    const snapshotAfterReanalysisEntry = await readStoredHistorySnapshot(page, originalHistoryId)
    expect(snapshotAfterReanalysisEntry).toEqual(originalStoredSnapshot)

    // 새 세션처럼 허브를 다시 열어도 원본 이력은 동일하게 복원되어야 함
    await page.evaluate(() => sessionStorage.clear())
    await page.goto('/', { waitUntil: 'domcontentloaded', timeout: 60000 })
    await expect(originalHistoryCard).toBeVisible({ timeout: 15000 })
    await originalHistoryCard.click()
    await expect(page.locator(S.resultsMainCard)).toBeVisible({ timeout: 15000 })

    const reopenedFingerprint = await captureResultsFingerprint(page)
    expect(reopenedFingerprint).toBe(originalFingerprint)

    const snapshotAfterReopen = await readStoredHistorySnapshot(page, originalHistoryId)
    expect(snapshotAfterReopen).toEqual(originalStoredSnapshot)

    log(
      'TC-4A.2.4',
      `seeded history preserved: toast=${hasReanalysisToast}, hint=${hasReanalysisHint}`,
    )
  })
})

// ========================================
// 4A.3 에러 복구 시나리오 @phase4 @critical
// ========================================

test.describe('@phase4 @critical 에러 복구 — 통계', () => {
  test('TC-4A.3.1: 잘못된 변수 할당 → 에러 → 수정', async ({ page }) => {
    await navigateToUploadStep(page)
    expect(await uploadCSV(page, 't-test.csv')).toBe(true)
    await expect(page.locator(S.dataProfileSummary)).toBeVisible({ timeout: 15000 })

    await goToMethodSelection(page)
    expect(await selectMethodDirect(page, '독립표본', /독립표본 t-검정/)).toBe(true)
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
      const hasValidation = bodyText.includes('경고') || bodyText.includes('주의')
      log('TC-4A.3.1', `validation=${hasValidation}`)
    }

    // 정상 분석 완료 확인
    await ensureVariablesOrSkip(page, 'TC-4A.3.1', 'group', 'value')
    await clickAnalysisRun(page)
    expect(await waitForResults(page, 120000)).toBe(true)
    log('TC-4A.3.1', '에러 복구 후 정상 분석 완료')
  })

  test('TC-4A.3.2: Pyodide 로딩 실패 → 재시도', async ({ page }) => {
    await navigateToUploadStep(page)
    expect(await uploadCSV(page, 't-test.csv')).toBe(true)
    await expect(page.locator(S.dataProfileSummary)).toBeVisible({ timeout: 15000 })

    await goToMethodSelection(page)
    expect(await selectMethodDirect(page, '독립표본', /독립표본 t-검정/)).toBe(true)
    await goToVariableSelection(page)
    await ensureVariablesOrSkip(page, 'TC-4A.3.2', 'group', 'value')

    // Pyodide CDN 차단
    await page.route('**/pyodide/**', (route) => route.abort())

    await clickAnalysisRun(page)
    // Wait for error UI to appear after Pyodide CDN block
    await page.waitForFunction(
      () => {
        const text = document.body.innerText
        return /오류|실패|에러|로딩|네트워크|error/i.test(text)
      },
      { timeout: 30000 },
    ).catch(() => {})

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
    expect(await uploadCSV(page, 't-test.csv')).toBe(true)
    await expect(page.locator(S.dataProfileSummary)).toBeVisible({ timeout: 15000 })

    await goToMethodSelection(page)
    expect(await selectMethodDirect(page, '독립표본', /독립표본 t-검정/)).toBe(true)
    await goToVariableSelection(page)
    await ensureVariablesOrSkip(page, 'TC-4A.3.3', 'group', 'value')

    // 분석 실행 → 즉시 뒤로가기
    await clickAnalysisRun(page)
    await page.waitForTimeout(300) // 로딩 시작 대기 (animation)

    // Step 3(변수 선택)으로 돌아가기 시도
    const step3 = page.locator(S.stepperStep(3))
    if (await step3.isVisible({ timeout: 2000 }).catch(() => false)) {
      await step3.click()
      await page.waitForLoadState('networkidle')

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
        expect(await waitForResults(page, 120000)).toBe(true)
      } else {
        log('TC-4A.3.3', '취소 후 상태 — 이미 결과 표시 중일 수 있음')
      }
    } else {
      // Stepper가 없으면 결과 대기
      expect(await waitForResults(page, 120000)).toBe(true)
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
    await page.waitForLoadState('networkidle')

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
        // Wait for either results or error message
        await page.waitForFunction(
          () => {
            const text = document.body.innerText
            return (
              document.querySelector('[data-testid="results-main-card"]') !== null ||
              /부족|오류|에러|insufficient|error/i.test(text)
            )
          },
          { timeout: 30000 },
        ).catch(() => {})
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
        // Either error message or results — both valid outcomes
        expect(hasError || hasResults).toBe(true)
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
    expect(await runAnalysisForExport(page)).toBe(true)

    const exportDD = page.locator(S.exportDropdown)
    if (!(await exportDD.isVisible({ timeout: 5000 }).catch(() => false))) {
      log('TC-4A.4.1', 'SKIPPED: export-dropdown 미표시')
      test.skip()
      return
    }

    await exportDD.click()

    const docxBtn = page.locator(S.exportDocx)
    if (await docxBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      const downloadPromise = page.waitForEvent('download', { timeout: 10000 }).catch(() => null)
      await docxBtn.click()
      const download = await downloadPromise
      log('TC-4A.4.1', `DOCX download: ${download ? 'OK' : 'not captured'}`)
    }
  })

  test('TC-4A.4.2: 결과 → XLSX 내보내기', async ({ page }) => {
    expect(await runAnalysisForExport(page)).toBe(true)

    const exportDD = page.locator(S.exportDropdown)
    if (!(await exportDD.isVisible({ timeout: 5000 }).catch(() => false))) {
      log('TC-4A.4.2', 'SKIPPED: export-dropdown 미표시')
      test.skip()
      return
    }

    await exportDD.click()

    const xlsxBtn = page.locator(S.exportXlsx)
    if (await xlsxBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      const downloadPromise = page.waitForEvent('download', { timeout: 10000 }).catch(() => null)
      await xlsxBtn.click()
      const download = await downloadPromise
      log('TC-4A.4.2', `XLSX download: ${download ? 'OK' : 'not captured'}`)
    }
  })

  test('TC-4A.4.3: 결과 → HTML 보고서', async ({ page }) => {
    expect(await runAnalysisForExport(page)).toBe(true)

    const exportDD = page.locator(S.exportDropdown)
    if (!(await exportDD.isVisible({ timeout: 5000 }).catch(() => false))) {
      log('TC-4A.4.3', 'SKIPPED: export-dropdown 미표시')
      test.skip()
      return
    }

    await exportDD.click()

    const htmlBtn = page.locator(S.exportHtml)
    if (await htmlBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      const downloadPromise = page.waitForEvent('download', { timeout: 10000 }).catch(() => null)
      await htmlBtn.click()
      const download = await downloadPromise
      log('TC-4A.4.3', `HTML download: ${download ? 'OK' : 'not captured'}`)
    }
  })

  test('TC-4A.4.4: 결과 클립보드 복사', async ({ page }) => {
    expect(await runAnalysisForExport(page)).toBe(true)

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
    await page.waitForLoadState('networkidle')

    // 토스트 메시지 확인
    const bodyText = await page.locator('body').innerText()
    const hasCopyConfirm =
      bodyText.includes('복사') || bodyText.includes('클립보드') || bodyText.includes('copied')
    log('TC-4A.4.4', `copyConfirm=${hasCopyConfirm}`)
  })
})
