/**
 * Pyodide Worker 응답 타입 (공통)
 *
 * Worker 3 test_assumptions / Worker 1 normality_test의 반환 타입.
 * assumption-testing-service, diagnostic-pipeline, normality-enrichment-service에서 공유.
 */

/** Worker 3 test_assumptions 응답 */
export interface TestAssumptionsWorkerResult {
  normality: {
    shapiroWilk: Array<{
      group: number
      statistic: number | null
      pValue: number | null
      passed: boolean | null
      warning?: string
    }>
    passed: boolean
    interpretation: string
  }
  homogeneity: {
    levene: {
      statistic: number
      pValue: number
    }
    passed: boolean
    interpretation: string
  }
}

/** Worker 1 normality_test 응답 */
export interface NormalityWorkerResult {
  statistic: number
  pValue: number
  isNormal: boolean
}
