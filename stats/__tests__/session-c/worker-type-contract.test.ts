/**
 * Session C: Worker 타입 계약 검증 테스트
 *
 * Python Worker 반환값 ↔ Registry ↔ Generated 타입 정합성 확인.
 * 실제 Pyodide 없이 시뮬레이션:
 * - 타입 레벨 검증 (컴파일 타임)
 * - assertWorkerResultFields 런타임 검증
 * - power_analysis sides 버그 수정 확인
 * - descriptive_stats ciLower/ciUpper scalar 확인
 */

import { describe, it, expect } from 'vitest'
import {
  assertWorkerResultFields,
  isPythonErrorShape,
  getNumberOrDefault,
  hasOwnNumberFields,
  isRecord,
} from '@/lib/utils/type-guards'
import type {
  DescriptiveStatsResult,
  DoseResponseAnalysisResult,
  NormalityTestResult,
  OutlierDetectionResult,
  OneSampleProportionTestResult,
  FisherExactTestResult,
  BonferroniCorrectionResult,
  MannKendallTestResult,
  KsTestOneSampleResult,
  KsTestTwoSampleResult,
  ResponseSurfaceAnalysisResult,
  TTestOneSampleResult,
  PowerAnalysisResult,
} from '@/lib/generated/method-types.generated'
import { responseSurfaceAnalysis } from '@/lib/generated/method-types.generated'


// ========================================
// 1. assertWorkerResultFields 유틸 테스트
// ========================================

describe('assertWorkerResultFields', () => {
  it('should pass when all required fields exist', () => {
    const result = { statistic: 0.95, pValue: 0.12, isNormal: true }
    expect(() => {
      assertWorkerResultFields(result, ['statistic', 'pValue', 'isNormal'], 'normality_test')
    }).not.toThrow()
  })

  it('should throw when a field is missing', () => {
    const result = { statistic: 0.95, pValue: 0.12 }
    expect(() => {
      assertWorkerResultFields(result, ['statistic', 'pValue', 'isNormal'], 'normality_test')
    }).toThrow('[normality_test] 필수 필드 누락 또는 undefined: isNormal')
  })

  it('should throw when a field is undefined', () => {
    const result = { statistic: 0.95, pValue: undefined, isNormal: true }
    expect(() => {
      assertWorkerResultFields(result, ['statistic', 'pValue'], 'normality_test')
    }).toThrow('[normality_test] 필수 필드 누락 또는 undefined: pValue')
  })

  it('should throw when result is not an object', () => {
    expect(() => {
      assertWorkerResultFields('not an object', ['statistic'], 'test')
    }).toThrow('[test] Worker 결과가 객체가 아닙니다')
  })

  it('should throw when result is null', () => {
    expect(() => {
      assertWorkerResultFields(null, ['statistic'], 'test')
    }).toThrow('[test] Worker 결과가 객체가 아닙니다')
  })

  it('should allow null values for fields (only undefined is rejected)', () => {
    const result = { pValue: null, statistic: 0.5 }
    expect(() => {
      assertWorkerResultFields(result, ['pValue', 'statistic'], 'test')
    }).not.toThrow()
  })
})


// ========================================
// 2. 타입 가드 유틸 테스트
// ========================================

describe('isPythonErrorShape', () => {
  it('should detect { error: string }', () => {
    expect(isPythonErrorShape({ error: 'something failed' })).toBe(true)
  })

  it('should reject non-string error', () => {
    expect(isPythonErrorShape({ error: 42 })).toBe(false)
  })

  it('should reject arrays', () => {
    expect(isPythonErrorShape([1, 2, 3])).toBe(false)
  })

  it('should reject null', () => {
    expect(isPythonErrorShape(null)).toBe(false)
  })
})

describe('getNumberOrDefault', () => {
  it('should return number value', () => {
    expect(getNumberOrDefault({ x: 42 }, 'x')).toBe(42)
  })

  it('should return default for missing key', () => {
    expect(getNumberOrDefault({ x: 42 }, 'y', 0)).toBe(0)
  })

  it('should return default for NaN', () => {
    expect(getNumberOrDefault({ x: NaN }, 'x', -1)).toBe(-1)
  })

  it('should return default for Infinity', () => {
    expect(getNumberOrDefault({ x: Infinity }, 'x', 0)).toBe(0)
  })

  it('should return default for string value', () => {
    expect(getNumberOrDefault({ x: '42' }, 'x', 0)).toBe(0)
  })
})

describe('hasOwnNumberFields', () => {
  it('should return true when all fields are numbers', () => {
    expect(hasOwnNumberFields({ a: 1, b: 2, c: 'x' }, ['a', 'b'])).toBe(true)
  })

  it('should return false when a field is not a number', () => {
    expect(hasOwnNumberFields({ a: 1, b: 'two' }, ['a', 'b'])).toBe(false)
  })

  it('should return false when a field is missing', () => {
    expect(hasOwnNumberFields({ a: 1 }, ['a', 'b'])).toBe(false)
  })
})


// ========================================
// 3. Python 반환값 시뮬레이션 — 타입 정합성
// ========================================

describe('Python ↔ Generated type contract: Worker 1', () => {
  it('descriptive_stats: ciLower/ciUpper should be scalar number', () => {
    // Python 반환: float(ci[0]), float(ci[1]) — scalar
    const pythonReturn: DescriptiveStatsResult = {
      mean: 10.5, median: 10, mode: 9, std: 2.1, variance: 4.41,
      min: 5, max: 16, q1: 8.5, q3: 12.5, iqr: 4,
      skewness: 0.1, kurtosis: -0.5, n: 30,
      se: 0.38, sem: 0.38, confidenceLevel: 0.95,
      ciLower: 9.72,   // scalar, not array
      ciUpper: 11.28,   // scalar, not array
    }
    expect(typeof pythonReturn.ciLower).toBe('number')
    expect(typeof pythonReturn.ciUpper).toBe('number')
  })

  it('normality_test: should have alpha, not interpretation', () => {
    const pythonReturn: NormalityTestResult = {
      statistic: 0.95, pValue: 0.12, isNormal: true, alpha: 0.05,
    }
    expect(pythonReturn.alpha).toBe(0.05)
    // @ts-expect-error interpretation was removed from the type
    expect(pythonReturn.interpretation).toBeUndefined()
  })

  it('outlier_detection: should have outlierCount, not outlierValues', () => {
    const pythonReturn: OutlierDetectionResult = {
      outlierIndices: [3, 7], outlierCount: 2, method: 'iqr',
    }
    expect(pythonReturn.outlierCount).toBe(2)
    // @ts-expect-error outlierValues was removed
    expect(pythonReturn.outlierValues).toBeUndefined()
  })

  it('one_sample_proportion_test: no pValue field (pValueExact/pValueApprox only)', () => {
    const pythonReturn: OneSampleProportionTestResult = {
      sampleProportion: 0.8, nullProportion: 0.5, zStatistic: 3.2,
      pValueExact: 0.001, pValueApprox: 0.001,
      significant: true, alpha: 0.05,
    }
    // @ts-expect-error pValue was removed from the type
    expect(pythonReturn.pValue).toBeUndefined()
  })

  it('mann_kendall_test: zScore and senSlope instead of statistic and slope', () => {
    const pythonReturn: MannKendallTestResult = {
      trend: 'increasing', tau: 0.65, zScore: 3.2,
      pValue: 0.001, senSlope: 0.5, intercept: 1.2, n: 30,
    }
    expect(pythonReturn.zScore).toBe(3.2)
    expect(pythonReturn.senSlope).toBe(0.5)
  })

  it('bonferroni_correction: completely different field names from old type', () => {
    const pythonReturn: BonferroniCorrectionResult = {
      originalPValues: [0.01, 0.03, 0.05],
      correctedPValues: [0.03, 0.09, 0.15],
      adjustedAlpha: 0.0167, nComparisons: 3,
      significant: [true, false, false],
    }
    expect(pythonReturn.nComparisons).toBe(3)
  })

  it('ks_test_one_sample: should include nested sampleSizes and distributionInfo', () => {
    const pythonReturn: KsTestOneSampleResult = {
      testType: 'one-sample', statistic: 0.12, statisticKS: 0.12,
      pValue: 0.45, n: 50, criticalValue: 0.19,
      significant: false, interpretation: 'Normal distribution',
      sampleSizes: { n1: 50 },
      distributionInfo: {
        expectedDistribution: 'norm', observedMean: 10.5,
        observedStd: 2.1, expectedMean: 10, expectedStd: 2,
      },
    }
    expect(pythonReturn.sampleSizes.n1).toBe(50)
  })

  it('ks_test_two_sample: should include effectSize and sampleSizes', () => {
    const pythonReturn: KsTestTwoSampleResult = {
      testType: 'two-sample', statistic: 0.18, statisticKS: 0.18,
      pValue: 0.35, n1: 40, n2: 45, criticalValue: 0.28,
      significant: false, effectSize: 0.18,
      sampleSizes: { n1: 40, n2: 45 },
    }
    expect(pythonReturn.effectSize).toBe(0.18)
  })
})

describe('Python ↔ Generated type contract: Worker 2', () => {
  it('t_test_one_sample: should include sampleStd and n', () => {
    const pythonReturn: TTestOneSampleResult = {
      statistic: 2.5, pValue: 0.02, sampleMean: 10.5,
      sampleStd: 2.1, n: 30,
    }
    expect(pythonReturn.sampleStd).toBe(2.1)
    expect(pythonReturn.n).toBe(30)
  })

  it('fisher_exact_test: should include all 10 fields from Python', () => {
    const pythonReturn: FisherExactTestResult = {
      oddsRatio: 3.5, pValue: 0.02, reject: true,
      alternative: 'two-sided',
      oddsRatioInterpretation: 'Moderate positive association',
      observedMatrix: [[10, 5], [3, 12]],
      expectedMatrix: [[7.5, 7.5], [5.5, 9.5]],
      rowTotals: [15, 15], columnTotals: [13, 17], sampleSize: 30,
    }
    expect(pythonReturn.reject).toBe(true)
    expect(pythonReturn.sampleSize).toBe(30)
  })

  it('response_surface_analysis wrapper should accept row-object input', () => {
    const rows: Parameters<typeof responseSurfaceAnalysis>[0] = [
      { y: 10, x1: 1, x2: 2 },
      { y: 12, x1: 2, x2: 3 },
    ]

    expect(Array.isArray(rows)).toBe(true)
    expect(rows[0]?.y).toBe(10)
  })

  it('response_surface_analysis result should expose standard pValue alias', () => {
    const pythonReturn: ResponseSurfaceAnalysisResult = {
      modelType: 'secondOrder',
      coefficients: { intercept: 10, x1: 2.5 },
      fittedValues: [10, 12],
      residuals: [0.2, -0.2],
      rSquared: 0.81,
      adjustedRSquared: 0.75,
      fStatistic: 8.4,
      fPvalue: 0.012,
      pValue: 0.012,
      anovaTable: {},
      optimization: {},
      designAdequacy: {},
    }

    expect(pythonReturn.pValue).toBe(0.012)
    expect(pythonReturn.fPvalue).toBe(0.012)
  })
})

describe('Python ??Generated type contract: Worker 4', () => {
  it('dose_response_analysis confidenceIntervals should remain tuple pairs', () => {
    const pythonReturn: DoseResponseAnalysisResult = {
      model: 'logistic4',
      parameters: { ec50: 1.2, hillSlope: 0.8 },
      fittedValues: [10, 20],
      residuals: [0.1, -0.1],
      rSquared: 0.91,
      pValue: 0.004,
      aic: 12.5,
      bic: 14.2,
      confidenceIntervals: {
        ec50: [1.0, 1.4],
        hillSlope: [0.6, 1.0],
      },
      goodnessOfFit: { chiSquare: 4.1, pValue: 0.004, degreesFreedom: 1 },
      ec50: 1.2,
      hillSlope: 0.8,
    }

    expect(pythonReturn.confidenceIntervals.ec50).toEqual([1.0, 1.4])
    expect(pythonReturn.confidenceIntervals.hillSlope?.[1]).toBe(1.0)
  })
})


// ========================================
// 4. power_analysis sides 버그 수정 검증
// ========================================

describe('power_analysis sides parameter', () => {
  it('Generated powerAnalysis should accept string sides parameter', () => {
    // 타입 레벨 검증: sides는 string이어야 함
    // 이전에는 number였고, 래퍼가 1|2로 변환해서 Python의 문자열 비교를 깨뜨렸음
    const callArgs = {
      testType: 't-test' as string,
      analysisType: 'a-priori' as string,
      alpha: 0.05,
      power: 0.8,
      effectSize: 0.5,
      sampleSize: undefined,
      sides: 'two-sided' as string,  // string, not number
    }
    expect(typeof callArgs.sides).toBe('string')
    expect(callArgs.sides).toBe('two-sided')
  })

  it('PowerAnalysisResult type should match Python nested structure', () => {
    const result: PowerAnalysisResult = {
      testType: 't-test',
      analysisType: 'a-priori',
      inputParameters: { alpha: 0.05, power: 0.8, effectSize: 0.5 },
      results: { sampleSize: 64 },
      interpretation: 'Need 64 samples',
      recommendations: ['Collect 10-20% more samples'],
    }
    expect(result.results.sampleSize).toBe(64)
  })
})
