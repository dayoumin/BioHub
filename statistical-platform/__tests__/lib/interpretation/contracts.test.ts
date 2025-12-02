/**
 * Contract Tests for Interpretation Engine
 *
 * 목적: 입출력 스키마 검증 + 경계값 테스트
 * - Phase 2 of Test Automation Roadmap
 * - Runtime validation using Zod schemas
 */

import { describe, it } from '@jest/globals'
import { getInterpretation } from '@/lib/interpretation/engine'
import {
  AnalysisResultSchema,
  InterpretationResultSchema,
  validateAnalysisResult,
  validateInterpretationResult,
  isSafeAnalysisResult,
  isSafeInterpretationResult,
  AdditionalRegressionSchema,
  AdditionalANOVASchema,
  AdditionalPowerSchema,
  AdditionalClusterSchema,
  AdditionalReliabilitySchema
} from '@/lib/interpretation/schemas'
import type { AnalysisResult } from '@/types/smart-flow'

describe('Contract Tests: Input Validation', () => {
  describe('입력 데이터 경계값 검증', () => {
    it('p-value가 0~1 범위를 벗어나면 에러', () => {
      expect(() => {
        AnalysisResultSchema.parse({
          method: 't-test',
          statistic: 2.5,
          pValue: 1.5  // ❌ 범위 벗어남
        })
      }).toThrow()

      expect(() => {
        AnalysisResultSchema.parse({
          method: 't-test',
          statistic: 2.5,
          pValue: -0.1  // ❌ 음수
        })
      }).toThrow()
    })

    it('p-value가 정확히 0 또는 1이면 통과', () => {
      expect(() => {
        AnalysisResultSchema.parse({
          method: 't-test',
          statistic: 2.5,
          pValue: 0  // ✅ 경계값
        })
      }).not.toThrow()

      expect(() => {
        AnalysisResultSchema.parse({
          method: 't-test',
          statistic: 2.5,
          pValue: 1  // ✅ 경계값
        })
      }).not.toThrow()
    })

    it('statistic이 NaN이면 에러', () => {
      expect(() => {
        AnalysisResultSchema.parse({
          method: 't-test',
          statistic: NaN,  // ❌ NaN
          pValue: 0.05,
      interpretation: 'Test interpretation'})
      }).toThrow()
    })

    it('statistic이 Infinity이면 에러', () => {
      expect(() => {
        AnalysisResultSchema.parse({
          method: 't-test',
          statistic: Infinity,  // ❌ Infinity
          pValue: 0.05,
      interpretation: 'Test interpretation'})
      }).toThrow()
    })

    it('effectSize.value가 NaN이면 에러', () => {
      expect(() => {
        AnalysisResultSchema.parse({
          method: 't-test',
          statistic: 2.5,
          pValue: 0.05,
      interpretation: 'Test interpretation',
      effectSize: { value: NaN, type: "Cohen's d" }  // ❌ NaN
        })
      }).toThrow()
    })

    it('groupStats의 mean이 Infinity이면 에러', () => {
      expect(() => {
        AnalysisResultSchema.parse({
          method: 't-test',
          statistic: 2.5,
          pValue: 0.05,
      interpretation: 'Test interpretation',
      groupStats: [
            { mean: Infinity, std: 10, n: 30 }  // ❌ Infinity
          ]
        })
      }).toThrow()
    })

    it('groupStats의 std가 음수이면 에러', () => {
      expect(() => {
        AnalysisResultSchema.parse({
          method: 't-test',
          statistic: 2.5,
          pValue: 0.05,
      interpretation: 'Test interpretation',
      groupStats: [
            { mean: 50, std: -10, n: 30 }  // ❌ 음수
          ]
        })
      }).toThrow()
    })

    it('groupStats의 n이 0 또는 음수이면 에러', () => {
      expect(() => {
        AnalysisResultSchema.parse({
          method: 't-test',
          statistic: 2.5,
          pValue: 0.05,
      interpretation: 'Test interpretation',
      groupStats: [
            { mean: 50, std: 10, n: 0 }  // ❌ 0
          ]
        })
      }).toThrow()

      expect(() => {
        AnalysisResultSchema.parse({
          method: 't-test',
          statistic: 2.5,
          pValue: 0.05,
      interpretation: 'Test interpretation',
      groupStats: [
            { mean: 50, std: 10, n: -5 }  // ❌ 음수
          ]
        })
      }).toThrow()
    })

    it('groupStats의 n이 소수이면 에러', () => {
      expect(() => {
        AnalysisResultSchema.parse({
          method: 't-test',
          statistic: 2.5,
          pValue: 0.05,
      interpretation: 'Test interpretation',
      groupStats: [
            { mean: 50, std: 10, n: 30.5 }  // ❌ 소수
          ]
        })
      }).toThrow()
    })

    it('method가 빈 문자열이면 에러', () => {
      expect(() => {
        AnalysisResultSchema.parse({
          method: '',  // ❌ 빈 문자열
          statistic: 2.5,
          pValue: 0.05,
      interpretation: 'Test interpretation'})
      }).toThrow()
    })
  })

  describe('입력 데이터 정상 케이스', () => {
    it('최소 필수 필드만 있어도 통과', () => {
      expect(() => {
        AnalysisResultSchema.parse({
          method: 't-test',
          statistic: 2.5,
          pValue: 0.05,
      interpretation: 'Test interpretation'})
      }).not.toThrow()
    })

    it('모든 필드가 있어도 통과', () => {
      expect(() => {
        AnalysisResultSchema.parse({
          method: 'Independent t-test',
          statistic: 2.5,
          pValue: 0.05,
      interpretation: 'Test interpretation',
      df: 98,
          effectSize: { value: 0.5, type: "Cohen's d", interpretation: 'medium' },
          groupStats: [
            { name: 'Control', mean: 50, std: 10, n: 50, median: 48 },
            { name: 'Treatment', mean: 55, std: 12, n: 50, median: 53 }
          ],
          coefficients: [
            { variable: 'Intercept', value: 10.5, pValue: 0.001, std: 1.2 },
            { variable: 'X1', value: 2.3, pValue: 0.05, std: 0.8 }
          ],
          additional: { rSquared: 0.75, fStatistic: 15.3 }
        })
      }).not.toThrow()
    })

    it('df가 배열 [df1, df2]여도 통과', () => {
      expect(() => {
        AnalysisResultSchema.parse({
          method: 'ANOVA',
          statistic: 5.3,
          pValue: 0.01,
      interpretation: 'Test interpretation',
      df: [2, 57]  // ✅ ANOVA의 df
        })
      }).not.toThrow()
    })
  })
})

describe('Contract Tests: Output Validation', () => {
  describe('출력 데이터 최소 길이 검증', () => {
    it('title이 5자 미만이면 에러', () => {
      expect(() => {
        InterpretationResultSchema.parse({
          title: 'Test',  // ❌ 4자
          summary: 'This is a summary with more than 10 characters.',
          statistical: 'Statistical interpretation here.',
          practical: null
        })
      }).toThrow()
    })

    it('summary가 10자 미만이면 에러', () => {
      expect(() => {
        InterpretationResultSchema.parse({
          title: 'Test Title',
          summary: 'Short',  // ❌ 5자
          statistical: 'Statistical interpretation here.',
          practical: null
        })
      }).toThrow()
    })

    it('statistical이 10자 미만이면 에러', () => {
      expect(() => {
        InterpretationResultSchema.parse({
          title: 'Test Title',
          summary: 'This is a summary with more than 10 characters.',
          statistical: 'Short',  // ❌ 5자
          practical: null
        })
      }).toThrow()
    })

    it('practical이 5자 미만이면 에러 (null 아닐 때)', () => {
      expect(() => {
        InterpretationResultSchema.parse({
          title: 'Test Title',
          summary: 'This is a summary with more than 10 characters.',
          statistical: 'Statistical interpretation here.',
          practical: 'None'  // ❌ 4자
        })
      }).toThrow()
    })

    it('practical이 null이면 통과', () => {
      expect(() => {
        InterpretationResultSchema.parse({
          title: 'Test Title',
          summary: 'This is a summary with more than 10 characters.',
          statistical: 'Statistical interpretation here.',
          practical: null  // ✅ null 허용
        })
      }).not.toThrow()
    })
  })

  describe('출력 데이터 정상 케이스', () => {
    it('모든 필드가 최소 길이를 만족하면 통과', () => {
      expect(() => {
        InterpretationResultSchema.parse({
          title: 'Group Comparison',
          summary: 'The mean difference between groups is statistically significant.',
          statistical: 'p-value is less than 0.05, indicating significance.',
          practical: 'Large effect size observed (d=0.80).'
        })
      }).not.toThrow()
    })
  })
})

describe('Contract Tests: Integration with getInterpretation', () => {
  describe('실제 해석 엔진 출력 검증', () => {
    it('t-test 결과의 출력이 InterpretationResultSchema를 만족함', () => {
      const result = getInterpretation({
        method: 'Independent t-test',
        statistic: 2.5,
        pValue: 0.05,
      interpretation: 'Test interpretation',
      effectSize: { value: 0.5, type: "Cohen's d" },
        groupStats: [
          { mean: 50, std: 10, n: 50 },
          { mean: 55, std: 12, n: 50 }
        ]
      } as AnalysisResult, '비교')

      // null이 아니어야 함
      expect(result).not.toBeNull()

      // Zod 스키마 검증
      expect(() => {
        InterpretationResultSchema.parse(result)
      }).not.toThrow()

      // 필드 존재 확인
      expect(result!.title.length).toBeGreaterThanOrEqual(5)
      expect(result!.summary.length).toBeGreaterThanOrEqual(10)
      expect(result!.statistical.length).toBeGreaterThanOrEqual(10)
    })

    it('ANOVA 결과의 출력이 스키마를 만족함', () => {
      const result = getInterpretation({
        method: 'One-way ANOVA',
        statistic: 5.3,
        pValue: 0.01,
        interpretation: 'Test interpretation',
        df: 2,
        effectSize: { value: 0.15, type: 'Eta-squared' },
        groupStats: [
          { mean: 50, std: 10, n: 20 },
          { mean: 55, std: 12, n: 20 },
          { mean: 60, std: 11, n: 20 }
        ]
      } as AnalysisResult)

      expect(result).not.toBeNull()
      expect(() => {
        InterpretationResultSchema.parse(result)
      }).not.toThrow()
    })

    it('Correlation 결과의 출력이 스키마를 만족함', () => {
      const result = getInterpretation({
        method: 'Pearson Correlation',
        statistic: 0.75,  // correlation coefficient
        pValue: 0.001,
      interpretation: 'Test interpretation',
      additional: { rSquared: 0.56 }
      } as AnalysisResult, '상관')

      expect(result).not.toBeNull()
      expect(() => {
        InterpretationResultSchema.parse(result)
      }).not.toThrow()
    })

    it('Regression 결과의 출력이 스키마를 만족함', () => {
      const result = getInterpretation({
        method: 'Linear Regression',
        statistic: 15.3,  // F-statistic
        pValue: 0.001,
        interpretation: 'Test interpretation',
        coefficients: [
          { name: 'Intercept', value: 10.5, stdError: 0.5, tValue: 21, pvalue: 0.001 },
          { name: 'X1', value: 2.3, stdError: 0.3, tValue: 7.67, pvalue: 0.001 }
        ],
        additional: { rSquared: 0.75 }
      } as AnalysisResult, '예측')

      expect(result).not.toBeNull()
      expect(() => {
        InterpretationResultSchema.parse(result)
      }).not.toThrow()
    })
  })

  describe('Edge Cases: 해석 엔진이 null 반환 시', () => {
    it('지원하지 않는 method면 null 반환 (에러 아님)', () => {
      const result = getInterpretation({
        method: 'Unknown Method',
        statistic: 2.5,
        pValue: 0.05,
      interpretation: 'Test interpretation'} as AnalysisResult)

      // null은 허용됨 (해석 불가)
      expect(result).toBeNull()
    })

    it('회귀인데 coefficients가 없으면 null 반환', () => {
      const result = getInterpretation({
        method: 'Linear Regression',
        statistic: 15.3,
        pValue: 0.001
        // coefficients 없음
      } as AnalysisResult, '예측')

      expect(result).toBeNull()
    })
  })
})

describe('Contract Tests: Helper Functions', () => {
  describe('validateAnalysisResult', () => {
    it('유효한 데이터는 파싱 성공', () => {
      const data = {
        method: 't-test',
        statistic: 2.5,
        pValue: 0.05,
      interpretation: 'Test interpretation'}

      const validated = validateAnalysisResult(data)
      expect(validated.method).toBe('t-test')
      expect(validated.statistic).toBe(2.5)
      expect(validated.pValue).toBe(0.05)
    })

    it('잘못된 데이터는 ZodError 발생', () => {
      expect(() => {
        validateAnalysisResult({
          method: 't-test',
          statistic: NaN,  // ❌
          pValue: 0.05,
      interpretation: 'Test interpretation'})
      }).toThrow()
    })
  })

  describe('isSafeAnalysisResult', () => {
    it('유효한 데이터는 true 반환', () => {
      const data = {
        method: 't-test',
        statistic: 2.5,
        pValue: 0.05,
      interpretation: 'Test interpretation'}

      expect(isSafeAnalysisResult(data)).toBe(true)
    })

    it('잘못된 데이터는 false 반환 (에러 발생 X)', () => {
      const data = {
        method: 't-test',
        statistic: NaN,  // ❌
        pValue: 0.05,
      interpretation: 'Test interpretation'}

      expect(isSafeAnalysisResult(data)).toBe(false)
    })
  })

  describe('isSafeInterpretationResult (Helper 함수)', () => {
    it('유효한 출력은 true 반환', () => {
      const result = {
        title: 'Test Title Here',
        summary: 'This is a test summary with sufficient length.',
        statistical: 'Statistical significance test result here.',
        practical: 'Practical implications of the result.'
      }

      expect(isSafeInterpretationResult(result)).toBe(true)
    })

    it('practical이 null이어도 true 반환', () => {
      const result = {
        title: 'Test Title',
        summary: 'This is summary',
        statistical: 'Statistical text',
        practical: null  // ✅ nullable
      }

      expect(isSafeInterpretationResult(result)).toBe(true)
    })

    it('title이 너무 짧으면 false 반환', () => {
      const result = {
        title: 'Hi',  // ❌ < 5자
        summary: 'This is summary',
        statistical: 'Statistical text',
        practical: null
      }

      expect(isSafeInterpretationResult(result)).toBe(false)
    })
  })
})

describe('Contract Tests: Additional Fields Validation', () => {
  describe('회귀 분석 additional 필드', () => {
    it('rSquared가 0~1 범위면 통과', () => {
      expect(() => {
        AnalysisResultSchema.parse({
          method: 'Linear Regression',
          statistic: 15.3,
          pValue: 0.001,
      interpretation: 'Test interpretation',
      additional: { rSquared: 0.75 }  // ✅
        })
      }).not.toThrow()
    })

    it('rSquared가 1보다 크면 에러', () => {
      expect(() => {
        AdditionalRegressionSchema.parse({ rSquared: 1.5 })  // ❌ 직접 테스트
      }).toThrow()
    })

    it('rSquared가 NaN이면 에러', () => {
      expect(() => {
        AdditionalRegressionSchema.parse({ rSquared: NaN })  // ❌ 직접 테스트
      }).toThrow()
    })

    it('fStatistic이 음수면 에러', () => {
      expect(() => {
        AdditionalRegressionSchema.parse({ fStatistic: -5 })  // ❌ 직접 테스트
      }).toThrow()
    })
  })

  describe('ANOVA additional 필드', () => {
    it('etaSquared가 0~1 범위면 통과', () => {
      expect(() => {
        AnalysisResultSchema.parse({
          method: 'One-way ANOVA',
          statistic: 5.3,
          pValue: 0.01,
      interpretation: 'Test interpretation',
      additional: { etaSquared: 0.15 }  // ✅
        })
      }).not.toThrow()
    })

    it('omegaSquared가 음수면 에러 (passthrough로 인해 Skip)', () => {
      // Note: passthrough()로 인해 이 테스트는 실제로 통과함
      // 유연성(다양한 통계 지원) vs 엄격성(완벽한 검증) 트레이드오프
      expect(() => {
        AdditionalANOVASchema.parse({ omegaSquared: -0.1 })  // ❌ 직접 스키마 테스트
      }).toThrow()
    })
  })

  describe('검정력 분석 additional 필드', () => {
    it('power가 0~1 범위면 통과', () => {
      expect(() => {
        AnalysisResultSchema.parse({
          method: 'Power Analysis',
          statistic: 0,
          pValue: 1,
      interpretation: 'Test interpretation',
      additional: { power: 0.8, sampleSize: 100 }  // ✅
        })
      }).not.toThrow()
    })

    it('power가 1보다 크면 에러', () => {
      expect(() => {
        AdditionalPowerSchema.parse({ power: 1.2 })  // ❌ 직접 테스트
      }).toThrow()
    })

    it('sampleSize가 소수면 에러 (정수여야 함)', () => {
      expect(() => {
        AdditionalPowerSchema.parse({ sampleSize: 100.5 })  // ❌ 직접 테스트
      }).toThrow()
    })
  })

  describe('군집 분석 additional 필드', () => {
    it('silhouetteScore가 -1~1 범위면 통과', () => {
      expect(() => {
        AnalysisResultSchema.parse({
          method: 'K-Means Clustering',
          statistic: 0,
          pValue: 1,
      interpretation: 'Test interpretation',
      additional: { silhouetteScore: 0.65, nClusters: 3 }  // ✅
        })
      }).not.toThrow()
    })

    it('silhouetteScore가 1보다 크면 에러', () => {
      expect(() => {
        AdditionalClusterSchema.parse({ silhouetteScore: 1.5 })  // ❌ 직접 테스트
      }).toThrow()
    })

    it('nClusters가 0이면 에러 (양수여야 함)', () => {
      expect(() => {
        AdditionalClusterSchema.parse({ nClusters: 0 })  // ❌ 직접 테스트
      }).toThrow()
    })
  })

  describe('신뢰도 분석 additional 필드', () => {
    it('alpha가 0~1 범위면 통과', () => {
      expect(() => {
        AnalysisResultSchema.parse({
          method: "Cronbach's Alpha",
          statistic: 0.85,
          pValue: 0.001,
      interpretation: 'Test interpretation',
      additional: { alpha: 0.85, nItems: 10 }  // ✅
        })
      }).not.toThrow()
    })

    it('alpha가 1보다 크면 에러', () => {
      expect(() => {
        AdditionalReliabilitySchema.parse({ alpha: 1.2 })  // ❌ 직접 테스트
      }).toThrow()
    })
  })

  describe('fallback 제거 검증 (v2.0 - 2025-11-24)', () => {
    it('정의된 스키마 (Regression, ANOVA 등) 내 필드는 passthrough로 허용', () => {
      expect(() => {
        AnalysisResultSchema.parse({
          method: 'Linear Regression',
          statistic: 5.0,
          pValue: 0.05,
      interpretation: 'Test interpretation',
      additional: {
            rSquared: 0.75,       // ✅ AdditionalRegressionSchema
            customField: 'value'  // ✅ passthrough 허용
          }
        })
      }).not.toThrow()
    })

    it('정의되지 않은 스키마의 필드는 Union 매칭 실패 (optional이므로 통과)', () => {
      // additional이 optional이므로, Union 매칭 실패 시 undefined로 처리
      expect(() => {
        AnalysisResultSchema.parse({
          method: 'Custom Unknown Test',
          statistic: 5.0,
          pValue: 0.05,
      interpretation: 'Test interpretation',
      additional: {
            unknownField: 999  // 🟡 Union 매칭 실패, optional로 통과
          }
        })
      }).not.toThrow()
    })

    it('rSquared가 NaN이면 개별 스키마에서 에러 (passthrough 무관)', () => {
      expect(() => {
        AdditionalRegressionSchema.parse({ rSquared: NaN })
      }).toThrow()
    })
  })
})
