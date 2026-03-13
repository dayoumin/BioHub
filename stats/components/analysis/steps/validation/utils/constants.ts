/**
 * 데이터 검증 상수
 *
 * @description
 * DataValidationStep에서 사용하는 모든 상수 정의
 * - 임계값 (Threshold)
 * - UI 설정
 * - 타이밍 설정
 */

export const VALIDATION_CONSTANTS = {
  /** 80% 이상이면 편향된 분포로 판단 */
  SKEWED_THRESHOLD: 0.8,

  /** 5개 미만이면 희소 카테고리로 분류 */
  SPARSE_THRESHOLD: 5,

  /** UI에 표시할 최대 카테고리 수 */
  MAX_DISPLAY_CATEGORIES: 5,

  /** 통계 검정을 위한 최소 샘플 크기 */
  MIN_SAMPLE_SIZE: 3,

  /** 연속 호출 방지를 위한 디바운스 지연 시간 (밀리초) */
  DEBOUNCE_DELAY_MS: 200,

  /** 자동 진행 카운트다운 초 */
  AUTO_PROGRESS_COUNTDOWN: 5,

  /** 이상치 경고 기준 (5%) */
  OUTLIER_WARNING_THRESHOLD: 0.05,

  /** 이상치 심각 기준 (10%) */
  OUTLIER_CRITICAL_THRESHOLD: 0.1
} as const

/**
 * 상수 타입 export
 */
export type ValidationConstants = typeof VALIDATION_CONSTANTS
