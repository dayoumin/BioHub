/**
 * 비모수 검정 핸들러 확장
 *
 * KS 검정, 부호 검정, 런 검정, McNemar 검정
 */

import type { CalculatorContext, HandlerMap, CalculationResult, DataRow } from '../calculator-types'
import { extractNumericColumn, formatPValue, ERROR_MESSAGES } from './common-utils'
import type { KSTestParams, SignTestParams, RunsTestParams, McNemarTestParams } from '../method-parameter-types'

export const createNonparametricExtendedHandlers = (context: CalculatorContext): HandlerMap => ({
  ksTest: (data, parameters) => ksTest(context, data, parameters as KSTestParams),
  signTest: (data, parameters) => signTest(context, data, parameters as SignTestParams),
  runsTest: (data, parameters) => runsTest(context, data, parameters as RunsTestParams),
  mcNemarTest: (data, parameters) => mcNemarTest(context, data, parameters as McNemarTestParams)
})

/**
 * Kolmogorov-Smirnov 검정 (K-S Test)
 *
 * 두 표본이 같은 분포에서 나왔는지 검정합니다.
 * 일표본 검정(정규성)과 이표본 검정을 모두 지원합니다.
 *
 * @param context - 계산 컨텍스트
 * @param data - 분석 데이터
 * @param parameters - 분석 파라미터
 * @param parameters.column - 검정할 열 (일표본)
 * @param parameters.column1 - 첫 번째 열 (이표본)
 * @param parameters.column2 - 두 번째 열 (이표본)
 * @param parameters.distribution - 비교 분포 ('norm', 'uniform' 등, 일표본 시)
 * @param parameters.alpha - 유의수준 (기본값: 0.05)
 *
 * @returns K-S 검정 결과
 *
 * @example
 * ```typescript
 * // 일표본 정규성 검정
 * const result = await ksTest(context, data, {
 *   column: 'height',
 *   distribution: 'norm'
 * })
 *
 * // 이표본 검정
 * const result = await ksTest(context, data, {
 *   column1: 'group_a',
 *   column2: 'group_b'
 * })
 * ```
 */
const ksTest = async (
  context: CalculatorContext,
  data: DataRow[],
  parameters: KSTestParams
): Promise<CalculationResult> => {
  const column = parameters.column
  const column1 = parameters.column1
  const column2 = parameters.column2
  const distribution = parameters.distribution || 'norm'
  const alpha = parameters.alpha || 0.05

  // 일표본 vs 이표본 판단
  const isTwoSample = column1 && column2

  if (!isTwoSample && !column) {
    return {
      success: false,
      error: '검정할 열을 선택하세요 (일표본: column, 이표본: column1 + column2)'
    }
  }

  if (isTwoSample) {
    // 이표본 K-S 검정
    const sample1 = extractNumericColumn(data, column1)
    const sample2 = extractNumericColumn(data, column2)

    if (sample1.length < 3 || sample2.length < 3) {
      return {
        success: false,
        error: '각 표본은 최소 3개 이상의 관측치가 필요합니다'
      }
    }

    // Pyodide 호출 (두 표본 K-S 검정)
    let result
    try {
      result = await context.pyodideService.twoSampleKSTest(sample1, sample2)
    } catch (error) {
      return {
        success: false,
        error: `K-S 검정 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`
      }
    }

    const interpretation = interpretKSTest(
      result.statistic,
      result.pValue,
      alpha,
      'two-sample'
    )

    return {
      success: true,
      data: {
        metrics: [
          { name: 'K-S 통계량 (D)', value: result.statistic.toFixed(4) },
          { name: 'p-value', value: formatPValue(result.pValue) },
          { name: '표본1 크기', value: sample1.length },
          { name: '표본2 크기', value: sample2.length }
        ],
        tables: [
          {
            name: 'K-S 검정 결과 (이표본)',
            data: [
              { 항목: 'K-S 통계량 (D)', 값: result.statistic.toFixed(4) },
              { 항목: 'p-value', 값: formatPValue(result.pValue) },
              { 항목: '유의수준 (α)', 값: alpha },
              {
                항목: '결론',
                값: result.pValue < alpha
                  ? '두 표본의 분포가 다릅니다 (귀무가설 기각)'
                  : '두 표본의 분포가 같습니다 (귀무가설 채택)'
              }
            ]
          }
        ],
        interpretation
      }
    }
  } else {
    // 일표본 K-S 검정 (정규성 검정)
    const sample = extractNumericColumn(data, column)

    if (sample.length < 3) {
      return {
        success: false,
        error: '최소 3개 이상의 관측치가 필요합니다'
      }
    }

    // 기존 Pyodide 메서드 활용
    let result
    try {
      result = await context.pyodideService.kolmogorovSmirnovTest(sample)
    } catch (error) {
      return {
        success: false,
        error: `K-S 검정 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`
      }
    }

    const interpretation = interpretKSTest(
      result.statistic,
      result.pValue,
      alpha,
      'normality'
    )

    return {
      success: true,
      data: {
        metrics: [
          { name: 'K-S 통계량 (D)', value: result.statistic.toFixed(4) },
          { name: 'p-value', value: formatPValue(result.pValue) },
          { name: '표본 크기', value: sample.length },
          { name: '비교 분포', value: distribution }
        ],
        tables: [
          {
            name: 'K-S 정규성 검정',
            data: [
              { 항목: 'K-S 통계량 (D)', 값: result.statistic.toFixed(4) },
              { 항목: 'p-value', 값: formatPValue(result.pValue) },
              { 항목: '유의수준 (α)', 값: alpha },
              {
                항목: '결론',
                값: result.isNormal
                  ? '정규분포를 따릅니다 (귀무가설 채택)'
                  : '정규분포를 따르지 않습니다 (귀무가설 기각)'
              }
            ]
          }
        ],
        interpretation
      }
    }
  }
}

/**
 * 부호 검정 (Sign Test)
 *
 * 대응표본의 중앙값 차이가 0인지 검정합니다.
 * Wilcoxon 검정의 비모수적 대안으로, 순위 정보 없이 부호만 사용합니다.
 *
 * @param context - 계산 컨텍스트
 * @param data - 분석 데이터
 * @param parameters - 분석 파라미터
 * @param parameters.column1 - 첫 번째 측정값 열
 * @param parameters.column2 - 두 번째 측정값 열
 * @param parameters.alternative - 대립가설 ('two-sided', 'greater', 'less')
 * @param parameters.alpha - 유의수준 (기본값: 0.05)
 *
 * @returns 부호 검정 결과
 */
const signTest = async (
  context: CalculatorContext,
  data: DataRow[],
  parameters: SignTestParams
): Promise<CalculationResult> => {
  const column1 = parameters.column1
  const column2 = parameters.column2
  const alternative = parameters.alternative || 'two-sided'
  const alpha = parameters.alpha || 0.05

  if (!column1 || !column2) {
    return {
      success: false,
      error: '두 개의 측정값 열을 선택하세요'
    }
  }

  const sample1 = extractNumericColumn(data, column1)
  const sample2 = extractNumericColumn(data, column2)

  if (sample1.length !== sample2.length) {
    return {
      success: false,
      error: '두 표본의 크기가 같아야 합니다 (대응표본)'
    }
  }

  if (sample1.length < 5) {
    return {
      success: false,
      error: '부호 검정은 최소 5쌍 이상의 관측치가 필요합니다'
    }
  }

  // Pyodide 호출
  let result
  try {
    result = await context.pyodideService.signTest(sample1, sample2, alternative)
  } catch (error) {
    return {
      success: false,
      error: `부호 검정 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`
    }
  }

  const interpretation = interpretSignTest(
    result.nPlus,
    result.nMinus,
    result.pValue,
    alpha,
    alternative
  )

  return {
    success: true,
    data: {
      metrics: [
        { name: '양의 차이 개수 (n+)', value: result.nPlus },
        { name: '음의 차이 개수 (n-)', value: result.nMinus },
        { name: '무차이 개수', value: result.nZero },
        { name: 'p-value', value: formatPValue(result.pValue) }
      ],
      tables: [
        {
          name: '부호 검정 결과',
          data: [
            { 항목: '양의 차이 (n+)', 값: result.nPlus },
            { 항목: '음의 차이 (n-)', 값: result.nMinus },
            { 항목: '무차이 (n0)', 값: result.nZero },
            { 항목: '유효 쌍 수', 값: result.nPlus + result.nMinus },
            { 항목: 'p-value', 값: formatPValue(result.pValue) },
            { 항목: '대립가설', 값: alternativeToKorean(alternative) },
            { 항목: '유의수준 (α)', 값: alpha },
            {
              항목: '결론',
              값: result.pValue < alpha
                ? '중앙값 차이가 0이 아닙니다 (귀무가설 기각)'
                : '중앙값 차이가 0입니다 (귀무가설 채택)'
            }
          ]
        }
      ],
      interpretation
    }
  }
}

/**
 * 런 검정 (Runs Test)
 *
 * 데이터의 무작위성을 검정합니다.
 * 중앙값 기준으로 위/아래로 나누어 런(연속된 구간)의 개수를 분석합니다.
 *
 * @param context - 계산 컨텍스트
 * @param data - 분석 데이터
 * @param parameters - 분석 파라미터
 * @param parameters.column - 검정할 열
 * @param parameters.alpha - 유의수준 (기본값: 0.05)
 *
 * @returns 런 검정 결과
 */
const runsTest = async (
  context: CalculatorContext,
  data: DataRow[],
  parameters: RunsTestParams
): Promise<CalculationResult> => {
  const column = parameters.column
  const alpha = parameters.alpha || 0.05

  if (!column) {
    return {
      success: false,
      error: '검정할 열을 선택하세요'
    }
  }

  const sample = extractNumericColumn(data, column)

  if (sample.length < 10) {
    return {
      success: false,
      error: '런 검정은 최소 10개 이상의 관측치가 필요합니다'
    }
  }

  // Pyodide 호출
  let result
  try {
    result = await context.pyodideService.runsTest(sample)
  } catch (error) {
    return {
      success: false,
      error: `런 검정 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`
    }
  }

  const interpretation = interpretRunsTest(
    result.nRuns,
    result.expectedRuns,
    result.pValue,
    alpha
  )

  return {
    success: true,
    data: {
      metrics: [
        { name: '관측 런 수', value: result.nRuns },
        { name: '기대 런 수', value: result.expectedRuns.toFixed(2) },
        { name: 'Z 통계량', value: result.zStatistic.toFixed(4) },
        { name: 'p-value', value: formatPValue(result.pValue) }
      ],
      tables: [
        {
          name: '런 검정 결과',
          data: [
            { 항목: '관측 런 수', 값: result.nRuns },
            { 항목: '기대 런 수', 값: result.expectedRuns.toFixed(2) },
            { 항목: '중앙값 이상 개수', 값: result.nAbove },
            { 항목: '중앙값 이하 개수', 값: result.nBelow },
            { 항목: 'Z 통계량', 값: result.zStatistic.toFixed(4) },
            { 항목: 'p-value', 값: formatPValue(result.pValue) },
            { 항목: '유의수준 (α)', 값: alpha },
            {
              항목: '결론',
              값: result.pValue < alpha
                ? '데이터가 무작위적이지 않습니다 (패턴 존재)'
                : '데이터가 무작위적입니다'
            }
          ]
        }
      ],
      interpretation
    }
  }
}

/**
 * McNemar 검정 (McNemar Test)
 *
 * 대응표본의 범주형 데이터에서 변화를 검정합니다.
 * 2x2 분할표에서 일치하지 않는 쌍의 비율을 비교합니다.
 *
 * @param context - 계산 컨텍스트
 * @param data - 분석 데이터
 * @param parameters - 분석 파라미터
 * @param parameters.before - 사전 측정 열 (범주형)
 * @param parameters.after - 사후 측정 열 (범주형)
 * @param parameters.successValue - 성공으로 간주할 값
 * @param parameters.correction - 연속성 수정 적용 여부 (기본값: true)
 * @param parameters.alpha - 유의수준 (기본값: 0.05)
 *
 * @returns McNemar 검정 결과
 */
const mcNemarTest = async (
  context: CalculatorContext,
  data: DataRow[],
  parameters: McNemarTestParams
): Promise<CalculationResult> => {
  const beforeCol = parameters.before
  const afterCol = parameters.after
  const successValue = parameters.successValue
  const correction = parameters.correction !== false
  const alpha = parameters.alpha || 0.05

  if (!beforeCol || !afterCol) {
    return {
      success: false,
      error: '사전/사후 측정 열을 모두 선택하세요'
    }
  }

  if (successValue === undefined || successValue === null) {
    return {
      success: false,
      error: '성공으로 간주할 값을 지정하세요'
    }
  }

  // 2x2 분할표 생성
  const beforeData = data.map(row => row[beforeCol])
  const afterData = data.map(row => row[afterCol])

  if (beforeData.length !== afterData.length) {
    return {
      success: false,
      error: '사전/사후 측정 데이터 크기가 같아야 합니다'
    }
  }

  // 분할표 계산
  let n11 = 0, n12 = 0, n21 = 0, n22 = 0
  for (let i = 0; i < beforeData.length; i++) {
    const b = beforeData[i] === successValue
    const a = afterData[i] === successValue

    if (b && a) n11++
    else if (b && !a) n12++
    else if (!b && a) n21++
    else n22++
  }

  const contingencyTable = [[n11, n12], [n21, n22]]

  if (n12 + n21 < 10) {
    return {
      success: false,
      error: 'McNemar 검정은 불일치 쌍이 최소 10개 이상 필요합니다'
    }
  }

  // Pyodide 호출
  let result
  try {
    result = await context.pyodideService.mcNemarTest(contingencyTable, correction)
  } catch (error) {
    return {
      success: false,
      error: `McNemar 검정 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`
    }
  }

  const interpretation = interpretMcNemarTest(n12, n21, result.pValue, alpha)

  return {
    success: true,
    data: {
      metrics: [
        { name: 'χ² 통계량', value: result.statistic.toFixed(4) },
        { name: 'p-value', value: formatPValue(result.pValue) },
        { name: '불일치 쌍 (b → c)', value: n12 },
        { name: '불일치 쌍 (c → b)', value: n21 }
      ],
      tables: [
        {
          name: '2×2 분할표',
          data: [
            { 구분: '사후: 성공', 사전_성공: n11, 사전_실패: n21, 합계: n11 + n21 },
            { 구분: '사후: 실패', 사전_성공: n12, 사전_실패: n22, 합계: n12 + n22 },
            { 구분: '합계', 사전_성공: n11 + n12, 사전_실패: n21 + n22, 합계: n11 + n12 + n21 + n22 }
          ]
        },
        {
          name: 'McNemar 검정 결과',
          data: [
            { 항목: 'χ² 통계량', 값: result.statistic.toFixed(4) },
            { 항목: 'p-value', 값: formatPValue(result.pValue) },
            { 항목: '연속성 수정', 값: correction ? '적용' : '미적용' },
            { 항목: '유의수준 (α)', 값: alpha },
            {
              항목: '결론',
              값: result.pValue < alpha
                ? '사전/사후 비율이 다릅니다 (변화 있음)'
                : '사전/사후 비율이 같습니다 (변화 없음)'
            }
          ]
        }
      ],
      interpretation
    }
  }
}

// ============================================================================
// 해석 헬퍼 함수
// ============================================================================

const interpretKSTest = (
  statistic: number,
  pValue: number,
  alpha: number,
  testType: 'normality' | 'two-sample'
): string => {
  let interpretation = `K-S 통계량은 ${statistic.toFixed(4)}이며, p-value는 ${formatPValue(pValue)}입니다.\n\n`

  if (testType === 'normality') {
    if (pValue >= alpha) {
      interpretation += `유의수준 ${alpha}에서 데이터가 정규분포를 따른다고 볼 수 있습니다 (p ≥ ${alpha}).`
    } else {
      interpretation += `유의수준 ${alpha}에서 데이터가 정규분포를 따르지 않습니다 (p < ${alpha}).`
    }
  } else {
    if (pValue >= alpha) {
      interpretation += `유의수준 ${alpha}에서 두 표본이 같은 분포를 따른다고 볼 수 있습니다 (p ≥ ${alpha}).`
    } else {
      interpretation += `유의수준 ${alpha}에서 두 표본의 분포가 다릅니다 (p < ${alpha}).`
    }
  }

  return interpretation
}

const interpretSignTest = (
  nPlus: number,
  nMinus: number,
  pValue: number,
  alpha: number,
  alternative: string
): string => {
  const total = nPlus + nMinus
  let interpretation = `${total}개의 유효 쌍 중 ${nPlus}개는 양의 차이, ${nMinus}개는 음의 차이를 보입니다.\n\n`

  if (pValue < alpha) {
    interpretation += `p-value ${formatPValue(pValue)}는 유의수준 ${alpha}보다 작으므로, `
    if (alternative === 'two-sided') {
      interpretation += `두 측정값의 중앙값이 다르다고 결론 내릴 수 있습니다.`
    } else if (alternative === 'greater') {
      interpretation += `첫 번째 측정값이 두 번째보다 크다고 결론 내릴 수 있습니다.`
    } else {
      interpretation += `첫 번째 측정값이 두 번째보다 작다고 결론 내릴 수 있습니다.`
    }
  } else {
    interpretation += `p-value ${formatPValue(pValue)}는 유의수준 ${alpha}보다 크므로, 중앙값 차이가 없다고 볼 수 있습니다.`
  }

  return interpretation
}

const interpretRunsTest = (
  nRuns: number,
  expectedRuns: number,
  pValue: number,
  alpha: number
): string => {
  let interpretation = `관측된 런의 개수는 ${nRuns}개이며, 기대되는 런의 개수는 ${expectedRuns.toFixed(1)}개입니다.\n\n`

  if (pValue < alpha) {
    if (nRuns < expectedRuns) {
      interpretation += `관측 런 수가 기대보다 적으므로, 데이터에 **추세(trend) 또는 군집(clustering)** 패턴이 있습니다.`
    } else {
      interpretation += `관측 런 수가 기대보다 많으므로, 데이터가 **과도하게 진동(oscillation)**하는 패턴을 보입니다.`
    }
  } else {
    interpretation += `p-value ${formatPValue(pValue)}는 유의수준 ${alpha}보다 크므로, 데이터가 무작위적이라고 볼 수 있습니다.`
  }

  return interpretation
}

const interpretMcNemarTest = (
  n12: number,
  n21: number,
  pValue: number,
  alpha: number
): string => {
  const total = n12 + n21
  let interpretation = `불일치 쌍은 총 ${total}개이며, `
  interpretation += `이 중 ${n12}개는 사전 성공 → 사후 실패, ${n21}개는 사전 실패 → 사후 성공입니다.\n\n`

  if (pValue < alpha) {
    interpretation += `p-value ${formatPValue(pValue)}는 유의수준 ${alpha}보다 작으므로, 사전/사후 측정 간 유의한 변화가 있습니다.`
  } else {
    interpretation += `p-value ${formatPValue(pValue)}는 유의수준 ${alpha}보다 크므로, 사전/사후 측정 간 유의한 변화가 없습니다.`
  }

  return interpretation
}

const alternativeToKorean = (alternative: string): string => {
  switch (alternative) {
    case 'two-sided':
      return '양측 검정 (중앙값 차이 ≠ 0)'
    case 'greater':
      return '우측 검정 (중앙값1 > 중앙값2)'
    case 'less':
      return '좌측 검정 (중앙값1 < 중앙값2)'
    default:
      return alternative
  }
}
