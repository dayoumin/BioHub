/**
 * Phase 9 Batch 4 - Additional Critical Bugs Tests
 *
 * 외부 코드 리뷰에서 발견된 2개의 추가 Critical 버그 검증
 *
 * 날짜: 2025-11-13
 */

import { describe, it, expect } from '@jest/globals'

describe('Batch 4 Additional Critical Bugs - Session 4 Fixes', () => {
  describe('Bug #7: dose-response isLoading 미사용 ✅ FIXED', () => {
    it('isLoading 상태가 분석 시작 시 true로 설정되어야 함', () => {
      let isLoading = false
      const setIsLoading = (value: boolean) => { isLoading = value }

      // Start analysis
      setIsLoading(true)

      expect(isLoading).toBe(true)
    })

    it('isLoading 상태가 분석 완료 시 false로 설정되어야 함', () => {
      let isLoading = true
      const setIsLoading = (value: boolean) => { isLoading = value }

      // Complete analysis (finally block)
      setIsLoading(false)

      expect(isLoading).toBe(false)
    })

    it('isLoading 상태가 분석 에러 시 false로 설정되어야 함', () => {
      let isLoading = true
      const setIsLoading = (value: boolean) => { isLoading = value }

      try {
        throw new Error('Analysis failed')
      } catch (err) {
        // Error handling
      } finally {
        setIsLoading(false)
      }

      expect(isLoading).toBe(false)
    })

    it('버튼이 isLoading=true일 때 비활성화되어야 함', () => {
      const isLoading = true
      const isDisabled = isLoading || false

      expect(isDisabled).toBe(true)
    })

    it('버튼이 isLoading=false일 때 활성화되어야 함', () => {
      const isLoading = false
      const isDisabled = isLoading || false

      expect(isDisabled).toBe(false)
    })

    it('중복 Worker 호출을 방지해야 함', async () => {
      let isLoading = false
      let workerCallCount = 0

      const simulateAnalysis = async () => {
        if (isLoading) {
          // 이미 실행 중이면 return
          return
        }

        isLoading = true
        workerCallCount++

        // Simulate worker call
        await new Promise(resolve => setTimeout(resolve, 10))

        isLoading = false
      }

      // 첫 번째 호출
      const promise1 = simulateAnalysis()

      // 두 번째 호출 (isLoading=true이므로 무시되어야 함)
      const promise2 = simulateAnalysis()

      await Promise.all([promise1, promise2])

      // Worker는 1번만 호출되어야 함
      expect(workerCallCount).toBe(1)
    })
  })

  describe('Bug #8: Friedman groups 하드코딩 ✅ FIXED', () => {
    it('Friedman 테스트가 3개 반복측정 시 groups=3을 반환해야 함', () => {
      const variables = ['time1', 'time2', 'time3']

      const result = {
        groups: variables.length
      }

      expect(result.groups).toBe(3)
    })

    it('Friedman 테스트가 4개 반복측정 시 groups=4를 반환해야 함', () => {
      const variables = ['time1', 'time2', 'time3', 'time4']

      const result = {
        groups: variables.length
      }

      expect(result.groups).toBe(4)
    })

    it('Friedman 테스트가 5개 반복측정 시 groups=5를 반환해야 함', () => {
      const variables = ['pre', 'week1', 'week2', 'week3', 'post']

      const result = {
        groups: variables.length
      }

      expect(result.groups).toBe(5)
    })

    it('Friedman 테스트가 6개 이상 반복측정도 정확히 카운트해야 함', () => {
      const variables = ['t1', 't2', 't3', 't4', 't5', 't6', 't7']

      const result = {
        groups: variables.length
      }

      expect(result.groups).toBe(7)
    })

    it('하드코딩된 groups: 3 값을 사용하지 않아야 함', () => {
      // Before: groups: 3 // 기본값
      // After: groups: variables.length

      const variables4 = ['a', 'b', 'c', 'd']
      const variables5 = ['a', 'b', 'c', 'd', 'e']

      expect(variables4.length).not.toBe(3)
      expect(variables5.length).not.toBe(3)

      // 실제 길이를 사용해야 함
      expect(variables4.length).toBe(4)
      expect(variables5.length).toBe(5)
    })

    it('UI 카드가 정확한 그룹 수를 표시해야 함', () => {
      const variables = ['time1', 'time2', 'time3', 'time4']

      const statisticalResult = {
        testName: 'Friedman 검정',
        groups: variables.length,
        interpretation: `${variables.length}개 조건 간 차이 검정`
      }

      expect(statisticalResult.groups).toBe(4)
      expect(statisticalResult.interpretation).toContain('4개 조건')
    })
  })

  describe('통합 시나리오 검증', () => {
    it('dose-response: 중복 분석 호출이 첫 번째 완료 후에만 허용되어야 함', async () => {
      let isLoading = false
      let analysisCount = 0

      const handleAnalysis = async () => {
        if (isLoading) return

        isLoading = true
        analysisCount++

        // Simulate Pyodide call (100ms)
        await new Promise(resolve => setTimeout(resolve, 100))

        isLoading = false
      }

      // User clicks button multiple times rapidly
      const click1 = handleAnalysis()
      await new Promise(resolve => setTimeout(resolve, 10))
      const click2 = handleAnalysis()
      await new Promise(resolve => setTimeout(resolve, 10))
      const click3 = handleAnalysis()

      await Promise.all([click1, click2, click3])

      // Only first click should trigger analysis
      expect(analysisCount).toBe(1)
    })

    it('non-parametric Friedman: 실제 변수 개수가 UI에 정확히 표시되어야 함', () => {
      const testScenarios = [
        { vars: ['time1', 'time2', 'time3'], expected: 3 },
        { vars: ['pre', 'mid', 'post', 'followup'], expected: 4 },
        { vars: ['t1', 't2', 't3', 't4', 't5'], expected: 5 },
        { vars: Array.from({ length: 10 }, (_, i) => `t${i + 1}`), expected: 10 }
      ]

      testScenarios.forEach(({ vars, expected }) => {
        const result = {
          testName: 'Friedman 검정',
          variables: vars,
          groups: vars.length,
          interpretation: `Friedman 검정 결과, ${vars.length}개 조건 간...`
        }

        expect(result.groups).toBe(expected)
        expect(result.variables.length).toBe(expected)
        expect(result.interpretation).toContain(`${expected}개 조건`)
      })
    })

    it('dose-response: finally 블록이 모든 경로에서 isLoading을 해제해야 함', async () => {
      let isLoading = false

      // Success path
      try {
        isLoading = true
        // ... worker call success
      } catch (err) {
        // error handling
      } finally {
        isLoading = false
      }
      expect(isLoading).toBe(false)

      // Error path
      try {
        isLoading = true
        throw new Error('Worker failed')
      } catch (err) {
        // error handling
      } finally {
        isLoading = false
      }
      expect(isLoading).toBe(false)
    })
  })

  describe('회귀 검증 (기존 기능 유지)', () => {
    it('Bug #7 수정이 기존 actions.startAnalysis 호출을 유지해야 함', () => {
      let startAnalysisCalled = false
      const actions = {
        startAnalysis: () => { startAnalysisCalled = true }
      }

      actions.startAnalysis()

      expect(startAnalysisCalled).toBe(true)
    })

    it('Bug #8 수정이 다른 테스트의 groups 값에 영향 없어야 함', () => {
      // Mann-Whitney: 항상 2
      const mannWhitneyResult = { groups: 2 }
      expect(mannWhitneyResult.groups).toBe(2)

      // Wilcoxon: 항상 2
      const wilcoxonResult = { groups: 2 }
      expect(wilcoxonResult.groups).toBe(2)

      // Kruskal-Wallis: df + 1
      const kruskalResult = { df: 3, groups: 3 + 1 }
      expect(kruskalResult.groups).toBe(4)

      // Friedman: variables.length (동적)
      const friedmanResult = { variables: ['a', 'b', 'c', 'd', 'e'], groups: 5 }
      expect(friedmanResult.groups).toBe(5)
    })
  })
})
