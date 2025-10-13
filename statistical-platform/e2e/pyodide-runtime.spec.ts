import { test, expect } from '@playwright/test'

test.describe('Pyodide Runtime 실제 실행 테스트', () => {
  test.beforeEach(async ({ page }) => {
    // 콘솔 에러 캡처
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log('Browser Error:', msg.text())
      }
    })
  })

  test('1단계: Pyodide 초기화 및 기본 패키지 로딩', async ({ page }) => {
    await page.goto('/test-pyodide-init')

    // Pyodide 로딩 대기 (최대 30초)
    await page.waitForSelector('[data-pyodide-status="initialized"]', {
      timeout: 30000
    })

    // NumPy 로딩 확인
    const numpyStatus = await page.locator('[data-numpy-loaded]').textContent()
    expect(numpyStatus).toBe('true')

    // SciPy 로딩 확인
    const scipyStatus = await page.locator('[data-scipy-loaded]').textContent()
    expect(scipyStatus).toBe('true')
  })

  test('2단계: 기본 통계 - descriptive (기술통계)', async ({ page }) => {
    await page.goto('/test-pyodide-descriptive')

    // 테스트 데이터: [1, 2, 3, 4, 5]
    await page.fill('[data-test-input]', '1,2,3,4,5')
    await page.click('[data-run-test]')

    // 결과 대기
    await page.waitForSelector('[data-result-ready]', { timeout: 10000 })

    // 평균 확인 (3.0)
    const mean = await page.locator('[data-result-mean]').textContent()
    expect(Number(mean)).toBeCloseTo(3.0, 4)

    // 표준편차 확인 (1.5811...)
    const std = await page.locator('[data-result-std]').textContent()
    expect(Number(std)).toBeCloseTo(1.5811, 4)
  })

  test('3단계: t-검정 실제 실행', async ({ page }) => {
    await page.goto('/test-pyodide-ttest')

    // 두 그룹 데이터
    await page.fill('[data-group1]', '23,25,27,29,31')
    await page.fill('[data-group2]', '18,20,22,24,26')
    await page.click('[data-run-ttest]')

    await page.waitForSelector('[data-ttest-result]', { timeout: 10000 })

    // t-통계량 확인
    const tStat = await page.locator('[data-t-statistic]').textContent()
    expect(Number(tStat)).toBeGreaterThan(0)

    // p-value 확인
    const pValue = await page.locator('[data-p-value]').textContent()
    expect(Number(pValue)).toBeGreaterThanOrEqual(0)
    expect(Number(pValue)).toBeLessThanOrEqual(1)
  })

  test('4단계: 상관분석 실제 실행', async ({ page }) => {
    await page.goto('/test-pyodide-correlation')

    await page.fill('[data-x-values]', '1,2,3,4,5')
    await page.fill('[data-y-values]', '2,4,6,8,10')
    await page.click('[data-run-correlation]')

    await page.waitForSelector('[data-correlation-result]', { timeout: 10000 })

    // 완벽한 양의 상관관계 (r = 1.0)
    const correlation = await page.locator('[data-correlation-coefficient]').textContent()
    expect(Number(correlation)).toBeCloseTo(1.0, 4)
  })

  test('5단계: 선형회귀 실제 실행', async ({ page }) => {
    await page.goto('/test-pyodide-regression')

    await page.fill('[data-x-values]', '1,2,3,4,5')
    await page.fill('[data-y-values]', '2,4,6,8,10')
    await page.click('[data-run-regression]')

    await page.waitForSelector('[data-regression-result]', { timeout: 10000 })

    // 기울기 확인 (2.0)
    const slope = await page.locator('[data-slope]').textContent()
    expect(Number(slope)).toBeCloseTo(2.0, 4)

    // 절편 확인 (0.0)
    const intercept = await page.locator('[data-intercept]').textContent()
    expect(Number(intercept)).toBeCloseTo(0.0, 4)

    // R-squared 확인 (1.0)
    const rSquared = await page.locator('[data-r-squared]').textContent()
    expect(Number(rSquared)).toBeCloseTo(1.0, 4)
  })

  test('6단계: ANOVA 실제 실행', async ({ page }) => {
    await page.goto('/test-pyodide-anova')

    // 3개 그룹
    await page.fill('[data-group1]', '5,6,7,8,9')
    await page.fill('[data-group2]', '10,11,12,13,14')
    await page.fill('[data-group3]', '15,16,17,18,19')
    await page.click('[data-run-anova]')

    await page.waitForSelector('[data-anova-result]', { timeout: 10000 })

    // F-통계량 확인
    const fStat = await page.locator('[data-f-statistic]').textContent()
    expect(Number(fStat)).toBeGreaterThan(0)

    // p-value 확인 (그룹 간 차이가 유의함)
    const pValue = await page.locator('[data-p-value]').textContent()
    expect(Number(pValue)).toBeLessThan(0.001)
  })

  test('7단계: 카이제곱 검정 실제 실행', async ({ page }) => {
    await page.goto('/test-pyodide-chisquare')

    await page.fill('[data-observed]', '10,20,30,40')
    await page.click('[data-run-chisquare]')

    await page.waitForSelector('[data-chisquare-result]', { timeout: 10000 })

    // 카이제곱 통계량 확인
    const chiSq = await page.locator('[data-chi-square-statistic]').textContent()
    expect(Number(chiSq)).toBeGreaterThan(0)

    // 자유도 확인
    const df = await page.locator('[data-degrees-freedom]').textContent()
    expect(Number(df)).toBe(3)
  })

  test('8단계: 비모수 검정 (Mann-Whitney) 실제 실행', async ({ page }) => {
    await page.goto('/test-pyodide-mannwhitney')

    await page.fill('[data-group1]', '1,2,3,4,5')
    await page.fill('[data-group2]', '6,7,8,9,10')
    await page.click('[data-run-mannwhitney]')

    await page.waitForSelector('[data-mannwhitney-result]', { timeout: 10000 })

    // U-통계량 확인
    const uStat = await page.locator('[data-u-statistic]').textContent()
    expect(Number(uStat)).toBeGreaterThanOrEqual(0)

    // p-value 확인
    const pValue = await page.locator('[data-p-value]').textContent()
    expect(Number(pValue)).toBeLessThan(0.01)
  })

  test('9단계: 에러 처리 확인', async ({ page }) => {
    await page.goto('/test-pyodide-error-handling')

    // 잘못된 데이터 입력
    await page.fill('[data-test-input]', 'invalid,data,abc')
    await page.click('[data-run-test]')

    // 에러 메시지 표시 확인
    await page.waitForSelector('[data-error-message]', { timeout: 5000 })

    const errorMsg = await page.locator('[data-error-message]').textContent()
    expect(errorMsg?.toLowerCase()).toMatch(/error|오류/)
  })

  test('10단계: 성능 측정 - 기본 통계 실행 시간', async ({ page }) => {
    await page.goto('/test-pyodide-performance')

    const startTime = Date.now()

    await page.fill('[data-large-dataset]', Array.from({ length: 1000 }, (_, i) => i).join(','))
    await page.click('[data-run-performance-test]')

    await page.waitForSelector('[data-performance-result]', { timeout: 30000 })

    const endTime = Date.now()
    const executionTime = endTime - startTime

    // 1000개 데이터 처리 시간이 30초 이내여야 함
    expect(executionTime).toBeLessThan(30000)

    // 실행 시간 출력
    console.log(`기본 통계 실행 시간 (n=1000): ${executionTime}ms`)
  })
})
