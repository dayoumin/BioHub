/**
 * 공통 결과 표시 컴포넌트
 *
 * 통계 분석 결과를 일관되게 표시하기 위한 공유 컴포넌트.
 * Analysis Flow, Legacy Statistics, Bio-Tools 모두에서 사용 가능.
 */

// 기존 컴포넌트 re-export
export { StatisticCard, type StatisticCardProps } from '@/components/analysis/common/StatisticCard'

// 새 공유 컴포넌트
export { ResultMetricsGrid, type MetricItem } from './ResultMetricsGrid'
export { BioResultSummary } from './BioResultSummary'
