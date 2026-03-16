/**
 * Graph Studio E2E Tests
 *
 * 설계 원칙:
 * - 모든 셀렉터는 data-testid 기반 (e2e/selectors.ts의 S 레지스트리 사용)
 * - 각 테스트는 beforeEach에서 /graph-studio로 이동 (독립 실행 가능)
 * - hydration 완료 신호: html[data-graph-studio-ready="true"] (page.tsx useEffect)
 *
 * 흐름 (G5.0):
 *   Step 1 (upload) → Step 2 (setup: 차트 타입 + 필드 매핑) → Step 3 (editor)
 *
 * T1: 업로드 모드 렌더링 (smoke)
 * T2: 샘플 데이터 → 설정 → 에디터 진입
 * T3: 파일 업로드 → 설정 → 에디터 전환
 * T4: 에디터 사이드 패널 탭 전환
 * T5: 사이드 패널 토글
 * T6: AI 패널 토글 (smoke)
 *
 * 실행: npx playwright test --config=playwright-graph.config.ts
 */

import { test, expect, type Page } from '@playwright/test'
import path from 'path'
import { S } from './selectors'

// ── 헬퍼 ────────────────────────────────────────────────────────────────────

/** /graph-studio로 이동 후 React hydration 완료까지 대기. */
async function navigateToGraphStudio(page: Page): Promise<void> {
  await page.goto('about:blank')
  await page.goto('/graph-studio', { waitUntil: 'load', timeout: 60_000 })
  await page.waitForFunction(
    () => document.documentElement.getAttribute('data-graph-studio-ready') === 'true',
    { timeout: 30_000 },
  )
}

/** Step 1 → 2: 샘플 데이터 로드 → ChartSetupPanel 진입 */
async function loadSampleData(page: Page): Promise<void> {
  const sampleBtn = page.locator(S.graphStudioSampleBtn)
  await sampleBtn.waitFor({ state: 'visible', timeout: 10_000 })
  await sampleBtn.click()
  // setup 모드 대기: 차트 타입 선택 그리드가 보일 때까지
  await page.locator(S.graphStudioChartType('bar')).waitFor({ state: 'visible', timeout: 10_000 })
}

/** Step 2 → 3: 차트 타입 선택 + "차트 만들기" → 에디터 진입 */
async function createChart(page: Page, chartType = 'bar'): Promise<void> {
  const typeBtn = page.locator(S.graphStudioChartType(chartType))
  await typeBtn.waitFor({ state: 'visible', timeout: 10_000 })
  await typeBtn.click()

  const createBtn = page.locator(S.graphStudioCreateBtn)
  await createBtn.waitFor({ state: 'visible', timeout: 5_000 })
  await createBtn.click()

  await page.waitForSelector(S.graphStudioChart, { state: 'attached', timeout: 15_000 })
}

/** 샘플 데이터 → 에디터 진입 (전체 흐름) */
async function enterEditorViaSampleChart(page: Page, chartType = 'bar'): Promise<void> {
  await loadSampleData(page)
  await createChart(page, chartType)
}

// ── 테스트 ──────────────────────────────────────────────────────────────────

test.describe('Graph Studio', () => {
  test.beforeEach(async ({ page }) => {
    const pageErrors: Error[] = []
    page.on('pageerror', err => pageErrors.push(err))

    await navigateToGraphStudio(page)

    if (pageErrors.length > 0) {
      throw new Error(`페이지 로드 중 JS 에러:\n${pageErrors.map(e => e.message).join('\n')}`)
    }
  })

  // T1: 업로드 모드 렌더링 (smoke)
  test('T1: 업로드 모드 렌더링 (smoke)', async ({ page }) => {
    await expect(page.locator(S.graphStudioPage)).toBeVisible()
    await expect(page.locator(S.graphStudioDropzone)).toBeVisible()
    await expect(page.locator(S.graphStudioUploadZone)).toBeVisible()
    await expect(page.locator(S.graphStudioFileUploadBtn)).toBeVisible()
    await expect(page.locator(S.graphStudioSampleBtn)).toBeVisible()
  })

  // T2: 샘플 데이터 → 설정 → 에디터 진입
  test('T2: 샘플 데이터 → 설정 → 에디터 진입', async ({ page }) => {
    // before: upload 모드
    await expect(page.locator(S.graphStudioUploadZone)).toBeVisible()

    // Step 1 → 2: 샘플 데이터 로드
    await loadSampleData(page)

    // setup 모드: 차트 타입 그리드 + 만들기 버튼 보임, 업로드 영역 사라짐
    await expect(page.locator(S.graphStudioChartType('bar'))).toBeVisible()
    await expect(page.locator(S.graphStudioCreateBtn)).toBeVisible()
    await expect(page.locator(S.graphStudioUploadZone)).not.toBeVisible()

    // Step 2 → 3: 차트 만들기
    await createChart(page, 'bar')

    // editor 모드: 차트 + 사이드 패널 렌더
    await expect(page.locator(S.graphStudioChart)).toBeVisible({ timeout: 15_000 })
    await expect(page.locator(S.graphStudioSidePanel)).toBeVisible()
  })

  // T3: 파일 업로드 → 설정 → 에디터 전환
  test('T3: 파일 업로드 → 에디터 전환', async ({ page }) => {
    // before: upload 모드
    await expect(page.locator(S.graphStudioUploadZone)).toBeVisible()

    const csvPath = path.resolve(
      __dirname,
      '../public/test-data/독립표본t검정_암수차이.csv',
    )

    // Step 1: 파일 업로드 → setup 모드로 전환
    await page.locator(S.graphStudioFileInput).setInputFiles(csvPath)

    // setup 모드 대기
    await page.locator(S.graphStudioChartType('bar')).waitFor({ state: 'visible', timeout: 20_000 })

    // Step 2 → 3: 차트 만들기
    await createChart(page, 'bar')

    // editor 모드: 차트 렌더
    await expect(page.locator(S.graphStudioChart)).toBeVisible({ timeout: 15_000 })
  })

  // T4: 에디터 사이드 패널 아코디언 토글
  test('T4: 에디터 사이드 패널 아코디언 토글', async ({ page }) => {
    await enterEditorViaSampleChart(page, 'bar')
    await expect(page.locator(S.graphStudioSidePanel)).toBeVisible()

    const dataTab = page.locator(S.graphStudioTabData)
    const styleTab = page.locator(S.graphStudioTabStyle)

    // 두 트리거 모두 존재 확인
    await expect(dataTab).toBeVisible()
    await expect(styleTab).toBeVisible()

    // 스타일 섹션 토글: 현재 상태 확인 후 반전 검증
    const styleBefore = await styleTab.getAttribute('data-state')
    await styleTab.click()
    const styleAfter = await styleTab.getAttribute('data-state')
    // 토글 동작 확인: open↔closed 전환됨
    expect(styleBefore).not.toBe(styleAfter)
  })

  // T5: 사이드 패널 토글
  test('T5: 사이드 패널 토글', async ({ page }) => {
    await enterEditorViaSampleChart(page, 'bar')

    // before: 열림
    await expect(page.locator(S.graphStudioSidePanel)).toBeVisible()

    // 클릭 → 닫힘
    await page.locator(S.graphStudioSideToggle).click()
    await expect(page.locator(S.graphStudioSidePanel)).not.toBeVisible()

    // 재클릭 → 열림
    await page.locator(S.graphStudioSideToggle).click()
    await expect(page.locator(S.graphStudioSidePanel)).toBeVisible()
  })

  // T6: AI 패널 토글 (smoke)
  test('T6: AI 패널 토글 (smoke)', async ({ page }) => {
    await enterEditorViaSampleChart(page, 'bar')

    const aiToggle = page.locator(S.graphStudioAiToggle)
    await aiToggle.waitFor({ state: 'visible' })

    // before: AI 입력창 없음
    await expect(page.locator(S.graphStudioAiInput)).not.toBeVisible()

    // 클릭 → ai-panel-input, ai-panel-send 렌더
    await aiToggle.click()
    await expect(page.locator(S.graphStudioAiInput)).toBeVisible({ timeout: 10_000 })
    await expect(page.locator(S.graphStudioAiSend)).toBeVisible()
  })
})
