/**
 * Smart Flow E2E Tests - 현재 UI에 맞는 전체 흐름 테스트
 *
 * 테스트 흐름: 데이터 업로드 → 직접 선택으로 방법 선택 → 변수 선택 → 분석 → 결과 검증
 *
 * 실행: npx playwright test e2e/smart-flow-e2e.spec.ts --headed
 * 헤드리스: npx playwright test e2e/smart-flow-e2e.spec.ts
 */

import { test, expect, Page } from '@playwright/test'
import path from 'path'

// 포트 오버라이드 (dev 서버가 3005일 때)
const BASE_URL = process.env.E2E_BASE_URL || 'http://localhost:3005'

test.use({ baseURL: BASE_URL })
test.setTimeout(180_000) // 3분 (Pyodide 로딩 + 분석)

// ========================================
// Helper Functions
// ========================================

/** 새 분석을 위해 Hub → 데이터 업로드 Step으로 이동 */
async function navigateToUploadStep(page: Page) {
  // ChunkLoadError 대비 최대 3회 재시도
  for (let attempt = 0; attempt < 3; attempt++) {
    await page.goto('/', { waitUntil: 'domcontentloaded' })

    // React 앱 렌더링 대기
    const rendered = await page.waitForFunction(() => {
      const text = document.body.innerText
      return (
        text.includes('데이터 업로드') ||
        text.includes('탐색') ||
        text.includes('통계량') ||
        document.querySelector('input[type="file"]') !== null
      )
    }, { timeout: 30000 }).then(() => true).catch(() => false)

    if (rendered) break

    // ChunkLoadError 등으로 실패 시 잠시 대기 후 재시도
    console.log(`[navigateToUploadStep] render failed, retry ${attempt + 1}/3`)
    await page.waitForTimeout(3000)
  }
  await page.waitForTimeout(1000)

  // Case 1: Hub 페이지 → "데이터 업로드" 카드 클릭
  const uploadCard = page.locator('text=데이터 업로드').first()
  if (await uploadCard.isVisible({ timeout: 3000 }).catch(() => false)) {
    await uploadCard.click()
    console.log('[navigateToUploadStep] Hub → 데이터 업로드 클릭')
    await page.waitForTimeout(2000)

    // 업로드 영역 (input[type="file"]) 나올 때까지 대기
    await page.waitForSelector('input[type="file"]', { timeout: 10000 }).catch(() => {
      console.log('[navigateToUploadStep] file input wait timeout')
    })
    return
  }

  // Case 2: 이미 분석 결과/step에 있는 경우 → "탐색" 클릭
  const exploreBtn = page.locator('button').filter({ hasText: /^탐색$/ })
  if (await exploreBtn.count() > 0) {
    await exploreBtn.first().click()
    await page.waitForTimeout(1000)
  }
}

/** CSV 파일 업로드 (setInputFiles 사용) */
async function uploadCSV(page: Page, filename: string): Promise<boolean> {
  const filePath = path.resolve(__dirname, `../test-data/e2e/${filename}`)

  // react-dropzone의 hidden input[type="file"]은 DOM에 존재하지만 숨겨져 있음
  // force: true 없이도 setInputFiles는 hidden input에도 작동
  const fileInput = page.locator('input[type="file"]')

  // 파일 입력이 DOM에 없으면 다른 데이터 업로드 진입점 탐색
  if (await fileInput.count() === 0) {
    // "다른 데이터로 재분석" 또는 드롭존 클릭
    const reanalyzeBtn = page.locator('button').filter({ hasText: /다른 데이터|재분석|새 분석/ })
    if (await reanalyzeBtn.count() > 0) {
      await reanalyzeBtn.first().click()
      await page.waitForTimeout(2000)
    }
  }

  if (await fileInput.count() === 0) {
    console.log('[uploadCSV] file input not found')
    return false
  }

  await fileInput.first().setInputFiles(filePath)
  console.log(`[uploadCSV] uploaded ${filename}`)

  // 데이터 검증 완료 대기 (최대 15초)
  await page.waitForFunction(() => {
    const text = document.body.innerText
    return text.includes('검토 완료') || text.includes('데이터 미리보기') || text.includes('표본')
  }, { timeout: 15000 }).catch(() => {
    console.log('[uploadCSV] validation wait timeout')
  })

  await page.waitForTimeout(2000)
  return true
}

/** Step 2로 이동: "분석 방법 선택으로" 버튼 또는 "방법" stepper 클릭 */
async function goToMethodSelection(page: Page) {
  // 먼저 "분석 방법 선택으로" 버튼 시도
  const nextBtn = page.locator('button, a').filter({ hasText: /분석 방법 선택/ })
  if (await nextBtn.count() > 0 && await nextBtn.first().isVisible()) {
    await nextBtn.first().click()
    await page.waitForTimeout(2000)
    return
  }

  // Fallback: "방법" stepper 클릭
  const methodStep = page.locator('button').filter({ hasText: /^방법$/ })
  if (await methodStep.count() > 0) {
    await methodStep.first().click()
    await page.waitForTimeout(2000)
  }
}

/** "직접 선택" 탭에서 메서드 검색 및 선택 */
async function selectMethodDirect(page: Page, searchTerm: string, methodName: RegExp): Promise<boolean> {
  // "직접 선택" 탭 클릭
  const directTab = page.locator('button, [role="tab"]').filter({ hasText: /직접 선택/ })
  if (await directTab.count() > 0) {
    await directTab.first().click()
    await page.waitForTimeout(1000)
  }

  // 검색 입력란에 검색어 입력
  const searchInput = page.locator('input[placeholder*="Search"], input[placeholder*="검색"], input[type="search"], input[type="text"]').first()
  if (await searchInput.isVisible({ timeout: 3000 }).catch(() => false)) {
    await searchInput.fill(searchTerm)
    await page.waitForTimeout(1500)
  }

  // 카테고리 접힘 해제: 접힌 카테고리 헤더가 있으면 펼치기
  const collapsedCategories = page.locator('button[data-state="closed"], [role="button"]').filter({ hasText: /카이제곱|빈도|회귀|비모수|분산/ })
  const catCount = await collapsedCategories.count()
  for (let i = 0; i < catCount; i++) {
    const cat = collapsedCategories.nth(i)
    const catText = await cat.textContent() || ''
    // 검색 결과에 관련 카테고리가 접혀 있으면 클릭하여 펼침
    if (catText.match(methodName) || catText.includes('카이제곱') && searchTerm.includes('카이제곱')) {
      await cat.click()
      console.log(`[selectMethodDirect] expanded category: ${catText.trim().slice(0, 30)}`)
      await page.waitForTimeout(1000)
    }
  }

  // 메서드 항목 클릭 (카테고리 헤더가 아닌 개별 메서드)
  // 모든 텍스트 매칭 요소 중 실제 메서드인 것을 찾기
  const allMatches = page.locator(`text=${methodName}`)
  const matchCount = await allMatches.count()
  for (let i = 0; i < matchCount; i++) {
    const el = allMatches.nth(i)
    const text = await el.textContent() || ''
    // 카테고리 헤더, 상태 텍스트 제외
    if (text.match(/\d+\s*$/) && text.includes('/')) continue
    if (text.includes('methods matching') || text.includes('Selected:')) continue
    // 실제 메서드 항목 클릭
    if (await el.isVisible()) {
      await el.click()
      console.log(`[selectMethodDirect] selected: "${text.trim().slice(0, 40)}"`)
      await page.waitForTimeout(2000)
      return true
    }
  }

  // Fallback: 첫 번째 매칭 요소 클릭
  const methodCard = page.locator(`text=${methodName}`).first()
  if (await methodCard.isVisible({ timeout: 5000 }).catch(() => false)) {
    await methodCard.click()
    console.log(`[selectMethodDirect] fallback selected: ${searchTerm}`)
    await page.waitForTimeout(2000)
    return true
  }

  console.log(`[selectMethodDirect] method not found: ${searchTerm}`)
  return false
}

/** Step 3으로 이동: 방법 선택 후 "이 방법으로 분석하기" 또는 변수 선택 */
async function goToVariableSelection(page: Page) {
  // 우선순위 1: "이 방법으로 분석하기" 버튼 (방법 선택 후 확인 버튼)
  const analyzeBtn = page.locator('button').filter({ hasText: /이 방법으로 분석하기/ })
  if (await analyzeBtn.count() > 0 && await analyzeBtn.first().isVisible()) {
    const isEnabled = await analyzeBtn.first().isEnabled()
    if (isEnabled) {
      await analyzeBtn.first().click()
      console.log('[goToVariableSelection] "이 방법으로 분석하기" 클릭')
      await page.waitForTimeout(3000)
      return
    }
  }

  // 우선순위 2: 활성화된 "다음" 류 버튼
  const nextBtns = [
    page.locator('button').filter({ hasText: /^다음$/ }),
    page.locator('button').filter({ hasText: /다음 단계/ }),
    page.locator('button').filter({ hasText: /진행/ })
  ]

  for (const btn of nextBtns) {
    if (await btn.count() > 0 && await btn.first().isVisible()) {
      const isEnabled = await btn.first().isEnabled()
      if (isEnabled) {
        await btn.first().click()
        await page.waitForTimeout(2000)
        return
      }
    }
  }

  // Fallback: stepper에서 "변수" 클릭
  const varStep = page.locator('button').filter({ hasText: /^변수$/ })
  if (await varStep.count() > 0) {
    await varStep.first().click()
    console.log('[goToVariableSelection] stepper "변수" 클릭')
    await page.waitForTimeout(2000)
  }
}

/** 변수 선택: 독립변수/종속변수 패널에서 변수 클릭 */
async function selectVariables(page: Page, independentVar: string, dependentVar: string) {
  // 페이지에 독립변수/종속변수 패널이 있음
  // 각 패널 내에서 해당 변수 이름이 포함된 카드/라디오 클릭

  // 독립변수 패널 (첫 번째 섹션) 내에서 independentVar 클릭
  const sections = page.locator('div').filter({ hasText: /^독립변수/ })
  const indepSection = sections.first()

  // 독립변수 섹션 내 변수 카드 클릭
  const indepCard = indepSection.locator(`text=${independentVar}`).first()
  if (await indepCard.isVisible({ timeout: 5000 }).catch(() => false)) {
    await indepCard.click()
    console.log(`[selectVars] 독립변수: ${independentVar} 클릭`)
    await page.waitForTimeout(1000)
  } else {
    // Fallback: 페이지 전체에서 첫 번째 매칭 (독립변수 쪽)
    const allCards = page.locator(`label, [role="radio"], button`).filter({ hasText: new RegExp(independentVar) })
    if (await allCards.count() > 0) {
      await allCards.first().click()
      console.log(`[selectVars] 독립변수 fallback: ${independentVar} 클릭`)
      await page.waitForTimeout(1000)
    }
  }

  // 종속변수 패널 (두 번째 섹션) 내에서 dependentVar 클릭
  const depSections = page.locator('div').filter({ hasText: /^종속변수/ })
  const depSection = depSections.first()

  const depCard = depSection.locator(`text=${dependentVar}`).first()
  if (await depCard.isVisible({ timeout: 5000 }).catch(() => false)) {
    await depCard.click()
    console.log(`[selectVars] 종속변수: ${dependentVar} 클릭`)
    await page.waitForTimeout(1000)
  } else {
    // Fallback: 페이지에서 두 번째 매칭 (종속변수 쪽)
    const allCards = page.locator(`label, [role="radio"], button`).filter({ hasText: new RegExp(dependentVar) })
    const count = await allCards.count()
    if (count > 1) {
      await allCards.nth(1).click()  // 두 번째 = 종속변수 패널
      console.log(`[selectVars] 종속변수 fallback: ${dependentVar} 클릭`)
      await page.waitForTimeout(1000)
    } else if (count > 0) {
      await allCards.first().click()
      console.log(`[selectVars] 종속변수 only: ${dependentVar} 클릭`)
      await page.waitForTimeout(1000)
    }
  }
}

/** 분석 실행 대기 (진행률 100% 또는 결과 출현) */
async function waitForResults(page: Page, timeout = 90000): Promise<boolean> {
  const startTime = Date.now()
  console.log('[waitForResults] waiting...')

  try {
    await page.waitForFunction(() => {
      const text = document.body.innerText
      // 통계 결과 패턴 확인
      return (
        (text.includes('통계량') && text.includes('유의확률')) ||
        text.match(/[ptFUHZ²χ]\s*[=<]/) !== null ||
        text.includes('유의하지 않음') ||
        text.includes('유의함') ||
        (text.includes('p ') && text.match(/0\.\d{3}/) !== null)
      )
    }, { timeout })

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1)
    console.log(`[waitForResults] done in ${elapsed}s`)
    return true
  } catch {
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1)
    console.log(`[waitForResults] timeout after ${elapsed}s`)
    return false
  }
}

/** 분석 실행 버튼 클릭 */
async function clickAnalysisRun(page: Page) {
  // 변수 선택 페이지가 안정될 때까지 대기
  await page.waitForTimeout(2000)

  const runBtns = [
    page.locator('button').filter({ hasText: /분석 시작/ }),
    page.locator('button').filter({ hasText: /분석 실행/ }),
    page.locator('button').filter({ hasText: /분석하기/ }),
    page.locator('button').filter({ hasText: /^실행$/ })
  ]

  for (const btn of runBtns) {
    const count = await btn.count()
    if (count > 0) {
      const isVisible = await btn.first().isVisible().catch(() => false)
      const isEnabled = isVisible ? await btn.first().isEnabled().catch(() => false) : false
      console.log(`[clickAnalysisRun] found button, visible=${isVisible}, enabled=${isEnabled}`)
      if (isVisible && isEnabled) {
        await btn.first().click()
        console.log('[clickAnalysisRun] clicked')
        await page.waitForTimeout(3000)
        return
      }
    }
  }

  // Fallback: 페이지에서 "분석 시작" 텍스트를 가진 아무 요소라도 클릭
  const anyAnalysis = page.locator('text=/분석 시작/').first()
  if (await anyAnalysis.isVisible({ timeout: 5000 }).catch(() => false)) {
    await anyAnalysis.click()
    console.log('[clickAnalysisRun] fallback text click')
    await page.waitForTimeout(3000)
    return
  }

  console.log('[clickAnalysisRun] no run button found, trying stepper')
  // Last resort: stepper에서 "분석" 클릭
  const analysisStep = page.locator('button').filter({ hasText: /^분석$/ })
  if (await analysisStep.count() > 0) {
    await analysisStep.first().click({ force: true })
    console.log('[clickAnalysisRun] stepper 분석 클릭 (force)')
    await page.waitForTimeout(3000)
  }
}

/** 결과 검증: 통계량, p-value, 효과크기 확인 */
async function verifyStatisticalResults(page: Page): Promise<{
  hasStatistic: boolean
  hasPValue: boolean
  hasEffectSize: boolean
  details: string
}> {
  const text = await page.locator('body').innerText()

  const hasStatistic = /통계량|[tFχ²UHZ]\s*=/.test(text)
  const hasPValue = /유의확률|p\s*[0-9<.]/.test(text)
  const hasEffectSize = /효과크기|Cohen|η²|Cramer/.test(text)

  return {
    hasStatistic,
    hasPValue,
    hasEffectSize,
    details: `statistic=${hasStatistic}, pValue=${hasPValue}, effectSize=${hasEffectSize}`
  }
}

// ========================================
// LLM Path Helpers
// ========================================

/** OpenRouter API를 mock SSE 응답으로 대체 (결정적 결과 보장) */
async function mockOpenRouterAPI(page: Page, methodId: string, methodName: string) {
  const mockResponse = JSON.stringify({
    methodId,
    reasoning: `데이터 분석 결과 ${methodName}이(가) 적합합니다.`,
    confidence: 0.9,
    variableAssignments: {
      dependent: ['value'],
      factor: ['group']
    },
    suggestedSettings: { alpha: 0.05 },
    warnings: [],
    alternatives: [
      { id: 'mann-whitney', name: 'Mann-Whitney U 검정', description: '비모수 대안' }
    ]
  })

  // SSE 형식의 mock 응답 생성
  const sseBody = `data: {"id":"mock","choices":[{"delta":{"content":"${mockResponse.replace(/"/g, '\\"')}"}}]}\n\ndata: [DONE]\n\n`

  await page.route('**/openrouter.ai/**', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'text/event-stream',
      body: sseBody,
    })
  })

  console.log(`[mockOpenRouterAPI] mocked with methodId=${methodId}`)
}

/** LLM 경로로 메서드 선택: AI 탭 전환 → AI Chat 입력 → 추천 카드 → 수락 */
async function selectMethodViaLLM(page: Page, question: string): Promise<boolean> {
  // AI 탭이 비활성 상태면 전환 (FilterToggle: role="radio")
  const aiTab = page.locator('button[role="radio"]').filter({ hasText: 'AI' })
  if (await aiTab.isVisible({ timeout: 3000 }).catch(() => false)) {
    const isActive = await aiTab.getAttribute('aria-checked')
    if (isActive !== 'true') {
      await aiTab.click()
      console.log('[selectMethodViaLLM] AI 탭 전환')
      await page.waitForTimeout(500)
    }
  }

  // AI Chat 입력란에 질문 입력
  const chatInput = page.locator('[data-testid="ai-chat-input"]')
  if (await chatInput.isVisible({ timeout: 5000 }).catch(() => false)) {
    await chatInput.fill(question)
    console.log(`[selectMethodViaLLM] 질문 입력: "${question}"`)
  } else {
    console.log('[selectMethodViaLLM] ai-chat-input not found')
    return false
  }

  // 전송 버튼 클릭
  const submitBtn = page.locator('[data-testid="ai-chat-submit"]')
  if (await submitBtn.isVisible() && await submitBtn.isEnabled()) {
    await submitBtn.click()
    console.log('[selectMethodViaLLM] 전송 클릭')
  } else {
    console.log('[selectMethodViaLLM] submit button not available')
    return false
  }

  // 추천 카드 출현 대기
  const recCard = page.locator('[data-testid="recommendation-card"]')
  await recCard.waitFor({ state: 'visible', timeout: 30000 }).catch(() => {
    console.log('[selectMethodViaLLM] recommendation-card wait timeout')
  })

  if (!await recCard.isVisible().catch(() => false)) {
    console.log('[selectMethodViaLLM] recommendation-card not visible')
    return false
  }

  // "이 방법으로 분석하기" 클릭
  const selectBtn = page.locator('[data-testid="select-recommended-method"]')
  if (await selectBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
    await selectBtn.click()
    console.log('[selectMethodViaLLM] 추천 수락')
    await page.waitForTimeout(2000)
    return true
  }

  console.log('[selectMethodViaLLM] select-recommended-method not found')
  return false
}

// ========================================
// Tests
// ========================================

test.describe('Smart Flow E2E - 직접 선택 방식', () => {

  test('독립표본 t-검정: 업로드 → 직접선택 → 분석 → 결과', async ({ page }) => {
    // Step 1: 데이터 업로드
    await navigateToUploadStep(page)
    const uploaded = await uploadCSV(page, 't-test.csv')
    expect(uploaded).toBeTruthy()

    // 데이터 검증 확인
    await expect(page.locator('text=/검토 완료/').first()).toBeVisible({ timeout: 15000 })

    // Step 2: 방법 선택
    await goToMethodSelection(page)
    const methodSelected = await selectMethodDirect(page, '독립표본', /독립표본 t-검정/)
    expect(methodSelected).toBeTruthy()

    // Step 3: 변수 선택 (자동 또는 수동)
    await goToVariableSelection(page)
    await page.waitForTimeout(2000)

    // "분석 시작"이 이미 활성화되어 있으면 변수 선택 건너뜀 (자동 할당됨)
    const runBtn = page.locator('button').filter({ hasText: /분석 시작/ })
    const isRunEnabled = await runBtn.first().isEnabled().catch(() => false)
    if (!isRunEnabled) {
      await selectVariables(page, 'group', 'value')
    } else {
      console.log('[t-test] 변수 자동 할당됨, 선택 건너뜀')
    }

    // 분석 실행
    await clickAnalysisRun(page)

    // Step 4: 결과 대기
    const hasResults = await waitForResults(page, 120000)
    expect(hasResults).toBeTruthy()

    // 결과 검증
    const results = await verifyStatisticalResults(page)
    console.log(`[t-test] ${results.details}`)
    expect(results.hasStatistic).toBeTruthy()
    expect(results.hasPValue).toBeTruthy()

    // 스크린샷 저장
    await page.screenshot({ path: 'e2e/results/screenshots/t-test-result.png', fullPage: true })
  })

  test('카이제곱 독립성 검정: 업로드 → 직접선택 → 분석 → 결과', async ({ page }) => {
    // Step 1: 데이터 업로드 (숫자 열 포함 버전)
    await navigateToUploadStep(page)
    const uploaded = await uploadCSV(page, 'chi-square-v2.csv')
    expect(uploaded).toBeTruthy()

    // 데이터 검증 확인
    await expect(page.locator('text=/검토 완료/').first()).toBeVisible({ timeout: 15000 })

    // Step 2: 방법 선택
    await goToMethodSelection(page)
    const methodSelected = await selectMethodDirect(page, '카이제곱 독립', /카이제곱 독립성|chi.*square.*independence/)
    expect(methodSelected).toBeTruthy()

    // Step 3: 변수 선택
    await goToVariableSelection(page)
    await page.waitForTimeout(2000)

    // "분석 시작"이 이미 활성화되어 있으면 변수 선택 건너뜀
    const chiRunBtn = page.locator('button').filter({ hasText: /분석 시작/ })
    const isChiRunEnabled = await chiRunBtn.first().isEnabled().catch(() => false)
    if (!isChiRunEnabled) {
      await selectVariables(page, 'gender', 'preference')
    } else {
      console.log('[chi-square] 변수 자동 할당됨, 선택 건너뜀')
    }

    // 분석 실행
    await clickAnalysisRun(page)

    // Step 4: 결과 대기
    const hasResults = await waitForResults(page, 120000)
    expect(hasResults).toBeTruthy()

    // 결과 검증
    const results = await verifyStatisticalResults(page)
    console.log(`[chi-square] ${results.details}`)
    expect(results.hasStatistic).toBeTruthy()
    expect(results.hasPValue).toBeTruthy()

    // 스크린샷 저장
    await page.screenshot({ path: 'e2e/results/screenshots/chi-square-result.png', fullPage: true })
  })
})

// ========================================
// LLM 경로 테스트 (API mock)
// ========================================

test.describe('Smart Flow E2E - LLM 추천 방식', () => {

  test('독립표본 t-검정 (LLM 추천): 업로드 → AI 질문 → 추천 수락 → 분석 → 결과', async ({ page }) => {
    // OpenRouter API mock (결정적 SSE 응답)
    await mockOpenRouterAPI(page, 't-test', '독립표본 t-검정')

    // Step 1: 데이터 업로드
    await navigateToUploadStep(page)
    const uploaded = await uploadCSV(page, 't-test.csv')
    expect(uploaded).toBeTruthy()

    // 데이터 검증 확인
    await expect(page.locator('text=/검토 완료/').first()).toBeVisible({ timeout: 15000 })

    // Step 2: AI 추천으로 방법 선택
    await goToMethodSelection(page)
    const llmSelected = await selectMethodViaLLM(page, '두 그룹의 평균이 다른지 비교하고 싶어요')
    expect(llmSelected).toBeTruthy()

    // Step 3: 변수 선택 (AI가 자동 할당했을 수 있음)
    await page.waitForTimeout(2000)
    const runBtn = page.locator('button').filter({ hasText: /분석 시작/ })
    const isRunEnabled = await runBtn.first().isEnabled().catch(() => false)
    if (!isRunEnabled) {
      await selectVariables(page, 'group', 'value')
    } else {
      console.log('[llm-t-test] 변수 자동 할당됨')
    }

    // 분석 실행
    await clickAnalysisRun(page)

    // Step 4: 결과 대기
    const hasResults = await waitForResults(page, 120000)
    expect(hasResults).toBeTruthy()

    // 결과 검증
    const results = await verifyStatisticalResults(page)
    console.log(`[llm-t-test] ${results.details}`)
    expect(results.hasStatistic).toBeTruthy()
    expect(results.hasPValue).toBeTruthy()

    // data-testid 기반 결과 요소 존재 확인
    await expect(page.locator('[data-testid="results-main-card"]')).toBeVisible({ timeout: 5000 })
    await expect(page.locator('[data-testid="action-buttons"]')).toBeVisible({ timeout: 5000 })

    // 스크린샷 저장
    await page.screenshot({ path: 'e2e/results/screenshots/llm-t-test-result.png', fullPage: true })
  })
})
