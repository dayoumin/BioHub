/**
 * Phase B-2: Step 2 가정검증 단위 테스트
 *
 * PyodideCore는 Mock으로 처리하여 순수 로직만 테스트
 */

import type { ValidationResults, StatisticalAssumptions } from '@/types/smart-flow'

describe('Phase B-2: 가정검증 타입 테스트', () => {
  describe('1. ValidationResults 타입 정의', () => {
    it('assumptionTests는 optional이어야 함', () => {
      // assumptionTests 없이도 유효한 ValidationResults
      const resultWithoutAssumptions: ValidationResults = {
        isValid: true,
        totalRows: 10,
        columnCount: 2,
        missingValues: 0,
        dataType: '혼합형',
        variables: ['age', 'score'],
        errors: [],
        warnings: [],
      }

      expect(resultWithoutAssumptions).toBeDefined()
      expect(resultWithoutAssumptions.assumptionTests).toBeUndefined()
    })

    it('assumptionTests가 있을 때 정상 작동', () => {
      const resultWithAssumptions: ValidationResults = {
        isValid: true,
        totalRows: 10,
        columnCount: 2,
        missingValues: 0,
        dataType: '수치형',
        variables: ['score'],
        errors: [],
        warnings: [],
        assumptionTests: {
          normality: {
            shapiroWilk: {
              statistic: 0.95,
              pValue: 0.6,
              isNormal: true,
            }
          }
        }
      }

      expect(resultWithAssumptions.assumptionTests).toBeDefined()
      expect(resultWithAssumptions.assumptionTests?.normality?.shapiroWilk?.isNormal).toBe(true)
    })

    it('Shapiro-Wilk 결과 구조 검증', () => {
      const shapiroResult = {
        statistic: 0.95,
        pValue: 0.6,
        isNormal: true,
      }

      expect(shapiroResult.statistic).toBeGreaterThan(0)
      expect(shapiroResult.pValue).toBeGreaterThanOrEqual(0)
      expect(shapiroResult.pValue).toBeLessThanOrEqual(1)
      expect(shapiroResult.isNormal).toBe(shapiroResult.pValue >= 0.05)
    })

    it('Levene 결과 구조 검증 (선택적)', () => {
      const leveneResult = {
        statistic: 2.5,
        pValue: 0.08,
        equalVariance: true,
      }

      expect(leveneResult.statistic).toBeGreaterThan(0)
      expect(leveneResult.pValue).toBeGreaterThanOrEqual(0)
      expect(leveneResult.pValue).toBeLessThanOrEqual(1)
      expect(leveneResult.equalVariance).toBe(leveneResult.pValue >= 0.05)
    })
  })

  describe('2. visualizationData 타입 정의', () => {
    it('visualizationData는 optional이어야 함', () => {
      const resultWithoutViz: ValidationResults = {
        isValid: true,
        totalRows: 10,
        columnCount: 1,
        missingValues: 0,
        dataType: '수치형',
        variables: ['score'],
        errors: [],
        warnings: [],
      }

      expect(resultWithoutViz.visualizationData).toBeUndefined()
    })

    it('histogram 데이터 구조 검증', () => {
      const resultWithHistogram: ValidationResults = {
        isValid: true,
        totalRows: 10,
        columnCount: 1,
        missingValues: 0,
        dataType: '수치형',
        variables: ['score'],
        errors: [],
        warnings: [],
        visualizationData: {
          histograms: [
            {
              variable: 'score',
              data: [45, 48, 50, 52, 55],
              bins: 10
            }
          ]
        }
      }

      expect(resultWithHistogram.visualizationData?.histograms).toHaveLength(1)
      expect(resultWithHistogram.visualizationData?.histograms?.[0].variable).toBe('score')
      expect(resultWithHistogram.visualizationData?.histograms?.[0].data.length).toBe(5)
      expect(resultWithHistogram.visualizationData?.histograms?.[0].bins).toBe(10)
    })

    it('boxPlot 데이터 구조 검증', () => {
      const resultWithBoxPlot: ValidationResults = {
        isValid: true,
        totalRows: 10,
        columnCount: 1,
        missingValues: 0,
        dataType: '수치형',
        variables: ['score'],
        errors: [],
        warnings: [],
        visualizationData: {
          boxPlots: [
            {
              variable: 'score',
              data: [45, 48, 50, 52, 55],
              outliers: [100]
            }
          ]
        }
      }

      expect(resultWithBoxPlot.visualizationData?.boxPlots).toHaveLength(1)
      expect(resultWithBoxPlot.visualizationData?.boxPlots?.[0].variable).toBe('score')
      expect(resultWithBoxPlot.visualizationData?.boxPlots?.[0].outliers).toEqual([100])
    })
  })

  describe('3. StatisticalAssumptions 타입', () => {
    it('정규성 검정만 있을 때', () => {
      const assumptions: StatisticalAssumptions = {
        normality: {
          shapiroWilk: {
            statistic: 0.95,
            pValue: 0.6,
            isNormal: true,
          }
        }
      }

      expect(assumptions.normality).toBeDefined()
      expect(assumptions.homogeneity).toBeUndefined()
    })

    it('정규성 + 등분산성 검정', () => {
      const assumptions: StatisticalAssumptions = {
        normality: {
          shapiroWilk: {
            statistic: 0.95,
            pValue: 0.6,
            isNormal: true,
          }
        },
        homogeneity: {
          levene: {
            statistic: 2.5,
            pValue: 0.08,
            equalVariance: true,
          }
        }
      }

      expect(assumptions.normality).toBeDefined()
      expect(assumptions.homogeneity).toBeDefined()
    })

    it('그룹별 정규성 검정', () => {
      const assumptions: StatisticalAssumptions = {
        normality: {
          group1: {
            statistic: 0.95,
            pValue: 0.6,
            isNormal: true,
          },
          group2: {
            statistic: 0.92,
            pValue: 0.3,
            isNormal: true,
          }
        }
      }

      expect(assumptions.normality?.group1).toBeDefined()
      expect(assumptions.normality?.group2).toBeDefined()
    })
  })

  describe('4. 경고 메시지 검증', () => {
    it('비정규분포 경고 메시지 포함', () => {
      const result: ValidationResults = {
        isValid: true,
        totalRows: 5,
        columnCount: 1,
        missingValues: 0,
        dataType: '수치형',
        variables: ['value'],
        errors: [],
        warnings: [
          '⚠️ 정규성 검정: \'value\' 변수가 정규분포를 따르지 않을 수 있습니다 (p < 0.05).'
        ],
        assumptionTests: {
          normality: {
            shapiroWilk: {
              statistic: 0.75,
              pValue: 0.02,
              isNormal: false,
            }
          }
        }
      }

      expect(result.warnings.length).toBeGreaterThan(0)
      expect(result.warnings[0]).toContain('정규성 검정')
      expect(result.warnings[0]).toContain('value')
      expect(result.assumptionTests?.normality?.shapiroWilk?.isNormal).toBe(false)
    })

    it('여러 변수 비정규분포 경고', () => {
      const warnings = [
        '⚠️ 정규성 검정: \'col1, col2\' 변수가 정규분포를 따르지 않을 수 있습니다 (p < 0.05).'
      ]

      expect(warnings[0]).toContain('col1')
      expect(warnings[0]).toContain('col2')
    })
  })

  describe('5. p-value 해석 로직', () => {
    it('p >= 0.05: 정규분포', () => {
      const pValues = [0.05, 0.1, 0.5, 0.9, 1.0]

      pValues.forEach(pValue => {
        expect(pValue >= 0.05).toBe(true)
      })
    })

    it('p < 0.05: 비정규분포', () => {
      const pValues = [0.0, 0.01, 0.03, 0.049]

      pValues.forEach(pValue => {
        expect(pValue < 0.05).toBe(true)
      })
    })

    it('경계값: p = 0.05', () => {
      const pValue = 0.05
      const isNormal = pValue >= 0.05

      expect(isNormal).toBe(true) // 0.05는 정규분포로 판단
    })
  })
})
