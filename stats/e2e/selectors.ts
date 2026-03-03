/**
 * E2E Selector Registry
 *
 * 모든 data-testid를 한곳에 모아 관리합니다.
 * - 컴포넌트와 E2E 테스트가 이 값을 공유
 * - UI가 바뀌어도 data-testid만 유지하면 테스트가 안 깨짐
 *
 * 규칙:
 * 1. 새 인터랙티브 요소 추가 시 여기에 등록
 * 2. 기존 testid 삭제/변경 절대 금지 (E2E 깨짐)
 * 3. 네이밍: kebab-case (예: run-analysis-btn)
 *
 * 일관성 검증: e2e/__tests__/selectors.integrity.test.ts 참조
 */

export const S = {
  // ===== Hub =====
  hubUploadCard: '[data-testid="hub-upload-card"]',

  // ===== Stepper =====
  stepperStep: (n: number) => `[data-testid="stepper-step-${n}"]`,

  // ===== Floating Navigation =====
  floatingNextBtn: '[data-testid="floating-next-btn"]',

  // ===== Data Upload / Exploration =====
  dataProfileSummary: '[data-testid="data-profile-summary"]',
  replaceDataButton: '[data-testid="replace-data-button"]',

  // ===== Data Prep Guide =====
  dataPrepGuide: '[data-testid="data-prep-guide"]',
  dataPrepGuideToggle: '[data-testid="data-prep-guide-toggle"]',
  dataPrepGuideContent: '[data-testid="data-prep-guide-content"]',
  dataPrepValidationOk: '[data-testid="data-prep-validation-ok"]',
  dataPrepValidationWarn: '[data-testid="data-prep-validation-warn"]',

  // ===== Method Selection (PurposeInputStep) =====
  /** FilterToggle: "AI가 추천" 탭 */
  filterAi: '[data-testid="filter-ai"]',
  /** FilterToggle: "직접 선택" 탭 */
  filterBrowse: '[data-testid="filter-browse"]',
  /** 메서드 검색 input */
  methodSearchInput: '[data-testid="method-search-input"]',
  /** 선택된 메서드 표시 바 */
  selectedMethodBar: '[data-testid="selected-method-bar"]',
  finalSelectedMethodName: '[data-testid="final-selected-method-name"]',
  /** "이 방법으로 분석하기" 확인 버튼 */
  confirmMethodBtn: '[data-testid="confirm-method-btn"]',

  // ===== AI / LLM Recommendation =====
  aiChatInput: '[data-testid="ai-chat-input"]',
  aiChatSubmit: '[data-testid="ai-chat-submit"]',
  recommendationCard: '[data-testid="recommendation-card"]',
  selectRecommendedMethod: '[data-testid="select-recommended-method"]',
  retryQuestion: '[data-testid="retry-question"]',
  alternativesToggle: '[data-testid="alternatives-toggle"]',
  examplePrompts: '[data-testid="example-prompts"]',

  // ===== Step Wrappers =====
  dataExplorationStep: '[data-testid="data-exploration-step"]',
  variableSelectionStep: '[data-testid="variable-selection-step"]',
  analysisExecutionStep: '[data-testid="analysis-execution-step"]',

  // ===== Variable Selection =====
  runAnalysisBtn: '[data-testid="run-analysis-btn"]',
  variableSelectorModern: '[data-testid="variable-selector-modern"]',
  /** 왼쪽 패널: 드래그 가능한 변수 아이템 */
  variableItem: (name: string) => `[data-testid="variable-item-${name}"]`,
  /** 오른쪽 패널: 역할별 드롭존 */
  roleZone: (role: string) => `[data-testid="role-zone-${role}"]`,
  /** 변수 선택 모달 (역할별) */
  variableModal: (role: string) => `[data-testid="variable-modal-${role}"]`,
  /** 모달 내 검색 input */
  modalSearch: '[data-testid="modal-search"]',
  /** 모달 내 변수 항목 */
  modalVar: (name: string) => `[data-testid="modal-var-${name}"]`,
  /** 모달 확인 버튼 */
  modalConfirmBtn: '[data-testid="modal-confirm-btn"]',

  // ===== Results =====
  resultsMainCard: '[data-testid="results-main-card"]',
  actionButtons: '[data-testid="action-buttons"]',
  newAnalysisBtn: '[data-testid="new-analysis-btn"]',
  detailedResultsSection: '[data-testid="detailed-results-section"]',
  diagnosticsSection: '[data-testid="diagnostics-section"]',
  aiInterpretationSection: '[data-testid="ai-interpretation-section"]',
  recommendationsSection: '[data-testid="recommendations-section"]',
  warningsSection: '[data-testid="warnings-section"]',
  alternativesSection: '[data-testid="alternatives-section"]',
  methodSpecificResults: '[data-testid="method-specific-results"]',

  // ===== Export =====
  exportDropdown: '[data-testid="export-dropdown"]',
  exportDocx: '[data-testid="export-docx"]',
  exportXlsx: '[data-testid="export-xlsx"]',
  exportHtml: '[data-testid="export-html"]',
} as const
