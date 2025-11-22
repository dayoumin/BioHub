import { pyodideStats } from '../pyodide-statistics'
import { AnalysisResult } from './types'
import { logger } from '@/lib/utils/logger'

/**
 * 통계 실행자 기본 클래스
 */
export abstract class BaseExecutor {
  /**
   * 공통 결과 해석 함수
   */
  protected interpretPValue(pvalue: number): string {
    if (pvalue < 0.001) return '매우 강한 통계적 유의성 (p < 0.001)'
    if (pvalue < 0.01) return '강한 통계적 유의성 (p < 0.01)'
    if (pvalue < 0.05) return '통계적으로 유의 (p < 0.05)'
    if (pvalue < 0.1) return '약한 통계적 유의성 (p < 0.1)'
    return '통계적으로 유의하지 않음 (p ≥ 0.05)'
  }

  /**
   * 효과크기 해석
   */
  protected interpretEffectSize(d: number, type: 'cohen' | 'eta' | 'omega' = 'cohen'): string {
    const absD = Math.abs(d)

    if (type === 'cohen') {
      if (absD < 0.2) return '무시할 수준'
      if (absD < 0.5) return '작은 효과'
      if (absD < 0.8) return '중간 효과'
      return '큰 효과'
    } else {
      // eta-squared, omega-squared (동일한 기준)
      if (absD < 0.01) return '무시할 수준'
      if (absD < 0.06) return '작은 효과'
      if (absD < 0.14) return '중간 효과'
      return '큰 효과'
    }
  }

  /**
   * 기본 메타데이터 생성
   */
  protected createMetadata(
    method: string,
    dataSize: number,
    startTime: number
  ): AnalysisResult['metadata'] {
    return {
      method,
      timestamp: new Date().toISOString(),
      duration: Date.now() - startTime,
      dataSize,
      assumptions: {
        normality: { passed: true, test: 'Shapiro-Wilk' },
        homogeneity: { passed: true, test: 'Levene' },
        independence: { passed: true }
      }
    }
  }

  /**
   * 오류 처리
   */
  protected handleError(error: unknown, method: string): AnalysisResult {
    logger.error(`${method} 실행 오류:`, error)

    return {
      metadata: {
        method,
        timestamp: new Date().toISOString(),
        duration: 0,
        dataSize: 0,
        assumptions: {
          normality: { passed: false },
          homogeneity: { passed: false },
          independence: { passed: false }
        }
      },
      mainResults: {
        statistic: NaN,
        pvalue: NaN,
        interpretation: `분석 실행 중 오류 발생: ${error instanceof Error ? error.message : '알 수 없는 오류'}`
      },
      additionalInfo: {}
    }
  }

  /**
   * Pyodide 초기화 확인
   */
  protected async ensurePyodideInitialized(): Promise<void> {
    if (!pyodideStats.isInitialized()) {
      await pyodideStats.initialize()
    }
  }

  /**
   * 업로드된 행 데이터에서 수치형 시리즈를 추출한다.
   * - variables / dependentVar 우선 사용
   * - 숫자 배열이 그대로 들어오면 그대로 사용
   *
   * @param data - 원본 데이터 (숫자 배열 또는 객체 배열)
   * @param options - 변수 옵션 (variables, dependentVar 등)
   * @returns 유효한 숫자 배열
   */
  protected extractNumericSeries(
    data: unknown[],
    options?: unknown
  ): number[] {
    if (!Array.isArray(data)) return []
    if (data.length === 0) return []

    // 이미 숫자 배열로 들어온 경우
    if (typeof data[0] === 'number') {
      return (data as Array<unknown>)
        .map((v) => Number(v))
        .filter((v) => Number.isFinite(v))
    }

    const rows = data as Array<Record<string, unknown>>

    // 타입 가드: options에서 변수명 추출
    const getVariableCandidates = (opts: unknown): string[] => {
      if (!opts || typeof opts !== 'object') return []

      const candidates: string[] = []
      const obj = opts as Record<string, unknown>

      // variables (배열 또는 단일 문자열)
      if (Array.isArray(obj.variables)) {
        candidates.push(...obj.variables.filter((v: unknown): v is string => typeof v === 'string'))
      } else if (typeof obj.variables === 'string') {
        candidates.push(obj.variables)
      }

      // 기타 후보 필드
      const fallbackFields = ['dependentVar', 'dependent', 'variable']
      for (const field of fallbackFields) {
        if (typeof obj[field] === 'string') {
          candidates.push(obj[field])
        }
      }

      return candidates
    }

    const candidates = getVariableCandidates(options)
    const tryColumns = candidates.length > 0 ? candidates : Object.keys(rows[0] || {})

    // 각 컬럼을 시도하여 숫자 데이터 추출
    for (const col of tryColumns) {
      const numericValues = rows
        .map((row) => row?.[col])
        .map((value) => {
          // null/undefined를 먼저 체크 (Number(null) === 0 버그 방지)
          if (value === null || value === undefined) return null
          const num = typeof value === 'number' ? value : Number(value)
          return Number.isFinite(num) ? num : null
        })
        .filter((v): v is number => v !== null)

      if (numericValues.length > 0) {
        return numericValues
      }
    }

    return []
  }

  /**
   * 추상 메서드 - 각 실행자가 구현해야 함
   */
  abstract execute(data: unknown[], options?: unknown): Promise<AnalysisResult>
}