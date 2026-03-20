/**
 * 논문 초안 생성 타입 정의
 * 계획서: stats/docs/PLAN-PAPER-DRAFT-GENERATION.md
 */

export type PaperSection = 'methods' | 'results' | 'captions' | 'discussion'

export interface PaperDraftOptions {
  language: 'ko' | 'en'
  sections?: PaperSection[]
  style?: 'apa7'
  postHocDisplay?: 'significant-only' | 'all'
}

/** 생성 전 확인 단계에서 사용자가 수정/확인하는 컨텍스트 */
export interface DraftContext {
  variableLabels: Record<string, string>   // 컬럼명 → 표시명 ('body_len' → '체장')
  variableUnits: Record<string, string>    // 컬럼명 → 단위 ('body_len' → 'cm')
  groupLabels: Record<string, string>      // 그룹코드 → 표시명 ('M' → '수컷')
  dependentVariable?: string              // 종속변수 표시명 ('체장')
  researchContext?: string                // 연구 맥락 한 줄
}

/** Caption 항목 (표와 그림 분리) */
export interface CaptionItem {
  kind: 'table' | 'figure'
  label: string  // 'Table 1', 'Figure 1'
  text: string   // 캡션 본문
}

/** 통계 결과 표 */
export interface PaperTable {
  id: 'descriptive' | 'test-result' | 'post-hoc'
  title: string          // '표 1. 기술통계량' 등
  htmlContent: string    // 렌더링용 HTML 테이블
  plainText: string      // 복사용 탭 구분 텍스트
}

/** 각 섹션은 null 가능 — 부분 생성 + 스트리밍 중간 상태 표현 */
export interface PaperDraft {
  methods: string | null
  results: string | null
  captions: CaptionItem[] | null
  discussion: string | null
  tables?: PaperTable[]           // 통계 결과 표 (기술통계, 검정결과, 사후검정)
  chartImageUrl?: string          // 분석 차트 이미지 (data URL)
  language: 'ko' | 'en'
  postHocDisplay: 'significant-only' | 'all'  // 복원 후 재생성 시 옵션 유지
  generatedAt: string
  model: string | null  // Discussion 생성 시에만 모델명
  context: DraftContext // 생성에 사용된 컨텍스트 (재생성 시 유지)
}

/** Discussion 스트리밍 상태 (UI용) */
export type DiscussionState =
  | { status: 'idle' }
  | { status: 'streaming'; partial: string }
  | { status: 'cancelling'; partial: string }
  | { status: 'done'; text: string; model: string }
  | { status: 'error'; message: string }

export type FlatAssumptionCategory =
  | 'normality'
  | 'homogeneity'
  | 'independence'
  | 'linearity'
  | 'sphericity'
  | 'proportionalOdds'
  | 'overdispersion'
  | 'proportionalHazards'
  | 'stationarity'
  | 'whiteNoise'

/** flattenAssumptions 출력 */
export interface FlatAssumption {
  category: FlatAssumptionCategory
  testName: string    // 'Shapiro-Wilk' | 'Levene' | ...
  statistic?: number
  pValue?: number
  passed: boolean
  group?: string      // 'group1', 'group2' (정규성 그룹별)
}
