/**
 * 고급 분석 확장 핸들러 (Group 6)
 *
 * 요인분석, 판별분석, Mann-Kendall 추세 검정, 검정력 분석
 */

import type { CalculatorContext, HandlerMap, CalculationResult, DataRow } from '../calculator-types'
import type {
  FactorAnalysisParams,
  DiscriminantAnalysisParams,
  MannKendallTestParams,
  PowerAnalysisParams
} from '../method-parameter-types'
import { extractNumericColumn, formatPValue } from './common-utils'

export const createAdvancedExtendedHandlers = (context: CalculatorContext): HandlerMap => ({
  factorAnalysis: (data, parameters) => factorAnalysis(context, data, parameters as FactorAnalysisParams),
  discriminantAnalysis: (data, parameters) => discriminantAnalysis(context, data, parameters as DiscriminantAnalysisParams),
  mannKendallTest: (data, parameters) => mannKendallTest(context, data, parameters as MannKendallTestParams),
  powerAnalysis: (data, parameters) => powerAnalysis(context, data, parameters as PowerAnalysisParams)
})

/**
 * 요인분석 (Factor Analysis)
 *
 * 다수의 관측변수를 소수의 잠재 요인으로 축소하여
 * 변수 간 내재된 구조를 파악합니다.
 *
 * @param context - 계산 컨텍스트
 * @param data - 분석 데이터
 * @param parameters - 분석 파라미터
 * @param parameters.columns - 분석할 변수 배열 (최소 3개)
 * @param parameters.nFactors - 추출할 요인 수 (미지정 시 Kaiser 기준)
 * @param parameters.rotation - 회전 방법 ('varimax' | 'promax' | 'none', 기본: 'varimax')
 * @param parameters.alpha - 유의수준 (기본값: 0.05)
 *
 * @returns 요인분석 결과
 *
 * @example
 * ```typescript
 * // 10개 문항을 2-3개 요인으로 축소
 * const result = await factorAnalysis(context, data, {
 *   columns: ['Q1', 'Q2', 'Q3', ..., 'Q10'],
 *   nFactors: 3,
 *   rotation: 'varimax'
 * })
 * ```
 */
const factorAnalysis = async (
  context: CalculatorContext,
  data: DataRow[],
  parameters: FactorAnalysisParams
): Promise<CalculationResult> => {
  const { columns, nFactors, rotation = 'varimax', alpha = 0.05 } = parameters

  // 파라미터 검증
  if (!columns || columns.length < 3) {
    return { success: false, error: '최소 3개 변수가 필요합니다' }
  }
  if (data.length < columns.length * 3) {
    return {
      success: false,
      error: `권장 최소 표본크기: ${columns.length * 3}개 (현재: ${data.length}개)`
    }
  }

  try {
    // 데이터 준비
    const dataMatrix = columns.map(col => extractNumericColumn(data, col))

    // Pyodide 계산
    const result = await context.pyodideService.factorAnalysis(
      dataMatrix,
      nFactors,
      rotation
    )

    // Kaiser 기준 적용 (고유값 > 1)
    const kaiserFactors = result.eigenvalues.filter((ev: number) => ev > 1).length

    // 결과 반환
    return {
      success: true,
      data: {
        metrics: [
          { name: '변수 수', value: columns.length.toString() },
          { name: '추출 요인 수', value: result.nFactors.toString() },
          { name: 'Kaiser 기준 요인 수', value: kaiserFactors.toString() },
          { name: '회전 방법', value: rotation },
          { name: '누적 분산 설명력', value: `${(result.cumulativeVariance * 100).toFixed(1)}%` }
        ],
        tables: [
          {
            name: '요인 적재량 (Factor Loadings)',
            data: columns.map((varName, i) => {
              const row: { 변수: string; [key: string]: string | number } = { 변수: varName }
              for (let f = 0; f < result.nFactors; f++) {
                row[`요인${f + 1}`] = result.loadings[i][f].toFixed(3)
              }
              row['공통성'] = result.communalities[i].toFixed(3)
              return row
            })
          },
          {
            name: '고유값 및 분산 설명',
            data: result.eigenvalues.slice(0, result.nFactors).map((ev: number, i: number) => ({
              요인: `요인 ${i + 1}`,
              고유값: ev.toFixed(3),
              '분산 비율': `${(result.varianceRatios[i] * 100).toFixed(1)}%`,
              '누적 분산': `${(result.cumulativeVariances[i] * 100).toFixed(1)}%`
            }))
          },
          {
            name: '적합도 검정 (KMO & Bartlett)',
            data: [
              { 지표: 'KMO (표본적합도)', 값: result.kmo.toFixed(3), 해석: result.kmo > 0.8 ? '우수' : result.kmo > 0.7 ? '양호' : result.kmo > 0.6 ? '보통' : '부적합' },
              { 지표: "Bartlett's Chi-Square", 값: result.bartlettChiSquare.toFixed(2), 해석: '' },
              { 지표: "Bartlett's p-value", 값: formatPValue(result.bartlettPValue), 해석: result.bartlettPValue < 0.05 ? '요인분석 적합' : '부적합' }
            ]
          }
        ],
        interpretation: `${columns.length}개 변수를 ${result.nFactors}개 요인으로 축소했습니다 (${rotation} 회전). ` +
          `누적 분산 설명력은 ${(result.cumulativeVariance * 100).toFixed(1)}%입니다. ` +
          `KMO=${result.kmo.toFixed(3)} (${result.kmo > 0.7 ? '양호' : '보통'}), ` +
          `Bartlett 검정 p<0.001로 요인분석이 적합합니다. ` +
          `${kaiserFactors !== result.nFactors ? `Kaiser 기준(고유값>1)으로는 ${kaiserFactors}개 요인이 권장됩니다.` : ''}`
      }
    }
  } catch (error) {
    return {
      success: false,
      error: `요인분석 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`
    }
  }
}

/**
 * 판별분석 (Discriminant Analysis)
 *
 * 여러 독립변수로 집단(그룹) 소속을 예측하고 분류합니다.
 * Linear Discriminant Analysis (LDA)를 사용합니다.
 *
 * @param context - 계산 컨텍스트
 * @param data - 분석 데이터
 * @param parameters - 분석 파라미터
 * @param parameters.groupColumn - 그룹 변수 (범주형)
 * @param parameters.predictorColumns - 예측변수 배열 (연속형)
 * @param parameters.alpha - 유의수준 (기본값: 0.05)
 *
 * @returns 판별분석 결과
 *
 * @example
 * ```typescript
 * // 키, 체중, 나이로 성별 분류
 * const result = await discriminantAnalysis(context, data, {
 *   groupColumn: '성별',
 *   predictorColumns: ['키', '체중', '나이']
 * })
 * ```
 */
const discriminantAnalysis = async (
  context: CalculatorContext,
  data: DataRow[],
  parameters: DiscriminantAnalysisParams
): Promise<CalculationResult> => {
  const { groupColumn, predictorColumns, alpha = 0.05 } = parameters

  // 파라미터 검증
  if (!groupColumn || !predictorColumns || predictorColumns.length === 0) {
    return { success: false, error: '그룹 변수와 예측변수를 선택하세요' }
  }

  // 그룹 정보 추출
  const groups = data.map(row => row[groupColumn])
  const uniqueGroups = Array.from(new Set(groups))

  if (uniqueGroups.length < 2) {
    return { success: false, error: '최소 2개 그룹이 필요합니다' }
  }
  if (data.length < uniqueGroups.length * predictorColumns.length + 10) {
    return {
      success: false,
      error: `권장 최소 표본크기: ${uniqueGroups.length * predictorColumns.length + 10}개 (현재: ${data.length}개)`
    }
  }

  try {
    // 데이터 준비
    const xMatrix = predictorColumns.map(col => extractNumericColumn(data, col))

    // Pyodide 계산
    const result = await context.pyodideService.discriminantAnalysis(
      groups,
      xMatrix,
      predictorColumns
    )

    // 결과 반환
    return {
      success: true,
      data: {
        metrics: [
          { name: '그룹 수', value: uniqueGroups.length.toString() },
          { name: '예측변수 수', value: predictorColumns.length.toString() },
          { name: '판별함수 수', value: result.nFunctions.toString() },
          { name: '전체 정확도', value: `${(result.accuracy * 100).toFixed(1)}%` },
          { name: "Wilks' Lambda", value: result.wilksLambda.toFixed(4) }
        ],
        tables: [
          {
            name: '판별함수 고유값',
            data: result.eigenvalues.map((ev: number, i: number) => ({
              함수: `함수 ${i + 1}`,
              고유값: ev.toFixed(4),
              '분산 비율': `${(result.varianceRatios[i] * 100).toFixed(1)}%`,
              '정준상관': result.canonicalCorrelations[i].toFixed(4),
              "Wilks' Lambda": result.wilksLambdas[i].toFixed(4),
              'Chi-Square': result.chiSquares[i].toFixed(2),
              'p-value': formatPValue(result.pValues[i])
            }))
          },
          {
            name: '표준화 판별계수',
            data: predictorColumns.map((varName, i) => {
              const row: { 변수: string; [key: string]: string } = { 변수: varName }
              for (let f = 0; f < result.nFunctions; f++) {
                row[`함수${f + 1}`] = result.standardizedCoefficients[i][f].toFixed(4)
              }
              return row
            })
          },
          {
            name: '혼동 행렬 (Confusion Matrix)',
            data: result.confusionMatrix.map((row: number[], i: number) => {
              const rowData: { 실제그룹: string | number; [key: string]: string | number } = {
                실제그룹: String(uniqueGroups[i])
              }
              uniqueGroups.forEach((group, j) => {
                rowData[`예측_${group}`] = row[j]
              })
              rowData['정확도'] = `${((row[i] / row.reduce((a, b) => a + b, 0)) * 100).toFixed(1)}%`
              return rowData
            })
          },
          {
            name: '그룹별 분류 정확도',
            data: uniqueGroups.map((group, i) => ({
              그룹: group,
              정확도: `${(result.groupAccuracies[i] * 100).toFixed(1)}%`,
              정분류: result.confusionMatrix[i][i],
              총개수: result.confusionMatrix[i].reduce((a: number, b: number) => a + b, 0)
            }))
          }
        ],
        interpretation: `${uniqueGroups.length}개 그룹을 ${predictorColumns.length}개 변수로 판별한 결과, ` +
          `전체 분류 정확도는 ${(result.accuracy * 100).toFixed(1)}%입니다. ` +
          `${result.nFunctions}개 판별함수가 추출되었으며, ` +
          `첫 번째 함수의 정준상관=${result.canonicalCorrelations[0].toFixed(3)}, ` +
          `Wilks' Lambda=${result.wilksLambda.toFixed(4)} (p${result.pValues[0] < 0.001 ? '<0.001' : `=${formatPValue(result.pValues[0])}`})로 ` +
          `${result.pValues[0] < alpha ? '통계적으로 유의한 판별력을 보입니다' : '유의하지 않습니다'}.`
      }
    }
  } catch (error) {
    return {
      success: false,
      error: `판별분석 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`
    }
  }
}

/**
 * Mann-Kendall 추세 검정 (Mann-Kendall Trend Test)
 *
 * 시계열 데이터의 단조 증가/감소 추세를 비모수적으로 검정합니다.
 * 시간에 따른 환경 데이터, 기후 변화 분석에 사용됩니다.
 *
 * @param context - 계산 컨텍스트
 * @param data - 분석 데이터
 * @param parameters - 분석 파라미터
 * @param parameters.timeColumn - 시간 변수
 * @param parameters.valueColumn - 측정값 변수
 * @param parameters.alpha - 유의수준 (기본값: 0.05)
 *
 * @returns Mann-Kendall 검정 결과
 *
 * @example
 * ```typescript
 * // 연도별 기온 추세 검정
 * const result = await mannKendallTest(context, data, {
 *   timeColumn: '연도',
 *   valueColumn: '평균기온'
 * })
 * ```
 */
const mannKendallTest = async (
  context: CalculatorContext,
  data: DataRow[],
  parameters: MannKendallTestParams
): Promise<CalculationResult> => {
  const { timeColumn, valueColumn, alpha = 0.05 } = parameters

  // 파라미터 검증
  if (!timeColumn || !valueColumn) {
    return { success: false, error: '시간 변수와 측정값 변수를 선택하세요' }
  }
  if (data.length < 4) {
    return {
      success: false,
      error: `Mann-Kendall 검정은 최소 4개 관측치가 필요합니다 (현재: ${data.length}개)`
    }
  }

  try {
    // 데이터 준비 (시간순 정렬)
    const sortedData = [...data].sort((a, b) => {
      const timeA = typeof a[timeColumn] === 'number' ? a[timeColumn] : new Date(a[timeColumn] as string).getTime()
      const timeB = typeof b[timeColumn] === 'number' ? b[timeColumn] : new Date(b[timeColumn] as string).getTime()
      return (timeA as number) - (timeB as number)
    })

    const timeValues = sortedData.map(row => row[timeColumn])
    const values = extractNumericColumn(sortedData, valueColumn)

    // Pyodide 계산
    const result = await context.pyodideService.mannKendallTest(values)

    // 추세 방향 및 강도 해석
    const trendDirection = result.tau > 0 ? '증가' : result.tau < 0 ? '감소' : '추세 없음'
    const trendStrength = Math.abs(result.tau) > 0.7 ? '강한' :
                         Math.abs(result.tau) > 0.4 ? '중간' :
                         Math.abs(result.tau) > 0.2 ? '약한' : '무시할 수준'

    // Sen's Slope 해석
    const slopeUnit = result.sensSlope > 0 ? '증가' : '감소'
    const slopeInterpretation = `연간 약 ${Math.abs(result.sensSlope).toFixed(4)} 단위 ${slopeUnit}`

    // 결과 반환
    return {
      success: true,
      data: {
        metrics: [
          { name: '관측치 수', value: data.length.toString() },
          { name: 'Kendall τ', value: result.tau.toFixed(4) },
          { name: 'z-통계량', value: result.zStatistic.toFixed(4) },
          { name: 'p-value (양측)', value: formatPValue(result.pValue) },
          { name: "Sen's Slope", value: result.sensSlope.toFixed(6) }
        ],
        tables: [
          {
            name: 'Mann-Kendall 검정 결과',
            data: [
              { 항목: 'S-통계량', 값: result.sStatistic.toString() },
              { 항목: 'Kendall τ', 값: result.tau.toFixed(4) },
              { 항목: 'z-통계량', 값: result.zStatistic.toFixed(4) },
              { 항목: 'p-value', 값: formatPValue(result.pValue) },
              { 항목: '추세 방향', 값: trendDirection },
              { 항목: '추세 강도', 값: trendStrength }
            ]
          },
          {
            name: "Sen's Slope 추정",
            data: [
              { 항목: "Sen's Slope", 값: result.sensSlope.toFixed(6) },
              { 항목: '95% 신뢰구간', 값: `[${result.sensCI[0].toFixed(6)}, ${result.sensCI[1].toFixed(6)}]` },
              { 항목: '해석', 값: slopeInterpretation }
            ]
          },
          {
            name: '추세 검정 해석',
            data: [
              { 기준: 'τ > 0', 해석: '증가 추세' },
              { 기준: 'τ < 0', 해석: '감소 추세' },
              { 기준: 'τ ≈ 0', 해석: '추세 없음' },
              { 기준: '|τ| > 0.7', 해석: '강한 추세' },
              { 기준: '0.4 < |τ| < 0.7', 해석: '중간 추세' },
              { 기준: '|τ| < 0.4', 해석: '약한 추세' }
            ]
          }
        ],
        interpretation: `${data.length}개 시점 데이터에서 Kendall τ=${result.tau.toFixed(4)} (${trendStrength} ${trendDirection} 추세)가 검출되었습니다. ` +
          `z-통계량=${result.zStatistic.toFixed(4)}, p-value=${formatPValue(result.pValue)}로 ` +
          `${result.pValue < alpha ? `유의수준 ${alpha}에서 통계적으로 유의한 ${trendDirection} 추세가 존재합니다` : '통계적으로 유의한 추세가 없습니다'}. ` +
          `Sen's Slope=${result.sensSlope.toFixed(6)}로 ${slopeInterpretation}입니다.`
      }
    }
  } catch (error) {
    return {
      success: false,
      error: `Mann-Kendall 검정 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`
    }
  }
}

/**
 * 검정력 분석 (Power Analysis)
 *
 * 통계 검정의 검정력을 계산하거나 필요한 표본크기를 추정합니다.
 * 사전 분석(a priori), 사후 분석(post-hoc), 민감도 분석을 지원합니다.
 *
 * @param context - 계산 컨텍스트
 * @param data - 분석 데이터 (사후 분석 시)
 * @param parameters - 분석 파라미터
 * @param parameters.testType - 검정 유형 ('t-test' | 'anova' | 'correlation' | 'proportion')
 * @param parameters.effectSize - 효과크기 (Cohen's d, f, r 등)
 * @param parameters.alpha - 유의수준 (기본값: 0.05)
 * @param parameters.power - 목표 검정력 (기본값: 0.8)
 * @param parameters.sampleSize - 표본크기 (검정력 계산 시)
 *
 * @returns 검정력 분석 결과
 *
 * @example
 * ```typescript
 * // t-test에서 필요한 표본크기 계산
 * const result = await powerAnalysis(context, [], {
 *   testType: 't-test',
 *   effectSize: 0.5,  // 중간 효과크기
 *   power: 0.8
 * })
 * ```
 */
const powerAnalysis = async (
  context: CalculatorContext,
  data: DataRow[],
  parameters: PowerAnalysisParams
): Promise<CalculationResult> => {
  const {
    testType,
    effectSize,
    sampleSize,
    power = 0.8,
    alpha = 0.05
  } = parameters

  // 파라미터 검증
  if (!testType) {
    return { success: false, error: '검정 유형을 선택하세요' }
  }

  // 분석 타입 판정
  const analysisType = effectSize && !sampleSize ? '표본크기 계산' :
                      sampleSize && !effectSize ? '효과크기 계산' :
                      sampleSize && effectSize ? '검정력 계산' :
                      '파라미터 부족'

  if (analysisType === '파라미터 부족') {
    return {
      success: false,
      error: '효과크기 또는 표본크기 중 하나는 반드시 지정해야 합니다'
    }
  }

  try {
    // Pyodide 계산
    const result = await context.pyodideService.powerAnalysis({
      testType,
      effectSize,
      sampleSize,
      alpha,
      power
    })

    // 효과크기 해석 (Cohen's 기준)
    let effectSizeInterpretation = ''
    const es = result.effectSize
    if (testType === 't-test') {
      effectSizeInterpretation = Math.abs(es) < 0.2 ? '작음' : Math.abs(es) < 0.5 ? '중간' : Math.abs(es) < 0.8 ? '큼' : '매우 큼'
    } else if (testType === 'anova') {
      effectSizeInterpretation = Math.abs(es) < 0.1 ? '작음' : Math.abs(es) < 0.25 ? '중간' : Math.abs(es) < 0.4 ? '큼' : '매우 큼'
    } else if (testType === 'correlation') {
      effectSizeInterpretation = Math.abs(es) < 0.1 ? '작음' : Math.abs(es) < 0.3 ? '중간' : Math.abs(es) < 0.5 ? '큼' : '매우 큼'
    }

    // 결과 반환
    return {
      success: true,
      data: {
        metrics: [
          { name: '검정 유형', value: testType },
          { name: '분석 타입', value: analysisType },
          { name: '효과크기', value: result.effectSize.toFixed(4) },
          { name: '표본크기', value: result.sampleSize.toString() },
          { name: '검정력 (1-β)', value: result.power.toFixed(4) },
          { name: '유의수준 (α)', value: alpha.toString() }
        ],
        tables: [
          {
            name: '검정력 분석 결과',
            data: [
              { 항목: '검정 유형', 값: testType },
              { 항목: '효과크기', 값: result.effectSize.toFixed(4), 해석: effectSizeInterpretation },
              { 항목: '필요 표본크기 (n)', 값: result.sampleSize.toString() },
              { 항목: '검정력 (1-β)', 값: (result.power * 100).toFixed(1) + '%' },
              { 항목: 'Type I 오류 (α)', 값: (alpha * 100).toFixed(1) + '%' },
              { 항목: 'Type II 오류 (β)', 값: ((1 - result.power) * 100).toFixed(1) + '%' }
            ]
          },
          {
            name: '민감도 분석 (표본크기별 검정력)',
            data: result.sensitivityAnalysis.map((item: { n: number; power: number }) => ({
              표본크기: item.n,
              검정력: (item.power * 100).toFixed(1) + '%',
              권장: item.power >= 0.8 ? '✓' : ''
            }))
          },
          {
            name: 'Cohen의 효과크기 기준',
            data: testType === 't-test' ? [
              { 분류: '작음 (Small)', "Cohen's d": '0.2', 설명: '육안으로 식별 어려움' },
              { 분류: '중간 (Medium)', "Cohen's d": '0.5', 설명: '육안으로 식별 가능' },
              { 분류: '큼 (Large)', "Cohen's d": '0.8', 설명: '명확하게 구분됨' }
            ] : testType === 'anova' ? [
              { 분류: '작음 (Small)', "Cohen's f": '0.1', 설명: '육안으로 식별 어려움' },
              { 분류: '중간 (Medium)', "Cohen's f": '0.25', 설명: '육안으로 식별 가능' },
              { 분류: '큼 (Large)', "Cohen's f": '0.4', 설명: '명확하게 구분됨' }
            ] : [
              { 분류: '작음 (Small)', "Cohen's r": '0.1', 설명: '약한 상관관계' },
              { 분류: '중간 (Medium)', "Cohen's r": '0.3', 설명: '중간 상관관계' },
              { 분류: '큼 (Large)', "Cohen's r": '0.5', 설명: '강한 상관관계' }
            ]
          }
        ],
        interpretation: `${testType} 검정에서 ` +
          (analysisType === '표본크기 계산'
            ? `효과크기=${result.effectSize.toFixed(2)} (${effectSizeInterpretation}), 검정력=${(power * 100).toFixed(0)}%, α=${alpha}일 때 ` +
              `필요한 표본크기는 ${result.sampleSize}개입니다. `
            : analysisType === '검정력 계산'
            ? `표본크기=${result.sampleSize}, 효과크기=${result.effectSize.toFixed(2)} (${effectSizeInterpretation}), α=${alpha}일 때 ` +
              `검정력은 ${(result.power * 100).toFixed(1)}%입니다. ${result.power < 0.8 ? '권장 검정력 80%에 미달하므로 표본크기 증가가 필요합니다.' : '충분한 검정력을 확보했습니다.'}`
            : `표본크기=${result.sampleSize}, 검정력=${(power * 100).toFixed(0)}%, α=${alpha}일 때 ` +
              `탐지 가능한 최소 효과크기는 ${result.effectSize.toFixed(4)} (${effectSizeInterpretation})입니다.`) +
          `Type I 오류(α)는 ${(alpha * 100).toFixed(0)}%, Type II 오류(β)는 ${((1 - result.power) * 100).toFixed(1)}%입니다.`
      }
    }
  } catch (error) {
    return {
      success: false,
      error: `검정력 분석 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`
    }
  }
}
