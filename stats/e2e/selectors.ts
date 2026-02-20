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
 */

export const S = {
  // ===== Hub =====
  hubUploadCard: '[data-testid="hub-upload-card"]',

  // ===== Stepper =====
  stepperStep: (n: number) => `[data-testid="stepper-step-${n}"]`,

  // ===== Floating Navigation =====
  floatingNextBtn: '[data-testid="floating-next-btn"]',

  // ===== Data Upload / Validation =====
  dataProfileSummary: '[data-testid="data-profile-summary"]',

  // ===== Method Selection (PurposeInputStep) =====
  /** FilterToggle: "AI가 추천" 탭 */
  filterAi: '[data-testid="filter-ai"]',
  /** FilterToggle: "직접 선택" 탭 */
  filterBrowse: '[data-testid="filter-browse"]',
  /** 메서드 검색 input */
  methodSearchInput: '[data-testid="method-search-input"]',
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

  // ===== Variable Selection =====
  runAnalysisBtn: '[data-testid="run-analysis-btn"]',

  // ===== Results =====
  resultsMainCard: '[data-testid="results-main-card"]',
  actionButtons: '[data-testid="action-buttons"]',
  detailedResultsSection: '[data-testid="detailed-results-section"]',
  diagnosticsSection: '[data-testid="diagnostics-section"]',
  aiInterpretationSection: '[data-testid="ai-interpretation-section"]',
  recommendationsSection: '[data-testid="recommendations-section"]',
  warningsSection: '[data-testid="warnings-section"]',
  alternativesSection: '[data-testid="alternatives-section"]',
  methodSpecificResults: '[data-testid="method-specific-results"]',
} as const
