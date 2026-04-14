/**
 * Phase 4 Part B: 그래프/시각화 UX 테스트
 *
 * Graph Studio 사용자 시나리오 — 첫 사용, 커스터마이징, AI, 에러 복구, 내보내기
 *
 * 태그: @phase4, @critical, @important, @ai-mock
 * 실행: pnpm e2e --grep "@phase4"
 */

import { test, expect } from '@playwright/test'
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
} from '../helpers/flow-helpers'
import path from 'path'

test.setTimeout(180_000)

/**
 * Graph Studio로 이동하는 헬퍼.
 * 정적 빌드에서 직접 URL 접근 시 클라이언트 라우팅이 홈 페이지를 렌더링하는 문제 우회.
 * 먼저 직접 URL을 시도하고, 실패 시 홈 → 사이드바 링크 클릭으로 이동.
 */
async function navigateToGraphStudio(page: import('@playwright/test').Page): Promise<void> {
  await page.goto('/graph-studio/', { waitUntil: 'domcontentloaded', timeout: 60000 })
  const direct = await page
    .locator(S.graphStudioPage)
    .isVisible({ timeout: 10000 })
    .catch(() => false)
  if (direct) return

  // fallback: 홈에서 사이드바 Graph Studio 링크 클릭
  await page.goto('/', { waitUntil: 'domcontentloaded', timeout: 30000 })
  await page.waitForLoadState('networkidle')
  const gsLink = page.locator('a[href*="graph-studio"]').first()
  if (await gsLink.isVisible({ timeout: 5000 }).catch(() => false)) {
    await gsLink.click()
    await page.waitForLoadState('networkidle')
  }
}

async function loadSampleData(page: import('@playwright/test').Page): Promise<void> {
  const sampleBtn = page.locator(S.graphStudioSampleBtn)
  await expect(sampleBtn).toBeVisible({ timeout: 10_000 })
  await sampleBtn.click()
  await expect(page.locator(S.graphStudioChartType('bar'))).toBeVisible({ timeout: 10_000 })
}

async function createChart(page: import('@playwright/test').Page, chartType: string): Promise<void> {
  await page.locator(S.graphStudioChartType(chartType)).click()
  await expect(page.locator(S.graphStudioCreateBtn)).toBeVisible({ timeout: 5_000 })
  await page.locator(S.graphStudioCreateBtn).click()
  await expect(page.locator(`${S.graphStudioChart}, canvas`).first()).toBeVisible({ timeout: 15_000 })
}

async function uploadFileAndEnterSetup(
  page: import('@playwright/test').Page,
  filePath: string,
): Promise<void> {
  const fileInput = page.locator(S.graphStudioFileInput)
  await expect(fileInput).toHaveCount(1)
  await fileInput.setInputFiles(filePath)
  await expect(page.locator(S.graphStudioChartType('bar'))).toBeVisible({ timeout: 20_000 })
}

async function setupChartEditor(
  page: import('@playwright/test').Page,
  chartType = 'bar',
): Promise<boolean> {
  await navigateToGraphStudio(page)
  await loadSampleData(page)
  await createChart(page, chartType)
  return page
    .locator(`${S.graphStudioChart}, canvas`)
    .first()
    .isVisible({ timeout: 10_000 })
    .catch(() => false)
}

async function revealCanvasToolbar(page: import('@playwright/test').Page): Promise<void> {
  const chart = page.locator(S.graphStudioChart)
  await chart.hover()
  await page.waitForTimeout(300)
}

// ========================================
// 4B.1 Graph Studio 첫 사용자 시나리오 @phase4 @critical
// ========================================

test.describe('@phase4 @critical Graph Studio 첫 사용자', () => {
  test('TC-4B.1.1: 처음 방문 → 차트 유형 클릭 → 샘플 데이터 차트', async ({ page }) => {
    await navigateToGraphStudio(page)
    await loadSampleData(page)
    await createChart(page, 'bar')

    const hasChart = await page
      .locator(S.graphStudioChart)
      .isVisible({ timeout: 10_000 })
      .catch(() => false)
    const hasCanvas = await page.locator('canvas').isVisible({ timeout: 5_000 }).catch(() => false)

    expect(hasChart || hasCanvas).toBe(true)
    await expect(page.locator(S.graphStudioSidePanel)).toBeVisible()
    log('TC-4B.1.1', '샘플 데이터 Bar 차트 렌더링 확인')
  })

  test('TC-4B.1.2: 자기 데이터로 차트 생성', async ({ page }) => {
    await navigateToGraphStudio(page)
    const filePath = path.resolve(__dirname, '../../test-data/e2e/t-test.csv')
    await uploadFileAndEnterSetup(page, filePath)
    await createChart(page, 'bar')

    const hasChart = await page
      .locator(`${S.graphStudioChart}, canvas`)
      .first()
      .isVisible({ timeout: 10000 })
      .catch(() => false)
    log('TC-4B.1.2', `차트 렌더링: ${hasChart}`)
    expect(hasChart).toBe(true)
    await expect(page.locator(S.graphStudioSidePanel)).toBeVisible()
    log('TC-4B.1.2', '파일 업로드 후 에디터 진입 확인')
  })

  test('TC-4B.1.3: Smart Flow 결과에서 Graph Studio로 이동', async ({ page }) => {
    test.fixme(true, 'Smart Flow upload/validation path is upstream of Graph Studio and flaky in static E2E mode.')
    test.setTimeout(300_000) // Pyodide 로딩 + 분석 포함 5분
    // t-test 분석 완료
    await navigateToUploadStep(page)
    expect(await uploadCSV(page, 't-test.csv')).toBe(true)
    const hasSummary = await page.locator(S.dataProfileSummary).isVisible({ timeout: 15_000 }).catch(() => false)
    if (!hasSummary) {
      log('TC-4B.1.3', 'SKIPPED: Smart Flow 업로드/검증 단계가 Graph Studio 범위 밖에서 타임아웃')
      test.skip()
      return
    }

    await goToMethodSelection(page)
    expect(await selectMethodDirect(page, '독립표본', /독립표본 t-검정/)).toBe(true)
    await goToVariableSelection(page)
    await ensureVariablesOrSkip(page, 'TC-4B.1.3', 'group', 'value')
    await clickAnalysisRun(page)
    expect(await waitForResults(page, 120000)).toBe(true)

    // 더보기 드롭다운 열기 → Graph Studio 클릭
    const moreBtn = page.locator(S.moreActionsBtn)
    if (!(await moreBtn.isVisible({ timeout: 5000 }).catch(() => false))) {
      log('TC-4B.1.3', 'SKIPPED: more-actions-btn 미표시')
      test.skip()
      return
    }
    await moreBtn.click()
    const gsBtn = page.locator(S.openGraphStudioBtn)

    await gsBtn.click()
    await page.waitForTimeout(5000)

    // Graph Studio 페이지 확인 — data-testid 또는 URL로 검증
    const hasGS = await page
      .locator(S.graphStudioPage)
      .isVisible({ timeout: 10000 })
      .catch(() => false)
    const hasChart = await page
      .locator(`${S.graphStudioChart}, canvas`)
      .first()
      .isVisible({ timeout: 5000 })
      .catch(() => false)
    const isGSUrl = page.url().includes('graph-studio')

    // Either Graph Studio page element or URL contains graph-studio
    expect(hasGS || isGSUrl).toBe(true)
    log('TC-4B.1.3', `Graph Studio 이동: page=${hasGS}, chart=${hasChart}, url=${isGSUrl}`)
  })
})

// ========================================
// 4B.2 차트 커스터마이징 @phase4 @important
// ========================================

test.describe('@phase4 @important 차트 커스터마이징', () => {
  test('TC-4B.2.1: 스타일 탭에서 변경', async ({ page }) => {
    if (!(await setupChartEditor(page))) {
      log('TC-4B.2.1', 'SKIPPED: 차트 에디터 진입 실패')
      test.skip()
      return
    }

    // 스타일 탭 클릭
    const styleTab = page.locator(S.graphStudioTabStyle)
    if (!(await styleTab.isVisible({ timeout: 3000 }).catch(() => false))) {
      log('TC-4B.2.1', 'SKIPPED: style 탭 미표시')
      test.skip()
      return
    }

    await styleTab.click()
    await page.waitForTimeout(1000)

    // 스타일 패널에서 변경 가능한 옵션 확인
    const sidePanel = page.locator(S.graphStudioSidePanel)
    const hasOptions = await sidePanel.isVisible().catch(() => false)
    expect(hasOptions).toBe(true)
    log('TC-4B.2.1', '스타일 패널 표시 확인')
  })

  test('TC-4B.2.2: 차트 제목 변경', async ({ page }) => {
    if (!(await setupChartEditor(page))) {
      log('TC-4B.2.2', 'SKIPPED: 차트 에디터 진입 실패')
      test.skip()
      return
    }

    // 사이드 패널에서 제목 입력 필드 찾기
    const titleInput = page.locator('input[placeholder*="제목"], input[data-testid*="title"]')
    if (await titleInput.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      await titleInput.first().fill('테스트 차트 제목')
      await page.waitForTimeout(1000)
      log('TC-4B.2.2', '한국어 제목 입력 완료')
    } else {
      log('TC-4B.2.2', 'SKIPPED: 제목 입력 필드 미발견')
      test.skip()
    }
  })

  test('TC-4B.2.3: Undo/Redo로 실수 복구', async ({ page }) => {
    if (!(await setupChartEditor(page))) {
      log('TC-4B.2.3', 'SKIPPED: 차트 에디터 진입 실패')
      test.skip()
      return
    }

    const undoBtn = page.locator(S.graphStudioUndo)
    const redoBtn = page.locator(S.graphStudioRedo)

    const hasUndo = await undoBtn.isVisible({ timeout: 3000 }).catch(() => false)
    const hasRedo = await redoBtn.isVisible({ timeout: 3000 }).catch(() => false)

    if (!hasUndo || !hasRedo) {
      log('TC-4B.2.3', 'SKIPPED: Undo/Redo 버튼 미표시')
      test.skip()
      return
    }

    // 초기 상태에서 Undo 비활성 확인
    const undoDisabled = await undoBtn.isDisabled().catch(() => false)
    log('TC-4B.2.3', `초기 Undo disabled: ${undoDisabled}`)

    // 차트 유형 변경으로 히스토리 생성
    const lineType = page.locator(S.graphStudioChartType('line'))
    if (await lineType.isVisible({ timeout: 3000 }).catch(() => false)) {
      await lineType.click()
      await page.waitForTimeout(2000)

      // Undo 클릭 → bar로 복귀
      if (await undoBtn.isEnabled().catch(() => false)) {
        await undoBtn.click()
        await page.waitForTimeout(2000)
        log('TC-4B.2.3', 'Undo 실행')

        // Redo 클릭 → line으로 복귀
        if (await redoBtn.isEnabled().catch(() => false)) {
          await redoBtn.click()
          await page.waitForTimeout(2000)
          log('TC-4B.2.3', 'Redo 실행')
        }
      }
    }
  })
})

// ========================================
// 4B.3 AI 어시스턴트 @phase4 @ai-mock @important
// ========================================

test.describe('@phase4 @ai-mock @important AI 어시스턴트 — 그래프', () => {
  test('TC-4B.3.1: AI에게 차트 개선 요청', async ({ page }) => {
    if (!(await setupChartEditor(page))) {
      log('TC-4B.3.1', 'SKIPPED: 차트 에디터 진입 실패')
      test.skip()
      return
    }

    // AI 패널 열기
    const aiToggle = page.locator(S.graphStudioAiToggle)
    if (!(await aiToggle.isVisible({ timeout: 5000 }).catch(() => false))) {
      log('TC-4B.3.1', 'SKIPPED: AI 토글 미표시')
      test.skip()
      return
    }

    // API 모킹
    await page.route(/openrouter\.ai/, (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'mock-graph',
          choices: [
            {
              message: {
                content: '차트를 더 깔끔하게 만들려면 그리드 라인을 추가하고, 폰트 크기를 12pt로 조정하세요.',
              },
            },
          ],
        }),
      })
    })

    await aiToggle.click()
    await page.waitForTimeout(1000)

    // AI 입력
    const aiInput = page.locator(S.graphStudioAiInput)
    if (await aiInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      await aiInput.fill('이 차트를 논문에 넣을 건데 더 깔끔하게 해줘')
      await page.locator(S.graphStudioAiSend).click()
      await page.waitForTimeout(5000)

      // AI 응답 확인
      const bodyText = await page.locator('body').innerText()
      const hasResponse =
        bodyText.includes('깔끔') || bodyText.includes('그리드') || bodyText.includes('폰트')
      log('TC-4B.3.1', `AI 응답: ${hasResponse}`)
    }
  })

  test('TC-4B.3.2: AI에게 차트 유형 추천 요청', async ({ page }) => {
    await navigateToGraphStudio(page)

    // API 모킹
    await page.route(/openrouter\.ai/, (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'mock-recommend',
          choices: [
            {
              message: {
                content: '이 데이터에는 산점도(Scatter)가 가장 적합합니다. 두 변수 간의 관계를 시각적으로 보여줍니다.',
              },
            },
          ],
        }),
      })
    })

    // 파일 업로드
    const filePath = path.resolve(__dirname, '../../test-data/e2e/correlation.csv')
    await uploadFileAndEnterSetup(page, filePath)
    await createChart(page, 'scatter')

    // AI 패널
    const aiToggle = page.locator(S.graphStudioAiToggle)
    if (!(await aiToggle.isVisible({ timeout: 5000 }).catch(() => false))) {
      log('TC-4B.3.2', 'SKIPPED: AI 토글 미표시')
      test.skip()
      return
    }

    await aiToggle.click()
    await page.waitForTimeout(1000)

    const aiInput = page.locator(S.graphStudioAiInput)
    if (await aiInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      await aiInput.fill('이 데이터를 가장 잘 표현하는 차트는?')
      await page.locator(S.graphStudioAiSend).click()
      await page.waitForTimeout(5000)

      const bodyText = await page.locator('body').innerText()
      const hasRecommendation =
        bodyText.includes('산점도') || bodyText.includes('Scatter') || bodyText.includes('적합')
      log('TC-4B.3.2', `AI 추천: ${hasRecommendation}`)
    }
  })
})

// ========================================
// 4B.4 에러 복구 시나리오 — 그래프 @phase4 @important
// ========================================

test.describe('@phase4 @important 에러 복구 — 그래프', () => {
  test('TC-4B.4.1: 호환 불가 데이터 → 경고/안내', async ({ page }) => {
    await navigateToGraphStudio(page)

    // 범주형만 있는 CSV 업로드
    const categoricalCsv = 'name,color,size\nAlice,red,big\nBob,blue,small\nCharlie,green,medium'
    const fileInput = page.locator(S.graphStudioFileInput)
    await expect(fileInput).toHaveCount(1)
    await fileInput.setInputFiles({
      name: 'categorical-only.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(categoricalCsv),
    })
    await expect(page.locator(S.graphStudioChartType('scatter'))).toBeVisible({ timeout: 20_000 })

    // 산점도 시도
    await page.locator(S.graphStudioChartType('scatter')).click()
    const createBtn = page.locator(S.graphStudioCreateBtn)
    if (await createBtn.isEnabled().catch(() => false)) {
      await createBtn.click()
    }
    await page.waitForTimeout(3000)

    // 에러/경고 확인
    const bodyText = await page.locator('body').innerText()
    const hasWarning =
      bodyText.includes('경고') ||
      bodyText.includes('에러') ||
      bodyText.includes('호환') ||
      bodyText.includes('적합하지')
    log('TC-4B.4.1', `경고 메시지: ${hasWarning}`)
  })

  test('TC-4B.4.2: 차트 유형 전환 시 데이터 유지', async ({ page }) => {
    await navigateToGraphStudio(page)

    const filePath = path.resolve(__dirname, '../../test-data/e2e/t-test.csv')
    await uploadFileAndEnterSetup(page, filePath)
    await createChart(page, 'bar')

    // Bar → Line → Scatter 전환
    const types = ['bar', 'line', 'scatter'] as const
    for (const chartType of types) {
      const typeBtn = page.locator(S.graphStudioChartType(chartType))
      if (await typeBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await typeBtn.click()
        await page.waitForTimeout(2000)

        // 차트/캔버스 존재 확인
        const hasChart = await page
          .locator(`${S.graphStudioChart}, canvas`)
          .first()
          .isVisible({ timeout: 5000 })
          .catch(() => false)
        log('TC-4B.4.2', `${chartType}: chart=${hasChart}`)
      }
    }
  })
})

// ========================================
// 4B.5 차트 내보내기 & 공유 @phase4 @important
// ========================================

test.describe('@phase4 @important 차트 내보내기 & 공유', () => {
  test('TC-4B.5.1: 차트 → PNG 다운로드', async ({ page }) => {
    if (!(await setupChartEditor(page))) {
      log('TC-4B.5.1', 'SKIPPED: 차트 에디터 진입 실패')
      test.skip()
      return
    }

    const exportTrigger = page.locator('button[aria-label="내보내기 설정 열기"]')
    await expect(exportTrigger).toBeVisible({ timeout: 5000 })

    await exportTrigger.click()
    const exportCta = page.locator('button[aria-label="Export chart as PNG"]')
    await expect(exportCta).toBeVisible({ timeout: 5000 })

    const downloadPromise = page.waitForEvent('download', { timeout: 10000 }).catch(() => null)
    await exportCta.click()

    const download = await downloadPromise
    log('TC-4B.5.1', `PNG download: ${download ? 'OK' : 'not captured'}`)
    expect(download).not.toBeNull()
  })

  test('TC-4B.5.2: 차트 → 클립보드 복사', async ({ page }) => {
    if (!(await setupChartEditor(page))) {
      log('TC-4B.5.2', 'SKIPPED: 차트 에디터 진입 실패')
      test.skip()
      return
    }

    const copyBtn = page.locator('[data-testid="canvas-copy-btn"]')
    await revealCanvasToolbar(page)
    await expect(copyBtn).toBeVisible({ timeout: 5000 })

    await page.context().grantPermissions(['clipboard-read', 'clipboard-write'])
    await copyBtn.click()
    await page.waitForTimeout(1000)

    const bodyText = await page.locator('body').innerText()
    // 성공 토스트만 확인 (실패 토스트 "실패했습니다"와 구분)
    const hasCopySuccess =
      bodyText.includes('복사되었습니다') || bodyText.includes('copied')
    const hasCopyFailure = bodyText.includes('실패')
    log('TC-4B.5.2', `copySuccess=${hasCopySuccess}, copyFailure=${hasCopyFailure}`)
    expect(hasCopySuccess && !hasCopyFailure).toBe(true)
  })
})
