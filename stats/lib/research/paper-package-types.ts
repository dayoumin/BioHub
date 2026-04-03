/**
 * Paper Package Assembly 타입
 * 설계서: docs/PLAN-PAPER-PACKAGE-ASSEMBLY.md
 */

// ── PackageItem ──────────────────────────────────────────

export interface PackageItem {
  id: string
  type: 'analysis' | 'figure' | 'table'
  /** analysisHistoryId 또는 graphProjectId */
  sourceId: string
  /** 분석 간 cross-reference용 레이블 배열 ("ANAL-01"). 그림/표는 여러 분석 참조 가능. */
  analysisIds: string[]
  label: string             // "Table 1", "Figure 2"
  section: 'results' | 'methods' | 'discussion'
  order: number
  included: boolean         // 체크박스로 제외 가능
  /** HistoryRecord 기반 자동 생성 시도 → 불가 시 수동 입력 */
  patternSummary?: string
}

// ── PackageReference ─────────────────────────────────────

export type ReferenceRole = 'methodology' | 'comparison' | 'background' | 'theory' | 'other'

export type SummaryStatus = 'missing' | 'draft' | 'ready'

export interface PackageReference {
  id: string
  citationId?: string       // Citation store 연결 (Phase 6a 이후)
  manualEntry?: {
    authors: string
    year: number
    title: string
    journal: string
    volume?: string
    issue?: string
    pages?: string
    doi?: string
  }
  role: ReferenceRole
  summary?: string          // 1-2문장 핵심 내용 (서론 hallucination 방지 필수)
  /**
   * 요약 작성 상태. 'ready'가 아닌 문헌은 export 시 경고 + "요약 없음" 안내 포함.
   * - 'missing': 요약 없음 (UI 경고, export 시 AI에 서술 최소화 지시)
   * - 'draft': AI 자동 제안 (사용자 확인 필요)
   * - 'ready': 사용자 확인 완료
   */
  summaryStatus: SummaryStatus
  included: boolean
}

// ── JournalPreset ─────────────────────────────────────────

export interface JournalPreset {
  id: string
  name: string
  style: string             // 'kjfs' | 'kso' | 'apa7' | 'imrad' | 'custom'
  sections: string[]        // 섹션 순서 — assemblePaperPackage가 이 배열을 따름
  language: 'ko' | 'en'
  referenceFormat: string   // 형식 규칙 설명
  referenceExample: string  // 예시 1개
  writingStyle?: string
}

// ── PaperPackage ──────────────────────────────────────────

export interface PaperPackage {
  id: string
  projectId: string
  version: number           // 1차 제출, 수정본 등

  overview: {
    title: string
    purpose: string
    researchQuestion?: string
    hypothesis?: string
    dataDescription: string
  }

  items: PackageItem[]
  references: PackageReference[]
  journal: JournalPreset

  context: {
    priorWorkDiff?: string
    limitations?: string
    highlights?: string
    theoreticalImplications?: string
    practicalImplications?: string
    futureResearch?: string
  }

  createdAt: string
  updatedAt: string
}

// ── AssemblyResult ────────────────────────────────────────

export interface AssemblyResult {
  markdown: string
  tokenEstimate: number
  /** 조립 중 감지된 경고 (required summary 없음 등) */
  warnings: string[]
}

// ── JOURNAL_PRESETS ───────────────────────────────────────

export const JOURNAL_PRESETS: JournalPreset[] = [
  {
    id: 'kjfs',
    name: '한국수산과학회지',
    style: 'kjfs',
    sections: ['서론', '재료 및 방법', '결과', '고찰', '참고문헌'],
    language: 'ko',
    referenceFormat: '저자 (연도). 제목. 저널명, 권(호), 쪽.',
    referenceExample: '김철수, 박영희 (2024). 남해 저서동물 군집. 한국수산과학회지, 57(2), 123-135.',
    writingStyle: '하다체, 능동태, 영문 학술용어 첫 등장 시 병기',
  },
  {
    id: 'kso',
    name: '한국해양학회지',
    style: 'kso',
    sections: ['서론', '방법', '결과', '토의', '참고문헌'],
    language: 'ko',
    referenceFormat: '저자 (연도). 제목. 저널명, 권(호), 쪽.',
    referenceExample: '이민수 (2025). 동해 해류 변동. 한국해양학회지, 30(1), 45-58.',
    writingStyle: '하다체, 학술 문어체',
  },
  {
    id: 'apa7',
    name: 'APA 7th (범용)',
    style: 'apa7',
    sections: ['Introduction', 'Method', 'Results', 'Discussion', 'References'],
    language: 'en',
    referenceFormat: 'Author, A. A. (Year). Title. Journal, volume(issue), pages. https://doi.org/xxx',
    referenceExample: 'Kim, J., & Park, S. (2024). Marine biodiversity. *J Marine Sci*, *45*(2), 123-135.',
  },
  {
    id: 'imrad',
    name: 'IMRAD (범용)',
    style: 'imrad',
    sections: ['Introduction', 'Methods', 'Results', 'Discussion'],
    language: 'en',
    referenceFormat: 'Author AA. Title. Journal. Year;volume(issue):pages.',
    referenceExample: 'Kim J, Park S. Marine biodiversity. J Marine Sci. 2024;45(2):123-135.',
  },
  {
    id: 'custom',
    name: '사용자 정의',
    style: 'custom',
    sections: ['서론', '방법', '결과', '고찰', '참고문헌'],
    language: 'ko',
    referenceFormat: '',
    referenceExample: '',
  },
]

// ── ID 생성 ───────────────────────────────────────────────

export function generatePackageId(): string {
  return `pkg_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
}

export function generatePackageItemId(): string {
  return `pitem_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
}

export function generatePackageRefId(): string {
  return `pref_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
}
