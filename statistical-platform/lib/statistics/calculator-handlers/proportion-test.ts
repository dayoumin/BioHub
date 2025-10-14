/**
 * 비율 검정 핸들러
 *
 * 일표본/이표본 비율 검정 메서드
 */

import type { CalculatorContext, HandlerMap, CalculationResult, DataRow } from '../calculator-types'

import type { OneSampleProportionTestParams } from '../method-parameter-types'
export const createProportionTestHandlers = (context: CalculatorContext): HandlerMap => ({
  oneSampleProportionTest: (data, parameters) => oneSampleProportionTest(context, data, parameters)
})

/**
 * 일표본 비율 검정 (One-Sample Proportion Test)
 *
 * 표본 비율이 특정 값과 같은지 검정합니다.
 * 이항 검정(정확 검정)과 Z-검정(정규 근사) 결과를 모두 제공합니다.
 *
 * @param context - 계산 컨텍스트
 * @param data - 분석 데이터 (범주형 변수 포함)
 * @param parameters - 분석 파라미터
 * @param parameters.variable - 검정할 범주형 변수명
 * @param parameters.successValue - 성공으로 간주할 값
 * @param parameters.nullProportion - 귀무가설 비율 (기본값: 0.5)
 * @param parameters.alternative - 대립가설 ('two-sided', 'greater', 'less')
 * @param parameters.alpha - 유의수준 (기본값: 0.05)
 *
 * @returns 비율 검정 결과
 *
 * @example
 * ```typescript
 * // 동전 던지기 공정성 검정
 * const data = [
 *   { result: '앞면' },
 *   { result: '뒷면' },
 *   { result: '앞면' }
 *   // ... 100번
 * ]
 *
 * const result = await oneSampleProportionTest(context, data, {
 *   variable: 'result',
 *   successValue: '앞면',
 *   nullProportion: 0.5,
 *   alternative: 'two-sided'
 * })
 * ```
 */
const oneSampleProportionTest = async (
  context: CalculatorContext,
  data: DataRow[],
  parameters: OneSampleProportionTestParams
): Promise<CalculationResult> => {
  const variable = parameters.variable
  const successValue = parameters.successValue
  const nullProportion = parameters.nullProportion ?? 0.5
  const alternative = parameters.alternative || 'two-sided'
  const alpha = parameters.alpha || 0.05

  // 파라미터 검증
  if (!variable) {
    return {
      success: false,
      error: '검정할 변수를 선택하세요'
    }
  }

  if (successValue === undefined || successValue === null) {
    return {
      success: false,
      error: '성공으로 간주할 값을 지정하세요'
    }
  }

  if (nullProportion <= 0 || nullProportion >= 1) {
    return {
      success: false,
      error: '귀무가설 비율은 0과 1 사이의 값이어야 합니다'
    }
  }

  // 데이터 추출
  const values = data
    .map(row => row[variable])
    .filter(val => val !== null && val !== undefined)

  if (values.length === 0) {
    return {
      success: false,
      error: '유효한 데이터가 없습니다'
    }
  }

  // 성공 횟수 계산
  const successCount = values.filter(val => val === successValue).length
  const totalCount = values.length

  if (totalCount < 10) {
    return {
      success: false,
      error: '비율 검정은 최소 10개 이상의 관측치가 필요합니다'
    }
  }

  // Pyodide 호출
  let result
  try {
    result = await context.pyodideService.oneSampleProportionTest(
      successCount,
      totalCount,
      nullProportion,
      alternative,
      alpha
    )
  } catch (error) {
    return {
      success: false,
      error: `비율 검정 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`
    }
  }

  // 결과 해석
  const interpretation = interpretProportionTest(
    result.sampleProportion,
    result.nullProportion,
    result.pValueExact,
    alpha,
    alternative
  )

  // 검정 방법 권장
  const expectedSuccess = totalCount * nullProportion
  const expectedFailure = totalCount * (1 - nullProportion)
  const useExact = expectedSuccess < 10 || expectedFailure < 10

  return {
    success: true,
    data: {
      metrics: [
        { name: '표본 비율', value: (result.sampleProportion * 100).toFixed(2) + '%' },
        { name: '귀무가설 비율', value: (result.nullProportion * 100).toFixed(2) + '%' },
        { name: '성공 횟수', value: result.successCount },
        { name: '전체 시행 횟수', value: result.totalCount },
        { name: 'Z 통계량', value: result.zStatistic.toFixed(4) },
        { name: 'p-value (정확 검정)', value: result.pValueExact.toFixed(4) },
        { name: 'p-value (정규 근사)', value: result.pValueApprox.toFixed(4) }
      ],
      tables: [
        {
          name: '비율 검정 결과',
          data: [
            { 항목: '표본 비율 (p̂)', 값: (result.sampleProportion * 100).toFixed(2) + '%' },
            { 항목: '귀무가설 비율 (p₀)', 값: (result.nullProportion * 100).toFixed(2) + '%' },
            { 항목: '성공 횟수', 값: result.successCount },
            { 항목: '전체 시행 횟수', 값: result.totalCount },
            { 항목: 'Z 통계량', 값: result.zStatistic.toFixed(4) },
            { 항목: 'p-value (정확 검정)', 값: result.pValueExact.toFixed(4) },
            { 항목: 'p-value (정규 근사)', 값: result.pValueApprox.toFixed(4) },
            { 항목: '대립가설', 값: alternativeToKorean(alternative) },
            { 항목: '유의수준 (α)', 값: alpha },
            {
              항목: '결론',
              값: result.significant
                ? `귀무가설 기각 (p < ${alpha})`
                : `귀무가설 채택 (p ≥ ${alpha})`
            }
          ]
        },
        {
          name: `신뢰구간 (${(result.confidenceInterval.level * 100).toFixed(0)}%)`,
          data: [
            { 항목: '하한', 값: (result.confidenceInterval.lower * 100).toFixed(2) + '%' },
            { 항목: '상한', 값: (result.confidenceInterval.upper * 100).toFixed(2) + '%' },
            {
              항목: '방법',
              값: 'Wilson Score Interval (정확도 높음)'
            }
          ]
        },
        {
          name: '검정 방법 권장',
          data: [
            {
              항목: '정확 검정 사용 권장',
              값: useExact ? '예 (기대빈도 < 10)' : '아니오 (정규 근사 사용 가능)'
            },
            { 항목: '기대 성공 횟수', 값: expectedSuccess.toFixed(1) },
            { 항목: '기대 실패 횟수', 값: expectedFailure.toFixed(1) }
          ]
        }
      ],
      interpretation
    }
  }
}

/**
 * 비율 검정 결과 해석
 */
const interpretProportionTest = (
  sampleP: number,
  nullP: number,
  pValue: number,
  alpha: number,
  alternative: string
): string => {
  const samplePercent = (sampleP * 100).toFixed(1)
  const nullPercent = (nullP * 100).toFixed(1)

  let interpretation = `표본 비율은 ${samplePercent}%이며, 귀무가설 비율 ${nullPercent}%와 비교했을 때 `

  if (pValue < alpha) {
    interpretation += `통계적으로 유의한 차이가 있습니다 (p = ${pValue.toFixed(4)} < ${alpha}).\n\n`

    if (alternative === 'two-sided') {
      interpretation += `표본 비율이 귀무가설 비율과 다르다는 충분한 증거가 있습니다.`
    } else if (alternative === 'greater') {
      interpretation += `표본 비율이 귀무가설 비율보다 크다는 충분한 증거가 있습니다.`
    } else {
      interpretation += `표본 비율이 귀무가설 비율보다 작다는 충분한 증거가 있습니다.`
    }
  } else {
    interpretation += `통계적으로 유의한 차이가 없습니다 (p = ${pValue.toFixed(4)} ≥ ${alpha}).\n\n`
    interpretation += `귀무가설을 기각할 충분한 증거가 없으므로, 표본 비율이 ${nullPercent}%와 다르다고 결론 내릴 수 없습니다.`
  }

  return interpretation
}

/**
 * 대립가설 방향을 한글로 변환
 */
const alternativeToKorean = (alternative: string): string => {
  switch (alternative) {
    case 'two-sided':
      return '양측 검정 (p ≠ p₀)'
    case 'greater':
      return '우측 검정 (p > p₀)'
    case 'less':
      return '좌측 검정 (p < p₀)'
    default:
      return alternative
  }
}
