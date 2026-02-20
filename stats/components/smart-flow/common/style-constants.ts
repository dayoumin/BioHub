/**
 * Smart Flow 일관성 가이드
 *
 * === 패딩 계층 ===
 * p-2   = compact  (뱃지, 인라인 요소)
 * p-3   = default  (카드 섹션, 리스트 아이템, 액션 버튼 행)
 * p-4   = spacious (카드 콘텐츠, 주요 섹션, 강조 박스)
 *
 * === 아이콘 계층 ===
 * w-5 h-5   = Primary   (스텝 헤더, 주요 액션)
 * w-4 h-4   = Secondary (섹션 헤더, 버튼 내부)
 * w-3.5 h-3.5 = Tertiary (인라인, 접기 토글)
 * w-3 h-3   = Micro     (툴팁, 뱃지)
 *
 * === 갭 계층 ===
 * gap-1   = tight   (뱃지 그룹, 인라인)
 * gap-1.5 = compact (아이콘 + 라벨)
 * gap-2   = default (리스트 아이템, 버튼 그룹)
 * gap-3   = spacious (주요 섹션)
 *
 * === 카드 헤더 배경 ===
 * bg-muted/10 = 모든 카드 헤더 통일
 *
 * === 테이블 셀 패딩 ===
 * th: px-3 py-2.5 (헤더)
 * td: px-3 py-2.5 (바디 — 헤더와 동일)
 */

/**
 * === 네비게이션 패턴 ===
 * Step 1 (탐색): page.tsx의 플로팅 네비게이션 버튼
 * Step 2 (방법): 내부 확인 버튼 (방법 선택 시 자동 진행)
 * Step 3 (변수): 각 selector의 onComplete 콜백
 * Step 4 (분석): 분석 완료 시 자동 전환 + 결과에서 StepHeader action으로 뒤로가기
 *
 * === 빈 상태 규칙 ===
 * EmptyState: 데이터/결과 없음 (action 필요)
 * Alert: 정보성 안내 (참고용)
 *
 * === Props vs Store 패턴 ===
 * DataExplorationStep: 하이브리드 (Props=데이터, Store=UI 상태)
 * PurposeInputStep:    하이브리드 (Props=콜백, Store=분석 상태)
 * VariableSelectionStep: Store 전용
 * AnalysisExecutionStep: 하이브리드 (Props=핵심 상태+콜백, Store=보조 데이터)
 * ResultsActionStep:     하이브리드 (Props=results, Store=나머지)
 *
 * === Step 4 이중 구조 ===
 * page.tsx에서 !results → AnalysisExecutionStep, results → ResultsActionStep
 * results 설정으로 자동 전환. navigateToStep(3) 시 results 유지.
 */

export const STEP_STYLES = {
  cardHeaderBg: 'bg-muted/10',
  spaciousPadding: 'p-4',
  defaultPadding: 'p-3',
  compactPadding: 'p-2',
  actionRowPadding: 'p-3',
  tableHeaderCell: 'px-3 py-2.5',
  tableBodyCell: 'px-3 py-2.5',
} as const
