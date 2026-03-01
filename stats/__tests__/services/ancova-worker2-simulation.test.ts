/**
 * ANCOVA Worker2 전환 (A'-3) 시뮬레이션 테스트
 *
 * 검증 범위:
 * - 변수 매핑 키 호환 (dependent/dependentVar, group/groupVar)
 * - validRows 필터링 + 숫자 정제
 * - Worker2 결과 → AnalysisResult 변환 (postHoc, modelFit, effectSize)
 * - normalizePostHocComparisons() 파싱 (comparison 문자열, adjustedPValue)
 * - 엣지 케이스 (빈 mainEffects, 빈 postHoc, 무효 데이터)
 * - result-transformer 호환 (top-level rSquared/rmse)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { Worker2AncovaResult } from '@/lib/services/pyodide-statistics'

// ─── Mock 설정 (vi.hoisted로 호이스팅) ─────────────────────

const {
  mockAncovaAnalysisWorker,
  mockGamesHowellTest,
  mockLeveneTest,
  mockAnova,
  mockCalculateDescriptiveStats,
  mockTukeyHSD,
} = vi.hoisted(() => ({
  mockAncovaAnalysisWorker: vi.fn(),
  mockGamesHowellTest: vi.fn(),
  mockLeveneTest: vi.fn(),
  mockAnova: vi.fn(),
  mockCalculateDescriptiveStats: vi.fn(),
  mockTukeyHSD: vi.fn(),
}))

vi.mock('@/lib/services/pyodide-statistics', () => ({
  pyodideStats: {
    ancovaAnalysisWorker: mockAncovaAnalysisWorker,
    gamesHowellTest: mockGamesHowellTest,
    leveneTest: mockLeveneTest,
    anova: mockAnova,
    calculateDescriptiveStats: mockCalculateDescriptiveStats,
    tukeyHSD: mockTukeyHSD,
  }
}))

vi.mock('@/lib/services/pyodide/core/pyodide-core.service', () => ({
  PyodideCoreService: {
    getInstance: vi.fn(() => ({
      initialize: vi.fn().mockResolvedValue(undefined),
      isInitialized: vi.fn().mockReturnValue(true),
    })),
  },
}))

import { StatisticalExecutor } from '@/lib/services/statistical-executor'

// ─── 테스트 데이터 ────────────────────────────────────────

const ANCOVA_METHOD = {
  id: 'ancova' as const,
  name: 'ANCOVA',
  category: 'anova' as const,
  description: '공분산분석',
}

/** Worker2 ancova_analysis() 정상 응답 mock */
function makeAncovaResult(overrides?: Partial<Worker2AncovaResult>): Worker2AncovaResult {
  return {
    mainEffects: [{
      factor: 'Treatment',
      statistic: 8.5,
      pValue: 0.003,
      degreesOfFreedom: [2, 27] as [number, number],
      partialEtaSquared: 0.39,
      observedPower: 0.92,
    }],
    covariates: [{
      covariate: 'Baseline',
      statistic: 12.3,
      pValue: 0.001,
      degreesOfFreedom: [1, 27] as [number, number],
      partialEtaSquared: 0.31,
      coefficient: 0.85,
      standardError: 0.24,
    }],
    adjustedMeans: [
      { group: 'Control', adjustedMean: 45.2, standardError: 1.1, ci95Lower: 43.0, ci95Upper: 47.4 },
      { group: 'Drug_A', adjustedMean: 52.8, standardError: 1.1, ci95Lower: 50.6, ci95Upper: 55.0 },
      { group: 'Drug_B', adjustedMean: 58.1, standardError: 1.2, ci95Lower: 55.7, ci95Upper: 60.5 },
    ],
    postHoc: [
      {
        comparison: 'Control vs Drug_A',
        meanDiff: 7.6,
        standardError: 1.3,
        tValue: 5.8,
        pValue: 0.0001,
        adjustedPValue: 0.0003,
        cohensD: 1.1,
        lowerCI: 5.0,
        upperCI: 10.2,
      },
      {
        comparison: 'Control vs Drug_B',
        meanDiff: 12.9,
        standardError: 1.4,
        tValue: 9.2,
        pValue: 0.00001,
        adjustedPValue: 0.00003,
        cohensD: 1.8,
        lowerCI: 10.0,
        upperCI: 15.8,
      },
      {
        comparison: 'Drug_A vs Drug_B',
        meanDiff: 5.3,
        standardError: 1.4,
        tValue: 3.8,
        pValue: 0.001,
        adjustedPValue: 0.003,
        cohensD: 0.72,
        lowerCI: 2.5,
        upperCI: 8.1,
      },
    ],
    assumptions: {
      homogeneityOfSlopes: { assumptionMet: true },
      homogeneityOfVariance: { assumptionMet: true },
      normalityOfResiduals: { assumptionMet: true },
    },
    modelFit: {
      rSquared: 0.68,
      adjustedRSquared: 0.65,
      fStatistic: 24.3,
      fPValue: 0.0001,
      rmse: 2.4,
      residualStandardError: 2.45,
    },
    interpretation: {
      summary: '공변량 통제 후 집단 간 유의한 차이가 있습니다',
    },
    ...overrides,
  }
}

/** 결정적 시드 기반 난수 (재현 가능) */
function seededRandom(seed: number): () => number {
  let s = seed
  return (): number => {
    s = (s * 1103515245 + 12345) & 0x7fffffff
    return (s >>> 16) / 32768
  }
}

/** 30행 ANCOVA 데이터 생성 */
function makeAncovaData(opts?: {
  useDependent?: boolean  // true='dependent' key, false='dependentVar' key
  useGroup?: boolean      // true='group' key, false='groupVar' key
  includeInvalidRows?: boolean
  stringNumbers?: boolean  // 숫자형 문자열 포함
  covariates?: string[]   // 다중 공변량 (기본: ['baseline'])
}): { data: Array<Record<string, unknown>>; variables: Record<string, unknown> } {
  const { useDependent = true, useGroup = true, includeInvalidRows = false, stringNumbers = false, covariates = ['baseline'] } = opts ?? {}

  const rand = seededRandom(42)
  const groups = ['Control', 'Drug_A', 'Drug_B']
  const rows: Array<Record<string, unknown>> = []

  for (let i = 0; i < 30; i++) {
    const groupLabel = groups[i % 3]
    const baseline = 40 + rand() * 20
    const score = baseline + (groupLabel === 'Drug_A' ? 8 : groupLabel === 'Drug_B' ? 13 : 0) + rand() * 5

    const row: Record<string, unknown> = {
      score: stringNumbers && i < 5 ? String(score) : score,
      group: groupLabel,
      baseline: stringNumbers && i < 5 ? String(baseline) : baseline,
    }
    // 다중 공변량 지원
    for (const cov of covariates) {
      if (cov !== 'baseline') {
        row[cov] = 20 + rand() * 10
      }
    }
    rows.push(row)
  }

  // 무효 행 추가 (모두 유효 그룹 필요 — null group은 prepareData에서 별도 그룹 생성)
  if (includeInvalidRows) {
    rows.push({ score: NaN, group: 'Control', baseline: 45 })          // NaN score
    rows.push({ score: 55, group: 'Control', baseline: 'invalid' })    // 비숫자 covariate
    rows.push({ score: 55, group: 'Drug_A', baseline: undefined })     // undefined covariate
    rows.push({ score: 'abc', group: 'Drug_B', baseline: 45 })         // 비숫자 score
  }

  // executeMethod(method, data, variables) — arrays/totalN/missingRemoved는
  // prepareData()가 내부에서 재생성하므로 여기서 반환하지 않음
  const variables: Record<string, unknown> = {
    covariate: covariates.length === 1 ? covariates[0] : covariates,
  }

  if (useDependent) {
    variables.dependent = ['score']
  } else {
    variables.dependentVar = 'score'
  }

  if (useGroup) {
    variables.group = 'group'
  } else {
    variables.groupVar = 'group'
  }

  return { data: rows, variables }
}

// ─── 테스트 ────────────────────────────────────────────────

describe('ANCOVA Worker2 시뮬레이션', () => {
  let executor: StatisticalExecutor

  beforeEach(() => {
    vi.clearAllMocks()
    executor = StatisticalExecutor.getInstance()
  })

  // ─── 1. 정상 경로 ────────────────────────

  describe('1. 정상 실행 경로', () => {
    it('Worker2 호출 후 AnalysisResult 구조가 올바름', async () => {
      const ancovaResult = makeAncovaResult()
      mockAncovaAnalysisWorker.mockResolvedValue(ancovaResult)

      const data = makeAncovaData()
      const result = await executor.executeMethod(ANCOVA_METHOD, data.data, data.variables)

      // Worker2 호출 확인
      expect(mockAncovaAnalysisWorker).toHaveBeenCalledTimes(1)
      const [depVar, factorVars, covVars, rows] = mockAncovaAnalysisWorker.mock.calls[0]
      expect(depVar).toBe('score')
      expect(factorVars).toEqual(['group'])
      expect(covVars).toEqual(['baseline'])
      expect(rows.length).toBeGreaterThan(0)

      // mainResults
      expect(result.mainResults.statistic).toBe(8.5)
      expect(result.mainResults.pvalue).toBe(0.003)
      expect(result.mainResults.significant).toBe(true)
      expect(result.mainResults.df).toEqual([2, 27])
    })

    it('postHoc가 normalizePostHocComparisons()로 정규화됨', async () => {
      mockAncovaAnalysisWorker.mockResolvedValue(makeAncovaResult())

      const data = makeAncovaData()
      const result = await executor.executeMethod(ANCOVA_METHOD, data.data, data.variables)

      const postHoc = result.additionalInfo?.postHoc as unknown as Array<Record<string, unknown>>
      expect(postHoc).toBeDefined()
      expect(postHoc.length).toBe(3)

      // comparison 문자열이 group1/group2로 파싱됨
      expect(postHoc[0].group1).toBe('Control')
      expect(postHoc[0].group2).toBe('Drug_A')

      // adjustedPValue가 pvalueAdjusted로 매핑됨
      expect(postHoc[0].pvalueAdjusted).toBe(0.0003)
      expect(postHoc[0].pvalue).toBe(0.0001)
    })

    it('effectSize (partial-eta-squared)가 올바르게 추출됨', async () => {
      mockAncovaAnalysisWorker.mockResolvedValue(makeAncovaResult())

      const data = makeAncovaData()
      const result = await executor.executeMethod(ANCOVA_METHOD, data.data, data.variables)

      const effectSize = result.additionalInfo?.effectSize as Record<string, unknown>
      expect(effectSize).toBeDefined()
      expect(effectSize.type).toBe('partial-eta-squared')
      expect(effectSize.value).toBe(0.39)
    })

    it('modelFit이 additionalInfo에 포함됨', async () => {
      mockAncovaAnalysisWorker.mockResolvedValue(makeAncovaResult())

      const data = makeAncovaData()
      const result = await executor.executeMethod(ANCOVA_METHOD, data.data, data.variables)

      const modelFit = result.additionalInfo?.modelFit as Record<string, unknown>
      expect(modelFit).toBeDefined()
      expect(modelFit.rSquared).toBe(0.68)
      expect(modelFit.fPValue).toBe(0.0001)
      expect(modelFit.rmse).toBe(2.4)
    })

    it('postHocMethod가 bonferroni로 설정됨', async () => {
      mockAncovaAnalysisWorker.mockResolvedValue(makeAncovaResult())

      const data = makeAncovaData()
      const result = await executor.executeMethod(ANCOVA_METHOD, data.data, data.variables)

      expect(result.additionalInfo?.postHocMethod).toBe('bonferroni')
    })

    it('adjustedMeans가 전달됨', async () => {
      mockAncovaAnalysisWorker.mockResolvedValue(makeAncovaResult())

      const data = makeAncovaData()
      const result = await executor.executeMethod(ANCOVA_METHOD, data.data, data.variables)

      const adjustedMeans = result.additionalInfo?.adjustedMeans as unknown as Array<Record<string, unknown>>
      expect(adjustedMeans).toBeDefined()
      expect(adjustedMeans.length).toBe(3)
      expect(adjustedMeans[0].group).toBe('Control')
      expect(adjustedMeans[0].adjustedMean).toBe(45.2)
    })
  })

  // ─── 2. 변수 매핑 호환 (8H-1) ────────────

  describe('2. 변수 매핑 키 호환 (8H-1)', () => {
    it('dependent + group 키 사용 시 정상 동작', async () => {
      mockAncovaAnalysisWorker.mockResolvedValue(makeAncovaResult())

      const data = makeAncovaData({ useDependent: true, useGroup: true })
      const result = await executor.executeMethod(ANCOVA_METHOD, data.data, data.variables)

      expect(mockAncovaAnalysisWorker).toHaveBeenCalledTimes(1)
      expect(result.mainResults.pvalue).toBe(0.003)
    })

    it('dependentVar + groupVar 키 사용 시 정상 동작 (VariableMapping 원본)', async () => {
      mockAncovaAnalysisWorker.mockResolvedValue(makeAncovaResult())

      const data = makeAncovaData({ useDependent: false, useGroup: false })
      const result = await executor.executeMethod(ANCOVA_METHOD, data.data, data.variables)

      expect(mockAncovaAnalysisWorker).toHaveBeenCalledTimes(1)
      const [depVar] = mockAncovaAnalysisWorker.mock.calls[0]
      expect(depVar).toBe('score')
      expect(result.mainResults.pvalue).toBe(0.003)
    })

    it('dependent(배열) + groupVar 혼합 사용 시 정상 동작', async () => {
      mockAncovaAnalysisWorker.mockResolvedValue(makeAncovaResult())

      const data = makeAncovaData({ useDependent: true, useGroup: false })
      const result = await executor.executeMethod(ANCOVA_METHOD, data.data, data.variables)

      expect(mockAncovaAnalysisWorker).toHaveBeenCalledTimes(1)
      expect(result.mainResults.pvalue).toBe(0.003)
    })
  })

  // ─── 3. 데이터 필터링 + 정제 (8M-1) ─────────

  describe('3. validRows 필터링 + 숫자 정제', () => {
    it('무효 행(NaN, null, undefined)이 필터링됨', async () => {
      mockAncovaAnalysisWorker.mockResolvedValue(makeAncovaResult())

      const data = makeAncovaData({ includeInvalidRows: true })
      await executor.executeMethod(ANCOVA_METHOD, data.data, data.variables)

      const [, , , rows] = mockAncovaAnalysisWorker.mock.calls[0]
      // 30개 유효행만 전달, 4개 무효행 제외
      expect(rows.length).toBe(30)
    })

    it('숫자형 문자열이 Number로 변환됨 (object dtype 방지)', async () => {
      mockAncovaAnalysisWorker.mockResolvedValue(makeAncovaResult())

      const data = makeAncovaData({ stringNumbers: true })
      await executor.executeMethod(ANCOVA_METHOD, data.data, data.variables)

      const [, , , rows] = mockAncovaAnalysisWorker.mock.calls[0]
      // 문자열이었던 필드가 숫자로 변환되어야 함
      for (const row of rows) {
        expect(typeof row.score).toBe('number')
        expect(typeof row.baseline).toBe('number')
      }
    })

    it('모든 행이 무효하면 에러 발생', async () => {
      // byGroup 통과 (유효 score + group) → ANCOVA validRows에서 전부 제거 (covariate 무효)
      const allInvalidData: Array<Record<string, unknown>> = [
        { score: 10, group: 'A', baseline: NaN },
        { score: 20, group: 'A', baseline: NaN },
        { score: 30, group: 'B', baseline: NaN },
        { score: 40, group: 'B', baseline: NaN },
      ]
      const allInvalidVars = { dependent: ['score'], group: 'group', covariate: 'baseline' }

      await expect(
        executor.executeMethod(ANCOVA_METHOD, allInvalidData, allInvalidVars)
      ).rejects.toThrow('ANCOVA: 모든 변수에 유효한 값이 있는 행이 없습니다')
    })
  })

  // ─── 4. 엣지 케이스 ────────────────────────

  describe('4. 엣지 케이스', () => {
    it('mainEffects가 빈 배열이면 안전하게 처리됨', async () => {
      mockAncovaAnalysisWorker.mockResolvedValue(makeAncovaResult({
        mainEffects: [],
      }))

      const data = makeAncovaData()
      const result = await executor.executeMethod(ANCOVA_METHOD, data.data, data.variables)

      // mainEffect가 없으면 기본값
      expect(result.mainResults.statistic).toBe(0)
      expect(result.mainResults.pvalue).toBe(1)
      expect(result.mainResults.significant).toBe(false)
      expect(result.additionalInfo?.effectSize).toBeUndefined()
    })

    it('postHoc가 빈 배열이면 빈 결과', async () => {
      mockAncovaAnalysisWorker.mockResolvedValue(makeAncovaResult({
        postHoc: [],
      }))

      const data = makeAncovaData()
      const result = await executor.executeMethod(ANCOVA_METHOD, data.data, data.variables)

      const postHoc = result.additionalInfo?.postHoc as unknown as Array<Record<string, unknown>>
      expect(postHoc).toEqual([])
      expect(result.additionalInfo?.postHocMethod).toBe('bonferroni')
    })

    it('유의하지 않은 결과(p > 0.05)의 interpretation이 올바름', async () => {
      mockAncovaAnalysisWorker.mockResolvedValue(makeAncovaResult({
        mainEffects: [{
          factor: 'Treatment',
          statistic: 1.2,
          pValue: 0.31,
          degreesOfFreedom: [2, 27] as [number, number],
          partialEtaSquared: 0.08,
          observedPower: 0.19,
        }],
      }))

      const data = makeAncovaData()
      const result = await executor.executeMethod(ANCOVA_METHOD, data.data, data.variables)

      expect(result.mainResults.significant).toBe(false)
      expect(result.mainResults.interpretation).toContain('유의한 차이가 없습니다')
    })
  })

  // ─── 5. result-transformer 호환 (8M-2) ────────

  describe('5. result-transformer 호환', () => {
    it('top-level rSquared, adjustedRSquared, rmse가 additionalInfo에 존재', async () => {
      mockAncovaAnalysisWorker.mockResolvedValue(makeAncovaResult())

      const data = makeAncovaData()
      const result = await executor.executeMethod(ANCOVA_METHOD, data.data, data.variables)

      // result-transformer는 additionalInfo.rSquared (top-level) 읽음
      expect(result.additionalInfo?.rSquared).toBe(0.68)
      expect(result.additionalInfo?.adjustedRSquared).toBe(0.65)
      expect(result.additionalInfo?.rmse).toBe(2.4)

      // modelFit 중첩 객체도 함께 존재
      const modelFit = result.additionalInfo?.modelFit as Record<string, unknown>
      expect(modelFit.rSquared).toBe(0.68)
    })
  })

  // ─── 6. rawResults 전달 ────────────────────

  describe('6. rawResults 전달', () => {
    it('rawResults에 원본 Worker2 결과가 포함됨', async () => {
      const ancovaResult = makeAncovaResult()
      mockAncovaAnalysisWorker.mockResolvedValue(ancovaResult)

      const data = makeAncovaData()
      const result = await executor.executeMethod(ANCOVA_METHOD, data.data, data.variables)

      expect(result.rawResults).toBeDefined()
      const raw = result.rawResults as Record<string, unknown>
      expect(raw.covariatesCount).toBe(1)
      expect(raw.assumptions).toBeDefined()
      expect(raw.interpretation).toBeDefined()
    })
  })

  // ─── 7. Worker2 에러 전파 (M-3) ────────────

  describe('7. Worker2 에러 전파', () => {
    it('Worker2가 reject하면 에러가 전파됨', async () => {
      mockAncovaAnalysisWorker.mockRejectedValue(
        new Error('Python ANCOVA 계산 실패: singular matrix')
      )

      const data = makeAncovaData()
      await expect(
        executor.executeMethod(ANCOVA_METHOD, data.data, data.variables)
      ).rejects.toThrow('Python ANCOVA 계산 실패')
    })
  })

  // ─── 8. 추가 엣지 케이스 ────────────────────

  describe('8. 추가 엣지 케이스', () => {
    it('모든 행이 무효하면 Worker2가 호출되지 않음 (L-1)', async () => {
      const allInvalidData: Array<Record<string, unknown>> = [
        { score: 10, group: 'A', baseline: NaN },
        { score: 20, group: 'A', baseline: NaN },
        { score: 30, group: 'B', baseline: NaN },
        { score: 40, group: 'B', baseline: NaN },
      ]
      const allInvalidVars = { dependent: ['score'], group: 'group', covariate: 'baseline' }

      await expect(
        executor.executeMethod(ANCOVA_METHOD, allInvalidData, allInvalidVars)
      ).rejects.toThrow()

      expect(mockAncovaAnalysisWorker).not.toHaveBeenCalled()
    })

    it('다중 공변량이 올바르게 전달됨 (L-2)', async () => {
      mockAncovaAnalysisWorker.mockResolvedValue(makeAncovaResult())

      const data = makeAncovaData({ covariates: ['baseline', 'age'] })
      await executor.executeMethod(ANCOVA_METHOD, data.data, data.variables)

      expect(mockAncovaAnalysisWorker).toHaveBeenCalledTimes(1)
      const [, , covVars] = mockAncovaAnalysisWorker.mock.calls[0]
      expect(covVars).toEqual(['baseline', 'age'])
    })

    it('postHoc에 group1/group2가 직접 제공되면 comparison 파싱 생략 (L-3)', async () => {
      // Python이 group1/group2를 직접 반환하는 경우 — TS 타입에는 없지만 런타임 가능
      const postHocWithGroups = [
        {
          comparison: 'ignored',
          group1: 'GroupX',
          group2: 'GroupY',
          meanDiff: 3.5,
          standardError: 1.0,
          tValue: 3.5,
          pValue: 0.002,
          adjustedPValue: 0.006,
          cohensD: 0.5,
          lowerCI: 1.5,
          upperCI: 5.5,
        },
      ] as unknown as Worker2AncovaResult['postHoc']
      mockAncovaAnalysisWorker.mockResolvedValue(makeAncovaResult({
        postHoc: postHocWithGroups,
      }))

      const data = makeAncovaData()
      const result = await executor.executeMethod(ANCOVA_METHOD, data.data, data.variables)

      const postHoc = result.additionalInfo?.postHoc as unknown as Array<Record<string, unknown>>
      expect(postHoc[0].group1).toBe('GroupX')
      expect(postHoc[0].group2).toBe('GroupY')
    })
  })

  // ─── 9. 10차 리뷰: 그룹 재검증 + null 그룹 + visualizationData ────

  describe('9. validRows 후 그룹 재검증 (10H-1)', () => {
    it('공변량 필터링으로 그룹이 1개만 남으면 에러', async () => {
      // A 그룹: 유효 covariate, B 그룹: 모두 NaN covariate
      const data: Array<Record<string, unknown>> = [
        { score: 10, group: 'A', baseline: 50 },
        { score: 20, group: 'A', baseline: 55 },
        { score: 30, group: 'A', baseline: 60 },
        { score: 40, group: 'B', baseline: NaN },
        { score: 50, group: 'B', baseline: NaN },
        { score: 60, group: 'B', baseline: NaN },
      ]
      const variables = { dependent: ['score'], group: 'group', covariate: 'baseline' }

      await expect(
        executor.executeMethod(ANCOVA_METHOD, data, variables)
      ).rejects.toThrow('그룹이 1개뿐입니다')

      expect(mockAncovaAnalysisWorker).not.toHaveBeenCalled()
    })

    it('공변량 필터링으로 그룹 관측치가 1개만 남으면 에러', async () => {
      const data: Array<Record<string, unknown>> = [
        { score: 10, group: 'A', baseline: 50 },
        { score: 20, group: 'A', baseline: 55 },
        { score: 30, group: 'B', baseline: 60 },   // B에서 유일한 유효행
        { score: 40, group: 'B', baseline: NaN },
        { score: 50, group: 'B', baseline: NaN },
      ]
      const variables = { dependent: ['score'], group: 'group', covariate: 'baseline' }

      await expect(
        executor.executeMethod(ANCOVA_METHOD, data, variables)
      ).rejects.toThrow('2개 미만')

      expect(mockAncovaAnalysisWorker).not.toHaveBeenCalled()
    })
  })

  describe('10. missingRemoved 반영 (10M-2)', () => {
    it('validRows 필터링으로 제거된 행 수가 missingRemoved에 반영됨', async () => {
      mockAncovaAnalysisWorker.mockResolvedValue(makeAncovaResult())

      const data = makeAncovaData({ includeInvalidRows: true })
      const result = await executor.executeMethod(ANCOVA_METHOD, data.data, data.variables)

      // 34행 중 4개 무효 → missingRemoved = 4
      expect(result.metadata.dataInfo.missingRemoved).toBe(4)
      expect(result.metadata.dataInfo.totalN).toBe(30)
    })

    it('visualizationData가 validRows 기준으로 생성됨', async () => {
      mockAncovaAnalysisWorker.mockResolvedValue(makeAncovaResult())

      const data = makeAncovaData({ includeInvalidRows: true })
      const result = await executor.executeMethod(ANCOVA_METHOD, data.data, data.variables)

      const vizData = result.visualizationData?.data as Array<{ values: number[]; label: string }>
      expect(vizData).toBeDefined()
      // 각 그룹의 values 합계 = validRows 30행
      const totalVizRows = vizData.reduce((sum, g) => sum + g.values.length, 0)
      expect(totalVizRows).toBe(30)
    })
  })
})
