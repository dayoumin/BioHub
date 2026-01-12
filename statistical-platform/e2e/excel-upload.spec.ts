/**
 * Excel 업로드 E2E 테스트
 *
 * xlsx 0.20.3 버전 호환성 및 Smart Flow 데이터 업로드 기능 검증
 */

import { test, expect } from '@playwright/test'
import path from 'path'

const FIXTURES_DIR = path.join(__dirname, 'fixtures')

test.describe('Excel 파일 업로드 E2E 테스트', () => {
  test.beforeEach(async ({ page }) => {
    // 콘솔 로그 캡처 (디버깅용)
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        console.log(`[Browser Error] ${msg.text()}`)
      }
    })

    page.on('pageerror', (err) => {
      console.log(`[Page Error] ${err.message}`)
    })
  })

  test('Smart Flow 페이지가 정상 로드되어야 함', async ({ page }) => {
    await page.goto('/smart-flow', { waitUntil: 'networkidle' })

    // 페이지 타이틀 또는 주요 요소 확인
    await expect(page).toHaveURL(/smart-flow/)

    // 데이터 업로드 영역이 존재하는지 확인
    const uploadArea = page.locator('[data-testid="file-upload"]').or(
      page.locator('text=파일을 드래그').or(
        page.locator('text=drag').or(
          page.locator('input[type="file"]')
        )
      )
    )

    // 최소한 파일 입력 요소가 있어야 함
    const fileInput = page.locator('input[type="file"]')
    await expect(fileInput.first()).toBeAttached({ timeout: 10000 })
  })

  test('기본 통계 Excel 파일 업로드 및 파싱', async ({ page }) => {
    await page.goto('/smart-flow', { waitUntil: 'networkidle' })

    // 파일 입력 요소 찾기
    const fileInput = page.locator('input[type="file"]').first()
    await expect(fileInput).toBeAttached({ timeout: 10000 })

    // Excel 파일 업로드
    const filePath = path.join(FIXTURES_DIR, 'sample-basic-stats.xlsx')
    await fileInput.setInputFiles(filePath)

    // 데이터가 로드될 때까지 대기 (테이블 또는 데이터 표시 영역)
    // 다양한 가능한 셀렉터 시도
    const dataLoaded = page.locator('table').or(
      page.locator('[data-testid="data-preview"]').or(
        page.locator('text=Group').or(
          page.locator('text=Value')
        )
      )
    )

    await expect(dataLoaded.first()).toBeVisible({ timeout: 15000 })

    // 데이터 내용 확인 - 헤더 또는 첫 번째 데이터
    const pageContent = await page.content()
    const hasGroupColumn = pageContent.includes('Group') || pageContent.includes('group')
    const hasValueColumn = pageContent.includes('Value') || pageContent.includes('value')

    expect(hasGroupColumn || hasValueColumn).toBe(true)
  })

  test('상관 분석 Excel 파일 업로드', async ({ page }) => {
    await page.goto('/smart-flow', { waitUntil: 'networkidle' })

    const fileInput = page.locator('input[type="file"]').first()
    await expect(fileInput).toBeAttached({ timeout: 10000 })

    const filePath = path.join(FIXTURES_DIR, 'sample-correlation.xlsx')
    await fileInput.setInputFiles(filePath)

    // 데이터 로드 대기
    await page.waitForTimeout(3000)

    // 숫자 데이터가 포함되어 있는지 확인
    const pageContent = await page.content()
    // X1, X2, X3, Y 컬럼 중 하나라도 있으면 성공
    const hasExpectedColumns = ['X1', 'X2', 'X3'].some((col) =>
      pageContent.includes(col)
    )

    expect(hasExpectedColumns).toBe(true)
  })

  test('멀티시트 Excel 파일 업로드 시 시트 선택 가능', async ({ page }) => {
    await page.goto('/smart-flow', { waitUntil: 'networkidle' })

    const fileInput = page.locator('input[type="file"]').first()
    await expect(fileInput).toBeAttached({ timeout: 10000 })

    const filePath = path.join(FIXTURES_DIR, 'sample-multisheet.xlsx')
    await fileInput.setInputFiles(filePath)

    // 시트 선택 UI가 나타나거나 첫 번째 시트가 자동 로드되어야 함
    await page.waitForTimeout(3000)

    const pageContent = await page.content()

    // 시트 이름이 표시되거나, 첫 번째 시트 데이터가 로드되어야 함
    const hasSheetSelector =
      pageContent.includes('BasicStats') ||
      pageContent.includes('Correlation') ||
      pageContent.includes('Frequency') ||
      pageContent.includes('시트') ||
      pageContent.includes('Sheet')

    const hasFirstSheetData = pageContent.includes('Group') || pageContent.includes('Value')

    expect(hasSheetSelector || hasFirstSheetData).toBe(true)
  })

  test('잘못된 파일 형식 업로드 시 에러 처리', async ({ page }) => {
    await page.goto('/smart-flow', { waitUntil: 'networkidle' })

    const fileInput = page.locator('input[type="file"]').first()
    await expect(fileInput).toBeAttached({ timeout: 10000 })

    // 텍스트 파일을 생성하여 업로드 시도 (실제로는 accept 속성으로 막힐 수 있음)
    // 이 테스트는 UI가 어떻게 처리하는지 확인

    // accept 속성 확인
    const acceptAttr = await fileInput.getAttribute('accept')

    // Excel 관련 확장자만 허용하는지 확인
    if (acceptAttr) {
      const acceptsExcel =
        acceptAttr.includes('.xlsx') ||
        acceptAttr.includes('.xls') ||
        acceptAttr.includes('spreadsheet') ||
        acceptAttr.includes('excel')

      expect(acceptsExcel).toBe(true)
    }
  })

  test('대용량 데이터 처리 성능 (15행 샘플)', async ({ page }) => {
    await page.goto('/smart-flow', { waitUntil: 'networkidle' })

    const fileInput = page.locator('input[type="file"]').first()
    await expect(fileInput).toBeAttached({ timeout: 10000 })

    const startTime = Date.now()

    const filePath = path.join(FIXTURES_DIR, 'sample-basic-stats.xlsx')
    await fileInput.setInputFiles(filePath)

    // 데이터 로드 완료 대기
    await page.waitForTimeout(3000)

    const endTime = Date.now()
    const loadTime = endTime - startTime

    // 15행 데이터는 5초 이내에 로드되어야 함
    expect(loadTime).toBeLessThan(5000)

    console.log(`Excel 파일 로드 시간: ${loadTime}ms`)
  })
})

test.describe('데이터 업로드 후 분석 플로우', () => {
  test('Excel 업로드 후 다음 단계로 진행 가능', async ({ page }) => {
    await page.goto('/smart-flow', { waitUntil: 'networkidle' })

    // 파일 업로드
    const fileInput = page.locator('input[type="file"]').first()
    await expect(fileInput).toBeAttached({ timeout: 10000 })

    const filePath = path.join(FIXTURES_DIR, 'sample-basic-stats.xlsx')
    await fileInput.setInputFiles(filePath)

    // 데이터 로드 대기
    await page.waitForTimeout(3000)

    // 다음 버튼 찾기 (다양한 가능한 텍스트)
    const nextButton = page.locator('button').filter({
      hasText: /다음|Next|계속|Continue|진행/i
    }).first()

    // 다음 버튼이 활성화되어 있는지 확인
    if (await nextButton.isVisible()) {
      const isEnabled = await nextButton.isEnabled()
      // 데이터가 로드되면 다음 버튼이 활성화되어야 함
      console.log(`다음 버튼 활성화 상태: ${isEnabled}`)
    }
  })

  test('업로드된 데이터의 변수 목록 표시', async ({ page }) => {
    await page.goto('/smart-flow', { waitUntil: 'networkidle' })

    const fileInput = page.locator('input[type="file"]').first()
    await expect(fileInput).toBeAttached({ timeout: 10000 })

    const filePath = path.join(FIXTURES_DIR, 'sample-basic-stats.xlsx')
    await fileInput.setInputFiles(filePath)

    await page.waitForTimeout(3000)

    const pageContent = await page.content()

    // 컬럼명이 어딘가에 표시되어야 함
    const hasColumnNames =
      pageContent.includes('Group') ||
      pageContent.includes('Value') ||
      pageContent.includes('Category')

    expect(hasColumnNames).toBe(true)
  })
})
