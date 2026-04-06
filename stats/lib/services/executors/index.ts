/**
 * 통계 실행자 모듈 통합 export
 */

// 타입 export (호환성 별칭 포함)
export type { ExecutorAnalysisResult } from './types'
export type { ExecutorAnalysisResult as AnalysisResult } from './types'

// 메인 통계 실행자 (완전한 구현 - lib/services/statistical-executor.ts)
export { StatisticalExecutor } from '../statistical-executor'
export type { StatisticalExecutorResult } from '../statistical-executor'
