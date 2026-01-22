/**
 * T-Test 분석 헬퍼 함수
 *
 * handleAnalysis 함수에서 추출된 t-검정 계산 로직
 * 일표본/독립표본/대응표본 t-검정 각각을 별도 함수로 분리
 *
 * @module t-test-helpers
 */

import { PyodideWorker } from '@/lib/services/pyodide/core/pyodide-worker.enum'

// ============================================================================
// Types
// ============================================================================

export interface TTestResult {
  type: 'one-sample' | 'two-sample' | 'paired'
  statistic: number
  pvalue: number
  df: number
  ciLower?: number
  ciUpper?: number
  mean_diff?: number
  effect_size?: {
    cohens_d: number
    interpretation: string
  }
  assumptions?: {
    normality: { passed: boolean; pvalue: number }
    equal_variance?: { passed: boolean; pvalue: number }
  }
  sample_stats?: {
    group1?: { mean: number; std: number; n: number }
    group2?: { mean: number; std: number; n: number }
  }
}

export interface OneSampleSummaryInput {
  mean: number
  std: number
  n: number
  popmean: number
  alpha?: number
}

export interface TwoSampleSummaryInput {
  mean1: number
  std1: number
  n1: number
  mean2: number
  std2: number
  n2: number
  equalVar: boolean
  alpha?: number
}

export interface PairedSummaryInput {
  meanDiff: number
  stdDiff: number
  nPairs: number
  alpha?: number
}

// Worker response types
interface OneSampleSummaryResponse {
  statistic: number
  pValue: number
  df: number
  meanDiff: number
  ciLower: number
  ciUpper: number
  cohensD: number
  n: number
  mean: number
  std: number
}

interface TwoSampleSummaryResponse {
  statistic: number
  pValue: number
  df: number
  meanDiff: number
  ciLower: number
  ciUpper: number
  cohensD: number
  mean1: number
  mean2: number
  std1: number
  std2: number
  n1: number
  n2: number
}

interface PairedSummaryResponse {
  statistic: number
  pValue: number
  df: number
  meanDiff: number
  ciLower: number
  ciUpper: number
  cohensD: number
  nPairs: number
  stdDiff: number
}

interface OneSampleRawResponse {
  statistic: number
  pValue: number
  sampleMean: number
  sampleStd?: number
}

interface TwoSampleRawResponse {
  statistic: number
  pValue: number
  cohensD: number
  mean1: number
  mean2: number
  std1: number
  std2: number
  n1: number
  n2: number
}

interface PairedRawResponse {
  statistic: number
  pValue: number
  meanDiff: number
  nPairs: number
}

// PyodideCore 서비스 타입 (순환 참조 방지)
interface PyodideCoreInstance {
  callWorkerMethod<T>(worker: PyodideWorker, method: string, params: Record<string, unknown>): Promise<T>
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * 효과크기 해석 (Cohen's d)
 */
export function interpretEffectSize(d: number): string {
  const abs = Math.abs(d)
  if (abs >= 0.8) return '큰 효과'
  if (abs >= 0.5) return '중간 효과'
  if (abs >= 0.2) return '작은 효과'
  return '효과 없음'
}

/**
 * 데이터에서 숫자 값 추출
 */
export function extractNumericValues(
  data: Record<string, unknown>[],
  column: string
): number[] {
  return data
    .map((row) => Number(row[column]))
    .filter((v): v is number => !isNaN(v))
}

/**
 * 그룹별 데이터 분리
 */
export function extractGroupData(
  data: Record<string, unknown>[],
  groupColumn: string,
  valueColumn: string
): { groups: string[]; group1Data: number[]; group2Data: number[] } {
  const uniqueGroups = Array.from(
    new Set(data.map((row) => row[groupColumn]))
  ) as string[]

  if (uniqueGroups.length !== 2) {
    throw new Error(
      `집단 변수는 정확히 2개의 값을 가져야 합니다 (현재: ${uniqueGroups.length}개)`
    )
  }

  const group1Data = data
    .filter((row) => row[groupColumn] === uniqueGroups[0])
    .map((row) => Number(row[valueColumn]))
    .filter((v): v is number => !isNaN(v))

  const group2Data = data
    .filter((row) => row[groupColumn] === uniqueGroups[1])
    .map((row) => Number(row[valueColumn]))
    .filter((v): v is number => !isNaN(v))

  return { groups: uniqueGroups, group1Data, group2Data }
}

/**
 * 대응표본용 유효 쌍 추출
 */
export function extractPairedData(
  data: Record<string, unknown>[],
  beforeColumn: string,
  afterColumn: string
): { values1: number[]; values2: number[]; differences: number[] } {
  const validPairs = data
    .map((row) => ({
      before: Number(row[beforeColumn]),
      after: Number(row[afterColumn])
    }))
    .filter((pair) => !isNaN(pair.before) && !isNaN(pair.after))

  const values1 = validPairs.map((p) => p.before)
  const values2 = validPairs.map((p) => p.after)
  const differences = validPairs.map((p) => p.after - p.before)

  return { values1, values2, differences }
}

/**
 * Cohen's d 계산 (일표본)
 */
export function calculateOneSampleCohensD(
  values: number[],
  testValue: number
): number {
  const mean = values.reduce((a, b) => a + b, 0) / values.length
  const variance =
    values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / (values.length - 1)
  const std = Math.sqrt(variance)
  return std > 0 ? (mean - testValue) / std : 0
}

/**
 * Cohen's d 계산 (대응표본)
 */
export function calculatePairedCohensD(differences: number[]): number {
  const meanDiff =
    differences.reduce((a, b) => a + b, 0) / differences.length
  const variance =
    differences.reduce((sum, v) => sum + Math.pow(v - meanDiff, 2), 0) /
    (differences.length - 1)
  const stdDiff = Math.sqrt(variance)
  return stdDiff > 0 ? meanDiff / stdDiff : 0
}

// ============================================================================
// Summary Statistics Mode
// ============================================================================

/**
 * 일표본 t-검정 (요약통계)
 */
export async function runOneSampleTTestSummary(
  pyodideCore: PyodideCoreInstance,
  input: OneSampleSummaryInput
): Promise<TTestResult> {
  const result = await pyodideCore.callWorkerMethod<OneSampleSummaryResponse>(
    PyodideWorker.Hypothesis,
    't_test_one_sample_summary',
    {
      mean: input.mean,
      std: input.std,
      n: input.n,
      popmean: input.popmean,
      alpha: input.alpha ?? 0.05
    }
  )

  return {
    type: 'one-sample',
    statistic: result.statistic,
    pvalue: result.pValue,
    df: result.df,
    mean_diff: result.meanDiff,
    ciLower: result.ciLower,
    ciUpper: result.ciUpper,
    effect_size: {
      cohens_d: result.cohensD,
      interpretation: interpretEffectSize(result.cohensD)
    },
    sample_stats: {
      group1: { mean: result.mean, std: result.std, n: result.n }
    }
  }
}

/**
 * 독립표본 t-검정 (요약통계)
 */
export async function runTwoSampleTTestSummary(
  pyodideCore: PyodideCoreInstance,
  input: TwoSampleSummaryInput
): Promise<TTestResult> {
  const result = await pyodideCore.callWorkerMethod<TwoSampleSummaryResponse>(
    PyodideWorker.Hypothesis,
    't_test_two_sample_summary',
    {
      mean1: input.mean1,
      std1: input.std1,
      n1: input.n1,
      mean2: input.mean2,
      std2: input.std2,
      n2: input.n2,
      equalVar: input.equalVar,
      alpha: input.alpha ?? 0.05
    }
  )

  return {
    type: 'two-sample',
    statistic: result.statistic,
    pvalue: result.pValue,
    df: result.df,
    mean_diff: result.meanDiff,
    ciLower: result.ciLower,
    ciUpper: result.ciUpper,
    effect_size: {
      cohens_d: result.cohensD,
      interpretation: interpretEffectSize(result.cohensD)
    },
    sample_stats: {
      group1: { mean: result.mean1, std: result.std1, n: result.n1 },
      group2: { mean: result.mean2, std: result.std2, n: result.n2 }
    }
  }
}

/**
 * 대응표본 t-검정 (요약통계)
 */
export async function runPairedTTestSummary(
  pyodideCore: PyodideCoreInstance,
  input: PairedSummaryInput
): Promise<TTestResult> {
  const result = await pyodideCore.callWorkerMethod<PairedSummaryResponse>(
    PyodideWorker.Hypothesis,
    't_test_paired_summary',
    {
      meanDiff: input.meanDiff,
      stdDiff: input.stdDiff,
      nPairs: input.nPairs,
      alpha: input.alpha ?? 0.05
    }
  )

  return {
    type: 'paired',
    statistic: result.statistic,
    pvalue: result.pValue,
    df: result.df,
    mean_diff: result.meanDiff,
    ciLower: result.ciLower,
    ciUpper: result.ciUpper,
    effect_size: {
      cohens_d: result.cohensD,
      interpretation: interpretEffectSize(result.cohensD)
    }
  }
}

// ============================================================================
// Raw Data Mode
// ============================================================================

/**
 * 일표본 t-검정 (원시데이터)
 */
export async function runOneSampleTTestRaw(
  pyodideCore: PyodideCoreInstance,
  data: Record<string, unknown>[],
  valueColumn: string,
  testValue: number
): Promise<TTestResult> {
  const values = extractNumericValues(data, valueColumn)

  if (values.length < 2) {
    throw new Error('최소 2개 이상의 유효한 데이터가 필요합니다.')
  }

  const result = await pyodideCore.callWorkerMethod<OneSampleRawResponse>(
    PyodideWorker.Hypothesis,
    't_test_one_sample',
    { data: values, popmean: testValue }
  )

  const cohensD = calculateOneSampleCohensD(values, testValue)

  return {
    type: 'one-sample',
    statistic: result.statistic,
    pvalue: result.pValue,
    df: values.length - 1,
    ciLower: undefined,
    ciUpper: undefined,
    effect_size: {
      cohens_d: cohensD,
      interpretation: interpretEffectSize(cohensD)
    }
  }
}

/**
 * 독립표본 t-검정 (원시데이터)
 */
export async function runTwoSampleTTestRaw(
  pyodideCore: PyodideCoreInstance,
  data: Record<string, unknown>[],
  groupColumn: string,
  valueColumn: string,
  equalVar: boolean = true
): Promise<TTestResult> {
  const { group1Data, group2Data } = extractGroupData(
    data,
    groupColumn,
    valueColumn
  )

  if (group1Data.length < 2 || group2Data.length < 2) {
    throw new Error('각 집단에 최소 2개 이상의 유효한 데이터가 필요합니다.')
  }

  const result = await pyodideCore.callWorkerMethod<TwoSampleRawResponse>(
    PyodideWorker.Hypothesis,
    't_test_two_sample',
    { group1: group1Data, group2: group2Data, equalVar }
  )

  return {
    type: 'two-sample',
    statistic: result.statistic,
    pvalue: result.pValue,
    df: result.n1 + result.n2 - 2,
    mean_diff: result.mean1 - result.mean2,
    effect_size: {
      cohens_d: result.cohensD,
      interpretation: interpretEffectSize(result.cohensD)
    },
    sample_stats: {
      group1: { mean: result.mean1, std: result.std1, n: result.n1 },
      group2: { mean: result.mean2, std: result.std2, n: result.n2 }
    }
  }
}

/**
 * 대응표본 t-검정 (원시데이터)
 */
export async function runPairedTTestRaw(
  pyodideCore: PyodideCoreInstance,
  data: Record<string, unknown>[],
  beforeColumn: string,
  afterColumn: string
): Promise<TTestResult> {
  const { values1, values2, differences } = extractPairedData(
    data,
    beforeColumn,
    afterColumn
  )

  if (values1.length < 2) {
    throw new Error('최소 2개 이상의 유효한 쌍이 필요합니다.')
  }

  const result = await pyodideCore.callWorkerMethod<PairedRawResponse>(
    PyodideWorker.Hypothesis,
    't_test_paired',
    { values1, values2 }
  )

  const cohensD = calculatePairedCohensD(differences)

  return {
    type: 'paired',
    statistic: result.statistic,
    pvalue: result.pValue,
    df: result.nPairs - 1,
    mean_diff: result.meanDiff,
    effect_size: {
      cohens_d: cohensD,
      interpretation: interpretEffectSize(cohensD)
    }
  }
}

// ============================================================================
// Main Runner (Unified Interface)
// ============================================================================

export interface TTestRunnerParams {
  testType: 'one-sample' | 'two-sample' | 'paired'
  inputMode: 'raw' | 'summary'
  // Raw data params
  data?: Record<string, unknown>[]
  valueColumn?: string
  groupColumn?: string
  beforeColumn?: string
  afterColumn?: string
  testValue?: number
  equalVar?: boolean
  // Summary params
  summaryOne?: OneSampleSummaryInput
  summaryTwo?: TwoSampleSummaryInput
  summaryPaired?: PairedSummaryInput
}

/**
 * 통합 t-검정 실행 함수
 */
export async function runTTest(
  pyodideCore: PyodideCoreInstance,
  params: TTestRunnerParams
): Promise<TTestResult> {
  const { testType, inputMode } = params

  if (inputMode === 'summary') {
    if (testType === 'one-sample') {
      if (!params.summaryOne) {
        throw new Error('일표본 요약통계를 입력해주세요.')
      }
      return runOneSampleTTestSummary(pyodideCore, params.summaryOne)
    } else if (testType === 'two-sample') {
      if (!params.summaryTwo) {
        throw new Error('독립표본 요약통계를 입력해주세요.')
      }
      return runTwoSampleTTestSummary(pyodideCore, params.summaryTwo)
    } else {
      if (!params.summaryPaired) {
        throw new Error('대응표본 요약통계를 입력해주세요.')
      }
      return runPairedTTestSummary(pyodideCore, params.summaryPaired)
    }
  } else {
    // Raw data mode
    if (!params.data) {
      throw new Error('데이터를 업로드해주세요.')
    }

    if (testType === 'one-sample') {
      if (!params.valueColumn) {
        throw new Error('측정 변수를 선택해주세요.')
      }
      return runOneSampleTTestRaw(
        pyodideCore,
        params.data,
        params.valueColumn,
        params.testValue ?? 0
      )
    } else if (testType === 'two-sample') {
      if (!params.groupColumn || !params.valueColumn) {
        throw new Error('집단 변수와 측정 변수를 선택해주세요.')
      }
      return runTwoSampleTTestRaw(
        pyodideCore,
        params.data,
        params.groupColumn,
        params.valueColumn,
        params.equalVar
      )
    } else {
      if (!params.beforeColumn || !params.afterColumn) {
        throw new Error('전/후 측정 변수를 선택해주세요.')
      }
      return runPairedTTestRaw(
        pyodideCore,
        params.data,
        params.beforeColumn,
        params.afterColumn
      )
    }
  }
}
