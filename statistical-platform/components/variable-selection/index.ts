/**
 * 변수 선택 UI 컴포넌트 모음
 *
 * 현재 표준:
 * - VariableSelectorModern: 통계 페이지용 (17개 페이지)
 * - VariableSelectorPanel: 단순 페이지용 (1개 페이지)
 * - VariableSelectorBadges: Badge 기반 변수 선택 (31개 페이지)
 */

export { VariableSelectorModern } from './VariableSelectorModern'
export { VariableSelectorPanel } from './VariableSelectorPanel'
export { VariableSelectorBadges, type VariableSelectorBadgesProps } from './VariableSelectorBadges'

// VariableAssignment 타입은 중앙 정의에서 import
export type { VariableAssignment } from '@/types/statistics-converters'