/**
 * Graph Studio E2E Tests
 *
 * 설계 원칙:
 * - 모든 셀렉터는 data-testid 기반 (e2e/selectors.ts의 S 레지스트리 사용)
 * - 각 테스트는 beforeEach에서 /graph-studio로 이동 (독립 실행 가능)
 * - hydration 완료 신호: html[data-graph-studio-ready="true"] (page.tsx useEffect)
 *
 * T1: 업로드 모드 렌더링 (smoke)
 * T2: 차트 유형 클릭 → 에디터 진입 (샘플 데이터)
 * T3: 파일 업로드 → 에디터 전환
 * T4: 에디터 사이드 패널 탭 전환
 * T5: 사이드 패널 토글
 * T6: AI 패널 토글 (smoke)
 *
 * 실행: npx playwright test e2e/graph-studio-e2e.spec.ts --headed
 */

import { test, expect, type Page } from '@playwright/test'
import path from 'path'
import { S } from './selectors'

// ── 헬퍼 ────────────────────────────────────────────────────────────────────

/** /graph-studio로 이동 후 React hydration 완료까지 대기.
 *
 * about:blank 경유:
 *   - 동일 URL 재방문 시 Next.js SPA 소프트 내비게이션을 방지
 *   - Zustand 스토어 상태가 이전 테스트로부터 누수되지 않음
 *
 * html[data-graph-studio-ready="true"] 대기:
 *   - page.tsx의 useEffect가 React hydration 완료 후 설정
 *   - SSR에서는 실행되지 않으므로 이 속성 = 이벤트 핸들러 부착 완료 보장
 *   - waitForTimeout 같은 타이머 기반 방식보다 결정론적
 */
async function navigateToGraphStudio(page: Page): Promise<void> {
  await page.goto('about:blank')
  await page.goto('/graph-studio', { waitUntil: 'load', timeout: 60_000 })
  // waitForSelector는 html 요소에 대해 visibility 체크를 수행하므로 간헐적 타임아웃 발생.
  // waitForFunction은 JS로 직접 속성을 확인 → 더 신뢰성 있음.
  await page.waitForFunction(
    () => document.documentElement.getAttribute('data-graph-studio-ready') === 'true',
    { timeout: 30_000 },
  )
}

/** 차트 유형 썸네일 클릭 → 샘플 데이터로 에디터 진입.
 *
 * navigateToGraphStudio 완료 후 호출 → hydration 보장 상태.
 * ECharts 첫 초기화는 무거우므로 chart attached 대기를 10s로 설정.
 */
async function enterEditorViaSampleChart(page: Page, chartType = 'bar'): Promise<void> {
  const thumbnail = page.locator(S.graphStudioChartType(chartType))
  await thumbnail.waitFor({ state: 'visible', timeout: 10_000 })
  await thumbnail.click()

  await page.waitForSelector(S.graphStudioChart, { state: 'attached', timeout: 10_000 })
}

// ── 테스트 ──────────────────────────────────────────────────────────────────

test.describe('Graph Studio', () => {
  test.beforeEach(async ({ page }) => {
    // pageerror 수집 → SyntaxError 등 JS 런타임 에러를 30s 타임아웃 대신 즉시 노출
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
    await expect(page.locator(S.graphStudioChartType('bar'))).toBeVisible()
  })

  // T2: 차트 유형 클릭 → 에디터 진입 (샘플 데이터)
  test('T2: 차트 유형 클릭 → 에디터 진입 (샘플 데이터)', async ({ page }) => {
    // before: upload-zone 보임
    await expect(page.locator(S.graphStudioUploadZone)).toBeVisible()

    await enterEditorViaSampleChart(page, 'bar')

    // after: chart + side-panel 렌더, upload-zone 사라짐
    await expect(page.locator(S.graphStudioChart)).toBeVisible({ timeout: 15_000 })
    await expect(page.locator(S.graphStudioSidePanel)).toBeVisible()
    await expect(page.locator(S.graphStudioUploadZone)).not.toBeVisible()
  })

  // T3: 파일 업로드 → 에디터 전환
  test('T3: 파일 업로드 → 에디터 전환', async ({ page }) => {
    // before: upload-zone 보임
    await expect(page.locator(S.graphStudioUploadZone)).toBeVisible()

    const csvPath = path.resolve(
      __dirname,
      '../public/test-data/독립표본t검정_암수차이.csv',
    )

    // data-testid="graph-studio-file-input" — sr-only input에 직접 파일 설정
    // react-dropzone의 getInputProps() input(noClick:true)과 달리 onChange가 확실히 발화
    await page.locator(S.graphStudioFileInput).setInputFiles(csvPath)

    // after: CSV 파싱 + 스토어 업데이트 + chart 렌더
    await expect(page.locator(S.graphStudioChart)).toBeVisible({ timeout: 20_000 })
  })

  // T4: 에디터 사이드 패널 탭 전환
  test('T4: 에디터 사이드 패널 탭 전환', async ({ page }) => {
    await enterEditorViaSampleChart(page, 'bar')
    await expect(page.locator(S.graphStudioSidePanel)).toBeVisible()

    const dataTab = page.locator(S.graphStudioTabData)
    const styleTab = page.locator(S.graphStudioTabStyle)

    // before: data 탭 → active 전환
    await dataTab.click()
    await expect(dataTab).toHaveAttribute('data-state', 'active')

    // after: style 탭 → active, data 탭 → inactive
    await styleTab.click()
    await expect(styleTab).toHaveAttribute('data-state', 'active')
    await expect(dataTab).not.toHaveAttribute('data-state', 'active')
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
