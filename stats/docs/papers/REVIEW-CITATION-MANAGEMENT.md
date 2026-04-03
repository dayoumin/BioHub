# Phase 6a: Citation Management — Code Review Package

> 다른 AI/리뷰어가 이 구현을 검토할 수 있도록 정리한 문서입니다.

## 1. 요약

**목표:** 프로젝트에 저장된 문헌을 인용 관리하고, DocumentBlueprint의 References 섹션에 APA 포맷으로 자동 병합.

**범위:** 12 files changed, +534 / -28 lines, 7 commits

**검증 결과:**
- `pnpm tsc --noEmit` — 0 errors
- `pnpm test citation document-assembler` — 45/45 passed (4 test files)

---

## 2. 아키텍처

```
┌─────────────────────┐    saveCitation()     ┌──────────────┐
│ /literature 페이지   │ ──────────────────►   │  IndexedDB   │
│ (LiteratureSearch)   │    (CitationRecord)   │  citations   │
└─────────────────────┘                        │  store (v5)  │
                                               └──────┬───────┘
                                                      │ listCitationsByProject()
                                                      ▼
┌─────────────────────┐   citations prop    ┌─────────────────┐
│  MaterialPalette    │ ◄──────────────── │  DocumentEditor  │
│  (문헌 탭 표시)      │                    │  (단일 소유자)    │
└─────────────────────┘                    └────────┬─────────┘
                                                    │ citations → AssemblerDataSources
                                                    ▼
                                           ┌─────────────────┐
                                           │  document-      │
                                           │  assembler.ts   │
                                           │  (References    │
                                           │   섹션 생성)     │
                                           └─────────────────┘
```

**State 소유권:** DocumentEditor가 `citations` state의 단일 소유자. MaterialPalette는 prop으로만 수신.

**중복 판정 키:** `citationKey(item)` = `doi:${doi}` 또는 `url` (citation-types.ts에 공유 헬퍼)

---

## 3. 변경 파일 목록

### 신규 파일 (5)

| 파일 | 역할 |
|------|------|
| `lib/research/citation-types.ts` | `CitationRecord` 인터페이스, `citationKey()`, `createCitationRecord()` |
| `lib/research/citation-apa-formatter.ts` | `formatAuthors()`, `buildCitationString()` — best-effort APA 7판 |
| `lib/research/citation-storage.ts` | IndexedDB CRUD: `saveCitation`, `listCitationsByProject`, `deleteCitation` |
| `lib/research/__tests__/citation-apa-formatter.test.ts` | APA 포맷터 단위 테스트 (10 cases) |
| `lib/research/__tests__/citation-storage.test.ts` | IndexedDB CRUD 테스트 (4 cases, `fake-indexeddb/auto`) |

### 수정 파일 (7)

| 파일 | 변경 내용 |
|------|-----------|
| `lib/utils/adapters/indexeddb-adapter.ts` | DB_VERSION 4→5, `citations` 스토어 + `projectId` 인덱스 |
| `lib/research/document-assembler.ts` | `AssemblerDataSources.citations?` 추가, `buildDefaultReferences` → `buildReferencesContent(citations, language)` |
| `lib/research/__tests__/document-assembler.test.ts` | citations 병합 테스트 3 cases 추가 |
| `components/papers/MaterialPalette.tsx` | 문헌 탭 UI 추가 (props: citations, onInsertCitation, onDeleteCitation) |
| `components/papers/DocumentEditor.tsx` | citations state + useEffect 로드 + handleInsertCitation/DeleteCitation + handleReassemble에 citations 추가 |
| `app/literature/LiteratureSearchContent.tsx` | projectId URL 파라미터 지원 + "저장" 버튼 + 배너 |
| `TODO.md` | Phase 6a 완료 반영, IndexedDB 헬퍼 중복 기술부채 추가 |

---

## 4. 핵심 설계 결정

### 4-1. citations state 단일 소유 (DocumentEditor)

- **이전:** MaterialPalette가 자체 state + useEffect로 citations를 로드하는 설계 → state 이중 소유
- **현재:** DocumentEditor만 `citations` state를 소유, MaterialPalette에 prop drilling
- **이유:** 재조립(handleReassemble)에서 citations가 AssemblerDataSources에 포함되어야 하므로, 조립을 트리거하는 DocumentEditor가 소유해야 함

### 4-2. buildCitationString (best-effort APA)

- "Kim, J." 스타일 author normalization은 미지원 — display name 그대로 사용
- `formatApa` 대신 `buildCitationString`으로 명명 — "완전한 APA" 오해 방지
- 향후 citeproc-js 도입 시 이 함수만 교체하면 됨

### 4-3. 중복 판정 키: doi > url

- `LiteratureItem.id`는 소스별 형식(`openalex_W1234`, `pubmed_5678`)이라 cross-source 중복 감지 불가
- `citationKey()` = `doi:${doi}` 또는 `url`로 통일
- `doi:` prefix는 doi 값이 URL과 충돌하는 edge case 방지

### 4-4. handleInsertCitation에서 saveCitation 미호출 (의도적)

- MaterialPalette의 citations는 이미 IndexedDB에서 로드된 것 → 재저장 불필요
- `handleInsertCitation`은 reassemble에 포함하기 위한 state 추가 (이미 DB에 있는 레코드)
- 신규 저장은 `/literature?project=xxx` 페이지의 `handleSaveCitation`에서만 수행

### 4-5. IndexedDB tx 헬퍼 중복 (인지된 기술부채)

- `txPut`, `txGetByIndex`, `txDelete`가 `citation-storage.ts`, `document-blueprint-storage.ts`, `chart-snapshot-storage.ts` 3곳에 반복
- 향후 `lib/utils/indexeddb-helpers.ts`로 추출 예정 (TODO.md에 등록)
- 이번 PR에서는 기존 패턴을 따라 scope 제한

---

## 5. 데이터 흐름

### 인용 저장 (Literature → IndexedDB)

```
1. 사용자: /literature?project=proj_1 접속
2. LiteratureSearchContent: URL에서 projectId 파싱, 기존 savedIds 로드
3. 사용자: 검색 결과에서 "저장" 클릭
4. handleSaveCitation → createCitationRecord → saveCitation (IndexedDB)
5. savedIds에 citationKey 추가 → 버튼 "저장됨"으로 변경
```

### 인용 → References 섹션 (DocumentEditor → Assembler)

```
1. DocumentEditor mount → listCitationsByProject(projectId) → setCitations
2. MaterialPalette에 citations prop 전달 (문헌 탭 표시)
3. 사용자: "재조립" 클릭
4. handleReassemble → reassembleDocument(doc, { ...sources, citations })
5. assembler: buildReferencesContent(citations, language) → References 섹션 content
```

### 인용 삭제

```
1. 사용자: MaterialPalette에서 Trash2 아이콘 클릭
2. handleDeleteCitation → deleteCitation(id) [IndexedDB] + setCitations(filter)
3. 다음 재조립 시 해당 인용 References에서 제외
```

---

## 6. 테스트 커버리지

| 테스트 파일 | Cases | 검증 내용 |
|------------|-------|-----------|
| `citation-apa-formatter.test.ts` | 10 | 저자 0/1/2/3/8명, doi/url/year 조합, 전체 포맷 |
| `citation-storage.test.ts` | 4 | CRUD, projectId 필터, 삭제 후 미조회, 추가순 정렬 |
| `document-assembler.test.ts` (추가분) | 3 | citations 있음→APA 포함, 빈 배열→소프트웨어만, undefined→기존 동작 |

테스트 방식:
- `citation-storage.test.ts`는 `fake-indexeddb/auto`로 실제 IndexedDB CRUD 검증 (mock 아님)
- `document-assembler.test.ts`는 순수 함수 테스트 (DI 패턴)

---

## 7. 알려진 한계 / 향후 작업

| 항목 | 상태 | 참조 |
|------|------|------|
| Author normalization (Kim, J. 형식) | 미지원 — display name 그대로 | buildCitationString 교체로 대응 |
| BibTeX 내보내기 | Later | TODO.md 4-A |
| Plate 에디터 인라인 인용 노드 | Later | TODO.md 4-A |
| Citation Verification (CrossRef API) | Later | TODO.md 4-A |
| Software Citation 자동 생성 | Later | TODO.md 4-A |
| IndexedDB tx 헬퍼 중복 | 기술부채 | TODO.md 3-C |

---

## 8. 리뷰 체크리스트

리뷰어가 확인해야 할 항목:

- [ ] `citationKey()` 로직이 cross-source 중복을 정확히 감지하는가?
- [ ] `handleReassemble`의 `useCallback` 의존성 배열에 `citations`가 포함되어 있는가?
- [ ] `buildReferencesContent`에서 citations가 undefined일 때 기존 동작이 유지되는가?
- [ ] MaterialPalette가 자체 state 없이 prop으로만 citations를 수신하는가?
- [ ] IndexedDB v5 마이그레이션이 기존 v4 데이터를 보존하는가? (`!db.objectStoreNames.contains` 가드)
- [ ] `/literature?project=xxx` 없이 접속 시 저장 버튼이 표시되지 않는가?
- [ ] `handleDeleteCitation`이 IndexedDB + state 양쪽을 동기적으로 정리하는가?
- [ ] APA 포맷터가 edge case(저자 0명, year null, journal 없음)를 처리하는가?

---

## 9. Diff

전체 diff는 아래 명령으로 확인:

```bash
cd stats && git diff HEAD~7..HEAD
```
