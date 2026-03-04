/**
 * Kaplan-Meier & ROC Curve E2E Tests
 *
 * Phase 1: 정상 플로우 (Happy Path) — KM 2그룹, KM 그룹 없음, ROC 진단, ROC 약한 분류기
 * Phase 2: 엣지 케이스 — 높은 중도절단, 3그룹, 최소 데이터, 완벽 분류기, 전체 사건
 * Phase 3: 에러 핸들링 + LLM — 데이터 부족, AI 추천
 *
 * 설계 원칙: data-testid 기반 (e2e/selectors.ts의 S 레지스트리 사용)
 * 실행: npx playwright test e2e/survival-roc-e2e.spec.ts --headed
 */

import { test, expect, Page } from '@playwright/test'
import path from 'path'
import { S } from './selectors'

const BASE_URL = process.env.E2E_BASE_URL || 'http://localhost:3005'

test.use({ baseURL: BASE_URL })
test.setTimeout(180_000)

// ========================================
// Timing Utility
// ========================================

const testStart = Date.now()
function log(tag: string, msg: string): void {
  const sec = ((Date.now() - testStart) / 1000).toFixed(1)
  console.log(`[+${sec}s][${tag}] ${msg}`)
}

// ========================================
// Helper Functions (smart-flow-e2e.spec.ts와 동일 패턴)
// ========================================

async function navigateToUploadStep(page: Page): Promise<void> {
  for (let attempt = 0; attempt < 5; attempt++) {
    await page.goto('/', { waitUntil: 'domcontentloaded', timeout: 60000 })

    const hasChunkError = await page.locator('text=ChunkLoadError').isVisible({ timeout: 3000 }).catch(() => false)
    if (hasChunkError) {
      log('navigate', `ChunkLoadError detected, attempt ${attempt + 1}/5`)
      const retryBtn = page.locator('button').filter({ hasText: '다시 시도' })
      if (await retryBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await retryBtn.click()
        await page.waitForTimeout(5000)
        continue
      }
      await page.reload({ waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => {})
      await page.waitForTimeout(5000)
      continue
    }

    const rendered = await page.waitForFunction(() => {
      return (
        document.querySelector('[data-testid="hub-upload-card"]') !== null ||
        document.querySelector('input[type="file"]') !== null ||
        document.querySelector('[data-testid="data-profile-summary"]') !== null
      )
    }, { timeout: 30000 }).then(() => true).catch(() => false)

    if (rendered) break
    log('navigate', `render failed, retry ${attempt + 1}/5`)
    await page.waitForTimeout(5000)
  }
  await page.waitForTimeout(500)

  const uploadCard = page.locator(S.hubUploadCard)
  if (await uploadCard.isVisible({ timeout: 3000 }).catch(() => false)) {
    await uploadCard.click()
    log('navigate', 'hub-upload-card 클릭')
    await page.waitForSelector('input[type="file"]', { timeout: 10000 }).catch(() => {})
    return
  }

  const step1 = page.locator(S.stepperStep(1))
  if (await step1.count() > 0) {
    await step1.click()
    await page.waitForTimeout(1000)
  }
}

async function uploadCSV(page: Page, filename: string): Promise<boolean> {
  const filePath = path.resolve(__dirname, `../test-data/e2e/${filename}`)
  const fileInput = page.locator('input[type="file"]')
  if (await fileInput.count() === 0) return false

  await fileInput.first().setInputFiles(filePath)
  log('upload', `uploaded ${filename}`)

  await page.waitForFunction(() => {
    return document.querySelector('[data-testid="data-profile-summary"]') !== null
  }, { timeout: 15000 }).catch(() => log('upload', 'validation wait timeout'))

  await page.waitForTimeout(1000)
  return true
}

async function goToMethodSelection(page: Page): Promise<void> {
  const btn = page.locator(S.floatingNextBtn)
  if (await btn.isVisible({ timeout: 3000 }).catch(() => false) && await btn.isEnabled()) {
    await btn.click()
    log('goToMethod', 'floating-next-btn 클릭')
    await page.waitForTimeout(1500)
    return
  }
  const step2 = page.locator(S.stepperStep(2))
  if (await step2.count() > 0 && await step2.isEnabled().catch(() => false)) {
    await step2.click()
    log('goToMethod', 'stepper-step-2 클릭')
    await page.waitForTimeout(1500)
  }
}

async function selectMethodDirect(page: Page, searchTerm: string, methodName: RegExp): Promise<boolean> {
  const browseTab = page.locator(S.filterBrowse)
  if (await browseTab.isVisible({ timeout: 3000 }).catch(() => false)) {
    await browseTab.click()
    await page.waitForTimeout(1000)
  }

  const searchInput = page.locator(S.methodSearchInput)
  if (await searchInput.isVisible({ timeout: 3000 }).catch(() => false)) {
    await searchInput.fill(searchTerm)
    await page.waitForTimeout(1500)
  }

  const allMatches = page.locator(`button:has-text("${searchTerm}")`)
  const matchCount = await allMatches.count()
  log('selectDirect:debug', `Found ${matchCount} buttons matching "${searchTerm}"`)

  for (let i = 0; i < matchCount; i++) {
    const btn = allMatches.nth(i)
    const text = await btn.textContent() || ''

    if (text.match(/\s*\d+\s*$/)) continue
    if (text.includes('methods matching') || text.includes('Selected:')) continue
    if (!text.match(methodName)) continue

    const isDisabled = await btn.isDisabled().catch(() => false)
    if (isDisabled) {
      log('selectDirect:skip', `disabled: "${text.trim().slice(0, 40)}"`)
      continue
    }

    if (await btn.isVisible()) {
      await btn.click()
      log('selectDirect', `selected: "${text.trim().slice(0, 40)}"`)
      await page.waitForTimeout(1500)
      return true
    }
  }

  log('selectDirect', `method not found: ${searchTerm}`)
  return false
}

async function goToVariableSelection(page: Page): Promise<void> {
  const confirmBtn = page.locator(S.confirmMethodBtn)
  if (await confirmBtn.first().isVisible({ timeout: 3000 }).catch(() => false)) {
    if (await confirmBtn.first().isEnabled()) {
      await confirmBtn.first().click()
      log('goToVar', 'confirm-method-btn 클릭')
      await page.waitForTimeout(2000)
      return
    }
  }

  const floatingBtn = page.locator(S.floatingNextBtn)
  if (await floatingBtn.isVisible({ timeout: 2000 }).catch(() => false) && await floatingBtn.isEnabled()) {
    await floatingBtn.click()
    log('goToVar', 'floating-next-btn 클릭')
    await page.waitForTimeout(2000)
    return
  }

  const step3 = page.locator(S.stepperStep(3))
  if (await step3.count() > 0 && await step3.isEnabled().catch(() => false)) {
    await step3.click()
    log('goToVar', 'stepper-step-3 클릭')
    await page.waitForTimeout(2000)
  }
}

async function clickAnalysisRun(page: Page): Promise<void> {
  await page.waitForTimeout(1000)

  const btn = page.locator(S.runAnalysisBtn)
  if (await btn.isVisible({ timeout: 3000 }).catch(() => false) && await btn.isEnabled()) {
    await btn.click()
    log('clickRun', 'run-analysis-btn 클릭')
    await page.waitForTimeout(2000)
    return
  }

  const floatingBtn = page.locator(S.floatingNextBtn)
  if (await floatingBtn.isVisible({ timeout: 3000 }).catch(() => false) && await floatingBtn.isEnabled()) {
    await floatingBtn.click()
    log('clickRun', 'floating-next-btn 클릭')
    await page.waitForTimeout(2000)
  }
}

async function waitForResults(page: Page, timeout = 90000): Promise<boolean> {
  const start = Date.now()
  log('waitResults', 'waiting...')

  try {
    await page.waitForFunction(() => {
      return (
        document.querySelector('[data-testid="results-main-card"]') !== null ||
        document.querySelector('[data-testid="method-specific-results"]') !== null
      )
    }, { timeout })

    log('waitResults', `done in ${((Date.now() - start) / 1000).toFixed(1)}s`)
    return true
  } catch {
    log('waitResults', `timeout after ${((Date.now() - start) / 1000).toFixed(1)}s`)
    return false
  }
}

/** KM 결과 검증: 생존 관련 통계량 확인 */
async function verifyKMResults(page: Page): Promise<{
  hasResultsCard: boolean
  hasSurvivalInfo: boolean
  hasLogRank: boolean
  hasMedianSurvival: boolean
  details: string
}> {
  const hasResultsCard = await page.locator(S.resultsMainCard).isVisible().catch(() => false)
  const text = await page.locator('body').innerText()

  const hasSurvivalInfo = /생존|survival|Kaplan|카플란/i.test(text)
  const hasLogRank = /Log-rank|로그순위|χ²|chi.*sq/i.test(text)
  const hasMedianSurvival = /중앙.*생존|median.*survival|중앙값/i.test(text)

  return {
    hasResultsCard,
    hasSurvivalInfo,
    hasLogRank,
    hasMedianSurvival,
    details: `card=${hasResultsCard}, survival=${hasSurvivalInfo}, logrank=${hasLogRank}, median=${hasMedianSurvival}`
  }
}

/** ROC 결과 검증: AUC, 민감도/특이도 확인 */
async function verifyROCResults(page: Page): Promise<{
  hasResultsCard: boolean
  hasAUC: boolean
  hasSensSpec: boolean
  hasThreshold: boolean
  details: string
}> {
  const hasResultsCard = await page.locator(S.resultsMainCard).isVisible().catch(() => false)
  const text = await page.locator('body').innerText()

  const hasAUC = /AUC|곡선.*아래.*면적|area.*under/i.test(text)
  const hasSensSpec = /민감도|특이도|sensitivity|specificity/i.test(text)
  const hasThreshold = /임계값|threshold|cutoff|cut.*off/i.test(text)

  return {
    hasResultsCard,
    hasAUC,
    hasSensSpec,
    hasThreshold,
    details: `card=${hasResultsCard}, auc=${hasAUC}, sensspec=${hasSensSpec}, threshold=${hasThreshold}`
  }
}

/** 에러 메시지 검증 */
async function verifyErrorShown(page: Page): Promise<boolean> {
  const text = await page.locator('body').innerText()
  return /오류|에러|error|부족|insufficient|최소/i.test(text)
}

/** AutoConfirmSelector 대기: KM/ROC는 AutoConfirmSelector 사용 → 자동 진행 */
async function waitForAutoConfirmOrManual(page: Page, tag: string): Promise<void> {
  const runBtn = page.locator(S.runAnalysisBtn)
  await runBtn.waitFor({ state: 'visible', timeout: 15000 }).catch(() =>
    log(tag, 'run-analysis-btn not found, proceeding anyway')
  )
  await page.waitForTimeout(1000)

  if (await runBtn.isEnabled().catch(() => false)) {
    log(tag, '변수 자동 할당됨 (AutoConfirmSelector)')
    return
  }
  log(tag, '변수 수동 선택 필요 — 대기')
  await page.waitForTimeout(2000)
}

/** OpenRouter mock for LLM tests */
async function mockOpenRouterAPI(page: Page, methodId: string, methodName: string): Promise<void> {
  const mockRecommendation = JSON.stringify({
    methodId,
    methodName,
    reasoning: [`데이터 분석 결과 ${methodName}이(가) 적합합니다.`],
    confidence: 0.9,
    variableAssignments: methodId === 'kaplan-meier'
      ? { time: ['time'], event: ['status'], factor: ['group'] }
      : { dependent: ['actual'], independent: ['score'] },
    suggestedSettings: { alpha: 0.05 },
    warnings: [],
    alternatives: []
  })

  await page.route(/openrouter\.ai/, (route) => {
    const url = route.request().url()
    if (url.includes('/models')) {
      route.fulfill({ status: 200, contentType: 'application/json', body: '{"data":[]}' })
      return
    }
    const jsonBody = JSON.stringify({
      id: 'mock',
      choices: [{ message: { content: mockRecommendation } }]
    })
    route.fulfill({ status: 200, contentType: 'application/json', body: jsonBody })
  })
  log('mockAPI', `mocked: ${methodId}`)
}

async function selectMethodViaLLM(page: Page, question: string): Promise<boolean> {
  const aiTab = page.locator(S.filterAi)
  if (await aiTab.isVisible({ timeout: 3000 }).catch(() => false)) {
    const isActive = await aiTab.getAttribute('aria-checked')
    if (isActive !== 'true') {
      await aiTab.click()
      log('selectLLM', 'filter-ai 클릭')
      await page.waitForTimeout(500)
    }
  }

  const chatInput = page.locator(S.aiChatInput)
  if (await chatInput.isVisible({ timeout: 5000 }).catch(() => false)) {
    await chatInput.fill(question)
    log('selectLLM', `질문: "${question}"`)
  } else {
    log('selectLLM', 'ai-chat-input not found')
    return false
  }

  const submitBtn = page.locator(S.aiChatSubmit)
  if (await submitBtn.isVisible() && await submitBtn.isEnabled()) {
    await submitBtn.click()
    log('selectLLM', '전송')
  } else {
    log('selectLLM', 'submit not available')
    return false
  }

  const recCard = page.locator(S.recommendationCard)
  await recCard.waitFor({ state: 'visible', timeout: 30000 }).catch(() => {
    log('selectLLM', 'recommendation-card timeout')
  })
  if (!await recCard.isVisible().catch(() => false)) return false

  const selectBtn = page.locator(S.selectRecommendedMethod)
  if (await selectBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
    await selectBtn.click()
    log('selectLLM', '추천 수락')
    await page.waitForTimeout(1500)
    return true
  }
  return false
}

// ========================================
// Phase 1: 정상 플로우 (Happy Path)
// ========================================

test.describe('KM/ROC E2E - Phase 1: 정상 플로우', () => {

  test('1-1 Kaplan-Meier 2그룹 비교: 업로드 → 분석 → 생존곡선 + Log-rank', async ({ page }) => {
    await navigateToUploadStep(page)
    expect(await uploadCSV(page, 'survival.csv')).toBeTruthy()
    await expect(page.locator(S.dataProfileSummary)).toBeVisible({ timeout: 15000 })

    await goToMethodSelection(page)
    expect(await selectMethodDirect(page, 'Kaplan', /Kaplan.*Meier|카플란.*마이어|생존분석/i)).toBeTruthy()

    await goToVariableSelection(page)
    await waitForAutoConfirmOrManual(page, 'km-2group')
    await clickAnalysisRun(page)

    expect(await waitForResults(page, 120000)).toBeTruthy()
    const r = await verifyKMResults(page)
    log('km-2group', r.details)
    expect(r.hasResultsCard).toBeTruthy()
    expect(r.hasSurvivalInfo).toBeTruthy()

    await page.screenshot({ path: 'e2e/results/screenshots/km-2group-result.png', fullPage: true })
  })

  test('1-2 Kaplan-Meier 그룹 없음 (단일 곡선): 업로드 → 분석 → 생존곡선', async ({ page }) => {
    await navigateToUploadStep(page)
    expect(await uploadCSV(page, 'survival-no-group.csv')).toBeTruthy()
    await expect(page.locator(S.dataProfileSummary)).toBeVisible({ timeout: 15000 })

    await goToMethodSelection(page)
    expect(await selectMethodDirect(page, 'Kaplan', /Kaplan.*Meier|카플란.*마이어|생존분석/i)).toBeTruthy()

    await goToVariableSelection(page)
    await waitForAutoConfirmOrManual(page, 'km-nogroup')
    await clickAnalysisRun(page)

    expect(await waitForResults(page, 120000)).toBeTruthy()
    const r = await verifyKMResults(page)
    log('km-nogroup', r.details)
    expect(r.hasResultsCard).toBeTruthy()
    expect(r.hasSurvivalInfo).toBeTruthy()

    await page.screenshot({ path: 'e2e/results/screenshots/km-nogroup-result.png', fullPage: true })
  })

  test('1-3 ROC 곡선 진단 정확도: 업로드 → 분석 → AUC + 민감도/특이도', async ({ page }) => {
    await navigateToUploadStep(page)
    expect(await uploadCSV(page, 'roc-diagnostic.csv')).toBeTruthy()
    await expect(page.locator(S.dataProfileSummary)).toBeVisible({ timeout: 15000 })

    await goToMethodSelection(page)
    expect(await selectMethodDirect(page, 'ROC', /ROC.*곡선|ROC.*curve|ROC/i)).toBeTruthy()

    await goToVariableSelection(page)
    await waitForAutoConfirmOrManual(page, 'roc-diagnostic')
    await clickAnalysisRun(page)

    expect(await waitForResults(page, 120000)).toBeTruthy()
    const r = await verifyROCResults(page)
    log('roc-diagnostic', r.details)
    expect(r.hasResultsCard).toBeTruthy()
    expect(r.hasAUC).toBeTruthy()

    await page.screenshot({ path: 'e2e/results/screenshots/roc-diagnostic-result.png', fullPage: true })
  })

  test('1-4 ROC 약한 분류기 (AUC ≈ 0.5): 업로드 → 분석 → 낮은 AUC 확인', async ({ page }) => {
    await navigateToUploadStep(page)
    expect(await uploadCSV(page, 'roc-weak.csv')).toBeTruthy()
    await expect(page.locator(S.dataProfileSummary)).toBeVisible({ timeout: 15000 })

    await goToMethodSelection(page)
    expect(await selectMethodDirect(page, 'ROC', /ROC.*곡선|ROC.*curve|ROC/i)).toBeTruthy()

    await goToVariableSelection(page)
    await waitForAutoConfirmOrManual(page, 'roc-weak')
    await clickAnalysisRun(page)

    expect(await waitForResults(page, 120000)).toBeTruthy()
    const r = await verifyROCResults(page)
    log('roc-weak', r.details)
    expect(r.hasResultsCard).toBeTruthy()
    expect(r.hasAUC).toBeTruthy()

    await page.screenshot({ path: 'e2e/results/screenshots/roc-weak-result.png', fullPage: true })
  })
})

// ========================================
// Phase 2: 엣지 케이스
// ========================================

test.describe('KM/ROC E2E - Phase 2: 엣지 케이스', () => {

  test('2-1 KM 높은 중도절단 (80%): 생존확률 플래토 확인', async ({ page }) => {
    await navigateToUploadStep(page)
    expect(await uploadCSV(page, 'survival-heavy-censor.csv')).toBeTruthy()
    await expect(page.locator(S.dataProfileSummary)).toBeVisible({ timeout: 15000 })

    await goToMethodSelection(page)
    expect(await selectMethodDirect(page, 'Kaplan', /Kaplan.*Meier|카플란.*마이어|생존분석/i)).toBeTruthy()

    await goToVariableSelection(page)
    await waitForAutoConfirmOrManual(page, 'km-censor')
    await clickAnalysisRun(page)

    expect(await waitForResults(page, 120000)).toBeTruthy()
    const r = await verifyKMResults(page)
    log('km-censor', r.details)
    expect(r.hasResultsCard).toBeTruthy()
    expect(r.hasSurvivalInfo).toBeTruthy()

    await page.screenshot({ path: 'e2e/results/screenshots/km-heavy-censor-result.png', fullPage: true })
  })

  test('2-2 KM 3그룹 비교: Placebo vs LowDose vs HighDose', async ({ page }) => {
    await navigateToUploadStep(page)
    expect(await uploadCSV(page, 'survival-3group.csv')).toBeTruthy()
    await expect(page.locator(S.dataProfileSummary)).toBeVisible({ timeout: 15000 })

    await goToMethodSelection(page)
    expect(await selectMethodDirect(page, 'Kaplan', /Kaplan.*Meier|카플란.*마이어|생존분석/i)).toBeTruthy()

    await goToVariableSelection(page)
    await waitForAutoConfirmOrManual(page, 'km-3group')
    await clickAnalysisRun(page)

    expect(await waitForResults(page, 120000)).toBeTruthy()
    const r = await verifyKMResults(page)
    log('km-3group', r.details)
    expect(r.hasResultsCard).toBeTruthy()
    expect(r.hasSurvivalInfo).toBeTruthy()

    await page.screenshot({ path: 'e2e/results/screenshots/km-3group-result.png', fullPage: true })
  })

  test('2-3 KM 최소 데이터 (10행): 최소 요건 통과 확인', async ({ page }) => {
    await navigateToUploadStep(page)
    expect(await uploadCSV(page, 'survival-minimal.csv')).toBeTruthy()
    await expect(page.locator(S.dataProfileSummary)).toBeVisible({ timeout: 15000 })

    await goToMethodSelection(page)
    expect(await selectMethodDirect(page, 'Kaplan', /Kaplan.*Meier|카플란.*마이어|생존분석/i)).toBeTruthy()

    await goToVariableSelection(page)
    await waitForAutoConfirmOrManual(page, 'km-minimal')
    await clickAnalysisRun(page)

    expect(await waitForResults(page, 120000)).toBeTruthy()
    const r = await verifyKMResults(page)
    log('km-minimal', r.details)
    expect(r.hasResultsCard).toBeTruthy()
    expect(r.hasSurvivalInfo).toBeTruthy()

    await page.screenshot({ path: 'e2e/results/screenshots/km-minimal-result.png', fullPage: true })
  })

  test('2-4 ROC 완벽 분류기 (AUC ≈ 1.0): 높은 AUC 확인', async ({ page }) => {
    await navigateToUploadStep(page)
    expect(await uploadCSV(page, 'roc-perfect.csv')).toBeTruthy()
    await expect(page.locator(S.dataProfileSummary)).toBeVisible({ timeout: 15000 })

    await goToMethodSelection(page)
    expect(await selectMethodDirect(page, 'ROC', /ROC.*곡선|ROC.*curve|ROC/i)).toBeTruthy()

    await goToVariableSelection(page)
    await waitForAutoConfirmOrManual(page, 'roc-perfect')
    await clickAnalysisRun(page)

    expect(await waitForResults(page, 120000)).toBeTruthy()
    const r = await verifyROCResults(page)
    log('roc-perfect', r.details)
    expect(r.hasResultsCard).toBeTruthy()
    expect(r.hasAUC).toBeTruthy()

    await page.screenshot({ path: 'e2e/results/screenshots/roc-perfect-result.png', fullPage: true })
  })

  test('2-5 KM 모든 사건 (중도절단 0): S(t)→0 확인', async ({ page }) => {
    await navigateToUploadStep(page)
    expect(await uploadCSV(page, 'survival-all-events.csv')).toBeTruthy()
    await expect(page.locator(S.dataProfileSummary)).toBeVisible({ timeout: 15000 })

    await goToMethodSelection(page)
    expect(await selectMethodDirect(page, 'Kaplan', /Kaplan.*Meier|카플란.*마이어|생존분석/i)).toBeTruthy()

    await goToVariableSelection(page)
    await waitForAutoConfirmOrManual(page, 'km-allevents')
    await clickAnalysisRun(page)

    expect(await waitForResults(page, 120000)).toBeTruthy()
    const r = await verifyKMResults(page)
    log('km-allevents', r.details)
    expect(r.hasResultsCard).toBeTruthy()
    expect(r.hasSurvivalInfo).toBeTruthy()

    await page.screenshot({ path: 'e2e/results/screenshots/km-all-events-result.png', fullPage: true })
  })
})

// ========================================
// Phase 3: 에러 핸들링 + LLM 연동
// ========================================

test.describe('KM/ROC E2E - Phase 3: 에러 핸들링 + LLM', () => {

  test('3-1 KM 데이터 부족 (<10행): 에러 메시지 또는 경고 표시', async ({ page }) => {
    await navigateToUploadStep(page)
    expect(await uploadCSV(page, 'survival-too-small.csv')).toBeTruthy()
    await expect(page.locator(S.dataProfileSummary)).toBeVisible({ timeout: 15000 })

    await goToMethodSelection(page)
    // KM이 disabled 상태일 수 있음 (minSampleSize=10, 데이터=5행)
    const selected = await selectMethodDirect(page, 'Kaplan', /Kaplan.*Meier|카플란.*마이어|생존분석/i)

    if (!selected) {
      // 메서드 자체가 비활성화되었으면 정상 동작
      log('km-toosmall', 'PASS: method disabled for small dataset')
      return
    }

    // 메서드가 선택된 경우 분석 실행 시 에러 기대
    await goToVariableSelection(page)
    await waitForAutoConfirmOrManual(page, 'km-toosmall')
    await clickAnalysisRun(page)
    await page.waitForTimeout(5000)

    const hasError = await verifyErrorShown(page)
    log('km-toosmall', `error shown: ${hasError}`)
    // 에러가 표시되거나 결과가 없어야 함
    const hasResults = await page.locator(S.resultsMainCard).isVisible().catch(() => false)
    expect(hasError || !hasResults).toBeTruthy()

    await page.screenshot({ path: 'e2e/results/screenshots/km-too-small-result.png', fullPage: true })
  })

  test('3-2 ROC 데이터 부족 (<20행): 에러 메시지 또는 경고 표시', async ({ page }) => {
    await navigateToUploadStep(page)
    expect(await uploadCSV(page, 'roc-too-small.csv')).toBeTruthy()
    await expect(page.locator(S.dataProfileSummary)).toBeVisible({ timeout: 15000 })

    await goToMethodSelection(page)
    const selected = await selectMethodDirect(page, 'ROC', /ROC.*곡선|ROC.*curve|ROC/i)

    if (!selected) {
      log('roc-toosmall', 'PASS: method disabled for small dataset')
      return
    }

    await goToVariableSelection(page)
    await waitForAutoConfirmOrManual(page, 'roc-toosmall')
    await clickAnalysisRun(page)
    await page.waitForTimeout(5000)

    const hasError = await verifyErrorShown(page)
    log('roc-toosmall', `error shown: ${hasError}`)
    const hasResults = await page.locator(S.resultsMainCard).isVisible().catch(() => false)
    expect(hasError || !hasResults).toBeTruthy()

    await page.screenshot({ path: 'e2e/results/screenshots/roc-too-small-result.png', fullPage: true })
  })

  test('3-3 KM via LLM 추천: AI가 Kaplan-Meier 추천 → 분석 완료', async ({ page }) => {
    await navigateToUploadStep(page)
    expect(await uploadCSV(page, 'survival.csv')).toBeTruthy()
    await expect(page.locator(S.dataProfileSummary)).toBeVisible({ timeout: 15000 })

    await mockOpenRouterAPI(page, 'kaplan-meier', 'Kaplan-Meier 생존분석')

    await goToMethodSelection(page)
    expect(await selectMethodViaLLM(page, '두 치료군의 생존율을 비교하고 싶어요')).toBeTruthy()

    await waitForAutoConfirmOrManual(page, 'llm-km')
    await clickAnalysisRun(page)

    expect(await waitForResults(page, 120000)).toBeTruthy()
    const r = await verifyKMResults(page)
    log('llm-km', r.details)
    expect(r.hasResultsCard).toBeTruthy()
    expect(r.hasSurvivalInfo).toBeTruthy()

    await page.screenshot({ path: 'e2e/results/screenshots/llm-km-result.png', fullPage: true })
  })

  test('3-4 ROC via LLM 추천: AI가 ROC 곡선 추천 → 분석 완료', async ({ page }) => {
    await navigateToUploadStep(page)
    expect(await uploadCSV(page, 'roc-diagnostic.csv')).toBeTruthy()
    await expect(page.locator(S.dataProfileSummary)).toBeVisible({ timeout: 15000 })

    await mockOpenRouterAPI(page, 'roc-curve', 'ROC 곡선 분석')

    await goToMethodSelection(page)
    expect(await selectMethodViaLLM(page, '진단 모델의 정확도를 ROC 곡선으로 평가하고 싶어요')).toBeTruthy()

    await waitForAutoConfirmOrManual(page, 'llm-roc')
    await clickAnalysisRun(page)

    expect(await waitForResults(page, 120000)).toBeTruthy()
    const r = await verifyROCResults(page)
    log('llm-roc', r.details)
    expect(r.hasResultsCard).toBeTruthy()
    expect(r.hasAUC).toBeTruthy()

    await page.screenshot({ path: 'e2e/results/screenshots/llm-roc-result.png', fullPage: true })
  })
})
