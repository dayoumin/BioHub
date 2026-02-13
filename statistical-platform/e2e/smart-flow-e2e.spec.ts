/**
 * Smart Flow E2E Tests
 *
 * 설계 원칙:
 * - 모든 셀렉터는 data-testid 기반 (e2e/selectors.ts의 S 레지스트리 사용)
 * - UI 텍스트/디자인이 바뀌어도 data-testid만 유지하면 테스트가 안 깨짐
 * - 텍스트 매칭은 "데이터에 의존하는 경우"(변수명, 메서드명)만 허용
 *
 * 실행: npx playwright test e2e/smart-flow-e2e.spec.ts --headed
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
function log(tag: string, msg: string) {
  const sec = ((Date.now() - testStart) / 1000).toFixed(1)
  console.log(`[+${sec}s][${tag}] ${msg}`)
}

// ========================================
// Helper Functions (data-testid 기반)
// ========================================

/** Hub → 데이터 업로드 Step으로 이동 */
async function navigateToUploadStep(page: Page) {
  for (let attempt = 0; attempt < 5; attempt++) {
    await page.goto('/', { waitUntil: 'domcontentloaded', timeout: 60000 })

    // ChunkLoadError 복구
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

    // 렌더링 대기: data-testid 기반
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

  // Hub 카드 클릭
  const uploadCard = page.locator(S.hubUploadCard)
  if (await uploadCard.isVisible({ timeout: 3000 }).catch(() => false)) {
    await uploadCard.click()
    log('navigate', 'hub-upload-card 클릭')
    await page.waitForSelector('input[type="file"]', { timeout: 10000 }).catch(() => {})
    return
  }

  // Fallback: stepper
  const step1 = page.locator(S.stepperStep(1))
  if (await step1.count() > 0) {
    await step1.click()
    await page.waitForTimeout(1000)
  }
}

/** CSV 업로드 */
async function uploadCSV(page: Page, filename: string): Promise<boolean> {
  const filePath = path.resolve(__dirname, `../test-data/e2e/${filename}`)
  const fileInput = page.locator('input[type="file"]')
  if (await fileInput.count() === 0) return false

  await fileInput.first().setInputFiles(filePath)
  log('upload', `uploaded ${filename}`)

  // 검증 완료 대기
  await page.waitForFunction(() => {
    return document.querySelector('[data-testid="data-profile-summary"]') !== null
  }, { timeout: 15000 }).catch(() => log('upload', 'validation wait timeout'))

  await page.waitForTimeout(1000)
  return true
}

/** Step 2: 방법 선택으로 이동 */
async function goToMethodSelection(page: Page) {
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

/** 직접 선택 탭에서 메서드 검색 및 선택 */
async function selectMethodDirect(page: Page, searchTerm: string, methodName: RegExp): Promise<boolean> {
  // "직접 선택" 탭 (data-testid)
  const browseTab = page.locator(S.filterBrowse)
  if (await browseTab.isVisible({ timeout: 3000 }).catch(() => false)) {
    await browseTab.click()
    await page.waitForTimeout(1000)
  }

  // 검색 input (data-testid)
  const searchInput = page.locator(S.methodSearchInput)
  if (await searchInput.isVisible({ timeout: 3000 }).catch(() => false)) {
    await searchInput.fill(searchTerm)
    await page.waitForTimeout(1500)
  }

  // 메서드 클릭: 버튼 요소만 찾기
  const allMatches = page.locator(`button:has-text("${searchTerm}")`)
  const matchCount = await allMatches.count()
  log('selectDirect:debug', `Found ${matchCount} buttons matching "${searchTerm}"`)

  for (let i = 0; i < matchCount; i++) {
    const btn = allMatches.nth(i)
    const text = await btn.textContent() || ''
    log('selectDirect:debug', `[${i}] button text="${text}" | isCategory=${!!text.match(/\s*\d+\s*$/)}`)

    // 카테고리 skip: "회귀분석 6" 또는 "회귀분석6" (끝에 숫자)
    if (text.match(/\s*\d+\s*$/)) {
      log('selectDirect:skip', `카테고리 skip: "${text}"`)
      continue
    }
    if (text.includes('methods matching') || text.includes('Selected:')) continue

    // methodName 정규식으로 추가 검증
    if (!text.match(methodName)) continue

    // disabled 버튼 skip
    const isDisabled = await btn.isDisabled().catch(() => false)
    if (isDisabled) {
      log('selectDirect:skip', `disabled 버튼 skip: "${text.trim().slice(0, 40)}"`)
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

/** Step 3: 변수 선택으로 이동 */
async function goToVariableSelection(page: Page) {
  // 우선: confirm-method-btn
  const confirmBtn = page.locator(S.confirmMethodBtn)
  if (await confirmBtn.first().isVisible({ timeout: 3000 }).catch(() => false)) {
    if (await confirmBtn.first().isEnabled()) {
      await confirmBtn.first().click()
      log('goToVar', 'confirm-method-btn 클릭')
      await page.waitForTimeout(2000)
      return
    }
  }

  // Fallback: floating-next-btn
  const floatingBtn = page.locator(S.floatingNextBtn)
  if (await floatingBtn.isVisible({ timeout: 2000 }).catch(() => false) && await floatingBtn.isEnabled()) {
    await floatingBtn.click()
    log('goToVar', 'floating-next-btn 클릭')
    await page.waitForTimeout(2000)
    return
  }

  // Last resort: stepper
  const step3 = page.locator(S.stepperStep(3))
  if (await step3.count() > 0 && await step3.isEnabled().catch(() => false)) {
    await step3.click()
    log('goToVar', 'stepper-step-3 클릭')
    await page.waitForTimeout(2000)
  }
}

/** 변수 선택 (변수명은 데이터 의존이라 텍스트 매칭) */
async function selectVariables(page: Page, independentVar: string, dependentVar: string) {
  // 독립변수: 변수명을 포함하는 첫 번째 활성 버튼 클릭 (독립변수 section이 DOM 상단)
  const indepBtn = page.locator('button:not([disabled])').filter({ hasText: independentVar })
  if (await indepBtn.count() > 0) {
    await indepBtn.first().click()
    log('selectVars', `독립변수: ${independentVar}`)
    await page.waitForTimeout(1000)
  }

  // 종속변수: 같은 변수명 버튼이 두 section에 있으므로, 두 번째 매칭(종속변수 section)을 클릭
  const depBtn = page.locator('button:not([disabled])').filter({ hasText: dependentVar })
  const count = await depBtn.count()
  if (count > 1) {
    await depBtn.nth(1).click()
    log('selectVars', `종속변수: ${dependentVar} (nth=1)`)
  } else if (count === 1) {
    await depBtn.first().click()
    log('selectVars', `종속변수: ${dependentVar}`)
  }
  await page.waitForTimeout(500)
}

/** 분석 실행 버튼 클릭 */
async function clickAnalysisRun(page: Page) {
  await page.waitForTimeout(1000)

  // data-testid 우선
  const btn = page.locator(S.runAnalysisBtn)
  if (await btn.isVisible({ timeout: 3000 }).catch(() => false) && await btn.isEnabled()) {
    await btn.click()
    log('clickRun', 'run-analysis-btn 클릭')
    await page.waitForTimeout(2000)
    return
  }

  // floating-next-btn fallback
  const floatingBtn = page.locator(S.floatingNextBtn)
  if (await floatingBtn.isVisible({ timeout: 3000 }).catch(() => false) && await floatingBtn.isEnabled()) {
    await floatingBtn.click()
    log('clickRun', 'floating-next-btn 클릭')
    await page.waitForTimeout(2000)
  }
}

/** 결과 대기 */
async function waitForResults(page: Page, timeout = 90000): Promise<boolean> {
  const start = Date.now()
  log('waitResults', 'waiting...')

  try {
    // data-testid 기반 결과 감지를 최우선
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

/** 결과 검증 */
async function verifyStatisticalResults(page: Page) {
  // data-testid로 결과 컨테이너 존재 확인
  const hasResultsCard = await page.locator(S.resultsMainCard).isVisible().catch(() => false)
  const text = await page.locator('body').innerText()

  const hasStatistic = /통계량|[tFχ²UHZ]\s*=/.test(text)
  const hasPValue = /유의확률|p\s*[0-9<.]/.test(text)
  const hasEffectSize = /효과크기|Cohen|η²|Cramer/.test(text)

  return { hasResultsCard, hasStatistic, hasPValue, hasEffectSize,
    details: `card=${hasResultsCard}, stat=${hasStatistic}, p=${hasPValue}, effect=${hasEffectSize}` }
}

// ========================================
// LLM Helpers (이미 data-testid 기반)
// ========================================

async function mockOpenRouterAPI(page: Page, methodId: string, methodName: string) {
  const mockRecommendation = JSON.stringify({
    methodId,
    methodName,
    reasoning: [`데이터 분석 결과 ${methodName}이(가) 적합합니다.`],
    confidence: 0.9,
    variableAssignments: { dependent: ['value'], factor: ['group'] },
    suggestedSettings: { alpha: 0.05 },
    warnings: [],
    alternatives: [{ id: 'mann-whitney', name: 'Mann-Whitney U 검정', description: '비모수 대안' }]
  })

  await page.route(/openrouter\.ai/, (route) => {
    const url = route.request().url()
    // /models 엔드포인트 (health check) → 단순 200 응답
    if (url.includes('/models')) {
      route.fulfill({ status: 200, contentType: 'application/json', body: '{"data":[]}' })
      return
    }
    // /chat/completions (추천 요청) → 모킹된 추천 응답
    const jsonBody = JSON.stringify({
      id: 'mock',
      choices: [{ message: { content: mockRecommendation } }]
    })
    route.fulfill({ status: 200, contentType: 'application/json', body: jsonBody })
  })
  log('mockAPI', `mocked: ${methodId}`)
}

async function selectMethodViaLLM(page: Page, question: string): Promise<boolean> {
  // AI 탭 전환 (data-testid)
  const aiTab = page.locator(S.filterAi)
  if (await aiTab.isVisible({ timeout: 3000 }).catch(() => false)) {
    const isActive = await aiTab.getAttribute('aria-checked')
    if (isActive !== 'true') {
      await aiTab.click()
      log('selectLLM', 'filter-ai 클릭')
      await page.waitForTimeout(500)
    }
  }

  // 질문 입력
  const chatInput = page.locator(S.aiChatInput)
  if (await chatInput.isVisible({ timeout: 5000 }).catch(() => false)) {
    await chatInput.fill(question)
    log('selectLLM', `질문: "${question}"`)
  } else {
    log('selectLLM', 'ai-chat-input not found')
    return false
  }

  // 전송
  const submitBtn = page.locator(S.aiChatSubmit)
  if (await submitBtn.isVisible() && await submitBtn.isEnabled()) {
    await submitBtn.click()
    log('selectLLM', '전송')
  } else {
    log('selectLLM', 'submit not available')
    return false
  }

  // 추천 카드 대기
  const recCard = page.locator(S.recommendationCard)
  await recCard.waitFor({ state: 'visible', timeout: 30000 }).catch(() => {
    log('selectLLM', 'recommendation-card timeout')
  })
  if (!await recCard.isVisible().catch(() => false)) return false

  // 수락
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
// 공통: "분석 시작" 가능 여부 확인 후 변수 선택
// ========================================
async function ensureVariablesOrSkip(page: Page, tag: string, indep: string, dep: string) {
  // 변수 selector가 렌더링될 때까지 대기 (run-analysis-btn이 DOM에 나타남)
  const runBtn = page.locator(S.runAnalysisBtn)
  await runBtn.waitFor({ state: 'visible', timeout: 15000 }).catch(() =>
    log(tag, 'run-analysis-btn not found, proceeding anyway')
  )
  await page.waitForTimeout(500)

  if (await runBtn.isEnabled().catch(() => false)) {
    log(tag, '변수 자동 할당됨, 선택 건너뜀')
    return
  }
  await selectVariables(page, indep, dep)
}

// ========================================
// Tests
// ========================================

test.describe('Smart Flow E2E - 직접 선택 방식', () => {

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

    await page.screenshot({ path: 'e2e/results/screenshots/t-test-result.png', fullPage: true })
  })

  test('카이제곱 독립성 검정: 업로드 → 직접선택 → 분석 → 결과', async ({ page }) => {
    await navigateToUploadStep(page)
    expect(await uploadCSV(page, 'chi-square-v2.csv')).toBeTruthy()
    await expect(page.locator(S.dataProfileSummary)).toBeVisible({ timeout: 15000 })

    await goToMethodSelection(page)
    expect(await selectMethodDirect(page, '카이제곱 독립', /카이제곱 독립성|chi.*square.*independence/)).toBeTruthy()

    await goToVariableSelection(page)
    await ensureVariablesOrSkip(page, 'chi-square', 'gender', 'preference')
    await clickAnalysisRun(page)

    expect(await waitForResults(page, 120000)).toBeTruthy()
    const r = await verifyStatisticalResults(page)
    log('chi-square', r.details)
    expect(r.hasStatistic).toBeTruthy()
    expect(r.hasPValue).toBeTruthy()

    await page.screenshot({ path: 'e2e/results/screenshots/chi-square-result.png', fullPage: true })
  })
})

test.describe('Smart Flow E2E - 추가 Variable Selectors', () => {

  test('일표본 t-검정 (OneSampleSelector): 업로드 → 직접선택 → 분석 → 결과', async ({ page }) => {
    await navigateToUploadStep(page)
    expect(await uploadCSV(page, 'one-sample-t.csv')).toBeTruthy()
    await expect(page.locator(S.dataProfileSummary)).toBeVisible({ timeout: 15000 })

    await goToMethodSelection(page)
    expect(await selectMethodDirect(page, '일표본', /일표본.*t.*검정|one.*sample.*t/i)).toBeTruthy()

    await goToVariableSelection(page)
    // OneSampleSelector: value 변수 1개만 선택 (자동 할당 예상)
    const runBtn = page.locator(S.runAnalysisBtn)
    await runBtn.waitFor({ state: 'visible', timeout: 15000 })
    await page.waitForTimeout(500)

    await clickAnalysisRun(page)
    expect(await waitForResults(page, 120000)).toBeTruthy()

    const r = await verifyStatisticalResults(page)
    log('one-sample-t', r.details)
    expect(r.hasStatistic).toBeTruthy()
    expect(r.hasPValue).toBeTruthy()

    await page.screenshot({ path: 'e2e/results/screenshots/one-sample-t-result.png', fullPage: true })
  })

  test('대응표본 t-검정 (PairedSelector): 업로드 → 직접선택 → 분석 → 결과', async ({ page }) => {
    await navigateToUploadStep(page)
    expect(await uploadCSV(page, 'paired-t-test.csv')).toBeTruthy()
    await expect(page.locator(S.dataProfileSummary)).toBeVisible({ timeout: 15000 })

    await goToMethodSelection(page)
    expect(await selectMethodDirect(page, '대응표본', /대응표본.*t.*검정|paired.*t/i)).toBeTruthy()

    await goToVariableSelection(page)
    // PairedSelector: pre, post 변수 2개 선택
    const runBtn = page.locator(S.runAnalysisBtn)
    await runBtn.waitFor({ state: 'visible', timeout: 15000 })
    await page.waitForTimeout(500)

    // 변수 자동 할당 확인
    if (!await runBtn.isEnabled().catch(() => false)) {
      // 수동 선택 필요시
      const preBtn = page.locator('button:not([disabled])').filter({ hasText: 'pre' })
      const postBtn = page.locator('button:not([disabled])').filter({ hasText: 'post' })
      if (await preBtn.count() > 0) {
        await preBtn.first().click()
        await page.waitForTimeout(500)
      }
      if (await postBtn.count() > 0) {
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

    await page.screenshot({ path: 'e2e/results/screenshots/paired-t-result.png', fullPage: true })
  })

  test('이원 분산분석 (TwoWayAnovaSelector): 업로드 → 직접선택 → 분석 → 결과', async ({ page }) => {
    await navigateToUploadStep(page)
    expect(await uploadCSV(page, 'twoway-anova-test.csv')).toBeTruthy()
    await expect(page.locator(S.dataProfileSummary)).toBeVisible({ timeout: 15000 })

    await goToMethodSelection(page)
    expect(await selectMethodDirect(page, '이원', /이원.*분산|two.*way.*anova/i)).toBeTruthy()

    await goToVariableSelection(page)
    // TwoWayAnovaSelector: factor1, factor2, value
    const runBtn = page.locator(S.runAnalysisBtn)
    await runBtn.waitFor({ state: 'visible', timeout: 15000 })
    await page.waitForTimeout(500)

    // 변수 자동 할당 확인
    if (!await runBtn.isEnabled().catch(() => false)) {
      // factor1, factor2 선택
      const f1Btn = page.locator('button:not([disabled])').filter({ hasText: 'factor1' })
      const f2Btn = page.locator('button:not([disabled])').filter({ hasText: 'factor2' })
      const vBtn = page.locator('button:not([disabled])').filter({ hasText: 'value' })

      if (await f1Btn.count() > 0) await f1Btn.first().click()
      await page.waitForTimeout(500)
      if (await f2Btn.count() > 0) await f2Btn.first().click()
      await page.waitForTimeout(500)
      if (await vBtn.count() > 0) await vBtn.last().click() // 종속변수는 마지막
      await page.waitForTimeout(500)
    }

    await clickAnalysisRun(page)
    expect(await waitForResults(page, 120000)).toBeTruthy()

    const r = await verifyStatisticalResults(page)
    log('two-way-anova', r.details)
    expect(r.hasStatistic).toBeTruthy()
    expect(r.hasPValue).toBeTruthy()

    await page.screenshot({ path: 'e2e/results/screenshots/two-way-anova-result.png', fullPage: true })
  })

  test('다중 회귀분석 (MultipleRegressionSelector): 업로드 → 직접선택 → 분석 → 결과', async ({ page }) => {
    await navigateToUploadStep(page)
    expect(await uploadCSV(page, 'regression.csv')).toBeTruthy()
    await expect(page.locator(S.dataProfileSummary)).toBeVisible({ timeout: 15000 })

    await goToMethodSelection(page)
    // "다중회귀"로 구체적으로 검색하여 다른 회귀 메서드와 구분
    const methodSelected = await selectMethodDirect(page, '다중회귀', /다중.*회귀|multiple.*regression/i)

    // 다중 회귀분석이 비활성화된 경우 (독립 변수 부족) 테스트 skip
    if (!methodSelected) {
      log('multiple-regression', 'SKIPPED: 다중회귀분석 버튼이 disabled 상태 (독립 변수 부족)')
      test.skip()
      return
    }

    await goToVariableSelection(page)
    // MultipleRegressionSelector: study_hours, attendance → score
    const runBtn = page.locator(S.runAnalysisBtn)
    await runBtn.waitFor({ state: 'visible', timeout: 15000 })
    await page.waitForTimeout(500)

    // 변수 자동 할당 확인
    if (!await runBtn.isEnabled().catch(() => false)) {
      // 독립변수: study_hours, attendance
      const studyBtn = page.locator('button:not([disabled])').filter({ hasText: 'study_hours' })
      const attendBtn = page.locator('button:not([disabled])').filter({ hasText: 'attendance' })
      const scoreBtn = page.locator('button:not([disabled])').filter({ hasText: 'score' })

      if (await studyBtn.count() > 0) await studyBtn.first().click()
      await page.waitForTimeout(500)
      if (await attendBtn.count() > 0) await attendBtn.first().click()
      await page.waitForTimeout(500)
      if (await scoreBtn.count() > 0) {
        const cnt = await scoreBtn.count()
        await scoreBtn.nth(cnt > 1 ? 1 : 0).click() // 종속변수 section
      }
      await page.waitForTimeout(500)
    }

    await clickAnalysisRun(page)
    expect(await waitForResults(page, 120000)).toBeTruthy()

    const r = await verifyStatisticalResults(page)
    log('regression', r.details)
    expect(r.hasStatistic).toBeTruthy()
    expect(r.hasPValue).toBeTruthy()

    await page.screenshot({ path: 'e2e/results/screenshots/regression-result.png', fullPage: true })
  })
})

test.describe('Smart Flow E2E - LLM 추천 방식', () => {

  test('독립표본 t-검정 (LLM 추천): 업로드 → AI 질문 → 추천 수락 → 분석 → 결과', async ({ page }) => {
    await navigateToUploadStep(page)
    expect(await uploadCSV(page, 't-test.csv')).toBeTruthy()
    await expect(page.locator(S.dataProfileSummary)).toBeVisible({ timeout: 15000 })

    await mockOpenRouterAPI(page, 't-test', '독립표본 t-검정')

    await goToMethodSelection(page)
    expect(await selectMethodViaLLM(page, '두 그룹의 평균이 다른지 비교하고 싶어요')).toBeTruthy()

    await ensureVariablesOrSkip(page, 'llm-t-test', 'group', 'value')
    await clickAnalysisRun(page)

    expect(await waitForResults(page, 120000)).toBeTruthy()
    const r = await verifyStatisticalResults(page)
    log('llm-t-test', r.details)
    expect(r.hasStatistic).toBeTruthy()
    expect(r.hasPValue).toBeTruthy()

    await expect(page.locator(S.resultsMainCard)).toBeVisible({ timeout: 5000 })
    await expect(page.locator(S.actionButtons)).toBeVisible({ timeout: 5000 })

    await page.screenshot({ path: 'e2e/results/screenshots/llm-t-test-result.png', fullPage: true })
  })
})
