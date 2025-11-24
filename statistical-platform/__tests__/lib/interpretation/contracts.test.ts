/**
 * Contract Tests for Interpretation Engine
 *
 * 목적: 입출력 스키마 검증 + 경계값 테스트
 * - Phase 2 of Test Automation Roadmap
 * - Runtime validation using Zod schemas
 */

import { describe, it, expect } from '@jest/globals'
import { getInterpretation } from '@/lib/interpretation/engine'
import {
  AnalysisResultSchema,
  InterpretationResultSchema,
  validateAnalysisResult,
  validateInterpretationResult,
  isSafeAnalysisResult,
  isSafeInterpretationResult
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
          pValue: 0.05
        })
      }).toThrow()
    })

    it('statistic이 Infinity이면 에러', () => {
      expect(() => {
        AnalysisResultSchema.parse({
          method: 't-test',
          statistic: Infinity,  // ❌ Infinity
          pValue: 0.05
        })
      }).toThrow()
    })

    it('effectSize.value가 NaN이면 에러', () => {
      expect(() => {
        AnalysisResultSchema.parse({
          method: 't-test',
          statistic: 2.5,
          pValue: 0.05,
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
          pValue: 0.05
        })
      }).toThrow()
    })
  })

  describe('입력 데이터 정상 케이스', () => {
    it('최소 필수 필드만 있어도 통과', () => {
      expect(() => {
        AnalysisResultSchema.parse({
          method: 't-test',
          statistic: 2.5,
          pValue: 0.05
        })
      }).not.toThrow()
    })

    it('모든 필드가 있어도 통과', () => {
      expect(() => {
        AnalysisResultSchema.parse({
          method: 'Independent t-test',
          statistic: 2.5,
          pValue: 0.05,
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
        df: [2, 57],
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
        coefficients: [
          { variable: 'Intercept', value: 10.5 },
          { variable: 'X1', value: 2.3 }
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
        pValue: 0.05
      } as AnalysisResult)

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
        pValue: 0.05
      }

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
          pValue: 0.05
        })
      }).toThrow()
    })
  })

  describe('isSafeAnalysisResult', () => {
    it('유효한 데이터는 true 반환', () => {
      const data = {
        method: 't-test',
        statistic: 2.5,
        pValue: 0.05
      }

      expect(isSafeAnalysisResult(data)).toBe(true)
    })

    it('잘못된 데이터는 false 반환 (에러 발생 X)', () => {
      const data = {
        method: 't-test',
        statistic: NaN,  // ❌
        pValue: 0.05
      }

      expect(isSafeAnalysisResult(data)).toBe(false)
    })
  })
})
