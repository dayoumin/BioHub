# BioHub ?듦퀎 UI/UX 怨좊룄??& 由ы뙥?곕쭅 ?붿뿬 ?묒뾽

## 0. Graph Studio / Papers follow-up (2026-04-12)
- [x] Graph Studio intentional gap 재검토: `encoding.color.scale`, `encoding.shape`, `encoding.size`, `scale.type=sqrt|symlog` 유지 여부와 renderer 지원 계획 정리 (defense-in-depth 유지 — 2026-04-14 재검토, 스키마 코멘트 추가)
- [x] Graph Studio save/restore/export 경계 최종 점검: route detach/reopen, snapshot last-good 유지, save 직후 외부 소비자 반영 흐름 E2E 확인 (`515a1bfb`, 2026-04-12)
- [x] Papers 문서 편집기 후속 보강: 문서 전환 직후 reassemble/export 타이밍 케이스와 citation 로딩 레이스 회귀 테스트 추가 (`a3d73407`, 2026-04-13)
- [x] PackageBuilder Step 2 자동 수집 후속 점검: same-tab entity/graph 변경 시 기존 item 재수집 정책과 사용자 수동 편집 충돌 여부 검토 (`a3d73407`, 2026-04-13)

### 자료 작성 플로우 재설계 점검 (2026-04-24)
- [ ] **목표 UX 확정**: 통계 / Graph Studio / Bio-Tools / 유전적 분석 결과 화면에서 `자료 작성` 클릭 시, 문서가 즉시 생성되고 `DocumentEditor`로 바로 진입하며 상단 또는 섹션 헤더에 `작성 중...` 상태가 보여야 한다.
- [ ] **현재 플로우 분리 문제 해소**: `ResultsActionStep`의 `결과 요약` 시트, `PapersHub`의 `새 문서`, `ReportComposer`, `PackageBuilder`가 서로 다른 작성 흐름으로 분리되어 있는 상태를 정리하고, 사용자 관점의 단일 진입 흐름을 정의한다.
- [ ] **1차 범위 고정**: 1차 구현은 통계 결과 + Graph Studio를 대상으로 하고, 문서 skeleton 생성 → 에디터 자동 진입 → section별 초안 반영 → 완료/실패 상태 표시까지를 MVP로 확정한다.
- [ ] **2차 범위 고정**: Bio-Tools와 유전적 분석(`blast/protein/seq-stats/similarity/phylogeny/bold/translation`)은 공통 `DocumentSourceBundle` 설계 후 확장한다. 1차 구현에 generic fallback만 얹고 전용 writer는 2차로 미룰지 결정한다.
- [ ] **세션 상태 모델 설계**: `idle -> collecting -> drafting -> patching -> done | failed` 수준의 문서 작성 job/state machine을 추가하고, `DocumentEditor`가 이를 구독해 상태를 노출하도록 한다.
- [ ] **문서 우선 생성 원칙 채택**: AI/템플릿 생성이 끝난 뒤 문서를 여는 방식이 아니라, 빈 `DocumentBlueprint`를 먼저 만들고 편집기로 이동한 뒤 초안을 patch하는 구조로 고정한다.
- [ ] **섹션 patch 계약 정의**: Methods / Results / Figure caption / Discussion 등 어떤 섹션이 자동 생성 대상인지, section별 overwrite 규칙과 `generatedBy: template | llm | user` 보존 정책을 명확히 한다.
- [ ] **기존 사용자 편집 보존**: 재실행 / 재조립 / 후속 결과 반영 시 사용자가 직접 수정한 문단, 표, figure link가 덮어써지지 않도록 section 단위 merge 계약과 conflict UX를 설계한다.
- [ ] **작성 중 UI 점검**: 전역 배너, section skeleton, 진행 단계 텍스트, 실패 시 retry CTA, 완료 후 상태 배지 등 작성 상태를 에디터 내에서 충분히 보여주는지 점검한다.
- [ ] **스트리밍 vs 배치 결정**: 초안을 문단 단위로 스트리밍할지, section 완성본 단위 patch로 반영할지 결정한다. 1차는 section 단위 patch가 구현 복잡도 대비 안전한지 검토한다.
- [ ] **통계 초안 생성기 역할 정리**: 현재 `generatePaperDraft()`는 템플릿 기반 즉시 생성 + `discussion: null` 구조이므로, 이를 문서 작성 파이프라인의 초기 writer로 재사용할지, 별도 writer adapter를 둘지 결정한다.
- [ ] **Graph Studio 연결 규칙 정리**: figure source, related analysis, pattern summary, chart image/export provenance가 문서 figure ref와 어떻게 연결되는지 정의하고, 그래프 수정 후 문서 갱신 정책도 정한다.
- [ ] **Bio-Tools 결과 정규화**: `bio-tool-result`가 현재는 summary 수준만 제공하므로, 도구별 결과 표/해석/그래프 메타를 문서 작성에 넘길 최소 contract를 정의한다.
- [ ] **유전적 분석 결과 정규화**: `blast-result` 외에 `protein-result`, `seq-stats-result`, `similarity-result`, `phylogeny-result`, `bold-result`, `translation-result`를 문서 작성용 구조화 데이터로 승격할지와 우선순위를 정한다.
- [ ] **프로젝트 문서 조립기 역할 재정의**: `DocumentAssemblyDialog`는 현재 프로젝트 결과를 조립하는 skeleton generator에 가깝다. AI 작성 세션의 entrypoint로 승격할지, 프로젝트 기반 bulk assembly 전용으로 유지할지 결정한다.
- [ ] **ReportComposer 역할 제한**: `ReportComposer`는 클립보드/HTML 내보내기용 빠른 요약 도구로 제한하고, 본격 문서 작성 UX와 혼동되지 않도록 라벨과 진입점을 재검토한다.
- [ ] **PackageBuilder 역할 제한**: `AI 패키지 조립`은 외부 LLM 입력 패키지 제작 워크플로우로 남기고, 일반 사용자의 즉시 자료 작성 흐름과 분리된다는 점을 UI/정보 구조에서 명확히 한다.
- [ ] **저장/히스토리 연동 점검**: 작성 도중 문서 autosave, 결과 히스토리 link, 문서 source usage, 프로젝트 entity ref 생성/삭제, 재접속 복원 경로를 end-to-end로 점검한다.
- [ ] **오류/복구 시나리오 점검**: source 누락, graph relink warning, draft generation 실패, 문서 conflict, partial section failure, history restore 후 재작성 같은 복구 시나리오를 명시적으로 설계한다.
- [ ] **테스트 전략 확정**: 최소 L1/L2 범위로 `문서 생성 직후 에디터 진입`, `작성 중 상태 표시`, `section patch 반영`, `user-edit 보존`, `graph/bio/genetics source 연결`, `failure + retry`를 회귀 테스트로 고정한다.
- [ ] **성공 기준 명문화**: 사용자가 어떤 결과 화면에서 시작하든 3초 내 편집기가 열리고, 작성 진행 상태를 볼 수 있으며, 초안이 눈앞에서 채워지고, 수동 편집이 안전하게 보존되는 것을 자료 작성 기능의 완료 기준으로 삼는다.

### 자료 작성 편집기 플랫폼 결정 기준 (2026-04-24)
- [ ] **기본 방침 고정**: 1차 자료 작성 재설계는 `Plate 유지`를 기본안으로 진행한다. 현재 `DocumentEditor`/`PlateEditor`/공용 editor UI/수식 요소/테스트가 이미 Plate 기반이므로, 편집기 교체보다 문서 상태 모델 통합을 우선한다.
- [ ] **Plate 유지 적합성 검증**: 다음 1차 요구를 Plate 위에서 해결 가능한지 확인한다. `문서 자동 진입`, `문서 레벨 작성 상태`, `section patch`, `표/수식 유지`, `user edit 보존`, `autosave + conflict 처리`.
- [ ] **문서 상태 모델 우선 원칙**: 편집기 엔진 부족으로 오해하지 않도록, 현재 핵심 문제를 `paperDraft`와 `DocumentBlueprint` 파이프라인 분리로 명시한다. 엔진 변경 없이 해결 가능한 범위를 먼저 닫는다.
- [ ] **Plate 유지 시 필수 점검**: `DocumentSection.generatedBy`, section별 patch 규칙, Plate value 직렬화/복원, markdown/html/docx export 정합성, equation/table node 보존, editor remount 없이 background patch 반영 가능 여부를 점검한다.
- [ ] **Plate 유지 시 UX 점검**: `작성 중...`, `반영 완료`, `실패`, `재시도` 상태를 에디터 헤더/섹션 수준에서 표현할 때 Plate selection/focus를 깨지 않는지 확인한다.
- [ ] **Plate 유지 시 테스트 점검**: `DocumentEditor.export-freshness.test.tsx` 기반으로 background patch, user edit 후 patch skip/merge, conflict, section reorder 없는 incremental update 회귀 테스트를 추가한다.
- [ ] **Tiptap 재평가 트리거 정의**: 아래 조건 중 2개 이상이 실제 요구로 들어오면 Tiptap 전환 검토를 다시 연다. `실시간 협업`, `댓글/제안 모드`, `강한 문서 schema 제약`, `Notion/Google Docs 급 장기 문서 제품화`, `HTML/Markdown/DOCX round-trip 정합성 강화`.
- [ ] **Tiptap 스파이크 범위 정의**: 재평가 시에는 전면 전환이 아니라 `Methods + Results + Table + Equation + background AI patch`만 포함한 최소 spike를 별도 브랜치에서 검증한다. 현 본선 구현과 섞지 않는다.
- [ ] **Lexical / ProseMirror 제외 근거 고정**: 현 단계에서는 `Lexical`은 low-level 구현 비용, `ProseMirror 직접 사용`은 프레임워크 구축 비용이 커서 채택 후보에서 제외한다. Plate 또는 Tiptap만 비교 대상으로 유지한다.
- [ ] **최종 성공 기준**: 편집기 플랫폼 결정의 성공 기준은 “자료 작성 1차 MVP를 가장 짧은 시간 안에 안정적으로 출시하는가”로 둔다. 미래 잠재력보다 현재 통합 비용과 제품 진행 속도를 우선한다.

### 자료 작성 1차 구현 명세 (Plate 유지안, 2026-04-24)
- [ ] 공통 모듈/공통 컴포넌트/registry 확장 전략 계획 문서: [`stats/docs/papers/PLAN-DOCUMENT-WRITING-ARCHITECTURE.md`](stats/docs/papers/PLAN-DOCUMENT-WRITING-ARCHITECTURE.md)
- [ ] agent 리뷰 반영 핵심 계약 정리: 상태/저장/동시성 계약, `DocumentSection` merge matrix, `NormalizedWritingSource`, `manualBlank/sourceBoundDraft` entry mode, Phase 0 테스트 게이트를 위 계획 문서 기준으로 고정
- [ ] **문헌 지원 1차 우선순위 고정**: `sectionSupportBindings` 기반 section-level literature binding, `citation / reference-package / deep-research-note` 역할 분리, `CSL/citeproc-js` 기반 인라인 인용/References 렌더링을 OpenAlex 연동보다 먼저 닫는다.
- [ ] **OpenAlex 연동 후순위 명시**: 회사에 이미 있는 OpenAlex 코드를 재사용하는 방향으로 가되, 1차에서는 직접 연동하지 않는다. 우선은 문헌 자산 저장/섹션 바인딩/인용 표시를 먼저 안정화하고, OpenAlex discovery 연동은 Phase 2.5 이후 별도 작업으로 둔다.
- [ ] **외부 연구 스택 활용 원칙 고정**: Zotero는 라이브러리 관리, `BibTeX/RIS/JSON import-export`는 1차 입력 경로, `GROBID` 계열 PDF 추출은 선택적 후속, OpenAlex는 후순위 discovery 계층으로 역할을 분리한다.
- [ ] 상태/저장/동시성 계약 문서: [`stats/docs/papers/PLAN-DOCUMENT-WRITING-STATE-CONTRACT.md`](stats/docs/papers/PLAN-DOCUMENT-WRITING-STATE-CONTRACT.md)
- [ ] `DocumentSection` merge matrix 문서: [`stats/docs/papers/PLAN-DOCUMENT-SECTION-MERGE-MATRIX.md`](stats/docs/papers/PLAN-DOCUMENT-SECTION-MERGE-MATRIX.md)
- [ ] **Step 1. 구현 명세 고정**: 1차 구현 범위를 `analysis + figure + blast/protein`, 진입점은 `ResultsActionStep + GraphStudioHeader`, 산출물은 `DocumentBlueprint`, 편집기는 `DocumentEditor(Plate)`로 고정한다.
- [ ] **Step 1-A. 변경 파일 목록 고정**
  - `stats/lib/research/document-blueprint-types.ts`
  - `stats/lib/research/document-blueprint-storage.ts`
  - `stats/components/papers/DocumentEditor.tsx`
  - `stats/components/analysis/steps/ResultsActionStep.tsx`
  - `stats/components/graph-studio/GraphStudioHeader.tsx`
  - `stats/lib/research/document-assembler.ts`
  - `stats/__tests__/components/papers/DocumentEditor.export-freshness.test.tsx`
  - 신규 최소 테스트 2~3개
- [ ] **Step 1-B. 1차 비포함 범위 명시**: 실시간 협업, 댓글/제안모드, 완전한 bio-tools writer, seq-stats/similarity/phylogeny/bold/translation 전용 writer, Tiptap 전환 spike는 1차 구현에서 제외한다.
- [ ] **Step 2. 문서 상태 모델 확정**: `DocumentBlueprint`에 문서 레벨 작성 상태와 섹션 레벨 상태를 추가한다. 최소 후보: `writingState`, `writingJob`, `sectionStatuses`.
- [ ] **Step 2-A. 상태 전이 정의**: 문서 레벨은 `idle -> collecting -> drafting -> patching -> completed | failed`, 섹션 레벨은 `idle -> drafting -> patched | skipped | failed`로 고정한다.
- [ ] **Step 2-B. 저장 계약 정의**: 작성 상태도 문서 본문과 함께 IndexedDB에 저장하고, `loadDocumentBlueprint()` 시 normalize default를 적용한다. cross-tab 이벤트는 기존 `saved` 이벤트를 재사용한다.
- [ ] **Step 2-C. 충돌 정책 정의**: `updatedAt` 기반 optimistic conflict는 유지하되, 1차에서는 문서 전체 conflict만 처리하고 섹션별 충돌 병합은 하지 않는다.
- [ ] **Step 3. 진입점 통합 설계**
  - `ResultsActionStep`: 기존 `결과 요약` CTA를 `문서에서 작성` 시작점으로 승격할지 결정
  - `GraphStudioHeader`: 기존 문서 링크 옆에 `자료 작성` CTA 추가
  - `/papers`: 문서 허브 역할 유지, 결과/그래프에서 직접 생성된 문서를 열 수 있어야 함
- [ ] **Step 3-A. 생성 경로 정의**: 클릭 즉시 빈 `DocumentBlueprint`를 만들고 `?doc=`로 이동한 뒤 background drafting을 시작한다.
- [ ] **Step 3-B. source binding 정의**: 통계는 `historyId`, 그래프는 `graph project id`를 문서 source/provenance에 즉시 연결한다.
- [ ] **Step 4. section patch / merge 정책 확정**
  - patch 단위는 `DocumentSection`
  - 1차는 `Methods`, `Results`, `Figure caption/figures`만 자동 patch
  - `Discussion`은 보류 또는 placeholder
- [ ] **Step 4-A. user edit 보존 정책**: 사용자가 손댄 섹션은 1차에서 본문 patch를 skip하고, structured sidecar(`tables`, `figures`, `sourceRefs`)만 보수적으로 병합한다.
- [ ] **Step 4-B. patch 적용 규칙**: 섹션 상태가 `patched`여도 신규 결과가 오면 같은 job 내 재patch는 허용하고, 다른 job이면 명시적 재작성 액션 전까지 자동 재patch하지 않는다.
- [ ] **Step 4-C. 실패 규칙**: 일부 섹션 실패는 문서 전체 실패로 올리지 않고 `sectionStatuses[sectionId].status='failed'` + 문서 레벨 `patching` 또는 `failed`로 노출한다.
- [ ] **Step 5. 테스트 명세 확정**
  - 결과 화면에서 문서 생성 후 에디터 진입
  - 문서 레벨 `작성 중` 상태 표시
  - 섹션 patch 반영 후 상태 전이
  - user edit 있는 섹션 patch skip
  - background patch 중 conflict / retry
- [ ] **Step 5-A. 최소 구현 테스트 세트**
  - `DocumentEditor` 상태 배지/patch 회귀
  - `document-blueprint-types` normalize/unit 테스트
  - 진입점 helper 또는 생성 workflow 테스트 1건
- [ ] **Step 6. 1차 구현 순서**
  1. 타입/normalize/storage 스캐폴딩
  2. `DocumentEditor` 상태 UI
  3. 문서 생성 helper
  4. `ResultsActionStep` 진입 연결
  5. `GraphStudioHeader` 진입 연결
  6. background patch + 테스트

### 자료 작성 품질/투고 점검 계획 (2026-04-25)
- [x] **계획 문서 반영 완료**: 초안 생성 후 품질 점검과 투고 준비도 기능 방향을 [`stats/docs/papers/PLAN-DOCUMENT-WRITING-ARCHITECTURE.md`](stats/docs/papers/PLAN-DOCUMENT-WRITING-ARCHITECTURE.md)의 `Review / Preflight Layer`와 `Phase 2.75`로 정리했다. (2026-04-25)
- [x] **agent 점검 반영 완료**: 제품/UX, 아키텍처/데이터 모델, 테스트/리스크 관점 리뷰를 반영해 Phase 2.75 MVP 범위, freshness, evidence index, sidecar storage, 테스트 matrix 보강 방향을 계획 문서에 추가했다. (2026-04-25)
- [x] **Phase 2.75 MVP 범위 고정**: 1차는 `내보내기 전 기술/근거 점검`으로 좁힌다. 포함: 수치 불일치, 표/그림 본문 호출 누락, caption 누락, 필수 statement 누락, reference/citation consistency, stale report 감지. 제외: journal fit 추천, 실제 submission tracking. Gate 5~6에서 preflight panel/export warning/report sidecar까지 구현했고, Gate 7 agent 점검으로 journal fit/submission tracking은 후속으로 유지한다. (2026-04-25)
- [x] **제품 원칙 고정**: "투고 성공률", "합격 가능성", "acceptance probability", 단일 점수, 확률, 저널 1위 추천처럼 보이는 표현을 금지한다. UI는 `투고 전 체크리스트`, `저널 요구사항 대조`, `연구 범위 일치 신호` 중심으로 표현한다. `submission-readiness-terminology.ts`와 회귀 테스트로 금지/권장 표현 1차 가드를 추가했다. (2026-04-25)
- [ ] **경쟁/참고 도구 기준 반영**: Paperpal Preflight(technical compliance), Writefull(편집기 내 학술 문체 교정), Trinka Journal Finder(scope match), Elsevier/Wiley Journal Finder(title/abstract matching)를 참고하되, BioHub 1차 범위는 source-bound pre-export check로 제한한다.
- [ ] **Review/Preflight sidecar 저장 계약 설계**: `DocumentQualityReport`, `DocumentReviewFinding`, `DocumentReviewJobState`, `SubmissionReadinessReport`를 `DocumentBlueprint` 본문과 분리된 sidecar로 저장한다. 후보 store: `document-review-jobs`, `document-quality-reports`, `target-journal-profiles`, `submission-attempts`.
- [ ] **freshness/stale 계약 설계**: report에 `baseDocumentUpdatedAt`, `documentContentHash`, `sectionHashes`, `sourceSnapshotHashes`, `targetJournalProfileVersion`, `ruleEngineVersion`을 저장하고, 문서/source/profile/rule version이 바뀌면 기존 report를 `stale`로 표시한다.
- [ ] **review job lifecycle 설계**: `idle | running | partial | completed | stale | failed` 상태, `jobId`, retry, late job overwrite 방지, deterministic rule 성공 + LLM 실패 시 partial report 보존을 정의한다.
- [ ] **투고 기준 프로필 설계**: `TargetJournalProfile`에 target journal, article type, abstract/main text word limit, reference style, figure/table format, ethics/COI/funding/data availability 요구사항을 담는다. 1차는 manual profile + APA/IMRAD/KCI/general preset으로 시작한다.
- [ ] **SubmissionAttempt 경계 설계**: 실제 제출 로그는 live profile 참조가 아니라 `profileSnapshot`, `readinessReportId`, `exportArtifactId/hash`, `submittedAt`, `statusHistory`, `decisionNote`를 저장한다.
- [ ] **초안 자체 점검 rule engine 설계**: IMRAD 흐름, 섹션 누락, 빈 문단, 반복/모순, figure/table 본문 호출 누락, caption 누락, 참고문헌 미사용/미인용, disclosure 누락을 deterministic check로 정의하고 rule id를 고정한다.
- [ ] **SourceEvidenceIndex 설계**: source-bound 검증을 free-text 파싱에만 의존하지 않도록 `SourceEvidenceIndex` 또는 `DocumentClaimEvidence`를 정의한다. 후보 필드: `metricId`, `sourceId`, `resultPath`, `statisticKind`, `value`, `formattedValue`, `tolerance`, `tableCellRef`, `figureRef`, `sectionId`.
- [ ] **BioHub 고유 source-bound 검증 설계**: 본문에 등장한 `p`, `F`, `t`, `chi2`, `n`, 평균/SD, 표/그림 번호를 source analysis, `DocumentTable`, `FigureRef`, Graph Studio provenance와 대조한다. `확인 불가` 등급과 반올림/부등호/locale 허용 규칙을 포함한다.
- [ ] **LLM 리뷰 범위 제한 + sanitizer 설계**: LLM은 전체 흐름, 문체, 논리 점프, 과잉 주장, 오탈자 suggestion만 담당한다. LLM finding이 `content`, `plateValue`, source-bound statistic, citation/reference patch를 직접 바꾸려 하면 drop/flag한다.
- [ ] **DocumentEditor 점검 패널 UX 설계**: `통과 / 주의 / 수정 필요 / 확인 불가` finding list, stale/partial/failed 상태, source mismatch warning, export 전 preflight report CTA를 에디터 안에 배치한다.
- [ ] **Review/Preflight UI/UX 정보 구조 설계**: 작성 상태와 점검 상태를 분리하고, 점검 패널은 편집을 방해하지 않는 side panel 또는 inspector 형태로 검토한다. export 영역에는 최신 preflight 상태와 unresolved blocker만 요약한다.
- [ ] **Review/Preflight UI 상태 모델 설계**: `검사 전`, `검사 중`, `검사 완료`, `부분 완료`, `검사 실패`, `오래된 결과`, `원본 변경됨`, `확인 불가`, `무시됨` 상태와 각각의 badge/CTA/empty state를 정의한다.
- [ ] **Finding 탐색 UX 설계**: severity, category, section, source availability 기준 filter/sort를 정의하고, finding 선택 시 해당 섹션/문장/표/그림으로 이동하며 원본 evidence와 비교값을 함께 보여주는 흐름을 설계한다.
- [x] **Finding 섹션 이동 1차 구현**: `DocumentPreflightPanel`의 section-level finding을 클릭하면 `DocumentEditor` active section으로 이동한다. document-level finding은 `문서 전체`로 표시하고 이동하지 않으며, stale report가 삭제된 sectionId를 들고 있어도 active section을 바꾸지 않도록 방어했다. (`DocumentPreflightPanel.tsx`, `DocumentEditor.tsx`, 관련 테스트, 2026-04-25)
- [x] **Finding 상태 액션 1차 구현**: finding list를 open/ignored/resolved 상태가 보이는 inspector 항목으로 확장하고, fresh report에서 `무시`/`다시 열기`를 저장소에 반영한다. 상태 변경은 `DocumentQualityReport` sidecar 안에서 finding/report `updatedAt`과 summary를 재계산하며, stale/pending/conflict 상태에서는 액션을 비활성화한다. (`document-quality-types.ts`, `document-quality-storage.ts`, `DocumentPreflightPanel.tsx`, `DocumentEditor.tsx`, 관련 테스트, 2026-04-25)
- [x] **Finding evidence 요약 1차 구현**: finding 항목 안에 read-only compact evidence 요약을 추가했다. `label`, `sourceKind/sourceId`, `observedValue`, `expectedValue`를 방어적으로 표시하고, 우측 rail 과밀화를 막기 위해 기본 2개까지만 노출한다. stale/ignored finding에서도 evidence는 보이지만 상태 액션 비활성화 규칙은 유지한다. (`DocumentPreflightPanel.tsx`, 관련 테스트, 2026-04-25)
- [x] **Finding 상태 필터 1차 구현**: preflight 패널에 `전체/열림/무시됨/해결됨` 상태 필터를 추가해 ignored/resolved 항목을 숨기지 않으면서 필요한 상태만 빠르게 볼 수 있게 했다. 필터가 비어 있으면 empty state를 보여주고, 상단 summary count는 전체 report 기준으로 유지한다. (`DocumentPreflightPanel.tsx`, 관련 테스트, 2026-04-25)
- [x] **Finding evidence 원본 이동 1차 구현**: evidence row에 열 수 있는 원본(`analysis`, `figure`, supported project entity, supplementary fallback)만 `원본` 버튼을 표시하고, `DocumentEditor`에서 기존 source navigation URL로 이동시킨다. `document-artifact`, citation/reference/deep-research/unknown source는 버튼을 숨겨 잘못된 외부 이동을 막는다. (`DocumentPreflightPanel.tsx`, `DocumentEditor.tsx`, 관련 테스트, 2026-04-25)
- [x] **Finding observed/expected 비교 UI 1차 구현**: evidence에 `observedValue`/`expectedValue`가 있으면 `비교` 블록으로 관찰/기대 값을 나눠 보여주고, 정규화 기준 `일치/불일치/확인 필요` 상태를 표시한다. 자동 수정/patch 적용과는 분리해 AI 초안 오류 판단용 read-only UI로 제한한다. (`DocumentPreflightPanel.tsx`, 관련 테스트, 2026-04-25)
- [ ] **finding 액션 설계**: `섹션으로 이동`, `원본 보기`, `차이 비교`, `선택 적용`, `무시/사유 기록`, `재검사`, `보고서 다운로드`, `위험 확인 후 export` 액션을 정의한다.
- [ ] **Finding 수정/무시 UX 설계**: bulk apply보다 finding 단위 선택 적용을 기본으로 하고, 사용자가 직접 수정한 finding은 stale 또는 needs-recheck로 표시한다. 무시 사유는 export report에 포함할 수 있게 한다.
- [ ] **export preflight gating 설계**: 최신 report가 없거나 stale이면 재검사 CTA를 우선 노출한다. critical mismatch가 있으면 경고와 명시적 확인 후 export를 허용하고, report 생성 실패 시 fallback UX를 정의한다.
- [x] **Export 전 점검 UX 설계**: export를 기본적으로 막지는 않되 critical finding/stale report가 있으면 확인 단계를 둔다. preflight report는 점수보다 남은 위험과 확인 불가 항목을 요약한다. Gate 6에서 export bar warning/confirm/report sidecar로 구현했다. (2026-04-25)
- [x] **금지/권장 UI copy 설계**: `합격 가능성`, `투고 성공률`, `저널 추천 1위` 같은 금지 표현과 `투고 전 체크리스트`, `저널 요구사항 대조`, `연구 범위 일치 신호` 같은 권장 표현을 terminology에 고정한다. (`submission-readiness-terminology.ts`, 2026-04-25)
- [x] **저널 적합도/투고 추적 후속 범위**: OpenAlex 기반 유사 논문/저널 후보는 Phase 2.5 이후 discovery 계층과 연결하고, 실제 투고 상태는 `SubmissionAttempt` log로 submitted/under review/revision/accepted/rejected를 기록한다. Phase 2.75 MVP에는 넣지 않는다. Gate 7 agent 점검 결과, 지금은 `TargetJournalProfile`/`SubmissionAttempt` 타입·store·ProjectEntityKind를 추가하지 않고 문서 경계와 terminology guard만 유지한다. (2026-04-25)
- [ ] **L1 테스트 matrix 추가**: deterministic rule engine golden fixtures, source-bound numeric/provenance mismatch fixtures, LLM finding sanitizer, review job freshness/stale/retry/partial failure, export preflight service를 순수 함수/서비스 테스트로 고정한다.
- [ ] **L2 테스트 matrix 추가**: `DocumentEditor` 점검 패널 finding list, stale warning, retry, user edit 보존, `DocumentExportBar` preflight CTA/report/stale warning/critical confirm을 data-testid 중심으로 검증한다.
- [ ] **L3 테스트 matrix 추가**: 결과 문서 생성 → 사용자 수정 → review retry → export preflight 흐름의 happy path와 critical mismatch path 각 1개만 유지한다.
- [x] **금지 문구 회귀 테스트 추가**: `투고 성공률`, `합격 가능성`, `acceptance probability` 같은 금지 표현이 readiness/scope fit UI에 노출되지 않도록 terminology 문자열 assertion을 추가했다. readiness/scope fit UI가 실제로 생기면 같은 helper를 UI 문자열 테스트에 연결한다. (2026-04-25)
- [ ] **단계별 agent gate 진행 원칙 고정**: Review/Preflight는 논문 초안 작성 후반 품질 게이트이므로 `구현 전 agent 계획 점검 → 구현 → 1차 로컬 검토 → agent 리뷰 → 문서/TODO 갱신 → 다음 단계` 루프로 진행한다.
- [x] **Gate 1. 작성 파이프라인 안정화 점검**: `DocumentBlueprint`, writing job/state, section patch, user edit 보존을 먼저 닫고, 아키텍처/동시성/UX agent 점검을 받았다. Gate 1-1~1-4 후속까지 반영 완료. (2026-04-25)
- [x] **Gate 1-1. 섹션 단위 직접 편집/중단 계약 구현**: 직접 편집 또는 `이 섹션 중단`은 현재 섹션만 `skipped`/`generatedBy: user`로 보호하고 같은 job의 다른 drafting 섹션은 계속 작성되도록 수정했다. 빈 skipped 섹션이 background patch 또는 retry로 다시 채워지는 race도 차단했다. (`DocumentEditor.tsx`, `SectionWritingBanner.tsx`, `document-writing-orchestrator.ts`, `document-writing-session.ts`, 관련 테스트, 2026-04-25)
- [x] **Gate 1-2. active section background patch 표시**: 현재 보고 있는 섹션에 외부 저장/background patch가 도착하면 로컬 미저장 변경이 없을 때 Plate editor를 최신 snapshot으로 갱신한다. programmatic `setValue`가 사용자 편집/섹션 중단으로 오인되지 않도록 guard를 추가했다. (`DocumentEditor.tsx`, freshness 테스트, 2026-04-25)
- [x] **Gate 1-3. 부분 실패/부분 완료 상태 모델 정리**: 별도 persisted `partial` status는 추가하지 않고 `sectionStates`에서 header summary를 파생한다. `completed` 안에 `patched/skipped/failed`가 섞이면 `일부 반영`, `일부 실패`로 요약한다. (`DocumentEditor.tsx`, freshness 테스트, 2026-04-25)
- [x] **Gate 1-4. 섹션 목록 작성 상태 표시**: `DocumentSectionList`에 `drafting/patched/skipped/failed` 칩과 실패/보존 상태를 노출해 비활성 섹션 상태를 발견 가능하게 만들었다. (`DocumentSectionList.tsx`, 컴포넌트 테스트, 2026-04-25)
- [x] **Gate 2. Review/Preflight 기반 계약 점검**: `DocumentQualityReport`, `DocumentReviewFinding`, stale/freshness, sidecar IndexedDB store 계약을 agent 점검 후 1차 구현했다. 문서 snapshot hash, source/journal/rule version freshness, summary 정규화, report CRUD/list/latest, finding identity/range guard를 L1 테스트로 고정했다. (`document-quality-types.ts`, `document-quality-storage.ts`, `indexeddb-adapter.ts`, 관련 테스트, 2026-04-25)
- [x] **Gate 3. Source evidence 점검**: `SourceEvidenceIndex`와 `DocumentClaimEvidence` 1차 모델을 추가하고, `DocumentBlueprint`에서 section source, table, figure, included support binding evidence를 순수 파생한다. stable key와 content hash를 분리하고, source kind/id lookup, duplicate key 방지, legacy sourceRef normalization, citation lineage 포함을 L1 테스트로 고정했다. (`document-source-evidence.ts`, 관련 테스트, 2026-04-25)
- [x] **Gate 4. deterministic preflight 점검**: LLM 없이 실행되는 1차 preflight rule runner를 추가했다. table/figure caption 누락, table source 누락, support source/citation 이상, source evidence 없음 규칙을 `DocumentQualityReport` finding으로 변환하고, 외부 `SourceEvidenceIndex` mismatch guard, deterministic finding id, artifact evidence, snapshot/summary 계약을 L1 테스트로 고정했다. (`document-preflight-rules.ts`, `document-source-evidence.ts`, 관련 테스트, 2026-04-25)
- [x] **Gate 5. DocumentEditor UI/UX 점검**: `DocumentPreflightPanel`을 우측 inspector rail 상단에 추가하고, 문서 점검 실행 → deterministic preflight runner → report 저장 → freshness/summary/finding 표시 흐름을 연결했다. stale/missing/fresh 상태, open finding 전체 스크롤 목록, 충돌 중 실행 비활성화, MaterialPalette와의 정보 구조 배치를 agent 점검으로 정리했으며, panel 단위 테스트와 `DocumentEditor` 통합 테스트로 고정했다. (2026-04-25)
- [x] **Gate 6. export preflight 점검**: `DocumentExportBar`에 preflight 상태 요약을 추가하고 `DocumentEditor`의 최신 report/freshness/run 상태를 전달한다. missing/stale report는 export 전 확인을 요구하고 재점검 CTA를 제공하며, fresh report라도 unresolved critical finding이 있으면 명시 확인 후 export하도록 했다. 점검 report는 원고 본문에 섞지 않고 sidecar JSON(`*_preflight-report.json`)으로 저장하는 UX를 추가했으며, export bar 단위 테스트와 `DocumentEditor` 통합 테스트로 회귀를 고정했다. (2026-04-25)
- [x] **Gate 7. journal fit / submission tracking 후속 점검**: OpenAlex 기반 scope signal과 `SubmissionAttempt` log를 제품 표현/오해 방지/데이터 경계 관점으로 agent 점검했다. 결론: OpenAlex는 discovery 메타데이터로만 사용하고 acceptance prediction/단일 점수/저널 1위 추천 표현은 금지한다. `SubmissionAttempt` store와 `TargetJournalProfile` 정식 타입은 export artifact/hash와 manual profile UX가 생긴 뒤 추가하며, 현재는 terminology guard와 TODO 경계만 유지한다. (2026-04-25)

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
