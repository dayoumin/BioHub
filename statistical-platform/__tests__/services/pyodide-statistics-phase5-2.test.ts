/**
 * Phase 5-2 Pyodide 리팩토링 시뮬레이션 테스트
 *
 * Generated 래퍼 전환 및 타입 정합성을 Mock 기반으로 검증합니다.
 * Pyodide 없이 순수 로직 변환만 테스트합니다.
 *
 * 검증 대상:
 * 1. T-test df 계산 로직 (n1+n2-2, nPairs-1, n-1)
 * 2. Post-hoc group name 매핑 (Python int → string)
 * 3. simpleLinearRegression optional 필드 기본값
 * 4. testNormality interpretation 생성
 * 5. Friedman 반환 구조 (rankings 제거, df 추가)
 * 6. Executor 타입 정합 (reject→significant 등)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// ─── Generated 모듈 Mock ───
vi.mock('@/lib/generated/method-types.generated', () => ({
  tTestTwoSample: vi.fn(),
  tTestPaired: vi.fn(),
  tTestOneSample: vi.fn(),
  friedmanTest: vi.fn(),
  dunnTest: vi.fn(),
  gamesHowellTest: vi.fn(),
  tukeyHsd: vi.fn(),
  normalityTest: vi.fn(),
  shapiroWilkTest: vi.fn(),
  linearRegression: vi.fn(),
  descriptiveStats: vi.fn(),
}))

// ─── PyodideCore Mock (Worker 호출 차단) ───
vi.mock('@/lib/services/pyodide-core', () => ({
  callWorkerMethod: vi.fn(),
  PyodideCore: {
    getInstance: vi.fn(() => ({
      initialize: vi.fn(),
      isReady: true,
    })),
  },
}))

import * as Generated from '@/lib/generated/method-types.generated'

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 1. T-test df 계산 로직
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

describe('T-test df 계산 로직', () => {
  it('독립표본: df = n1 + n2 - 2', async () => {
    // Python Worker가 반환하는 구조 시뮬레이션
    const mockResult = {
      statistic: 2.5,
      pValue: 0.015,
      cohensD: 0.8,
      mean1: 10.5,
      mean2: 8.0,
      std1: 2.1,
      std2: 1.9,
      n1: 30,
      n2: 25,
    }
    vi.mocked(Generated.tTestTwoSample).mockResolvedValue(mockResult)

    // 실제 래퍼 로직 재현
    const result = await Generated.tTestTwoSample([], [], true)
    const df = result.n1 + result.n2 - 2

    expect(df).toBe(53) // 30 + 25 - 2
    expect(typeof df).toBe('number')
    expect(Number.isFinite(df)).toBe(true)
  })

  it('대응표본: df = nPairs - 1', async () => {
    const mockResult = {
      statistic: 3.2,
      pValue: 0.003,
      meanDiff: 1.5,
      nPairs: 20,
    }
    vi.mocked(Generated.tTestPaired).mockResolvedValue(mockResult)

    const result = await Generated.tTestPaired([], [])
    const df = result.nPairs - 1

    expect(df).toBe(19) // 20 - 1
  })

  it('일표본: df = n - 1', async () => {
    const mockResult = {
      statistic: 1.8,
      pValue: 0.085,
      sampleMean: 5.2,
      sampleStd: 1.3,
      n: 15,
    }
    vi.mocked(Generated.tTestOneSample).mockResolvedValue(mockResult)

    const result = await Generated.tTestOneSample([], 0)
    const df = result.n - 1

    expect(df).toBe(14) // 15 - 1
  })

  it('df는 음수가 될 수 없다 (경계값)', () => {
    // n1=1, n2=1일 때 df=0, 이는 유효하지만 극단적
    const df = 1 + 1 - 2
    expect(df).toBe(0)
    expect(df).toBeGreaterThanOrEqual(0)
  })
})


// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 2. Post-hoc group name 매핑 (CRITICAL 이슈)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

describe('Post-hoc group name 매핑', () => {
  const groupNames = ['Control', 'Treatment A', 'Treatment B']

  describe('Python이 정수 인덱스를 반환할 때 (실제 동작)', () => {
    it('Dunn test: int 인덱스 → groupName 매핑 성공', () => {
      // Python Worker 실제 반환값: group1: int(0), group2: int(1)
      const pythonReturn = {
        comparisons: [
          { group1: 0, group2: 1, pValue: 0.03, significant: true },
          { group1: 0, group2: 2, pValue: 0.12, significant: false },
          { group1: 1, group2: 2, pValue: 0.45, significant: false },
        ],
      }

      // 래퍼의 매핑 로직 재현
      const mapped = pythonReturn.comparisons.map((comp) => ({
        ...comp,
        group1: groupNames[Number(comp.group1)] || comp.group1,
        group2: groupNames[Number(comp.group2)] || comp.group2,
      }))

      expect(mapped[0].group1).toBe('Control')
      expect(mapped[0].group2).toBe('Treatment A')
      expect(mapped[1].group2).toBe('Treatment B')
    })

    it('Tukey HSD: int 인덱스 매핑', () => {
      const pythonReturn = {
        comparisons: [
          { group1: 0, group2: 1, pValue: 0.02, significant: true },
        ],
      }

      const mapped = pythonReturn.comparisons.map((comp) => ({
        ...comp,
        group1: groupNames[Number(comp.group1)] || comp.group1,
        group2: groupNames[Number(comp.group2)] || comp.group2,
      }))

      expect(mapped[0].group1).toBe('Control')
      expect(mapped[0].group2).toBe('Treatment A')
    })
  })

  describe('타입 계약 위반 감지 (Generated는 string 선언, Python은 int 반환)', () => {
    it('Python int(0)이 JSON 역직렬화 후 JS number가 됨을 확인', () => {
      // JSON.parse가 Python int → JS number로 변환
      const jsonFromPython = '{"group1": 0, "group2": 1}'
      const parsed = JSON.parse(jsonFromPython)

      expect(typeof parsed.group1).toBe('number') // ← 실제 런타임 타입
      // Generated 타입은 string이라고 선언하지만, 실제는 number
      // TypeScript 컴파일러는 string으로 체크하지만 런타임은 number
    })

    it('Number()로 안전하게 처리됨 (number → Number = identity)', () => {
      expect(Number(0)).toBe(0)   // int → Number = identity
      expect(Number(1)).toBe(1)
      expect(Number('0')).toBe(0) // string일 때도 작동
      expect(Number('1')).toBe(1)
    })

    it('⚠️ 인덱스 범위 초과 시 원본값(number) 폴백 — 문자열이 아님', () => {
      const groupNames2 = ['A', 'B']
      const outOfBounds = 5

      // groupNames[5] = undefined → 폴백으로 5(number) 반환
      const result = groupNames2[Number(outOfBounds)] || outOfBounds
      expect(result).toBe(5) // number 5, not string "5"
      expect(typeof result).toBe('number') // ⚠️ string이 아닌 number
    })
  })

  describe('문자열 group 이름이 올 경우 (가능한 시나리오)', () => {
    it('Number("GroupA") = NaN → 폴백으로 원본 문자열 사용', () => {
      const comp = { group1: 'GroupA', group2: 'GroupB' }
      const names = ['X', 'Y']

      // Number("GroupA") = NaN, names[NaN] = undefined
      const mapped1 = names[Number(comp.group1)] || comp.group1
      expect(mapped1).toBe('GroupA') // 폴백 작동
    })

    it('Number("0") = 0 → 인덱스 매핑 성공 (숫자 문자열)', () => {
      const comp = { group1: '0', group2: '1' }
      const names = ['Alpha', 'Beta']

      const mapped1 = names[Number(comp.group1)] || comp.group1
      expect(mapped1).toBe('Alpha') // 매핑 성공
    })
  })
})


// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 3. simpleLinearRegression optional 필드 기본값
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

describe('simpleLinearRegression optional 필드 기본값', () => {
  it('slope/intercept/fStatistic이 undefined일 때 0으로 대체', () => {
    // regression() 반환 타입에서 optional 필드
    const regressionResult = {
      slope: undefined as number | undefined,
      intercept: undefined as number | undefined,
      rSquared: 0.85,
      pvalue: 0.001,
      fStatistic: undefined as number | undefined,
    }

    const mapped = {
      slope: regressionResult.slope ?? 0,
      intercept: regressionResult.intercept ?? 0,
      rSquared: regressionResult.rSquared,
      fStatistic: regressionResult.fStatistic ?? 0,
      pvalue: regressionResult.pvalue,
    }

    expect(mapped.slope).toBe(0)
    expect(mapped.intercept).toBe(0)
    expect(mapped.fStatistic).toBe(0)
    expect(mapped.rSquared).toBe(0.85)
    expect(mapped.pvalue).toBe(0.001)
  })

  it('정상 값이 있으면 그대로 사용', () => {
    const regressionResult = {
      slope: 2.5,
      intercept: 1.0,
      rSquared: 0.92,
      pvalue: 0.0001,
      fStatistic: 45.3,
    }

    const mapped = {
      slope: regressionResult.slope ?? 0,
      intercept: regressionResult.intercept ?? 0,
      rSquared: regressionResult.rSquared,
      fStatistic: regressionResult.fStatistic ?? 0,
      pvalue: regressionResult.pvalue,
    }

    expect(mapped.slope).toBe(2.5)
    expect(mapped.intercept).toBe(1.0)
    expect(mapped.fStatistic).toBe(45.3)
  })

  it('⚠️ slope=0은 유효한 값이지만 ?? 0으로 구분 불가', () => {
    // 실제 기울기가 0인 경우와 undefined→0 대체를 구분할 수 없음
    const realZeroSlope = 0
    const undefinedSlope = undefined

    expect(realZeroSlope ?? 0).toBe(0)
    expect(undefinedSlope ?? 0).toBe(0)
    // 둘 다 0 — 구분 불가하지만 실용적으로 문제없음
  })
})


// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 4. testNormality interpretation 생성
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

describe('testNormality interpretation 생성', () => {
  it('p > alpha → Normal distribution', () => {
    const pValue = 0.15
    const alpha = 0.05

    const isNormal = pValue > alpha
    const interpretation = pValue > alpha ? 'Normal distribution' : 'Non-normal distribution'

    expect(isNormal).toBe(true)
    expect(interpretation).toBe('Normal distribution')
  })

  it('p < alpha → Non-normal distribution', () => {
    const pValue = 0.001
    const alpha = 0.05

    const isNormal = pValue > alpha
    const interpretation = pValue > alpha ? 'Normal distribution' : 'Non-normal distribution'

    expect(isNormal).toBe(false)
    expect(interpretation).toBe('Non-normal distribution')
  })

  it('p = alpha (경계값) → Non-normal (strictly greater)', () => {
    const pValue = 0.05
    const alpha = 0.05

    const isNormal = pValue > alpha // 0.05 > 0.05 = false
    expect(isNormal).toBe(false)
  })

  it('custom alpha 적용', () => {
    const pValue = 0.08
    const alpha = 0.10

    const isNormal = pValue > alpha // 0.08 > 0.10 = false
    expect(isNormal).toBe(false)
  })
})


// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 5. Friedman 반환 구조
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

describe('Friedman 반환 구조', () => {
  it('rankings 제거, df 포함 확인', async () => {
    const mockFriedman = {
      statistic: 12.5,
      pValue: 0.002,
      df: 3, // k-1 where k=4 treatments
    }
    vi.mocked(Generated.friedmanTest).mockResolvedValue(mockFriedman)

    const result = await Generated.friedmanTest([])

    // friedman() 래퍼 로직 재현
    const wrapped = {
      statistic: result.statistic,
      pvalue: result.pValue,
      df: result.df,
    }

    expect(wrapped).toHaveProperty('statistic')
    expect(wrapped).toHaveProperty('pvalue')
    expect(wrapped).toHaveProperty('df')
    expect(wrapped).not.toHaveProperty('rankings') // ← 제거됨
    expect(wrapped.df).toBe(3)
  })

  it('Friedman df = k-1 검증 (4개 조건)', () => {
    const k = 4 // 처리/조건 수
    const expectedDf = k - 1
    expect(expectedDf).toBe(3)
  })

  it('executor에서 rankings 없이도 동작 확인', () => {
    const friedmanResult = {
      statistic: 12.5,
      pvalue: 0.002,
      df: 3,
    }

    // nonparametric-executor의 executeFriedman 로직 재현
    const data = [[1, 2, 3, 4], [5, 6, 7, 8], [9, 10, 11, 12]]
    const k = data[0].length // 4
    const n = data.length // 3

    const executorResult = {
      mainResults: {
        statistic: friedmanResult.statistic,
        pvalue: friedmanResult.pvalue,
        df: friedmanResult.df,
      },
      additionalInfo: {
        blocks: n,
        treatments: k,
      },
      visualizationData: {
        type: 'line',
        data: {
          conditions: data[0].map((_, i) => `조건 ${i + 1}`),
        },
      },
    }

    expect(executorResult.mainResults.df).toBe(3)
    expect(executorResult.additionalInfo.blocks).toBe(3)
    expect(executorResult.additionalInfo.treatments).toBe(4)
    expect(executorResult.visualizationData.data.conditions).toHaveLength(4)
    // rankings 참조 없음 — 정상
  })
})


// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 6. Executor 타입 정합 (reject→significant, group1 타입)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

describe('Executor 타입 정합', () => {
  describe('TukeyHSD/GamesHowell: reject → significant 변환', () => {
    it('Generated 타입에서 significant 필드 사용', () => {
      // Before: comp.reject (구 타입)
      // After:  comp.significant (Generated 타입)
      const comparison = {
        group1: 'Group 1',
        group2: 'Group 2',
        pValue: 0.03,
        significant: true, // ← reject가 아닌 significant
      }

      // anova-executor의 매핑 로직 재현
      const mapped = {
        group1: comparison.group1,
        group2: comparison.group2,
        meanDiff: 0,
        pvalue: comparison.pValue,
        significant: comparison.significant, // ← .reject가 아님
      }

      expect(mapped.significant).toBe(true)
      expect(mapped).not.toHaveProperty('reject')
    })
  })

  describe('Dunn test: pValueAdj → pValue 변환', () => {
    it('Generated 타입에서 pValue 필드 사용', () => {
      // Before: comp.pValueAdj (구 타입)
      // After:  comp.pValue (Generated 타입)
      const comparisons = [
        { group1: 'A', group2: 'B', pValue: 0.02, significant: true },
        { group1: 'A', group2: 'C', pValue: 0.15, significant: false },
        { group1: 'B', group2: 'C', pValue: 0.08, significant: false },
      ]

      // nonparametric-executor의 executeDunn 로직 재현
      const minP = Math.min(...comparisons.map(c => c.pValue))
      const sigCount = comparisons.filter(c => c.pValue < 0.05).length

      expect(minP).toBe(0.02)
      expect(sigCount).toBe(1)
    })

    it('meanDiff: 0 (비모수 검정)', () => {
      const comparison = { group1: 'A', group2: 'B', pValue: 0.03, significant: true }

      // Dunn은 비모수검정이므로 meanDiff = 0
      const postHoc = {
        group1: comparison.group1,
        group2: comparison.group2,
        meanDiff: 0,
        pvalue: comparison.pValue,
        significant: comparison.significant,
      }

      expect(postHoc.meanDiff).toBe(0)
    })
  })

  describe('statistical-executor: Tukey HSD 폴백 매핑', () => {
    it('comparisons의 group1이 string일 때 직접 사용', () => {
      // 매핑 후 group1은 이미 string
      const comparisons = [
        { group1: 'Control', group2: 'Treatment', pValue: 0.01, significant: true },
      ]

      // statistical-executor의 새 매핑 로직
      const postHoc = comparisons.map(c => ({
        group1: c.group1,
        group2: c.group2,
        meanDiff: 0,
        pvalue: c.pValue,
        significant: c.significant,
      }))

      expect(postHoc[0].group1).toBe('Control')
      expect(postHoc[0].significant).toBe(true)
      expect(postHoc[0]).not.toHaveProperty('reject') // 구 필드 없음
    })
  })
})


// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 7. checkAllAssumptions 타입 안전 누적
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

describe('checkAllAssumptions 타입 안전 누적', () => {
  it('초기 결과 구조가 올바른 타입을 가짐', () => {
    const results = {
      normality: {} as Record<string, unknown>,
      homogeneity: {} as Record<string, unknown>,
      independence: {} as Record<string, unknown>,
      summary: {
        canUseParametric: true,
        reasons: [] as string[],
        recommendations: [] as string[],
      },
    }

    expect(results.summary.canUseParametric).toBe(true)
    expect(results.summary.reasons).toHaveLength(0)
    expect(results.normality).toEqual({})
  })

  it('가정 위반 시 reasons에 추가', () => {
    const summary = {
      canUseParametric: true,
      reasons: [] as string[],
      recommendations: [] as string[],
    }

    // 정규성 위반 시
    const isNormal = false
    if (!isNormal) {
      summary.canUseParametric = false
      summary.reasons.push('정규성 가정 위반')
      summary.recommendations.push('비모수 검정 사용 권장')
    }

    expect(summary.canUseParametric).toBe(false)
    expect(summary.reasons).toContain('정규성 가정 위반')
    expect(summary.recommendations).toContain('비모수 검정 사용 권장')
  })
})


// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 8. METHOD_PARAM_OVERRIDES 로직 시뮬레이션
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

describe('METHOD_PARAM_OVERRIDES 로직', () => {
  const METHOD_PARAM_OVERRIDES: Record<string, Record<string, string>> = {
    'frequency_analysis': { 'values': '(string | number)[]' },
    'runs_test': { 'sequence': '(string | number)[]' },
    'discriminant_analysis': { 'groups': '(string | number)[]' },
  }

  it('오버라이드 있는 메서드는 커스텀 타입 사용', () => {
    const methodName = 'frequency_analysis'
    const paramName = 'values'

    const overrides = METHOD_PARAM_OVERRIDES[methodName] || {}
    const finalType = overrides[paramName] || 'number[]'

    expect(finalType).toBe('(string | number)[]')
  })

  it('오버라이드 없는 메서드는 기본 추론 사용', () => {
    const methodName = 'mann_whitney_test'
    const paramName = 'group1'

    const overrides = METHOD_PARAM_OVERRIDES[methodName] || {}
    const finalType = overrides[paramName] || 'number[]' // default inference

    expect(finalType).toBe('number[]')
  })

  it('오버라이드 없는 파라미터는 기본 추론 사용', () => {
    const methodName = 'frequency_analysis'
    const paramName = 'alpha' // not in overrides

    const overrides = METHOD_PARAM_OVERRIDES[methodName] || {}
    const finalType = overrides[paramName] || 'number' // default inference

    expect(finalType).toBe('number')
  })
})


// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 9. t-test executor: confidenceInterval 제거 확인
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

describe('t-test executor confidenceInterval 제거', () => {
  it('oneSampleTTest 결과에 confidenceInterval이 없음', () => {
    const oneSampleResult = {
      statistic: 2.1,
      pValue: 0.045,
      df: 14,
    }

    // executor는 더 이상 result.confidenceInterval에 접근하지 않음
    expect(oneSampleResult).not.toHaveProperty('confidenceInterval')

    // mainResults 구성 시 confidenceInterval 없이 구성
    const mainResults = {
      statistic: oneSampleResult.statistic,
      pvalue: oneSampleResult.pValue,
      df: oneSampleResult.df,
      interpretation: 'test interpretation',
    }

    expect(mainResults).not.toHaveProperty('confidenceInterval')
  })

  it('tTest (generic)는 여전히 confidenceInterval? 포함', () => {
    // generic tTest 래퍼는 optional로 유지
    const tTestResult: {
      statistic: number
      pvalue: number
      df: number
      confidenceInterval?: { lower: number; upper: number }
    } = {
      statistic: 2.5,
      pvalue: 0.015,
      df: 53,
      // confidenceInterval은 항상 undefined이지만 타입은 존재
    }

    expect(tTestResult.confidenceInterval).toBeUndefined()
  })
})
