# 자료 작성 아키텍처 계획

작성일: 2026-04-24  
범위: 논문/보고서/기술노트 등 자료 작성 기능 전반의 공통 모듈, 공통 컴포넌트, 확장 전략

## 1. 목적

자료 작성 기능은 앞으로 문서 종류, 분석 도메인, 결과 타입이 계속 바뀔 가능성이 높다.  
따라서 특정 분석 화면이나 특정 논문 형식에 맞춘 구현보다, 다음 두 가지를 먼저 고정해야 한다.

1. 변하는 도메인 결과를 문서 작성 파이프라인에 연결하는 공통 계약
2. 문서 작성 상태, 편집, patch, export를 처리하는 공통 플랫폼

핵심 원칙은 다음과 같다.

1. 새 분석 도구가 들어와도 `DocumentEditor`와 문서 상태 모델은 최대한 그대로 유지한다.
2. 새 논문 종류가 들어와도 writer registry와 preset registry 확장만으로 대응한다.
3. 특정 도메인 제거 시에도 adapter/writer만 제거하고 문서 코어는 흔들지 않는다.

## 2. 목표 상태

사용자 흐름은 어떤 결과 타입에서 시작하든 동일해야 한다.

1. 결과 화면 또는 프로젝트 허브에서 `자료 작성` 시작
2. 빈 `DocumentBlueprint` 생성
3. 에디터 즉시 진입
4. `writingState`에 따라 `collecting/drafting/patching/completed/failed` 표시
5. 섹션별 writer가 초안을 patch
6. 사용자가 직접 수정
7. export는 별도 계층에서 처리

즉, “문서를 만드는 기능”과 “도메인 결과를 문서에 연결하는 기능”을 분리해야 한다.

## 2.1 Agent 리뷰 반영 핵심 결론

agent 검토 결과, 현재 계획의 큰 방향은 맞지만 registry 추출보다 먼저 잠가야 할 계약이 더 중요하다는 점이 확인되었다.

우선 확정해야 할 항목은 다음과 같다.

1. `DocumentBlueprint` 저장/충돌/동시성 계약
2. `DocumentSection` 필드별 merge matrix
3. adapter와 writer 사이의 정규화 중간 모델
4. `manualBlank`와 `sourceBoundDraft`의 모드 분리
5. registry 추출 전 behavior baseline 테스트 게이트

즉, 지금의 우선순위는 “구조 분리”보다 “행동 계약 고정”이다.

## 3. 아키텍처 원칙

### 3.1 변하지 않아야 하는 코어

아래는 도메인 변경과 무관하게 유지해야 하는 공통 코어다.

1. `DocumentBlueprint`
2. `DocumentSection`
3. `writingState`
4. `sourceRefs`
5. section patch / merge 규칙
6. editor 상태 UI

이 계층은 통계, 그래프, bio-tools, genetics, 향후 신규 분석 종류를 알지 않아야 한다.

### 3.2 자주 변하는 도메인 계층

아래는 변동 가능성이 큰 영역이다.

1. 결과 타입별 저장 구조
2. 결과 타입별 요약/해석 방식
3. 논문 종류별 section 구성
4. 결과 타입별 methods/results/caption writer
5. 문헌 초록 / 참고문헌 패키지 / 딥리서치 메모 같은 narrative support 자산

이 계층은 registry + adapter + writer 구조로 흡수해야 한다.

## 4. 공통 모듈 계획

### 4.1 Document Core

역할:

1. 문서 타입과 section 타입 정의
2. writing state / section state 정의
3. normalize / storage / conflict 처리
4. source usage 추적

후보 파일:

1. `stats/lib/research/document-blueprint-types.ts`
2. `stats/lib/research/document-blueprint-storage.ts`
3. `stats/lib/research/document-writing.ts`

규칙:

1. 새 도메인 결과 추가 시 core 타입 수정은 최소화한다.
2. `DocumentSourceRef.kind`는 꼭 필요한 경우에만 늘린다.
3. 사용자 편집 보존 규칙은 core helper에 둔다.

추가 결정 필요:

1. `writingState` 갱신과 사용자 본문 편집이 같은 conflict domain을 공유하는지
2. background drafting job과 editor autosave가 어떤 우선순위로 충돌을 해결하는지
3. cross-tab 동작을 best-effort로 둘지, persisted lease/owner 모델까지 둘지
4. `sourceRefs`가 provenance 모델인지 writer hint인지, 또는 둘 다인지

권장 방침:

1. `DocumentBlueprint` 단위 저장은 유지하되, 동시성 계약을 문서로 먼저 고정한다.
2. `jobId`는 persisted state와 in-memory guard의 역할을 분리해서 정의한다.
3. `writingState` 전이는 허용 상태 전이표로 명시한다.

### 4.2 Writing Session

역할:

1. 결과 화면/프로젝트 허브/`/papers`에서 공통 진입점 제공
2. 빈 문서 생성
3. source binding 연결
4. 문서 생성 실패 조건 검증

후보 파일:

1. `stats/lib/research/document-writing-session.ts`

필수 요구:

1. `startWritingSession(...)` 수준의 단일 진입 API 유지
2. 진입 컴포넌트는 직접 source binding 로직을 갖지 않음
3. source가 실제로 연결되지 않으면 빈 drafting 문서를 만들지 않음
4. `/literature` 또는 외부 문헌 지원 화면으로 이동하더라도 project / document / target section 맥락을 잃지 않음

추가 결정:

1. `manualBlank`: 사용자가 직접 빈 문서를 여는 모드
2. `sourceBoundDraft`: 결과 source를 바인딩해 자동 작성 세션을 여는 모드
3. `retry`: 기존 source binding을 유지한 채 writing job만 다시 시작하는 모드

위 세 모드는 이름과 invariant를 분리해서 관리한다.

### 4.3 Source Adapter Layer

역할:

1. 통계/그래프/bio/genetics 결과를 공통 문서 입력 구조로 변환
2. 결과 저장소 차이를 editor/orchestrator로 누수시키지 않음

권장 구조:

1. `DocumentSourceAdapterRegistry`
2. `supports(ref)`
3. `load(ref, ctx)`
4. `summarize(source)`

중간 정규화 모델:

registry 분리 전에 `NormalizedWritingSource` 계약을 먼저 고정한다.

필수 필드 예시:

1. `sourceId`
2. `sourceType`
3. `entityKind`
4. `title`
5. `provenance`
6. `capabilities`
7. `artifacts`

`capabilities` 예시:

1. `canWriteMethods`
2. `canWriteResults`
3. `canWriteCaptions`
4. `canWriteSupplement`

### 4.3.1 Narrative Support Asset Layer

문헌 지원은 기존 `analysis/figure`와 같은 source binding 계층에 억지로 섞지 않고, 별도의 narrative support 계층으로 다룬다.

구분 원칙:

1. `artifact lineage`: 분석 / 그래프 / 기존 supplementary처럼 표, 그림, 수치, 방법 결과를 재조립 가능한 구조화 산출물
2. `narrative support`: citation / reference-package / deep-research-note처럼 주장 근거, 배경 설명, 비교 문헌, 해석 메모를 제공하는 서술 지원 자산

권장 자산 종류:

1. `citation-record`
2. `reference-package`
3. `deep-research-note`

권장 이유:

1. 현재 `CitationRecord`는 프로젝트 단위 snapshot 저장소로는 충분하지만 “어느 section에서 왜 쓰는가”를 담지 못한다.
2. `sourceRefs`는 provenance와 writer hint를 함께 책임지고 있어, literature까지 같은 배열에 섞으면 analysis/figure 추적성이 흐려진다.
3. 서론/고찰/결론은 결과 재조립보다 사용자가 큐레이션한 support binding이 더 중요하다.

권장 계약:

`DocumentSection.sourceRefs`는 그대로 유지하고, 문헌/딥리서치는 병렬 필드로 관리한다.

예시:

1. `sectionSupportBindings[]`
2. `sectionId`
3. `sourceKind: citation | reference-package | deep-research-note`
4. `sourceId`
5. `role: background | method-rationale | method-reference | comparison | interpretation | limitation | implication | takeaway`
6. `summary`
7. `excerpt`
8. `citationIds`
9. `linkedAnalysisIds`
10. `linkedFigureIds`
11. `included`

규칙:

1. `sourceRefs`는 artifact lineage 중심으로 유지한다.
2. `sectionSupportBindings`는 section intent를 명시적으로 가진다.
3. user가 연결한 support binding은 reassemble 시 자동으로 재배치하거나 삭제하지 않는다.
4. deep-research-note는 가능하면 citation lineage를 함께 가져야 한다.
5. `sectionSupportBindings`는 `DocumentSection` merge matrix의 정식 필드로 포함한다.
6. 저장 단위는 `DocumentBlueprint.sections[n].sectionSupportBindings[]`를 기본으로 하며, section ownership과 동일한 conflict domain에서 다룬다.

`artifacts` 예시:

1. `analysisDraft`
2. `resultNarrative`
3. `tables`
4. `figures`
5. `metrics`
6. `attachments`

확장 전략:

1. 새 결과 타입 추가 시 adapter 1개 추가
2. 기존 editor/orchestrator 수정은 최소화

원칙:

1. adapter는 storage 차이를 흡수한다.
2. writer는 raw storage를 직접 읽지 않고 `NormalizedWritingSource`만 받는다.
3. `unknown` fallback는 마지막 방어선으로만 허용한다.

### 4.4 Section Writer Registry

역할:

1. section별 초안 생성
2. 결과 타입별 문장/표/caption 생성
3. fallback writer 제공

권장 구조:

1. `DocumentSectionWriterRegistry`
2. `supports(section, source)`
3. `write(context)`
4. `priority`

writer 선택 기준:

`sourceKinds`만으로 고르지 않고, `NormalizedWritingSource.sourceType`, `capabilities`, `artifacts`를 기준으로 선택한다.

writer 결과 계약 예시:

1. `bodyPatch`
2. `tables`
3. `figures`
4. `sourceRefs`
5. `supportBindings`
6. `status: patched | skipped | failed`
7. `message`

writer 종류 예시:

1. `analysis-methods-writer`
2. `analysis-results-writer`
3. `figure-caption-writer`
4. `blast-results-writer`
5. `protein-results-writer`
6. `supplementary-fallback-writer`
7. `literature-introduction-writer`
8. `literature-method-rationale-writer`
9. `literature-discussion-writer`
10. `literature-conclusion-writer`
11. `deep-research-note-writer`

규칙:

1. orchestrator는 writer를 선택하고 patch만 수행
2. writer 내부에서 storage 직접 접근 금지에 가깝게 제한
3. writer 실패가 전체 문서를 망치지 않도록 source 단위 skip 허용
4. source 단위 결과를 집계해 section 상태를 `complete / partial / failed` 수준으로 해석 가능하게 한다
5. `methods/results`는 analysis/figure 우선, literature는 보강 역할로 제한한다.
6. `introduction/discussion/conclusion`은 support binding이 없으면 빈 section으로 두되, writer가 임의 창작으로 채우지 않는다.
7. literature/deep-research writer는 자신이 사용한 `supportBindings` lineage를 결과에 함께 남겨야 한다.

support binding 트리거 원칙:

1. 1차 범위에서는 `support binding`만으로 새로운 `sourceBoundDraft` 문서를 자동 시작하지 않는다.
2. 1차에서는 `manualBlank` 또는 기존 결과 기반 문서에 section-level narrative rewrite를 거는 방식으로 제한한다.
3. `support binding`만으로 문서를 시작하는 진입은 Phase 2.5 이후 별도 entry invariant로 확장 검토한다.

### 4.5 Export Layer

역할:

1. HTML / DOCX / Markdown / 패키지 export
2. 작성 파이프라인과 독립된 output 변환

규칙:

1. writer는 export 형식을 몰라야 한다.
2. export는 `DocumentBlueprint` 또는 assembled document만 받는다.
3. 특정 논문 형식 요구는 export preset으로 푼다.

### 4.6 Review / Preflight Layer

논문 초안 자동 생성 이후에는 별도의 품질 점검 루프가 필요하다. 이 계층은 작성 job과 분리된 `review/preflight job`으로 다루며, 초안 본문을 직접 덮어쓰지 않고 finding, suggestion, readiness report를 sidecar로 저장한다.

Phase 2.75 MVP는 "투고 지원 전체"가 아니라 "내보내기 전 기술/근거 점검"으로 좁힌다. 1차 성공 기준은 수치 불일치, 표/그림 본문 호출 누락, caption 누락, 필수 statement 누락, reference/citation consistency, export 전 stale report 감지다. Journal fit 추천과 실제 submission tracking은 후속 단계로 분리한다.

관련 도구 참고:

1. Paperpal Preflight는 언어 품질, 구조/word count, 참고문헌, figure/table citation, caption, metadata, disclosure statement를 투고 전 technical check로 묶는다.
2. Writefull은 Overleaf 안에서 LaTeX 원문을 읽고 학술 문체/문법 피드백을 즉시 제공한다.
3. Trinka Journal Finder는 초록/키워드 기반 journal fit, 유사 논문, 출판 트렌드, predatory journal warning을 제공한다.
4. Elsevier/Wiley Journal Finder는 제목/초록 매칭, metric 비교, author guideline 연결을 제공하지만 acceptance guarantee는 하지 않는다.

BioHub의 차별점은 일반 문법 교정이 아니라 source-bound verification이다. 이미 분석 결과, 그래프, 표, 문헌 binding을 가지고 있으므로 다음 검사를 로컬 deterministic rule과 제한적 LLM review로 나눈다.

1. Draft quality review
   - IMRAD 흐름, 섹션 누락, 논리 점프, 반복/모순, 과잉 주장, 오탈자/문체를 점검한다.
   - LLM은 흐름/문체/논리 점검만 맡고, 통계 수치나 참고문헌을 새로 만들지 않는다.
2. Source consistency review
   - 본문에 등장한 `p`, `F`, `t`, `chi2`, `n`, 평균/SD, 표/그림 번호를 source analysis, `DocumentTable`, `FigureRef`와 대조한다.
   - figure caption과 Graph Studio provenance, related analysis, chart metadata 불일치를 경고한다.
   - citation/reference binding 없는 주장, 사용되지 않은 참고문헌, References 누락을 표시한다.
3. Submission criteria review
   - `TargetJournalProfile`을 기준으로 title/abstract/main text word count, article type, section requirement, figure/table format, reference style, ethics/COI/funding/data availability statement를 검사한다.
   - 초기에는 manual profile + APA/IMRAD/KCI/general preset으로 시작하고, journal guideline URL parsing은 후속으로 둔다.
4. Journal fit / submission tracking
   - Phase 2.75 MVP에는 포함하지 않고 후속 단계로 둔다.
   - 초록, 키워드, 참고문헌, 연구 분야로 scope match 후보를 제안하되, "투고 성공 가능성"이 아니라 "연구 범위 일치 신호"로 표현한다.
   - OpenAlex 기반 유사 논문/저널 후보는 Phase 2.5 이후 discovery 계층과 연결한다.
   - 실제 투고 후에는 submitted/under review/revision/accepted/rejected 상태와 decision note를 저장하는 submission attempt log로 관리한다.

주요 타입 후보:

1. `DocumentQualityReport`
2. `DocumentReviewFinding`
3. `DocumentReviewJobState`
4. `TargetJournalProfile`
5. `SubmissionReadinessReport`
6. `JournalFitCandidate`
7. `SubmissionAttempt`

sidecar 저장/동시성 계약:

1. `DocumentQualityReport`는 `documentId`, `baseDocumentUpdatedAt`, `documentContentHash`, `sectionHashes`, `sourceSnapshotHashes`, `targetJournalProfileVersion`, `ruleEngineVersion`, `createdAt`을 가져야 한다.
2. 문서 본문, source snapshot, target journal profile, rule engine version 중 하나라도 바뀌면 기존 report는 `stale`로 표시한다.
3. review/preflight는 별도 IndexedDB store를 사용한다. 후보 store는 `document-review-jobs`, `document-quality-reports`, `target-journal-profiles`, `submission-attempts`다.
4. review job은 `jobId`, `status: idle | running | partial | completed | stale | failed`, `startedAt`, `updatedAt`, `errorMessage`를 갖고 늦게 끝난 job이 최신 report를 덮어쓰지 못하게 한다.
5. deterministic rule은 성공했지만 LLM review가 실패한 경우 report는 `partial`로 남기고 deterministic finding은 보존한다.
6. export preflight는 최신 report가 없거나 stale이면 재검사 CTA를 우선 노출한다. critical mismatch가 남아 있으면 경고와 명시적 확인 후 export를 허용한다.

source-bound 검증 전제:

1. free-text 파싱만으로는 BioHub의 핵심 차별점인 수치 검증을 안정적으로 보장할 수 없다.
2. Phase 2.75 전에 `SourceEvidenceIndex` 또는 `DocumentClaimEvidence` 계층을 정의한다.
3. evidence 항목은 `metricId`, `sourceId`, `sourceKind`, `resultPath`, `statisticKind`, `value`, `formattedValue`, `unit`, `tolerance`, `sampleSizeRole`, `tableCellRef`, `figureRef`, `sectionId`를 후보 필드로 둔다.
4. writer가 본문/표/figure caption을 만들 때 수치 claim과 evidence id를 함께 남겨야 한다.
5. table/figure evidence가 깨지지 않도록 `DocumentTable.id`, row/column/cell identity, `FigureRef.entityId`, caption version의 안정성 규칙을 함께 정의한다.

타입 경계:

1. `TargetJournalProfile`은 현재 기준이고, `SubmissionReadinessReport`는 특정 문서 revision에 대한 판정이다.
2. `SubmissionAttempt`는 실제 제출 이벤트 로그이며 `profileSnapshot`, `readinessReportId`, `exportArtifactId/hash`, `submittedAt`, `statusHistory`, `decisionNote`를 저장한다.
3. journal 기준이 나중에 바뀌어도 과거 `SubmissionAttempt`의 profile snapshot과 report 판정은 바뀌지 않아야 한다.
4. `DocumentReviewFinding`은 `suggestionText`, `suggestedReplacement`, `targetRange`, `evidenceRefs`, `canAutoApply`, `requiresUserConfirmation`, `ignoredReason`을 후보 필드로 갖는다.
5. review job은 `DocumentSection`을 직접 저장하지 않는다. 실제 patch는 사용자가 finding을 선택한 뒤 별도 user action으로만 수행한다.

UX 원칙:

1. `DocumentEditor` 안에 "초안 점검" 패널을 둔다.
2. finding은 `통과 / 주의 / 수정 필요 / 확인 불가`로 분류한다.
3. "투고 성공률", "합격 가능성", "acceptance probability", 단일 점수, 확률, 저널 1위 추천처럼 보이는 표현은 금지한다.
4. summary는 점수 대신 `pass / warn / fail / notChecked` checklist 집계와 unresolved finding 목록을 기본으로 한다.
5. 패널 상단에는 "BioHub는 저널 채택 가능성을 예측하지 않습니다. 원고의 형식, 근거, 일관성 위험만 점검합니다." 성격의 안내를 고정한다.
6. 필수 상태는 `profile 미설정`, `검사 중`, `검사 실패`, `검사 결과 오래됨`, `원본 변경됨`, `확인 불가`, `export blocker 있음`, `사용자가 무시 처리함`이다.
7. finding 액션은 `섹션으로 이동`, `원본 보기`, `차이 비교`, `선택 적용`, `무시/사유 기록`, `재검사`, `보고서 다운로드`, `위험 확인 후 export`를 후보로 둔다.
8. 자동 수정은 기본값이 아니며, 사용자가 선택한 finding만 suggestion/patch로 반영한다.
9. 최종 export 전 preflight report를 생성해 사용자가 남은 위험을 확인할 수 있게 한다.

## 5. 공통 컴포넌트 계획

### 5.1 Editor Control UI

공통 컴포넌트 후보:

1. `DocumentEditorToolbar`
2. `DocumentWritingStatusBadge`
3. `DocumentWritingBanner`
4. `RetryWritingButton`
5. `SectionWritingPanel`
6. `SectionWritingBadge`
7. `SectionWritingControl`

역할:

1. 작성 중 상태 노출
2. 자동 작성 중단
3. 직접 편집 전환
4. 실패 재시도

원칙:

1. badge/button 같은 leaf component만 추출하지 않는다.
2. toolbar 단위와 section panel 단위의 상위 경계를 먼저 정의한다.

### 5.2 Writing Entry UI

공통 컴포넌트 후보:

1. `WritingEntrySurface`
2. `StartWritingButton`
3. `WritingSourceCard`
4. `WritingSourceList`

역할:

1. 결과 타입과 무관하게 같은 CTA 제공
2. loading / disabled / error 처리 통일

원칙:

1. 단순 버튼 공통화만으로는 충분하지 않다.
2. 결과 화면 / 프로젝트 허브 / `/papers` / Graph Studio가 서로 다른 레이아웃을 가져도 prerequisite, pending, error, source summary 규칙은 같은 surface가 책임진다.
3. disabled 상태에는 반드시 이유를 보여준다.

### 5.3 Material/Source UI

공통 컴포넌트 후보:

1. `DocumentSourceBadge`
2. `DocumentSourceUsageList`
3. `FigureSourceCard`
4. `SupplementarySourceBlock`
5. `SectionSupportBindingPanel`
6. `SupportAssetCard`
7. `LiteratureContextBanner`

역할:

1. 문서가 어떤 결과를 기반으로 쓰였는지 시각화
2. 결과 변경 시 refresh/relink 판단 보조
3. 현재 section이 어떤 문헌/딥리서치 자산을 근거로 쓰는지 표시
4. `/literature` 이동 전후에 target section 맥락 유지

UI/UX 리뷰 반영 포인트:

1. 문헌 검색으로 이동할 때 현재 문서와 현재 section 정보가 함께 전달되어야 한다.
2. 저장한 문헌은 단순 목록이 아니라 “현재 section에 연결” 액션으로 이어져야 한다.
3. 분석 결과 삽입은 section intent를 고려해야 하며, 서론/고찰에 Methods/Results 텍스트를 그대로 밀어 넣지 않는다.
4. 재조립 전 화면 상태와 export 시 반영 상태가 다를 수 있으면 persistent하게 설명해야 한다.
5. 목차 커스터마이즈는 preset/언어 변경으로 쉽게 유실되지 않는 draft editing surface가 되어야 한다.

section-aware handoff 원칙:

1. Phase 1 session contract에는 `projectId / documentId / sectionId` 수준의 handoff token shape를 먼저 고정한다.
2. `/literature` ↔ `/papers` 실제 왕복 UI는 Phase 2.5에 도입한다.
3. 즉, 계약은 먼저 고정하고 사용자 노출 UI는 나중에 붙인다.

### 5.4 External Research Stack Integration

문헌 지원은 외부 오픈소스를 적극 활용하되, BioHub가 reference manager 전체를 다시 구현하지 않는다.

권장 역할 분담:

1. `Zotero`: 개인/팀 참고문헌 라이브러리 관리, note, collection, 외부 워드프로세서 워크플로우
2. `OpenAlex`: 문헌 발견, scholarly metadata 조회, related work 탐색
3. `GROBID`: PDF 원문에서 메타데이터, 초록, 참고문헌, 구조화 텍스트 추출
4. `CSL + citeproc-js`: 본문 인용 및 References 렌더링

통합 원칙:

1. BioHub는 Zotero를 대체하지 않고 `import/export + section-aware writing support`에 집중한다.
2. OpenAlex는 discovery 계층으로 사용하고, citation canonical record 저장 시 DOI/URL/author/year 스냅샷을 함께 보존한다.
3. PDF는 원본 파일만 보관하지 말고, GROBID 등으로 추출한 `abstract / bibliography / note`를 narrative support asset으로 승격한다.
4. citation formatting은 자체 문자열 템플릿보다 CSL processor를 우선한다.
5. deep-research-note는 가능한 경우 citation lineage와 연결된 보조 자산으로 취급한다.

범위 제한:

1. 1차 범위에서는 Zotero live sync나 plugin 생태계 직접 통합보다 `BibTeX/RIS/JSON import-export`를 우선한다.
2. GROBID는 선택적 ingestion 계층으로 두고, 없더라도 수동 note/abstract 입력으로 대체 가능해야 한다.
3. OpenAlex 의존은 discovery에 한정하고, 작성 시점에는 local snapshot을 기준으로 삼는다.

## 6. Registry 중심 확장 전략

앞으로의 변동은 대부분 registry에서 흡수해야 한다.

필요 registry:

1. `document-preset-registry`
2. `document-source-adapter-registry`
3. `document-section-writer-registry`
4. `document-export-preset-registry`
5. `document-writing-entry-registry` (선택)
6. `document-support-asset-registry` (선택)

원칙:

1. 새 논문 종류 추가 = preset 등록
2. 새 결과 타입 추가 = adapter + writer 등록
3. 새 export 형식 추가 = export preset 등록
4. UI는 registry metadata를 읽어 렌더

## 7. 반드시 지켜야 할 불변 조건

1. 사용자 편집 섹션은 자동 patch가 덮어쓰지 않는다.
2. drafting job은 stale write를 차단한다.
3. source binding 없는 문서는 자동 작성 세션으로 시작하지 않는다.
4. editor는 도메인별 결과 저장 구조를 직접 해석하지 않는다.
5. export는 writer 내부 로직과 결합하지 않는다.
6. 결과 타입 하나가 실패해도 가능한 범위에서 부분 작성은 계속된다.
7. user가 연결한 section-level literature binding은 background reassemble이 덮어쓰지 않는다.

추가 불변 조건:

1. `manualBlank`와 `sourceBoundDraft`는 서로 다른 entry invariant를 가진다.
2. section field별 merge 정책은 문서화된 표를 따른다.
3. background job progress와 user autosave의 우선순위는 암묵적 last-write-wins로 두지 않는다.
4. transient toast만으로 실패를 설명하지 않고, editor/entry surface에 persistent 상태를 남긴다.
5. citation 저장과 section usage binding은 별도 계층으로 유지한다.
6. literature support는 `sourceRefs` 확장 대신 `sectionSupportBindings` 병렬 필드로 고정한다.

## 8. 단계별 실행 계획

### Phase 0. behavior baseline 고정

registry 추출 전에 현재 동작을 테스트 기준선으로 잠근다.

최소 게이트:

1. 결과 화면 / 프로젝트 허브 / `/papers` 진입점이 동일한 session contract를 사용하는지
2. blank `DocumentBlueprint` 생성 → editor 진입 → writing state 전이 흐름이 유지되는지
3. user edit 섹션이 background patch에 덮어써지지 않는지
4. stale write가 최신 job을 되돌리지 못하는지
5. partial failure가 전체 drafting을 불필요하게 중단시키지 않는지
6. migrated 문서가 기존 export 경로와 호환되는지

### Phase 1. 코어 안정화

1. `DocumentBlueprint` / `writingState` / merge 규칙 고정
2. session 생성 경로 공통화
3. editor 상태 UI 공통 컴포넌트화
4. 상태/저장 계약 문서와 merge matrix 문서를 함께 잠금

### Phase 1.5. 정규화 source 계약 고정

1. `NormalizedWritingSource` 타입 정의
2. orchestrator input/output 계약 고정
3. writer가 raw storage를 직접 보지 않게 경계 확정

### Phase 2. Adapter / Writer 분리

1. 현재 orchestrator 내부 분기 로직을 writer registry로 이동
2. 첫 대상은 `blast/protein` 전용 writer로 제한
3. 나머지 analysis/figure/bio/genetics는 단계적으로 이동
4. 한 번에 전체 registry migration을 하지 않는다

### Phase 2.5. Literature / Narrative Support 도입

1. `CitationRecord`와 별도로 section usage binding 계약 정의
2. `reference-package` / `deep-research-note` 저장소 초안 정의
3. `introduction/discussion/conclusion`용 support writer 추가
4. `/literature` ↔ `/papers` 간 section-aware handoff 추가
5. Zotero/BibTeX/RIS import-export 경로 추가
6. CSL/citeproc-js 기반 인라인 인용 + References 렌더링 연결
7. 선택적 PDF extraction 계층(GROBID 등) 검토

### Phase 2.75. Review / Preflight 도입

1. MVP 범위를 `내보내기 전 기술/근거 점검`으로 고정하고 journal fit/submission tracking은 후속 phase로 분리
2. `DocumentQualityReport` / `DocumentReviewFinding` / `DocumentReviewJobState` sidecar 타입 정의
3. review report freshness 계약 정의: `baseDocumentUpdatedAt`, content hash, section hash, source snapshot hash, profile version, rule engine version
4. 별도 store 계약 정의: `document-review-jobs`, `document-quality-reports`, `target-journal-profiles`, `submission-attempts`
5. `SourceEvidenceIndex` 또는 `DocumentClaimEvidence` 타입 정의
6. `TargetJournalProfile` / `SubmissionReadinessReport` / `SubmissionAttempt` 타입 경계 및 snapshot 규칙 정의
7. 구조, word count, table/figure citation, caption, disclosure, reference/citation consistency 같은 deterministic rule engine 추가
8. source-bound statistical value check 추가: 본문 수치와 source analysis/table/figure provenance 대조
9. LLM review는 흐름, 문체, 과잉 주장, 논리 점프, 오탈자 제안으로 제한하고 sanitizer로 수치/참고문헌 patch 시도를 격리
10. `DocumentEditor`에 "초안 점검" 패널, stale/partial/failed 상태, finding list, finding action 추가
11. export 전 preflight report 생성, stale report 경고, critical mismatch 명시적 확인 흐름 추가
12. journal fit은 acceptance prediction이 아니라 후속 `연구 범위 일치 신호` 설명으로 제한

### Phase 3. Preset / 문서 종류 확장

1. paper / report / note / submission preset 분리
2. preset별 section 세트와 필수 metadata 정의

### Phase 4. Export / 패키지 계층 정리

1. export 계층 공통화
2. `ReportComposer`, `PackageBuilder`, 문서 export 역할 재정의

## 9. 당장 고려할 리스크

1. 결과 타입별 raw schema 차이로 인해 writer가 storage 의존으로 커질 수 있음
2. registry 도입 전까지 orchestrator 파일 비대화가 빠르게 진행될 수 있음
3. 문서 종류를 너무 일찍 세분화하면 preset만 늘고 구조는 오히려 복잡해질 수 있음
4. source kind를 과하게 세분화하면 core 타입 churn이 커질 수 있음
5. export 요구를 writer에 섞으면 향후 DOCX/HTML 차이가 문서 작성 로직을 오염시킬 수 있음
6. 문헌 지원을 citation flat list 수준에서 멈추면 section-level 작성 지원 UX가 끝까지 완성되지 않음
7. Zotero/OpenAlex/GROBID를 한 번에 깊게 묶으면 ingestion 범위가 과도하게 커질 수 있음
8. citation formatting을 템플릿 문자열로 처리하면 저널별 style 유지보수 비용이 급격히 커질 수 있음
9. review/preflight 결과를 초안 본문 patch와 섞으면 사용자가 의도하지 않은 자동 교정으로 원문이 바뀔 수 있음
10. 투고 성공률처럼 보이는 표현을 쓰면 저널 acceptance guarantee로 오해될 수 있으므로 checklist와 연구 범위 일치 신호만 표현해야 함

## 10. 바로 이어질 작업

1. 상태/저장/동시성 계약 1장 추가
2. `DocumentSection` 필드별 merge matrix 작성
3. `NormalizedWritingSource` 최소 타입 정의
4. `startWritingSession(input)` + `manualBlank/sourceBoundDraft/retry` 모드 명시
5. behavior baseline 테스트 게이트 추가
6. 그 다음 `blast/protein`을 첫 registry migration 대상으로 분리
7. section-level literature binding 계약 초안 추가
8. `citation / reference-package / deep-research-note` 역할 경계 문서화
9. external stack integration 원칙(Zotero/OpenAlex/GROBID/CSL) 고정
10. review/preflight sidecar 타입과 deterministic check 목록 초안 추가
11. `TargetJournalProfile` manual profile + APA/IMRAD/KCI preset 범위 고정
12. `DocumentEditor` 초안 점검 패널 UX 초안 추가
13. review report freshness/stale/retry/partial failure 계약 추가
14. `SourceEvidenceIndex` / `DocumentClaimEvidence` 전제 조건 추가
15. L1/L2/L3 review/preflight 테스트 matrix 추가

참조 문서:

1. [`PLAN-DOCUMENT-WRITING-STATE-CONTRACT.md`](./PLAN-DOCUMENT-WRITING-STATE-CONTRACT.md)
2. [`PLAN-DOCUMENT-SECTION-MERGE-MATRIX.md`](./PLAN-DOCUMENT-SECTION-MERGE-MATRIX.md)

## 11. 결정 보류 항목

1. `DocumentSourceRef.kind`를 어디까지 세분화할지
2. preset별 section schema를 얼마나 강하게 강제할지
3. `discussion` 자동 작성 범위를 1차에 넣을지
4. export preset과 document preset을 분리할지 결합할지
5. bio-tools 결과를 generic fallback 중심으로 갈지 도구별 writer까지 갈지
6. Zotero live integration 범위를 import/export 수준에서 멈출지 후속 sync까지 열어둘지
