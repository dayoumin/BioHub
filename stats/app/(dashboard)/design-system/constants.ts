/**
 * 디자인 시스템 공통 상수
 */

// 컴포넌트 목록
export const COMPONENT_LIST = [
  { id: 'purpose-card', label: 'PurposeCard', badge: null },
  { id: 'ai-progress', label: 'AIProgress', badge: null },
  { id: 'data-preview', label: 'DataPreview', badge: null },
  { id: 'data-profile', label: 'DataProfile', badge: null },
  { id: 'guidance-card', label: 'GuidanceCard', badge: null },
  { id: 'variable-selector', label: 'VarSelector', badge: null },
  { id: 'result-context', label: 'ResultContext', badge: null },
  { id: 'statistical-result', label: 'StatResult', badge: null },
  { id: 'floating-step', label: 'FloatingStep', badge: null },
  { id: 'fit-score', label: 'FitScore', badge: 'NEW' },
] as const

// 샘플 데이터 (기본)
export const SAMPLE_DATA = [
  { group: 'A', value: 12.5, age: 25, score: 85, time: 120 },
  { group: 'B', value: 10.3, age: 22, score: 78, time: 105 },
  { group: 'A', value: 13.2, age: 28, score: 92, time: 135 },
  { group: 'B', value: 9.7, age: 20, score: 73, time: 98 },
  { group: 'A', value: 11.8, age: 26, score: 88, time: 125 }
]

// 확장 샘플 데이터 (방법별 Selector 데모용)
export const EXTENDED_SAMPLE_DATA = [
  { id: 1, group: 'Control', treatment: 'Placebo', before: 45.2, after: 47.8, weight: 68.5, height: 172, bmi: 23.1, cholesterol: 195, glucose: 92 },
  { id: 2, group: 'Control', treatment: 'Placebo', before: 52.1, after: 53.4, weight: 75.2, height: 180, bmi: 23.2, cholesterol: 210, glucose: 98 },
  { id: 3, group: 'Control', treatment: 'Drug A', before: 48.7, after: 55.2, weight: 62.1, height: 165, bmi: 22.8, cholesterol: 188, glucose: 88 },
  { id: 4, group: 'Treatment', treatment: 'Drug A', before: 51.3, after: 62.1, weight: 70.8, height: 175, bmi: 23.1, cholesterol: 178, glucose: 85 },
  { id: 5, group: 'Treatment', treatment: 'Drug A', before: 49.8, after: 58.9, weight: 65.4, height: 168, bmi: 23.2, cholesterol: 165, glucose: 82 },
  { id: 6, group: 'Treatment', treatment: 'Drug B', before: 47.5, after: 59.3, weight: 72.3, height: 178, bmi: 22.8, cholesterol: 172, glucose: 79 },
  { id: 7, group: 'Control', treatment: 'Placebo', before: 50.2, after: 51.1, weight: 68.9, height: 170, bmi: 23.8, cholesterol: 205, glucose: 95 },
  { id: 8, group: 'Treatment', treatment: 'Drug B', before: 46.9, after: 57.8, weight: 64.2, height: 163, bmi: 24.2, cholesterol: 168, glucose: 81 },
  { id: 9, group: 'Control', treatment: 'Drug A', before: 53.4, after: 56.7, weight: 78.1, height: 182, bmi: 23.6, cholesterol: 198, glucose: 90 },
  { id: 10, group: 'Treatment', treatment: 'Drug B', before: 48.1, after: 60.5, weight: 66.7, height: 171, bmi: 22.8, cholesterol: 158, glucose: 78 }
]
