# 자료 작성 문서 허브

BioHub의 자료 작성 기능은 논문/보고서를 한 번에 완성하는 기능이 아니라, 부분별 연구 산출물을 구조화하고 검증한 뒤 문서 단위로 통합하는 반자동 작성 흐름이다.

핵심 방향:

- 부분별 작성: Analysis, Graph Studio, Bio-Tools, 유전적 분석, Literature 결과를 각각 독립 산출물로 정리한다.
- 체계적 통합: provenance, source binding, document section 단위로 하나의 `DocumentBlueprint`에 조립한다.
- 보수적 자동화: 검증된 값과 사용자가 확인한 입력만 문장화하고, 모르는 내용은 추론하지 않는다.

상위 제품 원칙은 [`docs/PLATFORM_VISION.md`](../../../docs/PLATFORM_VISION.md)를 따른다.

---

## 현재 체크포인트 (2026-05-04)

자료 작성 핵심 엔진과 편집기 안정화는 1차 정리 완료 상태로 본다.

완료된 핵심 범위:

- 보수적 자동화 원칙과 섹션별 자동화 범위 고정
- `DraftContext` / `StudySchema` / `PaperDraft` / `DocumentBlueprint` source-of-truth 분리
- Methods / Results / Captions readiness와 `ready / needs-review / blocked` gate
- Materials/Samples, Preprocessing, Citation source contract 1차 구현
- 가정 위반, 결측 처리, 다중비교 보정 누락 gate 시뮬레이션
- 다중 분석 문서용 `authoringPlan`과 artifact-level provenance 연결
- 결과 패널/히스토리용 `generateAnalysisPaperDraft()` adapter와 document-writing 경로 분리
- 자료 작성 세션 UI, source readiness, 섹션 재생성, autosave save queue, revision history
- 심사/학위 수정 요청 작업대, 기준 저장 지점 비교, 섹션 단위 부분 복원
- review request baseline retention, 생성 실패 rollback, 삭제 cleanup, 복원 conflict safety 회귀 테스트

아직 남은 후속 범위:

- Introduction / Discussion의 본문 생성은 citation/사용자 해석 검증이 더 필요하므로 후순위 유지
- `/papers` 전체 UX/design polish pass는 별도 후속으로 둔다. Papers Hub, DocumentEditor, 원본 자료, 섹션 재생성, 복원 기록, 수정 요청 작업대가 한 흐름으로 자연스럽게 보이는지 사용자 관점에서 다시 점검한다.
- 기존 논문 기반 유사 논문 파생 생성은 후속 대형 기능이다. 섹션 구조와 배치 패턴은 재사용할 수 있지만, sourceRefs/evidence는 새 프로젝트 기준으로 재매핑해야 한다.
- prompt registry / cross-model review는 대형 설계 작업으로 보류한다. 섹션별 prompt와 전체 문서 검토 prompt를 분리하되, 보수적 자동화 원칙을 깨지 않는 검증 경로가 먼저 필요하다.

supplementary writer 승격 정책:

- 현재 전용 writer: `blast-result`, `bold-result`, `protein-result`, `seq-stats-result`, `translation-result`, `similarity-result`, `phylogeny-result`
- `phylogeny-result`는 전용 writer가 있지만 topology/clade/support 해석이 아니라 tree method, distance model, sequence count, alignment length만 쓰는 방법·입력 요약으로 제한한다.
- `bio-tool-result`는 history의 `results`가 `unknown`이므로 broad 전용 writer를 만들지 않고, `BioToolId`별 타입 가드와 테스트가 있는 도구만 개별 승격한다. 현재 `alpha-diversity`, `beta-diversity`, `condition-factor`, `fst`, `hardy-weinberg`, `icc`, `length-weight`, `mantel-test`, `meta-analysis`, `nmds`, `permanova`, `rarefaction`, `roc-auc`, `survival`, `vbgf`는 전용 writer로 승격했다. `species-validation`은 coming-soon이고 result schema가 없어 generic-only로 유지한다.
- 정책 SSOT: `stats/lib/research/document-writing-supplementary-policy.ts`

전용/제한 writer 판단 기준:

- 전용 writer는 해당 결과 타입의 저장 스키마가 안정적이고, 저장된 값만으로 타입별 요약을 만들 수 있을 때 사용한다.
- 제한 writer는 타입별 코드 경로는 두되, 저장된 값이 생물학적 해석까지 뒷받침하지 못할 때 사용한다.
- 제한 writer는 결과 해석이 아니라 입력/처리/방법/기술통계 요약만 만든다.
- AI 모델은 이 단계에서 사용하지 않는다. 모든 supplementary writer는 deterministic template writer다.
- source에 없는 기능, novelty, 확정 동정, clade/support, 종 경계, causal claim은 생성하지 않는다.

향후 개선 메모:

- 구현 파일: `stats/lib/research/document-writing-supplementary-writers.ts`(유전적 분석), `stats/lib/research/document-writing-bio-tool-writers.ts`(Bio-Tools)
- source 정규화/dispatch: `stats/lib/research/document-writing-source-registry.ts`
- 정책/우선순위: `stats/lib/research/document-writing-supplementary-policy.ts`
- 핵심 테스트: `stats/lib/research/__tests__/document-writing-source-registry.test.ts`, `stats/lib/research/__tests__/document-writing-supplementary-policy.test.ts`
- 새 writer를 추가할 때는 먼저 result schema/type guard를 고정하고, ko/en 출력, source snapshot 누락 fallback, 금지 해석 문구 부재를 테스트한다.
- Bio-Tools writer는 `bio-tool-result` 전체가 아니라 `BioToolId`별로 승격한다. `results: unknown`을 직접 cast해서 쓰는 broad writer는 만들지 않는다.
- Bio-Tools 추가/삭제 시 `BIO_TOOL_SUPPLEMENTARY_WRITER_POLICY_BY_TOOL`이 `BioToolId` 전체를 `dedicated / candidate / generic-only`로 분류해야 한다. 누락은 TypeScript 또는 정책 테스트에서 드러나야 한다.
- `alpha-diversity` writer는 site/species count, 지수 요약, 사이트별 주요 수치만 출력한다. diversity의 높고 낮음, 생태학적 의미, 군집 차이는 source-backed 사용자 해석 없이는 쓰지 않는다.
- `beta-diversity` writer는 distance metric, site labels, 쌍별 거리만 출력한다. clustering, group separation, ecological distance interpretation은 source-backed 사용자 해석 없이는 쓰지 않는다.
- `rarefaction` writer는 curve count, site labels, 곡선별 최종 n/expected species/point count만 출력한다. 표본 충분성, 포화 여부, richness 해석은 source-backed 사용자 해석 없이는 쓰지 않는다.
- `condition-factor` writer는 K 기술통계, 그룹별 기술통계, 선택적 비교 검정 수치만 출력한다. condition의 좋고 나쁨, 생리 상태, 그룹 차이 유의성 해석은 source-backed 사용자 해석 없이는 쓰지 않는다.
- `roc-auc` writer는 AUC, AUC CI, threshold, sensitivity, specificity, ROC point count만 출력한다. 진단 성능 우수/불량, 임상적 유용성, 최적 cut-off 해석은 source-backed 사용자 해석 없이는 쓰지 않으며, threshold도 중립 라벨로만 표기한다.
- `length-weight` writer는 회귀 방정식, a/b, b SE, R², 등성장 검정 t/p, N만 출력한다. growthType 판정, 유의성 판단, 축/단위 해석은 source-backed 사용자 해석 없이는 쓰지 않는다.
- `permanova` writer는 pseudo-F, p-value, R², permutations, SS 항목만 출력한다. 집단 차이 유의성, effect interpretation, group factor 의미 해석은 source-backed 사용자 해석 없이는 쓰지 않는다.
- `mantel-test` writer는 Mantel r, p-value, permutations, method만 출력한다. 상관 강도, 유의성, 거리 행렬 간 생물학적 의미 또는 인과 해석은 source-backed 사용자 해석 없이는 쓰지 않는다.
- `meta-analysis` writer는 pooled effect, CI, z/p, Q/Q p, I²/τ², study-level effect/CI/weight만 출력한다. 효과의 의미, 유의성, 이질성 높고 낮음, 모델 선택 해석은 source-backed 사용자 해석 없이는 쓰지 않는다.
- `nmds` writer는 stress, 차원 수, 지점 수, optional group count, 좌표만 출력한다. `stressInterpretation` 문자열, 군집 분리, gradient, 생태학적 의미 해석은 source-backed 사용자 해석 없이는 쓰지 않는다.
- `icc` writer는 ICC type, ICC, CI, F/df/p, mean squares, 대상 수/평가자 수만 출력한다. `interpretation` 문자열과 신뢰도 품질 판정은 source-backed 사용자 해석 없이는 쓰지 않는다.
- `survival` writer는 Kaplan-Meier 곡선 수, log-rank p-value, 중앙 생존 시간, 그룹별 N/event/censor/endpoint 수치만 출력한다. 그룹 간 차이 유의성, 생존 우수/불량, 치료 효과 또는 위험 해석은 source-backed 사용자 해석 없이는 쓰지 않는다.
- `vbgf` writer는 L∞, K, t₀, parameter table, R²/AIC, predicted/residual counts, N만 출력한다. 성장 양상 평가, 생물학적 의미, 모델 적합성 좋고 나쁨 해석은 source-backed 사용자 해석 없이는 쓰지 않는다.
- `species-validation`은 구현 전 도구이므로 전용 writer를 만들지 않는다. 실제 API result schema, status enum, match confidence, database provenance, protected-species fields가 고정되기 전에는 학명 확정, 보호종 여부, 매칭 신뢰도 문장을 자동 생성하지 않는다.

주변 도구 역할 분리:

- `ReportComposer`: 선택 항목을 한 번에 복사/HTML 저장하는 빠른 요약 export 전용
- `PackageBuilder`: 자료 작성 문서에 자동 반영하지 않는 외부 AI 입력 패키지 조립 전용

검증 기준:

- 핵심 변경은 관련 Vitest와 `pnpm --filter stats exec tsc -p tsconfig.json --noEmit`로 확인한다.
- 편집기 저장/복원/재생성 흐름은 대표 Playwright E2E로 함께 확인한다.
- 수정 요청이나 revision history 변경은 baseline retention, 생성 실패 rollback, 삭제 cleanup, conflict safety 회귀 테스트를 함께 갱신한다.
- `needs-review` 초안은 미리보기/검토 대상이지, 문서 본문 자동 반영 대상이 아니다.
- 새 생성 경로는 `generatePaperDraft()`를 직접 쓰지 않고 `generateAnalysisPaperDraft()` 또는 `generatePaperDraftFromSchema()`를 사용한다.

---

## 현재 기준 문서

| 문서 | 역할 |
|---|---|
| [`docs/PLAN-PAPER-WRITING-SEMIAUTOMATION.md`](../../../docs/PLAN-PAPER-WRITING-SEMIAUTOMATION.md) | 논문 작성 반자동화 제품 방향, 보수적 자동화 원칙, `StudySchema` 방향 |
| [`SECTION-SCOPE.md`](SECTION-SCOPE.md) | IMRaD/섹션별 자동화 범위, 금지 표현, gate, 테스트 책임 |
| [`PLAN-DOCUMENT-WRITING-ARCHITECTURE.md`](PLAN-DOCUMENT-WRITING-ARCHITECTURE.md) | 문서 작성 세션/오케스트레이션 아키텍처 |
| [`PLAN-DOCUMENT-WRITING-STATE-CONTRACT.md`](PLAN-DOCUMENT-WRITING-STATE-CONTRACT.md) | writing state, job, section status 저장 계약 |
| [`PLAN-DOCUMENT-SECTION-MERGE-MATRIX.md`](PLAN-DOCUMENT-SECTION-MERGE-MATRIX.md) | user edit 보존과 section patch 병합 정책 |
| [`PLAN-PAPER-DRAFT-GENERATION.md`](PLAN-PAPER-DRAFT-GENERATION.md) | 기존 결과 패널 논문 초안 생성 흐름 |
| [`PLAN-DOCUMENT-ASSEMBLY.md`](PLAN-DOCUMENT-ASSEMBLY.md) | 프로젝트 단위 문서 조립 흐름 |
| [`PLAN-DOCX-EXPORT.md`](PLAN-DOCX-EXPORT.md) / [`PLAN-DOCX-EXPORT-IMPL.md`](PLAN-DOCX-EXPORT-IMPL.md) | DOCX export 계획/구현 |
| [`PLAN-FIGURE-IMAGE-EXPORT.md`](PLAN-FIGURE-IMAGE-EXPORT.md) | figure/image export 계획 |
| [`PLAN-CITATION-MANAGEMENT.md`](PLAN-CITATION-MANAGEMENT.md) | citation/literature 연동 계획 |

---

## 코드 위치

| 영역 | 주요 위치 | 역할 |
|---|---|---|
| 결과 패널 초안 | `stats/lib/services/paper-draft/` | `PaperDraft`, `StudySchema`, Methods/Results/Captions 템플릿, readiness/scope |
| 결과 패널 UI | `stats/components/analysis/steps/PaperDraftPanel.tsx` | 초안 미리보기, Methods/Results readiness 카드, 복사/저장 |
| 결과 패널 hook | `stats/hooks/use-results-paper-draft.ts` | 결과 화면에서 초안 생성/히스토리 저장 |
| 문서 모델 | `stats/lib/research/document-blueprint-types.ts` | `DocumentBlueprint`, section, metadata, writing state |
| 문서 저장 | `stats/lib/research/document-blueprint-storage.ts` | IndexedDB 저장/복원, metadata setter |
| 문서 작성 세션 | `stats/lib/research/document-writing-session.ts` | 작성 job/session 상태 생성 |
| 문서 작성 오케스트레이션 | `stats/lib/research/document-writing-orchestrator.ts` | source 수집 → draft 생성 → section patch |
| 문서 source registry | `stats/lib/research/document-writing-source-registry.ts` | analysis/figure/supplementary source 정규화 |
| 문서 편집 UI | `stats/components/papers/DocumentEditor.tsx` | 문서 편집, writing state 표시, section patch 반영 |
| Papers 허브 | `stats/components/papers/` | 문서 허브, 조립기, 패키지 빌더, export UI |

---

## 초안 생성 경로

공식 생성 경로는 아래처럼 나눈다.

- 결과 패널/히스토리 호환 경로: `generateAnalysisPaperDraft()`
- 이미 검증된 `StudySchema` 기반 저수준 생성 경로: `generatePaperDraftFromSchema()`
- 문서 작성 세션 경로: `DocumentBlueprint` sourceRefs -> `analysis-writing-draft.ts` -> `generateAnalysisPaperDraft()` -> section patch

`generatePaperDraft()`는 기존 테스트/호환을 위한 저수준 adapter로만 유지한다. 새 제품 경로에서 직접 import하지 않는다.

경계 원칙:

- 결과 패널은 사용자 확인 `DraftContext`를 원본으로 보고, `StudySchema`는 analysis draft adapter에서 파생한다.
- history/document-writing 경로는 저장된 `paperDraft.studySchema`가 language, history/source, method, fingerprint와 맞을 때만 재사용한다.
- label/unit/group/context, variable mapping, analysis options, language가 바뀌면 analysis draft adapter가 `StudySchema`를 다시 만든다.
- `DocumentBlueprint`는 문서 조립과 provenance의 원본이고, per-analysis 작성 입력은 `authoringPlan.sources[]`와 section `sourceRefs`로 연결한다.

---

## Source Of Truth

- `DraftContext`: 사용자가 확인한 분석별 작성 입력. 변수 라벨, 단위, 집단 라벨, 연구 맥락을 보존한다.
- `StudySchema`: `DraftContext + AnalysisResult + 변수 매핑 + 검증 결과 + 옵션`에서 파생된 논문 작성용 스냅샷이다. 편집 원본이 아니다.
- `PaperDraft`: 결과 패널/히스토리에 저장되는 분석별 초안이다. `context`, `studySchema`, `methodsReadiness`, `resultsReadiness`, `captionsReadiness`를 함께 보존한다.
- `DocumentBlueprint`: 문서 단위 composition의 원본이다. 여러 source, section, writing state, generated artifact provenance를 소유한다.

원칙:

- 분석별 사용자 입력은 `PaperDraft.context`가 원본이다.
- `StudySchema`는 재생성/검증/문서 연결을 위한 파생 스냅샷이다.
- 다중 분석 문서에서는 단일 `metadata.studySchema`를 문서 전체 원본으로 쓰지 않는다.
- 문서 조립은 `DocumentBlueprint`가 소유하고, 분석별 provenance는 `historyId` 등 source key로 연결한다.

---

## 다중 분석 Authoring Plan

다중 분석 문서의 source-of-truth는 `DocumentBlueprint.metadata.authoringPlan`이다. `metadata.studySchema`는 기존 단일 분석 문서 호환용으로만 유지한다.

구조:

- `authoringPlan.mode`: `single-source` 또는 `multi-source`
- `authoringPlan.primarySourceRef`: 문서의 대표 분석 source
- `authoringPlan.sources[]`: `DocumentSourceRef`별 role, label, `StudySchema`, `sourceFingerprint`, artifact id 목록
- `authoringPlan.sectionPlans[]`: section이 참조하는 source/artifact 계획

작성 원칙:

- 한 문서에 여러 분석 결과가 들어가면 `StudySchema`를 문서 전체에 하나만 두지 않는다.
- `historyId`가 있으면 `analysis:{historyId}`를 source key로 사용하고, 없으면 `sourceFingerprint`를 fallback source key로 사용한다.
- Methods/Results/Captions는 section `sourceRefs`와 `authoringPlan.sources`를 함께 보고 어떤 분석의 근거인지 판단한다.
- 기존 `metadata.studySchema`는 최신 단일 분석 스냅샷으로 보존하되, 새 조립/재작성 로직은 `authoringPlan.sources`를 우선한다.

구현 위치:

- `stats/lib/research/document-blueprint-types.ts`: `DocumentAuthoringPlan`, source-key helper, `StudySchema` upsert helper
- `stats/lib/research/document-blueprint-storage.ts`: `setDocumentStudySchema()` 호출 시 기존 단일 분석 `studySchema`와 `authoringPlan`을 함께 갱신
- `stats/lib/research/__tests__/document-blueprint-types.test.ts`: 단일/다중 분석 authoring plan 회귀 테스트

---

## Artifact-Level Provenance

자동 생성된 Methods/Results/Captions 산출물은 `DocumentBlueprint.metadata.generatedArtifacts`에 artifact 단위로 기록한다.

구조:

- `artifactKind`: `methods`, `results`, `caption`
- `artifactId`: artifact kind와 sourceRefs 기반 deterministic id
- `generator`: `template` 또는 `llm`, generator id/version
- `sourceRefs`: 해당 artifact가 실제로 사용한 분석/figure/supplementary source
- `options`: language, methodId, postHocDisplay 등 생성 옵션

작성 원칙:

- section 전체 provenance와 artifact provenance를 구분한다.
- section `sourceRefs`는 편집기에서 연결된 자료를 보여주는 용도이고, `generatedArtifacts`는 어떤 생성물이 어떤 source로 만들어졌는지 재생성/검토하는 용도다.
- `authoringPlan.sources[].generatedArtifactIds`와 `authoringPlan.sectionPlans[]`는 artifact id를 역참조해 다중 분석 문서에서 출처별 생성물을 찾을 수 있게 한다.
- 사용자 편집으로 본문 patch가 skip된 경우에는 새 본문 artifact를 생성했다고 기록하지 않는다.

구현 위치:

- `stats/lib/research/document-blueprint-types.ts`: artifact id/provenance 생성, metadata upsert, authoring plan back-link helper
- `stats/lib/research/document-writing-orchestrator.ts`: Methods/Results section patch 성공 시 `generatedArtifacts` 갱신
- `stats/lib/research/__tests__/document-blueprint-types.test.ts`: deterministic id와 authoring plan 연결 테스트
- `stats/lib/research/__tests__/document-writing-orchestrator.test.ts`: 실제 writing job에서 artifact provenance 저장 테스트

---

## Methods 자동 작성 범위

현재 `Statistical Methods` 범위 정의는 아래 파일에 둔다.

- `stats/lib/services/paper-draft/methods-scope.ts`: 분석군별 자동 작성 가능 항목, 사용자 확인 항목, 금지 표현, gate rule
- `stats/lib/services/paper-draft/methods-readiness.ts`: `StudySchema` 기반 `ready / needs-review / blocked` 계산
- `stats/lib/services/paper-draft/__tests__/methods-scope.test.ts`: 분석군별 범위표 회귀 테스트
- `stats/lib/services/paper-draft/__tests__/methods-readiness.test.ts`: readiness/gate 회귀 테스트

작성 원칙:

- 필수 근거가 없으면 Methods 문장을 생성하지 않는다.
- `needs-review`는 초안 생성은 허용하되, 문서 반영 전 사용자 확인이 필요하다는 뜻이다.
- `blocked`는 초안 본문 생성, 복사, 저장을 막아야 한다.
- 사용자 책임 항목은 추론하지 않고 prompt로 노출한다.

---

## Materials/Samples source 계약

현재 `Materials / Samples` source 계약은 아래 파일에 둔다.

- `stats/lib/services/paper-draft/materials-source-contract.ts`: 데이터셋, 시료, species source의 provenance/verification/허용 claim 계약
- `stats/lib/services/paper-draft/study-schema.ts`: `StudySchema.materials`에 source contract 보존
- `stats/lib/services/paper-draft/methods-readiness.ts`: 검증되지 않은 species source를 `blocked` gate로 처리
- `stats/lib/services/paper-draft/__tests__/materials-source-contract.test.ts`: source contract 회귀 테스트

작성 원칙:

- 데이터 파일명, 행 수, 변수 수처럼 분석 metadata로 검증된 항목만 자동 source로 취급한다.
- species source는 `verified` 상태일 때만 확정 종명 claim에 사용할 수 있다.
- 장비명, 시약명, 채집 위치, 보관 조건, 윤리 승인/허가번호는 명시 입력 없이는 자동 생성하지 않는다.
- `unverified / missing / failed` species source는 Methods 본문 생성을 막는다.

---

## Preprocessing source 계약

현재 `Preprocessing` source 계약은 아래 파일에 둔다.

- `stats/lib/services/paper-draft/preprocessing-source-contract.ts`: 결측, 중복, 변환, 표준화, 제외, imputation step의 source/rationale 계약
- `stats/lib/services/paper-draft/study-schema.ts`: `StudySchema.preprocessing`에 validation evidence와 전처리 step 보존
- `stats/lib/services/paper-draft/methods-readiness.ts`: validation error는 `blocked`, 결측/변환/제외 rationale 누락은 `needs-review`로 처리
- `stats/lib/services/paper-draft/__tests__/preprocessing-source-contract.test.ts`: 전처리 source/gate 회귀 테스트

작성 원칙:

- 검증 결과 결측치가 0개이면 결측 없음 문장은 source-backed complete로 본다.
- 결측치가 있는데 처리 방식이 사용자 확인되지 않았으면 Methods는 review 필요 상태로 둔다.
- 변환, 표준화, row filtering, 이상치 제외, imputation은 pipeline log 또는 사용자 입력 없이 자동 주장하지 않는다.
- validation error가 남아 있으면 Methods 본문 생성을 막는다.

---

## 가정/결측/다중비교 생성 게이트

현재 `가정 위반`, `결측 처리`, `다중비교 보정` 누락 처리는 아래 조합으로 고정한다.

- `stats/lib/services/paper-draft/methods-readiness.ts`: Methods 본문 생성 가능 여부와 사용자 확인 prompt 계산
- `stats/lib/services/paper-draft/results-readiness.ts`: Results 본문 생성 가능 여부와 축약/검토 상태 계산
- `stats/lib/services/paper-draft/preprocessing-source-contract.ts`: 결측/전처리 evidence와 rationale 계약
- `stats/lib/services/paper-draft/__tests__/methods-readiness.test.ts`: 가정 위반, 결측, 보정 방법 누락 gate 단위 테스트
- `stats/lib/services/paper-draft/__tests__/results-readiness.test.ts`: 보정 방법 누락 시 Results review gate 테스트
- `stats/lib/services/paper-draft/__tests__/paper-draft-service.test.ts`: 실제 초안 생성 경로에서 Methods/Results section 생성 여부 시뮬레이션

작성 원칙:

- 가정 위반이 있는데 사용자 판단 메모가 없으면 Methods는 `needs-review`로 두고, 위반 사유나 대안 선택 이유를 추론하지 않는다.
- 결측값이 있는데 처리 방식이 확인되지 않았으면 Methods는 `needs-review`로 두고, 결측 메커니즘이나 제외/대체 기준을 꾸며 쓰지 않는다.
- validation error가 남아 있으면 Methods 본문 생성을 막는다.
- post-hoc 결과가 있는데 보정 방법이 없으면 Methods는 `blocked`, Results는 수치 기반 초안만 허용하되 `needs-review`로 둔다.

---

## Results 자동 작성 범위

현재 `Results` 범위 정의는 아래 파일에 둔다.

- `stats/lib/services/paper-draft/results-scope.ts`: 분석군별 자동 작성 가능 수치, 사용자 확인 항목, 금지 표현, gate rule
- `stats/lib/services/paper-draft/results-readiness.ts`: `StudySchema` 기반 `ready / needs-review / blocked` 계산
- `stats/lib/services/paper-draft/__tests__/results-scope.test.ts`: 분석군별 범위표 회귀 테스트
- `stats/lib/services/paper-draft/__tests__/results-readiness.test.ts`: readiness/gate 회귀 테스트

작성 원칙:

- 핵심 통계량, p-value, source provenance가 필요한 결과 유형에서는 누락 시 Results 본문 생성을 막는다.
- effect size, confidence interval, group statistics, model fit, post-hoc method 누락은 분석군별로 `needs-review`로 처리한다.
- p-value와 반대되는 유의성 표현, 인과 해석, 근거 없는 효과 강도 단정, 없는 figure/table 결과 언급은 금지한다.
- 보정 방법, 생물학적 의미, 결과 우선순위는 결과 수치만으로 추론하지 않는다.

---

## Captions 자동 작성 범위

현재 `Captions / Tables / Figures` 범위 정의는 아래 파일에 둔다.

- `stats/lib/services/paper-draft/captions-scope.ts`: caption 자동 작성 가능 source, 사용자 확인 항목, 금지 표현, gate rule
- `stats/lib/services/paper-draft/captions-readiness.ts`: `StudySchema + table/figure source` 기반 `ready / needs-review / blocked` 계산
- `stats/lib/services/paper-draft/__tests__/captions-scope.test.ts`: 범위표 회귀 테스트
- `stats/lib/services/paper-draft/__tests__/captions-readiness.test.ts`: source/provenance gate 회귀 테스트

작성 원칙:

- table caption은 실제 생성된 `PaperTable`에 포함된 범위만 설명한다.
- figure caption은 `visualizationData.type` 기반의 source-linked chart type 수준만 자동 작성한다.
- figure의 핵심 메시지, panel 구성, 장비/배율/이미지 처리 조건은 사용자 확인 없이는 작성하지 않는다.
- source 없는 figure/table reference, 없는 panel label, chart type만으로 추론한 시각 요소 설명은 금지한다.

---

## Citation source 계약

현재 `Introduction / Discussion / References`의 citation source 계약은 아래 파일에 둔다.

- `stats/lib/research/citation-source-contract.ts`: 문헌 source를 `verified / reference-only / invalid`로 분류하고 섹션별 사용 가능 범위를 계산
- `stats/lib/research/citation-types.ts`: 프로젝트에 저장된 `CitationRecord`와 중복 판정 key
- `stats/lib/research/citation-storage.ts`: 프로젝트별 citation 저장/조회/삭제
- `stats/lib/research/citation-apa-formatter.ts`: References용 best-effort APA 문자열 생성
- `stats/lib/research/__tests__/citation-source-contract.test.ts`: Introduction/Discussion citation hallucination 방지 시뮬레이션

작성 원칙:

- Introduction/Discussion 본문 citation은 DOI와 문헌 요약 source가 모두 있는 경우에만 허용한다.
- DOI 또는 요약이 부족한 문헌은 References 후보로만 사용하고 본문 근거 문장에는 쓰지 않는다.
- 제목, 저자, DOI/URL 같은 기본 metadata가 부족한 문헌은 References 확정 항목으로도 사용하지 않는다.
- citation이 필요한 본문인데 verified narrative citation이 없으면 초안 생성을 막는다.

---

## 다음 작업을 시작할 때

1. 먼저 이 문서에서 관련 영역을 확인한다.
2. 제품 원칙이 흔들릴 수 있으면 [`docs/PLATFORM_VISION.md`](../../../docs/PLATFORM_VISION.md)를 확인한다.
3. 논문 작성 반자동화의 범위/UX 판단은 [`docs/PLAN-PAPER-WRITING-SEMIAUTOMATION.md`](../../../docs/PLAN-PAPER-WRITING-SEMIAUTOMATION.md)를 기준으로 한다.
4. 섹션별 자동화 가능/금지/테스트 책임은 [`SECTION-SCOPE.md`](SECTION-SCOPE.md)를 기준으로 한다.
5. 구현 변경 후에는 관련 unit/integration test를 함께 추가하거나 갱신한다.
