import type { CalculatorContext, HandlerMap, CalculationResult } from '../calculator-types'
import { PyodideWorker } from '@/lib/services/pyodide/core/pyodide-worker.enum'
import type {
  OneSampleTTestResult,
  TwoSampleTTestResult,
  PairedTTestResult
} from '@/types/pyodide-results'

export const createHypothesisHandlers = (context: CalculatorContext): HandlerMap => ({
  oneSampleTTest: (data, parameters) => oneSampleTTest(context, data, parameters),
  twoSampleTTest: (data, parameters) => twoSampleTTest(context, data, parameters),
  pairedTTest: (data, parameters) => pairedTTest(context, data, parameters),
  welchTTest: (data, parameters) => welchTTest(context, data, parameters),
  oneSampleProportionTest: (data, parameters) => oneSampleProportionTest(context, data, parameters)
})

const oneSampleTTest = async (
  context: CalculatorContext,
  data: any[],
  parameters: Record<string, any>
): Promise<CalculationResult> => {
  const column = parameters.column
  const popmean = parameters.popmean

  if (!column || popmean === undefined) {
    return { success: false, error: '필수 파라미터를 입력하세요' }
  }

  const values = data.map(row => parseFloat(row[column])).filter(v => !isNaN(v))
  if (values.length < 2) {
    return { success: false, error: '최소 2개 이상의 데이터가 필요합니다' }
  }

  const alternative = parameters.alternative || 'two-sided'
  const confidence = parameters.confidence || 0.95
  const alpha = 1 - confidence

  const result = await context.pyodideCore.callWorkerMethod<OneSampleTTestResult>(
    PyodideWorker.Hypothesis,
    't_test_one_sample',
    { data: values, popmean, alternative }
  )

  const mean = values.reduce((a, b) => a + b, 0) / values.length
  const std = Math.sqrt(values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / (values.length - 1))
  const cohensD = (mean - popmean) / std

  return {
    success: true,
    data: {
      metrics: [
        { name: 't-통계량', value: result.statistic.toFixed(4) },
        { name: 'p-value', value: result.pValue.toFixed(4) },
        { name: "Cohen's d", value: cohensD.toFixed(4) }
      ],
      tables: [{
        name: '일표본 t-검정 결과',
        data: [
          { 항목: '표본 평균', 값: mean.toFixed(4) },
          { 항목: '모집단 평균', 값: popmean },
          { 항목: '표본 표준편차', 값: std.toFixed(4) },
          { 항목: '표본 크기', 값: values.length },
          { 항목: '자유도', 값: result.df },
          { 항목: 't-통계량', 값: result.statistic.toFixed(4) },
          { 항목: 'p-value', 값: result.pValue.toFixed(4) },
          { 항목: '신뢰구간', 값: `[${result.ci_lower.toFixed(4)}, ${result.ci_upper.toFixed(4)}]` },
          { 항목: "Cohen's d", 값: cohensD.toFixed(4) },
          { 항목: '대립가설', 값: alternative }
        ]
      }],
      interpretation: interpretTTest(result.pValue, alpha, alternative, mean, popmean)
    }
  }
}

const twoSampleTTest = async (
  context: CalculatorContext,
  data: any[],
  parameters: Record<string, any>
): Promise<CalculationResult> => {
  const valueColumn = parameters.value_column
  const groupColumn = parameters.group_column

  if (!valueColumn || !groupColumn) {
    return { success: false, error: '값 열과 그룹 열을 선택하세요' }
  }

  const groups: Record<string, number[]> = {}
  data.forEach(row => {
    const group = row[groupColumn]
    const value = parseFloat(row[valueColumn])
    if (!isNaN(value)) {
      if (!groups[group]) {
        groups[group] = []
      }
      groups[group].push(value)
    }
  })

  const groupNames = Object.keys(groups)
  if (groupNames.length !== 2) {
    return { success: false, error: '정확히 2개의 그룹이 필요합니다' }
  }

  const group1 = groups[groupNames[0]]
  const group2 = groups[groupNames[1]]
  const equalVar = parameters.equal_var ?? true

  const result = await context.pyodideCore.callWorkerMethod<TwoSampleTTestResult>(
    PyodideWorker.Hypothesis,
    't_test_two_sample',
    { group1, group2, equal_var: equalVar }
  )

  return {
    success: true,
    data: {
      metrics: [
        { name: 't-통계량', value: result.statistic.toFixed(4) },
        { name: 'p-value', value: result.pValue.toFixed(4) },
        { name: "Cohen's d", value: result.cohensD.toFixed(4) }
      ],
      tables: [{
        name: '그룹별 통계',
        data: [
          { 그룹: groupNames[0], 표본수: group1.length, 평균: result.mean1.toFixed(4), 표준편차: result.std1.toFixed(4) },
          { 그룹: groupNames[1], 표본수: group2.length, 평균: result.mean2.toFixed(4), 표준편차: result.std2.toFixed(4) }
        ]
      }, {
        name: '검정 결과',
        data: [
          { 항목: '평균 차이', 값: (result.mean1 - result.mean2).toFixed(4) },
          { 항목: '자유도', 값: result.df.toFixed(2) },
          { 항목: 't-통계량', 값: result.statistic.toFixed(4) },
          { 항목: 'p-value', 값: result.pValue.toFixed(4) },
          { 항목: '신뢰구간', 값: `[${result.ci_lower.toFixed(4)}, ${result.ci_upper.toFixed(4)}]` },
          { 항목: "Cohen's d", 값: result.cohensD.toFixed(4) },
          { 항목: '등분산 가정', 값: equalVar ? '가정함' : '가정하지 않음 (Welch)' }
        ]
      }],
      interpretation: `p-value (${result.pValue.toFixed(4)})가 0.05${
        result.pValue < 0.05 ? '보다 작으므로' : '보다 크므로'
      } 두 그룹 간 평균의 차이가 통계적으로 ${
        result.pValue < 0.05 ? '유의합니다' : '유의하지 않습니다'
      }. Cohen's d = ${result.cohensD.toFixed(4)}는 ${
        Math.abs(result.cohensD) < 0.2 ? '매우 작은' :
        Math.abs(result.cohensD) < 0.5 ? '작은' :
        Math.abs(result.cohensD) < 0.8 ? '중간' : '큰'
      } 효과 크기를 나타냅니다.`
    }
  }
}

const pairedTTest = async (
  context: CalculatorContext,
  data: any[],
  parameters: Record<string, any>
): Promise<CalculationResult> => {
  const column1 = parameters.column1
  const column2 = parameters.column2
  const alternative = parameters.alternative || 'two-sided'
  const alpha = parameters.alpha || 0.05

  if (!column1 || !column2) {
    return { success: false, error: '사전과 사후 측정 열을 모두 선택하세요' }
  }

  const pairs: Array<[number, number]> = []
  data.forEach(row => {
    const val1 = parseFloat(row[column1])
    const val2 = parseFloat(row[column2])
    if (!isNaN(val1) && !isNaN(val2)) {
      pairs.push([val1, val2])
    }
  })

  if (pairs.length < 2) {
    return { success: false, error: '최소 2쌍 이상의 대응 데이터가 필요합니다' }
  }

  const values1 = pairs.map(p => p[0])
  const values2 = pairs.map(p => p[1])
  const differences = pairs.map(p => p[1] - p[0])

  const result = await context.pyodideCore.callWorkerMethod<PairedTTestResult>(
    PyodideWorker.Hypothesis,
    't_test_paired',
    { values1, values2, alternative }
  )

  const meanDiff = differences.reduce((a, b) => a + b, 0) / differences.length
  const stdDiff = Math.sqrt(differences.reduce((a, b) => a + Math.pow(b - meanDiff, 2), 0) / (differences.length - 1))
  const cohensD = meanDiff / stdDiff

  return {
    success: true,
    data: {
      metrics: [
        { name: 't-통계량', value: result.statistic.toFixed(4) },
        { name: 'p-value', value: result.pValue.toFixed(4) },
        { name: "Cohen's d", value: cohensD.toFixed(4) }
      ],
      tables: [{
        name: '대응 표본 통계',
        data: [
          { 측정: `${column1} (사전)`, 평균: result.mean1.toFixed(4), 표준편차: result.std1.toFixed(4) },
          { 측정: `${column2} (사후)`, 평균: result.mean2.toFixed(4), 표준편차: result.std2.toFixed(4) },
          { 측정: '차이 (사후-사전)', 평균: meanDiff.toFixed(4), 표준편차: stdDiff.toFixed(4) }
        ]
      }, {
        name: '검정 결과',
        data: [
          { 항목: '표본 쌍 수', 값: pairs.length },
          { 항목: '평균 차이', 값: meanDiff.toFixed(4) },
          { 항목: '자유도', 값: result.df },
          { 항목: 't-통계량', 값: result.statistic.toFixed(4) },
          { 항목: 'p-value', 값: result.pValue.toFixed(4) },
          { 항목: '신뢰구간', 값: `[${result.ci_lower.toFixed(4)}, ${result.ci_upper.toFixed(4)}]` },
          { 항목: "Cohen's d", 값: cohensD.toFixed(4) },
          { 항목: '대립가설', 값: alternative }
        ]
      }],
      interpretation: interpretPairedTTest(result.pValue, alpha, meanDiff, cohensD)
    }
  }
}

const welchTTest = async (
  context: CalculatorContext,
  data: any[],
  parameters: Record<string, any>
): Promise<CalculationResult> => {
  return twoSampleTTest(context, data, { ...parameters, equal_var: false })
}

const oneSampleProportionTest = async (
  context: CalculatorContext,
  data: any[],
  parameters: Record<string, any>
): Promise<CalculationResult> => {
  const column = parameters.column
  const targetProportion = parameters.targetProportion || 0.5
  const alternative = parameters.alternative || 'two-sided'
  const alpha = parameters.alpha || 0.05

  if (!column) {
    return { success: false, error: '검정할 열을 선택하세요' }
  }

  const values = data.map(row => {
    const val = row[column]
    if (typeof val === 'boolean') return val ? 1 : 0
    if (val === 1 || val === 0) return val
    const strVal = String(val).toLowerCase().trim()
    if (strVal === '1' || strVal === 'true' || strVal === '성공' || strVal === 'yes' || strVal === 'success') return 1
    if (strVal === '0' || strVal === 'false' || strVal === '실패' || strVal === 'no' || strVal === 'fail' || strVal === 'failure') return 0
    return null
  }).filter((v): v is number => v !== null)

  if (values.length < 30) {
    return { success: false, error: '비율검정은 최소 30개 이상의 데이터가 필요합니다' }
  }

  const successes = values.filter(v => v === 1).length
  const n = values.length
  const observedProportion = successes / n

  if (n * targetProportion < 5 || n * (1 - targetProportion) < 5) {
    return { success: false, error: '표본 크기가 정규 근사 조건을 만족하지 않습니다 (np≥5, n(1-p)≥5)' }
  }

  const result = await context.pyodideCore.callWorkerMethod<{
    statistic: number
    pValue: number
  }>(
    PyodideWorker.Descriptive,
    'one_sample_proportion_test',
    { successes, n, p0: targetProportion, alternative }
  )

  const zCritical = 1.96
  const ciSE = Math.sqrt(observedProportion * (1 - observedProportion) / n)
  const lowerCI = observedProportion - zCritical * ciSE
  const upperCI = observedProportion + zCritical * ciSE

  return {
    success: true,
    data: {
      metrics: [
        { name: '표본 크기', value: n },
        { name: '성공 개수', value: successes },
        { name: '관측 비율', value: observedProportion.toFixed(4) },
        { name: '기준 비율', value: targetProportion.toFixed(4) }
      ],
      tables: [{
        name: '비율검정 결과',
        data: [
          { 항목: '검정 방법', 값: 'One-sample Proportion Test (Z-test)' },
          { 항목: 'Z 통계량', 값: result.statistic.toFixed(4) },
          { 항목: 'p-value', 값: result.pValue.toFixed(4) },
          { 항목: '95% 신뢰구간', 값: `[${lowerCI.toFixed(4)}, ${upperCI.toFixed(4)}]` },
          { 항목: '대립가설', 값: alternative },
          { 항목: '유의수준 (α)', 값: alpha },
          { 항목: '결과', 값: result.pValue < alpha ? '기준 비율과 유의한 차이 있음' : '기준 비율과 유의한 차이 없음' }
        ]
      }],
      interpretation: `일표본 비율검정: 관측비율=${observedProportion.toFixed(4)}, 기준비율=${targetProportion}, Z=${result.statistic.toFixed(2)}, p=${result.pValue.toFixed(4)}`
    }
  }
}

const interpretTTest = (
  pValue: number,
  alpha: number,
  alternative: string,
  mean: number,
  popmean: number
): string => {
  const significant = pValue < alpha
  const direction = mean > popmean ? '크다' : '작다'

  let interpretation = `p-value (${pValue.toFixed(4)})가 유의수준 (${alpha})${
    significant ? '보다 작으므로' : '보다 크므로'
  } `

  if (significant) {
    if (alternative === 'two-sided') {
      interpretation += '표본 평균이 모집단 평균과 통계적으로 유의한 차이가 있습니다.'
    } else {
      interpretation += `표본 평균이 모집단 평균보다 통계적으로 유의하게 ${direction}고 할 수 있습니다.`
    }
  } else {
    interpretation += '표본 평균과 모집단 평균 간에 통계적으로 유의한 차이가 없습니다.'
  }

  return interpretation
}

const interpretPairedTTest = (
  pValue: number,
  alpha: number,
  meanDiff: number,
  cohensD: number
): string => {
  const significant = pValue < alpha
  const direction = meanDiff > 0 ? '증가' : '감소'
  const effectSize = Math.abs(cohensD)
  const effectInterpretation = effectSize < 0.2 ? '매우 작은 효과' :
    effectSize < 0.5 ? '작은 효과' :
    effectSize < 0.8 ? '중간 효과' : '큰 효과'

  return `대응표본 t-검정 결과, p-value (${pValue.toFixed(4)})가 유의수준 (${alpha})${
    significant ? '보다 작아' : '보다 커'
  } ${significant ? `사전 대비 사후가 통계적으로 유의하게 ${direction}했습니다.` : '통계적으로 유의한 변화가 없습니다.'} ` +
  `평균 차이는 ${meanDiff.toFixed(4)}, Cohen's d = ${cohensD.toFixed(4)} (${effectInterpretation}).`
}
