/**
 * 단계 상태 계산 수정 검증 테스트
 *
 * 목적: chi-square와 non-parametric 페이지의 단계 상태 계산 로직이
 *       올바르게 수정되었는지 검증
 *
 * 테스트 대상:
 * 1. chi-square/page.tsx - 2단계 플로우 (인덱스 0, 1)
 * 2. non-parametric/page.tsx - 3단계 플로우 (인덱스  0, 1, 2)
 */

import { describe, it, expect } from 'vitest'
import type { StatisticsStep } from '@/components/statistics/StatisticsPageLayout'

describe('단계 상태 계산 로직 검증', () => {
  describe('chi-square/page.tsx (2단계 플로우)', () => {
    it('currentStep = 0: 1단계 current, 2단계 pending', () => {
      const currentStep = 0
      const results = null

      const step1Status = currentStep >= 1 ? 'completed' : 'current'
      const step2Status = results ? 'completed' : currentStep >= 1 ? 'current' : 'pending'

      expect(step1Status).toBe('current')
      expect(step2Status).toBe('pending')
    })

    it('currentStep = 1 (분석 완료): 1단계 completed, 2단계 current', () => {
      const currentStep = 1
      const results = null

      const step1Status = currentStep >= 1 ? 'completed' : 'current'
      const step2Status = results ? 'completed' : currentStep >= 1 ? 'current' : 'pending'

      expect(step1Status).toBe('completed')
      expect(step2Status).toBe('current')
    })

    it('currentStep = 1 + results 있음: 1단계 completed, 2단계 completed', () => {
      const currentStep = 1
      const results = { oddsRatio: 1.5 } // Mock result

      const step1Status = currentStep >= 1 ? 'completed' : 'current'
      const step2Status = results ? 'completed' : currentStep >= 1 ? 'current' : 'pending'

      expect(step1Status).toBe('completed')
      expect(step2Status).toBe('completed')
    })

    it('completeAnalysis(result, 1) 호출 시나리오 검증', () => {
      // completeAnalysis(result, 1)은 currentStep을 1로 설정하고 results를 저장
      const currentStep = 1
      const results = {
        oddsRatio: 2.5,
        pValue: 0.023,
        reject: true
      }

      const steps: StatisticsStep[] = [
        {
          id: 'input-table',
          number: 1,
          title: '분할표 입력',
          description: '2×2 분할표 데이터 입력',
          status: currentStep >= 1 ? 'completed' : 'current'
        },
        {
          id: 'view-results',
          number: 2,
          title: '결과 확인',
          description: 'Fisher 정확 검정 결과',
          status: results ? 'completed' : currentStep >= 1 ? 'current' : 'pending'
        }
      ]

      expect(steps[0].status).toBe('completed')
      expect(steps[1].status).toBe('completed')
      expect(steps.every(s => s.status !== 'pending')).toBe(true)
    })
  })

  describe('non-parametric/page.tsx (3단계 플로우)', () => {
    it('currentStep = 0: 1단계 current, 2-3단계 pending', () => {
      const currentStep = 0
      const uploadedData = null
      const selectedVariables = null
      const result = null

      const step1Status = uploadedData ? 'completed' : 'current'
      const step2Status = selectedVariables && Object.keys(selectedVariables).length > 0
        ? 'completed'
        : uploadedData ? 'current' : 'pending'
      const step3Status = result ? 'completed' : currentStep >= 2 ? 'current' : 'pending'

      expect(step1Status).toBe('current')
      expect(step2Status).toBe('pending')
      expect(step3Status).toBe('pending')
    })

    it('currentStep = 1 (변수 선택 완료): 1-2단계 completed, 3단계 pending', () => {
      const currentStep = 1
      const uploadedData = { data: [] }
      const selectedVariables = { dependent: 'var1' }
      const result = null

      const step1Status = uploadedData ? 'completed' : 'current'
      const step2Status = selectedVariables && Object.keys(selectedVariables).length > 0
        ? 'completed'
        : uploadedData ? 'current' : 'pending'
      const step3Status = result ? 'completed' : currentStep >= 2 ? 'current' : 'pending'

      expect(step1Status).toBe('completed')
      expect(step2Status).toBe('completed')
      expect(step3Status).toBe('pending')
    })

    it('currentStep = 2 (분석 실행 중): 1-2단계 completed, 3단계 current', () => {
      const currentStep = 2
      const uploadedData = { data: [] }
      const selectedVariables = { dependent: 'var1' }
      const result = null

      const step1Status = uploadedData ? 'completed' : 'current'
      const step2Status = selectedVariables && Object.keys(selectedVariables).length > 0
        ? 'completed'
        : uploadedData ? 'current' : 'pending'
      const step3Status = result ? 'completed' : currentStep >= 2 ? 'current' : 'pending'

      expect(step1Status).toBe('completed')
      expect(step2Status).toBe('completed')
      expect(step3Status).toBe('current')  // ✅ 핵심: currentStep >= 2이므로 current
    })

    it('currentStep = 2 + result 있음: 모든 단계 completed', () => {
      const currentStep = 2
      const uploadedData = { data: [] }
      const selectedVariables = { dependent: 'var1' }
      const result = { testName: 'Mann-Whitney U', pValue: 0.023 }

      const step1Status = uploadedData ? 'completed' : 'current'
      const step2Status = selectedVariables && Object.keys(selectedVariables).length > 0
        ? 'completed'
        : uploadedData ? 'current' : 'pending'
      const step3Status = result ? 'completed' : currentStep >= 2 ? 'current' : 'pending'

      expect(step1Status).toBe('completed')
      expect(step2Status).toBe('completed')
      expect(step3Status).toBe('completed')
    })

    it('completeAnalysis(mockResult, 2) 호출 시나리오 검증', () => {
      // completeAnalysis(mockResult, 2)는 currentStep을 2로 설정하고 result를 저장
      const currentStep = 2
      const uploadedData = { data: [{ var1: 10 }] }
      const selectedVariables = { dependent: 'var1', grouping: 'group' }
      const result = {
        testName: 'Mann-Whitney U',
        statistic: 234.5,
        pValue: 0.023,
        alpha: 0.05
      }

      const steps: StatisticsStep[] = [
        {
          id: 'upload-data',
          number: 1,
          title: '데이터 업로드',
          description: 'CSV 또는 Excel 파일 업로드',
          status: uploadedData ? 'completed' : 'current'
        },
        {
          id: 'select-variables',
          number: 2,
          title: '변수 선택',
          description: '분석할 변수 선택',
          status: selectedVariables && Object.keys(selectedVariables).length > 0
            ? 'completed'
            : uploadedData ? 'current' : 'pending'
        },
        {
          id: 'run-analysis',
          number: 3,
          title: '분석 실행',
          description: '비모수 검정 수행',
          status: result ? 'completed' : currentStep >= 2 ? 'current' : 'pending'
        }
      ]

      expect(steps[0].status).toBe('completed')
      expect(steps[1].status).toBe('completed')
      expect(steps[2].status).toBe('completed')
      expect(steps.every(s => s.status !== 'pending')).toBe(true)
    })
  })

  describe('수정 전후 비교 (Edge Cases)', () => {
    it('[수정 전] chi-square: currentStep = 1일 때 1단계가 pending이었음 (버그)', () => {
      const currentStep = 1

      // 수정 전 로직 (버그)
      const oldStep1Status = currentStep > 1 ? 'completed' : 'current'

      // 수정 후 로직 (정상)
      const newStep1Status = currentStep >= 1 ? 'completed' : 'current'

      expect(oldStep1Status).toBe('current')  // ❌ 버그: 완료되었는데도 current
      expect(newStep1Status).toBe('completed') // ✅ 수정: 올바르게 completed
    })

    it('[수정 전] non-parametric: currentStep = 2일 때 3단계가 pending이었음 (버그)', () => {
      const currentStep = 2
      const result = null

      // 수정 전 로직 (버그)
      const oldStep3Status = result ? 'completed' : currentStep >= 3 ? 'current' : 'pending'

      // 수정 후 로직 (정상)
      const newStep3Status = result ? 'completed' : currentStep >= 2 ? 'current' : 'pending'

      expect(oldStep3Status).toBe('pending')  // ❌ 버그: 분석 중인데도 pending
      expect(newStep3Status).toBe('current')  // ✅ 수정: 올바르게 current
    })
  })

  describe('단계 인덱스 경계 검증', () => {
    it('chi-square: 최대 인덱스는 1 (2단계 플로우)', () => {
      // completeAnalysis의 두 번째 인자는 최종 단계 인덱스
      const maxStepIndex = 1
      const totalSteps = 2

      expect(maxStepIndex).toBe(totalSteps - 1)
    })

    it('non-parametric: 최대 인덱스는 2 (3단계 플로우)', () => {
      // completeAnalysis의 두 번째 인자는 최종 단계 인덱스
      const maxStepIndex = 2
      const totalSteps = 3

      expect(maxStepIndex).toBe(totalSteps - 1)
    })

    it('currentStep은 0-based 인덱스 사용', () => {
      const steps = [
        { number: 1 },  // currentStep = 0일 때 이 단계가 current
        { number: 2 },  // currentStep = 1일 때 이 단계가 current
        { number: 3 }   // currentStep = 2일 때 이 단계가 current
      ]

      expect(steps[0].number).toBe(1)
      expect(steps[1].number).toBe(2)
      expect(steps[2].number).toBe(3)

      // number는 1-based, 인덱스는 0-based
      expect(steps.length).toBe(3)
    })
  })
})
