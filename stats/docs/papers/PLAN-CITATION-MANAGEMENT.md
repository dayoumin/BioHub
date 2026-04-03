# Citation Management (Phase 6a) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 프로젝트에 저장된 문헌을 인용 관리하고 DocumentBlueprint의 References 섹션에 APA 포맷으로 자동 병합한다.

**Architecture:** IndexedDB에 `citations` 스토어(DB_VERSION 5) 추가 → citation-storage.ts로 CRUD → APA 포맷터로 문자열 생성 → assembler가 Citations를 References 섹션에 병합. 사용자는 `/literature` 검색 결과에서 "프로젝트에 저장" 버튼으로 인용 추가, MaterialPalette "문헌" 탭에서 확인 후 클릭으로 References 섹션 삽입.

**Tech Stack:** TypeScript, IndexedDB (openDB from indexeddb-adapter), Vitest, React, shadcn/ui

---

## 파일 구조

```
신규 생성:
  stats/lib/research/citation-types.ts
  stats/lib/research/citation-storage.ts
  stats/lib/research/citation-apa-formatter.ts
  stats/lib/research/__tests__/citation-apa-formatter.test.ts
  stats/lib/research/__tests__/citation-storage.test.ts

수정:
  stats/lib/utils/adapters/indexeddb-adapter.ts       ← DB_VERSION 4→5, citations 스토어 추가
  stats/lib/research/document-assembler.ts            ← AssemblerDataSources에 citations 추가, References 병합
  stats/lib/research/__tests__/document-assembler.test.ts  ← citations 병합 테스트 추가
  stats/components/papers/MaterialPalette.tsx         ← "문헌" 탭 추가
  stats/components/papers/DocumentEditor.tsx          ← citations 로드 + onInsertCitation 핸들러
  stats/app/literature/LiteratureSearchContent.tsx    ← "프로젝트에 저장" 버튼 추가
```

---

## Task 1: CitationRecord 타입 정의

**Files:**
- Create: `stats/lib/research/citation-types.ts`

- [ ] **Step 1: 파일 생성**

```typescript
// stats/lib/research/citation-types.ts
import type { LiteratureItem } from '@/lib/types/literature'

/**
 * 프로젝트에 저장된 인용 레코드
 *
 * LiteratureItem의 스냅샷을 보관. 원본 검색 결과가 사라져도 인용 유지.
 */
export interface CitationRecord {
  id: string          // `cit_${Date.now()}_${random}`
  projectId: string
  item: LiteratureItem  // 저장 시점 스냅샷
  addedAt: string       // ISO string
}

/** CitationRecord 생성 헬퍼 */
export function createCitationRecord(projectId: string, item: LiteratureItem): CitationRecord {
  const random = Math.random().toString(36).slice(2, 7)
  return {
    id: `cit_${Date.now()}_${random}`,
    projectId,
    item,
    addedAt: new Date().toISOString(),
  }
}
```

- [ ] **Step 2: 커밋**

```bash
git add stats/lib/research/citation-types.ts
git commit -m "feat(citation): CitationRecord 타입 + createCitationRecord 헬퍼"
```

---

## Task 2: APA 포맷터 (TDD)

**Files:**
- Create: `stats/lib/research/citation-apa-formatter.ts`
- Create: `stats/lib/research/__tests__/citation-apa-formatter.test.ts`

- [ ] **Step 1: 실패하는 테스트 작성**

```typescript
// stats/lib/research/__tests__/citation-apa-formatter.test.ts
import { describe, it, expect } from 'vitest'
import { buildCitationString, formatAuthors } from '../citation-apa-formatter'
// buildCitationString = 이전의 formatApa
import type { LiteratureItem } from '@/lib/types/literature'

function makeItem(overrides: Partial<LiteratureItem> = {}): LiteratureItem {
  return {
    id: 'test_1',
    source: 'openalex',
    title: 'Population genetics of marine fish',
    authors: ['Kim Jungwoo', 'Lee Sunghee'],
    year: 2023,
    journal: 'Marine Biology',
    url: 'https://example.com',
    doi: '10.1234/mb.2023',
    searchedName: 'Gadus morhua',
    ...overrides,
  }
}

describe('formatAuthors', () => {
  it('저자 1명', () => {
    expect(formatAuthors(['Kim J'])).toBe('Kim J')
  })

  it('저자 2명: A, & B', () => {
    expect(formatAuthors(['Kim J', 'Lee S'])).toBe('Kim J, & Lee S')
  })

  it('저자 3명: A, B, & C', () => {
    expect(formatAuthors(['Kim J', 'Lee S', 'Park M'])).toBe('Kim J, Lee S, & Park M')
  })

  it('저자 8명 이상: 6명 + ... + 마지막', () => {
    const authors = ['A1', 'A2', 'A3', 'A4', 'A5', 'A6', 'A7', 'A8']
    expect(formatAuthors(authors)).toBe('A1, A2, A3, A4, A5, A6, ... A8')
  })

  it('저자 없음: Unknown', () => {
    expect(formatAuthors([])).toBe('Unknown')
  })
})

describe('buildCitationString', () => {
  it('doi가 있으면 https://doi.org/ 포함', () => {
    const result = buildCitationString(makeItem())
    expect(result).toContain('https://doi.org/10.1234/mb.2023')
  })

  it('doi 없으면 url 사용', () => {
    const result = buildCitationString(makeItem({ doi: undefined }))
    expect(result).toContain('https://example.com')
  })

  it('year가 null이면 (n.d.) 표시', () => {
    const result = buildCitationString(makeItem({ year: null }))
    expect(result).toContain('(n.d.)')
  })

  it('journal 없으면 생략', () => {
    const result = buildCitationString(makeItem({ journal: undefined }))
    expect(result).not.toContain('undefined')
  })

  it('전체 포맷: "저자. (연도). 제목. 저널. doi."', () => {
    const result = buildCitationString(makeItem({
      authors: ['Kim J'],
      year: 2023,
      title: 'Test Title',
      journal: 'Test Journal',
      doi: '10.0000/test',
    }))
    expect(result).toBe('Kim J. (2023). Test Title. Test Journal. https://doi.org/10.0000/test.')
  })
})
```

- [ ] **Step 2: 테스트 실패 확인**

```bash
cd stats && pnpm test citation-apa-formatter
```
Expected: FAIL (모듈 없음)

- [ ] **Step 3: 구현**

```typescript
// stats/lib/research/citation-apa-formatter.ts
import type { LiteratureItem } from '@/lib/types/literature'

/**
 * 저자 목록 → best-effort APA 형식 문자열
 *
 * LiteratureItem.authors는 "Kim Jungwoo" 같은 display name 형태이므로
 * "Kim, J." 정규화는 하지 않음. 원본 문자열 그대로 APA 구두점 규칙만 적용.
 */
export function formatAuthors(authors: string[]): string {
  if (authors.length === 0) return 'Unknown'
  if (authors.length === 1) return authors[0]
  if (authors.length <= 7) {
    const last = authors[authors.length - 1]
    return `${authors.slice(0, -1).join(', ')}, & ${last}`
  }
  // APA 7판: 저자 8명 이상 → 첫 6명, ..., 마지막 저자
  return `${authors.slice(0, 6).join(', ')}, ... ${authors[authors.length - 1]}`
}

/**
 * LiteratureItem → best-effort 인용 문자열 (APA 7판 구조 참고)
 *
 * 형식: 저자. (연도). 제목. 저널. doi/url.
 * author normalization은 미지원 — display name을 그대로 사용.
 */
export function buildCitationString(item: LiteratureItem): string {
  const authors = formatAuthors(item.authors)
  const year = item.year != null ? `(${item.year})` : '(n.d.)'
  const doi = item.doi
    ? `https://doi.org/${item.doi}`
    : item.url

  const parts: string[] = [authors, year, item.title]
  if (item.journal) parts.push(item.journal)
  parts.push(doi)

  return parts.join('. ') + '.'
}
```

- [ ] **Step 4: 테스트 통과 확인**

```bash
cd stats && pnpm test citation-apa-formatter
```
Expected: 모든 테스트 PASS

- [ ] **Step 5: 커밋**

```bash
git add stats/lib/research/citation-apa-formatter.ts stats/lib/research/__tests__/citation-apa-formatter.test.ts
git commit -m "feat(citation): APA 포맷터 + 테스트"
```

---

## Task 3: IndexedDB 업그레이드 + citation-storage (TDD)

**Files:**
- Modify: `stats/lib/utils/adapters/indexeddb-adapter.ts:9` (DB_VERSION 4→5)
- Create: `stats/lib/research/citation-storage.ts`
- Create: `stats/lib/research/__tests__/citation-storage.test.ts`

- [ ] **Step 1: 실패하는 테스트 작성**

> `fake-indexeddb`가 이미 설치되어 있음 (package.json). `fake-indexeddb/auto` import로 실제 IndexedDB CRUD를 Node 환경에서 검증. (기존 패턴: `lib/rag/__tests__/indexeddb-storage.test.ts`)

```typescript
// stats/lib/research/__tests__/citation-storage.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import 'fake-indexeddb/auto'
import type { CitationRecord } from '../citation-types'
import type { LiteratureItem } from '@/lib/types/literature'
import { saveCitation, listCitationsByProject, deleteCitation } from '../citation-storage'

function makeCitation(overrides: Partial<CitationRecord> = {}): CitationRecord {
  const item: LiteratureItem = {
    id: 'lit_1',
    source: 'openalex',
    title: 'Test Paper',
    authors: ['Kim J'],
    year: 2023,
    url: 'https://example.com',
    searchedName: 'test',
  }
  return {
    id: 'cit_test_1',
    projectId: 'proj_1',
    item,
    addedAt: new Date().toISOString(),
    ...overrides,
  }
}

describe('citation-storage', () => {
  beforeEach(async () => {
    // 각 테스트 전에 IndexedDB 초기화 — 기존 proj_1 인용 삭제
    const existing = await listCitationsByProject('proj_1')
    await Promise.all(existing.map(r => deleteCitation(r.id)))
    const existing2 = await listCitationsByProject('proj_2')
    await Promise.all(existing2.map(r => deleteCitation(r.id)))
  })

  it('saveCitation: 저장 후 listCitationsByProject에서 조회됨', async () => {
    const record = makeCitation()
    await saveCitation(record)
    const result = await listCitationsByProject('proj_1')
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('cit_test_1')
  })

  it('listCitationsByProject: 다른 projectId는 제외', async () => {
    await saveCitation(makeCitation({ id: 'cit_1', projectId: 'proj_1' }))
    await saveCitation(makeCitation({ id: 'cit_2', projectId: 'proj_2' }))
    const result = await listCitationsByProject('proj_1')
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('cit_1')
  })

  it('deleteCitation: 삭제 후 조회 안 됨', async () => {
    await saveCitation(makeCitation({ id: 'cit_del' }))
    await deleteCitation('cit_del')
    const result = await listCitationsByProject('proj_1')
    expect(result.find(r => r.id === 'cit_del')).toBeUndefined()
  })

  it('listCitationsByProject: 추가순 정렬', async () => {
    await saveCitation(makeCitation({ id: 'cit_b', addedAt: '2026-01-02T00:00:00Z' }))
    await saveCitation(makeCitation({ id: 'cit_a', addedAt: '2026-01-01T00:00:00Z' }))
    const result = await listCitationsByProject('proj_1')
    expect(result[0].id).toBe('cit_a')
    expect(result[1].id).toBe('cit_b')
  })
})
```

- [ ] **Step 2: 테스트 실패 확인**

```bash
cd stats && pnpm test citation-storage
```
Expected: FAIL (citation-storage 모듈 없음)

- [ ] **Step 3: IndexedDB DB_VERSION 업그레이드**

`stats/lib/utils/adapters/indexeddb-adapter.ts` 수정:

```typescript
// 변경 전:
const DB_VERSION = 4  // v4: chart-snapshots store 추가

// 변경 후:
const DB_VERSION = 5  // v5: citations store 추가
```

`onupgradeneeded` 블록 안에 아래 추가 (chart-snapshots 블록 다음):

```typescript
// Citations 스토어 생성 (v5)
if (!db.objectStoreNames.contains('citations')) {
  const citationStore = db.createObjectStore('citations', { keyPath: 'id' })
  citationStore.createIndex('projectId', 'projectId', { unique: false })
}
```

- [ ] **Step 4: citation-storage.ts 구현**

```typescript
// stats/lib/research/citation-storage.ts
/**
 * 인용 레코드 IndexedDB 저장소
 *
 * document-blueprint-storage.ts 패턴을 따름.
 * Local-only, storage.ts facade 비경유.
 */

import type { CitationRecord } from './citation-types'
import { openDB } from '@/lib/utils/adapters/indexeddb-adapter'

const STORE_NAME = 'citations'

function txPut<T>(db: IDBDatabase, storeName: string, value: T): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite')
    const req = tx.objectStore(storeName).put(value)
    req.onsuccess = () => resolve()
    req.onerror = () => reject(req.error)
  })
}

function txGetByIndex<T>(
  db: IDBDatabase,
  storeName: string,
  indexName: string,
  key: IDBValidKey,
): Promise<T[]> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly')
    const req = tx.objectStore(storeName).index(indexName).getAll(key)
    req.onsuccess = () => resolve(req.result as T[])
    req.onerror = () => reject(req.error)
  })
}

function txDelete(db: IDBDatabase, storeName: string, key: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite')
    const req = tx.objectStore(storeName).delete(key)
    req.onsuccess = () => resolve()
    req.onerror = () => reject(req.error)
  })
}

/** 인용 저장 */
export async function saveCitation(record: CitationRecord): Promise<void> {
  const db = await openDB()
  await txPut(db, STORE_NAME, record)
}

/** 프로젝트별 인용 목록 (추가순) */
export async function listCitationsByProject(projectId: string): Promise<CitationRecord[]> {
  const db = await openDB()
  const records = await txGetByIndex<CitationRecord>(db, STORE_NAME, 'projectId', projectId)
  return records.sort((a, b) => a.addedAt.localeCompare(b.addedAt))
}

/** 인용 삭제 */
export async function deleteCitation(id: string): Promise<void> {
  const db = await openDB()
  await txDelete(db, STORE_NAME, id)
}
```

- [ ] **Step 5: 테스트 통과 확인**

```bash
cd stats && pnpm test citation-storage
```
Expected: 모든 테스트 PASS

- [ ] **Step 6: 커밋**

```bash
git add stats/lib/utils/adapters/indexeddb-adapter.ts stats/lib/research/citation-storage.ts stats/lib/research/__tests__/citation-storage.test.ts
git commit -m "feat(citation): IndexedDB v5 citations 스토어 + citation-storage CRUD"
```

---

## Task 4: assembler에 citations 병합 (TDD)

**Files:**
- Modify: `stats/lib/research/document-assembler.ts`
- Modify: `stats/lib/research/__tests__/document-assembler.test.ts`

- [ ] **Step 1: 기존 테스트 파일 확인**

`stats/lib/research/__tests__/document-assembler.test.ts` 파일 상단에서 `AssemblerDataSources` 타입이 어떻게 임포트되는지 확인.

- [ ] **Step 2: 실패하는 테스트 추가**

`document-assembler.test.ts` 파일에 아래 테스트 블록 추가:

```typescript
// 파일 상단 import에 추가:
import type { CitationRecord } from '../citation-types'
import type { LiteratureItem } from '@/lib/types/literature'

// 테스트 블록 추가 (기존 테스트 다음에):
describe('assembleDocument - citations 병합', () => {
  function makeCitationRecord(overrides: Partial<CitationRecord> = {}): CitationRecord {
    const item: LiteratureItem = {
      id: 'lit_1',
      source: 'openalex',
      title: 'Fisheries Population Dynamics',
      authors: ['Smith A', 'Jones B'],
      year: 2021,
      journal: 'Fisheries Research',
      url: 'https://example.com',
      doi: '10.0000/fr.2021',
      searchedName: 'test',
    }
    return {
      id: 'cit_1',
      projectId: 'proj_test',
      item,
      addedAt: '2026-01-01T00:00:00Z',
      ...overrides,
    }
  }

  // 실제 AssemblerDataSources 필드 순서: entityRefs → allHistory → allGraphProjects → blastHistory?

  it('citations가 있으면 References 섹션에 APA 문자열 포함', () => {
    const citations = [makeCitationRecord()]
    const sources: AssemblerDataSources = {
      entityRefs: [],
      allHistory: [],
      allGraphProjects: [],
      citations,
    }
    const blueprint = assembleDocument(
      { projectId: 'proj_test', preset: 'paper', language: 'en', title: 'Test' },
      sources,
    )
    const refsSection = blueprint.sections.find(s => s.id === 'references')
    expect(refsSection?.content).toContain('Smith A, & Jones B')
    expect(refsSection?.content).toContain('2021')
    expect(refsSection?.content).toContain('https://doi.org/10.0000/fr.2021')
  })

  it('citations가 없으면 소프트웨어 기본 인용만 표시', () => {
    const sources: AssemblerDataSources = {
      entityRefs: [],
      allHistory: [],
      allGraphProjects: [],
      citations: [],
    }
    const blueprint = assembleDocument(
      { projectId: 'proj_test', preset: 'paper', language: 'en', title: 'Test' },
      sources,
    )
    const refsSection = blueprint.sections.find(s => s.id === 'references')
    expect(refsSection?.content).toContain('BioHub')
    expect(refsSection?.content).toContain('SciPy')
  })

  it('citations가 undefined이면 기존 동작과 동일', () => {
    const sources: AssemblerDataSources = {
      entityRefs: [],
      allHistory: [],
      allGraphProjects: [],
    }
    const blueprint = assembleDocument(
      { projectId: 'proj_test', preset: 'paper', language: 'en', title: 'Test' },
      sources,
    )
    const refsSection = blueprint.sections.find(s => s.id === 'references')
    expect(refsSection?.content).toContain('BioHub')
  })
})
```

- [ ] **Step 3: 테스트 실패 확인**

```bash
cd stats && pnpm test document-assembler
```
Expected: 새 테스트들 FAIL (citations 필드 없음)

- [ ] **Step 4: assembler 수정**

`stats/lib/research/document-assembler.ts`에서:

**1) import 추가:**
```typescript
import type { CitationRecord } from './citation-types'
import { buildCitationString } from './citation-apa-formatter'
```

**2) `AssemblerDataSources` 인터페이스에 citations 추가:**

실제 필드 순서는 `entityRefs → allHistory → allGraphProjects → blastHistory?` 임. citations를 끝에 추가:

```typescript
// 기존 인터페이스를 찾아 citations 필드 추가 (blastHistory? 다음):
export interface AssemblerDataSources {
  entityRefs: ProjectEntityRef[]
  allHistory: HistoryRecord[]
  allGraphProjects: GraphProject[]
  blastHistory?: BlastEntryLike[]
  citations?: CitationRecord[]   // ← 추가
}
```

**3) `buildDefaultReferences` 함수를 `buildReferencesContent`로 교체:**
```typescript
/** References 섹션 텍스트 = 사용자 인용 + 소프트웨어 인용 */
function buildReferencesContent(
  citations: CitationRecord[],
  language: 'ko' | 'en',
): string {
  const software =
    language === 'ko'
      ? [
          '### 소프트웨어',
          '',
          '- BioHub (https://biohub.ecomarin.workers.dev/) — 통계 분석 및 논문 초안 생성',
          '- SciPy (Virtanen et al., 2020) — 통계 검정 라이브러리',
        ].join('\n')
      : [
          '### Software',
          '',
          '- BioHub (https://biohub.ecomarin.workers.dev/) — Statistical analysis and paper draft generation',
          '- SciPy (Virtanen et al., 2020) — Statistical testing library',
        ].join('\n')

  if (citations.length === 0) return software

  const header = language === 'ko' ? '### 참고문헌' : '### References'
  const cited = citations
    .map((c, i) => `${i + 1}. ${buildCitationString(c.item)}`)
    .join('\n')

  return `${header}\n\n${cited}\n\n${software}`
}
```

**4) `assembleDocument` 함수 안에서 References 섹션 설정 부분 교체:**
```typescript
// 기존:
//   refsSection.content = buildDefaultReferences(language)
// 변경 후:
    refsSection.content = buildReferencesContent(sources.citations ?? [], language)
```

- [ ] **Step 5: 테스트 통과 확인**

```bash
cd stats && pnpm test document-assembler
```
Expected: 모든 테스트 PASS

- [ ] **Step 6: 커밋**

```bash
git add stats/lib/research/document-assembler.ts stats/lib/research/__tests__/document-assembler.test.ts
git commit -m "feat(citation): assembler References 섹션에 citations APA 병합"
```

---

## Task 5: MaterialPalette "문헌" 탭 추가

> **설계 변경:** citations state를 MaterialPalette에 두지 않음. DocumentEditor가 단일 소유자, MaterialPalette는 prop으로만 수신. 삭제 콜백도 DocumentEditor로 위임.

**Files:**
- Modify: `stats/components/papers/MaterialPalette.tsx`

- [ ] **Step 1: props 타입 확장**

MaterialPalette.tsx에서:

```typescript
// 기존 import에 추가:
import type { CitationRecord } from '@/lib/research/citation-types'
import { buildCitationString } from '@/lib/research/citation-apa-formatter'
import { BookOpen, Trash2 } from 'lucide-react'

// 인터페이스를 아래로 교체:
interface MaterialPaletteProps {
  projectId: string
  onInsertAnalysis: (record: HistoryRecord) => void
  onInsertFigure: (graph: GraphProject) => void
  citations: CitationRecord[]                          // ← DocumentEditor가 소유, prop으로 수신
  onInsertCitation: (record: CitationRecord) => void
  onDeleteCitation: (id: string) => void
}
```

- [ ] **Step 2: 함수 시그니처에 새 props 반영**

```typescript
export default function MaterialPalette({
  projectId,
  onInsertAnalysis,
  onInsertFigure,
  citations,
  onInsertCitation,
  onDeleteCitation,
}: MaterialPaletteProps): React.ReactElement {
```

- [ ] **Step 3: "문헌" 탭 UI 추가**

기존 `{/* 그래프 */}` 블록 다음에 추가:

```tsx
{/* 문헌 인용 */}
<div className="space-y-1">
  <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
    <BookOpen className="w-3 h-3" />
    문헌 ({citations.length})
  </p>
  {citations.length === 0 && (
    <p className="text-xs text-muted-foreground/60 py-2">
      저장된 인용이 없습니다.{' '}
      <Link
        href={`/literature?project=${projectId}`}
        className="text-primary hover:underline"
      >
        문헌 검색에서 추가
      </Link>
    </p>
  )}
  {citations.map(record => (
    <div key={record.id} className="flex items-start gap-1 group">
      <button
        type="button"
        onClick={() => onInsertCitation(record)}
        className="flex-1 text-left text-xs px-2 py-1.5 rounded hover:bg-accent truncate"
        title={buildCitationString(record.item)}
      >
        <span className="font-medium">
          {record.item.authors[0] ?? '저자 미상'}
          {record.item.year ? ` (${record.item.year})` : ''}
        </span>
        <span className="text-muted-foreground ml-1 truncate">
          {record.item.title}
        </span>
      </button>
      <button
        type="button"
        onClick={() => onDeleteCitation(record.id)}
        className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-destructive/10 text-destructive"
        title="삭제"
      >
        <Trash2 className="w-3 h-3" />
      </button>
    </div>
  ))}
  {citations.length > 0 && (
    <Link
      href={`/literature?project=${projectId}`}
      className="text-xs text-primary hover:underline flex items-center gap-1 pt-1"
    >
      <Plus className="w-3 h-3" /> 더 추가
    </Link>
  )}
</div>
```

- [ ] **Step 4: 타입 체크**

```bash
cd stats && pnpm tsc --noEmit 2>&1 | grep MaterialPalette
```
Expected: 오류 없음

- [ ] **Step 5: 커밋**

```bash
git add stats/components/papers/MaterialPalette.tsx
git commit -m "feat(citation): MaterialPalette 문헌 탭 추가"
```

---

## Task 6: DocumentEditor 와이어링

> **설계:** citations state는 DocumentEditor만 소유. MaterialPalette는 prop 수신.
> - insert 클릭 → citations state에 추가 → `buildReferencesContent`가 References 섹션 재계산 (content에 직접 append 금지)
> - delete 클릭 → citations state에서 제거 → References 섹션 재계산
> - "재조립" 버튼(handleReassemble) → 현재 citations 포함해서 재조립

**Files:**
- Modify: `stats/components/papers/DocumentEditor.tsx`

- [ ] **Step 1: import 추가**

```typescript
// 기존 import에 추가:
import type { CitationRecord } from '@/lib/research/citation-types'
import { listCitationsByProject, deleteCitation } from '@/lib/research/citation-storage'
import { buildCitationString } from '@/lib/research/citation-apa-formatter'
```

- [ ] **Step 2: citations state 추가 및 초기 로드**

```typescript
// 기존 state 선언들 다음에 추가:
const [citations, setCitations] = useState<CitationRecord[]>([])

useEffect(() => {
  if (!doc?.projectId) return
  listCitationsByProject(doc.projectId)
    .then(setCitations)
    .catch(() => setCitations([]))
}, [doc?.projectId])
```

- [ ] **Step 3: handleInsertCitation + handleDeleteCitation 추가**

> insert는 citations state에 추가. References 섹션은 assembler의 `buildReferencesContent`가 담당하므로 content에 직접 쓰지 않음. 중복 방지 키는 `doi ?? url`.

```typescript
// handleInsertFigure 다음에 추가:
const handleInsertCitation = useCallback((record: CitationRecord) => {
  const key = record.item.doi ?? record.item.url
  setCitations(prev => {
    // 이미 있으면 추가하지 않음 (doi/url 기준 중복 방지)
    if (prev.some(c => (c.item.doi ?? c.item.url) === key)) return prev
    return [...prev, record]
  })
}, [])

const handleDeleteCitation = useCallback(async (id: string) => {
  await deleteCitation(id)
  setCitations(prev => prev.filter(c => c.id !== id))
}, [])
```

- [ ] **Step 4: handleReassemble에 citations 추가**

`handleReassemble` 콜백(line ~242)에서 `reassembleDocument` 호출 부분 수정:

```typescript
// 기존:
const reassembled = reassembleDocument(doc, {
  entityRefs,
  allHistory: analysisHistory as unknown as HistoryRecord[],
  allGraphProjects,
  blastHistory,
})

// 변경 후 (citations 추가):
const reassembled = reassembleDocument(doc, {
  entityRefs,
  allHistory: analysisHistory as unknown as HistoryRecord[],
  allGraphProjects,
  blastHistory,
  citations,
})
```

> `handleReassemble`이 `useCallback` 의존성 배열에 `citations`를 포함해야 함:
> ```typescript
> }, [doc, analysisHistory, scheduleSave, citations])
> ```

- [ ] **Step 5: MaterialPalette에 props 전달**

```tsx
// 기존:
<MaterialPalette
  projectId={doc.projectId}
  onInsertAnalysis={handleInsertAnalysis}
  onInsertFigure={handleInsertFigure}
/>

// 변경 후:
<MaterialPalette
  projectId={doc.projectId}
  onInsertAnalysis={handleInsertAnalysis}
  onInsertFigure={handleInsertFigure}
  citations={citations}
  onInsertCitation={handleInsertCitation}
  onDeleteCitation={handleDeleteCitation}
/>
```

- [ ] **Step 6: 타입 체크**

```bash
cd stats && pnpm tsc --noEmit 2>&1 | grep -E "DocumentEditor|MaterialPalette"
```
Expected: 오류 없음

- [ ] **Step 7: 커밋**

```bash
git add stats/components/papers/DocumentEditor.tsx
git commit -m "feat(citation): DocumentEditor citations 단일 소유 + reassemble 연동"
```

---

## Task 7: /literature 페이지 "프로젝트에 저장" 버튼

**Files:**
- Modify: `stats/app/literature/LiteratureSearchContent.tsx` (page.tsx 수정 불필요)

- [ ] **Step 1: page.tsx 확인 — 수정 불필요**

현재 `stats/app/literature/page.tsx`는 이미 `dynamic({ ssr: false })` 패턴을 사용하고 있음. `window.location.search`는 LiteratureSearchContent 내부에서 직접 읽으므로 page.tsx 수정 불필요.

- [ ] **Step 2: LiteratureSearchContent에 projectId 지원 추가**

LiteratureSearchContent.tsx 상단에 추가:

```typescript
// 기존 import에 추가:
import { useEffect, useState } from 'react'  // 이미 있음
import { BookmarkPlus, Check } from 'lucide-react'  // 추가
import type { CitationRecord } from '@/lib/research/citation-types'
import { createCitationRecord } from '@/lib/research/citation-types'
import { saveCitation, listCitationsByProject } from '@/lib/research/citation-storage'

// 컴포넌트 시작 부분에 추가 (useState 선언들 근처):
const [projectId, setProjectId] = useState<string | null>(null)
const [savedIds, setSavedIds] = useState<Set<string>>(new Set())

useEffect(() => {
  const params = new URLSearchParams(window.location.search)
  const pid = params.get('project')
  if (!pid) return
  setProjectId(pid)
  listCitationsByProject(pid)
    .then(records => {
      // 중복 판정 키: doi가 있으면 `doi:{doi}`, 없으면 url
      // item.id는 소스별로 달라 신뢰 불가
      setSavedIds(new Set(records.map(r => r.item.doi ? `doi:${r.item.doi}` : r.item.url)))
    })
    .catch(() => {})
}, [])

/** 인용 저장 키 — doi 우선, 없으면 url */
const citationKey = (item: LiteratureItem): string =>
  item.doi ? `doi:${item.doi}` : item.url

const handleSaveCitation = useCallback(async (item: LiteratureItem) => {
  if (!projectId) return
  const record: CitationRecord = createCitationRecord(projectId, item)
  await saveCitation(record)
  setSavedIds(prev => new Set([...prev, citationKey(item)]))
}, [projectId])
```

- [ ] **Step 3: LiteratureCard에 "저장" 버튼 추가**

> **중요:** 컴포넌트명은 `LiteratureResultCard`가 아닌 **`LiteratureCard`** 임. `item: LiteratureItem`을 prop으로 받는 별도 컴포넌트.

렌더링 위치: `{sortedItems.map(item => (<LiteratureCard key={item.id} item={item} />))}` 형태.

**1) LiteratureCard props 인터페이스에 onSave/isSaved 추가:**
```typescript
// LiteratureCard 컴포넌트의 props 인터페이스 찾아 수정:
interface LiteratureCardProps {
  item: LiteratureItem
  onSave?: (item: LiteratureItem) => void   // ← 추가
  isSaved?: boolean                          // ← 추가
}
```

**2) LiteratureCard 내부에 저장 버튼 추가 (기존 외부링크 버튼 근처):**
```tsx
{onSave && (
  <Button
    variant="ghost"
    size="sm"
    className="h-7 px-2 text-xs"
    onClick={() => onSave(item)}
    disabled={isSaved}
  >
    {isSaved
      ? <><Check className="w-3 h-3 mr-1" />저장됨</>
      : <><BookmarkPlus className="w-3 h-3 mr-1" />저장</>
    }
  </Button>
)}
```

**3) sortedItems.map 부분에서 props 전달:**
```tsx
{sortedItems.map(item => (
  <LiteratureCard
    key={item.id}
    item={item}
    onSave={projectId ? handleSaveCitation : undefined}
    isSaved={savedIds.has(citationKey(item))}
  />
))}

- [ ] **Step 4: 상단에 프로젝트 컨텍스트 배너 표시**

URL에 project 파라미터가 있을 때 배너 표시:

```tsx
{projectId && (
  <div className="flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-lg text-sm mb-4">
    <BookmarkPlus className="w-4 h-4 text-primary" />
    <span>프로젝트 문서에 인용 추가 모드 — 검색 결과에서 <strong>저장</strong>을 클릭하세요.</span>
  </div>
)}
```

- [ ] **Step 5: 타입 체크**

```bash
cd stats && pnpm tsc --noEmit 2>&1 | grep literature -i
```
Expected: 오류 없음

- [ ] **Step 6: 커밋**

```bash
git add stats/app/literature/LiteratureSearchContent.tsx stats/app/literature/page.tsx
git commit -m "feat(citation): /literature 페이지 프로젝트 저장 버튼"
```

---

## 최종 검증

- [ ] **전체 타입 체크**

```bash
cd stats && pnpm tsc --noEmit
```
Expected: 오류 없음

- [ ] **전체 테스트 실행**

```bash
cd stats && pnpm test citation
```
Expected: citation-apa-formatter + citation-storage 모든 테스트 PASS

- [ ] **최종 커밋**

```bash
git add -p
git commit -m "feat(citation): Phase 6a 인용 관리 완료 — citation store + APA formatter + MaterialPalette + References 자동 병합"
```

---

## 구현 제외 (Later로 이관)

- BibTeX 내보내기 (`TODO.md` 4-A 참조)
- Plate 에디터 인라인 인용 노드 `(Kim et al., 2025)` (`TODO.md` 4-A 참조)
- Citation Verification (CrossRef/Semantic Scholar API) (`TODO.md` 4-A 참조)
- Software Citation 자동 생성 (`TODO.md` 4-A 참조)
