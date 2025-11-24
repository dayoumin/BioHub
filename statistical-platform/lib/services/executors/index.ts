/**
 * 통계 실행자 모듈 통합 export
 */

export { BaseExecutor } from './base-executor'
export { DescriptiveExecutor } from './descriptive-executor'
export { TTestExecutor } from './t-test-executor'
export { AnovaExecutor } from './anova-executor'
export { RegressionExecutor } from './regression-executor'
export { NonparametricExecutor } from './nonparametric-executor'
export { AdvancedExecutor } from './advanced-executor'

// 타입 export (호환성 별칭 포함)
export type { ExecutorAnalysisResult } from './types'
export type { ExecutorAnalysisResult as AnalysisResult } from './types'

// 메인 통계 실행자
export { StatisticalExecutor } from './statistical-executor'