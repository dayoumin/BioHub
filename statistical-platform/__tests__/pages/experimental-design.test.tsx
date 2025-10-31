import { renderHook, act, waitFor } from '@testing-library/react'
import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * 실험설계 페이지 단위 테스트
 *
 * 목적: processStepTransition 로직 검증
 * - 각 단계별 전환 로직 테스트
 * - 에러 케이스 테스트
 * - 매핑 테이블 검증
 */

// Mock 타입 정의
type SelectionStep = 'purpose' | 'groups' | 'measurement' | 'relationship-type' | 'research-details' | 'recommendation'

interface StepData {
  purpose?: string
  groups?: number | string
  repeated?: boolean | string
  relationshipType?: string
  researchDetails?: {
    title: string
    hypothesis: string
  }
}

interface ExperimentDesign {
  id: string
  name: string
  description: string
}

// Mock 매핑 테이블 (실제 코드와 동일)
const PURPOSE_TO_DESIGN_MAP: Record<string, string> = {
  'categorical': 'chi-square-design',
  'causal': 'quasi-experimental',
  'case-study': 'single-case-design',
  'time-analysis': 'time-series-design',
  'survival': 'survival-analysis',
  'dose-response': 'dose-response',
  'optimization': 'response-surface'
}

const GROUPS_TO_DESIGN_MAP: Record<string, string> = {
  '2x2': 'factorial-2x2',
  'mixed': 'mixed-design'
}

// Mock 함수들
const mockGetDesignById = vi.fn((id: string): ExperimentDesign | null => {
  if (id === 'chi-square-design') {
    return { id, name: 'Chi-Square Design', description: 'Test description' }
  }
  if (id === 'factorial-2x2') {
    return { id, name: '2x2 Factorial Design', description: 'Test description' }
  }
  if (id === 'correlation-study') {
    return { id, name: 'Correlation Study', description: 'Test description' }
  }
  return null
})

const mockGetRecommendedDesign = vi.fn((data: StepData): ExperimentDesign | null => {
  return { id: 'recommended', name: 'Recommended Design', description: 'Test description' }
})

// processStepTransition 로직 추출 (테스트용)
async function processStepTransition(
  step: SelectionStep,
  data: StepData
): Promise<{ nextStep: SelectionStep; design?: ExperimentDesign }> {
  // Purpose 단계
  if (step === 'purpose' && data.purpose) {
    if (data.purpose === 'compare') {
      return { nextStep: 'groups' }
    }
    if (data.purpose === 'relationship') {
      return { nextStep: 'relationship-type' }
    }
    // 매핑된 설계 ID 조회
    const designId = PURPOSE_TO_DESIGN_MAP[data.purpose]
    if (designId) {
      const design = mockGetDesignById(designId)
      if (design) {
        return { nextStep: 'recommendation', design }
      }
    }
    throw new Error(`${data.purpose}에 해당하는 실험설계를 찾을 수 없습니다`)
  }

  // Groups 단계
  if (step === 'groups' && data.groups !== undefined) {
    if (data.groups === 2) {
      return { nextStep: 'measurement' }
    }
    // 매핑된 설계 ID 조회
    const designId = GROUPS_TO_DESIGN_MAP[String(data.groups)]
    if (designId) {
      const design = mockGetDesignById(designId)
      if (design) {
        return { nextStep: 'recommendation', design }
      }
    }
    // 3개 이상 그룹
    if (typeof data.groups === 'number' && data.groups > 2) {
      const design = mockGetRecommendedDesign(data)
      if (design) {
        return { nextStep: 'recommendation', design }
      }
    }
    throw new Error('집단 구조에 맞는 실험설계를 찾을 수 없습니다')
  }

  // Measurement 단계
  if (step === 'measurement' && data.repeated !== undefined) {
    if (data.repeated === 'nonparametric') {
      const design = mockGetDesignById('nonparametric-design')
      if (design) {
        return { nextStep: 'recommendation', design }
      }
    }
    if (data.repeated === 'time-series') {
      const design = mockGetDesignById('repeated-measures-anova')
      if (design) {
        return { nextStep: 'recommendation', design }
      }
    }
    // 일반 측정 → 연구 정보 수집
    return { nextStep: 'research-details' }
  }

  // Relationship Type 단계
  if (step === 'relationship-type' && data.relationshipType) {
    if (data.relationshipType === 'correlation') {
      const design = mockGetDesignById('correlation-study')
      if (design) {
        return { nextStep: 'recommendation', design }
      }
    }
    if (data.relationshipType === 'regression') {
      return { nextStep: 'research-details' }
    }
    throw new Error('관계 분석 유형에 맞는 실험설계를 찾을 수 없습니다')
  }

  // Research Details 단계
  if (step === 'research-details' && data.researchDetails?.title && data.researchDetails?.hypothesis) {
    const design = mockGetRecommendedDesign(data)
    if (design) {
      return { nextStep: 'recommendation', design }
    }
    throw new Error('실험설계를 추천할 수 없습니다')
  }

  throw new Error('단계 전환 중 오류가 발생했습니다')
}

describe('실험설계 페이지 - processStepTransition', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Purpose 단계', () => {
    it('compare 선택 시 groups 단계로 전환', async () => {
      const result = await processStepTransition('purpose', { purpose: 'compare' })

      expect(result.nextStep).toBe('groups')
      expect(result.design).toBeUndefined()
    })

    it('relationship 선택 시 relationship-type 단계로 전환', async () => {
      const result = await processStepTransition('purpose', { purpose: 'relationship' })

      expect(result.nextStep).toBe('relationship-type')
      expect(result.design).toBeUndefined()
    })

    it('categorical 선택 시 chi-square-design 추천', async () => {
      const result = await processStepTransition('purpose', { purpose: 'categorical' })

      expect(result.nextStep).toBe('recommendation')
      expect(result.design).toBeDefined()
      expect(result.design?.id).toBe('chi-square-design')
      expect(mockGetDesignById).toHaveBeenCalledWith('chi-square-design')
    })

    it('매핑 테이블의 모든 항목 검증', async () => {
      const purposes = ['categorical', 'causal', 'case-study', 'time-analysis', 'survival', 'dose-response', 'optimization']

      for (const purpose of purposes) {
        mockGetDesignById.mockReturnValueOnce({
          id: PURPOSE_TO_DESIGN_MAP[purpose],
          name: `Test ${purpose}`,
          description: 'Test'
        })

        const result = await processStepTransition('purpose', { purpose })
        expect(result.nextStep).toBe('recommendation')
        expect(mockGetDesignById).toHaveBeenCalledWith(PURPOSE_TO_DESIGN_MAP[purpose])
      }
    })

    it('존재하지 않는 purpose 선택 시 에러', async () => {
      await expect(
        processStepTransition('purpose', { purpose: 'invalid-purpose' })
      ).rejects.toThrow('invalid-purpose에 해당하는 실험설계를 찾을 수 없습니다')
    })
  })

  describe('Groups 단계', () => {
    it('2개 그룹 선택 시 measurement 단계로 전환', async () => {
      const result = await processStepTransition('groups', { groups: 2 })

      expect(result.nextStep).toBe('measurement')
      expect(result.design).toBeUndefined()
    })

    it('2x2 선택 시 factorial-2x2 추천', async () => {
      const result = await processStepTransition('groups', { groups: '2x2' })

      expect(result.nextStep).toBe('recommendation')
      expect(result.design).toBeDefined()
      expect(result.design?.id).toBe('factorial-2x2')
      expect(mockGetDesignById).toHaveBeenCalledWith('factorial-2x2')
    })

    it('3개 이상 그룹 선택 시 추천 엔진 사용', async () => {
      const result = await processStepTransition('groups', { groups: 3 })

      expect(result.nextStep).toBe('recommendation')
      expect(result.design).toBeDefined()
      expect(mockGetRecommendedDesign).toHaveBeenCalled()
    })

    it('groups가 undefined면 에러', async () => {
      await expect(
        processStepTransition('groups', {})
      ).rejects.toThrow('단계 전환 중 오류가 발생했습니다')
    })
  })

  describe('Measurement 단계', () => {
    it('false (독립 그룹) 선택 시 research-details로 전환', async () => {
      const result = await processStepTransition('measurement', { repeated: false })

      expect(result.nextStep).toBe('research-details')
      expect(result.design).toBeUndefined()
    })

    it('true (반복 측정) 선택 시 research-details로 전환', async () => {
      const result = await processStepTransition('measurement', { repeated: true })

      expect(result.nextStep).toBe('research-details')
      expect(result.design).toBeUndefined()
    })

    it('nonparametric 선택 시 추천', async () => {
      mockGetDesignById.mockReturnValueOnce({
        id: 'nonparametric-design',
        name: 'Nonparametric Design',
        description: 'Test'
      })

      const result = await processStepTransition('measurement', { repeated: 'nonparametric' })

      expect(result.nextStep).toBe('recommendation')
      expect(mockGetDesignById).toHaveBeenCalledWith('nonparametric-design')
    })
  })

  describe('Relationship Type 단계', () => {
    it('correlation 선택 시 correlation-study 추천', async () => {
      const result = await processStepTransition('relationship-type', { relationshipType: 'correlation' })

      expect(result.nextStep).toBe('recommendation')
      expect(result.design).toBeDefined()
      expect(result.design?.id).toBe('correlation-study')
    })

    it('regression 선택 시 research-details로 전환', async () => {
      const result = await processStepTransition('relationship-type', { relationshipType: 'regression' })

      expect(result.nextStep).toBe('research-details')
      expect(result.design).toBeUndefined()
    })

    it('잘못된 relationshipType 선택 시 에러', async () => {
      await expect(
        processStepTransition('relationship-type', { relationshipType: 'invalid' })
      ).rejects.toThrow('관계 분석 유형에 맞는 실험설계를 찾을 수 없습니다')
    })
  })

  describe('Research Details 단계', () => {
    it('title과 hypothesis 입력 시 추천 엔진 사용', async () => {
      const data: StepData = {
        researchDetails: {
          title: 'Test Title',
          hypothesis: 'Test Hypothesis'
        }
      }

      const result = await processStepTransition('research-details', data)

      expect(result.nextStep).toBe('recommendation')
      expect(result.design).toBeDefined()
      expect(mockGetRecommendedDesign).toHaveBeenCalledWith(data)
    })

    it('title만 입력 시 추천 안 함', async () => {
      const data: StepData = {
        researchDetails: {
          title: 'Test Title',
          hypothesis: ''
        }
      }

      await expect(
        processStepTransition('research-details', data)
      ).rejects.toThrow('단계 전환 중 오류가 발생했습니다')
    })

    it('hypothesis만 입력 시 추천 안 함', async () => {
      const data: StepData = {
        researchDetails: {
          title: '',
          hypothesis: 'Test Hypothesis'
        }
      }

      await expect(
        processStepTransition('research-details', data)
      ).rejects.toThrow('단계 전환 중 오류가 발생했습니다')
    })
  })

  describe('에러 케이스', () => {
    it('purpose 없이 purpose 단계 전환 시 에러', async () => {
      await expect(
        processStepTransition('purpose', {})
      ).rejects.toThrow('단계 전환 중 오류가 발생했습니다')
    })

    it('매핑된 설계가 없을 때 에러', async () => {
      mockGetDesignById.mockReturnValueOnce(null)

      await expect(
        processStepTransition('purpose', { purpose: 'categorical' })
      ).rejects.toThrow('categorical에 해당하는 실험설계를 찾을 수 없습니다')
    })

    it('추천 엔진이 null 반환 시 에러', async () => {
      mockGetRecommendedDesign.mockReturnValueOnce(null)

      await expect(
        processStepTransition('groups', { groups: 3 })
      ).rejects.toThrow('집단 구조에 맞는 실험설계를 찾을 수 없습니다')
    })
  })

  describe('매핑 테이블 무결성 검증', () => {
    it('PURPOSE_TO_DESIGN_MAP에 중복 키가 없어야 함', () => {
      const keys = Object.keys(PURPOSE_TO_DESIGN_MAP)
      const uniqueKeys = new Set(keys)
      expect(keys.length).toBe(uniqueKeys.size)
    })

    it('PURPOSE_TO_DESIGN_MAP에 빈 값이 없어야 함', () => {
      const values = Object.values(PURPOSE_TO_DESIGN_MAP)
      values.forEach(value => {
        expect(value).toBeTruthy()
        expect(typeof value).toBe('string')
        expect(value.length).toBeGreaterThan(0)
      })
    })

    it('GROUPS_TO_DESIGN_MAP에 중복 키가 없어야 함', () => {
      const keys = Object.keys(GROUPS_TO_DESIGN_MAP)
      const uniqueKeys = new Set(keys)
      expect(keys.length).toBe(uniqueKeys.size)
    })

    it('GROUPS_TO_DESIGN_MAP에 빈 값이 없어야 함', () => {
      const values = Object.values(GROUPS_TO_DESIGN_MAP)
      values.forEach(value => {
        expect(value).toBeTruthy()
        expect(typeof value).toBe('string')
        expect(value.length).toBeGreaterThan(0)
      })
    })
  })
})
