/**
 * Variable Selector Components
 *
 * 분석 방법별 맞춤 변수 선택 컴포넌트
 *
 * @example
 * // Two-way ANOVA
 * <TwoWayAnovaSelector data={data} onComplete={handleComplete} />
 *
 * // Correlation
 * <CorrelationSelector data={data} onComplete={handleComplete} minVariables={2} />
 *
 * // Group Comparison (t-test, One-way ANOVA)
 * <GroupComparisonSelector data={data} onComplete={handleComplete} />
 */

export { TwoWayAnovaSelector } from './TwoWayAnovaSelector'
export { CorrelationSelector } from './CorrelationSelector'
export { GroupComparisonSelector } from './GroupComparisonSelector'
export { MultipleRegressionSelector } from './MultipleRegressionSelector'
export { PairedSelector } from './PairedSelector'

// Re-export types
export type { VariableSelectorProps, VariableSelectorResult } from './types'