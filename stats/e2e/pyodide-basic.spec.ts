import { test, expect } from '@playwright/test'

test.describe('Pyodide 기본 테스트 (실제 페이지)', () => {
  test.beforeEach(async ({ page }) => {
    // 콘솔 로그 캡처
    page.on('console', msg => {
      console.log(`[Browser ${msg.type()}]:`, msg.text())
    })
  })

  test('1. Pyodide 초기화 테스트', async ({ page }) => {
    console.log('\n=== Test 1: Pyodide 초기화 ===')

    await page.goto('/test-pyodide-init')

    // Pyodide 로딩 대기 (최대 60초 - Pyodide 다운로드 시간 포함)
    console.log('Pyodide 로딩 대기 중...')

    await page.waitForSelector('[data-pyodide-status="initialized"]', {
      timeout: 60000
    })

    console.log('Pyodide 초기화 완료!')

    // NumPy 로딩 확인
    const numpyStatus = await page.locator('[data-numpy-loaded]').getAttribute('data-numpy-loaded')
    console.log('NumPy 로딩 상태:', numpyStatus)
    expect(numpyStatus).toBe('true')

    // SciPy 로딩 확인
    const scipyStatus = await page.locator('[data-scipy-loaded]').getAttribute('data-scipy-loaded')
    console.log('SciPy 로딩 상태:', scipyStatus)
    expect(scipyStatus).toBe('true')

    console.log('✅ Test 1 통과: Pyodide 초기화 성공')
  })

  test('2. 기술통계 계산 테스트', async ({ page }) => {
    console.log('\n=== Test 2: 기술통계 계산 ===')

    await page.goto('/test-pyodide-descriptive')

    // 페이지 로드 대기
    await page.waitForLoadState('networkidle')

    // 테스트 데이터 입력
    console.log('테스트 데이터 입력: [1, 2, 3, 4, 5]')
    await page.fill('[data-test-input]', '1,2,3,4,5')

    // 실행 버튼 클릭
    console.log('기술통계 실행 버튼 클릭')
    await page.click('[data-run-test]')

    // 결과 대기 (Pyodide 로딩 + 계산 시간)
    console.log('결과 대기 중... (Pyodide 초기화 포함, 최대 90초)')
    await page.waitForSelector('[data-result-ready]', { timeout: 90000 })

    // 평균 확인 (3.0)
    const mean = await page.locator('[data-result-mean]').textContent()
    console.log('계산된 평균:', mean)
    expect(Number(mean)).toBeCloseTo(3.0, 4)

    // 표준편차 확인 (1.5811...)
    const std = await page.locator('[data-result-std]').textContent()
    console.log('계산된 표준편차:', std)
    expect(Number(std)).toBeCloseTo(1.5811, 4)

    // 중앙값 확인 (3.0)
    const median = await page.locator('[data-result-median]').textContent()
    console.log('계산된 중앙값:', median)
    expect(Number(median)).toBeCloseTo(3.0, 4)

    console.log('✅ Test 2 통과: 기술통계 계산 정확')
  })

  test('3. 싱글톤 패턴 검증 - 같은 페이지 내 연속 계산', async ({ page }) => {
    console.log('\n=== Test 3: 싱글톤 패턴 검증 (연속 계산) ===')

    await page.goto('/test-pyodide-descriptive')

    // 첫 번째 계산 (Pyodide 초기화 + 계산)
    console.log('첫 번째 계산 시작 (초기화 포함)...')
    const start1 = Date.now()

    await page.fill('[data-test-input]', '1,2,3,4,5')
    await page.click('[data-run-test]')
    await page.waitForSelector('[data-result-ready]', { timeout: 60000 })

    const time1 = Date.now() - start1
    console.log('첫 번째 계산 시간:', time1, 'ms (초기화 포함)')

    // 결과 확인
    const mean1 = await page.locator('[data-result-mean]').textContent()
    console.log('첫 번째 평균:', mean1)
    expect(Number(mean1)).toBeCloseTo(3.0, 4)

    // 두 번째 계산 (캐시된 인스턴스 사용)
    console.log('\n두 번째 계산 시작 (캐시 사용 예상)...')

    // 입력 데이터 변경
    await page.fill('[data-test-input]', '10,20,30,40,50')

    const start2 = Date.now()
    await page.click('[data-run-test]')

    // 두 번째 결과 대기
    await page.waitForTimeout(100) // DOM 업데이트 대기
    await page.waitForSelector('[data-result-mean]', { timeout: 10000 })

    const time2 = Date.now() - start2
    console.log('두 번째 계산 시간:', time2, 'ms (캐시 사용)')

    // 결과 확인
    const mean2 = await page.locator('[data-result-mean]').textContent()
    console.log('두 번째 평균:', mean2)
    expect(Number(mean2)).toBeCloseTo(30.0, 4)

    // 성능 검증
    console.log('\n성능 비교:')
    console.log('- 첫 번째:', time1, 'ms')
    console.log('- 두 번째:', time2, 'ms')
    console.log('- 개선율:', ((1 - time2 / time1) * 100).toFixed(1), '%')

    // 두 번째 계산은 5초 이내여야 함 (초기화 시간 없음)
    expect(time2).toBeLessThan(5000)

    // 두 번째 계산이 첫 번째보다 최소 50% 빨라야 함
    expect(time2).toBeLessThan(time1 * 0.5)

    console.log('✅ Test 3 통과: 싱글톤 패턴 작동 (연속 계산 성능 확인)')
  })
})
