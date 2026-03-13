/**
 * Smart Flow E2E Shared Helpers
 *
 * Phase 1·2 공통 헬퍼 — data-testid(S 레지스트리) 기반.
 * smart-flow-e2e.spec.ts에서 검증 완료된 로직을 추출.
 */

import { Page } from '@playwright/test'
import path from 'path'
import { S } from '../selectors'

// ========================================
// Logging
// ========================================

const globalStart = Date.now()

export function log(tag: string, msg: string): void {
  const sec = ((Date.now() - globalStart) / 1000).toFixed(1)
  console.log(`[+${sec}s][${tag}] ${msg}`)
}

// ========================================
// Navigation
// ========================================

/** Hub → 데이터 업로드 Step으로 이동 */
export async function navigateToUploadStep(page: Page): Promise<void> {
  for (let attempt = 0; attempt < 5; attempt++) {
    await page.goto('/', { waitUntil: 'domcontentloaded', timeout: 60000 })

    // ChunkLoadError 복구
    const hasChunkError = await page
      .locator('text=ChunkLoadError')
      .isVisible({ timeout: 3000 })
      .catch(() => false)
    if (hasChunkError) {
      log('navigate', `ChunkLoadError detected, attempt ${attempt + 1}/5`)
      const retryBtn = page.locator('button').filter({ hasText: '다시 시도' })
      if (await retryBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await retryBtn.click()
        await page.waitForTimeout(5000)
        continue
      }
      await page
        .reload({ waitUntil: 'domcontentloaded', timeout: 60000 })
        .catch(() => {})
      await page.waitForTimeout(5000)
      continue
    }

    // 렌더링 대기
    const rendered = await page
      .waitForFunction(
        () =>
          document.querySelector('[data-testid="hub-upload-card"]') !== null ||
          document.querySelector('input[type="file"]') !== null ||
          document.querySelector('[data-testid="data-profile-summary"]') !== null,
        { timeout: 30000 },
      )
      .then(() => true)
      .catch(() => false)

    if (rendered) break
    log('navigate', `render failed, retry ${attempt + 1}/5`)
    await page.waitForTimeout(5000)
  }
  await page.waitForTimeout(500)

  // Hub → "데이터 업로드" 버튼 클릭 (TrackSuggestions 내 실제 버튼)
  const uploadBtn = page.locator(S.hubUploadBtn)
  if (await uploadBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
    await uploadBtn.click()
    log('navigate', 'hub-upload-btn 클릭')
    // DataUploadStep 렌더 대기 (react-dropzone의 hidden file input)
    await page
      .waitForFunction(
        () => {
          const inputs = document.querySelectorAll('input[type="file"]')
          // DataUploadStep의 dropzone file input은 ChatInput의 것과 구별
          // DataUploadStep이 렌더되면 data-exploration-step 또는 stepper가 나타남
          return (
            inputs.length > 0 &&
            (document.querySelector('[data-testid="data-exploration-step"]') !== null ||
             document.querySelector('[data-testid="stepper-step-1"]') !== null ||
             document.querySelector('[data-testid="data-profile-summary"]') !== null)
          )
        },
        { timeout: 15000 },
      )
      .catch(() => log('navigate', 'DataUploadStep 렌더 대기 timeout'))
    await page.waitForTimeout(500)
    return
  }

  // Fallback: hub-upload-card 컨테이너 (이전 UI 호환)
  const uploadCard = page.locator(S.hubUploadCard)
  if (await uploadCard.isVisible({ timeout: 3000 }).catch(() => false)) {
    await uploadCard.click()
    log('navigate', 'hub-upload-card fallback 클릭')
    await page.waitForTimeout(3000)
    return
  }

  // Fallback: stepper
  const step1 = page.locator(S.stepperStep(1))
  if ((await step1.count()) > 0) {
    await step1.click()
    await page.waitForTimeout(1000)
  }
}

// ========================================
// Step 1: Upload
// ========================================

/** CSV 업로드 → data-profile-summary 대기 */
export async function uploadCSV(page: Page, filename: string): Promise<boolean> {
  const filePath = path.resolve(__dirname, `../../test-data/e2e/${filename}`)
  const fileInput = page.locator('input[type="file"]')
  if ((await fileInput.count()) === 0) return false

  await fileInput.first().setInputFiles(filePath)
  log('upload', `uploaded ${filename}`)

  await page
    .waitForFunction(
      () => document.querySelector('[data-testid="data-profile-summary"]') !== null,
      { timeout: 15000 },
    )
    .catch(() => log('upload', 'validation wait timeout'))

  await page.waitForTimeout(1000)
  return true
}

// ========================================
// Step 2: Method Selection
// ========================================

/** floating-next-btn 또는 stepper로 Step 2 이동 */
export async function goToMethodSelection(page: Page): Promise<void> {
  const btn = page.locator(S.floatingNextBtn)
  if (
    (await btn.isVisible({ timeout: 3000 }).catch(() => false)) &&
    (await btn.isEnabled())
  ) {
    await btn.click()
    log('goToMethod', 'floating-next-btn 클릭')
    await page.waitForTimeout(1500)
    return
  }
  const step2 = page.locator(S.stepperStep(2))
  if ((await step2.count()) > 0 && (await step2.isEnabled().catch(() => false))) {
    await step2.click()
    log('goToMethod', 'stepper-step-2 클릭')
    await page.waitForTimeout(1500)
  }
}

/** 직접 선택 탭에서 메서드 검색 및 선택 */
export async function selectMethodDirect(
  page: Page,
  searchTerm: string,
  methodRegex: RegExp,
): Promise<boolean> {
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
  log('selectDirect', `Found ${matchCount} buttons matching "${searchTerm}"`)

  for (let i = 0; i < matchCount; i++) {
    const btn = allMatches.nth(i)
    const text = (await btn.textContent()) || ''

    // 카테고리 skip
    if (text.match(/\s*\d+\s*$/)) continue
    if (text.includes('methods matching') || text.includes('Selected:')) continue
    if (!text.match(methodRegex)) continue

    const isDisabled = await btn.isDisabled().catch(() => false)
    if (isDisabled) continue

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

// ========================================
// Step 3: Variable Selection
// ========================================

/** confirm-method-btn 또는 floating/stepper로 Step 3 이동 */
export async function goToVariableSelection(page: Page): Promise<void> {
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
  if (
    (await floatingBtn.isVisible({ timeout: 2000 }).catch(() => false)) &&
    (await floatingBtn.isEnabled())
  ) {
    await floatingBtn.click()
    log('goToVar', 'floating-next-btn 클릭')
    await page.waitForTimeout(2000)
    return
  }

  const step3 = page.locator(S.stepperStep(3))
  if ((await step3.count()) > 0 && (await step3.isEnabled().catch(() => false))) {
    await step3.click()
    log('goToVar', 'stepper-step-3 클릭')
    await page.waitForTimeout(2000)
  }
}

/** 변수 선택 — 모달 기반 (roleZone → modalVar → confirm), fallback: variable-item 클릭 */
export async function selectVariables(
  page: Page,
  independentVar: string,
  dependentVar: string,
): Promise<void> {
  // 1. 모달 기반 시도: 존재하는 role zone 찾기
  for (const role of ['independent', 'factor', 'group']) {
    const zone = page.locator(S.roleZone(role))
    if ((await zone.count()) > 0) {
      log('selectVars', `role-zone-${role} found, modal 시도`)
      await selectVarViaModal(page, role, independentVar)
      await selectVarViaModal(page, 'dependent', dependentVar)
      return
    }
  }

  // 2. variable-item 클릭 fallback (좌측 패널의 변수 아이템 클릭)
  log('selectVars', 'roleZone not found, variable-item fallback 시도')
  const indepItem = page.locator(S.variableItem(independentVar))
  if ((await indepItem.count()) > 0) {
    await indepItem.first().click()
    log('selectVars', `variable-item-${independentVar} 클릭`)
    await page.waitForTimeout(1000)
  }

  const depItem = page.locator(S.variableItem(dependentVar))
  if ((await depItem.count()) > 0) {
    await depItem.first().click()
    log('selectVars', `variable-item-${dependentVar} 클릭`)
    await page.waitForTimeout(1000)
  }

  // 3. 최후 fallback: button text matching
  if ((await indepItem.count()) === 0 && (await depItem.count()) === 0) {
    log('selectVars', 'WARN: variable-item도 미발견, button text fallback')
    const indepBtn = page.locator('button:not([disabled])').filter({ hasText: independentVar })
    if ((await indepBtn.count()) > 0) {
      await indepBtn.first().click()
      await page.waitForTimeout(1000)
    }
    const depBtn = page.locator('button:not([disabled])').filter({ hasText: dependentVar })
    if ((await depBtn.count()) > 0) {
      await depBtn.first().click()
      await page.waitForTimeout(500)
    }
  }
}

/** 단일 role에 단일 변수 모달 할당 */
async function selectVarViaModal(
  page: Page,
  role: string,
  varName: string,
): Promise<void> {
  const roleZone = page.locator(S.roleZone(role))
  await roleZone.click()
  await page.waitForTimeout(300)

  const modal = page.locator(S.variableModal(role))
  const modalVisible = await modal.isVisible({ timeout: 3_000 }).catch(() => false)
  if (!modalVisible) {
    log('selectVars', `WARN: modal for "${role}" did not open, skipping`)
    return
  }

  const modalVar = page.locator(S.modalVar(varName))
  if ((await modalVar.count()) > 0) {
    await modalVar.click()
    log('selectVars', `✓ ${role} ← ${varName} (modal)`)
    await page.waitForTimeout(200)
  } else {
    log('selectVars', `WARN: modal-var-${varName} not found in ${role} modal`)
  }

  const confirmBtn = page.locator(S.modalConfirmBtn)
  if (await confirmBtn.isVisible().catch(() => false)) {
    await confirmBtn.click()
    await page.waitForTimeout(300)
  }
}

/** run-analysis-btn 대기 후 자동할당 확인, 미할당 시 수동 선택 */
export async function ensureVariablesOrSkip(
  page: Page,
  tag: string,
  indep: string,
  dep: string,
): Promise<void> {
  const runBtn = page.locator(S.runAnalysisBtn)
  await runBtn
    .waitFor({ state: 'visible', timeout: 20000 })
    .catch(() => log(tag, 'run-analysis-btn not found, proceeding anyway'))

  // AI 자동 할당 대기: 최대 10초 polling (AI 추천이 느릴 수 있음)
  for (let i = 0; i < 10; i++) {
    if (await runBtn.isEnabled().catch(() => false)) {
      log(tag, '변수 자동 할당됨, 선택 건너뜀')
      return
    }
    await page.waitForTimeout(1000)
  }

  log(tag, '자동 할당 미완료, 수동 선택 시도')
  await selectVariables(page, indep, dep)
}

// ========================================
// Step 4: Run & Wait
// ========================================

/** 분석 실행 버튼 클릭 */
export async function clickAnalysisRun(page: Page): Promise<void> {
  await page.waitForTimeout(1000)

  const btn = page.locator(S.runAnalysisBtn)
  if (
    (await btn.isVisible({ timeout: 3000 }).catch(() => false)) &&
    (await btn.isEnabled())
  ) {
    await btn.click()
    log('clickRun', 'run-analysis-btn 클릭')
    await page.waitForTimeout(2000)
    return
  }

  const floatingBtn = page.locator(S.floatingNextBtn)
  if (
    (await floatingBtn.isVisible({ timeout: 3000 }).catch(() => false)) &&
    (await floatingBtn.isEnabled())
  ) {
    await floatingBtn.click()
    log('clickRun', 'floating-next-btn 클릭')
    await page.waitForTimeout(2000)
  }
}

/** 결과 대기 (results-main-card 또는 method-specific-results) */
export async function waitForResults(page: Page, timeout = 90000): Promise<boolean> {
  const start = Date.now()
  log('waitResults', 'waiting...')

  try {
    await page.waitForFunction(
      () =>
        document.querySelector('[data-testid="results-main-card"]') !== null ||
        document.querySelector('[data-testid="method-specific-results"]') !== null,
      { timeout },
    )
    log('waitResults', `done in ${((Date.now() - start) / 1000).toFixed(1)}s`)
    return true
  } catch {
    log('waitResults', `timeout after ${((Date.now() - start) / 1000).toFixed(1)}s`)
    return false
  }
}

// ========================================
// Result Verification
// ========================================

export interface StatisticalResultCheck {
  hasResultsCard: boolean
  hasStatistic: boolean
  hasPValue: boolean
  hasEffectSize: boolean
  details: string
}

/** 결과 검증 — body 텍스트 기반 */
export async function verifyStatisticalResults(page: Page): Promise<StatisticalResultCheck> {
  const hasResultsCard = await page
    .locator(S.resultsMainCard)
    .isVisible()
    .catch(() => false)
  const text = await page.locator('body').innerText()

  const hasStatistic = /통계량|[tFχ²UHZWr]\s*=/.test(text)
  const hasPValue = /유의확률|p\s*[0-9<.]/.test(text)
  const hasEffectSize = /효과크기|Cohen|η²|Cramer|Cramér/.test(text)

  return {
    hasResultsCard,
    hasStatistic,
    hasPValue,
    hasEffectSize,
    details: `card=${hasResultsCard}, stat=${hasStatistic}, p=${hasPValue}, effect=${hasEffectSize}`,
  }
}

// ========================================
// LLM Mock & Selection
// ========================================

export async function mockOpenRouterAPI(
  page: Page,
  methodId: string,
  methodName: string,
): Promise<void> {
  const mockRecommendation = JSON.stringify({
    methodId,
    methodName,
    reasoning: [`데이터 분석 결과 ${methodName}이(가) 적합합니다.`],
    confidence: 0.9,
    variableAssignments: { dependent: ['value'], factor: ['group'] },
    suggestedSettings: { alpha: 0.05 },
    warnings: [],
    alternatives: [
      { id: 'mann-whitney', name: 'Mann-Whitney U 검정', description: '비모수 대안' },
    ],
  })

  await page.route(/openrouter\.ai/, (route) => {
    const url = route.request().url()
    if (url.includes('/models')) {
      route.fulfill({ status: 200, contentType: 'application/json', body: '{"data":[]}' })
      return
    }
    const jsonBody = JSON.stringify({
      id: 'mock',
      choices: [{ message: { content: mockRecommendation } }],
    })
    route.fulfill({ status: 200, contentType: 'application/json', body: jsonBody })
  })
  log('mockAPI', `mocked: ${methodId}`)
}

export async function selectMethodViaLLM(page: Page, question: string): Promise<boolean> {
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
  if ((await submitBtn.isVisible()) && (await submitBtn.isEnabled())) {
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
  if (!(await recCard.isVisible().catch(() => false))) return false

  const selectBtn = page.locator(S.selectRecommendedMethod)
  if (await selectBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
    await selectBtn.click()
    log('selectLLM', '추천 수락')
    await page.waitForTimeout(1500)
    return true
  }
  return false
}
