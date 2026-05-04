# BioHub ?듦퀎 UI/UX 怨좊룄??& 由ы뙥?곕쭅 ?붿뿬 ?묒뾽

## 0. Graph Studio / Papers follow-up (2026-04-12)
- [x] Graph Studio intentional gap 재검토: `encoding.color.scale`, `encoding.shape`, `encoding.size`, `scale.type=sqrt|symlog` 유지 여부와 renderer 지원 계획 정리 (defense-in-depth 유지 — 2026-04-14 재검토, 스키마 코멘트 추가)
- [x] Graph Studio save/restore/export 경계 최종 점검: route detach/reopen, snapshot last-good 유지, save 직후 외부 소비자 반영 흐름 E2E 확인 (`515a1bfb`, 2026-04-12)
- [x] Papers 문서 편집기 후속 보강: 문서 전환 직후 reassemble/export 타이밍 케이스와 citation 로딩 레이스 회귀 테스트 추가 (`a3d73407`, 2026-04-13)
- [x] PackageBuilder Step 2 자동 수집 후속 점검: same-tab entity/graph 변경 시 기존 item 재수집 정책과 사용자 수동 편집 충돌 여부 검토 (`a3d73407`, 2026-04-13)

### 자료 작성 플로우 재설계 점검 (2026-04-24)
- [x] **목표 UX 확정**: 1차 기준 `ResultsActionStep` / `GraphStudioHeader` / `PapersHub`에서 `자료 작성`을 시작하면 빈 `DocumentBlueprint`가 먼저 생성되고 `DocumentEditor`로 즉시 진입하며, 헤더/섹션에 `작성 중` 상태를 노출한다.
- [x] **현재 플로우 분리 문제 해소**: `ResultsActionStep` / `GraphStudioHeader` / `PapersHub`는 공통 작성 세션으로 정리했고, `ReportComposer`는 빠른 요약 export, `PackageBuilder`는 외부 AI 입력 패키지로 라벨과 설명을 분리했다.
- [x] **1차 범위 고정**: 1차 구현은 통계 결과 + Graph Studio를 중심으로 하고, 문서 skeleton 생성 → 에디터 자동 진입 → section별 초안 반영 → 완료/실패 상태 표시까지를 MVP로 고정했다.
- [x] **2차 범위 고정**: Bio-Tools와 유전적 분석(`blast/protein/seq-stats/similarity/phylogeny/bold/translation`)은 공통 supplementary contract + generic fallback으로 먼저 수용하고, 전용 writer 확장은 후속으로 분리했다.
- [x] **세션 상태 모델 설계**: `idle -> collecting -> drafting -> patching -> completed | failed` 문서 상태와 섹션 상태 모델을 추가하고 `DocumentEditor`에서 이를 구독한다.
- [x] **문서 우선 생성 원칙 채택**: AI/템플릿 생성 완료 후 문서를 여는 구조가 아니라, 빈 `DocumentBlueprint`를 먼저 만들고 편집기로 이동한 뒤 초안을 patch하는 구조로 전환했다.
- [x] **섹션 patch 계약 정의**: 1차 자동 patch 대상은 `Methods`, `Results`, `Figures` 계열로 고정했고, `generatedBy` / section state / merge helper 기준을 문서와 코드에 함께 반영했다.
- [x] **기존 사용자 편집 보존**: 사용자가 먼저 편집한 섹션은 즉시 `user/skipped`로 전환해 background patch를 막고, sidecar 병합은 보수적으로만 수행한다.
- [x] **작성 중 UI 점검**: 헤더 상태 배지, 섹션 상태 배지, drafting 배너, 실패/재시도 CTA를 에디터에 추가했다.
- [x] **스트리밍 vs 배치 결정**: 1차는 문단 스트리밍 대신 section 단위 patch로 고정했다.
- [x] **통계 초안 생성기 역할 정리**: `generatePaperDraft()`는 저수준 호환 adapter로만 유지하고, 제품 경로는 `generateAnalysisPaperDraft()` / `generatePaperDraftFromSchema()` / document-writing adapter로 고정했다.
- [x] **Graph Studio 연결 규칙 정리**: figure source와 related analysis provenance를 문서 source binding에 포함하고, graph 기반 문서 시작 경로를 공통 세션으로 맞췄다.
- [x] **Bio-Tools 결과 정규화**: `bio-tool-result`는 supplementary source로 정규화하고 generic supplementary writer 경로에 연결했다.
- [x] **유전적 분석 결과 정규화**: `blast-result`, `protein-result`, `seq-stats-result`, `similarity-result`, `phylogeny-result`, `bold-result`, `translation-result`를 supplementary contract로 정규화했다.
- [x] **프로젝트 문서 조립기 역할 재정의**: `DocumentAssemblyDialog`는 bulk assembly / skeleton generator 성격으로 유지하고, 작성 세션은 별도 entry flow로 분리했다.
- [x] **ReportComposer 역할 제한**: `ReportComposer`를 빠른 요약 export 전용으로 라벨링하고 자료 작성 문서 흐름과 구분했다.
- [x] **PackageBuilder 역할 제한**: `AI 패키지 조립`을 외부 AI 입력 패키지로 명시하고, 자료 작성 문서에 자동 반영되지 않는 별도 흐름으로 설명했다.
- [x] **저장/히스토리 연동 점검**: autosave, source usage, project entity/source binding, 문서 재진입/복원 경로를 현재 writing state 모델 기준으로 연결했다.
- [x] **오류/복구 시나리오 점검**: retry, stale write 차단, 첫 user edit 우선, partial section failure, supplementary fallback 등 핵심 복구 경로를 구현과 테스트로 고정했다.
- [x] **테스트 전략 확정**: 문서 생성 직후 에디터 진입, 작성 중 상태, section patch, user-edit 보존, supplementary source 연결, failure/retry를 회귀 테스트로 고정했다.

### 자료 작성 편집기 플랫폼 결정 기준 (2026-04-24)
- [x] **기본 방침 고정**: 1차 자료 작성 재설계는 `Plate 유지`를 기본안으로 진행한다. 현재 `DocumentEditor`/`PlateEditor`/공용 editor UI/수식 요소/테스트가 이미 Plate 기반이므로, 편집기 교체보다 문서 상태 모델 통합을 우선한다.
- [x] **Plate 유지 적합성 검증**: `문서 자동 진입`, `문서 레벨 작성 상태`, `section patch`, `표/수식 유지`, `user edit 보존`, `autosave + conflict 처리`를 현재 Plate 기반 편집기에서 구현했다.
- [x] **문서 상태 모델 우선 원칙**: 핵심 문제를 `paperDraft`와 `DocumentBlueprint` 파이프라인 분리로 정의하고, 엔진 교체 없이 먼저 상태 모델을 통합했다.
- [x] **Plate 유지 시 필수 점검**: `DocumentSection.generatedBy`, patch 규칙, 직렬화/복원, background patch 반영, source lineage 보존을 문서/코드/테스트 기준으로 맞췄다.
- [x] **Plate 유지 시 UX 점검**: 헤더/섹션 상태 UI가 selection/focus를 깨지 않도록 구현하고 관련 회귀 테스트를 추가했다.
- [x] **Plate 유지 시 테스트 점검**: `DocumentEditor.export-freshness.test.tsx`와 관련 unit/integration 테스트로 background patch, user edit skip, retry/conflict 케이스를 고정했다.
- [x] **Tiptap 재평가 트리거 정의**: `실시간 협업`, `댓글/제안 모드`, `강한 schema 제약`, `장기 문서 제품화`, `round-trip 정합성 강화`를 재검토 트리거로 문서화했다.
- [x] **Tiptap 스파이크 범위 정의**: 필요 시 `Methods + Results + Table + Equation + background AI patch`만 포함한 최소 spike로 검증한다는 기준을 고정했다.
- [x] **Lexical / ProseMirror 제외 근거 고정**: 현 단계에서는 구현 비용이 커서 비교 대상에서 제외하고 Plate/Tiptap만 후보로 유지한다.
- [x] **최종 성공 기준**: 편집기 플랫폼 결정은 “자료 작성 1차 MVP를 가장 짧은 시간 안에 안정적으로 출시하는가”를 기준으로 판단하기로 고정했다.

### 자료 작성 1차 구현 명세 (Plate 유지안, 2026-04-24)
- [x] 공통 모듈/공통 컴포넌트/registry 확장 전략 계획 문서: [`stats/docs/papers/PLAN-DOCUMENT-WRITING-ARCHITECTURE.md`](stats/docs/papers/PLAN-DOCUMENT-WRITING-ARCHITECTURE.md)
- [x] agent 리뷰 반영 핵심 계약 정리: 상태/저장/동시성 계약, `DocumentSection` merge matrix, `NormalizedWritingSource`, `manualBlank/sourceBoundDraft` entry mode, Phase 0 테스트 게이트를 위 계획 문서 기준으로 고정
- [x] 상태/저장/동시성 계약 문서: [`stats/docs/papers/PLAN-DOCUMENT-WRITING-STATE-CONTRACT.md`](stats/docs/papers/PLAN-DOCUMENT-WRITING-STATE-CONTRACT.md)
- [x] `DocumentSection` merge matrix 문서: [`stats/docs/papers/PLAN-DOCUMENT-SECTION-MERGE-MATRIX.md`](stats/docs/papers/PLAN-DOCUMENT-SECTION-MERGE-MATRIX.md)
- [x] **Step 1. 구현 명세 고정**: 1차 구현 범위를 `analysis + figure + blast/protein`, 진입점은 `ResultsActionStep + GraphStudioHeader`, 산출물은 `DocumentBlueprint`, 편집기는 `DocumentEditor(Plate)`로 고정한다.
- [x] **Step 1-A. 변경 파일 목록 고정**
  - `stats/lib/research/document-blueprint-types.ts`
  - `stats/lib/research/document-blueprint-storage.ts`
  - `stats/components/papers/DocumentEditor.tsx`
  - `stats/components/analysis/steps/ResultsActionStep.tsx`
  - `stats/components/graph-studio/GraphStudioHeader.tsx`
  - `stats/lib/research/document-assembler.ts`
  - `stats/__tests__/components/papers/DocumentEditor.export-freshness.test.tsx`
  - 신규 최소 테스트 2~3개
- [x] **Step 1-B. 1차 비포함 범위 명시**: 실시간 협업, 댓글/제안모드, 완전한 bio-tools writer, seq-stats/similarity/phylogeny/bold/translation 전용 writer, Tiptap 전환 spike는 1차 구현에서 제외한다.
- [x] **Step 2. 문서 상태 모델 확정**: `DocumentBlueprint`에 문서 레벨 작성 상태와 섹션 레벨 상태를 추가한다. 최소 후보: `writingState`, `writingJob`, `sectionStatuses`.
- [x] **Step 2-A. 상태 전이 정의**: 문서 레벨은 `idle -> collecting -> drafting -> patching -> completed | failed`, 섹션 레벨은 `idle -> drafting -> patched | skipped | failed`로 고정한다.
- [x] **Step 2-B. 저장 계약 정의**: 작성 상태도 문서 본문과 함께 IndexedDB에 저장하고, `loadDocumentBlueprint()` 시 normalize default를 적용한다. cross-tab 이벤트는 기존 `saved` 이벤트를 재사용한다.
- [x] **Step 2-C. 충돌 정책 정의**: `updatedAt` 기반 optimistic conflict는 유지하되, 1차에서는 문서 전체 conflict만 처리하고 섹션별 충돌 병합은 하지 않는다.
- [x] **Step 3. 진입점 통합 설계**
  - `ResultsActionStep`: 기존 `결과 요약` CTA를 `문서에서 작성` 시작점으로 승격할지 결정
  - `GraphStudioHeader`: 기존 문서 링크 옆에 `자료 작성` CTA 추가
  - `/papers`: 문서 허브 역할 유지, 결과/그래프에서 직접 생성된 문서를 열 수 있어야 함
- [x] **Step 3-A. 생성 경로 정의**: 클릭 즉시 빈 `DocumentBlueprint`를 만들고 `?doc=`로 이동한 뒤 background drafting을 시작한다.
- [x] **Step 3-B. source binding 정의**: 통계는 `historyId`, 그래프는 `graph project id`를 문서 source/provenance에 즉시 연결한다.
- [x] **Step 4. section patch / merge 정책 확정**
  - patch 단위는 `DocumentSection`
  - 1차는 `Methods`, `Results`, `Figure caption/figures`만 자동 patch
  - `Discussion`은 보류 또는 placeholder
- [x] **Step 4-A. user edit 보존 정책**: 사용자가 손댄 섹션은 1차에서 본문 patch를 skip하고, structured sidecar(`tables`, `figures`, `sourceRefs`)만 보수적으로 병합한다.
- [x] **Step 4-B. patch 적용 규칙**: 섹션 상태가 `patched`여도 신규 결과가 오면 같은 job 내 재patch는 허용하고, 다른 job이면 명시적 재작성 액션 전까지 자동 재patch하지 않는다.
- [x] **Step 4-C. 실패 규칙**: 일부 섹션 실패는 문서 전체 실패로 올리지 않고 `sectionStatuses[sectionId].status='failed'` + 문서 레벨 `patching` 또는 `failed`로 노출한다.
- [x] **Step 5. 테스트 명세 확정**
  - 결과 화면에서 문서 생성 후 에디터 진입
  - 문서 레벨 `작성 중` 상태 표시
  - 섹션 patch 반영 후 상태 전이
  - user edit 있는 섹션 patch skip
  - background patch 중 conflict / retry
- [x] **Step 5-A. 최소 구현 테스트 세트**
  - `DocumentEditor` 상태 배지/patch 회귀
  - `document-blueprint-types` normalize/unit 테스트
  - 진입점 helper 또는 생성 workflow 테스트 1건
- [x] **Step 6. 1차 구현 순서**
  1. 타입/normalize/storage 스캐폴딩
  2. `DocumentEditor` 상태 UI
  3. 문서 생성 helper
  4. `ResultsActionStep` 진입 연결
  5. `GraphStudioHeader` 진입 연결
  6. background patch + 테스트

### 자료 작성 남은 후속 작업 (2026-04-24 기준)
- [x] `ReportComposer`와 `PackageBuilder`를 자료 작성 주 흐름과 더 명확히 분리했다.
- [x] `generatePaperDraft()` 직접 사용 경로를 문서 작성 writer 체계와 정리했다. 공식 제품 경로는 `generateAnalysisPaperDraft()` / `generatePaperDraftFromSchema()` / document-writing adapter로 고정한다.
- [x] supplementary 결과 타입의 전용 writer 우선순위를 다시 정하고, generic fallback에서 어디까지 승격할지 결정했다.

### Graph Studio scoring follow-up (2026-04-14, 커밋 `9ae32a41` 후속)
- [x] **[P1] 기본 차트 타입 휴리스틱 재검토**: 샘플 데이터(`species`/`length_cm`/`weight_g`/`year`)에서 scatter를 기본값으로 선택하도록 `suggestChartType()` 기준을 정리하고 `ChartSetupPanel.defaultType`도 같은 경로를 사용하도록 통일. (`chart-spec-utils.ts`, `ChartSetupPanel.tsx`, `chart-spec-utils.test.ts`, 2026-04-14)
- [x] **[P1] Auto-color 인코딩 entry point 불일치**: `line`/`scatter` 기본 spec 생성 경로를 `createAutoConfiguredChartSpec()`로 공용화하여 `ChartSetupPanel`, `LeftDataPanel`, `ResultsActionStep`, `use-open-in-graph-studio`, `autoCreateChartSpec`, `createChartSpecFromDataPackage`가 같은 auto-color 규칙을 사용하도록 정리. (`chart-spec-utils.ts`, `ChartSetupPanel.tsx`, `LeftDataPanel.tsx`, `ResultsActionStep.tsx`, `use-open-in-graph-studio.ts`, `chart-spec-utils.test.ts`, 2026-04-14)
- [x] **[P2] `visit`/`age` ordinal 분기 −2 페널티 재검토 + `suggestChartType` line 우선권 완화**: `visit`/`age`를 `TIME_LIKE`에서 분리하고 nominal/ordinal X 후보를 같은 범주 축으로 취급하도록 정리. `suggestChartType()`은 이미 grouped quantitative 데이터에서 scatter를 우선하도록 완화됨. (`chart-spec-utils.ts`, `chart-spec-utils.test.ts`, 2026-04-14)
- [x] **[P2] 토큰 사전 한국어 확장**: `ID_LIKE`/`CATEGORY_FRIENDLY`/`TIME_LIKE`/`RESPONSE_LIKE`/`PREDICTOR_LIKE`에 한국어 토큰을 추가하고 `normalizeFieldName()`을 유니코드 정규식으로 확장. (`chart-spec-utils.ts`, `chart-spec-utils.test.ts`, 2026-04-14)
- [x] **[P2] `concentration`/`dose` 역할 모호성**: `concentration`/`intensity`/`level`을 predictor 힌트에도 포함해 dose-response 맥락에서 X축 후보로도 해석되도록 정리. (`chart-spec-heuristics.ts`, `chart-spec-utils.test.ts`, `chart-spec-heuristics.test.ts`, 2026-04-14)
- [x] **[P2] Y scorer CATEGORY suppression symmetry**: Y축 quantitative scorer는 category-hinted numeric id도 계속 강하게 배제하는 비대칭 설계를 유지하되, 그 의도를 코드 주석과 회귀 테스트로 명시. (`chart-spec-utils.ts`, `chart-spec-utils.test.ts`, 2026-04-14)
- [x] **[P3] `code`/`index` ID-like 토큰 완화**: 일반 `code`/`index` 토큰을 `ID_LIKE_TOKENS`에서 제거하고, 실제 row-id 성격의 standalone `index`/`row index`만 예외적으로 유지. `treatment_code`, `site_code`, `group_index` 같은 도메인 컬럼이 과감점되지 않도록 테스트로 고정. (`chart-spec-heuristics.ts`, `chart-spec-utils.test.ts`, 2026-04-14)
- [x] **[P3] `converters/shared.ts:678` `base.title.top: 8` 하드코딩**: `buildBaseOption()`도 `TITLE_TOP` 상수를 재사용하도록 정리해 title/legend offset 계산의 single source of truth를 유지. (`converters/shared.ts`, 2026-04-14)
- [x] **[P3] 샘플 데이터 preferredXY override**: 어류 생태 샘플(`species`/`length_cm`/`weight_g`/`year`)에 `preferredXY: { x: 'length_cm', y: 'weight_g' }`를 추가하고, `DataPackage` → Step 1 기본 생성 → Step 2 기본 선택 → 데이터 교체 경로가 공통 `resolveXYFields()`를 사용하도록 정리. (`graph-studio.ts`, `chart-spec-schema.ts`, `chart-spec-utils.ts`, `editor-actions.ts`, `ChartSetupPanel.tsx`, `LeftDataPanel.tsx`, `DataUploadPanel.tsx`, 관련 테스트, 2026-04-21)
- [x] **[P3] Legend-title 오프셋 CI 검증 — Playwright screenshot diff**: Graph Studio 전용 visual regression spec로 `title 있음` × `titleSize 기본/24+` × `top/bottom legend` × compact desktop viewport 4개 baseline을 추가. 현재 UI title control이 single-line input이라 multiline title은 사용자 경로로 재현 불가하며, 현 baseline은 실제 편집 경로에서 발생 가능한 레이아웃 회귀를 우선 고정한다. (`graph-studio-visual-regression.spec.ts`, `selectors.ts`, `DataTab.tsx`, `StyleTab.tsx`, 2026-04-14)
- [x] **[P1] Legend orient schema drift 방지**: `legend-orients.ts`의 `LEGEND_ORIENTS` / top-bottom subsets를 schema와 converter가 공용으로 사용하도록 정리. (`legend-orients.ts`, `chart-spec-schema.ts`, `converters/shared.ts`, 2026-04-14)
- [x] **[P2] 토큰 사전 + 유니코드 tokenizer 분리**: 5종 토큰 사전과 `normalizeFieldName()`/ID 판정을 `stats/lib/graph-studio/chart-spec-heuristics.ts`로 분리하고, `chart-spec-utils.ts`는 scoring만 담당하도록 정리. (`chart-spec-heuristics.ts`, `chart-spec-utils.ts`, `chart-spec-heuristics.test.ts`, `chart-spec-utils.test.ts`, 2026-04-14)
- [x] **[P2] `selectXYFields → selectAutoColorField` 통합 테스트 (완료 `e18a6e4a` 이후)**: 통합 케이스 2건으로 보강 완료. `xField=treatment_id` 선택 후 auto-color가 species로 빠지는 시나리오와, `length_cm + weight_g + species`에서 X=species / Y=weight_g / color=null(species=X이므로 제외) 경로를 함께 고정. (`chart-spec-utils.test.ts`, 2026-04-14)
- [x] **[P2] `legend.top(px)` vs `grid.top(%)` 산술 guard**: `buildBaseOption`에서 상단 범례+큰 제목 조합일 때 `grid.top` 최소 퍼센트를 runtime으로 끌어올리는 guard를 추가. (`converters/shared.ts`, `echarts-converter.test.ts`, 2026-04-14)
- [x] **[P3] `components/common/index.ts` barrel 갱신 (완료 `SortablePinnedCardGrid`)**: `SortablePinnedCardGrid` export 확인. 이후 `common/` 신규 컴포넌트는 barrel 동기 필수. (2026-04-21 재확인)
- [ ] **[P3] `MAX_PINNED_TOOLS` 팩토리 파라미터화**: `createPinnedToolsStore(persistKey)` — 현재 6 하드코딩. 미래 다른 한도(e.g., favorite analyses 10개)가 생길 때 `createPinnedToolsStore(persistKey, { maxItems = 6 } = {})`로 확장. 지금 선제 구현 불필요 — YAGNI.
- [x] **[P3] `app/genetics/page.tsx` `tool.ready` 필터 회귀 테스트**: `filterReadyTools(ids, map)` helper로 추출하고 missing/`ready:false` 경로를 단위 테스트로 고정. (`filter-ready-tools.ts`, `filter-ready-tools.test.ts`, `app/genetics/page.tsx`, 2026-04-21)
- [ ] **[P3] Bisect quirk — `e18a6e4a`**: barrel이 `analysisVizTypeToChartType` 재-export하지만 이 symbol은 `b94b7bb2`에서야 `chart-spec-utils.ts`에 추가됨. 해당 SHA에서 fresh checkout + tsc 시 실패. 원인: 내 barrel 커밋 staging 시 다른 세션 uncommitted 변경도 함께 포함됨. 실용상 main은 정상, bisect 특수 케이스만 영향. history rewrite 불필요.
- [x] **[P3] CLAUDE.md Graph Studio 토큰 휴리스틱 섹션**: 5종 토큰 사전(ID/CATEGORY/TIME/RESPONSE/PREDICTOR), `normalizeFieldName()` 유니코드/camelCase 규칙, X/Y scorer 비대칭, auto-color exclusion 규칙, 회귀 테스트 파일을 `CLAUDE.md`에 문서화. (`CLAUDE.md`, 2026-04-14)
- [x] **[P2] `patternSummary` Textarea readonly 전환 + 자동 생성 라벨**: [PackageBuilder.tsx:238-244](stats/components/papers/PackageBuilder.tsx#L238-L244) Textarea가 편집 가능이지만 [PackageBuilder.tsx:451](stats/components/papers/PackageBuilder.tsx#L451) refresh 시 자동 생성본으로 덮어써짐 → silent data loss. 커밋 `685c19fe`에서 저자가 의도적으로 "자동 파생 필드"로 재정의했으므로 UI 계약도 동기화 필요. `readOnly` prop + 레이블 "📊 분석 결과 기반 자동 생성" 추가. 사용자 커스텀 워딩은 최종 DOCX export에서 수행. 구현 ~10줄 + refresh-preservation 테스트 1건 업데이트. (완료 2026-04-20)

### Graph Studio architecture stabilization follow-up (2026-04-14)
- [x] 계획 문서 기준선 확정: [`stats/docs/graph-studio/PLAN-ARCHITECTURE-STABILIZATION.md`](stats/docs/graph-studio/PLAN-ARCHITECTURE-STABILIZATION.md) 기준으로 기존 계획과 충돌 지점 정리 + 유지할 기존 결정 명시. (2026-04-14)
- [x] **[P1] project restore compatibility 강화**: 동일 필드명만으로 기존 `chartSpec`을 재부착하지 않도록 dataset compatibility 기준 재설계. (`graph-studio-store.ts`, `graph-studio-store.test.ts`, 2026-04-14)
- [x] **[P1] preview/export contract 일치화**: preview 배경과 PNG/SVG export 배경이 같은 `style.background` 경로를 따르도록 정리. (`export-utils.ts`, `export-utils.test.ts`, 2026-04-14)
- [x] **[P2] session / persistence coordinator 분리**: route sync, project detach, draft chat lifecycle key, snapshot save semantics를 `session-coordinator.ts` 기준으로 재구성. (`session-coordinator.ts`, `GraphStudioContent.tsx`, `session-coordinator.test.ts`, `GraphStudioContent-route-sync.test.tsx`, `GraphStudioContent-save.test.tsx`, 2026-04-14)
- [x] **[P2] save transaction semantics 정리**: metadata 저장 성공과 snapshot 저장 실패가 사용자에게 같은 "저장 완료"로 보이지 않게 상태와 토스트 기준 정리. (`GraphStudioContent.tsx`, `GraphStudioContent-save.test.tsx`, 2026-04-14)
- [x] **[P2] chart capability registry 도입**: preview/export/overlay/facet/style capability를 chart type별 단일 선언으로 통합. (`chart-capabilities.ts`, `ChartPreview.tsx`, `useDataTabLogic.ts`, `useStyleTabLogic.ts`, `echarts-converter.ts`, `matplotlib-compat.ts`, `chart-capabilities.test.ts`, 2026-04-14)
- [x] **[P2] matplotlib export contract 정렬**: preview와 동일 재현이 안 되는 spec(feature-level mismatch)은 preflight에서 차단하고, dialog/service가 같은 validation 규칙을 공유하도록 정리. (`matplotlib-compat.ts`, `ExportDialog.tsx`, `matplotlib-export.service.ts`, `matplotlib-compat.test.ts`, `matplotlib-export.service.test.ts`, 2026-04-14)
- [x] **[P2] editor action layer 공용화**: `LeftDataPanel`, `DataTab`, `ChartSetupPanel`, AI patch apply 경로의 field assignment / chart mutation 규칙을 공용 action helper로 통합. (`editor-actions.ts`, `LeftDataPanel.tsx`, `useDataTabLogic.ts`, `ChartSetupPanel.tsx`, `use-ai-chat.ts`, `editor-actions.test.ts`, `use-ai-chat.test.ts`, 2026-04-14)
- [x] **[P3] ambient research project 의존 제거**: `saveCurrentProject()`가 외부 active project singleton을 직접 읽지 않도록 session binding(`linkedResearchProjectId`) 경로로 정리. (`graph-studio-store.ts`, `graph-studio-store.test.ts`, 2026-04-14)
- [x] **[P2] session/persistence hardening follow-up**: remount 시 stale in-memory project가 `?project=`에 다시 써지지 않도록 route sync guard 보강, rollback save 중 eviction 발생 시 snapshot/entity ref cleanup 누락 방지, `deleteProjectCascade()`의 localStorage write 실패 경로도 best-effort cleanup 의미와 맞게 재정의. (`session-coordinator.ts`, `GraphStudioContent.tsx`, `graph-studio-store.ts`, `project-storage.ts`, 완료 2026-04-20)
- [x] **[P3] Graph Studio 테스트 강도 보강**: `GraphStudioContent-save.test.tsx`는 실제 ref lifecycle에 더 가까운 save wiring을 검증하고, `graph-studio-store.test.ts` rollback 케이스는 metadata 호출 순서뿐 아니라 persisted storage consistency까지 단언하도록 보강. (`GraphStudioContent-save.test.tsx`, `graph-studio-store.test.ts`, 완료 2026-04-20)
- [x] **[P3] Smart Flow → Graph Studio 브리지 E2E 분리 안정화**: 결과 화면 seed helper(`analysis-storage`)로 Graph Studio/Export 대상 케이스를 Smart Flow 업로드 경로와 분리하고, dropdown bridge 클릭을 공용 헬퍼로 묶어 `TC-4B.1.3`, `TC-3.5.13`, `TC-3.5.14`를 static E2E에서 복구. (`e2e/helpers/flow-helpers.ts`, `e2e/ux/graph-ux.spec.ts`, `e2e/charts/chart-export.spec.ts`, 완료 2026-04-20)

## 1. 시각화 및 UX 컴포넌트 고도화
- [x] AI 해석의 요약 (결론 도출 근거) 정보를 결과 카드에 축약하여 노출 (Hero Card의 AI 요약 첫 줄) (2026-04-07)
- [x] 분석 유형별(통계 메서드별) 기본 시각화 컴포넌트 매핑 일관성 확보 (`b94b7bb2`, 2026-04-14 analysisVizTypeToChartType + adapter 우선 priority + AnalysisVizType union)
- [ ] 사용자 언어(질문 기반)가 통계 엄밀함을 해치는지 확인하고 문구 미세 조정 및 모니터링 *(부분 — terminology 인프라 구축, 자동 검증 lint 없음)*
  - [x] `language(ko/en)` + `domain(aquaculture/generic)` 분리 인프라, cross-combo resolver, guided flow ownership 정리, Settings 모달 언어/도메인 전환 UI 연결 및 조합 회귀 테스트 보강 (2026-04-21)
  - [x] Hub `ChatThread`의 진단 카드/업로드 CTA/에러 재시도 copy를 language-aware fallback으로 정리하고 영어 렌더 회귀 추가 (`ChatThread.tsx`, `ChatThread.test.tsx`, 2026-04-21)
  - [x] `LiveDataSummary`의 데이터 요약/빈 상태/유형 배지/group count copy를 language-aware fallback으로 정리하고 영어 렌더 회귀 추가 (`LiveDataSummary.tsx`, `LiveDataSummary.test.tsx`, 2026-04-21)
  - [x] Hub `DataContextBadge`의 행/열 메타, 확장/제거 aria, 변수 유형 라벨을 language-aware fallback으로 정리하고 영어 렌더 회귀 추가 (`DataContextBadge.tsx`, `DataContextBadge.test.tsx`, 2026-04-21)
  - [x] `AiInterpretationCard`의 `전체 보기` / `접기` / `더 보기` 토글을 terminology로 이관하고 영어 렌더 회귀 테스트 추가 (`AiInterpretationCard.tsx`, `AiInterpretationCard-pill-selection.test.tsx`, `terminology-types.ts`, `generic.ts`, `aquaculture.ts`, 2026-04-23)
  - [x] `ResultsActionButtons`의 액션 패널 설명/보조 도구 copy와 export format 라벨을 terminology로 이관하고 영어 렌더 테스트 추가 (`ResultsActionButtons.tsx`, `ResultsActionButtons.localization.test.tsx`, `terminology-types.ts`, `generic.ts`, `aquaculture.ts`, 2026-04-23)
  - [x] `ResultsStatsCards`의 통계표 복사 plain text / HTML 헤더를 clipboard terminology로 통일 (`ResultsStatsCards.tsx`, 2026-04-23)
  - [x] `ResultsHeroCard`의 메서드 라벨 / APA 복사 aria / 파일 배지 / 검증 메타 / 옵션 라벨을 terminology로 이관하고 영어 렌더 테스트 추가 (`ResultsHeroCard.tsx`, `ResultsHeroCard.localization.test.tsx`, `terminology-types.ts`, `generic.ts`, `aquaculture.ts`, 2026-04-23)
  - [x] `ResultsActionStep`의 히스토리 결과/문서 사용처 배너와 코드 export 라벨을 terminology로 이관하고 관련 테스트 목업을 동기화 (`ResultsActionStep.tsx`, `ResultsActionStep*.test.tsx`, `terminology-types.ts`, `generic.ts`, `aquaculture.ts`, 2026-04-23)
- [x] **ResultsActionStep 훅 추출**: `useResultsCopyExport`, `useResultsHistory`, `useResultsNavigation`, `useResultsPaperDraft`로 분리하고 액션/훅 테스트까지 보강. (`be77c7a5`, `dfa36cc9`, 2026-04-20)

## 2. StatisticalExecutor 留덉씠洹몃젅?댁뀡 諛??뚯꽌 踰꾧렇 ?닿껐 (B2)
- [x] **Poisson / Ordinal Regression Model-level p-value**: Worker + Handler ?묒そ `llrPValue`/`llrStatistic` ?꾩쟾 援ы쁽 ?뺤씤 (2026-04-07 寃??
- [x] **Stepwise Regression 寃곌낵 留ㅽ븨**: 踰꾧렇 ?꾨떂 ??Handler媛 `fStatistic`/`fPValue` ?뺤긽 ?ъ슜, 媛쒕퀎 `pValues` 諛곗뿴? rawResults濡??꾪뙆 (2026-04-07 寃??
- [x] **generated types 紐낆꽭**: `OrdinalLogisticResult`, `PoissonRegressionResult` ????꾩쟾, any 1怨녹? ?ㅼ쨷 諛섑솚???泥섎━濡??뺣떦 (2026-04-07 寃??
- [x] **MANOVA `|| 0` / ?쇳빆?곗궛??*: `|| 0`? NaN?? ?섎룄??蹂?섏쑝濡??뺣떦, ?쇳빆 1嫄?以묐났? 誘몃? (2026-04-07 寃??
- [x] **worker2 `manova()` dead code ?쒓굅**: TS??worker3?쇰줈 ?쇱슦????worker2 踰꾩쟾 220以??쒓굅 ?꾨즺 (2026-04-07)

## 3. Statistical Validation

### ?꾨즺
- [x] **Phase 1**: T-test 4 + ANOVA 2 = 6/6 PASS, LRE 14.8 (`run-phase1-2026-04-06.json`)
- [x] **Phase 2**: 鍮꾨え??+ ?곴? + ?뚭? = 26媛?硫붿꽌??29/29 PASS, LRE 12.97 (`run-phase2-2026-04-07.json`)
- [x] **Phase 1 蹂닿퀬??寃利?*: ?낃퀎 踰ㅼ튂留덊겕 ?섏튂 援먯감寃利??꾨즺, Stata ANOVA 3嫄?+ 異쒖쿂 3嫄??섏젙

### Phase 3 ?꾨즺 (24媛?硫붿꽌?? ??55/55 PASS
- [x] **Phase 3**: 移댁씠?쒓낢 + ?ㅻ???+ ?앹〈/?쒓퀎??+ ?곗씠???꾧뎄 = **55/55 PASS**, LRE 12.6 (`run-phase3-final-2026-04-07.json`)
- [x] R golden data 誘명룷??11媛??섏젙 ?꾨즺
- [x] Phase 3 蹂닿퀬?? `VALIDATION-REPORT-phase3-2026-04-07.md`
- [x] **FAIL 4嫄???55/55 PASS ?ъ꽦**
  - `stationarity-test` LRE 5.7??0.3: ?щ꼫 `regression='c'`??'ct'` (R adf.test??constant+trend ?ы븿)
  - `cox-regression` LRE 1.7??4.7: ?щ꼫 `PHReg(ties='efron')` 異붽? (R coxph 湲곕낯媛?Efron, statsmodels 湲곕낯媛?Breslow 遺덉씪移?
  - `factor-analysis` LRE 0.7??.6: sklearn MLE?묿umPy PAF ?꾪솚, comm tier3 + varExp tier4 (?쇱옄 鍮꾧탳 ?꾨즺)
  - `cluster` LRE 1.7??.4: golden tier3?뭪ier4 + clusterSizes ?뺣젹 ?쇱튂 (sklearn Lloyd vs R Hartigan-Wong)

### Phase 4 ?꾨즺 ??65/65 PASS
- [x] **NIST StRD 吏곸젒 寃利?(Layer 1)**: 4/4 PASS, LRE 10.3~14.6 ??Norris, Pontius, AtmWtAg, Michelson (`run-phase4-2026-04-07.json`)
- [x] **?ｌ?耳?댁뒪 寃利?(Layer 3)**: 6/6 PASS ??寃곗륫媛?NaN), 洹밸떒媛?r??, ?댁긽移?, ?뚰몴蹂?n=3), ?숈젏(?꾩껜 ?숈닚??
- [x] **怨듭떇臾몄꽌 踰꾩쟾 怨좎젙 李몄“**: Phase 1~3 蹂닿퀬?쒖뿉 Library Version Reference ?뱀뀡 異붽? (踰꾩쟾 ? URL)
- [x] Phase 4 蹂닿퀬?? `VALIDATION-REPORT-phase4-2026-04-07.md`

### ?명봽??/ Worker 踰꾧렇
- [x] **worker2 poisson_regression**: GLM ?꾪솚 ?꾨즺 + predicted/residuals ndarray ?몃뜳???섏젙
- [x] **worker2 partial_correlation pValue**: t-遺꾪룷 df=n-k-2 吏곸젒 怨꾩궛 + r clip + 理쒖냼 ?쒕낯 k+4
- [x] **worker4 cox_regression**: np.asarray() ?뺢퇋?붾줈 DataFrame/ndarray ?듯빀 泥섎━
- [x] **welch-t 寃利?留ㅽ븨 蹂닿컯**: golden JSON + ?꾨뱶 留ㅽ븨??cohensD/mean1/mean2 異붽? (2026-04-07)

### Phase 2 諛쒓껄?ы빆 (LRE ?議????ㅻТ ?곹뼢 ?놁쓬)
- [ ] mann-whitney LRE=8.0, ordinal LRE=4.8, dose-response LRE=5.8, pearson ?몄감 7.5~13.4

### 寃利?媛?遺꾩꽍 (?곸꽭: `stats/docs/VALIDATION-GAPS-ANALYSIS.md`)
- [x] **?뚭퀬由ъ쬁 李⑥씠 ?ш???*: factor-analysis sklearn MLE?묿umPy PAF ?꾪솚 (LRE 0.69??.6, tier3), arima 4.72쨌ordinal 4.81 tier3 ?곸젅 ?뺤씤, ?쇱옄 援먯감鍮꾧탳 臾몄꽌???꾨즺
- [x] **kaplan-meier ??statsmodels ?꾪솚**: `SurvfuncRight + survdiff` ?ъ슜, R ?鍮?LRE 15.0 ?좎? ?뺤씤
- [x] **method-target-matrix.json ?뺤젙**: 9媛?硫붿꽌?쒖쓽 pythonLib/pythonCall???ㅼ젣 ?쇱씠釉뚮윭由??몄텧濡??섏젙
- [x] **寃利?硫뷀??곗씠??UI ?쒖떆**: `validation-metadata.ts` + ResultsHeroCard 諛곗? (?쇱씠釉뚮윭由щ챸 + R 寃利??꾨즺)
- [x] **?먯껜 援ы쁽 10媛?怨듭떇 ?議??꾨즺**: 12媛?援ы쁽泥?媛먯궗 ??BUG 3嫄?+ ISSUE 4嫄?+ Finding 2嫄??섏젙 (mann-kendall tie correction, mixed-model 7嫄? manova placeholder ?쒓굅)
- [x] **?ｌ?耳?댁뒪 異붽?**: 遺꾩궛 0, n=1, ?꾩쟾 遺꾨━, ?ㅼ쨷怨듭꽑?? ?꾩껜 寃곗륫, 鍮??⑺꽣 ??6媛?異붽? (12/12 PASS)
- [x] **NIST ?뺤옣**: Filip(?ㅽ빆?뚭?, LRE 7.7), Longley(?ㅼ쨷怨듭꽑?? LRE 12.3) 異붽? ??6/6 PASS

## 4. 李⑦듃 ?덉쭏 ?먭? (UI ?ㅻ벉湲??꾨즺 ??
- [ ] ?곸꽭: [`stats/docs/CHART-REVIEW-CHECKLIST.md`](stats/docs/CHART-REVIEW-CHECKLIST.md)
- [ ] L1: 而⑤쾭???뚯뒪??edge case 蹂닿컯 (鍮??곗씠?? NaN, ?⑥씪 ?ъ씤?? ??⑸웾)
- [ ] L2: Analysis Flow 4媛?+ Graph Studio 12????쒓컖 ?붿냼 ?섎룞 ?먭?
- [ ] L3: ?됱긽 ?묎렐?? ?ㅽ겕紐⑤뱶, 諛섏쓳?? ?대낫?닿린 怨듯넻 ?덉쭏

## 5. ?ㅼ쨷 ?먯씠?꾪듃 諛??ъ쟾 援ъ텞 ?꾨＼?꾪듃 ?ㅺ퀎 (Prompt Registry & Cross-Model Review)

> **상태**: 보류 — 대형 설계 작업으로 분리. 별도 스펙 착수 후 재개.
- [ ] **議곕┰???꾨＼?꾪듃 ?쇱씠釉뚮윭由?`ai/prompts`) 援ъ텞**: ?쇰Ц ?앹꽦 ?뚯툩(Methods, Results ??, 臾몄꽌 ?댁“ ?뚯툩(Journal, Report), 寃利??꾩슜 ?뚯툩濡?嫄곕????⑥씪 ?꾨＼?꾪듃瑜?遺꾪븷 (?곸꽭: `ai/PROMPT_REGISTRY_PLAN.md` 李몄“).
- [ ] **?뱀뀡/紐⑹쟻蹂??꾩슜 ?꾨＼?꾪듃 ?앹꽦**: ?듦퀎 寃곌낵 ?섏튂?? 洹몃옒???⑦꽩, ?앺깭??遺꾩빞蹂꾨줈 理쒖쟻?붾맂 ?꾨＼?꾪듃 ?쒗뵆由??뚯씪 ?앹꽦 諛??숈옉 ?뚯뒪??
- [ ] **?먮룞 寃利??뚯씠?꾨씪??Cross-Model Review) 湲고쉷**: ?묒꽦 ?꾩슜 紐⑤뜽怨?寃???꾩슜 紐⑤뜽(?ㅻ쪟泥댁빱, ?⑺듃泥댁빱 ??븷)??援먯감 ?ъ엯??泥닿퀎???뺤씤??媛?ν븯?꾨줉 UX 湲고쉷.

## 6. Diagnostic Pipeline 湲곗닠 遺梨?(湲곕뒫쨌?고????곹뼢 ?놁쓬)

?곸꽭: [`stats/docs/superpowers/specs/diagnostic-pipeline-tech-debt.md`](stats/docs/superpowers/specs/diagnostic-pipeline-tech-debt.md)

### ?꾨즺
- [x] TD-3: Worker ?묐떟 ???以묐났 ??`worker-result-types.ts` 異붿텧 (`9ce2689e`)
- [x] TD-6: MIN_GROUP_SIZE ?곸닔 以묐났 ??`statistical-constants.ts` 異붿텧 (`9ce2689e`)
- [x] TD-7: 洹몃９ 蹂???닿껐 濡쒖쭅 以묐났 ??`resolveGroupVariable()` 異붿텧 (`9ce2689e`)
- [x] TD-1: suggestedSettings ??handler ?꾨떖 (Phase E) ??alternative/postHoc 吏??
- [x] TD-5: JSON 異붿텧 regex ?듯빀 ??`lib/utils/json-extraction.ts`
- [x] TD-2: auto 셀렉터 11개 메서드를 7개 전용 SelectorType으로 이전 (`8b9d54fc`, 2026-04-08)

### 以묎컙 (肄붾뱶 ?덉쭏)
- [x] TD-4: Pyodide lazy init ?⑦꽩 以묐났 ??`ensurePyodideReady()` 異붿텧

### ??쓬
- [x] TD-8: goToPreviousStep() ??Phase D?먯꽌 ?대? ?닿껐??
- [x] TD-9: experiment-design ?몃옓 ??data-consultation ?≪닔 ?꾨즺

## 7. Smart Flow Step 3 공통 UX 후속 작업 (2026-04-09)

### 현재 완료
- [x] chi-square 계열, mcnemar, proportion-test를 공통 `UnifiedVariableSelector`로 통합
- [x] `variable-requirements` 기반 슬롯/역할 옵션 패널 1차 반영
- [x] `analysisOptions.methodSettings` 기반 공통 옵션 저장/실행 경로 연결
- [x] Step 3에 `MethodGuidancePanel` 추가

### 다음 우선순위
- [x] mismatch 감지 시 `다른 방법 찾아보기` CTA 추가 (MethodFitBanner `actionCtaLabel` + `method-fit-action` data-testid)
- [x] `AutoConfirmSelector` UI 보강 (`a749331b`, 2026-04-10)
- [x] handler 계층에 `methodSettings` 전달 연결 (`7ed3db6c`, 2026-04-10)
- [x] `variable-requirements`의 `notes` / `dataFormat` 필드 Step 3 표시 (`MethodGuidancePanel`)
- [x] Step 4 결과 화면에 분석 옵션 표시 (`alternative`, `postHoc`, `ciMethod` 등) 추가 (2026-04-14 formatAnalysisOptionBadges + HeroCard 메타 row, 9/9 테스트)
- [x] Step 3 E2E/스모크 테스트 시나리오 추가 (click-first, slot 가드, 역할 필터) (2026-04-14 역할 필터 5개 시나리오 추가, 11/11 통과)

### 타입 검증
- [x] `pnpm exec tsc --noEmit` 통과 (2026-04-14 확인, 0 errors)

### 검증 파일
- [ ] `stats/docs/plans/2026-04-09-common-variable-assignment-ux-spec.md`
- [ ] `stats/components/analysis/variable-selector/UnifiedVariableSelector.tsx`
- [ ] `stats/components/analysis/variable-selector/AnalysisOptions.tsx`
- [ ] `stats/components/analysis/steps/VariableSelectionStep.tsx`
- [ ] `stats/components/analysis/steps/AnalysisExecutionStep.tsx`


### Section 7 후속 playbook (별도 세션)
- [x] Optional slot 테스트 추가 (ANCOVA covariate `required:false`) — multi-var 메서드 경로 가드 (`method-fit.test.ts`, `UnifiedVariableSelector.test.tsx`, 2026-04-20)
- [x] Multi-slot 메서드 테스트 (one-way ANOVA 3-level factor, repeated-measures) — ANOVA 계열 regression 방지 (`method-fit.test.ts`, `UnifiedVariableSelector.test.tsx`, 2026-04-20)
- [x] 엣지 픽스처 상태 검증 (ID 컬럼, uniqueCount=1/50+, 날짜 컬럼) — 실데이터 크래시 방지 (`method-fit.test.ts`, `UnifiedVariableSelector.test.tsx`, 2026-04-20)
- [ ] `CANDIDATE_STATUS_LABELS` → `lib/terminology/selector-labels.ts` 이관 — 드리프트 방지 (드리프트 증거 나온 후)
- [ ] `caution` 상태 재도입 (제품 요구 발생 시) — type union + labels + CSS + terminology 4포인트 동시 개방

### 사전 존재 이슈 (본 세션 스코프 외)
- [x] Method-ID canonicalization drift — AES만 정규화, VSS/ResultsActionStep은 raw id. `useCanonicalSelectedMethod` 공유 hook 추출 (`use-canonical-selected-method.ts`, `VariableSelectionStep.tsx`, `ResultsActionStep.tsx`, `AnalysisExecutionStep.tsx`, `method-registry.ts`, 2026-04-20)
- [x] `variable-requirements` 라벨 워딩 재검토 — `equalVar`/`welch` 설정 라벨을 option variant와 분리 (`분산 가정 선택`, `분산 동질성 처리`), Step 3/4 formatter 회귀 통과 (2026-04-21)
## 8. Statistics UI Polish Follow-up (2026-04-10)

- [ ] 모바일 해상도에서 Hub hero, 빠른 분석 pills, 보조 도구 카드 밀도 재점검 *(모바일 보류 — 배포 후)*
- [x] 결과 화면 우측 히스토리 사이드바 정보 밀도와 액션 노출 수준 재조정 *(행당 메타를 2줄로 압축하고, 현재 항목에서는 상태 배지/더보기 액션을 항상 노출하도록 정리 — `AnalysisHistorySidebar.tsx`, `AnalysisHistorySidebar.test.tsx`, 2026-04-23)*
- [x] 결과 화면 Hero 메타 영역에서 메서드별 중요 정보 우선순위 재정의 (`7b83b1cd`, 2026-04-10 ResultsHeroCard.tsx 96→52줄 + methodEntry 분기)
- [ ] AI 해석 카드의 섹션 pill/전체 보기 동작을 모바일과 긴 텍스트 기준으로 추가 검토 *(모바일 보류 — 배포 후)*
- [x] Data Exploration Step에서 업로드 교체 상태와 경고 배너의 시각적 우선순위 재검토 (`500dc963`, 2026-04-12)
- [x] 실제 사용자 시나리오 기준으로 Hub → Step 1 → Result 전체 흐름 e2e 스모크 테스트 추가 (`c91cff4c`, 2026-04-13 (부분 — 사이드바+smoke-test.mjs))

## 9. 논문 작성 반자동화 메모 (2026-04-27)

- [x] 방향 문서 작성: [`docs/PLAN-PAPER-WRITING-SEMIAUTOMATION.md`](docs/PLAN-PAPER-WRITING-SEMIAUTOMATION.md)
- [x] `Analysis` 결과를 논문 작성용 `study schema`로 승격하는 타입 초안 작성 (`stats/lib/services/paper-draft/study-schema.ts`, `stats/lib/research/document-blueprint-types.ts`, 2026-04-29)
- [x] 결과 패널/히스토리 초안 생성 경로에 `studySchema` 보존 추가 (`PaperDraft.studySchema`, `generatePaperDraftFromSchema`, `generateAnalysisPaperDraft` schemaOptions, 2026-04-29)
- [x] 큰 관점 consistency 리뷰 반영: `DraftContext`는 사용자 확인 원본, `StudySchema`는 파생 스냅샷으로 고정하고 `sourceFingerprint`/언어/방법/데이터 소스 guard 및 lifecycle 시뮬레이션 테스트 추가 (2026-04-29)
- [x] Methods 사용자 UX 계약 추가: `ready / needs-review / blocked` 준비도, 체크리스트, 사용자 확인 질문, 결과 패널 준비도 카드 (`methods-readiness.ts`, `PaperDraftPanel`, 2026-04-29)
- [x] 프로젝트 원칙 고정: `많이 써주는 AI`보다 `틀린 말을 하지 않는 보수적 자동화`를 논문 작성 반자동화의 기본 원칙으로 문서화 (2026-04-29)
- [x] 자료 작성 문서 허브 추가: `stats/docs/papers/README.md`에 원칙, 기준 문서, 코드 위치, source-of-truth 정리 (2026-04-29)
- [x] 섹션별 자동화 범위 SSOT 추가: `SECTION-SCOPE.md`에 Introduction/Materials and Methods/Results/Discussion/References별 자동화 가능·사용자 확인·금지·gate·테스트 기준 정리 (2026-04-29)
- [x] `Statistical Methods` 자동 작성 범위 정의: 분석군별 자동 작성 가능 항목, 사용자 확인 항목, 금지 표현, gate rule을 `methods-scope.ts`와 테스트로 고정 (2026-04-29)
- [x] `Methods` 템플릿 문장 점검: `methods-scope.ts` 금지 표현과 기존 `paper-templates.ts` golden snapshot 정합성 보강 (2026-04-29)
- [x] `Results` 자동 작성 범위 정의: 통계량/p-value/source provenance 차단, 효과크기/CI/model fit/post-hoc 검토 gate, 금지 표현 테스트 고정 (`results-scope.ts`, `results-readiness.ts`, 2026-04-29)
- [x] Figure/Table caption 자동 생성 규칙 정의: source provenance 차단, figure message/panel review, 장비·배율·패턴 추론 금지, 실제 생성 표 기준 caption 테스트 고정 (`captions-scope.ts`, `captions-readiness.ts`, 2026-04-29)
- [x] `Materials/Samples` source contract 1차 구현: 데이터셋/시료/species source provenance와 verification 상태를 `StudySchema.materials`에 보존하고, 검증되지 않은 species source는 Methods 작성 gate에서 차단 (`materials-source-contract.ts`, `study-schema.ts`, `methods-readiness.ts`, 2026-04-29)
- [x] citation source contract 1차 시뮬레이션: DOI와 문헌 요약 source가 없는 문헌은 Introduction/Discussion 본문 citation에서 차단하고 References 후보로만 제한 (`citation-source-contract.ts`, `citation-source-contract.test.ts`, 2026-04-29)
- [x] `Preprocessing` source contract 1차 구현: 결측/중복 validation evidence와 변환·표준화·제외·imputation step을 `StudySchema.preprocessing`에 보존하고, validation error는 차단, 처리 rationale 누락은 review gate로 처리 (`preprocessing-source-contract.ts`, `methods-readiness.ts`, 2026-04-29)
- [x] 가정 위반, 결측 처리, 다중비교 보정 누락 시 생성 게이트 설계: Methods는 가정/결측 사용자 판단 누락을 `needs-review`, validation error와 post-hoc 보정 방법 누락을 `blocked`로 처리하고, Results는 보정 방법 누락을 수치 기반 `needs-review`로 남기도록 테스트 시뮬레이션까지 고정 (`methods-readiness.test.ts`, `results-readiness.test.ts`, `paper-draft-service.test.ts`, 2026-04-29)
- [x] 다중 분석 문서용 `DocumentBlueprint` authoring plan 설계: `metadata.studySchema`는 기존 단일 분석 문서 호환용으로 유지하고, 새 기준은 `metadata.authoringPlan.sources[]`에 `DocumentSourceRef`별 `StudySchema`/`sourceFingerprint`를 보존하는 source-keyed plan으로 결정 (`document-blueprint-types.ts`, `document-blueprint-storage.ts`, `document-blueprint-types.test.ts`, 2026-04-29)
- [x] `DocumentBlueprint.metadata.generatedArtifacts` 기반 artifact-level provenance 연결: Methods/Results section patch 성공 시 deterministic artifact id와 sourceRefs/generator/options를 metadata에 기록하고, authoring plan source/section plan에서 artifact id를 역참조하도록 연결 (`document-blueprint-types.ts`, `document-writing-orchestrator.ts`, 2026-04-29)
- [x] `generatePaperDraft()` 직접 사용 경로 정리: 제품 경로는 `generateAnalysisPaperDraft()` / `generatePaperDraftFromSchema()` / document-writing adapter로 고정하고, `generatePaperDraft()`는 저수준 호환 adapter로만 유지. analysis schema 재사용 조건을 `isReusableAnalysisStudySchema()`로 분리하고 fingerprint parity/stale context 테스트 추가 (`analysis-paper-draft.ts`, `analysis-writing-draft.test.ts`, 2026-04-29)
- [x] 자료 작성 핵심 작업 체크포인트 정리: 핵심 엔진은 1차 완료 상태로 보고, 남은 작업을 `ReportComposer`/`PackageBuilder` UX 분리와 supplementary 전용 writer 우선순위 결정으로 분리 (`stats/docs/papers/README.md`, `SECTION-SCOPE.md`, 2026-04-29)
- [x] `ReportComposer` / `PackageBuilder` UX 분리 완료: 빠른 요약 export, 외부 AI 입력 패키지, 자료 작성 문서 흐름의 역할을 UI 문구와 테스트로 구분 (`ReportComposer.tsx`, `PackageBuilder.tsx`, `PapersHub.tsx`, 2026-04-29)
- [x] supplementary writer 승격 정책 고정: 현재 전용 writer는 `blast-result`/`bold-result`/`protein-result`/`seq-stats-result`/`translation-result`/`similarity-result`/`phylogeny-result`, `bio-tool-result`는 `BioToolId`별 타입 가드 전까지 broad generic 유지 (`document-writing-supplementary-policy.ts`, 2026-04-29)
- [x] `bold-result` 전용 supplementary writer 추가: BOLD 결과는 후보 동정, 최고 유사도, BIN, DB, search mode, hit count만 문장화하고 확정 동정 표현은 금지 (`document-writing-supplementary-writers.ts`, `document-writing-source-registry.ts`, 2026-04-29)
- [x] `seq-stats-result` 전용 supplementary writer 추가: sequence count, mean length, GC content만 문장화하고 서열 품질/기능/종 동정 해석은 금지 (`document-writing-supplementary-writers.ts`, `document-writing-source-registry.ts`, 2026-04-29)
- [x] `translation-result` 전용 supplementary writer 추가: sequence length, genetic code, analysis mode, ORF count만 문장화하고 단백질 기능/coding potential/ORF 생물학적 의미 해석은 금지 (`document-writing-supplementary-writers.ts`, `document-writing-source-registry.ts`, 2026-04-29)
- [x] `similarity-result` 전용 supplementary writer 추가: sequence count, distance model, alignment length, mean distance만 문장화하고 종 경계/clustering/계통 해석은 금지 (`document-writing-supplementary-writers.ts`, `document-writing-source-registry.ts`, 2026-04-29)
- [x] `phylogeny-result` 제한 supplementary writer 추가: sequence count, tree method, distance model, alignment length만 문장화하고 분기군/지지도/진화 관계 해석은 금지 (`document-writing-supplementary-writers.ts`, `document-writing-source-registry.ts`, 2026-04-29)
- [x] supplementary 전용/제한 writer 판단 기준 문서화: 저장 스키마 안정성, source-backed 출력, 해석 금지 범위, deterministic template writer 원칙을 README와 SECTION-SCOPE에 고정 (2026-04-29)
- [x] supplementary writer 향후 개선 메모 추가: 구현 파일, dispatch, 정책, 핵심 테스트, 새 writer 추가 체크리스트를 README/SECTION-SCOPE에 정리 (2026-04-29)
- [x] `fst` Bio-Tools supplementary writer 추가: `FstResult` 타입 가드 후 Global Fst, pairwise matrix, population labels, permutation/bootstrap 수치만 문장화하고 기존 interpretation 문자열은 자동 본문에서 제외 (`document-writing-bio-tool-writers.ts`, `document-writing-source-registry.ts`, 2026-04-29)
- [x] `hardy-weinberg` Bio-Tools supplementary writer 추가: `HardyWeinbergResult` 타입 가드 후 allele frequency, observed/expected counts, chi-square/exact p-value만 문장화하고 interpretation/평형·이탈 판정 문구는 자동 본문에서 제외 (`document-writing-bio-tool-writers.ts`, `document-writing-source-registry.ts`, 2026-04-29)
- [x] Bio-Tools 추가/삭제 대응 정책 보강: `BIO_TOOL_SUPPLEMENTARY_WRITER_POLICY_BY_TOOL`에서 모든 `BioToolId`를 `dedicated / candidate / generic-only`로 분류하고, registry와 정책 record 동기화를 테스트로 확인 (2026-04-29)
- [x] `alpha-diversity` Bio-Tools supplementary writer 추가: `AlphaDiversityResult` 타입 가드 후 site/species count, Shannon/Simpson 등 지수 요약, 사이트별 주요 수치만 문장화하고 diversity 높고 낮음/생태학적 의미/군집 차이 해석은 자동 본문에서 제외 (`document-writing-bio-tool-writers.ts`, `document-writing-source-registry.ts`, 2026-04-29)
- [x] `beta-diversity` Bio-Tools supplementary writer 추가: `BetaDiversityResult` 타입 가드 후 distance metric, site labels, 쌍별 거리만 문장화하고 clustering/group separation/ecological distance interpretation은 자동 본문에서 제외 (`document-writing-bio-tool-writers.ts`, `document-writing-source-registry.ts`, 2026-04-29)
- [x] `rarefaction` Bio-Tools supplementary writer 추가: `RarefactionResult` 타입 가드 후 curve count, site labels, 곡선별 최종 n/expected species/point count만 문장화하고 표본 충분성/포화 여부/richness 해석은 자동 본문에서 제외 (`document-writing-bio-tool-writers.ts`, `document-writing-source-registry.ts`, 2026-04-29)
- [x] `condition-factor` Bio-Tools supplementary writer 추가: `ConditionFactorResult` 타입 가드 후 K 기술통계, 그룹별 기술통계, 선택적 비교 검정 수치만 문장화하고 condition의 좋고 나쁨/생리 상태/그룹 차이 유의성 해석은 자동 본문에서 제외 (`document-writing-bio-tool-writers.ts`, `document-writing-source-registry.ts`, 2026-04-29)
- [x] `roc-auc` Bio-Tools supplementary writer 추가: `RocAucResult` 타입 가드 후 AUC, AUC CI, threshold, sensitivity, specificity, ROC point count만 문장화하고 threshold는 중립 라벨로 표기하며 진단 성능 우수/불량, 임상적 유용성, 최적 cut-off 해석은 자동 본문에서 제외 (`document-writing-bio-tool-writers.ts`, `document-writing-source-registry.ts`, 2026-04-29)
- [x] `meta-analysis` Bio-Tools supplementary writer 추가: `MetaAnalysisResult` 타입 가드 후 pooled effect, CI, z/p, Q/Q p, I²/τ², study-level effect/CI/weight만 문장화하고 효과의 의미/유의성/이질성 높고 낮음/모델 선택 해석은 자동 본문에서 제외 (`document-writing-bio-tool-writers.ts`, `document-writing-source-registry.ts`, 2026-04-29)
- [x] `icc` Bio-Tools supplementary writer 추가: `IccResult` 타입 가드 후 ICC type, ICC, CI, F/df/p, mean squares, 대상 수/평가자 수만 문장화하고 interpretation 문자열/신뢰도 품질 판정은 자동 본문에서 제외 (`document-writing-bio-tool-writers.ts`, `document-writing-source-registry.ts`, 2026-04-29)
- [x] `vbgf` Bio-Tools supplementary writer 추가: `VbgfResult` 타입 가드 후 L∞, K, t₀, parameter table, R²/AIC, predicted/residual counts, N만 문장화하고 성장 양상 평가/생물학적 의미/모델 적합성 좋고 나쁨 해석은 자동 본문에서 제외 (`document-writing-bio-tool-writers.ts`, `document-writing-source-registry.ts`, 2026-04-29)
- [x] `survival` Bio-Tools supplementary writer 추가: `SurvivalResult` 타입 가드 후 Kaplan-Meier 곡선 수, log-rank p-value, 중앙 생존 시간, 그룹별 N/event/censor/endpoint 수치만 문장화하고 그룹 간 차이 유의성/생존 우수·불량/치료 효과·위험 해석은 자동 본문에서 제외 (`document-writing-bio-tool-writers.ts`, `document-writing-source-registry.ts`, 2026-04-29)
- [x] `nmds` Bio-Tools supplementary writer 추가: `NmdsResult` 타입 가드 후 stress, 차원 수, 지점 수, optional group count, 좌표만 문장화하고 stressInterpretation 문자열/군집 분리/gradient/생태학적 의미 해석은 자동 본문에서 제외 (`document-writing-bio-tool-writers.ts`, `document-writing-source-registry.ts`, 2026-04-29)
- [x] `species-validation` Bio-Tools supplementary writer 승격 보류 고정: 현재 coming-soon이고 result schema/API provenance가 없으므로 generic-only로 유지하며, 실제 status enum/match confidence/protected-species fields가 고정되기 전에는 학명 확정·보호종 여부·매칭 신뢰도 문장을 자동 생성하지 않도록 테스트와 문서에 반영 (`document-writing-supplementary-policy.ts`, `document-writing-source-registry.test.ts`, 2026-04-29)
- [x] `length-weight` Bio-Tools supplementary writer 추가: `LengthWeightResult` 타입 가드 후 회귀 방정식, a/b, b SE, R², 등성장 검정 t/p, N만 문장화하고 growthType 판정/유의성 판단/축·단위 해석은 자동 본문에서 제외 (`document-writing-bio-tool-writers.ts`, `document-writing-source-registry.ts`, 2026-04-29)
- [x] `permanova` Bio-Tools supplementary writer 추가: `PermanovaResult` 타입 가드 후 pseudo-F, p-value, R², permutations, SS 항목만 문장화하고 집단 차이 유의성/effect interpretation/group factor 의미 해석은 자동 본문에서 제외 (`document-writing-bio-tool-writers.ts`, `document-writing-source-registry.ts`, 2026-04-29)
- [x] `mantel-test` Bio-Tools supplementary writer 추가: `MantelResult` 타입 가드 후 Mantel r, p-value, permutations, method만 문장화하고 상관 강도/유의성/거리 행렬 간 생물학적 의미/인과 해석은 자동 본문에서 제외 (`document-writing-bio-tool-writers.ts`, `document-writing-source-registry.ts`, 2026-04-29)
- [x] Bio-Tools supplementary writer 리팩터링: Bio-Tools type guard/writer를 `document-writing-bio-tool-writers.ts`로 분리하고, registry dispatch contract, generic fallback, malformed snapshot 테스트는 그대로 유지했다. (`document-writing-bio-tool-writers.ts`, `document-writing-source-registry.ts`, 2026-04-29)
- [x] 자료 작성 개발 점검 메뉴 추가: Bio-Tools registry/policy 동기화, ready 도구 전용 writer 적용 여부, coming-soon 보수 처리, generic fallback 제약, 유전/서열 writer queue를 개발 환경 Papers 상단에서 확인하도록 하고, 중복 registry ID와 ready generic drift를 테스트로 감지 (`document-writing-development-checklist.ts`, `PaperWritingDevelopmentChecklist.tsx`, 2026-04-29)
- [x] 자료 작성 개발 점검 확장: Statistics method registry ↔ variable requirements ↔ Methods/Results scope 동기화, ProjectEntityKind ↔ resolver/generic-only ↔ tab metadata ↔ document writing source kind 동기화를 같은 개발 점검 모델에 추가하고, `translation-result`/`chat-session` 탭 메타 누락을 보강 (`document-writing-development-checklist.ts`, `entity-tab-registry.ts`, 2026-04-30)
- [x] Bio-Tools worker/API 반환 shape fixture 계약 추가: `types/bio-tools-results.ts` 기반 대표 fixture를 `BioToolHistoryEntry.results`와 document-writing source/type guard 경로에 통과시키고, fixture 누락·snake/kebab key·guard 실패를 개발 점검에서 감지하도록 연결 (`bio-tool-result-contract-fixtures.ts`, `bio-tool-result-contract-fixtures.test.ts`, `document-writing-development-checklist.ts`, 2026-04-30)
- [x] 자료 작성 source readiness UX 추가: `DocumentEditor` 원본 자료 영역에서 source별 자동 작성 가능/확인 필요/재조립 필요 상태와 보수적 자동화 설명을 표시하고, 판정 로직을 순수 함수로 분리해 테스트로 고정 (`document-writing-source-readiness.ts`, `DocumentEditor.tsx`, 2026-04-30)
- [x] 자료 작성 섹션 재생성 UX 추가: Methods/Results 섹션에서 `섹션 다시 생성`과 `본문 보존 갱신`을 분리하고, orchestrator에 section-level regeneration API와 수동 편집 보존 테스트를 추가 (`document-writing-orchestrator.ts`, `DocumentEditor.tsx`, 2026-04-30)
- [x] 자료 작성 섹션 재생성 UX 계약을 개발 점검에 추가: Methods/Results 범위, 본문 보존/본문 교체 모드 분리, 확인 다이얼로그와 진행 중 편집 보호를 `document-section-regeneration-contract.ts`와 개발 점검 테스트로 고정 (2026-04-30)
- [x] 자료 작성 전체 UX/Architecture agent 리뷰 1차 반영: source readiness stale 표시 누락을 수정하고, 섹션 재생성 지원 범위는 `DOCUMENT_SECTION_REGENERATION_SUPPORTED_SECTION_IDS`를 재사용하도록 정리 (2026-04-30)
- [x] 자료 작성 Hub 정보구조 재정렬: `작성 흐름` 단계 카드로 빈 문서/프로젝트 결과 조립/바이오·유전 결과 연결을 묶고, 외부 AI 입력 패키지와 개발 점검은 보조 영역으로 분리해 CTA 혼란을 줄임 (2026-04-30)
- [x] `DocumentEditor` source link 계산 1차 분리: active section source readiness/link 계산을 `useDocumentSourceLinks`로 추출하고, Bio-Tools/Genetics history 변경 시 supplementary source도 stale로 재계산되도록 회귀 테스트 추가 (2026-04-30)
- [x] `DocumentEditor` citation 로딩 1차 분리: citation 목록, stale reload 방지, pending reload 대기 ref를 `useDocumentCitations`로 추출하고 projectId 전환 방어를 hook 내부로 유지 (2026-04-30)
- [x] `DocumentEditor` 섹션 재생성 실행 로직 1차 분리: 본문 보존 갱신/본문 교체 재생성의 pending mode, 충돌·동시 편집 방어, toast 메시지 처리를 `useDocumentSectionRegeneration`으로 추출 (2026-04-30)
- [x] `DocumentEditor` artifact 렌더링 1차 분리: section table/figure 목록과 원본 열기 액션을 `DocumentArtifactLists` 컴포넌트로 추출해 에디터 본체 JSX 밀도를 낮춤 (2026-04-30)
- [x] `DocumentEditor` autosave 리팩터링 전 보호 테스트 추가: in-flight autosave 중 외부 저장 충돌 유지, debounce 전 unmount pending save flush를 회귀 테스트로 고정 (2026-04-30)
- [x] `DocumentArtifactLists` 디자인 polish: 기존 border/table cell 스타일을 Axiom Slate No-Line 원칙에 맞춰 surface tone 기반 표/그림 블록으로 전환했다. (2026-05-04)
- [x] `DocumentEditor` autosave 저장 큐 리팩터링: `useDocumentBlueprintSaveQueue`로 save queue/debounce/immediate save/conflict mark/clear/unmount flush를 분리하고, in-flight save가 충돌 상태를 덮지 못하도록 고정 (2026-04-30)
- [x] 자료 작성 revision history 1차 구현: autosave가 실수까지 저장할 수 있으므로 문서 snapshot을 IndexedDB에 보관하고, 복원 기록 패널에서 수동 저장 지점 생성과 문서 전체 복원을 제공한다. 재조립/섹션 재생성/export/복원 전 자동 snapshot을 남기고, 섹션 단위 비교·복원은 후속 단계로 둔다. (2026-04-30)
- [x] 자료 작성 큰 관점 리뷰 P1 반영: active editor `plateValue`만 최신인 문서도 export/reassemble/revision 직전 강제 serialize하고, `saveDocumentBlueprint`의 optimistic lock을 단일 readwrite transaction compare-and-put으로 변경. 복원-with-pending-autosave/복원-conflict/저장 conflict 회귀 테스트 추가 (2026-04-30)
- [x] 자료 작성 대표 E2E 확장 마무리: seeded 문서 진입 → source readiness 확인 → 본문 보존 갱신/섹션 재생성 차이 → HTML export → revision snapshot 확인 → autosave reload → 좁은 PC viewport smoke를 Playwright로 고정했다. E2E/agent 리뷰에서 드러난 자기 `draft` entity ref 재조립 오탐, 신규 project material stale 감지 누락, failed regeneration success toast, autosave `content`/`plateValue` 정합성 문제를 보강했고, focused Vitest/tsc/build/대표 Playwright 재통과까지 확인했다. (2026-04-30)
- [x] 자료 작성 autosave/reload 재발 방지 문서화: 정적 export 기반 Playwright, autosave 저장 완료 대기, Plate editor DOM 검증, 섹션 전환 전 flush 기준을 `stats/docs/technical/TROUBLESHOOTING_PAPERS_E2E_AUTOSAVE.md`에 정리하고 AGENTS.md에서 링크했다. (2026-04-30)
- [x] 자료 작성 revision history 후속 UX: native confirm 대신 변경 섹션 제목, 섹션 수, 저장 지점 미리보기를 보여주는 custom confirmation을 제공하고, 복원 후 before-restore rollback point가 보이는지 Playwright로 검증한다. (2026-05-04)
- [x] 자료 작성 심사/학위 수정 요청 대응 UX: revision snapshot을 기반으로 수정 요청 단위의 작업 메모, 대상 섹션, 변경 전후 비교, 완료/보류 상태를 추적하고, 특정 섹션만 이전 snapshot에서 복원하거나 현재 문서에 반영할 수 있게 한다. (`7044ffb2`, `0345cab3`, `3012a479`, 2026-05-04)
- [x] 자료 작성 심사/학위 수정 요청 작업대 1차: 문서 상단 `수정 요청` 패널에서 문서 전체/섹션별 피드백 메모를 등록하고, 요청 생성 시 현재 문서 기준 저장 지점을 자동 생성하며, 대기/수정 중/완료/보류 상태를 추적한다. 섹션 단위 diff/부분 복원은 후속 단계로 둔다. (2026-05-04)
- [x] 자료 작성 심사/학위 수정 요청 작업대 2차: 섹션 대상 요청에서 기준 저장 지점과 현재 섹션의 짧은 비교를 표시하고, 현재 문서 전체를 복원 전 저장 지점으로 남긴 뒤 해당 섹션만 기준 저장 지점 내용으로 복원할 수 있게 한다. (2026-05-04)
- [ ] 기존 논문 기반 유사 논문 파생 생성: 완성된 `DocumentBlueprint`를 템플릿/파생 원본으로 선택해 섹션 구조·문체·표/그림 배치 패턴은 재사용하되, sourceRefs와 evidence는 새 프로젝트 기준으로 재매핑/재조립하도록 한다. 복사된 해석 본문은 자동 확정하지 않고 사용자 검토 상태로 표시한다.
- [x] 자료 작성 revision retention 개선: 자동 저장 지점 반복이 사용자 수동 저장 지점을 밀어내지 않도록 manual revision을 보호하고, 자동 생성 revision만 최대 20개로 정리한다. (2026-05-04)
- [x] 자료 작성 export 안전성 개선: HTML export의 title/content/caption/table cell/provenance를 escape/sanitize하고, empty-but-reassemblable 문서와 HWPX/clipboard prepared-document export path를 테스트로 고정 (2026-04-30)
- [x] 자료 작성 export agent 리뷰 반영: `table.htmlContent`를 strict allowlist sanitizer로 제한하고, Markdown/HTML export 준비 실패가 toast 경로로 처리되도록 보강했으며, HWPX provenance fixture 경로를 workspace 하드코딩에서 패키지 기준 경로로 정리 (2026-04-30)
- [ ] 자료 작성 regeneration guard 테스트 확장: body-preserving refresh, destructive regeneration, conflict before persistLatestDocument, regenerateDocumentSection 이후 concurrent local edit 방어를 통합 테스트로 고정한다.
- [ ] 장기 SSOT 정리: `DOCUMENT_WRITING_ENTITY_KINDS`, source registry kind/type/writer/policy를 descriptor 기반으로 파생해 writer 추가/삭제 drift를 더 줄이고, source loading도 `DocumentEditor`/`useDocumentSourceLinks`/assembler/export provenance에 중복되지 않도록 공통 adapter로 모은다.

### 자료 작성 /papers 현재 정리 (2026-05-04)
- [x] `/papers` 반자동화 트랙 안정화 체크포인트: 문서 작성 세션, source readiness, 섹션 재생성, autosave save queue, revision history, 수정 요청 작업대, 섹션 단위 부분 복원, review request baseline retention을 한 흐름으로 정리했다. 최신 검증은 `3012a479` 커밋 기준 `tsc`, 전체 Vitest, 대표 Playwright E2E 통과.
- [ ] `/papers` 전체 UX/design polish pass: Papers Hub → DocumentEditor → 원본 자료 → 섹션 재생성 → 복원 기록 → 수정 요청 작업대 흐름을 사용자 관점에서 다시 훑고, Axiom Slate No-Line 원칙과 공통 컴포넌트 재사용 기준으로 중복/톤 불일치를 정리한다.
- [x] `/papers` 편집기 shell polish: DocumentEditor 상단 바, 좌우 패널, 섹션 목록, 재료 팔레트를 border 기반 구획에서 surface tone 기반 구획으로 정리했다. (2026-05-04)
- [ ] `/papers` 리팩터링 후보 점검: `DocumentEditor`에 남은 review request/revision action orchestration을 hook 또는 작은 component로 추가 분리할지 판단한다. 단, 기능 안정화가 우선이므로 실제 중복·테스트 비용이 확인될 때만 진행한다.
- [ ] 다음 대형 후보 선택 전 점검: prompt registry/cross-model review, 기존 논문 기반 파생 생성, Introduction/Discussion 자동화 중 어느 것을 먼저 할지 제품 위험도와 테스트 가능성 기준으로 결정한다.
