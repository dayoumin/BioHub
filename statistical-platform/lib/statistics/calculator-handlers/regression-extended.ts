/**
 * 회귀분석 확장 핸들러 (Group 5)
 *
 * 부분상관, Poisson 회귀, 순서형 회귀, 단계적 회귀, 용량-반응, 반응표면 분석
 */

import type { CalculatorContext, HandlerMap, CalculationResult, DataRow } from '../calculator-types'
import type {
  PartialCorrelationParams,
  PoissonRegressionParams,
  OrdinalRegressionParams,
  StepwiseRegressionParams,
  DoseResponseParams,
  ResponseSurfaceParams
} from '../method-parameter-types'
import { extractNumericColumn, formatPValue } from './common-utils'

export const createRegressionExtendedHandlers = (context: CalculatorContext): HandlerMap => ({
  partialCorrelation: (data, parameters) => partialCorrelation(context, data, parameters as PartialCorrelationParams),
  poissonRegression: (data, parameters) => poissonRegression(context, data, parameters as PoissonRegressionParams),
  ordinalRegression: (data, parameters) => ordinalRegression(context, data, parameters as OrdinalRegressionParams),
  stepwiseRegression: (data, parameters) => stepwiseRegression(context, data, parameters as StepwiseRegressionParams),
  doseResponse: (data, parameters) => doseResponse(context, data, parameters as DoseResponseParams),
  responseSurface: (data, parameters) => responseSurface(context, data, parameters as ResponseSurfaceParams)
})

/**
 * 부분상관분석 (Partial Correlation)
 *
 * 하나 이상의 통제변수를 제거한 후 두 변수 간 순수 상관관계를 분석합니다.
 * 제3의 변수가 두 변수에 미치는 영향을 제거하여 실제 관계를 파악합니다.
 *
 * @param context - 계산 컨텍스트
 * @param data - 분석 데이터
 * @param parameters - 분석 파라미터
 * @param parameters.xColumn - 독립변수 X
 * @param parameters.yColumn - 종속변수 Y
 * @param parameters.controlColumns - 통제변수 배열
 * @param parameters.method - 상관계수 방법 ('pearson' | 'spearman', 기본: 'pearson')
 * @param parameters.alpha - 유의수준 (기본값: 0.05)
 *
 * @returns 부분상관분석 결과
 *
 * @example
 * ```typescript
 * // 나이를 통제한 키-체중 상관분석
 * const result = await partialCorrelation(context, data, {
 *   xColumn: '키',
 *   yColumn: '체중',
 *   controlColumns: ['나이'],
 *   method: 'pearson'
 * })
 * ```
 */
const partialCorrelation = async (
  context: CalculatorContext,
  data: DataRow[],
  parameters: PartialCorrelationParams
): Promise<CalculationResult> => {
  const { xColumn, yColumn, controlColumns, method = 'pearson', alpha = 0.05 } = parameters

  // 파라미터 검증
  if (!xColumn || !yColumn) {
    return { success: false, error: 'X, Y 변수를 선택하세요' }
  }
  if (!controlColumns || controlColumns.length === 0) {
    return { success: false, error: '최소 1개의 통제변수가 필요합니다' }
  }
  if (data.length < controlColumns.length + 3) {
    return {
      success: false,
      error: `최소 표본크기: ${controlColumns.length + 3}개 (현재: ${data.length}개)`
    }
  }

  try {
    // 데이터 추출
    const xValues = extractNumericColumn(data, xColumn)
    const yValues = extractNumericColumn(data, yColumn)
    const controlValues = controlColumns.map(col => extractNumericColumn(data, col))

    // Pyodide 계산
    const result = await context.pyodideService.partialCorrelation(
      xValues,
      yValues,
      controlValues,
      method
    )

    // 효과크기 해석
    const absR = Math.abs(result.correlation)
    const effectSize = absR < 0.1 ? '무시할 수준' :
                      absR < 0.3 ? '약함' :
                      absR < 0.5 ? '중간' : '강함'

    // 결과 반환
    return {
      success: true,
      data: {
        metrics: [
          { name: '부분상관계수 (r)', value: result.correlation.toFixed(4) },
          { name: 't-statistic', value: result.tStatistic.toFixed(4) },
          { name: 'p-value', value: formatPValue(result.pValue) },
          { name: '자유도', value: result.df.toString() }
        ],
        tables: [
          {
            name: '부분상관분석 결과',
            data: [
              { 항목: '부분상관계수', 값: result.correlation.toFixed(4) },
              { 항목: '95% 신뢰구간', 값: `[${result.confidenceInterval[0].toFixed(4)}, ${result.confidenceInterval[1].toFixed(4)}]` },
              { 항목: 't-statistic', 값: result.tStatistic.toFixed(4) },
              { 항목: 'p-value', 값: formatPValue(result.pValue) }
            ]
          },
          {
            name: '통제변수',
            data: controlColumns.map(col => ({ 변수명: col }))
          },
          {
            name: '효과크기 해석',
            data: [
              { 기준: '0.0 - 0.1', 해석: '무시할 수준' },
              { 기준: '0.1 - 0.3', 해석: '약함' },
              { 기준: '0.3 - 0.5', 해석: '중간' },
              { 기준: '0.5 이상', 해석: '강함' }
            ]
          }
        ],
        interpretation: `${xColumn}과 ${yColumn} 간 부분상관계수는 ${result.correlation.toFixed(4)} (효과크기: ${effectSize})이며, ` +
          `${controlColumns.join(', ')}를 통제한 결과입니다. ` +
          `${result.pValue < alpha ? `p-value=${formatPValue(result.pValue)}로 유의수준 ${alpha}에서 통계적으로 유의합니다.` : '통계적으로 유의하지 않습니다.'}`
      }
    }
  } catch (error) {
    return {
      success: false,
      error: `부분상관분석 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`
    }
  }
}

/**
 * Poisson 회귀분석 (Poisson Regression)
 *
 * 카운트 데이터(비음수 정수)를 종속변수로 하는 회귀분석입니다.
 * 사건 발생 횟수, 빈도 데이터 분석에 사용됩니다.
 *
 * @param context - 계산 컨텍스트
 * @param data - 분석 데이터
 * @param parameters - 분석 파라미터
 * @param parameters.dependentColumn - 종속변수 (카운트 데이터)
 * @param parameters.independentColumns - 독립변수 배열
 * @param parameters.alpha - 유의수준 (기본값: 0.05)
 *
 * @returns Poisson 회귀분석 결과
 *
 * @example
 * ```typescript
 * // 광고비, 프로모션 횟수로 판매량 예측
 * const result = await poissonRegression(context, data, {
 *   dependentColumn: '판매량',
 *   independentColumns: ['광고비', '프로모션횟수']
 * })
 * ```
 */
const poissonRegression = async (
  context: CalculatorContext,
  data: DataRow[],
  parameters: PoissonRegressionParams
): Promise<CalculationResult> => {
  const { dependentColumn, independentColumns, alpha = 0.05 } = parameters

  // 파라미터 검증
  if (!dependentColumn || !independentColumns || independentColumns.length === 0) {
    return { success: false, error: '종속변수와 독립변수를 선택하세요' }
  }
  if (data.length < independentColumns.length * 5) {
    return {
      success: false,
      error: `권장 최소 표본크기: ${independentColumns.length * 5}개 (현재: ${data.length}개)`
    }
  }

  try {
    // 데이터 준비
    const yValues = extractNumericColumn(data, dependentColumn)

    // 카운트 데이터 검증
    const isCountData = yValues.every(v => v >= 0 && Number.isInteger(v))
    if (!isCountData) {
      return {
        success: false,
        error: 'Poisson 회귀는 비음수 정수 데이터만 가능합니다'
      }
    }

    const xMatrix = independentColumns.map(col => extractNumericColumn(data, col))

    // Pyodide 계산
    const result = await context.pyodideService.poissonRegression(yValues, xMatrix)

    // 결과 반환
    return {
      success: true,
      data: {
        metrics: [
          { name: '표본크기', value: data.length.toString() },
          { name: 'Deviance', value: result.deviance.toFixed(4) },
          { name: 'AIC', value: result.aic.toFixed(2) },
          { name: 'Log-Likelihood', value: result.logLikelihood.toFixed(4) }
        ],
        tables: [
          {
            name: '회귀계수',
            data: result.coefficients.map((coef, i) => ({
              변수: i === 0 ? '절편' : independentColumns[i - 1],
              계수: coef.toFixed(4),
              '표준오차': result.stdErrors[i].toFixed(4),
              'z-value': result.zValues[i].toFixed(4),
              'p-value': formatPValue(result.pValues[i]),
              유의성: result.pValues[i] < alpha ? '***' : result.pValues[i] < 0.01 ? '**' : result.pValues[i] < 0.05 ? '*' : ''
            }))
          },
          {
            name: '모델 적합도',
            data: [
              { 지표: 'Deviance', 값: result.deviance.toFixed(4) },
              { 지표: 'Pearson Chi-Square', 값: result.pearsonChiSquare.toFixed(4) },
              { 지표: 'AIC', 값: result.aic.toFixed(2) },
              { 지표: 'BIC', 값: result.bic.toFixed(2) },
              { 지표: 'Log-Likelihood', 값: result.logLikelihood.toFixed(4) }
            ]
          },
          {
            name: '과산포 진단',
            data: [
              { 지표: 'Dispersion', 값: result.dispersion.toFixed(4) },
              { 해석: result.dispersion > 1.5 ? '과산포 의심 (Negative Binomial 고려)' : '적합' }
            ]
          }
        ],
        interpretation: `Poisson 회귀 모델이 ${data.length}개 관측치로 적합되었습니다. ` +
          `Deviance=${result.deviance.toFixed(2)}, AIC=${result.aic.toFixed(2)}입니다. ` +
          `${result.dispersion > 1.5 ? '과산포가 감지되어 Negative Binomial 회귀 고려가 필요합니다.' : '모델 적합도가 양호합니다.'}`
      }
    }
  } catch (error) {
    return {
      success: false,
      error: `Poisson 회귀분석 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`
    }
  }
}

/**
 * 순서형 회귀분석 (Ordinal Regression / Ordered Logit)
 *
 * 순서가 있는 범주형 종속변수를 예측하는 회귀분석입니다.
 * 예: 만족도 (매우 불만족 < 불만족 < 보통 < 만족 < 매우 만족)
 *
 * @param context - 계산 컨텍스트
 * @param data - 분석 데이터
 * @param parameters - 분석 파라미터
 * @param parameters.dependentColumn - 순서형 종속변수
 * @param parameters.independentColumns - 독립변수 배열
 * @param parameters.alpha - 유의수준 (기본값: 0.05)
 *
 * @returns 순서형 회귀분석 결과
 *
 * @example
 * ```typescript
 * // 나이, 소득으로 만족도(1-5) 예측
 * const result = await ordinalRegression(context, data, {
 *   dependentColumn: '만족도',
 *   independentColumns: ['나이', '소득']
 * })
 * ```
 */
const ordinalRegression = async (
  context: CalculatorContext,
  data: DataRow[],
  parameters: OrdinalRegressionParams
): Promise<CalculationResult> => {
  const { dependentColumn, independentColumns, alpha = 0.05 } = parameters

  // 파라미터 검증
  if (!dependentColumn || !independentColumns || independentColumns.length === 0) {
    return { success: false, error: '종속변수와 독립변수를 선택하세요' }
  }
  if (data.length < 30) {
    return {
      success: false,
      error: `순서형 회귀는 최소 30개 표본이 필요합니다 (현재: ${data.length}개)`
    }
  }

  try {
    // 데이터 준비
    const yValues = extractNumericColumn(data, dependentColumn)
    const xMatrix = independentColumns.map(col => extractNumericColumn(data, col))

    // 순서 데이터 검증
    const uniqueY = Array.from(new Set(yValues)).sort((a, b) => a - b)
    if (uniqueY.length < 3) {
      return {
        success: false,
        error: `순서형 회귀는 최소 3개 범주가 필요합니다 (현재: ${uniqueY.length}개)`
      }
    }

    // Pyodide 계산
    const result = await context.pyodideService.ordinalRegression(yValues, xMatrix)

    // 결과 반환
    return {
      success: true,
      data: {
        metrics: [
          { name: '표본크기', value: data.length.toString() },
          { name: '범주 수', value: uniqueY.length.toString() },
          { name: 'Pseudo R²', value: result.pseudoRSquared.toFixed(4) },
          { name: 'Log-Likelihood', value: result.logLikelihood.toFixed(4) }
        ],
        tables: [
          {
            name: '회귀계수',
            data: result.coefficients.map((coef, i) => ({
              변수: independentColumns[i],
              계수: coef.toFixed(4),
              '표준오차': result.stdErrors[i].toFixed(4),
              'z-value': result.zValues[i].toFixed(4),
              'p-value': formatPValue(result.pValues[i]),
              유의성: result.pValues[i] < 0.001 ? '***' : result.pValues[i] < 0.01 ? '**' : result.pValues[i] < 0.05 ? '*' : ''
            }))
          },
          {
            name: '절편 (Thresholds)',
            data: result.thresholds.map((threshold, i) => ({
              경계: `${uniqueY[i]} → ${uniqueY[i + 1]}`,
              값: threshold.toFixed(4)
            }))
          },
          {
            name: '모델 적합도',
            data: [
              { 지표: 'Pseudo R² (McFadden)', 값: result.pseudoRSquared.toFixed(4) },
              { 지표: 'AIC', 값: result.aic.toFixed(2) },
              { 지표: 'BIC', 값: result.bic.toFixed(2) },
              { 지표: 'Log-Likelihood', 값: result.logLikelihood.toFixed(4) }
            ]
          }
        ],
        interpretation: `순서형 회귀 모델이 ${uniqueY.length}개 범주로 적합되었습니다. ` +
          `Pseudo R²=${result.pseudoRSquared.toFixed(4)}로 모델의 설명력을 나타냅니다. ` +
          `유의한 예측변수는 ${result.pValues.filter((p, i) => p < alpha && i < independentColumns.length).length}개입니다.`
      }
    }
  } catch (error) {
    return {
      success: false,
      error: `순서형 회귀분석 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`
    }
  }
}

/**
 * 단계적 회귀분석 (Stepwise Regression)
 *
 * 여러 독립변수 중 종속변수를 가장 잘 설명하는 변수를 단계적으로 선택합니다.
 * Forward, Backward, Both 방법을 지원합니다.
 *
 * @param context - 계산 컨텍스트
 * @param data - 분석 데이터
 * @param parameters - 분석 파라미터
 * @param parameters.dependentColumn - 종속변수
 * @param parameters.candidateColumns - 후보 독립변수 배열
 * @param parameters.method - 선택 방법 ('forward' | 'backward' | 'both', 기본: 'forward')
 * @param parameters.entryThreshold - 진입 기준 p-value (기본: 0.05)
 * @param parameters.stayThreshold - 제거 기준 p-value (기본: 0.10)
 * @param parameters.alpha - 유의수준 (기본값: 0.05)
 *
 * @returns 단계적 회귀분석 결과
 *
 * @example
 * ```typescript
 * // 10개 변수 중 최적 조합 찾기
 * const result = await stepwiseRegression(context, data, {
 *   dependentColumn: '매출',
 *   candidateColumns: ['광고비', '직원수', '매장면적', ...],
 *   method: 'both'
 * })
 * ```
 */
const stepwiseRegression = async (
  context: CalculatorContext,
  data: DataRow[],
  parameters: StepwiseRegressionParams
): Promise<CalculationResult> => {
  const {
    dependentColumn,
    candidateColumns,
    method = 'forward',
    entryThreshold = 0.05,
    stayThreshold = 0.10,
    alpha = 0.05
  } = parameters

  // 파라미터 검증
  if (!dependentColumn || !candidateColumns || candidateColumns.length === 0) {
    return { success: false, error: '종속변수와 후보 변수를 선택하세요' }
  }
  if (data.length < candidateColumns.length * 3) {
    return {
      success: false,
      error: `권장 최소 표본크기: ${candidateColumns.length * 3}개 (현재: ${data.length}개)`
    }
  }

  try {
    // 데이터 준비
    const yValues = extractNumericColumn(data, dependentColumn)
    const xMatrix = candidateColumns.map(col => extractNumericColumn(data, col))

    // Pyodide 계산
    const result = await context.pyodideService.stepwiseRegression(
      yValues,
      xMatrix,
      candidateColumns,
      method,
      entryThreshold,
      stayThreshold
    )

    // 결과 반환
    return {
      success: true,
      data: {
        metrics: [
          { name: '선택 방법', value: method },
          { name: '후보 변수 수', value: candidateColumns.length.toString() },
          { name: '선택된 변수 수', value: result.selectedVariables.length.toString() },
          { name: '최종 R²', value: result.finalRSquared.toFixed(4) },
          { name: '조정된 R²', value: result.adjustedRSquared.toFixed(4) }
        ],
        tables: [
          {
            name: '선택된 변수',
            data: result.selectedVariables.map((varName, i) => ({
              단계: (i + 1).toString(),
              변수명: varName,
              '진입시 R²': result.rSquaredAtStep[i].toFixed(4),
              'F-통계량': result.fStatistics[i].toFixed(4),
              'p-value': formatPValue(result.pValues[i])
            }))
          },
          {
            name: '최종 회귀계수',
            data: result.finalCoefficients.map((coef, i) => ({
              변수: i === 0 ? '절편' : result.selectedVariables[i - 1],
              계수: coef.toFixed(4),
              '표준오차': result.finalStdErrors[i].toFixed(4),
              't-value': result.finalTValues[i].toFixed(4),
              'p-value': formatPValue(result.finalPValues[i])
            }))
          },
          {
            name: '제거된 변수',
            data: candidateColumns
              .filter(col => !result.selectedVariables.includes(col))
              .map(col => ({ 변수명: col, 이유: '유의하지 않음' }))
          }
        ],
        interpretation: `${method} 방법으로 ${candidateColumns.length}개 후보 중 ${result.selectedVariables.length}개 변수를 선택했습니다. ` +
          `최종 모델 R²=${result.finalRSquared.toFixed(4)}, 조정된 R²=${result.adjustedRSquared.toFixed(4)}입니다. ` +
          `선택된 변수: ${result.selectedVariables.join(', ')}`
      }
    }
  } catch (error) {
    return {
      success: false,
      error: `단계적 회귀분석 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`
    }
  }
}

/**
 * 용량-반응 분석 (Dose-Response Analysis)
 *
 * 용량(농도)과 반응(효과) 간 관계를 모델링합니다.
 * EC50 (50% 효과 농도), Hill 계수 등을 추정합니다.
 *
 * @param context - 계산 컨텍스트
 * @param data - 분석 데이터
 * @param parameters - 분석 파라미터
 * @param parameters.doseColumn - 용량(농도) 변수
 * @param parameters.responseColumn - 반응(효과) 변수 (0-100%)
 * @param parameters.model - 모델 타입 ('logistic' | 'probit' | 'weibull', 기본: 'logistic')
 * @param parameters.alpha - 유의수준 (기본값: 0.05)
 *
 * @returns 용량-반응 분석 결과
 *
 * @example
 * ```typescript
 * // 약물 농도와 세포 생존율 분석
 * const result = await doseResponse(context, data, {
 *   doseColumn: '농도',
 *   responseColumn: '생존율',
 *   model: 'logistic'
 * })
 * ```
 */
const doseResponse = async (
  context: CalculatorContext,
  data: DataRow[],
  parameters: DoseResponseParams
): Promise<CalculationResult> => {
  const { doseColumn, responseColumn, model = 'logistic', alpha = 0.05 } = parameters

  // 파라미터 검증
  if (!doseColumn || !responseColumn) {
    return { success: false, error: '용량과 반응 변수를 선택하세요' }
  }
  if (data.length < 6) {
    return {
      success: false,
      error: `용량-반응 분석은 최소 6개 관측치가 필요합니다 (현재: ${data.length}개)`
    }
  }

  try {
    // 데이터 준비
    const doseValues = extractNumericColumn(data, doseColumn)
    const responseValues = extractNumericColumn(data, responseColumn)

    // 용량 음수 검증
    if (doseValues.some(v => v < 0)) {
      return { success: false, error: '용량 값은 음수일 수 없습니다' }
    }

    // Pyodide 계산
    const result = await context.pyodideService.doseResponse(doseValues, responseValues, model)

    // 결과 반환
    return {
      success: true,
      data: {
        metrics: [
          { name: '모델', value: model },
          { name: 'EC50', value: result.ec50.toFixed(4) },
          { name: 'Hill 계수', value: result.hillCoefficient.toFixed(4) },
          { name: 'R²', value: result.rSquared.toFixed(4) },
          { name: '잔차 표준오차', value: result.residualStdError.toFixed(4) }
        ],
        tables: [
          {
            name: '모델 파라미터',
            data: [
              { 파라미터: 'EC50 (IC50)', 값: result.ec50.toFixed(4), '95% CI': `[${result.ec50CI[0].toFixed(4)}, ${result.ec50CI[1].toFixed(4)}]` },
              { 파라미터: 'Hill 계수 (기울기)', 값: result.hillCoefficient.toFixed(4), '95% CI': `[${result.hillCI[0].toFixed(4)}, ${result.hillCI[1].toFixed(4)}]` },
              { 파라미터: 'Top (최대 반응)', 값: result.top.toFixed(2), '95% CI': `[${result.topCI[0].toFixed(2)}, ${result.topCI[1].toFixed(2)}]` },
              { 파라미터: 'Bottom (최소 반응)', 값: result.bottom.toFixed(2), '95% CI': `[${result.bottomCI[0].toFixed(2)}, ${result.bottomCI[1].toFixed(2)}]` }
            ]
          },
          {
            name: '적합도 평가',
            data: [
              { 지표: 'R²', 값: result.rSquared.toFixed(4) },
              { 지표: 'RMSE', 값: result.rmse.toFixed(4) },
              { 지표: 'AIC', 값: result.aic.toFixed(2) },
              { 지표: '잔차 표준오차', 값: result.residualStdError.toFixed(4) }
            ]
          },
          {
            name: 'EC 값',
            data: [
              { 항목: 'EC10', 값: result.ec10.toFixed(4) },
              { 항목: 'EC25', 값: result.ec25.toFixed(4) },
              { 항목: 'EC50', 값: result.ec50.toFixed(4) },
              { 항목: 'EC75', 값: result.ec75.toFixed(4) },
              { 항목: 'EC90', 값: result.ec90.toFixed(4) }
            ]
          }
        ],
        interpretation: `${model} 모델로 용량-반응 곡선이 적합되었습니다. ` +
          `EC50=${result.ec50.toFixed(4)} (95% CI: ${result.ec50CI[0].toFixed(4)}-${result.ec50CI[1].toFixed(4)}), ` +
          `Hill 계수=${result.hillCoefficient.toFixed(4)}로 ` +
          `${Math.abs(result.hillCoefficient) > 1 ? '가파른' : '완만한'} 용량-반응 관계를 보입니다. ` +
          `모델 적합도 R²=${result.rSquared.toFixed(4)}입니다.`
      }
    }
  } catch (error) {
    return {
      success: false,
      error: `용량-반응 분석 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`
    }
  }
}

/**
 * 반응표면 분석 (Response Surface Methodology, RSM)
 *
 * 여러 요인이 반응변수에 미치는 영향을 3차원 표면으로 모델링합니다.
 * 최적 조건 탐색에 사용됩니다 (실험 설계법).
 *
 * @param context - 계산 컨텍스트
 * @param data - 분석 데이터
 * @param parameters - 분석 파라미터
 * @param parameters.factorColumns - 요인 변수 배열 (최소 2개)
 * @param parameters.responseColumn - 반응 변수
 * @param parameters.order - 모델 차수 (1 또는 2, 기본: 2)
 * @param parameters.alpha - 유의수준 (기본값: 0.05)
 *
 * @returns 반응표면 분석 결과
 *
 * @example
 * ```typescript
 * // 온도, 시간이 수율에 미치는 영향
 * const result = await responseSurface(context, data, {
 *   factorColumns: ['온도', '시간'],
 *   responseColumn: '수율',
 *   order: 2
 * })
 * ```
 */
const responseSurface = async (
  context: CalculatorContext,
  data: DataRow[],
  parameters: ResponseSurfaceParams
): Promise<CalculationResult> => {
  const { factorColumns, responseColumn, order = 2, alpha = 0.05 } = parameters

  // 파라미터 검증
  if (!factorColumns || factorColumns.length < 2) {
    return { success: false, error: '최소 2개 요인 변수가 필요합니다' }
  }
  if (!responseColumn) {
    return { success: false, error: '반응 변수를 선택하세요' }
  }

  const minSamples = order === 2 ? (factorColumns.length + 1) * (factorColumns.length + 2) / 2 : factorColumns.length + 1
  if (data.length < minSamples) {
    return {
      success: false,
      error: `${order}차 모델은 최소 ${minSamples}개 관측치가 필요합니다 (현재: ${data.length}개)`
    }
  }

  try {
    // 데이터 준비
    const yValues = extractNumericColumn(data, responseColumn)
    const xMatrix = factorColumns.map(col => extractNumericColumn(data, col))

    // Pyodide 계산
    const result = await context.pyodideService.responseSurface(yValues, xMatrix, factorColumns, order)

    // 최적점 타입 판정
    const optimumType = result.isMaximum ? '최대점' :
                       result.isMinimum ? '최소점' :
                       result.isSaddle ? '안장점' : '평탄점'

    // 결과 반환
    return {
      success: true,
      data: {
        metrics: [
          { name: '모델 차수', value: `${order}차` },
          { name: '요인 수', value: factorColumns.length.toString() },
          { name: 'R²', value: result.rSquared.toFixed(4) },
          { name: '조정된 R²', value: result.adjustedRSquared.toFixed(4) },
          { name: '최적점 타입', value: optimumType }
        ],
        tables: [
          {
            name: '회귀계수',
            data: result.coefficients.map((coef, i) => ({
              항: result.termNames[i],
              계수: coef.toFixed(4),
              '표준오차': result.stdErrors[i].toFixed(4),
              't-value': result.tValues[i].toFixed(4),
              'p-value': formatPValue(result.pValues[i]),
              유의성: result.pValues[i] < 0.001 ? '***' : result.pValues[i] < 0.01 ? '**' : result.pValues[i] < 0.05 ? '*' : ''
            }))
          },
          {
            name: '최적 조건',
            data: factorColumns.map((factor, i) => ({
              요인: factor,
              '최적값': result.optimumPoint[i].toFixed(4),
              '예측 반응': i === 0 ? result.predictedResponse.toFixed(4) : ''
            }))
          },
          {
            name: '모델 적합도',
            data: [
              { 지표: 'R²', 값: result.rSquared.toFixed(4) },
              { 지표: '조정된 R²', 값: result.adjustedRSquared.toFixed(4) },
              { 지표: 'RMSE', 값: result.rmse.toFixed(4) },
              { 지표: 'F-통계량', 값: result.fStatistic.toFixed(4) },
              { 지표: 'p-value (전체)', 값: formatPValue(result.overallPValue) }
            ]
          }
        ],
        interpretation: `${order}차 반응표면 모델이 ${factorColumns.length}개 요인으로 적합되었습니다. ` +
          `모델 설명력 R²=${result.rSquared.toFixed(4)}, 조정된 R²=${result.adjustedRSquared.toFixed(4)}입니다. ` +
          `${optimumType}이 감지되었으며, 최적 반응 예측값은 ${result.predictedResponse.toFixed(4)}입니다. ` +
          `${factorColumns.map((f, i) => `${f}=${result.optimumPoint[i].toFixed(2)}`).join(', ')}일 때 최적입니다.`
      }
    }
  } catch (error) {
    return {
      success: false,
      error: `반응표면 분석 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`
    }
  }
}
