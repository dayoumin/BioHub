/**
 * Registry 타입 정의
 *
 * StatisticalRegistry에서 사용하는 핵심 타입들
 */

/**
 * 통계 메서드 그룹 (6개 논리 그룹)
 */
export type StatisticalGroup =
  | 'descriptive'    // 기술통계 (10개)
  | 'hypothesis'     // 가설검정 (8개)
  | 'regression'     // 회귀분석 (12개)
  | 'nonparametric'  // 비모수검정 (9개)
  | 'anova'          // 분산분석 (9개)
  | 'advanced'       // 고급분석 (12개)

/**
 * Python 패키지 이름
 */
export type PythonPackage =
  | 'numpy'
  | 'scipy'
  | 'statsmodels'
  | 'sklearn'
  | 'pandas'

/**
 * 메서드 메타데이터
 */
export interface MethodMetadata {
  /**
   * 어느 그룹에 속하는지 (Worker 매핑 결정)
   */
  group: StatisticalGroup

  /**
   * 필요한 Python 패키지 목록
   */
  deps: readonly PythonPackage[]

  /**
   * 예상 실행 시간 (초)
   * 참고용, 실제 시간은 데이터 크기에 따라 다름
   */
  estimatedTime?: number
}

/**
 * 그룹 모듈 인터페이스
 */
export interface GroupModule {
  /**
   * 그룹 ID
   */
  readonly id: StatisticalGroup

  /**
   * 이 그룹이 담당하는 메서드 목록
   */
  readonly methods: readonly string[]

  /**
   * 메서드 핸들러 맵
   */
  readonly handlers: Record<string, MethodHandler>
}

/**
 * 메서드 핸들러 함수 타입
 */
export type MethodHandler = (
  data: any[],
  params: any
) => Promise<CalculationResult>

/**
 * 계산 결과 타입
 */
export interface CalculationResult {
  success: boolean
  data?: any
  error?: string
}

/**
 * Registry 사용량 통계
 */
export interface UsageStats {
  /**
   * 그룹별 호출 횟수
   */
  groupCounts: Record<StatisticalGroup, number>

  /**
   * 메서드별 호출 횟수
   */
  methodCounts: Record<string, number>

  /**
   * 총 호출 횟수
   */
  totalCalls: number
}
