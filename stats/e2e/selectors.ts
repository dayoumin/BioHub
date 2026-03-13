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
  /** TrackSuggestions 내 "데이터 업로드" 클릭 가능 버튼 */
  hubUploadBtn: '[data-testid="hub-upload-btn"]',

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
  /** 레거시 개별 페이지용 분석 시작 버튼 (VariableSelectorModern) */
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

  // ===== Smart Flow Variable Selection (UnifiedVariableSelector) =====
  /** Smart Flow 통합 변수 셀렉터 */
  unifiedVariableSelector: '[data-testid="unified-variable-selector"]',
  /** 변수 풀 (좌측) */
  variablePool: '[data-testid="variable-pool"]',
  /** 풀 변수 아이템 */
  poolVar: (name: string) => `[data-testid="pool-var-${name}"]`,
  /** 슬롯 (역할별) */
  slot: (id: string) => `[data-testid="slot-${id}"]`,
  /** 변수 칩 (할당된 변수) */
  chip: (name: string) => `[data-testid="chip-${name}"]`,
  /** 변수 선택 완료 → 다음 단계 버튼 */
  variableSelectionNext: '[data-testid="variable-selection-next"]',

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

  // ===== Graph Studio (Smart Flow → 시각화 연계) =====
  /** Smart Flow 결과 화면의 "Graph Studio" 이동 버튼 */
  openGraphStudioBtn: '[data-testid="open-graph-studio-btn"]',
  /** Graph Studio 메인 차트 영역 */
  graphStudioChart: '[data-testid="graph-studio-chart"]',
  /** Graph Studio 사이드 패널 */
  graphStudioSidePanel: '[data-testid="graph-studio-side-panel"]',
  /** Graph Studio Undo 버튼 */
  graphStudioUndo: '[data-testid="graph-studio-undo"]',
  /** Graph Studio Redo 버튼 */
  graphStudioRedo: '[data-testid="graph-studio-redo"]',
  /** Graph Studio AI 패널 토글 */
  graphStudioAiToggle: '[data-testid="graph-studio-ai-toggle"]',
  /** Graph Studio 사이드 패널 토글 */
  graphStudioSideToggle: '[data-testid="graph-studio-side-toggle"]',
  /** Graph Studio 사이드 패널 — 데이터 탭 */
  graphStudioTabData: '[data-testid="graph-studio-tab-data"]',
  /** Graph Studio 사이드 패널 — 스타일 탭 */
  graphStudioTabStyle: '[data-testid="graph-studio-tab-style"]',
  /** Graph Studio 페이지 루트 (upload 모드 & editor 모드 공통) */
  graphStudioPage: '[data-testid="graph-studio-page"]',
  /** Graph Studio 업로드 — 실제 drag-drop 이벤트 수신 루트 (react-dropzone getRootProps) */
  graphStudioDropzone: '[data-testid="graph-studio-dropzone"]',
  /** Graph Studio 업로드 — 점선 박스 영역 (시각적 카드) */
  graphStudioUploadZone: '[data-testid="graph-studio-upload-zone"]',
  /** Graph Studio 업로드 — 파일 선택 버튼 */
  graphStudioFileUploadBtn: '[data-testid="graph-studio-file-upload-btn"]',
  /** Graph Studio 업로드 — sr-only file input (E2E setInputFiles 전용 타겟) */
  graphStudioFileInput: '[data-testid="graph-studio-file-input"]',
  /** Graph Studio 업로드 — 차트 유형 썸네일 */
  graphStudioChartType: (type: string) => `[data-testid="graph-studio-chart-type-${type}"]`,
  /** Graph Studio AI 패널 — 채팅 입력 */
  graphStudioAiInput: '[data-testid="ai-panel-input"]',
  /** Graph Studio AI 패널 — 전송 버튼 */
  graphStudioAiSend: '[data-testid="ai-panel-send"]',
  /** Graph Studio 좌측 데이터 패널 (G5.0) */
  graphStudioLeftPanel: '[data-testid="graph-studio-left-panel"]',
  /** Graph Studio 우측 속성 패널 (G5.0) */
  graphStudioRightPanel: '[data-testid="graph-studio-right-panel"]',
  /** Graph Studio 좌측 패널 토글 (G5.0) */
  graphStudioLeftToggle: '[data-testid="graph-studio-left-toggle"]',

  // ===== Hub (추가 카드) =====
  hubVisualizationCard: '[data-testid="hub-visualization-card"]',
  hubSampleSizeCard: '[data-testid="hub-sample-size-card"]',

  // ===== Smart Flow 추가 =====
  /** 결과 Q&A 팔로업 섹션 */
  followUpSection: '[data-testid="follow-up-section"]',
  /** AI 채팅 스레드 */
  chatThread: '[data-testid="chat-thread"]',
} as const
