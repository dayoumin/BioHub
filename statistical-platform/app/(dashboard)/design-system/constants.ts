/**
 * 디자인 시스템 공통 상수
 */

// 컴포넌트 목록
export const COMPONENT_LIST = [
  { id: 'purpose-card', label: 'PurposeCard', badge: null },
  { id: 'ai-progress', label: 'AIProgress', badge: null },
  { id: 'data-preview', label: 'DataPreview', badge: null },
  { id: 'guidance-card', label: 'GuidanceCard', badge: 'NEW' },
  { id: 'variable-selector', label: 'VarSelector', badge: null },
] as const

// 샘플 데이터
export const SAMPLE_DATA = [
  { group: 'A', value: 12.5, age: 25, score: 85, time: 120 },
  { group: 'B', value: 10.3, age: 22, score: 78, time: 105 },
  { group: 'A', value: 13.2, age: 28, score: 92, time: 135 },
  { group: 'B', value: 9.7, age: 20, score: 73, time: 98 },
  { group: 'A', value: 11.8, age: 26, score: 88, time: 125 }
]
