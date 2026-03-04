/**
 * Graph Studio E2E Tests
 *
 * 설계 원칙:
 * - 모든 셀렉터는 data-testid 기반 (e2e/selectors.ts의 S 레지스트리 사용)
 * - 각 테스트는 beforeEach에서 /graph-studio로 이동 (독립 실행 가능)
 * - chart 렌더 timeout: 15000ms / 파일 처리: 10000ms
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

const testStart = Date.now()
function log(tag: string, msg: string): void {
  const sec = ((Date.now() - testStart) / 1000).toFixed(1)
  console.log(`[+${sec}s][${tag}] ${msg}`)
}

async function navigateToGraphStudio(page: Page): Promise<void> {
  await page.goto('/graph-studio', { waitUntil: 'domcontentloaded', timeout: 60_000 })
  await page.waitForSelector(S.graphStudioPage, { timeout: 15_000 })
  log('navigate', '/graph-studio 로드 완료')
}

/** 차트 유형 썸네일 클릭 → 샘플 데이터로 에디터 진입 */
async function enterEditorViaSampleChart(page: Page, chartType = 'bar'): Promise<void> {
  const thumbnail = page.locator(S.graphStudioChartType(chartType))
  await thumbnail.waitFor({ state: 'visible', timeout: 10_000 })
  await thumbnail.click()
  log('enterEditor', `graph-studio-chart-type-${chartType} 클릭`)
  await page.waitForSelector(S.graphStudioChart, { timeout: 15_000 })
  log('enterEditor', 'graph-studio-chart 렌더됨 — 에디터 모드 진입 완료')
}

// ── 테스트 ──────────────────────────────────────────────────────────────────

test.describe('Graph Studio', () => {
  test.beforeEach(async ({ page }) => {
    await navigateToGraphStudio(page)
  })

  // T1: 업로드 모드 렌더링 (smoke)
  test('T1: 업로드 모드 렌더링 (smoke)', async ({ page }) => {
    await expect(page.locator(S.graphStudioPage)).toBeVisible({ timeout: 10_000 })
    await expect(page.locator(S.graphStudioDropzone)).toBeVisible({ timeout: 10_000 })
    await expect(page.locator(S.graphStudioUploadZone)).toBeVisible({ timeout: 10_000 })
    await expect(page.locator(S.graphStudioFileUploadBtn)).toBeVisible({ timeout: 10_000 })
    await expect(page.locator(S.graphStudioChartType('bar'))).toBeVisible({ timeout: 10_000 })
    log('T1', '업로드 모드 smoke 검증 완료')
  })

  // T2: 차트 유형 클릭 → 에디터 진입 (샘플 데이터)
  test('T2: 차트 유형 클릭 → 에디터 진입 (샘플 데이터)', async ({ page }) => {
    // before: upload-zone 보임
    await expect(page.locator(S.graphStudioUploadZone)).toBeVisible({ timeout: 10_000 })

    await enterEditorViaSampleChart(page, 'bar')

    // after: chart + side-panel 렌더, upload-zone 사라짐
    await expect(page.locator(S.graphStudioChart)).toBeVisible({ timeout: 15_000 })
    await expect(page.locator(S.graphStudioSidePanel)).toBeVisible({ timeout: 10_000 })
    await expect(page.locator(S.graphStudioUploadZone)).not.toBeVisible({ timeout: 5_000 })

    log('T2', '에디터 진입 검증 완료')
  })

  // T3: 파일 업로드 → 에디터 전환
  test('T3: 파일 업로드 → 에디터 전환', async ({ page }) => {
    // before: upload-zone 보임
    await expect(page.locator(S.graphStudioUploadZone)).toBeVisible({ timeout: 10_000 })

    const csvPath = path.resolve(
      __dirname,
      '../public/test-data/독립표본t검정_암수차이.csv',
    )
    log('T3', `파일 경로: ${csvPath}`)

    // upload-zone 내 숨김 input에 파일 직접 주입
    const fileInput = page.locator(`${S.graphStudioUploadZone} input[type="file"]`)
    await fileInput.setInputFiles(csvPath)
    log('T3', 'setInputFiles 완료')

    // after: chart 렌더
    await page.waitForSelector(S.graphStudioChart, { timeout: 10_000 })
    await expect(page.locator(S.graphStudioChart)).toBeVisible()

    log('T3', '파일 업로드 → 에디터 전환 검증 완료')
  })

  // T4: 에디터 사이드 패널 탭 전환
  test('T4: 에디터 사이드 패널 탭 전환', async ({ page }) => {
    await enterEditorViaSampleChart(page, 'bar')
    await expect(page.locator(S.graphStudioSidePanel)).toBeVisible({ timeout: 10_000 })

    const dataTab = page.locator(S.graphStudioTabData)
    const styleTab = page.locator(S.graphStudioTabStyle)

    // 데이터 탭 클릭 → active
    await dataTab.waitFor({ state: 'visible', timeout: 5_000 })
    await dataTab.click()
    await expect(dataTab).toHaveAttribute('data-state', 'active', { timeout: 5_000 })
    log('T4', 'data 탭 active 확인')

    // 스타일 탭 클릭 → active, data 탭 inactive
    await styleTab.click()
    await expect(styleTab).toHaveAttribute('data-state', 'active', { timeout: 5_000 })
    await expect(dataTab).not.toHaveAttribute('data-state', 'active')
    log('T4', 'style 탭 active, data 탭 inactive 확인')
  })

  // T5: 사이드 패널 토글
  test('T5: 사이드 패널 토글', async ({ page }) => {
    await enterEditorViaSampleChart(page, 'bar')

    // before: 열림
    await expect(page.locator(S.graphStudioSidePanel)).toBeVisible({ timeout: 10_000 })

    const sideToggle = page.locator(S.graphStudioSideToggle)
    await sideToggle.waitFor({ state: 'visible', timeout: 5_000 })

    // 클릭 → 닫힘
    await sideToggle.click()
    await expect(page.locator(S.graphStudioSidePanel)).not.toBeVisible({ timeout: 5_000 })
    log('T5', '사이드 패널 닫힘 확인')

    // 재클릭 → 열림
    await sideToggle.click()
    await expect(page.locator(S.graphStudioSidePanel)).toBeVisible({ timeout: 5_000 })
    log('T5', '사이드 패널 재열림 확인')
  })

  // T6: AI 패널 토글 (smoke)
  test('T6: AI 패널 토글 (smoke)', async ({ page }) => {
    await enterEditorViaSampleChart(page, 'bar')

    const aiToggle = page.locator(S.graphStudioAiToggle)
    await aiToggle.waitFor({ state: 'visible', timeout: 5_000 })

    // before: AI 입력창 없음
    await expect(page.locator(S.graphStudioAiInput)).not.toBeVisible({ timeout: 2_000 })

    // 클릭 → ai-panel-input, ai-panel-send 렌더
    await aiToggle.click()
    await expect(page.locator(S.graphStudioAiInput)).toBeVisible({ timeout: 10_000 })
    await expect(page.locator(S.graphStudioAiSend)).toBeVisible({ timeout: 5_000 })
    log('T6', 'AI 패널 렌더링 확인')
  })
})
