/**
 * RecommendationChecklist + checkMethodRequirements 로직 단위 테스트
 *
 * 목적: Collapsible UI 없이 순수 로직 검증
 * - 신뢰도 점수 계산
 * - 가정 검정 undefined 처리
 * - assumptionResults 우선 사용
 * - checkMethodRequirements undefined 경고 제외
 */

import { render, screen } from '@testing-library/react'
import { checkMethodRequirements } from '@/lib/statistics/method-mapping'

// RecommendationChecklist 로직 추출
function calculateConfidence(
  method: any,
  dataProfile: any,
  assumptionResults?: any
): { confidence: number; passedCount: number; totalCount: number } {
  const methodReq = method.requirements
  let passedCount = 0
  let totalCount = 0

  // 샘플 크기 체크
  if (methodReq?.minSampleSize) {
    totalCount++
    if (dataProfile.totalRows >= methodReq.minSampleSize) passedCount++
  }

  // 변수 타입 체크
  if (methodReq?.variableTypes) {
    if (methodReq.variableTypes.includes('numeric')) {
      totalCount++
      if (dataProfile.numericVars > 0) passedCount++
    }
    if (methodReq.variableTypes.includes('categorical')) {
      totalCount++
      if (dataProfile.categoricalVars > 0) passedCount++
    }
  }

  // 가정 체크 (assumptionResults 우선, dataProfile fallback)
  if (methodReq?.assumptions) {
    methodReq.assumptions.forEach((assumption: string) => {
      if (assumption === '정규성') {
        const normalityPassed =
          assumptionResults?.normality?.shapiroWilk?.isNormal ??
          assumptionResults?.normality?.kolmogorovSmirnov?.isNormal ??
          dataProfile.normalityPassed

        // 검정 결과가 있을 때만 분모/분자에 반영
        if (normalityPassed !== undefined) {
          totalCount++
          if (normalityPassed) passedCount++
        }
      }

      if (assumption === '등분산성') {
        const homogeneityPassed =
          assumptionResults?.homogeneity?.levene?.equalVariance ??
          assumptionResults?.homogeneity?.bartlett?.equalVariance ??
          dataProfile.homogeneityPassed

        // 검정 결과가 있을 때만 분모/분자에 반영
        if (homogeneityPassed !== undefined) {
          totalCount++
          if (homogeneityPassed) passedCount++
        }
      }
    })
  }

  const confidence = totalCount > 0 ? Math.round((passedCount / totalCount) * 100) : 0

  return { confidence, passedCount, totalCount }
}

describe('RecommendationChecklist 로직 테스트', () => {
  const mockMethod = {
    id: 't-test',
    name: 'T-Test',
    description: '두 그룹 평균 비교',
    category: 't-test' as const,
    requirements: {
      minSampleSize: 30,
      variableTypes: ['numeric', 'categorical'],
      assumptions: ['정규성', '등분산성']
    }
  }

  describe('문제 1: 기본값 undefined (검정 미실행)', () => {
    it('normalityPassed가 undefined일 때 분모에서 제외', () => {
      const dataProfile = {
        totalRows: 50,
        numericVars: 2,
        categoricalVars: 1,
        normalityPassed: undefined,  // ✅ undefined
        homogeneityPassed: undefined
      }

      const { confidence, passedCount, totalCount } = calculateConfidence(mockMethod, dataProfile)

      // 분모에서 가정 2개 제외 (샘플 + numeric + categorical = 3)
      expect(totalCount).toBe(3)
      expect(passedCount).toBe(3)
      expect(confidence).toBe(100)
    })

    it('normalityPassed가 false일 때 분모에 포함', () => {
      const dataProfile = {
        totalRows: 50,
        numericVars: 2,
        categoricalVars: 1,
        normalityPassed: false,  // ✅ false
        homogeneityPassed: false
      }

      const { confidence, passedCount, totalCount } = calculateConfidence(mockMethod, dataProfile)

      // 분모에 가정 2개 포함 (샘플 + numeric + categorical + 정규성 + 등분산성 = 5)
      expect(totalCount).toBe(5)
      expect(passedCount).toBe(3)  // 샘플 + numeric + categorical만 통과
      expect(confidence).toBe(60)
    })
  })

  describe('문제 2: 가정 검정 미실행 시 신뢰도 100%', () => {
    it('검정 미실행 시 신뢰도 100% (분모 제외)', () => {
      const dataProfile = {
        totalRows: 50,
        numericVars: 2,
        categoricalVars: 1,
        normalityPassed: undefined,
        homogeneityPassed: undefined
      }

      const { confidence } = calculateConfidence(mockMethod, dataProfile)
      expect(confidence).toBe(100)
    })

    it('정규성만 실행(통과) 시 신뢰도 100%', () => {
      const dataProfile = {
        totalRows: 50,
        numericVars: 2,
        categoricalVars: 1,
        normalityPassed: true,         // ✅ 통과
        homogeneityPassed: undefined   // ❓ 미실행
      }

      const { confidence, passedCount, totalCount } = calculateConfidence(mockMethod, dataProfile)

      expect(totalCount).toBe(4)  // 샘플 + numeric + categorical + 정규성
      expect(passedCount).toBe(4)
      expect(confidence).toBe(100)
    })

    it('정규성 실패, 등분산성 미실행 시 신뢰도 75%', () => {
      const dataProfile = {
        totalRows: 50,
        numericVars: 2,
        categoricalVars: 1,
        normalityPassed: false,        // ❌ 실패
        homogeneityPassed: undefined   // ❓ 미실행
      }

      const { confidence, passedCount, totalCount } = calculateConfidence(mockMethod, dataProfile)

      expect(totalCount).toBe(4)  // 샘플 + numeric + categorical + 정규성
      expect(passedCount).toBe(3)
      expect(confidence).toBe(75)
    })
  })

  describe('문제 3: assumptionResults 직접 사용', () => {
    it('assumptionResults가 있으면 우선 사용', () => {
      const dataProfile = {
        totalRows: 50,
        numericVars: 2,
        categoricalVars: 1,
        normalityPassed: false,  // ❌ 오래된 값
        homogeneityPassed: false
      }

      const assumptionResults = {
        normality: {
          shapiroWilk: { isNormal: true, pValue: 0.234 }  // ✅ 최신 값 (통과)
        },
        homogeneity: {
          levene: { equalVariance: true, pValue: 0.456 }
        }
      }

      const { confidence, passedCount, totalCount } = calculateConfidence(
        mockMethod,
        dataProfile,
        assumptionResults
      )

      // assumptionResults 우선 사용 → 모두 통과
      expect(totalCount).toBe(5)
      expect(passedCount).toBe(5)
      expect(confidence).toBe(100)
    })

    it('assumptionResults 없으면 dataProfile fallback', () => {
      const dataProfile = {
        totalRows: 50,
        numericVars: 2,
        categoricalVars: 1,
        normalityPassed: true,   // ✅ fallback 값
        homogeneityPassed: false
      }

      const { confidence, passedCount, totalCount } = calculateConfidence(
        mockMethod,
        dataProfile,
        undefined
      )

      // dataProfile 값 사용
      expect(totalCount).toBe(5)
      expect(passedCount).toBe(4)  // 샘플 + numeric + categorical + 정규성
      expect(confidence).toBe(80)
    })

    it('Kolmogorov-Smirnov fallback (Shapiro-Wilk 없을 때)', () => {
      const dataProfile = {
        totalRows: 50,
        numericVars: 2,
        categoricalVars: 1,
        normalityPassed: false,  // dataProfile 값 (사용 안 됨)
        homogeneityPassed: undefined
      }

      const assumptionResults = {
        normality: {
          // shapiroWilk 없음
          kolmogorovSmirnov: { isNormal: true, pValue: 0.123 }  // ✅ fallback
        }
      }

      const { confidence, passedCount, totalCount } = calculateConfidence(
        mockMethod,
        dataProfile,
        assumptionResults
      )

      // Kolmogorov-Smirnov 값 사용 → 정규성 통과
      expect(totalCount).toBe(4)  // 샘플 + numeric + categorical + 정규성
      expect(passedCount).toBe(4)
      expect(confidence).toBe(100)
    })
  })

  describe('통합 시나리오', () => {
    it('시나리오 1: 완전 미실행 (신뢰도 100%)', () => {
      const dataProfile = {
        totalRows: 50,
        numericVars: 2,
        categoricalVars: 1,
        normalityPassed: undefined,
        homogeneityPassed: undefined
      }

      const { confidence } = calculateConfidence(mockMethod, dataProfile)
      expect(confidence).toBe(100)
    })

    it('시나리오 2: 모두 통과 (신뢰도 100%)', () => {
      const dataProfile = {
        totalRows: 50,
        numericVars: 2,
        categoricalVars: 1,
        normalityPassed: true,
        homogeneityPassed: true
      }

      const { confidence } = calculateConfidence(mockMethod, dataProfile)
      expect(confidence).toBe(100)
    })

    it('시나리오 3: 정규성 실패, 등분산성 통과 (신뢰도 80%)', () => {
      const dataProfile = {
        totalRows: 50,
        numericVars: 2,
        categoricalVars: 1,
        normalityPassed: false,
        homogeneityPassed: true
      }

      const { confidence } = calculateConfidence(mockMethod, dataProfile)
      expect(confidence).toBe(80)
    })

    it('시나리오 4: 샘플 부족 + 가정 미실행 (신뢰도 67%)', () => {
      const dataProfile = {
        totalRows: 10,  // ❌ 부족 (30 필요)
        numericVars: 2,
        categoricalVars: 1,
        normalityPassed: undefined,
        homogeneityPassed: undefined
      }

      const { confidence, passedCount, totalCount } = calculateConfidence(mockMethod, dataProfile)

      // totalCount = 3 (샘플 + numeric + categorical)
      // passedCount = 2 (numeric + categorical)
      expect(totalCount).toBe(3)
      expect(passedCount).toBe(2)
      expect(confidence).toBe(67)  // Math.round(2/3 * 100) = 67
    })
  })

  describe('문제 4: checkMethodRequirements undefined 경고 제외', () => {
    it('normalityPassed=undefined일 때 경고 없음', () => {
      const dataProfile = {
        totalRows: 50,
        numericVars: 2,
        categoricalVars: 1,
        normalityPassed: undefined,  // ✅ 미실행
        homogeneityPassed: undefined
      }

      const requirements = checkMethodRequirements(mockMethod, dataProfile)

      // 경고 없음 (undefined는 미실행 상태)
      expect(requirements.warnings).toEqual([])
      expect(requirements.canUse).toBe(true)
    })

    it('normalityPassed=false일 때 경고 있음', () => {
      const dataProfile = {
        totalRows: 50,
        numericVars: 2,
        categoricalVars: 1,
        normalityPassed: false,  // ❌ 실패
        homogeneityPassed: false
      }

      const requirements = checkMethodRequirements(mockMethod, dataProfile)

      // 경고 있음
      expect(requirements.warnings).toContain('정규성 가정 위반 (비모수 검정 고려)')
      expect(requirements.warnings).toContain('등분산성 가정 위반 (Welch 검정 고려)')
    })

    it('normalityPassed=true일 때 경고 없음', () => {
      const dataProfile = {
        totalRows: 50,
        numericVars: 2,
        categoricalVars: 1,
        normalityPassed: true,   // ✅ 통과
        homogeneityPassed: true
      }

      const requirements = checkMethodRequirements(mockMethod, dataProfile)

      // 가정 관련 경고 없음
      expect(requirements.warnings.filter((w: string) => w.includes('정규성'))).toEqual([])
      expect(requirements.warnings.filter((w: string) => w.includes('등분산성'))).toEqual([])
    })

    it('정규성만 실패, 등분산성 미실행 시 정규성 경고만', () => {
      const dataProfile = {
        totalRows: 50,
        numericVars: 2,
        categoricalVars: 1,
        normalityPassed: false,      // ❌ 실패
        homogeneityPassed: undefined // ❓ 미실행
      }

      const requirements = checkMethodRequirements(mockMethod, dataProfile)

      // 정규성 경고만
      expect(requirements.warnings).toContain('정규성 가정 위반 (비모수 검정 고려)')
      expect(requirements.warnings.filter((w: string) => w.includes('등분산성'))).toEqual([])
    })
  })
})
