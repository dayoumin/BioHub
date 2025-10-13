import type { CalculatorContext, HandlerMap, CalculationResult } from '../calculator-types'

export const createDescriptiveHandlers = (context: CalculatorContext): HandlerMap => ({
  calculateDescriptiveStats: (data, parameters) =>
    calculateDescriptiveStats(context, data, parameters),
  normalityTest: (data, parameters) => normalityTest(context, data, parameters),
  homogeneityTest: (data, parameters) => homogeneityTest(context, data, parameters)
})

const calculateDescriptiveStats = async (
  context: CalculatorContext,
  data: any[],
  parameters: Record<string, any>
): Promise<CalculationResult> => {
  const column = parameters.columns || parameters.column
  if (!column) {
    return { success: false, error: '분석할 열을 선택하세요' }
  }

  const values = data.map(row => parseFloat(row[column])).filter(v => !isNaN(v))
  if (values.length === 0) {
    return { success: false, error: '유효한 숫자 데이터가 없습니다' }
  }

  const result = await context.pyodideService.descriptiveStats(values)

  return {
    success: true,
    data: {
      metrics: [
        { name: '표본 크기', value: result.n },
        { name: '평균', value: result.mean.toFixed(4) },
        { name: '중앙값', value: result.median.toFixed(4) },
        { name: '표준편차', value: result.std.toFixed(4) },
        { name: '최솟값', value: result.min.toFixed(4) },
        { name: '최댓값', value: result.max.toFixed(4) }
      ],
      tables: [{
        name: '기술통계량 상세',
        data: [
          { 통계량: '평균 (Mean)', 값: result.mean.toFixed(4) },
          { 통계량: '중앙값 (Median)', 값: result.median.toFixed(4) },
          { 통계량: '최빈값 (Mode)', 값: result.mode?.toFixed(4) || 'N/A' },
          { 통계량: '표준편차 (SD)', 값: result.std.toFixed(4) },
          { 통계량: '분산 (Variance)', 값: result.variance.toFixed(4) },
          { 통계량: '왜도 (Skewness)', 값: result.skewness.toFixed(4) },
          { 통계량: '첨도 (Kurtosis)', 값: result.kurtosis.toFixed(4) },
          { 통계량: '범위 (Range)', 값: (result.max - result.min).toFixed(4) },
          { 통계량: 'Q1 (25%)', 값: result.q1.toFixed(4) },
          { 통계량: 'Q3 (75%)', 값: result.q3.toFixed(4) },
          { 통계량: 'IQR', 값: result.iqr.toFixed(4) }
        ]
      }],
      interpretation: interpretDescriptiveStats(result)
    }
  }
}

const normalityTest = async (
  context: CalculatorContext,
  data: any[],
  parameters: Record<string, any>
): Promise<CalculationResult> => {
  const column = parameters.column
  if (!column) {
    return { success: false, error: '검정할 열을 선택하세요' }
  }

  const values = data.map(row => parseFloat(row[column])).filter(v => !isNaN(v))
  if (values.length < 3) {
    return { success: false, error: '최소 3개 이상의 데이터가 필요합니다' }
  }

  const alpha = parameters.alpha || 0.05
  const result = await context.pyodideService.shapiroWilkTest(values)
  const isNormal = result.pValue > alpha

  return {
    success: true,
    data: {
      metrics: [
        { name: 'Shapiro-Wilk 통계량', value: result.statistic.toFixed(4) },
        { name: 'p-value', value: result.pValue.toFixed(4) },
        { name: '유의수준', value: alpha }
      ],
      tables: [{
        name: '정규성 검정 결과',
        data: [
          { 항목: '검정 방법', 값: 'Shapiro-Wilk Test' },
          { 항목: '표본 크기', 값: values.length },
          { 항목: '검정통계량', 값: result.statistic.toFixed(4) },
          { 항목: 'p-value', 값: result.pValue.toFixed(4) },
          { 항목: '유의수준 (α)', 값: alpha },
          { 항목: '정규성 여부', 값: isNormal ? '정규분포를 따름' : '정규분포를 따르지 않음' }
        ]
      }],
      interpretation: `p-value (${result.pValue.toFixed(4)})가 유의수준 (${alpha})${
        isNormal ? '보다 크므로' : '보다 작으므로'
      } 데이터가 정규분포를 ${isNormal ? '따른다고' : '따르지 않는다고'} 볼 수 있습니다.`
    }
  }
}

const homogeneityTest = async (
  context: CalculatorContext,
  data: any[],
  parameters: Record<string, any>
): Promise<CalculationResult> => {
  const groupColumn = parameters.groupColumn
  const valueColumn = parameters.valueColumn
  const method = parameters.method || 'levene'
  const alpha = parameters.alpha || 0.05

  if (!groupColumn || !valueColumn) {
    return { success: false, error: '그룹 열과 값 열을 선택하세요' }
  }

  const groups: Record<string, number[]> = {}
  data.forEach(row => {
    const group = row[groupColumn]
    const value = parseFloat(row[valueColumn])
    if (!isNaN(value)) {
      if (!groups[group]) groups[group] = []
      groups[group].push(value)
    }
  })

  const groupNames = Object.keys(groups)
  if (groupNames.length < 2) {
    return { success: false, error: '최소 2개 이상의 그룹이 필요합니다' }
  }

  const groupArrays = groupNames.map(name => groups[name])

  // 메서드에 따라 적절한 함수 호출
  const result = method === 'bartlett'
    ? await context.pyodideService.bartlettTest(groupArrays)
    : await context.pyodideService.leveneTest(groupArrays)

  const groupStats = groupNames.map(name => {
    const values = groups[name]
    const mean = values.reduce((a, b) => a + b, 0) / values.length
    const variance = values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / (values.length - 1)
    return {
      그룹: name,
      표본수: values.length,
      평균: mean.toFixed(4),
      분산: variance.toFixed(4)
    }
  })

  return {
    success: true,
    data: {
      metrics: [
        {
          name:
            method === 'levene'
              ? 'Levene 통계량'
              : method === 'bartlett'
                ? 'Bartlett 통계량'
                : 'Fligner-Killeen 통계량',
          value: result.statistic.toFixed(4)
        },
        { name: 'p-value', value: result.pValue.toFixed(4) },
        { name: '유의수준', value: alpha }
      ],
      tables: [
        {
          name: '그룹별 통계',
          data: groupStats
        },
        {
          name: '등분산 검정 결과',
          data: [
            {
              항목: '검정 방법',
              값:
                method === 'levene'
                  ? "Levene's Test"
                  : method === 'bartlett'
                    ? "Bartlett's Test"
                    : 'Fligner-Killeen Test'
            },
            { 항목: '검정통계량', 값: result.statistic.toFixed(4) },
            { 항목: 'p-value', 값: result.pValue.toFixed(4) },
            { 항목: '유의수준 (α)', 값: alpha },
            { 항목: '등분산 여부', 값: result.pValue > alpha ? '등분산 가정 만족' : '등분산 가정 위반' }
          ]
        }
      ],
      interpretation: `p-value (${result.pValue.toFixed(4)})가 유의수준 (${alpha})${
        result.pValue > alpha ? '보다 크므로' : '보다 작으므로'
      } 그룹 간 분산이 ${result.pValue > alpha ? '동일하다고 볼 수 있습니다 (등분산 가정 만족)' : '동일하지 않습니다 (이분산성 존재)'}.`
    }
  }
}

const interpretDescriptiveStats = (result: any): string => {
  const skewInterpret = Math.abs(result.skewness) < 0.5 ? '대칭적' :
    result.skewness < -0.5 ? '왼쪽으로 치우친' : '오른쪽으로 치우친'
  const kurtosisInterpret = Math.abs(result.kurtosis - 3) < 0.5 ? '정규분포와 유사한' :
    result.kurtosis > 3.5 ? '뾰족한' : '평평한'

  return `데이터는 평균 ${result.mean.toFixed(2)}, 중앙값 ${result.median.toFixed(2)}의 중심 경향성을 보입니다. ` +
    `분포는 ${skewInterpret} 형태이며, ${kurtosisInterpret} 첨도를 가집니다. ` +
    `표준편차는 ${result.std.toFixed(2)}로 데이터의 산포도를 나타냅니다.`
}
