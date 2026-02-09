/**
 * Terminology System Types
 *
 * 도메인별 용어 사전 시스템의 타입 정의
 * - 수산과학, 범용 통계 등 도메인에 따라 UI 텍스트를 동적으로 변경
 * - 타입 안전성을 보장하며 중앙 집중식 관리
 */

/**
 * 변수 타입별 용어
 */
export interface VariableTerminology {
  /** 변수 제목 */
  title: string
  /** 변수 설명 (예시 포함) */
  description: string
  /** 짧은 라벨 (공간이 제한된 곳에 사용) */
  shortLabel?: string
}

/**
 * 변수 선택기 용어 모음
 */
export interface VariableSelectorTerminology {
  /** 실험구/그룹 변수 */
  group: VariableTerminology
  /** 측정값/종속 변수 */
  dependent: VariableTerminology
  /** 요인 변수/독립 변수 */
  independent: VariableTerminology
  /** 처리 조건/요인 */
  factor: VariableTerminology
  /** 공변량 */
  covariate: VariableTerminology
  /** 시간 변수 */
  time: VariableTerminology
  /** 사건 변수 */
  event: VariableTerminology
  /** 대응 표본 - 첫 번째 측정 */
  pairedFirst: VariableTerminology
  /** 대응 표본 - 두 번째 측정 */
  pairedSecond: VariableTerminology
  /** 상관분석 변수 */
  correlation: VariableTerminology
}

/**
 * 유효성 검증 메시지
 */
export interface ValidationMessages {
  groupRequired: string
  dependentRequired: string
  independentRequired: string
  factorRequired: string
  twoGroupsRequired: (current: number) => string
  minVariablesRequired: (min: number) => string
  maxVariablesExceeded: (max: number) => string
  differentVariablesRequired: string
  noNumericVariables: string
  noCategoricalVariables: string
}

/**
 * 성공/완료 메시지
 */
export interface SuccessMessages {
  allVariablesSelected: string
  readyForAnalysis: string
  variablesSelected: (count: number) => string
  correlationPairsCount: (count: number) => string
  modelReady: (type: 'simple' | 'multiple', predictors: number) => string
}

/**
 * 변수 선택기 UI 텍스트
 */
export interface SelectorUIText {
  /** 제목 */
  titles: {
    groupComparison: string
    oneSample: string
    paired: string
    correlation: string
    multipleRegression: string
    twoWayAnova: string
  }
  /** 설명 */
  descriptions: {
    groupComparison: string
    oneSample: string
    paired: string
    correlation: string
    multipleRegression: string
    twoWayAnova: string
  }
  /** 버튼 텍스트 */
  buttons: {
    back: string
    runAnalysis: string
    selectAll: string
    clear: string
    swap: string
  }
  /** 기타 라벨 */
  labels: {
    selected: string
    compare: string
    across: string
    model: string
    levels: string
    groups: string
    numeric: string
    range: string
    mean: string
  }
}

/**
 * 통계 방법 용어
 */
export interface StatisticalMethodTerminology {
  /** 방법명 */
  name: string
  /** 짧은 설명 */
  description: string
  /** 사용 사례 예시 */
  useCase?: string
}

/**
 * Smart Flow UI 텍스트
 */
export interface SmartFlowText {
  /** Step 제목 */
  stepTitles: {
    dataUpload: string
    dataExploration: string
    purposeInput: string
    variableSelection: string
    analysisExecution: string
    results: string
  }
  /** Status 메시지 */
  statusMessages: {
    analyzing: string
    analysisComplete: string
    uploadingData: string
    validatingData: string
  }
  /** 버튼 텍스트 */
  buttons: {
    runAnalysis: string
    reanalyze: string
    downloadResults: string
    backToHub: string
  }
}

/**
 * 전체 용어 사전 인터페이스
 */
export interface TerminologyDictionary {
  /** 도메인 식별자 */
  domain: 'aquaculture' | 'generic' | 'medical' | string
  /** 도메인 표시명 */
  displayName: string
  /** 변수 용어 */
  variables: VariableSelectorTerminology
  /** 유효성 검증 메시지 */
  validation: ValidationMessages
  /** 성공 메시지 */
  success: SuccessMessages
  /** Selector UI 텍스트 */
  selectorUI: SelectorUIText
  /** Smart Flow UI 텍스트 */
  smartFlow: SmartFlowText
  /** 통계 방법 용어 (선택적) */
  methods?: Record<string, StatisticalMethodTerminology>
}

/**
 * Terminology Context Value
 */
export interface TerminologyContextValue {
  /** 현재 용어 사전 */
  dictionary: TerminologyDictionary
  /** 도메인 변경 함수 */
  setDomain: (domain: string) => void
  /** 현재 도메인 */
  currentDomain: string
}
