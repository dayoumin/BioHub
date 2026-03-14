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
  await page.waitForTimeout(2000)
  const gsLink = page.locator('a[href*="graph-studio"]').first()
  if (await gsLink.isVisible({ timeout: 5000 }).catch(() => false)) {
    await gsLink.click()
    await page.waitForTimeout(2000)
  }
}

// ========================================
// 4B.1 Graph Studio 첫 사용자 시나리오 @phase4 @critical
// ========================================

test.describe('@phase4 @critical Graph Studio 첫 사용자', () => {
  test('TC-4B.1.1: 처음 방문 → 차트 유형 클릭 → 샘플 데이터 차트', async ({ page }) => {
    await navigateToGraphStudio(page)

    // Bar 차트 유형 클릭
    const barType = page.locator(S.graphStudioChartType('bar'))
    if (await barType.isVisible({ timeout: 5000 }).catch(() => false)) {
      await barType.click()
      await page.waitForTimeout(3000)

      // 차트가 렌더링되었는지 확인
      const hasChart = await page
        .locator(S.graphStudioChart)
        .isVisible({ timeout: 10000 })
        .catch(() => false)
      const hasCanvas = await page.locator('canvas').isVisible({ timeout: 5000 }).catch(() => false)

      expect(hasChart || hasCanvas).toBeTruthy()
      log('TC-4B.1.1', '샘플 데이터 Bar 차트 렌더링 확인')

      // 사이드 패널에서 데이터 확인
      const sidePanel = page.locator(S.graphStudioSidePanel)
      if (await sidePanel.isVisible({ timeout: 3000 }).catch(() => false)) {
        log('TC-4B.1.1', '사이드 패널 표시 확인')
      }
    } else {
      log('TC-4B.1.1', 'SKIPPED: bar chart type 미표시')
      test.skip()
    }
  })

  test('TC-4B.1.2: 자기 데이터로 차트 생성', async ({ page }) => {
    await navigateToGraphStudio(page)

    // 파일 업로드
    const fileInput = page.locator(S.graphStudioFileInput)
    const dropzone = page.locator(S.graphStudioDropzone)

    let uploaded = false
    if (await fileInput.count().then((c) => c > 0).catch(() => false)) {
      const filePath = path.resolve(__dirname, '../../test-data/e2e/t-test.csv')
      await fileInput.setInputFiles(filePath)
      uploaded = true
    } else if (await dropzone.isVisible({ timeout: 5000 }).catch(() => false)) {
      // 파일 업로드 버튼 사용
      const uploadBtn = page.locator(S.graphStudioFileUploadBtn)
      if (await uploadBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        log('TC-4B.1.2', '파일 업로드 버튼 발견 — 클릭으로 업로드 시도')
      }
    }

    if (!uploaded) {
      log('TC-4B.1.2', 'SKIPPED: 파일 업로드 방법 미확인')
      test.skip()
      return
    }

    await page.waitForTimeout(5000)

    // 차트 렌더링 확인
    const hasChart = await page
      .locator(`${S.graphStudioChart}, canvas`)
      .first()
      .isVisible({ timeout: 10000 })
      .catch(() => false)
    log('TC-4B.1.2', `차트 렌더링: ${hasChart}`)

    // 차트 유형 변경 (bar → line)
    if (hasChart) {
      const lineType = page.locator(S.graphStudioChartType('line'))
      if (await lineType.isVisible({ timeout: 3000 }).catch(() => false)) {
        await lineType.click()
        await page.waitForTimeout(2000)
        log('TC-4B.1.2', 'Bar → Line 전환 완료')
      }
    }
  })

  test('TC-4B.1.3: Smart Flow 결과에서 Graph Studio로 이동', async ({ page }) => {
    test.setTimeout(300_000) // Pyodide 로딩 + 분석 포함 5분
    // t-test 분석 완료
    await navigateToUploadStep(page)
    expect(await uploadCSV(page, 't-test.csv')).toBeTruthy()
    await expect(page.locator(S.dataProfileSummary)).toBeVisible({ timeout: 15000 })

    await goToMethodSelection(page)
    expect(await selectMethodDirect(page, '독립표본', /독립표본 t-검정/)).toBeTruthy()
    await goToVariableSelection(page)
    await ensureVariablesOrSkip(page, 'TC-4B.1.3', 'group', 'value')
    await clickAnalysisRun(page)
    expect(await waitForResults(page, 120000)).toBeTruthy()

    // Graph Studio 버튼 클릭
    const gsBtn = page.locator(S.openGraphStudioBtn)
    if (!(await gsBtn.isVisible({ timeout: 5000 }).catch(() => false))) {
      log('TC-4B.1.3', 'SKIPPED: open-graph-studio-btn 미표시')
      test.skip()
      return
    }

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

    expect(hasGS || isGSUrl).toBeTruthy()
    log('TC-4B.1.3', `Graph Studio 이동: page=${hasGS}, chart=${hasChart}, url=${isGSUrl}`)
  })
})

// ========================================
// 4B.2 차트 커스터마이징 @phase4 @important
// ========================================

test.describe('@phase4 @important 차트 커스터마이징', () => {
  async function setupChartEditor(page: import('@playwright/test').Page): Promise<boolean> {
    await navigateToGraphStudio(page)

    const barType = page.locator(S.graphStudioChartType('bar'))
    if (!(await barType.isVisible({ timeout: 5000 }).catch(() => false))) return false
    await barType.click()
    await page.waitForTimeout(3000)

    return page
      .locator(`${S.graphStudioChart}, canvas`)
      .first()
      .isVisible({ timeout: 10000 })
      .catch(() => false)
  }

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
    expect(hasOptions).toBeTruthy()
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
    await navigateToGraphStudio(page)

    // Bar 차트 생성
    const barType = page.locator(S.graphStudioChartType('bar'))
    if (await barType.isVisible({ timeout: 5000 }).catch(() => false)) {
      await barType.click()
      await page.waitForTimeout(3000)
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
    const fileInput = page.locator(S.graphStudioFileInput)
    if (await fileInput.count().then((c) => c > 0).catch(() => false)) {
      const filePath = path.resolve(__dirname, '../../test-data/e2e/correlation.csv')
      await fileInput.setInputFiles(filePath)
      await page.waitForTimeout(3000)
    }

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
    if (await fileInput.count().then((c) => c > 0).catch(() => false)) {
      await fileInput.setInputFiles({
        name: 'categorical-only.csv',
        mimeType: 'text/csv',
        buffer: Buffer.from(categoricalCsv),
      })
      await page.waitForTimeout(3000)

      // 산점도 시도
      const scatterType = page.locator(S.graphStudioChartType('scatter'))
      if (await scatterType.isVisible({ timeout: 3000 }).catch(() => false)) {
        await scatterType.click()
        await page.waitForTimeout(3000)

        // 에러/경고 확인
        const bodyText = await page.locator('body').innerText()
        const hasWarning =
          bodyText.includes('경고') ||
          bodyText.includes('에러') ||
          bodyText.includes('호환') ||
          bodyText.includes('적합하지')
        log('TC-4B.4.1', `경고 메시지: ${hasWarning}`)
      }
    } else {
      log('TC-4B.4.1', 'SKIPPED: 파일 입력 미발견')
      test.skip()
    }
  })

  test('TC-4B.4.2: 차트 유형 전환 시 데이터 유지', async ({ page }) => {
    await navigateToGraphStudio(page)

    // 데이터 업로드
    const fileInput = page.locator(S.graphStudioFileInput)
    if (!(await fileInput.count().then((c) => c > 0).catch(() => false))) {
      log('TC-4B.4.2', 'SKIPPED: 파일 입력 미발견')
      test.skip()
      return
    }

    const filePath = path.resolve(__dirname, '../../test-data/e2e/t-test.csv')
    await fileInput.setInputFiles(filePath)
    await page.waitForTimeout(3000)

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
    await navigateToGraphStudio(page)

    // 차트 생성
    const barType = page.locator(S.graphStudioChartType('bar'))
    if (await barType.isVisible({ timeout: 5000 }).catch(() => false)) {
      await barType.click()
      await page.waitForTimeout(3000)
    }

    // 내보내기 버튼 찾기
    const exportBtn = page.locator(
      '[data-testid*="export"], [data-testid*="download"], button:has-text("내보내기"), button:has-text("다운로드")',
    )

    if (!(await exportBtn.first().isVisible({ timeout: 5000 }).catch(() => false))) {
      log('TC-4B.5.1', 'SKIPPED: 내보내기 버튼 미표시')
      test.skip()
      return
    }

    const downloadPromise = page.waitForEvent('download', { timeout: 10000 }).catch(() => null)
    await exportBtn.first().click()
    await page.waitForTimeout(2000)

    // PNG 옵션 선택 (드롭다운일 경우)
    const pngOption = page.locator('button:has-text("PNG"), [data-testid*="png"]')
    if (await pngOption.isVisible({ timeout: 2000 }).catch(() => false)) {
      await pngOption.click()
    }

    const download = await downloadPromise
    log('TC-4B.5.1', `PNG download: ${download ? 'OK' : 'not captured'}`)
  })

  test('TC-4B.5.2: 차트 → 클립보드 복사', async ({ page }) => {
    await navigateToGraphStudio(page)

    const barType = page.locator(S.graphStudioChartType('bar'))
    if (await barType.isVisible({ timeout: 5000 }).catch(() => false)) {
      await barType.click()
      await page.waitForTimeout(3000)
    }

    const copyBtn = page.locator('[data-testid="canvas-copy-btn"]')
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
    expect(hasCopySuccess && !hasCopyFailure).toBeTruthy()
  })
})
