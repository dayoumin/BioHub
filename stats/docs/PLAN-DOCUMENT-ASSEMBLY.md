# 프로젝트 레벨 문서 조립 (Draft Assembly) 계획

**작성일**: 2026-03-23
**상태**: 설계 완료, 구현 대기
**관련 문서**: [PLAN-PROJECT-DETAIL-PAGE.md](PLAN-PROJECT-DETAIL-PAGE.md) · [TODO.md](../../TODO.md) · [PLAN-PAPER-DRAFT-GENERATION.md](PLAN-PAPER-DRAFT-GENERATION.md)

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
| **현장 보고** (`field-report`) | 조사개요 → 분석결과 → 판정 → 권장사항 | 현장 실무 — Phase F (§7.6) |
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
  caption: string                   // GraphProject.name + chartSpec.chartType (§4.3 참조)
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

// 문서 전체 — 메타데이터 소유권: 스냅샷 방식 (§8.1)
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
→ entity-resolver에 `case 'draft'` 추가 필요 (Phase B).

---

## 7. 구현 범위 (Phase 분리)

### 7.1 Phase A: 타입 + 프리셋 레지스트리
- `DocumentBlueprint`, `DocumentSection`, `DocumentTable` 타입 정의
- 프리셋 레지스트리: `paper`, `report`, `custom` (3개만)
- 프리셋별 빈 섹션 구조 생성 함수
- `convertPaperTable()`, `buildFigureRef()` 변환 함수
- 단위 테스트: convertPaperTable 파싱 정확성
- **UI 없음** — 타입/모델만

### 7.2 Phase B: 자동 조립 엔진 + 마크다운/HTML 내보내기
- `document-assembler.ts`: HistoryRecord 직접 읽기 → paperDraft 병합
- Figure/BLAST 참조 삽입
- entity-resolver에 `case 'draft'` 추가 (DocumentBlueprint 표시)
- IndexedDB store 추가 (DB_VERSION 2→3, `document-blueprints` store)
- 마크다운/HTML 내보내기 (`report-export.ts` 패턴 확장)
- **DOCX 미포함** — Phase E

### 7.3 Phase C: 조립 UI
- 프로젝트 상세 페이지 "초안" 탭에서 진입 (또는 프로젝트 헤더에 "문서 만들기" 버튼)
- 프리셋 선택 → 자동 조립 → 섹션 편집기 (마크다운)
- 섹션 드래그 순서 변경 + 추가/삭제
- 미리보기 + 마크다운/HTML 내보내기
- "재조립" 버튼 (새 분석 추가 시)

### 7.4 Phase D: LLM 보강
- Introduction/Discussion 자동 생성 (OpenRouter)
- 입력: assembler가 생성한 Methods/Results + project.paperConfig.researchContext
- 요약 자동 생성
- 사용자 피드백 기반 재생성

### 7.5 Phase E: DOCX 내보내기 (별도)
- 섹션형 문서 → DOCX 변환기 (기존 단일분석용 `docx-export.ts`와 **별도 모듈**)
- Heading 계층, 표, Figure placeholder 포함
- **난이도 높음** — 기존 ExportContext → NormalizedExportData 경로와 다른 새 adapter 필요

### 7.6 Phase F: field-report 프리셋 (별도)
- 선행 조건:
  1. entity-resolver에 `species-validation` / `legal-status` case 추가
  2. 각 kind의 데이터 로더 타입 정의 (BlastEntryLike처럼)
  3. 저장소에서 로드 로직
- 이 resolver가 완성된 후에만 field-report 프리셋 추가 가능

---

## 8. 파일 구조 (예상)

```
stats/lib/research/
  document-blueprint-types.ts    ← Phase A: 타입 정의
  document-preset-registry.ts    ← Phase A: 프리셋 레지스트리
  document-assembler.ts          ← Phase B: 자동 조립 엔진
  document-export.ts             ← Phase B: 내보내기 확장

stats/components/projects/
  DocumentAssemblyDialog.tsx     ← Phase C: 조립 UI (프리셋 선택 + 편집)
  DocumentSectionEditor.tsx      ← Phase C: 섹션 편집기
  DocumentPreview.tsx            ← Phase C: 미리보기
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

### 10.2 저장 위치: IndexedDB

**결정**: IndexedDB `document-blueprints` store (localStorage 아님)

**구현**:
- DB_VERSION 2 → 3 (onupgradeneeded에서 조건부 store 생성)
- Index: `projectId` (프로젝트별 문서 목록 쿼리)
- `storage.ts`에 `saveDocumentBlueprint()` / `loadDocumentBlueprints(projectId)` / `deleteDocumentBlueprint(id)` 추가
- Turso 동기화는 D1 마이그레이션 시 함께 진행 (현재는 로컬 only)
