# 프로젝트 레벨 문서 조립 (Draft Assembly) 계획

**작성일**: 2026-03-23
**상태**: 설계 완료, **구현 계획 승인 (2026-03-30)**
**구현 계획**: Claude Code plans (`indexed-stirring-wirth.md`, 로컬 전용 — 버전 관리 대상 아님)
**관련 문서**: [PLAN-PROJECT-DETAIL-PAGE.md](../PLAN-PROJECT-DETAIL-PAGE.md) · [TODO.md](../../../TODO.md) · [PLAN-PAPER-DRAFT-GENERATION.md](PLAN-PAPER-DRAFT-GENERATION.md)

---

## 1. 목적

프로젝트에 쌓인 여러 분석 결과를 하나의 **구조화된 문서**로 조립하는 기능.
논문뿐 아니라 **보고서, 현장 보고, 자유 형식** 등 다양한 용도 지원.

현재 두 계층이 있으나 그 사이가 비어 있음:

```
PaperDraft (개별 분석별)     ← 완성됨 (Methods/Results/Captions 템플릿 11개)
    ↓ ???                    ← 이 부분이 없음
ProjectReport (취합 나열)    ← 완성됨 (ReportComposer + 마크다운/HTML 내보내기)
```

---

## 2. 핵심 설계: DocumentBlueprint (문서 청사진)

### 2.1 용도별 프리셋

| 프리셋 | 구조 | 대상 |
|---|---|---|
| **학술 논문** (`paper`) | Introduction → Methods → Results → Discussion → References | 학술지 투고 |
| **연구 보고서** (`report`) | 요약 → 연구배경 → 방법 → 결과 → 결론 → 부록 | 기관 보고, 내부 문서 |
| **현장 보고** (`field-report`) | 조사개요 → 분석결과 → 판정 → 권장사항 | 현장 실무 — Phase 6f |
| **커스텀** (`custom`) | 사용자 정의 섹션 | 자유 형식 |

### 2.2 타입 설계

```typescript
type DocumentPreset = 'paper' | 'report' | 'field-report' | 'custom'

// 표 정규화 타입 — PaperTable(htmlContent/plainText)과 ReportTable(headers/rows) 양쪽을 수용
interface DocumentTable {
  id?: string                       // 'descriptive', 'test-result' 등 (cross-reference용)
  caption: string
  headers: string[]
  rows: string[][]
  htmlContent?: string              // PaperTable 원본 보존 (HTML 내보내기 시 품질 유지)
}

interface DocumentSection {
  id: string                        // 'introduction', 'methods', 'results' 등
  title: string
  content: string                   // 마크다운 본문
  sourceRefs: string[]              // 이 섹션에 포함된 entity ref ID들
  tables?: DocumentTable[]
  figures?: FigureRef[]
  editable: boolean                 // 사용자가 이 섹션 내용을 편집할 수 있는가
  generatedBy: 'template' | 'llm' | 'user'
}

// 그래프 참조 — GraphProject에서 생성
interface FigureRef {
  entityId: string                  // GraphProject.id
  label: string                     // "Figure 1" (자동 번호 매김)
  caption: string                   // GraphProject.name + chartSpec.chartType (§3.4 참조)
}

// 메타데이터 — 프리셋별 고유 필드
interface PaperMetadata {
  targetJournal?: string
}
interface ReportMetadata {
  organization?: string
}
interface FieldReportMetadata {
  surveyDate?: string
  surveyLocation?: string
}
type DocumentMetadata = PaperMetadata | ReportMetadata | FieldReportMetadata | Record<string, unknown>

// 문서 전체 — 메타데이터 소유권: 스냅샷 방식 (§10.1)
interface DocumentBlueprint {
  id: string                        // `doc_${Date.now()}_${random}`
  projectId: string
  preset: DocumentPreset
  title: string                     // 생성 시 paperConfig.title에서 복사, 이후 독립
  authors?: string[]
  language: 'ko' | 'en'
  sections: DocumentSection[]
  metadata: DocumentMetadata
  createdAt: string
  updatedAt: string
}
```

### 2.3 프리셋별 섹션 구조

**학술 논문 (paper)**
```
1. Introduction     ← LLM 생성 또는 사용자 작성
2. Methods          ← PaperDraft.methods 자동 병합
3. Results          ← PaperDraft.results + 표 + Figure 참조
4. Discussion       ← LLM 생성 또는 사용자 작성
5. References       ← 자동 (소프트웨어 인용 등)
```

**연구 보고서 (report)**
```
1. 요약              ← LLM 생성 또는 사용자 작성
2. 연구 배경/목적    ← 사용자 작성
3. 분석 방법         ← PaperDraft.methods 병합
4. 분석 결과         ← PaperDraft.results + 표 + Figure
5. 결론 및 제언      ← LLM 생성 또는 사용자 작성
6. 부록              ← 원시 데이터 요약, 추가 표
```

**현장 보고 (field-report)** — Phase F, species-validation/legal-status resolver 완성 후
```
1. 조사 개요         ← 사용자 작성 (날짜, 장소, 목적)
2. 분석 결과         ← 통계 + BLAST 결과 병합
3. 종 동정 판정      ← BLAST DecisionResult 자동
4. 종 검증/법적 지위 ← species-validation + legal-status resolver 필요
5. 권장 사항         ← LLM 생성 또는 사용자 작성
```

---

## 3. 데이터 소스 전략 (CRITICAL)

### 3.1 문제: 현재 파이프라인의 갭

assembler가 필요로 하는 `PaperDraft`(methods/results/tables)는 `HistoryRecord.paperDraft`에 저장되어 있지만,
현재 `resolveEntities()`는 `HistoryRecordLike`로 축약하여 `paperDraft`를 버림.

### 3.2 결정: assembler는 HistoryRecord를 직접 읽는다

```
ProjectDetailContent (기존)
  → getAllHistory() → resolveEntities() → ResolvedEntity (summary + rawData)
  → EntityBrowser, ReportComposer에서 사용

DocumentAssembler (신규)
  → getAllHistory() → HistoryRecord 전체 접근 (paperDraft 포함)
  → PaperDraft.methods/results/tables를 직접 사용
  → resolveEntities()를 거치지 않음 — 별도 로드 경로
```

**이유**: resolver를 확장해 paperDraft를 통과시키면 모든 EntityBrowser 사용자에게 불필요한 데이터 부담.
assembler는 문서 생성 시 1회만 호출되므로, 전체 HistoryRecord를 직접 읽는 것이 단순하고 정확함.

### 3.3 PaperTable → DocumentTable 변환

```typescript
function convertPaperTable(pt: PaperTable): DocumentTable {
  // paper-tables.ts의 plainTable()이 \t + \n 형식으로 생성함을 보장
  const lines = pt.plainText.split('\n').filter(Boolean)
  const headers = lines.length > 0 ? lines[0].split('\t') : []
  const rows = lines.slice(1).map(line => {
    const cells = line.split('\t')
    // 컬럼 수 불일치 시 빈 셀로 채움
    while (cells.length < headers.length) cells.push('')
    return cells
  })
  return { id: pt.id, caption: pt.title, headers, rows, htmlContent: pt.htmlContent }
}
```

### 3.4 FigureRef 생성 — GraphProject에서

```typescript
// GraphProject에는 caption 필드가 없음.
// name + chartSpec.chartType으로 생성:
function buildFigureRef(gp: GraphProject, index: number): FigureRef {
  const chartType = gp.chartSpec?.chartType ?? ''
  return {
    entityId: gp.id,
    label: `Figure ${index + 1}`,
    caption: chartType ? `${gp.name} (${chartType})` : gp.name,
  }
}
```

---

## 4. 조립 전략

### 4.1 3단계 흐름

```
Step 1: 프리셋 선택
  → 빈 섹션 구조 자동 생성

Step 2: 자동 매핑 (assembler가 HistoryRecord 직접 읽음)
  - analysis → Methods + Results 섹션에 PaperDraft 내용 병합
  - figure → Results 섹션에 FigureRef 삽입 (§3.4)
  - blast-result → Results 섹션에 종 동정 결과 삽입

Step 3: 사용자 편집 + LLM 보강
  - Introduction/Discussion: LLM으로 초안 생성 (선택)
  - 모든 섹션: 사용자가 직접 편집 가능
  - 순서 드래그, 섹션 추가/삭제
```

### 4.2 병합 로직 (여러 분석 → 하나의 섹션)

```
Methods 섹션:
  for each analysis in project:
    if historyRecord.paperDraft?.methods:
      append "### {분석명}" + paperDraft.methods
    else:
      append "### {분석명}" + historyRecord.apaFormat ?? fallback

Results 섹션:
  for each analysis in project:
    append "### {분석명}"
    if historyRecord.paperDraft?.results:
      append paperDraft.results
      for each table in paperDraft.tables:
        append convertPaperTable(table)
    else:
      append generateAnalysisContent(rawData)

  for each figure in project:
    append "**{FigureRef.label}**: {FigureRef.caption}"

  for each blast in project:
    append generateBlastContent(rawData)
```

### 4.3 문서 업데이트 시나리오

**프로젝트에 새 분석이 추가된 후**:
- "재조립" 버튼 → assembler가 현재 프로젝트의 entity 목록을 다시 읽음
- 기존 섹션의 사용자 편집 내용은 **유지** (editable 섹션)
- 자동 생성 섹션(Methods, Results)만 재생성
- 새 분석은 기존 내용 **뒤에 추가** (덮어쓰지 않음)
- UI에서 "새로 추가된 항목" 표시로 사용자가 확인 가능

**한 프로젝트에 여러 문서**:
- 허용 — 같은 프로젝트에서 논문 1개 + 보고서 1개 생성 가능
- `loadDocumentBlueprints(projectId)` → 배열 반환
- 프로젝트 상세 페이지에서 "문서" 탭으로 나열

**문서 삭제**:
- IndexedDB에서 제거 + ProjectEntityRef 연결 해제
- 복구 불가 (확인 다이얼로그 필수)

---

## 5. 기존 코드 재활용

| 용도 | 기존 코드 | 위치 |
|---|---|---|
| 개별 분석 Methods/Results | `generatePaperDraft()` | `lib/services/paper-draft/paper-draft-service.ts` |
| 통계 결과 표 | `generatePaperTables()` | `lib/services/paper-draft/paper-tables.ts` |
| APA 포맷 | `fmtP()`, `fmt()`, `formatTTestResult()` 등 | `paper-templates.ts`, `statistics-formatters.ts` |
| 엔티티 로드 | `resolveEntities()` | `lib/research/entity-resolver.ts` |
| 마크다운/HTML 내보내기 | `buildReport()`, `reportToMarkdown()`, `downloadReportAsHtml()` | `lib/research/report-export.ts` |
| BLAST 보고서 | `generateBlastContent()` | `lib/research/report-apa-format.ts` |
| 프로젝트 메타 | `ResearchPaperConfig` | `lib/types/research.ts` |
| 드래그 정렬 | `@dnd-kit` | 이미 설치됨 |

---

## 6. ProjectEntityKind 'draft'와의 관계

`ProjectEntityKind`에 이미 `'draft'`가 정의되어 있음 (`packages/types/src/project.ts`).
entity-tab-registry에도 "초안" 탭이 등록됨 (`defaultVisible: false`).

**결정**: DocumentBlueprint를 `entityKind: 'draft'`로 ProjectEntityRef에 연결.

```
DocumentBlueprint 생성 시:
  1. IndexedDB에 blueprint 저장
  2. upsertProjectEntityRef({
       projectId,
       entityKind: 'draft',
       entityId: blueprint.id,
       label: blueprint.title,
     })
```

→ 프로젝트 상세 페이지의 "초안" 탭에 자동 표시.
→ entity-resolver에 `case 'draft'` 추가 필요 (Phase 2).

---

## 7. 구현 범위 (Phase 분리) — 2026-03-30 승인

> 이하 Phase 번호는 구현 계획서와 통일 (기존 A~F → 1~6)

### Phase 1: 타입 + 조립 엔진 + 저장 (구 Phase A+B)
- `DocumentBlueprint`, `DocumentSection`, `DocumentTable` 타입 정의
- 프리셋 레지스트리: `paper`, `report`, `custom` (3개, field-report는 Phase 6 이후)
- `document-assembler.ts`: HistoryRecord 직접 읽기 → paperDraft 병합
- `document-blueprint-storage.ts`: IndexedDB local-only (**storage.ts facade 비경유**)
- **CRUD + EntityRef 동기화**: save → `upsertProjectEntityRef()`, delete → `removeProjectEntityRef()`
- DB_VERSION 2→3, `document-blueprints` store
- 단위 테스트

### Phase 2: 조립 UI + 마크다운 에디터 (구 Phase C)
- `/papers` 문서 허브 + 에디터 (기존 결과 정리 기능 **공존**)
- **라우팅**: `dynamic(PapersContent, { ssr: false })` + `window.location.search` (`useSearchParams` 금지)
- 프리셋 선택 → 자동 조립 → 섹션 편집 (마크다운 textarea + react-markdown)
- MaterialPalette: **분석+그래프만** (문헌 인용은 Phase 6a, citation store 부재)
- entity-resolver `case 'draft'` 추가

### Phase 3: Plate 리치 텍스트 에디터
- `@platejs/*` v52 (shadcn/ui 네이티브)
- 마크다운 textarea → PlateEditor 교체
- 저장: `content`(마크다운) + `plateValue?`(Slate JSON) 양방향

### Phase 4: DOCX 내보내기 (구 Phase E)
- `document-docx-export.ts` (기존 `docx-export.ts`와 별도)
- 저널 스타일 프리셋 (`docx-journal-styles.ts`)
- 차트 이미지 삽입 (`docx-image-utils.ts`)

### Phase 5: LLM 보강 (구 Phase D)
- Introduction/Discussion/Abstract 자동 생성 (OpenRouter 스트리밍)

### Phase 6: 폴리싱
- 6a: 인용 관리 (citation store 신규 설계 필요)
- 6b: Figure 오프스크린 렌더링 + 캐시
- 6c: 영문 템플릿 완성
- 6d: 표/그림 자동 번호 매기기
- 6e: HWP 내보내기
- 6f: field-report 프리셋 (species-validation/legal-status resolver 선행)

---

## 8. 파일 구조

```
stats/lib/research/
  document-blueprint-types.ts    ← Phase 1: 타입 정의
  document-preset-registry.ts    ← Phase 1: 프리셋 레지스트리
  document-assembler.ts          ← Phase 1: 자동 조립 엔진
  document-blueprint-storage.ts  ← Phase 1: IndexedDB CRUD + EntityRef 동기화

stats/app/papers/
  page.tsx                       ← Phase 2: dynamic(PapersContent, { ssr: false }) 래퍼
  PapersContent.tsx              ← Phase 2: doc 파라미터 분기 (허브/에디터)

stats/components/papers/
  PapersHub.tsx                  ← Phase 2: 문서 목록 + 기존 결과 정리 공존
  DocumentEditor.tsx             ← Phase 2: 메인 에디터 (2단 레이아웃)
  DocumentSectionList.tsx        ← Phase 2: @dnd-kit 섹션 목록
  DocumentAssemblyDialog.tsx     ← Phase 2: 프리셋 선택
  MaterialPalette.tsx            ← Phase 2: 분석/그래프 팔레트
  DocumentExportBar.tsx          ← Phase 2: 내보내기 액션 바
  PlateEditor.tsx                ← Phase 3: Plate WYSIWYG
  plate-plugins.ts               ← Phase 3: 플러그인 설정
  LLMSectionGenerator.tsx        ← Phase 5: AI 섹션 생성

stats/lib/services/export/
  document-docx-export.ts        ← Phase 4: 섹션 기반 DOCX 내보내기
  docx-journal-styles.ts         ← Phase 4: 저널 스타일 프리셋
  docx-image-utils.ts            ← Phase 4: 차트 이미지 변환
```

---

## 9. ReportComposer와의 관계

| | ReportComposer (현재) | DocumentAssembly (신규) |
|---|---|---|
| 용도 | 빠른 요약 내보내기 | 구조화된 문서 작성 |
| 입력 | 선택한 항목 | 프로젝트 전체 |
| 출력 | 마크다운/HTML (flat) | 논문/보고서 (섹션 구조) |
| 편집 | 순서만 변경 | 섹션별 내용 편집 |
| 저장 | 저장하지 않음 (1회성) | IndexedDB에 영구 저장 |
| 유지 | 그대로 유지 (경량 도구) | 별도 추가 (중량 도구) |

→ 공존: ReportComposer = "빠른 복사", DocumentAssembly = "본격 문서"

---

## 10. 설계 결정

### 10.1 메타데이터 소유권: 스냅샷 방식

**결정**: DocumentBlueprint는 생성 시 `paperConfig`에서 **스냅샷 복사**하고, 이후 독립.

**이유**: 문서는 특정 시점의 결과물. 프로젝트 설정이 나중에 바뀌어도 제출한 논문 제목이 바뀌면 안 됨.

```
blueprint 생성 시:
  blueprint.title = project.paperConfig?.title ?? project.name
  blueprint.authors = project.paperConfig?.authors ?? []
  blueprint.language = project.paperConfig?.language ?? 'ko'
  blueprint.metadata.targetJournal = project.paperConfig?.targetJournal
  // 이후 blueprint의 필드는 문서 자체에서만 편집
```

### 10.2 저장 위치: IndexedDB (local-only)

**결정**: IndexedDB `document-blueprints` store, **storage.ts facade 비경유**

**이유**: `project-storage.ts`(localStorage 직접 사용)와 동일 패턴. 현재 `StorageAdapter`는 History+Favorites 전용이므로 인터페이스 변경 불필요.

**구현**:
- DB_VERSION 2 → 3 (onupgradeneeded에서 조건부 store 생성)
- Index: `projectId` (프로젝트별 문서 목록 쿼리)
- `document-blueprint-storage.ts`에 CRUD 함수 (IndexedDB 직접 접근)
- **CRUD + EntityRef 동기화**: save → `upsertProjectEntityRef()`, delete → `removeProjectEntityRef()` (§6 참조)
- Turso/D1 동기화는 마이그레이션 시 별도 검토

### 10.3 라우팅: 정적 빌드 대응

**결정**: `/papers?doc=<id>` 쿼리 파라미터 (동적 라우트 `/papers/[id]` **사용 불가**)

**이유**: `output: 'export'` 정적 빌드에서 동적 세그먼트 불가. Graph Studio 패턴 따름.

**구현**:
- `page.tsx`: `dynamic(() => import('./PapersContent'), { ssr: false })` 래퍼
- `PapersContent.tsx`: `window.location.search`에서 `doc` 파라미터 추출
- `useSearchParams()` 직접 사용 **금지** (Suspense 없이 static export에서 prerender 에러)

### 10.4 기존 `/papers` 기능 보존

**결정**: 문서 허브와 기존 결과 정리 기능 **같은 경로 내 공존**

**이유**: `/papers`에 이미 DraftHistoryCard 6개 + FEATURES 카드 3개 + 결과 정리 진입 UI 구현됨. 단순 교체하면 기존 흐름 손실.

**구현**:
- `PapersHub.tsx` 상단: "내 문서" 목록 + "새 문서 만들기" 버튼
- `PapersHub.tsx` 하단: 기존 FEATURES 카드 + DraftHistoryCard (기존 page.tsx에서 이관)
