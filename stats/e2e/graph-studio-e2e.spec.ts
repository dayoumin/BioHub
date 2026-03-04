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
  await page.goto('/graph-studio', { waitUntil: 'load', timeout: 60_000 })
  // cold start 대비 30s (dev 서버 첫 로드 시 느릴 수 있음)
  await page.waitForSelector(S.graphStudioPage, { timeout: 30_000 })
  // Next.js 클라이언트 하이드레이션 완료 대기: chart-type 버튼이 보이고 상호작용 가능할 때까지.
  // 'load' 이벤트 후에도 Next.js/React 하이드레이션이 비동기로 진행될 수 있으므로
  // 실제 인터랙티브 요소가 렌더될 때까지 기다림.
  await page.waitForSelector(S.graphStudioChartType('bar'), { state: 'visible', timeout: 30_000 })
  log('navigate', '/graph-studio 로드 완료')
}

/** 차트 유형 썸네일 클릭 → 샘플 데이터로 에디터 진입
 *
 * 수정 내역:
 * - Feedback Mascot 비활성화 범위 확대 (fixed + z-50 뿐 아니라 모든 fixed 오버레이)
 * - thumbnail.click() 후 DOM evaluate 클릭으로 React synthetic event 재트리거
 * - waitForSelector state: 'attached' 로 변경 (높이 0인 경우도 통과)
 * - 이후 별도 toBeVisible() 검증
 */
async function enterEditorViaSampleChart(page: Page, chartType = 'bar'): Promise<void> {
  // 모든 fixed position 오버레이 요소의 pointer-events 비활성화
  await page.evaluate(() => {
    // FeedbackPanel 마스코트, Next.js Dev Tools 등 fixed 요소 차단
    document.querySelectorAll<HTMLElement>('[class*="fixed"]').forEach(el => {
      if (el instanceof HTMLElement) {
        el.style.pointerEvents = 'none'
      }
    })
    // Next.js 개발 도구 오버레이 숨김
    document.querySelectorAll<HTMLElement>('nextjs-portal').forEach(el => {
      el.style.display = 'none'
    })
  })

  const thumbnail = page.locator(S.graphStudioChartType(chartType))
  await thumbnail.waitFor({ state: 'visible', timeout: 10_000 })

  // 콘솔 에러 캡처 시작
  const consoleErrors: string[] = []
  const errorHandler = (msg: { type: () => string; text: () => string }) => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text())
    }
  }
  page.on('console', errorHandler)

  // 1차 시도: Playwright click()
  await thumbnail.click()
  log('enterEditor', `graph-studio-chart-type-${chartType} 클릭 (1차)`)

  // React 상태 업데이트 대기 (chart가 DOM에 붙거나 최대 1초 대기)
  const chartAttached = await page.waitForSelector(S.graphStudioChart, {
    state: 'attached',
    timeout: 1_000,
  }).then(() => true).catch(() => false)

  // chart가 아직 없으면 2차 시도: 네이티브 DOM click
  const chartVisible = chartAttached && await page.locator(S.graphStudioChart).isVisible()
  if (!chartVisible) {
    log('enterEditor', '1차 클릭 후 chart 미등장, 네이티브 DOM click 시도')
    await page.evaluate((selector) => {
      const el = document.querySelector(selector)
      if (el instanceof HTMLElement) {
        el.click()
      }
    }, S.graphStudioChartType(chartType))
    log('enterEditor', `graph-studio-chart-type-${chartType} 클릭 (2차 DOM click)`)
  }

  // chart 등장 대기 (attached 기준 — DOM 추가만 확인)
  try {
    await page.waitForSelector(S.graphStudioChart, { state: 'attached', timeout: 15_000 })
    log('enterEditor', 'graph-studio-chart DOM에 추가됨')
  } catch (e) {
    // 에러 정보 로그
    if (consoleErrors.length > 0) {
      log('enterEditor', `콘솔 에러: ${consoleErrors.join(', ')}`)
    }
    // 페이지 상태 덤프
    const isEditorMode = await page.evaluate(() => {
      return document.querySelector('[data-testid="graph-studio-chart"]') !== null
    })
    log('enterEditor', `graph-studio-chart DOM 존재: ${isEditorMode}`)
    const storeState = await page.evaluate(() => {
      // Next.js webpack 번들에서 모듈 접근은 불가하므로 DOM 상태로 추론
      const uploadZone = document.querySelector('[data-testid="graph-studio-upload-zone"]')
      const chart = document.querySelector('[data-testid="graph-studio-chart"]')
      return {
        uploadZoneVisible: uploadZone !== null,
        chartVisible: chart !== null,
      }
    })
    log('enterEditor', `DOM 상태: ${JSON.stringify(storeState)}`)
    throw e
  } finally {
    page.off('console', errorHandler)
  }

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

    // react-dropzone의 getInputProps() input을 타겟팅 (dropzone 루트 안의 첫 번째 hidden input)
    // graph-studio-dropzone 바로 아래의 input[type="file"]
    const fileInput = page.locator(`${S.graphStudioDropzone} > input[type="file"]`)
    const fileInputCount = await fileInput.count()
    log('T3', `dropzone input 개수: ${fileInputCount}`)

    if (fileInputCount > 0) {
      // dropzone의 getInputProps() input에 setInputFiles
      await fileInput.setInputFiles(csvPath)
      log('T3', 'dropzone input setInputFiles 완료')
    } else {
      // fallback: graph-studio-upload-zone 내 sr-only input
      const srInput = page.locator(`${S.graphStudioUploadZone} input[type="file"]`)
      await srInput.setInputFiles(csvPath)
      log('T3', 'sr-only input setInputFiles 완료')
    }

    // after: chart 렌더 (CSV 파싱 + 스토어 업데이트 대기)
    await page.waitForSelector(S.graphStudioChart, { state: 'attached', timeout: 20_000 })
    await expect(page.locator(S.graphStudioChart)).toBeVisible({ timeout: 5_000 })

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
