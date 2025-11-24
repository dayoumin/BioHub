/**
 * 변수 선택 UI 컴포넌트 모음
 *
 * 현재 표준:
 * - VariableSelectorModern: 통계 페이지용 (17개 페이지)
 * - VariableSelectorPanel: 단순 페이지용 (1개 페이지)
 */

export { VariableSelectorModern } from './VariableSelectorModern'
export { VariableSelectorPanel } from './VariableSelectorPanel'

// VariableAssignment 타입은 중앙 정의에서 import
export type { VariableAssignment } from '@/types/statistics-converters'