/**
 * analysis-adapter 단위 테스트
 *
 * 검증 범위:
 * 1. buildKmCurveColumns — 단일 그룹: 컬럼 구조, isCensored=0 행
 * 2. buildKmCurveColumns — 중도절단: isCensored=1 행 추가, 생존율 조회
 * 3. buildKmCurveColumns — 다중 그룹: colorField='group', group 컬럼 포함
 * 4. buildKmCurveColumns — __logRankP: row 0에만 값, 나머지 null
 * 5. buildKmCurveColumns — 빈 censored: 이벤트 행만 생성
 * 6. buildRocCurveColumns — fpr/tpr 배열, __auc/__aucLo/__aucHi row 0
 * 7. buildRocCurveColumns — aucCI null 처리
 * 8. toAnalysisContext — method/pValue 매핑
 * 9. toAnalysisContext — groupStats 변환 (se 자동 계산)
 * 10. toAnalysisContext — postHoc → comparisons + comparisonMeta
 */

import { describe, it, expect } from 'vitest'
import {
  buildKmCurveColumns,
  buildRocCurveColumns,
  toAnalysisContext,
} from '@/lib/graph-studio/analysis-adapter'
import type {
  KaplanMeierAnalysisResult,
  RocCurveAnalysisResult,
} from '@/lib/generated/method-types.generated'
import type { AnalysisResult as SmartFlowResult } from '@/types/smart-flow'

// ─── KM 픽스처 ───────────────────────────────────────────────

function makeKmData(overrides: Partial<KaplanMeierAnalysisResult> = {}): KaplanMeierAnalysisResult {
  return {
    curves: {
      all: {
        time: [0, 5, 10, 20],
        survival: [1.0, 0.8, 0.6, 0.4],
        ciLo: [1.0, 0.6, 0.38, 0.2],
        ciHi: [1.0, 0.93, 0.79, 0.63],
        atRisk: [10, 8, 6, 4],
        medianSurvival: 20,
        censored: [7, 15], // 중도절단 시점
      },
    },
    logRankP: null,
    medianSurvivalTime: 20,
    ...overrides,
  }
}

function makeKmDataMultiGroup(): KaplanMeierAnalysisResult {
  return {
    curves: {
      A: {
        time: [0, 5, 10],
        survival: [1.0, 0.8, 0.6],
        ciLo: [1.0, 0.6, 0.38],
        ciHi: [1.0, 0.93, 0.79],
        atRisk: [5, 4, 3],
        medianSurvival: null,
        censored: [],
      },
      B: {
        time: [0, 5, 10],
        survival: [1.0, 0.5, 0.3],
        ciLo: [1.0, 0.3, 0.1],
        ciHi: [1.0, 0.72, 0.56],
        atRisk: [5, 3, 2],
        medianSurvival: 5,
        censored: [8],
      },
    },
    logRankP: 0.032,
    medianSurvivalTime: 5,
  }
}

// ─── ROC 픽스처 ──────────────────────────────────────────────

function makeRocData(overrides: Partial<RocCurveAnalysisResult> = {}): RocCurveAnalysisResult {
  return {
    rocPoints: [
      { fpr: 0.0, tpr: 0.0 },
      { fpr: 0.1, tpr: 0.6 },
      { fpr: 0.2, tpr: 0.75 },
      { fpr: 1.0, tpr: 1.0 },
    ],
    auc: 0.85,
    aucCI: { lower: 0.78, upper: 0.92 },
    optimalThreshold: 0.45,
    sensitivity: 0.82,
    specificity: 0.78,
    ...overrides,
  }
}

// ─── buildKmCurveColumns — 단일 그룹 ─────────────────────────

describe('buildKmCurveColumns — 단일 그룹', () => {
  const kmData = makeKmData()
  const result = buildKmCurveColumns(kmData)

  it('xField=time, yField=survival, colorField=undefined', () => {
    expect(result.xField).toBe('time')
    expect(result.yField).toBe('survival')
    expect(result.colorField).toBeUndefined()
  })

  it('data에 time/survival/ciLo/ciHi/isCensored/__logRankP 컬럼이 있다', () => {
    expect(result.data.time).toBeDefined()
    expect(result.data.survival).toBeDefined()
    expect(result.data.ciLo).toBeDefined()
    expect(result.data.ciHi).toBeDefined()
    expect(result.data.isCensored).toBeDefined()
    expect(result.data.__logRankP).toBeDefined()
  })

  it('group 컬럼은 없다 (단일 그룹)', () => {
    expect(result.data.group).toBeUndefined()
  })

  it('이벤트 시점 행은 isCensored=0이다', () => {
    const isCensored = result.data.isCensored as number[]
    // 이벤트 행(4개) + 중도절단 행(2개) = 6개
    const eventRows = isCensored.filter(v => v === 0)
    expect(eventRows).toHaveLength(4)
  })

  it('columns 배열에 isCensored가 포함된다', () => {
    const colNames = result.columns.map(c => c.name)
    expect(colNames).toContain('isCensored')
  })
})

// ─── buildKmCurveColumns — 중도절단 행 ────────────────────────

describe('buildKmCurveColumns — 중도절단 행 (isCensored=1)', () => {
  const kmData = makeKmData()
  const result = buildKmCurveColumns(kmData)
  const isCensored = result.data.isCensored as number[]
  const times = result.data.time as number[]
  const survival = result.data.survival as number[]

  it('중도절단 행이 isCensored=1로 추가된다 (2개)', () => {
    const censoredRows = isCensored.filter(v => v === 1)
    expect(censoredRows).toHaveLength(2)
  })

  it('중도절단 시점 t=7이 time 배열에 포함된다', () => {
    const censoredIndices = isCensored.map((v, i) => v === 1 ? i : -1).filter(i => i !== -1)
    const censoredTimes = censoredIndices.map(i => times[i])
    expect(censoredTimes).toContain(7)
  })

  it('t=7 중도절단 행의 생존율은 t=5 이후 step 함수 값(0.8)이다', () => {
    const t7Idx = times.findIndex((t, i) => t === 7 && isCensored[i] === 1)
    expect(t7Idx).toBeGreaterThanOrEqual(0)
    expect(survival[t7Idx]).toBeCloseTo(0.8)
  })

  it('t=15 중도절단 행의 생존율은 t=10 이후 step 함수 값(0.6)이다', () => {
    const t15Idx = times.findIndex((t, i) => t === 15 && isCensored[i] === 1)
    expect(t15Idx).toBeGreaterThanOrEqual(0)
    expect(survival[t15Idx]).toBeCloseTo(0.6)
  })

  it('전체 행 수 = 이벤트 시점(4) + 중도절단(2) = 6', () => {
    expect(times).toHaveLength(6)
  })
})

// ─── buildKmCurveColumns — 다중 그룹 ─────────────────────────

describe('buildKmCurveColumns — 다중 그룹', () => {
  const kmData = makeKmDataMultiGroup()
  const result = buildKmCurveColumns(kmData)

  it('colorField=group (다중 그룹)', () => {
    expect(result.colorField).toBe('group')
  })

  it('data에 group 컬럼이 있다', () => {
    expect(result.data.group).toBeDefined()
  })

  it('group 컬럼에 A, B 값이 모두 포함된다', () => {
    const groups = new Set(result.data.group as string[])
    expect(groups.has('A')).toBe(true)
    expect(groups.has('B')).toBe(true)
  })

  it('B 그룹 중도절단(t=8) 행의 isCensored=1', () => {
    const times = result.data.time as number[]
    const isCensored = result.data.isCensored as number[]
    const groups = result.data.group as string[]
    const bCensoredIdx = times.findIndex(
      (t, i) => t === 8 && groups[i] === 'B' && isCensored[i] === 1
    )
    expect(bCensoredIdx).toBeGreaterThanOrEqual(0)
  })
})

// ─── buildKmCurveColumns — __logRankP ─────────────────────────

describe('buildKmCurveColumns — __logRankP', () => {
  it('logRankP가 null이 아니면 row 0에만 값이 들어간다', () => {
    const kmData = makeKmDataMultiGroup() // logRankP: 0.032
    const result = buildKmCurveColumns(kmData)
    const logRankArr = result.data.__logRankP as (number | null)[]
    expect(logRankArr[0]).toBeCloseTo(0.032)
    // 나머지는 null
    expect(logRankArr.slice(1).every(v => v === null)).toBe(true)
  })

  it('logRankP가 null이면 __logRankP 배열 전체가 null이다', () => {
    const kmData = makeKmData({ logRankP: null })
    const result = buildKmCurveColumns(kmData)
    const logRankArr = result.data.__logRankP as (number | null)[]
    expect(logRankArr.every(v => v === null)).toBe(true)
  })
})

// ─── buildKmCurveColumns — 빈 censored ───────────────────────

describe('buildKmCurveColumns — censored가 빈 배열', () => {
  it('censored=[]이면 이벤트 행만 생성된다', () => {
    const kmData = makeKmData()
    kmData.curves.all.censored = []
    const result = buildKmCurveColumns(kmData)
    const isCensored = result.data.isCensored as number[]
    expect(isCensored.every(v => v === 0)).toBe(true)
    expect(result.data.time).toHaveLength(4) // 이벤트 시점만
  })
})

// ─── buildRocCurveColumns ─────────────────────────────────────

describe('buildRocCurveColumns — 기본', () => {
  const rocData = makeRocData()
  const result = buildRocCurveColumns(rocData)

  it('xField=fpr, yField=tpr, colorField=undefined', () => {
    expect(result.xField).toBe('fpr')
    expect(result.yField).toBe('tpr')
    expect(result.colorField).toBeUndefined()
  })

  it('fpr/tpr 배열 길이가 rocPoints 수와 일치한다', () => {
    expect((result.data.fpr as number[]).length).toBe(4)
    expect((result.data.tpr as number[]).length).toBe(4)
  })

  it('__auc는 row 0에만 값, 나머지 null', () => {
    const aucArr = result.data.__auc as (number | null)[]
    expect(aucArr[0]).toBeCloseTo(0.85)
    expect(aucArr.slice(1).every(v => v === null)).toBe(true)
  })

  it('__aucLo/Hi는 row 0에 CI 값, 나머지 null', () => {
    const aucLoArr = result.data.__aucLo as (number | null)[]
    const aucHiArr = result.data.__aucHi as (number | null)[]
    expect(aucLoArr[0]).toBeCloseTo(0.78)
    expect(aucHiArr[0]).toBeCloseTo(0.92)
    expect(aucLoArr.slice(1).every(v => v === null)).toBe(true)
  })

  it('columns에 fpr/tpr/__auc/__aucLo/__aucHi가 모두 포함된다', () => {
    const colNames = result.columns.map(c => c.name)
    expect(colNames).toContain('fpr')
    expect(colNames).toContain('tpr')
    expect(colNames).toContain('__auc')
    expect(colNames).toContain('__aucLo')
    expect(colNames).toContain('__aucHi')
  })
})

describe('buildRocCurveColumns — aucCI 없음', () => {
  it('aucCI가 null/undefined여도 __aucLo/__aucHi는 null 배열이 된다', () => {
    const rocData = makeRocData({ aucCI: undefined as unknown as { lower: number; upper: number } })
    const result = buildRocCurveColumns(rocData)
    const aucLoArr = result.data.__aucLo as (number | null)[]
    const aucHiArr = result.data.__aucHi as (number | null)[]
    expect(aucLoArr[0]).toBeNull()
    expect(aucHiArr[0]).toBeNull()
  })
})

// ─── toAnalysisContext ────────────────────────────────────────

function makeSmartFlowResult(overrides: Partial<SmartFlowResult> = {}): SmartFlowResult {
  return {
    method: 'one-way-anova',
    pValue: 0.012,
    statistic: 5.32,
    df: [2, 27],
    effectSize: { type: 'eta-squared', value: 0.28, interpretation: '큰 효과' },
    groupStats: [
      { name: 'A', mean: 10, std: 2, n: 10 },
      { name: 'B', mean: 14, std: 3, n: 10 },
      { name: 'C', mean: 12, std: 2.5, n: 10 },
    ],
    postHoc: [
      { group1: 'A', group2: 'B', pvalue: 0.08, pvalueAdjusted: 0.04, significant: true, meanDiff: -4 },
      { group1: 'A', group2: 'C', pvalue: 0.15, pvalueAdjusted: 0.09, significant: false, meanDiff: -2 },
      { group1: 'B', group2: 'C', pvalue: 0.12, pvalueAdjusted: 0.07, significant: false, meanDiff: 2 },
    ],
    postHocMethod: 'games-howell',
    interpretation: '그룹 간 유의한 차이 있음',
    ...overrides,
  }
}

describe('toAnalysisContext — 기본 매핑', () => {
  const result = makeSmartFlowResult()
  const ctx = toAnalysisContext(result)

  it('method와 pValue가 전달된다', () => {
    expect(ctx.method).toBe('one-way-anova')
    expect(ctx.pValue).toBeCloseTo(0.012)
  })

  it('testInfo.statistic, df, effectSize가 매핑된다', () => {
    expect(ctx.testInfo?.statistic).toBeCloseTo(5.32)
    expect(ctx.testInfo?.df).toEqual([2, 27])
    expect(ctx.testInfo?.effectSize).toBeCloseTo(0.28)
    expect(ctx.testInfo?.effectSizeType).toBe('eta-squared')
  })
})

describe('toAnalysisContext — groupStats', () => {
  const result = makeSmartFlowResult()
  const ctx = toAnalysisContext(result)

  it('groupStats가 3개 변환된다', () => {
    expect(ctx.groupStats).toHaveLength(3)
  })

  it('se가 std / sqrt(n)으로 자동 계산된다', () => {
    const gsA = ctx.groupStats?.find(g => g.name === 'A')
    expect(gsA?.se).toBeCloseTo(2 / Math.sqrt(10))
  })
})

describe('toAnalysisContext — comparisons + comparisonMeta', () => {
  const result = makeSmartFlowResult()
  const ctx = toAnalysisContext(result)

  it('postHoc 3개가 comparisons로 변환된다', () => {
    expect(ctx.comparisons).toHaveLength(3)
  })

  it('pvalueAdjusted가 우선 사용된다', () => {
    const ab = ctx.comparisons?.find(c => c.group1 === 'A' && c.group2 === 'B')
    expect(ab?.pValue).toBeCloseTo(0.04)
  })

  it('significant 플래그가 전달된다', () => {
    const ab = ctx.comparisons?.find(c => c.group1 === 'A' && c.group2 === 'B')
    expect(ab?.significant).toBe(true)
  })

  it('meanDiff가 전달된다', () => {
    const ab = ctx.comparisons?.find(c => c.group1 === 'A' && c.group2 === 'B')
    expect(ab?.meanDiff).toBeCloseTo(-4)
  })

  it('comparisonMeta.adjustmentMethod = postHocMethod', () => {
    expect(ctx.comparisonMeta?.adjustmentMethod).toBe('games-howell')
  })

  it('allPairsIncluded: k=3, C(3,2)=3 비교 → true', () => {
    expect(ctx.comparisonMeta?.allPairsIncluded).toBe(true)
  })

  it('postHoc 없으면 comparisons/comparisonMeta가 undefined이다', () => {
    const result = makeSmartFlowResult({ postHoc: undefined, postHocMethod: undefined })
    const ctx = toAnalysisContext(result)
    expect(ctx.comparisons).toBeUndefined()
    expect(ctx.comparisonMeta).toBeUndefined()
  })
})

describe('toAnalysisContext — group ID 정수 인덱스 → 라벨 변환 (C-2)', () => {
  it('group1이 정수이면 groupStats.name으로 매핑된다', () => {
    const result = makeSmartFlowResult({
      postHoc: [
        { group1: 0, group2: 1, pvalue: 0.03, significant: true },
      ],
    })
    const ctx = toAnalysisContext(result)
    expect(ctx.comparisons?.[0].group1).toBe('A')
    expect(ctx.comparisons?.[0].group2).toBe('B')
  })

  it('groupNames 파라미터로 명시적 매핑이 가능하다', () => {
    const result = makeSmartFlowResult({
      postHoc: [
        { group1: 0, group2: 2, pvalue: 0.05, significant: true },
      ],
    })
    const ctx = toAnalysisContext(result, ['X', 'Y', 'Z'])
    expect(ctx.comparisons?.[0].group1).toBe('X')
    expect(ctx.comparisons?.[0].group2).toBe('Z')
  })
})
