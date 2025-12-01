/**
 * Auto-Answer 유틸리티 테스트
 * - 정규성 자동 응답 (CLT 포함)
 * - 등분산성 자동 응답
 * - 기타 auto-answer 함수들
 */
import { getAutoAnswer, generateAutoAnswers } from '@/components/smart-flow/steps/purpose/auto-answer'
import type { ValidationResults, StatisticalAssumptions } from '@/types/smart-flow'

describe('Auto-Answer 유틸리티', () => {
  // ============================================
  // 1. 정규성 (normality) 테스트
  // ============================================
  describe('getAutoAnswer - normality', () => {
    it('Shapiro-Wilk 정규분포 충족 시 "yes" 반환', () => {
      const context = {
        assumptionResults: {
          normality: {
            shapiroWilk: {
              pValue: 0.266,
              isNormal: true
            }
          }
        } as StatisticalAssumptions
      }

      const result = getAutoAnswer('normality', context)

      expect(result).not.toBeNull()
      expect(result?.value).toBe('yes')
      expect(result?.confidence).toBe('high') // p > 0.1
      expect(result?.evidence).toContain('Shapiro-Wilk')
      expect(result?.evidence).toContain('0.266')
    })

    it('Shapiro-Wilk 정규분포 미충족 시 "no" 반환', () => {
      const context = {
        assumptionResults: {
          normality: {
            shapiroWilk: {
              pValue: 0.023,
              isNormal: false
            }
          }
        } as StatisticalAssumptions
      }

      const result = getAutoAnswer('normality', context)

      expect(result?.value).toBe('no')
      expect(result?.confidence).toBe('high')
      expect(result?.evidence).toContain('0.023')
    })

    it('n >= 30이고 정규성 검정 결과 없으면 CLT 적용하여 "yes" 반환', () => {
      const context = {
        validationResults: {
          totalRows: 50,
          isValid: true,
          columnCount: 3,
          missingValues: 0,
          dataType: 'numeric',
          variables: ['a', 'b', 'c'],
          errors: [],
          warnings: []
        } as ValidationResults,
        assumptionResults: {} as StatisticalAssumptions // 정규성 검정 결과 없음
      }

      const result = getAutoAnswer('normality', context)

      expect(result?.value).toBe('yes')
      expect(result?.confidence).toBe('medium')
      expect(result?.source).toBe('heuristic')
      expect(result?.evidence).toContain('n=50')
      expect(result?.evidence).toContain('중심극한정리')
    })

    it('n < 30이고 정규성 검정 결과 없으면 "check" 반환', () => {
      const context = {
        validationResults: {
          totalRows: 15,
          isValid: true,
          columnCount: 2,
          missingValues: 0,
          dataType: 'numeric',
          variables: ['a', 'b'],
          errors: [],
          warnings: [],
          columns: []  // 그룹 없음
        } as ValidationResults,
        assumptionResults: {} as StatisticalAssumptions
      }

      const result = getAutoAnswer('normality', context)

      expect(result?.value).toBe('check')
      expect(result?.confidence).toBe('unknown')
      expect(result?.requiresConfirmation).toBe(true)
    })

    it('그룹이 있고 추정 최소 그룹 크기 < 30이면 "check" 반환', () => {
      const context = {
        validationResults: {
          totalRows: 40,  // 전체 40, 그룹 2개 -> 추정 그룹당 20
          isValid: true,
          columnCount: 2,
          missingValues: 0,
          dataType: 'numeric',
          variables: ['value', 'group'],
          errors: [],
          warnings: [],
          columns: [
            { name: 'value', type: 'numeric', numericCount: 40, textCount: 0, missingCount: 0, uniqueValues: 35 },
            { name: 'group', type: 'categorical', numericCount: 0, textCount: 40, missingCount: 0, uniqueValues: 2 }
          ]
        } as ValidationResults,
        assumptionResults: {} as StatisticalAssumptions  // 정규성 검정 없음
      }

      const result = getAutoAnswer('normality', context)

      expect(result?.value).toBe('check')
      expect(result?.confidence).toBe('unknown')
    })

    it('그룹이 있고 추정 최소 그룹 크기 >= 30이면 CLT 적용 (low confidence)', () => {
      const context = {
        validationResults: {
          totalRows: 100,  // 전체 100, 그룹 2개 -> 추정 그룹당 50
          isValid: true,
          columnCount: 2,
          missingValues: 0,
          dataType: 'numeric',
          variables: ['value', 'group'],
          errors: [],
          warnings: [],
          columns: [
            { name: 'value', type: 'numeric', numericCount: 100, textCount: 0, missingCount: 0, uniqueValues: 80 },
            { name: 'group', type: 'categorical', numericCount: 0, textCount: 100, missingCount: 0, uniqueValues: 2 }
          ]
        } as ValidationResults,
        assumptionResults: {} as StatisticalAssumptions
      }

      const result = getAutoAnswer('normality', context)

      expect(result?.value).toBe('yes')
      expect(result?.confidence).toBe('low')  // 그룹 있으면 low
      expect(result?.requiresConfirmation).toBe(true)
      expect(result?.evidence).toContain('추정')
    })

    it('selectedVariables.group이 있으면 해당 컬럼으로 그룹 크기 추정', () => {
      const context = {
        validationResults: {
          totalRows: 90,  // 전체 90, treatment 그룹 3개 -> 추정 그룹당 30
          isValid: true,
          columnCount: 3,
          missingValues: 0,
          dataType: 'numeric',
          variables: ['value', 'treatment', 'gender'],
          errors: [],
          warnings: [],
          columns: [
            { name: 'value', type: 'numeric', numericCount: 90, textCount: 0, missingCount: 0, uniqueValues: 80 },
            { name: 'treatment', type: 'categorical', numericCount: 0, textCount: 90, missingCount: 0, uniqueValues: 3 },
            { name: 'gender', type: 'categorical', numericCount: 0, textCount: 90, missingCount: 0, uniqueValues: 2 }
          ]
        } as ValidationResults,
        assumptionResults: {} as StatisticalAssumptions,
        selectedVariables: {
          group: 'treatment'  // 명시적으로 treatment를 그룹으로 지정
        }
      }

      const result = getAutoAnswer('normality', context)

      // treatment(3그룹) 기준 90/3=30 -> CLT 적용 가능
      expect(result?.value).toBe('yes')
      expect(result?.confidence).toBe('low')
      expect(result?.evidence).toContain('30')  // 추정 그룹 크기 30
    })

    it('columnStats만 있어도 그룹 감지 동작', () => {
      const context = {
        validationResults: {
          totalRows: 80,
          isValid: true,
          columnCount: 2,
          missingValues: 0,
          dataType: 'numeric',
          variables: ['value', 'group'],
          errors: [],
          warnings: [],
          // columns 없이 columnStats만 있는 경우
          columnStats: [
            { name: 'value', type: 'numeric', numericCount: 80, textCount: 0, missingCount: 0, uniqueValues: 70 },
            { name: 'group', type: 'categorical', numericCount: 0, textCount: 80, missingCount: 0, uniqueValues: 2 }
          ]
        } as ValidationResults,
        assumptionResults: {} as StatisticalAssumptions
      }

      const result = getAutoAnswer('normality', context)

      // 80/2=40 >= 30 -> CLT 적용
      expect(result?.value).toBe('yes')
      expect(result?.confidence).toBe('low')
    })

        it('빈 객체 normality: {}는 검정 안함으로 처리', () => {
      const context = {
        validationResults: {
          totalRows: 50,
          isValid: true,
          columnCount: 1,
          missingValues: 0,
          dataType: 'numeric',
          variables: ['value'],
          errors: [],
          warnings: [],
          columns: []
        } as ValidationResults,
        assumptionResults: {
          normality: {}  // 빈 객체
        } as StatisticalAssumptions
      }

      const result = getAutoAnswer('normality', context)

      // 빈 객체면 검정 결과 없는 것으로 처리 -> CLT 적용
      expect(result?.value).toBe('yes')
      expect(result?.confidence).toBe('medium')
      expect(result?.evidence).toContain('중심극한정리')
    })

    it('그룹별 정규성 결과 사용', () => {
      const context = {
        assumptionResults: {
          normality: {
            group1: { isNormal: true, pValue: 0.15 },
            group2: { isNormal: true, pValue: 0.22 }
          }
        } as StatisticalAssumptions
      }

      const result = getAutoAnswer('normality', context)

      expect(result?.value).toBe('yes')
      expect(result?.evidence).toContain('모든 그룹')
    })

    it('일부 그룹 정규분포 미충족 시 "no" 반환', () => {
      const context = {
        assumptionResults: {
          normality: {
            group1: { isNormal: true, pValue: 0.15 },
            group2: { isNormal: false, pValue: 0.02 }
          }
        } as StatisticalAssumptions
      }

      const result = getAutoAnswer('normality', context)

      expect(result?.value).toBe('no')
      expect(result?.evidence).toContain('일부 그룹')
    })
  })

  // ============================================
  // 2. 등분산성 (homogeneity) 테스트
  // ============================================
  describe('getAutoAnswer - homogeneity', () => {
    it('Levene 등분산 충족 시 "yes" 반환', () => {
      const context = {
        assumptionResults: {
          homogeneity: {
            levene: {
              pValue: 0.342,
              equalVariance: true
            }
          }
        } as StatisticalAssumptions
      }

      const result = getAutoAnswer('homogeneity', context)

      expect(result).not.toBeNull()
      expect(result?.value).toBe('yes')
      expect(result?.confidence).toBe('high') // p > 0.1
      expect(result?.evidence).toContain('Levene')
      expect(result?.evidence).toContain('0.342')
      expect(result?.evidence).toContain('등분산 충족')
    })

    it('Levene 등분산 미충족 시 "no" 반환 (Welch 권장)', () => {
      const context = {
        assumptionResults: {
          homogeneity: {
            levene: {
              pValue: 0.018,
              equalVariance: false
            }
          }
        } as StatisticalAssumptions
      }

      const result = getAutoAnswer('homogeneity', context)

      expect(result?.value).toBe('no')
      expect(result?.confidence).toBe('high')
      expect(result?.evidence).toContain('0.018')
      expect(result?.evidence).toContain('Welch 권장')
    })

    it('Bartlett 검정 결과 사용 (Levene 없을 때)', () => {
      const context = {
        assumptionResults: {
          homogeneity: {
            bartlett: {
              pValue: 0.156,
              equalVariance: true
            }
          }
        } as StatisticalAssumptions
      }

      const result = getAutoAnswer('homogeneity', context)

      expect(result?.value).toBe('yes')
      expect(result?.evidence).toContain('Bartlett')
    })

    it('등분산성 검정 결과 없으면 "check" 반환', () => {
      const context = {
        assumptionResults: {} as StatisticalAssumptions
      }

      const result = getAutoAnswer('homogeneity', context)

      expect(result?.value).toBe('check')
      expect(result?.confidence).toBe('unknown')
      expect(result?.requiresConfirmation).toBe(true)
    })

    it('p값이 경계선(0.05-0.1)일 때 medium confidence', () => {
      const context = {
        assumptionResults: {
          homogeneity: {
            levene: {
              pValue: 0.07,
              equalVariance: true
            }
          }
        } as StatisticalAssumptions
      }

      const result = getAutoAnswer('homogeneity', context)

      expect(result?.value).toBe('yes')
      expect(result?.confidence).toBe('medium') // 0.05 < p <= 0.1
    })
  })

  // ============================================
  // 3. 변수 유형 (variable_type) 테스트
  // ============================================
  describe('getAutoAnswer - variable_type', () => {
    it('모든 변수가 수치형이면 "numeric" 반환', () => {
      const context = {
        validationResults: {
          columns: [
            { name: 'weight', type: 'numeric', numericCount: 100, textCount: 0, missingCount: 0, uniqueValues: 50 },
            { name: 'height', type: 'numeric', numericCount: 100, textCount: 0, missingCount: 0, uniqueValues: 45 }
          ],
          isValid: true,
          totalRows: 100,
          columnCount: 2,
          missingValues: 0,
          dataType: 'numeric',
          variables: ['weight', 'height'],
          errors: [],
          warnings: []
        } as ValidationResults
      }

      const result = getAutoAnswer('variable_type', context)

      expect(result?.value).toBe('numeric')
      expect(result?.confidence).toBe('high')
    })

    it('범주형 변수 포함 시 "mixed" 반환', () => {
      const context = {
        validationResults: {
          columns: [
            { name: 'weight', type: 'numeric', numericCount: 100, textCount: 0, missingCount: 0, uniqueValues: 50 },
            { name: 'group', type: 'categorical', numericCount: 0, textCount: 100, missingCount: 0, uniqueValues: 3 }
          ],
          isValid: true,
          totalRows: 100,
          columnCount: 2,
          missingValues: 0,
          dataType: 'mixed',
          variables: ['weight', 'group'],
          errors: [],
          warnings: []
        } as ValidationResults
      }

      const result = getAutoAnswer('variable_type', context)

      expect(result?.value).toBe('mixed')
      expect(result?.confidence).toBe('high')
    })
  })

  // ============================================
  // 4. generateAutoAnswers 테스트
  // ============================================
  describe('generateAutoAnswers', () => {
    it('여러 질문에 대해 일괄 자동 응답 생성', () => {
      const context = {
        validationResults: {
          totalRows: 100,
          columns: [
            { name: 'value', type: 'numeric', numericCount: 100, textCount: 0, missingCount: 0, uniqueValues: 80 }
          ],
          isValid: true,
          columnCount: 1,
          missingValues: 0,
          dataType: 'numeric',
          variables: ['value'],
          errors: [],
          warnings: []
        } as ValidationResults,
        assumptionResults: {
          normality: {
            shapiroWilk: { pValue: 0.35, isNormal: true }
          },
          homogeneity: {
            levene: { pValue: 0.22, equalVariance: true }
          }
        } as StatisticalAssumptions
      }

      const results = generateAutoAnswers(['normality', 'homogeneity', 'variable_type'], context)

      expect(Object.keys(results)).toHaveLength(3)
      expect(results.normality?.value).toBe('yes')
      expect(results.homogeneity?.value).toBe('yes')
      expect(results.variable_type?.value).toBe('numeric')
    })

    it('지원하지 않는 질문 ID는 무시', () => {
      const context = {}
      const results = generateAutoAnswers(['unknown_question', 'normality'], context)

      expect(Object.keys(results)).toHaveLength(1)
      expect(results.normality).toBeDefined()
      expect(results.unknown_question).toBeUndefined()
    })
  })

  // ============================================
  // 5. 엣지 케이스
  // ============================================
  describe('Edge Cases', () => {
    it('context가 빈 객체일 때도 안전하게 처리', () => {
      const result = getAutoAnswer('normality', {})

      expect(result).not.toBeNull()
      expect(result?.value).toBe('check')
      expect(result?.requiresConfirmation).toBe(true)
    })

    it('pValue가 undefined일 때 low confidence 반환', () => {
      const context = {
        assumptionResults: {
          homogeneity: {
            levene: {
              pValue: undefined,
              equalVariance: true
            }
          }
        } as unknown as StatisticalAssumptions
      }

      const result = getAutoAnswer('homogeneity', context)

      expect(result?.value).toBe('yes')
      expect(result?.confidence).toBe('low')  // pValue 없으면 low
      expect(result?.requiresConfirmation).toBe(true)
      expect(result?.evidence).toContain('p-value 정보 없음')
    })

    it('pValue undefined + equalVariance false면 "no"와 low confidence', () => {
      const context = {
        assumptionResults: {
          homogeneity: {
            levene: {
              pValue: undefined,
              equalVariance: false
            }
          }
        } as unknown as StatisticalAssumptions
      }

      const result = getAutoAnswer('homogeneity', context)

      expect(result?.value).toBe('no')
      expect(result?.confidence).toBe('low')
      expect(result?.requiresConfirmation).toBe(true)
    })

    it('알 수 없는 questionId에 대해 null 반환', () => {
      const result = getAutoAnswer('unknown_id', {})
      expect(result).toBeNull()
    })
  })
})