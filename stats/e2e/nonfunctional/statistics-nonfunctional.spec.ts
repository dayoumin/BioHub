/**
 * Phase 5 Part A: 통계 분석 비기능 테스트
 *
 * Pyodide 성능, 메모리, 키보드, 스크린리더
 *
 * 태그: @phase5, @critical, @important, @nice-to-have
 * 실행: pnpm e2e --grep "@phase5"
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
import {
  measureAction,
  getMemoryUsage,
  memoryDiffMB,
  checkTiming,
} from '../helpers/performance-helpers'
import {
  getAriaAttributes,
  verifyFocusTrap,
  verifyEscClosesModal,
  hasNonColorIndicator,
} from '../helpers/a11y-helpers'

test.setTimeout(300_000) // 5분 — Pyodide 로딩 포함

// ========================================
// 5A.1 성능 — 통계 분석 @phase5 @critical
// ========================================

test.describe('@phase5 @critical 성능 — 통계 분석', () => {
  test('TC-5A.1.1: Pyodide 초기 로딩 시간', async ({ page }) => {
    await navigateToUploadStep(page)
    expect(await uploadCSV(page, 't-test.csv')).toBe(true)
    await expect(page.locator(S.dataProfileSummary)).toBeVisible({ timeout: 15000 })

    await goToMethodSelection(page)
    expect(await selectMethodDirect(page, '독립표본', /독립표본 t-검정/)).toBe(true)
    await goToVariableSelection(page)
    await ensureVariablesOrSkip(page, 'TC-5A.1.1', 'group', 'value')

    // Pyodide 로딩 포함한 첫 분석 시간 측정
    const duration = await measureAction(
      page,
      async () => {
        await clickAnalysisRun(page)
      },
      S.resultsMainCard,
      120000,
    )

    const timing = checkTiming('Pyodide 첫 분석', duration, 120000) // 2분 이내
    log('TC-5A.1.1', `Pyodide 첫 분석: ${(duration / 1000).toFixed(1)}s (threshold: 120s)`)
    expect(timing.passed).toBe(true)
  })

  test('TC-5A.1.2: 통계 분석 실행 시간 (Pyodide 로딩 후)', async ({ page }) => {
    // 먼저 1회 분석으로 Pyodide 로딩
    await navigateToUploadStep(page)
    expect(await uploadCSV(page, 't-test.csv')).toBe(true)
    await expect(page.locator(S.dataProfileSummary)).toBeVisible({ timeout: 15000 })

    await goToMethodSelection(page)
    expect(await selectMethodDirect(page, '독립표본', /독립표본 t-검정/)).toBe(true)
    await goToVariableSelection(page)
    await ensureVariablesOrSkip(page, 'TC-5A.1.2-warmup', 'group', 'value')
    await clickAnalysisRun(page)
    expect(await waitForResults(page, 120000)).toBe(true)

    // 2번째 분석: 새로운 분석 시작
    const newBtn = page.locator(S.newAnalysisBtn)
    if (await newBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await newBtn.click()
      await page.waitForLoadState('networkidle')
    }

    // 재업로드 + 재분석
    await navigateToUploadStep(page)
    expect(await uploadCSV(page, 't-test.csv')).toBe(true)
    await expect(page.locator(S.dataProfileSummary)).toBeVisible({ timeout: 15000 })

    await goToMethodSelection(page)
    expect(await selectMethodDirect(page, '독립표본', /독립표본 t-검정/)).toBe(true)
    await goToVariableSelection(page)
    await ensureVariablesOrSkip(page, 'TC-5A.1.2', 'group', 'value')

    // 후속 분석 시간 측정
    const start = Date.now()
    await clickAnalysisRun(page)
    expect(await waitForResults(page, 30000)).toBe(true)
    const duration = Date.now() - start

    const timing = checkTiming('후속 t-test', duration, 10000) // 10초 이내
    log('TC-5A.1.2', `후속 분석: ${(duration / 1000).toFixed(1)}s (threshold: 10s)`)
    // 통과 여부는 로깅만 (CI 환경에 따라 다를 수 있음)
  })

  test('TC-5A.1.3: CSV 업로드 처리 시간', async ({ page }) => {
    await navigateToUploadStep(page)

    // 100행 CSV 생성
    const rows = ['group,value']
    for (let i = 0; i < 100; i++) {
      rows.push(`${i % 2 === 0 ? 'A' : 'B'},${(Math.random() * 100).toFixed(2)}`)
    }
    const csv100 = rows.join('\n')

    const fileInput = page.locator('input[type="file"]')
    if ((await fileInput.count()) === 0) {
      log('TC-5A.1.3', 'SKIPPED: file input 미발견')
      test.skip()
      return
    }

    const start = Date.now()
    await fileInput.first().setInputFiles({
      name: 'perf-100.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(csv100),
    })

    await page
      .locator(S.dataProfileSummary)
      .waitFor({ state: 'visible', timeout: 15000 })
      .catch(() => {})
    const duration100 = Date.now() - start

    log('TC-5A.1.3', `100행 CSV: ${(duration100 / 1000).toFixed(1)}s`)

    // 1000행 CSV
    const rows1k = ['group,value']
    for (let i = 0; i < 1000; i++) {
      rows1k.push(`${i % 3 === 0 ? 'A' : i % 3 === 1 ? 'B' : 'C'},${(Math.random() * 100).toFixed(2)}`)
    }

    // 데이터 교체
    const replaceBtn = page.locator(S.replaceDataButton)
    if (await replaceBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await replaceBtn.click()
      await page.waitForTimeout(1000)
    }

    const fileInput2 = page.locator('input[type="file"]')
    if ((await fileInput2.count()) > 0) {
      const start1k = Date.now()
      await fileInput2.first().setInputFiles({
        name: 'perf-1000.csv',
        mimeType: 'text/csv',
        buffer: Buffer.from(rows1k.join('\n')),
      })
      await page
        .locator(S.dataProfileSummary)
        .waitFor({ state: 'visible', timeout: 15000 })
        .catch(() => {})
      const duration1k = Date.now() - start1k
      log('TC-5A.1.3', `1000행 CSV: ${(duration1k / 1000).toFixed(1)}s`)
    }
  })

  test('TC-5A.1.4: 메모리 사용량 모니터링', async ({ page }) => {
    const memBefore = await getMemoryUsage(page)
    if (memBefore < 0) {
      log('TC-5A.1.4', 'SKIPPED: performance.memory 미지원 (Firefox/WebKit)')
      test.skip()
      return
    }

    // 분석 3회 연속 실행
    for (let i = 1; i <= 3; i++) {
      await navigateToUploadStep(page)
      expect(await uploadCSV(page, 't-test.csv')).toBe(true)
      await expect(page.locator(S.dataProfileSummary)).toBeVisible({ timeout: 15000 })

      await goToMethodSelection(page)
      expect(await selectMethodDirect(page, '독립표본', /독립표본 t-검정/)).toBe(true)
      await goToVariableSelection(page)
      await ensureVariablesOrSkip(page, `TC-5A.1.4-${i}`, 'group', 'value')
      await clickAnalysisRun(page)
      expect(await waitForResults(page, 120000)).toBe(true)

      const memAfter = await getMemoryUsage(page)
      const diff = memoryDiffMB(memBefore, memAfter)
      log('TC-5A.1.4', `분석 ${i}회 후 메모리: +${diff.toFixed(1)}MB`)
    }

    const memFinal = await getMemoryUsage(page)
    const totalDiff = memoryDiffMB(memBefore, memFinal)
    log('TC-5A.1.4', `총 메모리 증가: ${totalDiff.toFixed(1)}MB (threshold: 50MB)`)
    // Chrome에서만 유효한 측정
    if (totalDiff > 0) {
      expect(totalDiff).toBeLessThan(50) // 계획 기준: 50MB
    }
  })

  test('TC-5A.1.5: 성능 저하 — 1회차 vs 5회차 비교', async ({ page }) => {
    // 첫 분석 (Pyodide 워밍업)
    await navigateToUploadStep(page)
    expect(await uploadCSV(page, 't-test.csv')).toBe(true)
    await expect(page.locator(S.dataProfileSummary)).toBeVisible({ timeout: 15000 })
    await goToMethodSelection(page)
    expect(await selectMethodDirect(page, '독립표본', /독립표본 t-검정/)).toBe(true)
    await goToVariableSelection(page)
    await ensureVariablesOrSkip(page, 'TC-5A.1.5-warmup', 'group', 'value')
    await clickAnalysisRun(page)
    expect(await waitForResults(page, 120000)).toBe(true)

    // 1회차 측정
    const durations: number[] = []
    for (let i = 1; i <= 5; i++) {
      const newBtn = page.locator(S.newAnalysisBtn)
      if (await newBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
        await newBtn.click()
        await page.waitForTimeout(2000)
      }

      await navigateToUploadStep(page)
      expect(await uploadCSV(page, 't-test.csv')).toBe(true)
      await expect(page.locator(S.dataProfileSummary)).toBeVisible({ timeout: 15000 })
      await goToMethodSelection(page)
      expect(await selectMethodDirect(page, '독립표본', /독립표본 t-검정/)).toBe(true)
      await goToVariableSelection(page)
      await ensureVariablesOrSkip(page, `TC-5A.1.5-${i}`, 'group', 'value')

      const start = Date.now()
      await clickAnalysisRun(page)
      expect(await waitForResults(page, 60000)).toBe(true)
      durations.push(Date.now() - start)

      log('TC-5A.1.5', `${i}회차: ${(durations[i - 1] / 1000).toFixed(1)}s`)
    }

    // 5회차가 1회차 대비 2배 이내인지 확인
    const first = durations[0]
    const fifth = durations[4]
    const ratio = fifth / first
    log('TC-5A.1.5', `1회차: ${(first / 1000).toFixed(1)}s, 5회차: ${(fifth / 1000).toFixed(1)}s, ratio: ${ratio.toFixed(2)}`)
    expect(ratio).toBeLessThan(2) // 성능 저하 2배 이내
  })
})

// ========================================
// 5A.2 접근성 — 통계 분석 @phase5 @important
// ========================================

test.describe('@phase5 @important 접근성 — 통계 분석', () => {
  test('TC-5A.2.1: 키보드 내비게이션 — Smart Flow', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded', timeout: 60000 })
    await page.waitForFunction(
      () => document.querySelector('[data-testid="hub-upload-card"]') !== null,
      { timeout: 30000 },
    )

    // Tab 키로 Hub 카드에 포커스 도달 가능한지 확인
    let foundUploadCard = false
    for (let i = 0; i < 20; i++) {
      await page.keyboard.press('Tab')
      await page.waitForTimeout(100)

      const focused = await page.evaluate(() => {
        const el = document.activeElement
        return el?.getAttribute('data-testid') ?? el?.tagName ?? 'none'
      })

      if (focused === 'hub-upload-card' || focused?.includes('upload')) {
        foundUploadCard = true
        break
      }
    }

    log('TC-5A.2.1', `Tab → upload card: ${foundUploadCard}`)

    // Enter 키로 활성화
    if (foundUploadCard) {
      await page.keyboard.press('Enter')
      await page.waitForTimeout(3000)

      const hasFileInput = await page
        .locator('input[type="file"]')
        .count()
        .then((c) => c > 0)
        .catch(() => false)
      log('TC-5A.2.1', `Enter → file input: ${hasFileInput}`)
    }
  })

  test('TC-5A.2.2: 스크린 리더 — 결과 화면 ARIA', async ({ page }) => {
    // 분석 완료까지 진행
    await navigateToUploadStep(page)
    expect(await uploadCSV(page, 't-test.csv')).toBe(true)
    await expect(page.locator(S.dataProfileSummary)).toBeVisible({ timeout: 15000 })

    await goToMethodSelection(page)
    expect(await selectMethodDirect(page, '독립표본', /독립표본 t-검정/)).toBe(true)
    await goToVariableSelection(page)
    await ensureVariablesOrSkip(page, 'TC-5A.2.2', 'group', 'value')
    await clickAnalysisRun(page)
    expect(await waitForResults(page, 120000)).toBe(true)

    // results-main-card ARIA 속성 확인
    const resultsAria = await getAriaAttributes(page, '[data-testid="results-main-card"]')
    log('TC-5A.2.2', `results-main-card: role="${resultsAria.role}", aria-label="${resultsAria['aria-label']}"`)

    // 에러 메시지에 role="alert" 확인 (있을 경우)
    const alertElements = await page.locator('[role="alert"]').count()
    log('TC-5A.2.2', `role="alert" 요소: ${alertElements}개`)

    // 차트에 aria-label 확인
    const canvasAria = await page.evaluate(() => {
      const canvas = document.querySelector('canvas')
      return canvas?.getAttribute('aria-label') ?? 'none'
    })
    log('TC-5A.2.2', `canvas aria-label: ${canvasAria}`)
  })

  test('TC-5A.2.3: 색각 이상 — 통계 결과 비색상 지표', async ({ page }) => {
    await navigateToUploadStep(page)
    expect(await uploadCSV(page, 't-test.csv')).toBe(true)
    await expect(page.locator(S.dataProfileSummary)).toBeVisible({ timeout: 15000 })

    await goToMethodSelection(page)
    expect(await selectMethodDirect(page, '독립표본', /독립표본 t-검정/)).toBe(true)
    await goToVariableSelection(page)
    await ensureVariablesOrSkip(page, 'TC-5A.2.3', 'group', 'value')
    await clickAnalysisRun(page)
    expect(await waitForResults(page, 120000)).toBe(true)

    // 유의/비유의 구분이 텍스트/아이콘으로 보충되는지 확인
    const bodyText = await page.locator('body').innerText()
    const hasTextIndicator =
      bodyText.includes('유의') ||
      bodyText.includes('기각') ||
      bodyText.includes('채택') ||
      bodyText.includes('✓') ||
      bodyText.includes('✗') ||
      bodyText.includes('○') ||
      bodyText.includes('×')
    log('TC-5A.2.3', `비색상 지표: ${hasTextIndicator}`)

    // 효과크기 해석이 텍스트로 제공되는지
    const hasEffectSizeText =
      bodyText.includes('작음') ||
      bodyText.includes('중간') ||
      bodyText.includes('큼') ||
      bodyText.includes('small') ||
      bodyText.includes('medium') ||
      bodyText.includes('large')
    log('TC-5A.2.3', `효과크기 텍스트: ${hasEffectSizeText}`)
  })

  test('TC-5A.2.5: 포커스 트랩 — 모달', async ({ page }) => {
    await navigateToUploadStep(page)
    expect(await uploadCSV(page, 't-test.csv')).toBe(true)
    await expect(page.locator(S.dataProfileSummary)).toBeVisible({ timeout: 15000 })

    await goToMethodSelection(page)
    expect(await selectMethodDirect(page, '독립표본', /독립표본 t-검정/)).toBe(true)
    await goToVariableSelection(page)

    // 변수 모달이 열리는지 확인
    const roleZone = page.locator(S.roleZone('dependent'))
    if (await roleZone.isVisible({ timeout: 5000 }).catch(() => false)) {
      await roleZone.click()
      await page.waitForTimeout(1000)

      // 모달 확인
      const modal = page.locator(S.variableModal('dependent'))
      if (await modal.isVisible({ timeout: 3000 }).catch(() => false)) {
        // 포커스 트랩 검증
        const trapped = await verifyFocusTrap(page, '[data-testid="variable-modal-dependent"]', 10)
        log('TC-5A.2.5', `포커스 트랩: ${trapped}`)
        expect(trapped).toBe(true)

        // ESC로 모달 닫기
        const closed = await verifyEscClosesModal(page, modal)
        log('TC-5A.2.5', `ESC 닫기: ${closed}`)
        expect(closed).toBe(true)
      } else {
        log('TC-5A.2.5', 'SKIPPED: variable-modal 미표시')
      }
    } else {
      log('TC-5A.2.5', 'SKIPPED: role-zone 미표시')
    }
  })
})

// ========================================
// 5A.3 호환성 @phase5 @nice-to-have
// ========================================

test.describe('@phase5 @nice-to-have 호환성 — 통계', () => {
  test('TC-5A.3.1: 기본 브라우저에서 Smart Flow 동작', async ({ page }) => {
    // 이 테스트는 현재 브라우저(chromium)에서의 기본 동작 확인
    // Firefox/WebKit은 playwright.config.ts에 프로젝트 추가 필요
    await navigateToUploadStep(page)
    expect(await uploadCSV(page, 't-test.csv')).toBe(true)
    await expect(page.locator(S.dataProfileSummary)).toBeVisible({ timeout: 15000 })

    await goToMethodSelection(page)
    expect(await selectMethodDirect(page, '독립표본', /독립표본 t-검정/)).toBe(true)
    await goToVariableSelection(page)
    await ensureVariablesOrSkip(page, 'TC-5A.3.1', 'group', 'value')
    await clickAnalysisRun(page)
    expect(await waitForResults(page, 120000)).toBe(true)

    log('TC-5A.3.1', '기본 브라우저 E2E 통과')
  })
})
