# Paper Package Assembly Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `/papers?pkg=<id>` 라우트에서 프로젝트 분석 결과를 Markdown + JSON 패키지로 조립해 SOTA AI(Claude/GPT/Gemini)에 붙여넣을 수 있도록 한다.

**Architecture:** `PaperPackage` 타입을 localStorage에 저장 (GraphProject 패턴 동일). `assemblePaperPackage()` 엔진이 `HistoryRecord` + `GraphProject`를 Markdown + JSON 블록으로 직렬화. UI는 5단계 wizard(`PackageBuilder.tsx`)로 구성, `PapersContent.tsx`의 `?pkg=<id>` 분기에 통합.

**Tech Stack:** Next.js 15 App Router, TypeScript strict, Zustand, localStorage, shadcn/ui (Button/Input/Textarea/Badge/Dialog), Vitest

---

## File Structure

**새로 생성:**
- `stats/lib/research/paper-package-types.ts` — PaperPackage, PackageItem, PackageReference, JournalPreset 타입 + JOURNAL_PRESETS 상수
- `stats/lib/research/paper-package-storage.ts` — localStorage CRUD (`lib/graph-studio/project-storage.ts` 패턴 동일)
- `stats/lib/research/paper-package-assembler.ts` — `assemblePaperPackage()`, `generateFigurePatternSummary()`
- `stats/components/papers/PackageBuilder.tsx` — 5단계 wizard (내부 step state)
- `stats/components/papers/PackagePreview.tsx` — 미리보기 + 클립보드/다운로드
- `stats/lib/research/__tests__/paper-package-storage.test.ts`
- `stats/lib/research/__tests__/paper-package-assembler.test.ts`

**수정:**
- `stats/app/papers/PapersContent.tsx` — `?pkg=<id>` 분기 추가
- `stats/components/papers/PapersHub.tsx` — "AI 패키지 조립" 진입점 추가

---

## Task 1: 타입 정의

**Files:**
- Create: `stats/lib/research/paper-package-types.ts`

- [ ] **Step 1: 파일 작성**

```typescript
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
   * included=true인 ref는 export 전 'ready'여야 함.
   * - 'missing': 요약 없음 (UI 경고)
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
```

- [ ] **Step 2: 커밋**

```bash
git add stats/lib/research/paper-package-types.ts
git commit -m "feat(paper-package): add PaperPackage types + JOURNAL_PRESETS"
```

---

## Task 2: 스토리지 (`paper-package-storage.ts`)

**Files:**
- Create: `stats/lib/research/paper-package-storage.ts`
- Create: `stats/lib/research/__tests__/paper-package-storage.test.ts`

- [ ] **Step 1: 테스트 작성 (`__tests__/paper-package-storage.test.ts`)**

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  listPackages,
  loadPackage,
  savePackage,
  deletePackage,
} from '../paper-package-storage'
import type { PaperPackage } from '../paper-package-types'
import { JOURNAL_PRESETS, generatePackageId } from '../paper-package-types'

const mockPackage = (overrides: Partial<PaperPackage> = {}): PaperPackage => ({
  id: generatePackageId(),
  projectId: 'proj_test',
  version: 1,
  overview: {
    title: '테스트 패키지',
    purpose: '단위 테스트용',
    dataDescription: '테스트 데이터',
  },
  items: [],
  references: [],
  journal: JOURNAL_PRESETS[0],
  context: {},
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
})

// createLocalStorageIO mock — factory 자체를 mock하여 내부 캐싱 문제 회피
const store: Record<string, string> = {}

vi.mock('@/lib/utils/local-storage-factory', () => ({
  createLocalStorageIO: () => ({
    readJson: <T,>(key: string, fallback: T): T => {
      const raw = store[key]
      return raw ? JSON.parse(raw) as T : fallback
    },
    writeJson: (key: string, value: unknown): void => {
      store[key] = JSON.stringify(value)
    },
  }),
}))

beforeEach(() => {
  Object.keys(store).forEach(k => delete store[k])
})

describe('paper-package-storage', () => {
  it('빈 스토리지에서 listPackages()는 빈 배열 반환', () => {
    expect(listPackages()).toEqual([])
  })

  it('저장 후 listPackages()에 나타남', () => {
    const pkg = mockPackage()
    savePackage(pkg)
    const list = listPackages()
    expect(list).toHaveLength(1)
    expect(list[0].id).toBe(pkg.id)
  })

  it('projectId 필터링 동작', () => {
    savePackage(mockPackage({ id: 'p1', projectId: 'proj_A' }))
    savePackage(mockPackage({ id: 'p2', projectId: 'proj_B' }))
    expect(listPackages('proj_A')).toHaveLength(1)
    expect(listPackages('proj_A')[0].id).toBe('p1')
  })

  it('loadPackage()는 저장된 패키지 반환', () => {
    const pkg = mockPackage()
    savePackage(pkg)
    const loaded = loadPackage(pkg.id)
    expect(loaded?.id).toBe(pkg.id)
    expect(loaded?.overview.title).toBe('테스트 패키지')
  })

  it('없는 ID는 null 반환', () => {
    expect(loadPackage('nonexistent')).toBeNull()
  })

  it('savePackage()는 기존 패키지를 덮어씀', () => {
    const pkg = mockPackage()
    savePackage(pkg)
    savePackage({ ...pkg, overview: { ...pkg.overview, title: '수정됨' } })
    expect(listPackages()).toHaveLength(1)
    expect(loadPackage(pkg.id)?.overview.title).toBe('수정됨')
  })

  it('deletePackage()는 패키지를 제거', () => {
    const pkg = mockPackage()
    savePackage(pkg)
    deletePackage(pkg.id)
    expect(listPackages()).toHaveLength(0)
  })
})
```

- [ ] **Step 2: 테스트 실행 (실패 확인)**

```bash
cd stats && pnpm test paper-package-storage
```

Expected: FAIL — `paper-package-storage` module not found

- [ ] **Step 3: 구현 작성 (`paper-package-storage.ts`)**

```typescript
/**
 * PaperPackage localStorage 저장소
 * 패턴: lib/graph-studio/project-storage.ts 와 동일
 */

import type { PaperPackage } from './paper-package-types'
import { createLocalStorageIO } from '@/lib/utils/local-storage-factory'

const STORAGE_KEY = 'paper_packages'
const { readJson, writeJson } = createLocalStorageIO('[paper-package-storage]')

export function listPackages(projectId?: string): PaperPackage[] {
  const all = readJson<PaperPackage[]>(STORAGE_KEY, [])
  if (!projectId) return all
  return all.filter(p => p.projectId === projectId)
}

export function loadPackage(packageId: string): PaperPackage | null {
  return listPackages().find(p => p.id === packageId) ?? null
}

export function savePackage(pkg: PaperPackage): void {
  const list = listPackages()
  const idx = list.findIndex(p => p.id === pkg.id)
  if (idx >= 0) {
    list[idx] = pkg
  } else {
    list.push(pkg)
  }
  writeJson(STORAGE_KEY, list)
}

export function deletePackage(packageId: string): void {
  const list = listPackages().filter(p => p.id !== packageId)
  writeJson(STORAGE_KEY, list)
}
```

- [ ] **Step 4: 테스트 실행 (통과 확인)**

```bash
cd stats && pnpm test paper-package-storage
```

Expected: PASS (7 tests)

- [ ] **Step 5: 커밋**

```bash
git add stats/lib/research/paper-package-storage.ts stats/lib/research/__tests__/paper-package-storage.test.ts
git commit -m "feat(paper-package): add localStorage storage CRUD"
```

---

## Task 3: 패턴 요약 자동 생성 + 조립 엔진

**Files:**
- Create: `stats/lib/research/paper-package-assembler.ts`
- Create: `stats/lib/research/__tests__/paper-package-assembler.test.ts`

- [ ] **Step 1: 테스트 작성**

```typescript
import { describe, it, expect } from 'vitest'
import {
  generateFigurePatternSummary,
  assemblePaperPackage,
} from '../paper-package-assembler'
import type { PackageDataSources } from '../paper-package-assembler'
import type { PaperPackage, PackageItem, PackageReference } from '../paper-package-types'
import { JOURNAL_PRESETS, generatePackageId, generatePackageItemId, generatePackageRefId } from '../paper-package-types'
import type { GraphProject } from '@/types/graph-studio'
import type { HistoryRecord } from '@/lib/utils/storage-types'

// ── generateFigurePatternSummary ──────────────────────────

describe('generateFigurePatternSummary', () => {
  const baseGraph: GraphProject = {
    id: 'g1',
    name: '박스플롯',
    chartSpec: { chartType: 'boxplot' } as GraphProject['chartSpec'],
    dataPackageId: 'dp1',
    editHistory: [],
    createdAt: '',
    updatedAt: '',
  }

  it('HistoryRecord 없으면 undefined 반환', () => {
    expect(generateFigurePatternSummary(baseGraph)).toBeUndefined()
  })

  it('results에 groupStats 있으면 패턴 요약 생성', () => {
    const record = {
      id: 'h1',
      results: {
        groupStats: [
          { group: 'A', mean: 2.1, n: 40 },
          { group: 'B', mean: 2.8, n: 40 },
          { group: 'C', mean: 2.3, n: 40 },
        ],
      },
    } as unknown as HistoryRecord
    const summary = generateFigurePatternSummary(baseGraph, record)
    expect(summary).toContain('B')
    expect(summary).toContain('2.8')
  })

  it('groupStats 없으면 undefined 반환', () => {
    const record = { id: 'h1', results: { p: 0.017 } } as unknown as HistoryRecord
    expect(generateFigurePatternSummary(baseGraph, record)).toBeUndefined()
  })
})

// ── assemblePaperPackage ──────────────────────────────────

const makeMinimalPackage = (): PaperPackage => ({
  id: generatePackageId(),
  projectId: 'proj_1',
  version: 1,
  overview: {
    title: '남해 종 다양성 연구',
    purpose: '해역별 종 다양성 비교',
    dataDescription: '남해 3개 해역 샘플링 데이터',
  },
  items: [],
  references: [],
  journal: JOURNAL_PRESETS[0], // 한국수산과학회지
  context: {},
  createdAt: '2026-04-03T00:00:00Z',
  updatedAt: '2026-04-03T00:00:00Z',
})

const emptySources: PackageDataSources = {
  historyRecords: [],
  graphProjects: [],
}

describe('assemblePaperPackage', () => {
  it('아이템 없어도 기본 구조 생성', () => {
    const result = assemblePaperPackage(makeMinimalPackage(), emptySources)
    expect(result.markdown).toContain('연구 논문 작성 요청')
    expect(result.markdown).toContain('한국수산과학회지')
    expect(result.markdown).toContain('남해 종 다양성 연구')
    expect(result.warnings).toEqual([])
  })

  it('included=false 아이템은 제외', () => {
    const pkg = makeMinimalPackage()
    const item: PackageItem = {
      id: generatePackageItemId(),
      type: 'analysis',
      sourceId: 'h_excluded',
      analysisIds: ['ANAL-01'],
      label: 'Table 1',
      section: 'results',
      order: 0,
      included: false,
    }
    pkg.items = [item]
    const sources: PackageDataSources = {
      historyRecords: [{
        id: 'h_excluded',
        method: { id: 'anova', name: 'One-way ANOVA', category: 'parametric' },
        results: {},
      } as unknown as HistoryRecord],
      graphProjects: [],
    }
    const result = assemblePaperPackage(pkg, sources)
    expect(result.markdown).not.toContain('One-way ANOVA')
  })

  it('included=true 아이템의 분석 method가 markdown에 포함', () => {
    const pkg = makeMinimalPackage()
    const item: PackageItem = {
      id: generatePackageItemId(),
      type: 'analysis',
      sourceId: 'h1',
      analysisIds: ['ANAL-01'],
      label: 'Table 1',
      section: 'results',
      order: 0,
      included: true,
    }
    pkg.items = [item]
    const sources: PackageDataSources = {
      historyRecords: [{
        id: 'h1',
        method: { id: 'anova', name: 'One-way ANOVA', category: 'parametric' },
        paperDraft: { results: 'F(2,117) = 4.23, p = .017' } as HistoryRecord['paperDraft'],
        results: {},
      } as unknown as HistoryRecord],
      graphProjects: [],
    }
    const result = assemblePaperPackage(pkg, sources)
    expect(result.markdown).toContain('One-way ANOVA')
    expect(result.markdown).toContain('ANAL-01')
  })

  it('included=true ref에 summaryStatus missing이면 경고 생성', () => {
    const pkg = makeMinimalPackage()
    const ref: PackageReference = {
      id: generatePackageRefId(),
      manualEntry: { authors: 'Kim J', year: 2024, title: 'Test', journal: 'JMS' },
      role: 'methodology',
      summaryStatus: 'missing',
      included: true,
    }
    pkg.references = [ref]
    const result = assemblePaperPackage(pkg, emptySources)
    expect(result.warnings.some(w => w.includes('요약'))).toBe(true)
  })

  it('tokenEstimate는 양수', () => {
    const result = assemblePaperPackage(makeMinimalPackage(), emptySources)
    expect(result.tokenEstimate).toBeGreaterThan(0)
  })
})
```

- [ ] **Step 2: 테스트 실행 (실패 확인)**

```bash
cd stats && pnpm test paper-package-assembler
```

Expected: FAIL — module not found

- [ ] **Step 3: 조립 엔진 구현**

```typescript
/**
 * Paper Package 조립 엔진
 * 설계서: docs/PLAN-PAPER-PACKAGE-ASSEMBLY.md §4-3
 */

import type { HistoryRecord } from '@/lib/utils/storage-types'
import type { GraphProject } from '@/types/graph-studio'
import type {
  PaperPackage,
  PackageItem,
  PackageReference,
  AssemblyResult,
} from './paper-package-types'

export interface PackageDataSources {
  historyRecords: HistoryRecord[]
  graphProjects: GraphProject[]
}

// ── groupStats 추출 (defensive) ───────────────────────────

interface GroupStat {
  group: string
  mean?: number
  median?: number
  n?: number
}

function isGroupStat(v: unknown): v is GroupStat {
  return (
    typeof v === 'object' &&
    v !== null &&
    'group' in v &&
    typeof (v as Record<string, unknown>).group === 'string'
  )
}

function extractGroupStats(results: Record<string, unknown>): GroupStat[] | undefined {
  const raw = results['groupStats'] ?? results['group_stats']
  if (!Array.isArray(raw)) return undefined
  const filtered = raw.filter(isGroupStat)
  return filtered.length > 0 ? filtered : undefined
}

// ── generateFigurePatternSummary ──────────────────────────

/**
 * GraphProject + HistoryRecord 기술통계에서 패턴 요약 자동 생성.
 * HistoryRecord가 없거나 groupStats 추출 불가 시 undefined 반환 → UI에서 수동 입력.
 *
 * Phase 16: DataPackage R2 저장 후 완전 자동 생성으로 업그레이드 예정.
 */
export function generateFigurePatternSummary(
  _graph: GraphProject,
  historyRecord?: HistoryRecord,
): string | undefined {
  if (!historyRecord?.results) return undefined

  const stats = extractGroupStats(historyRecord.results as Record<string, unknown>)
  if (!stats || stats.length === 0) return undefined

  // 평균(mean) 또는 중앙값(median) 기준 내림차순 정렬
  const sorted = [...stats].sort((a, b) => {
    const va = a.mean ?? a.median ?? 0
    const vb = b.mean ?? b.median ?? 0
    return vb - va
  })

  const parts = sorted.map(s => {
    const val = s.mean ?? s.median
    const label = s.mean !== undefined ? '평균' : '중앙값'
    return val !== undefined ? `${s.group}(${label} ${val})` : s.group
  })

  return `그룹별 ${parts[0].split('(')[1] ? '평균' : ''}: ${parts.join(' > ')}.`
}

// ── 포맷 헬퍼 ────────────────────────────────────────────

function formatReference(ref: PackageReference, index: number): string {
  const entry = ref.manualEntry
  if (!entry) return `[${index + 1}] (Citation Store 연결 필요)`

  const base = `${entry.authors} (${entry.year}). ${entry.title}. ${entry.journal}`
  const vol = entry.volume ? `, ${entry.volume}` : ''
  const iss = entry.issue ? `(${entry.issue})` : ''
  const pages = entry.pages ? `, ${entry.pages}` : ''
  const doi = entry.doi ? `. ${entry.doi}` : ''

  const roleLabel: Record<string, string> = {
    methodology: '방법론 근거',
    comparison: '비교 데이터',
    background: '배경 이론',
    theory: '배경 이론',
    other: '기타',
  }

  const lines = [`- ${base}${vol}${iss}${pages}${doi} — [${roleLabel[ref.role] ?? ref.role}]`]
  if (ref.summary) {
    lines.push(`  - 요약: ${ref.summary}`)
  }
  return lines.join('\n')
}

/** HistoryRecord에서 구조화된 분석 결과 JSON을 추출 (defensive) */
function serializeAnalysisItem(item: PackageItem, record: HistoryRecord): string {
  const methodName = record.method?.name ?? '분석'
  const r = (record.results ?? {}) as Record<string, unknown>
  const vm = record.variableMapping as Record<string, unknown> | null | undefined

  // 변수 정보 추출
  const dependent = vm?.['dependent'] ?? vm?.['response']
  const independent = vm?.['independent'] ?? vm?.['factor'] ?? vm?.['group']
  const groups = r['groups'] ?? r['groupNames']

  // 가정 검정 추출
  const assumptions = r['assumptions'] ?? r['assumptionTests']

  // 주요 결과 추출 (common patterns)
  const mainResult: Record<string, unknown> = {}
  for (const key of ['F', 't', 'chi2', 'U', 'H', 'W', 'z', 'r', 'df', 'p', 'p_value', 'pValue']) {
    if (r[key] !== undefined) mainResult[key] = r[key]
  }
  // fallback: nested result object
  if (Object.keys(mainResult).length === 0 && typeof r['result'] === 'object' && r['result'] !== null) {
    Object.assign(mainResult, r['result'] as Record<string, unknown>)
  }

  // 효과크기
  const effectSize = r['effectSize'] ?? r['effect_size']

  // 그룹 기술통계
  const groupStats = r['groupStats'] ?? r['group_stats']

  const json = JSON.stringify(
    {
      id: item.analysisIds[0] ?? item.label,
      method: methodName,
      label: item.label,
      section: item.section,
      dependent: dependent || undefined,
      independent: independent || undefined,
      groups: groups || undefined,
      assumptions: assumptions || undefined,
      result: Object.keys(mainResult).length > 0 ? mainResult : undefined,
      effectSize: effectSize || undefined,
      groupStats: groupStats || undefined,
      interpretation: record.paperDraft?.results ?? record.aiInterpretation ?? undefined,
      apaFormat: record.apaFormat ?? undefined,
    },
    null,
    2,
  )

  return `### [${item.label}] ${methodName}\n\`\`\`json\n${json}\n\`\`\``
}

function serializeFigureItem(item: PackageItem): string {
  const lines = [
    `### [${item.label}]`,
    item.patternSummary ? `- **패턴 요약**: ${item.patternSummary}` : '- **패턴 요약**: (직접 입력 필요)',
  ]
  if (item.analysisIds.length > 0) {
    lines.push(`- **관련 분석**: ${item.analysisIds.join(', ')}`)
  }
  return lines.join('\n')
}

// ── assemblePaperPackage ──────────────────────────────────

export function assemblePaperPackage(
  pkg: PaperPackage,
  sources: PackageDataSources,
): AssemblyResult {
  const warnings: string[] = []
  const sections: string[] = []

  const historyMap = new Map(sources.historyRecords.map(h => [h.id, h]))
  const graphMap = new Map(sources.graphProjects.map(g => [g.id, g]))

  const includedItems = pkg.items
    .filter(i => i.included)
    .sort((a, b) => a.order - b.order)

  const includedRefs = pkg.references.filter(r => r.included)

  // 1. 역할 + 핵심 규칙
  const lang = pkg.journal.language
  sections.push(`# 연구 논문 작성 요청

## 역할
당신은 ${pkg.overview.purpose ? `"${pkg.overview.purpose}" 연구의` : ''} 학술 논문 작성 전문가입니다.
아래 제공된 통계 분석 결과와 문헌을 기반으로 완전한 논문 초고를 작성하십시오.

## 핵심 규칙
1. 아래 제시된 통계 수치를 **정확히 그대로** 인용하십시오. 반올림하거나 변경 금지.
2. 제시되지 않은 데이터, 분석, 문헌을 **절대 지어내지(hallucinate) 마십시오**.
3. 참고문헌은 아래 "참고문헌 목록"에 있는 것만 사용하십시오.
4. 모든 Table/Figure 번호는 지정된 번호를 그대로 따르십시오.
5. 상관관계를 인과관계로 서술하지 마십시오.
6. 유의하지 않은 결과(p >= α)도 반드시 보고하십시오.`)

  // 2. 저널 설정 + 언어 규칙
  const journalSection = [`## 저널 설정
- 저널: ${pkg.journal.name}
- 스타일: ${pkg.journal.style}
- 언어: ${lang === 'ko' ? '한국어' : 'English'}
- 구조: ${pkg.journal.sections.join(' → ')}`]

  if (lang === 'ko' && pkg.journal.writingStyle) {
    journalSection.push(`\n## 한국어 작성 규칙\n- 문체: ${pkg.journal.writingStyle}\n- 통계 기호는 영문 이탤릭 유지 (*F*, *p*, *t*)`)
  }
  sections.push(journalSection.join('\n'))

  // 3. 연구 개요
  const overviewLines = [
    `## 1. 연구 개요`,
    `- 제목: ${pkg.overview.title}`,
    `- 목적: ${pkg.overview.purpose}`,
  ]
  if (pkg.overview.researchQuestion) overviewLines.push(`- 연구 질문: ${pkg.overview.researchQuestion}`)
  if (pkg.overview.hypothesis) overviewLines.push(`- 가설: ${pkg.overview.hypothesis}`)
  overviewLines.push(`- 데이터: ${pkg.overview.dataDescription}`)
  sections.push(overviewLines.join('\n'))

  // 4. 분석 결과 (analysis 타입 아이템)
  const analysisItems = includedItems.filter(i => i.type === 'analysis')
  if (analysisItems.length > 0) {
    const analysisParts = ['## 2. 분석 결과 (구조화 데이터)']
    for (const item of analysisItems) {
      const record = historyMap.get(item.sourceId)
      if (!record) {
        warnings.push(`[경고] ${item.label}: 분석 히스토리 레코드를 찾을 수 없음 (sourceId: ${item.sourceId})`)
        continue
      }
      analysisParts.push(serializeAnalysisItem(item, record))
    }
    sections.push(analysisParts.join('\n\n'))
  }

  // 5. 그래프 (figure 타입 아이템)
  const figureItems = includedItems.filter(i => i.type === 'figure')
  if (figureItems.length > 0) {
    const figureParts = ['## 3. 그래프']
    for (const item of figureItems) {
      const graph = graphMap.get(item.sourceId)
      if (!graph) {
        warnings.push(`[경고] ${item.label}: Graph Studio 프로젝트를 찾을 수 없음 (sourceId: ${item.sourceId})`)
        figureParts.push(serializeFigureItem(item))
        continue
      }
      figureParts.push(serializeFigureItem(item))
    }
    sections.push(figureParts.join('\n\n'))
  }

  // 6. 참고문헌
  const missingRefs = includedRefs.filter(r => r.summaryStatus !== 'ready')
  if (missingRefs.length > 0) {
    warnings.push(`[경고] ${missingRefs.length}개 문헌의 요약이 없거나 미확인 상태입니다 (summaryStatus: missing/draft). 서론 hallucination 위험 있음.`)
  }
  if (includedRefs.length > 0) {
    const refParts = ['## 4. 참고문헌 목록']
    includedRefs.forEach((ref, i) => refParts.push(formatReference(ref, i)))
    sections.push(refParts.join('\n'))
  }

  // 7. 추가 맥락
  const ctx = pkg.context
  const ctxFields = [
    ctx.priorWorkDiff && `- 선행연구와 차이점: ${ctx.priorWorkDiff}`,
    ctx.limitations && `- 연구의 한계: ${ctx.limitations}`,
    ctx.highlights && `- 강조할 발견: ${ctx.highlights}`,
    ctx.theoreticalImplications && `- 이론적 시사점: ${ctx.theoreticalImplications}`,
    ctx.practicalImplications && `- 실무적 시사점: ${ctx.practicalImplications}`,
    ctx.futureResearch && `- 후속 연구 제안: ${ctx.futureResearch}`,
  ].filter(Boolean)

  if (ctxFields.length > 0) {
    sections.push(`## 5. 추가 맥락\n${ctxFields.join('\n')}`)
  }

  // 검증 체크리스트
  if (analysisItems.length > 0) {
    const checklist = ['## 검증 체크리스트 (논문 완성 후 대조용)', '| 분석 | ID | 확인 |', '|------|-----|------|']
    for (const item of analysisItems) {
      checklist.push(`| ${item.label} | ${item.analysisIds.join(', ')} | [ ] |`)
    }
    sections.push(checklist.join('\n'))
  }

  const markdown = sections.join('\n\n---\n\n')
  const tokenEstimate = Math.ceil(markdown.length / 4)

  return { markdown, tokenEstimate, warnings }
}
```

- [ ] **Step 4: 테스트 실행 (통과 확인)**

```bash
cd stats && pnpm test paper-package-assembler
```

Expected: PASS (모든 테스트)

- [ ] **Step 5: 커밋**

```bash
git add stats/lib/research/paper-package-assembler.ts stats/lib/research/__tests__/paper-package-assembler.test.ts
git commit -m "feat(paper-package): add assembly engine + generateFigurePatternSummary"
```

---

## Task 4: PapersContent 라우팅 확장

**Files:**
- Modify: `stats/app/papers/PapersContent.tsx`

현재: `?doc=<id>` → DocumentEditor  
추가: `?pkg=<id>` → PackageBuilder, `?pkg=new&projectId=xxx` → PackageBuilder (신규)

- [ ] **Step 1: PapersContent.tsx 수정**

```typescript
'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import dynamic from 'next/dynamic'
import PapersHub from '@/components/papers/PapersHub'
import DocumentEditor from '@/components/papers/DocumentEditor'

const PackageBuilder = dynamic(
  () => import('@/components/papers/PackageBuilder'),
  { ssr: false },
)

export default function PapersContent(): React.ReactElement {
  const [docId, setDocId] = useState<string | null>(null)
  const [pkgId, setPkgId] = useState<string | null>(null)
  const [pkgProjectId, setPkgProjectId] = useState<string | null>(null)
  const initializedRef = useRef(false)

  useEffect(() => {
    const syncFromUrl = (): void => {
      const params = new URLSearchParams(window.location.search)
      setDocId(params.get('doc'))
      setPkgId(params.get('pkg'))
      setPkgProjectId(params.get('projectId'))
    }

    if (!initializedRef.current) {
      initializedRef.current = true
      syncFromUrl()
    }

    window.addEventListener('popstate', syncFromUrl)
    return () => window.removeEventListener('popstate', syncFromUrl)
  }, [])

  const handleOpenDocument = useCallback((id: string) => {
    window.history.pushState({}, '', `/papers?doc=${id}`)
    setDocId(id)
    setPkgId(null)
  }, [])

  const handleOpenPackage = useCallback((id: string, projectId?: string) => {
    const url = projectId
      ? `/papers?pkg=${id}&projectId=${projectId}`
      : `/papers?pkg=${id}`
    window.history.pushState({}, '', url)
    setPkgId(id)
    setPkgProjectId(projectId ?? null)
    setDocId(null)
  }, [])

  const handleBack = useCallback(() => {
    window.history.pushState({}, '', '/papers')
    setDocId(null)
    setPkgId(null)
    setPkgProjectId(null)
  }, [])

  if (docId) {
    return <DocumentEditor documentId={docId} onBack={handleBack} />
  }

  if (pkgId) {
    return (
      <PackageBuilder
        packageId={pkgId === 'new' ? undefined : pkgId}
        projectId={pkgProjectId ?? undefined}
        onBack={handleBack}
      />
    )
  }

  return (
    <PapersHub
      onOpenDocument={handleOpenDocument}
      onOpenPackage={handleOpenPackage}
    />
  )
}
```

- [ ] **Step 2: 타입 오류 확인**

```bash
cd stats && pnpm tsc --noEmit 2>&1 | head -30
```

PackageBuilder, PapersHub props 타입 오류 예상 — Task 5~6에서 해결.

- [ ] **Step 3: 커밋**

```bash
git add stats/app/papers/PapersContent.tsx
git commit -m "feat(paper-package): add ?pkg= routing branch in PapersContent"
```

---

## Task 5: PackageBuilder (5단계 wizard)

**Files:**
- Create: `stats/components/papers/PackageBuilder.tsx`
- Create: `stats/components/papers/PackagePreview.tsx`

- [ ] **Step 1: PackagePreview.tsx 작성**

미리보기 + export (Step 5 전용 컴포넌트):

```typescript
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import type { AssemblyResult } from '@/lib/research/paper-package-types'

interface PackagePreviewProps {
  result: AssemblyResult
}

export default function PackagePreview({ result }: PackagePreviewProps): React.ReactElement {
  const [copied, setCopied] = useState(false)

  const handleCopy = async (): Promise<void> => {
    await navigator.clipboard.writeText(result.markdown)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleDownload = (): void => {
    const blob = new Blob([result.markdown], { type: 'text/markdown;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'paper-package.md'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-4">
      {result.warnings.length > 0 && (
        <div className="rounded-md border border-yellow-200 bg-yellow-50 p-3 space-y-1">
          {result.warnings.map((w, i) => (
            <p key={i} className="text-sm text-yellow-800">{w}</p>
          ))}
        </div>
      )}

      <div className="flex items-center gap-3">
        <Button onClick={handleCopy} className="flex-1">
          {copied ? '복사됨 ✓' : '클립보드 복사'}
        </Button>
        <Button variant="outline" onClick={handleDownload}>
          .md 다운로드
        </Button>
        <Badge variant="secondary">
          ~{result.tokenEstimate.toLocaleString()} 토큰
        </Badge>
      </div>

      <div className="rounded-md border bg-muted/50 p-4 max-h-96 overflow-y-auto">
        <pre className="text-xs whitespace-pre-wrap font-mono">{result.markdown}</pre>
      </div>

      <div className="rounded-md border bg-blue-50 p-3 text-sm text-blue-800 space-y-1">
        <p className="font-medium">AI에게 보내는 법</p>
        <ol className="list-decimal list-inside space-y-0.5 text-xs">
          <li>[클립보드 복사] 클릭</li>
          <li>Claude / ChatGPT / Gemini 채팅에 붙여넣기</li>
          <li>(선택) Figure 이미지를 함께 첨부</li>
        </ol>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: PackageBuilder.tsx 작성**

```typescript
'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import PackagePreview from './PackagePreview'
import {
  loadPackage,
  savePackage,
} from '@/lib/research/paper-package-storage'
import {
  assemblePaperPackage,
  generateFigurePatternSummary,
} from '@/lib/research/paper-package-assembler'
import {
  JOURNAL_PRESETS,
  generatePackageId,
  generatePackageItemId,
  generatePackageRefId,
} from '@/lib/research/paper-package-types'
import type {
  PaperPackage,
  PackageItem,
  PackageReference,
  JournalPreset,
  AssemblyResult,
} from '@/lib/research/paper-package-types'
import { listProjectEntityRefs } from '@/lib/research/project-storage'
import { listProjects } from '@/lib/graph-studio/project-storage'
import { getAllHistory } from '@/lib/utils/storage'
import { loadResearchProject } from '@/lib/research/project-storage'

interface PackageBuilderProps {
  packageId?: string       // undefined = 신규 생성
  projectId?: string
  onBack: () => void
}

type Step = 1 | 2 | 3 | 4 | 5

function makeNewPackage(projectId: string): PaperPackage {
  return {
    id: generatePackageId(),
    projectId,
    version: 1,
    overview: { title: '', purpose: '', dataDescription: '' },
    items: [],
    references: [],
    journal: JOURNAL_PRESETS[0],
    context: {},
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
}

export default function PackageBuilder({
  packageId,
  projectId,
  onBack,
}: PackageBuilderProps): React.ReactElement {
  const [step, setStep] = useState<Step>(1)
  const [pkg, setPkg] = useState<PaperPackage | null>(null)
  const [assemblyResult, setAssemblyResult] = useState<AssemblyResult | null>(null)
  const [isAssembling, setIsAssembling] = useState(false)

  // 초기 로드
  useEffect(() => {
    let loaded: PaperPackage | null = null
    if (packageId) {
      loaded = loadPackage(packageId)
    }
    if (!loaded) {
      const pid = projectId ?? 'unknown'
      loaded = makeNewPackage(pid)
      // 프로젝트 정보에서 기본값 채우기
      const project = pid !== 'unknown' ? loadResearchProject(pid) : null
      if (project?.paperConfig) {
        loaded.overview.title = project.paperConfig.title ?? ''
      }
    }
    setPkg(loaded)
  }, [packageId, projectId])

  // Step 2로 이동 시 items 자동 수집
  const autoCollectItems = useCallback(async (currentPkg: PaperPackage): Promise<PaperPackage> => {
    if (currentPkg.items.length > 0) return currentPkg  // 이미 있으면 유지

    const refs = listProjectEntityRefs(currentPkg.projectId)
    const allHistory = await getAllHistory()
    const allGraphs = listProjects()

    const historyMap = new Map(allHistory.map(h => [h.id, h]))
    const graphMap = new Map(allGraphs.map(g => [g.id, g]))

    const items: PackageItem[] = []
    let order = 0

    for (const ref of refs) {
      if (ref.entityKind === 'analysis') {
        const record = historyMap.get(ref.entityId)
        if (!record) continue
        items.push({
          id: generatePackageItemId(),
          type: 'analysis',
          sourceId: ref.entityId,
          analysisIds: [`ANAL-${String(order + 1).padStart(2, '0')}`],
          label: `Table ${order + 1}`,
          section: 'results',
          order: order++,
          included: true,
        })
      } else if (ref.entityKind === 'figure') {
        const graph = graphMap.get(ref.entityId)
        if (!graph) continue
        const historyRecord = graph.analysisId ? historyMap.get(graph.analysisId) : undefined
        const patternSummary = generateFigurePatternSummary(graph, historyRecord)
        items.push({
          id: generatePackageItemId(),
          type: 'figure',
          sourceId: ref.entityId,
          analysisIds: graph.analysisId ? [graph.analysisId] : [],
          label: `Figure ${items.filter(i => i.type === 'figure').length + 1}`,
          section: 'results',
          order: order++,
          included: true,
          patternSummary,
        })
      }
    }

    return { ...currentPkg, items }
  }, [])

  const handleStepNext = useCallback(async (): Promise<void> => {
    if (!pkg) return
    if (step === 1) {
      // Step 2로 이동 시 items 자동 수집
      const updated = await autoCollectItems(pkg)
      setPkg(updated)
      savePackage(updated)
    } else {
      savePackage(pkg)
    }
    setStep(s => Math.min(5, s + 1) as Step)
  }, [pkg, step, autoCollectItems])

  const handleStepBack = useCallback((): void => {
    setStep(s => Math.max(1, s - 1) as Step)
  }, [])

  const handleAssemble = useCallback(async (): Promise<void> => {
    if (!pkg) return
    setIsAssembling(true)
    try {
      const allHistory = await getAllHistory()
      const allGraphs = listProjects()
      const result = assemblePaperPackage(pkg, {
        historyRecords: allHistory,
        graphProjects: allGraphs,
      })
      setAssemblyResult(result)
      savePackage({ ...pkg, updatedAt: new Date().toISOString() })
    } finally {
      setIsAssembling(false)
    }
  }, [pkg])

  const updatePkg = useCallback((updates: Partial<PaperPackage>): void => {
    setPkg(prev => prev ? { ...prev, ...updates } : prev)
  }, [])

  if (!pkg) return <div className="p-8 text-sm text-muted-foreground">로딩 중...</div>

  return (
    <div className="flex flex-col h-full">
      {/* 헤더 */}
      <div className="flex items-center gap-3 border-b px-6 py-4">
        <Button variant="ghost" size="sm" onClick={onBack}>← 뒤로</Button>
        <h1 className="text-base font-semibold">AI 논문 패키지 조립</h1>
        <div className="flex gap-1 ml-auto">
          {([1, 2, 3, 4, 5] as Step[]).map(s => (
            <Badge
              key={s}
              variant={step === s ? 'default' : step > s ? 'secondary' : 'outline'}
              className="text-xs"
            >
              {s}
            </Badge>
          ))}
        </div>
      </div>

      {/* 바디 */}
      <div className="flex-1 overflow-y-auto p-6 max-w-2xl mx-auto w-full space-y-6">

        {/* Step 1: 연구 개요 */}
        {step === 1 && (
          <div className="space-y-4">
            <h2 className="text-sm font-semibold">Step 1 — 연구 개요</h2>
            <div className="space-y-2">
              <label className="text-xs text-muted-foreground">제목</label>
              <Input
                value={pkg.overview.title}
                onChange={e => updatePkg({ overview: { ...pkg.overview, title: e.target.value } })}
                placeholder="연구 제목"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs text-muted-foreground">연구 목적</label>
              <Textarea
                value={pkg.overview.purpose}
                onChange={e => updatePkg({ overview: { ...pkg.overview, purpose: e.target.value } })}
                placeholder="연구 목적을 간략히 서술하세요"
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs text-muted-foreground">데이터 설명</label>
              <Textarea
                value={pkg.overview.dataDescription}
                onChange={e => updatePkg({ overview: { ...pkg.overview, dataDescription: e.target.value } })}
                placeholder="데이터 출처, 기간, 지역, 샘플 수 등"
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs text-muted-foreground">연구 질문 (선택)</label>
              <Input
                value={pkg.overview.researchQuestion ?? ''}
                onChange={e => updatePkg({ overview: { ...pkg.overview, researchQuestion: e.target.value || undefined } })}
                placeholder="탐색적 연구의 경우"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs text-muted-foreground">가설 (선택)</label>
              <Input
                value={pkg.overview.hypothesis ?? ''}
                onChange={e => updatePkg({ overview: { ...pkg.overview, hypothesis: e.target.value || undefined } })}
                placeholder="가설 기반 연구의 경우"
              />
            </div>
          </div>
        )}

        {/* Step 2: 결과 배치 */}
        {step === 2 && (
          <div className="space-y-4">
            <h2 className="text-sm font-semibold">Step 2 — 결과 배치</h2>
            {pkg.items.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                프로젝트에 연결된 분석/그래프가 없습니다. 분석 후 프로젝트에 추가하세요.
              </p>
            ) : (
              <div className="space-y-2">
                {pkg.items.map((item, idx) => {
                  const swapOrder = (dir: -1 | 1): void => {
                    const target = idx + dir
                    if (target < 0 || target >= pkg.items.length) return
                    const items = [...pkg.items]
                    const temp = items[target]
                    items[target] = { ...items[idx], order: target }
                    items[idx] = { ...temp, order: idx }
                    updatePkg({ items })
                  }
                  return (
                    <div
                      key={item.id}
                      className="flex items-center gap-2 rounded-md border px-3 py-2"
                    >
                      <div className="flex flex-col gap-0.5">
                        <button
                          onClick={() => swapOrder(-1)}
                          disabled={idx === 0}
                          className="text-xs text-muted-foreground hover:text-foreground disabled:opacity-30"
                        >↑</button>
                        <button
                          onClick={() => swapOrder(1)}
                          disabled={idx === pkg.items.length - 1}
                          className="text-xs text-muted-foreground hover:text-foreground disabled:opacity-30"
                        >↓</button>
                      </div>
                      <input
                        type="checkbox"
                        checked={item.included}
                        onChange={e => {
                          const items = [...pkg.items]
                          items[idx] = { ...item, included: e.target.checked }
                          updatePkg({ items })
                        }}
                      />
                      <Badge variant="outline" className="text-xs shrink-0">
                        {item.type}
                      </Badge>
                      <Input
                        value={item.label}
                        onChange={e => {
                          const items = [...pkg.items]
                          items[idx] = { ...item, label: e.target.value }
                          updatePkg({ items })
                        }}
                        className="w-24 h-6 text-xs"
                      />
                      <span className="text-xs text-muted-foreground flex-1 truncate">
                        {item.sourceId}
                      </span>
                      {item.type === 'figure' && (
                        <Input
                          value={item.patternSummary ?? ''}
                          onChange={e => {
                            const items = [...pkg.items]
                            items[idx] = { ...item, patternSummary: e.target.value || undefined }
                            updatePkg({ items })
                          }}
                          placeholder="패턴 요약 (자동 또는 수동)"
                          className="h-6 text-xs"
                        />
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* Step 3: 문헌 */}
        {step === 3 && (
          <div className="space-y-4">
            <h2 className="text-sm font-semibold">Step 3 — 참고문헌</h2>
            <p className="text-xs text-muted-foreground">
              논문에 인용할 문헌을 추가하고 역할과 요약을 입력하세요.
              요약이 없으면 AI가 서론을 hallucination으로 채울 수 있습니다.
            </p>
            {pkg.references.map((ref, idx) => {
              const updateRef = (updates: Partial<PackageReference>): void => {
                const references = [...pkg.references]
                references[idx] = { ...ref, ...updates }
                updatePkg({ references })
              }
              const updateEntry = (field: string, value: string | number): void => {
                updateRef({ manualEntry: { ...ref.manualEntry!, [field]: value } })
              }
              return (
                <div key={ref.id} className="rounded-md border p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={ref.included}
                      onChange={e => updateRef({ included: e.target.checked })}
                    />
                    <Badge
                      variant={ref.summaryStatus === 'ready' ? 'default' : 'destructive'}
                      className="text-xs"
                    >
                      {ref.summaryStatus}
                    </Badge>
                    <select
                      value={ref.role}
                      onChange={e => updateRef({ role: e.target.value as PackageReference['role'] })}
                      className="text-xs border rounded px-1 py-0.5"
                    >
                      <option value="background">배경 이론</option>
                      <option value="methodology">방법론 근거</option>
                      <option value="comparison">비교 데이터</option>
                      <option value="theory">이론적 배경</option>
                      <option value="other">기타</option>
                    </select>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs ml-auto text-destructive"
                      onClick={() => updatePkg({ references: pkg.references.filter((_, i) => i !== idx) })}
                    >
                      삭제
                    </Button>
                  </div>
                  {ref.manualEntry && (
                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        value={ref.manualEntry.authors}
                        onChange={e => updateEntry('authors', e.target.value)}
                        placeholder="저자 (예: Kim J, Park S)"
                        className="h-7 text-xs"
                      />
                      <Input
                        value={ref.manualEntry.year}
                        onChange={e => updateEntry('year', Number(e.target.value) || 0)}
                        placeholder="연도"
                        className="h-7 text-xs w-20"
                        type="number"
                      />
                      <Input
                        value={ref.manualEntry.title}
                        onChange={e => updateEntry('title', e.target.value)}
                        placeholder="논문 제목"
                        className="h-7 text-xs col-span-2"
                      />
                      <Input
                        value={ref.manualEntry.journal}
                        onChange={e => updateEntry('journal', e.target.value)}
                        placeholder="저널명"
                        className="h-7 text-xs"
                      />
                      <Input
                        value={ref.manualEntry.doi ?? ''}
                        onChange={e => updateEntry('doi', e.target.value)}
                        placeholder="DOI (선택)"
                        className="h-7 text-xs"
                      />
                    </div>
                  )}
                  <Textarea
                    value={ref.summary ?? ''}
                    onChange={e => {
                      const summary = e.target.value
                      updateRef({
                        summary: summary || undefined,
                        summaryStatus: summary ? 'ready' : 'missing',
                      })
                    }}
                    placeholder="1-2문장 핵심 내용 (필수 — 없으면 AI가 서론을 지어냄)"
                    rows={2}
                    className="text-xs"
                  />
                </div>
              )
            })}
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const newRef: PackageReference = {
                  id: generatePackageRefId(),
                  manualEntry: { authors: '', year: new Date().getFullYear(), title: '', journal: '' },
                  role: 'background',
                  summaryStatus: 'missing',
                  included: true,
                }
                updatePkg({ references: [...pkg.references, newRef] })
              }}
            >
              + 문헌 추가
            </Button>
          </div>
        )}

        {/* Step 4: 저널 설정 + 추가 맥락 */}
        {step === 4 && (
          <div className="space-y-4">
            <h2 className="text-sm font-semibold">Step 4 — 저널 설정 + 추가 맥락</h2>
            <div className="grid grid-cols-2 gap-2">
              {JOURNAL_PRESETS.map(preset => (
                <button
                  key={preset.id}
                  onClick={() => updatePkg({ journal: preset })}
                  className={`rounded-md border px-3 py-2 text-left text-xs transition-colors ${
                    pkg.journal.id === preset.id
                      ? 'border-primary bg-primary/5'
                      : 'hover:bg-muted/50'
                  }`}
                >
                  <div className="font-medium">{preset.name}</div>
                  <div className="text-muted-foreground">{preset.language === 'ko' ? '한국어' : 'English'}</div>
                </button>
              ))}
            </div>
            {([
              ['priorWorkDiff', '선행연구와 차이점'],
              ['limitations', '연구의 한계'],
              ['highlights', '강조할 발견'],
              ['theoreticalImplications', '이론적 시사점'],
              ['practicalImplications', '실무적/정책적 시사점'],
              ['futureResearch', '후속 연구 제안'],
            ] as const).map(([field, label]) => (
              <div key={field} className="space-y-2">
                <label className="text-xs text-muted-foreground">{label} (선택)</label>
                <Textarea
                  value={(pkg.context as Record<string, string | undefined>)[field] ?? ''}
                  onChange={e => updatePkg({ context: { ...pkg.context, [field]: e.target.value || undefined } })}
                  rows={2}
                  className="text-xs"
                />
              </div>
            ))}
          </div>
        )}

        {/* Step 5: 미리보기 + Export */}
        {step === 5 && (
          <div className="space-y-4">
            <h2 className="text-sm font-semibold">Step 5 — 미리보기 + Export</h2>
            {!assemblyResult ? (
              <Button onClick={handleAssemble} disabled={isAssembling} className="w-full">
                {isAssembling ? '조립 중...' : '패키지 조립하기'}
              </Button>
            ) : (
              <>
                <PackagePreview result={assemblyResult} />
                <Button variant="outline" size="sm" onClick={() => setAssemblyResult(null)}>
                  재조립
                </Button>
              </>
            )}
          </div>
        )}
      </div>

      {/* 하단 내비게이션 */}
      <div className="flex justify-between border-t px-6 py-3">
        <Button variant="outline" size="sm" onClick={step === 1 ? onBack : handleStepBack}>
          {step === 1 ? '취소' : '← 이전'}
        </Button>
        {step < 5 && (
          <Button size="sm" onClick={handleStepNext}>
            다음 →
          </Button>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: 타입 오류 확인**

```bash
cd stats && pnpm tsc --noEmit 2>&1 | grep -i "packagebuilder\|packagepreview\|paper-package" | head -20
```

- [ ] **Step 4: 커밋**

```bash
git add stats/components/papers/PackageBuilder.tsx stats/components/papers/PackagePreview.tsx
git commit -m "feat(paper-package): add PackageBuilder 5-step wizard + PackagePreview"
```

---

## Task 6: PapersHub 진입점 추가

**Files:**
- Modify: `stats/components/papers/PapersHub.tsx`

- [ ] **Step 1: PapersHub.tsx 읽기**

현재 `onOpenDocument` prop만 있는지 확인 후 `onOpenPackage` prop 추가.

```bash
cd stats && grep -n "onOpenDocument\|interface.*Props\|Props}" components/papers/PapersHub.tsx | head -20
```

- [ ] **Step 2: Props + 버튼 추가**

PapersHub의 Props 인터페이스에 추가:

```typescript
onOpenPackage?: (id: string, projectId?: string) => void
```

그리고 기존 "새 문서" 버튼 옆이나 아래에 "AI 패키지 조립" 버튼 추가:

기존 "새 문서" 버튼과 같은 `activeProject` 가드 안에 배치:

```typescript
{activeProject && onOpenPackage && (
  <Button
    variant="outline"
    onClick={() => onOpenPackage('new', activeProject.id)}
  >
    AI 패키지 조립
  </Button>
)}
```

- [ ] **Step 3: 타입 오류 없는지 확인**

```bash
cd stats && pnpm tsc --noEmit 2>&1 | head -20
```

Expected: 오류 없음

- [ ] **Step 4: 커밋**

```bash
git add stats/components/papers/PapersHub.tsx
git commit -m "feat(paper-package): add 'AI 패키지 조립' entry in PapersHub"
```

---

## Task 7: 전체 검증

- [ ] **Step 1: 전체 타입 체크**

```bash
cd stats && pnpm tsc --noEmit
```

Expected: 오류 없음

- [ ] **Step 2: 전체 테스트**

```bash
cd stats && pnpm test paper-package
```

Expected: 모든 테스트 PASS

- [ ] **Step 3: 개발 서버에서 수동 확인**

```bash
cd stats && pnpm dev
```

확인 항목:
- `/papers` → PapersHub에 "AI 패키지 조립" 버튼 표시
- 버튼 클릭 → `/papers?pkg=new&projectId=xxx`로 이동
- PackageBuilder Step 1~5 이동 가능
- Step 5에서 "패키지 조립하기" 클릭 → Markdown 생성 + 클립보드 복사 동작

- [ ] **Step 4: 최종 커밋**

```bash
git add -A
git commit -m "feat(paper-package): Paper Package Assembly MVP complete

- PaperPackage types + JOURNAL_PRESETS (5 presets)
- localStorage CRUD (paper-package-storage)
- assemblePaperPackage() engine + generateFigurePatternSummary()
- PackageBuilder 5-step wizard
- PackagePreview (clipboard copy + .md download)
- PapersContent ?pkg= routing
- PapersHub entry point"
```

---

## Self-Review

### Spec Coverage

| 요구사항 | 구현 태스크 |
|---------|------------|
| PaperPackage 타입 (analysisIds: string[]) | Task 1 |
| summaryStatus 'missing/draft/ready' | Task 1 |
| JOURNAL_PRESETS 5개 | Task 1 |
| localStorage CRUD | Task 2 |
| generateFigurePatternSummary (HistoryRecord 기반) | Task 3 |
| assemblePaperPackage (warnings 포함) | Task 3 |
| ?pkg= 라우팅 | Task 4 |
| 5단계 wizard UI | Task 5 |
| 클립보드 복사 + .md 다운로드 | Task 5 |
| PapersHub 진입점 | Task 6 |

**미포함 (YAGNI, 나중에):**
- 이미지 zip export (Phase 2)
- AI 자동 요약 제안 (summaryStatus: 'draft') — Citation Manager 이후
- 빠른 재export (패키지 저장 후 재조립) — 이미 savePackage로 상태 유지됨
- DataPackage R2 저장 → 완전 자동 패턴 요약 (Phase 16)

### Type Consistency Check

- `PackageItem.analysisIds: string[]` — Task 1, 3, 5 모두 배열로 일관
- `PackageReference.summaryStatus` — Task 1 정의, Task 3 테스트, Task 5 UI 모두 동일
- `PackageDataSources` — Task 3에서 정의, Task 5에서 사용 (export 필요)
- `generateFigurePatternSummary(graph, historyRecord?)` — Task 3 정의, Task 5에서 사용
