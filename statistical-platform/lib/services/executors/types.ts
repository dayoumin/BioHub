/**
 * Executor 표준 분석 결과 인터페이스
 * (Smart Flow의 AnalysisResult와는 다른 구조)
 *
 * 주의: 이 타입은 PyodideCore → Executor 간 통신용이며,
 * UI에서 사용하는 types/smart-flow.ts의 AnalysisResult와 변환이 필요합니다.
 */
export interface ExecutorAnalysisResult {
  metadata: {
    method: string
    timestamp: string
    duration: number
    dataSize: number
    assumptions?: {
      normality?: {
        passed: boolean
        test?: string
        statistic?: number
        pvalue?: number
      }
      homogeneity?: {
        passed: boolean
        test?: string
        statistic?: number
        pvalue?: number
      }
      independence?: {
        passed: boolean
        test?: string
      }
    }
  }

  mainResults: {
    statistic: number
    pvalue: number
    interpretation: string
    df?: number
    confidenceInterval?: {
      lower: number
      upper: number
      level: number
    }
  }

  additionalInfo: {
    effectSize?: {
      value: number
      type: string
      interpretation: string
    }
    // 추가 효과크기 (ANOVA용)
    omegaSquared?: {
      value: number
      type: string
      interpretation: string
    }
    // 제곱합 (ANOVA용)
    ssBetween?: number
    ssWithin?: number
    ssTotal?: number
    postHoc?: Array<{
      group1: string
      group2: string
      meanDiff: number
      pvalue: number
      significant: boolean
    }>
    residuals?: number[]
    coefficients?: Array<{
      name: string
      value: number
      stdError: number
      tValue: number
      pvalue: number
    }>
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [key: string]: any
  }

  visualizationData?: {
    type: string
    data: any
    options?: any
  }
}

/**
 * 호환성 별칭
 * @deprecated ExecutorAnalysisResult 사용 권장
 */
export type AnalysisResult = ExecutorAnalysisResult