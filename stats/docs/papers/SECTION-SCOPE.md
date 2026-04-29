# 자료 작성 섹션별 자동화 범위

이 문서는 BioHub 자료 작성 기능의 섹션별 자동화 범위를 고정한다.

목적:

- 부분별 자동화 작업이 서로 다른 기준으로 흩어지지 않게 한다.
- 각 섹션에서 자동 작성 가능한 항목, 사용자 확인이 필요한 항목, 금지 표현을 구분한다.
- 구현, UI, 테스트가 같은 기준을 보게 한다.

상위 원칙:

- 부분별 작성 -> 체계적 통합 -> 보수적 자동화
- 검증된 값과 사용자가 확인한 입력만 자동 문장화한다.
- 시스템이 모르는 연구 설계, 실험 절차, 결측 처리, 해석, 인용은 추론하지 않는다.
- `blocked`는 본문 생성/복사/저장을 막아야 한다.
- `needs-review`는 초안 생성은 가능하지만 문서 반영 전 사용자 확인이 필요하다는 뜻이다.

---

## 1. 섹션 구조

기본 논문 구조는 IMRaD를 기준으로 한다.

| 섹션 | BioHub section id | 자동화 단계 | 기본 입장 |
|---|---|---|---|
| Introduction / 서론 | `introduction` | 후순위 | 보조 초안만 허용 |
| Materials and Methods / 재료 및 방법 | `methods` | 우선 | 하위 블록별 반자동화 |
| Results / 결과 | `results` | 우선 | 수치 기반 결정론적 작성 |
| Discussion / 고찰 | `discussion` | 후순위 | 보조 초안, 강한 결론 금지 |
| Captions / 표·그림 캡션 | `figures`, `tables`, `captions` | 우선 | source 기반 자동 작성 |
| References / 참고문헌 | `references` | 후순위 | 검증된 citation만 |

---

## 2. Introduction / 서론

### 자동 작성 가능

- 사용자가 입력한 연구 목적을 문체만 다듬은 문장
- 프로젝트에 연결된 문헌 요약의 단순 나열 또는 배경 bullet
- 검증된 citation metadata 기반 참고문헌 목록 후보

### 사용자 확인 필요

- 연구 질문의 참신성
- 연구 배경의 중요성
- 선행연구와의 차별점
- 연구 가설
- 문헌 해석과 주장 강도

### 금지

- 검증되지 않은 citation 생성
- 존재하지 않는 선행연구 인용
- novelty 또는 first report 주장 자동 생성
- 생물학적/임상적 중요성 과장

### Gate

- `blocked`: citation을 포함한 문장을 생성하려는데 검증된 문헌 source가 없는 경우
- `needs-review`: 연구 목적은 있으나 문헌 요약이나 차별점이 부족한 경우
- `ready`: 사용자가 연구 목적/배경/문헌 요약을 확인한 경우

### 테스트 기준

- 검증되지 않은 citation이 출력되지 않아야 한다.
- 문헌 요약이 없는 reference는 Introduction 문장 생성에 사용되지 않아야 한다.
- 사용자가 편집한 Introduction은 자동 patch가 덮어쓰지 않아야 한다.

---

## 3. Materials and Methods / 재료 및 방법

Materials and Methods는 하나의 큰 문단으로 보지 않고 하위 블록으로 나눈다.

| 하위 블록 | 자동화 단계 | 현재 상태 |
|---|---|---|
| Study design / 연구 설계 | 후순위 | 사용자 확인 필요 |
| Materials / 재료·시료·생물종 | 후순위 | source contract 1차 구현 |
| Sampling / 시료 채집·측정 | 후순위 | 사용자 확인 필요 |
| Preprocessing / 전처리 | 중간 | source contract 1차 구현 |
| Statistical methods / 통계 분석 방법 | 우선 | 구현 진행 중 |
| Software / 소프트웨어 provenance | 우선 | 부분 자동화 가능 |

### 3-1. Study Design

자동 작성 가능:

- 사용자가 입력한 연구 설계 설명의 문체 정리
- source metadata에 명시된 연구 유형 라벨

사용자 확인 필요:

- 무작위 배정 여부
- 반복측정/독립표본 여부
- 대조군/처리군 정의
- 연구 기간/장소/환경

금지:

- 무작위 배정, 눈가림, 사전 계획 분석 자동 주장
- 인과 설계 자동 추론

Gate:

- `needs-review`: 연구 설계 설명이 비어 있는 경우
- `blocked`: 설계 정보가 필요한 템플릿인데 source가 없는 경우

테스트 기준:

- 설계 입력 없이 random/blind/preregistered 표현이 나오면 실패

### 3-2. Materials / Samples

자동 작성 가능:

- 프로젝트 entity에 저장된 생물종명, 시료명, 데이터 파일명
- 검증된 taxonomy/species checker 결과
- 표본 수, 그룹 수

사용자 확인 필요:

- 시료 채집 위치
- 시료 보관 조건
- 장비/시약/실험 조건
- 윤리 승인/허가 정보

금지:

- 장비명, 시약명, 승인번호 자동 생성
- 종 동정이 검증되지 않았는데 확정 표현 사용

Gate:

- `needs-review`: 종/시료 source는 있으나 채집/실험 조건이 없는 경우
- `blocked`: 종명 검증이 필요한 문장인데 검증 상태가 missing/failed인 경우

테스트 기준:

- 검증되지 않은 species source는 확정 species 문장에 사용하지 않는다.
- 장비/시약/승인번호는 명시 입력 없이 생성하지 않는다.

### 3-3. Preprocessing

자동 작성 가능:

- 실제 저장된 전처리 step
- 결측 개수, 중복 행 개수, 제거/대체 기록
- 변수 변환/표준화가 pipeline에 기록된 경우
- 검증 결과 결측치가 0개인 경우의 결측 없음 문장

사용자 확인 필요:

- 전처리 선택 이유
- 이상치 제거 기준
- 결측 처리 방식
- 분석 제외 기준

금지:

- 이상치 제거 자동 주장
- MCAR/MAR 같은 결측 메커니즘 자동 주장
- 변환/표준화 자동 주장

Gate:

- `needs-review`: 결측 또는 전처리 기록은 있으나 처리 이유가 없는 경우
- `blocked`: 데이터 검증 오류가 남아 있는 경우
- `ready`: 검증 결과 결측치가 0개이거나, 결측 처리 방식이 사용자 입력으로 확인된 경우

테스트 기준:

- 결측값이 0개이면 결측 처리 항목은 complete로 본다.
- 결측값이 있는데 handling note가 없으면 `needs-review`가 되어야 한다.
- validation error가 있으면 Methods 본문 생성이 막혀야 한다.

### 3-4. Statistical Methods

자동 작성 가능:

- 분석 방법명
- 변수 역할
- 표본 수/집단 수
- 유의수준
- 실제 수행된 가정 검정명과 결과
- 결과에 저장된 사후검정 보정 방법
- BioHub/SciPy/statsmodels/pingouin provenance

사용자 확인 필요:

- 분석 방법 선택 이유
- 결측 처리 방식
- 가정 위반 시 분석 유지/대안 선택 이유
- 사후검정 보정 방법이 결과에 없을 때의 실제 보정 방법

금지:

- 모든 가정 충족 자동 주장
- 특정 보정 방법 자동 추론
- 정확한 라이브러리 버전 꾸며 쓰기
- 통계 결과만으로 연구 설계 주장

Gate:

- `blocked`: 변수 role 없음, validation error 있음, post-hoc 결과가 있는데 보정 방법 없음
- `needs-review`: 연구 목적/데이터 설명/결측 처리/가정 판단이 부족한 경우
- `ready`: 필수 role과 검증 결과가 있고 사용자 책임 항목이 확인된 경우

테스트 기준:

- `methods-readiness.test.ts`: `ready / needs-review / blocked` 분기
- `paper-draft-service.test.ts`: blocked일 때 Methods 본문 미생성
- `study-schema.test.ts`: source fingerprint, 변수 role, validation metadata 보존
- 가정 위반 + 사용자 판단 없음은 `needs-review`로 남고, 사용자 판단이 있으면 complete가 되어야 한다.
- 결측값 + 처리 방식 없음은 `needs-review`로 남고, validation error는 본문 생성을 막아야 한다.
- 사후검정 결과 + 보정 방법 없음은 Methods를 `blocked`로 막아야 한다.

---

## 4. Results / 결과

### 자동 작성 가능

- 통계량, 자유도, p-value
- 효과크기
- 신뢰구간
- 집단별 기술통계
- 사후검정 결과
- 표/그림 번호와 source 연결

### 사용자 확인 필요

- 결과 해석의 생물학적 의미
- 주요 결과의 우선순위
- 결과를 어떤 figure/table과 연결할지
- 비유의 결과를 어느 정도 서술할지

### 금지

- p-value와 반대되는 유의성 표현
- 효과크기 해석 기준이 없는데 강도 단정
- 인과적 결과 표현
- figure/table에 없는 결과 언급

### Gate

- `blocked`: 핵심 통계량 또는 p-value가 없음
- `needs-review`: effect size 또는 CI가 없어 결과 문장이 축약되는 경우
- `needs-review`: post-hoc 결과는 있으나 보정 방법이 없어 수치 기반 초안만 허용하는 경우
- `ready`: 통계량, p-value, source provenance가 모두 있는 경우

### 테스트 기준

- 숫자 포맷이 APA 규칙을 따른다.
- p-value 유의성 판단과 문장이 모순되지 않는다.
- 보정 방법이 없는 post-hoc 결과는 Results 본문 생성을 막지 않지만 `missing-post-hoc-method` review gate를 남겨야 한다.
- source가 없는 figure/table reference를 만들지 않는다.

---

## 5. Captions / Tables / Figures

### 자동 작성 가능

- Figure/Table 번호 후보
- 그래프 유형 기반 caption
- 축 변수, 단위, 집단 라벨
- 표에 포함된 통계량 설명

### 사용자 확인 필요

- figure가 말하고자 하는 핵심 메시지
- panel 구성 설명
- 이미지 처리/현미경/장비 조건
- 저널별 caption 스타일

### 금지

- figure에 없는 패턴 설명
- panel label 자동 생성 후 실제 이미지와 불일치
- 실험 장비/배율/염색법 자동 생성

### Gate

- `blocked`: chart/figure source가 없는데 figure caption을 만들려는 경우
- `needs-review`: caption message 또는 panel 설명이 부족한 경우
- `ready`: figure/table source와 변수 metadata가 있는 경우

### 테스트 기준

- caption의 변수명/단위가 source metadata와 일치한다.
- 없는 panel label을 생성하지 않는다.
- figure/table provenance가 유지된다.

---

## 6. Discussion / 고찰

### 자동 작성 가능

- 결과 요약의 보조 초안
- 사용자가 선택한 핵심 결과의 문체 정리
- 가정 위반/결측/제한점 메모 기반 limitation 초안

### 사용자 확인 필요

- 생물학적 의미 해석
- 선행연구와의 비교
- novelty 주장
- 한계점의 중요도
- 향후 연구 제안

### 금지

- 강한 생물학적 결론 자동 생성
- 검증되지 않은 문헌 인용
- novelty/first report 자동 주장
- 결과에 없는 메커니즘 설명

### Gate

- `blocked`: citation이 필요한 문장인데 검증된 문헌 source가 없는 경우
- `needs-review`: 결과 요약은 있으나 사용자 해석 메모가 없는 경우
- `ready`: 핵심 결과, limitation, 검증된 citation이 있는 경우

### 테스트 기준

- Discussion은 source 없는 citation을 생성하지 않는다.
- 통계 결과에 없는 내용을 핵심 결론으로 만들지 않는다.
- limitation source가 있으면 숨기지 않는다.

---

## 7. References / 참고문헌

### 자동 작성 가능

- 사용자가 추가한 문헌 metadata 정리
- DOI/PMID/arXiv 등 검증된 identifier 기반 reference formatting
- 중복 reference 병합

### 사용자 확인 필요

- 실제 인용 여부
- 문헌의 주장과 본문 문장의 연결
- 저널 스타일

### 금지

- 존재하지 않는 문헌 생성
- DOI/PMID 꾸며 쓰기
- 본문에 없는 reference 자동 추가

### Gate

- `blocked`: identifier 검증 실패 reference를 확정 참고문헌으로 넣으려는 경우
- `needs-review`: metadata 일부가 비어 있는 경우
- `ready`: identifier와 metadata가 검증된 경우

### 테스트 기준

- identifier 없는 문헌은 verified reference로 취급하지 않는다.
- 중복 reference 병합 시 source id가 보존된다.
- 본문 citation과 reference list가 불일치하지 않아야 한다.

---

## 8. 구현/테스트 매핑

| 섹션 | 범위 SSOT | readiness/gate | 주요 테스트 |
|---|---|---|---|
| Introduction | 예정 | 예정 | citation hallucination, user edit 보존 |
| Materials | 예정 | 예정 | species/source 검증, 장비/시약 자동 생성 금지 |
| Preprocessing | `preprocessing-source-contract.ts` | `methods-readiness.ts`의 validation/missing-data gate | `preprocessing-source-contract.test.ts`, `study-schema.test.ts`, `methods-readiness.test.ts` |
| Statistical Methods | `methods-scope.ts` | `methods-readiness.ts` | `methods-readiness.test.ts`, `paper-draft-service.test.ts` |
| Materials | `materials-source-contract.ts` | `methods-readiness.ts`의 `unverified-species-source` gate | `materials-source-contract.test.ts`, `study-schema.test.ts`, `methods-readiness.test.ts` |
| Results | `results-scope.ts` | `results-readiness.ts` | `results-scope.test.ts`, `results-readiness.test.ts`, `paper-templates.test.ts` |
| Captions | `captions-scope.ts` | `captions-readiness.ts` | `captions-scope.test.ts`, `captions-readiness.test.ts`, `paper-templates.test.ts` |
| Discussion | 예정 | 예정 | citation 검증, limitation 반영 |
| References | `citation-source-contract.ts` | `citation-source-contract.ts` | identifier/summary 검증, 중복 병합 |

---

## 9. 다음 정리 순서

1. 핵심 작성 엔진은 1차 완료 상태로 본다: Methods/Results/Captions, Materials/Samples, Preprocessing, Citation source contract, authoring provenance, analysis draft adapter.
2. `Introduction/Discussion/References`는 citation 검증 체계와 사용자 해석 메모가 충분할 때 전용 작성 범위를 확장한다.
3. Bio-Tools/유전적 분석 supplementary 결과는 `document-writing-supplementary-policy.ts`의 승격 정책을 따른다.
4. `ReportComposer`와 `PackageBuilder`는 자료 작성 엔진이 아니라 주변 도구 UX/정보구조 정리로 별도 취급한다.

Supplementary writer 승격 순서:

| 단계 | 대상 | 기준 |
|---|---|---|
| 전용 writer 유지 | `blast-result`, `bold-result`, `protein-result`, `seq-stats-result`, `translation-result`, `similarity-result`, `phylogeny-result` | 이미 구조화된 전용 writer와 테스트 경로가 있음. `phylogeny-result`는 방법·입력 요약만 허용 |
| 개별 승격 | `bio-tool-result` 중 `alpha-diversity` | `AlphaDiversityResult` 타입 가드 후 site/species count, Shannon/Simpson 등 지수 요약, 사이트별 주요 수치만 요약 |
| 개별 승격 | `bio-tool-result` 중 `beta-diversity` | `BetaDiversityResult` 타입 가드 후 distance metric, site labels, 쌍별 거리만 요약 |
| 개별 승격 | `bio-tool-result` 중 `condition-factor` | `ConditionFactorResult` 타입 가드 후 K 기술통계, 그룹별 기술통계, 선택적 비교 검정 수치만 요약 |
| 개별 승격 | `bio-tool-result` 중 `fst` | `FstResult` 타입 가드 후 Global Fst, pairwise matrix, population labels, permutation/bootstrap 수치만 요약 |
| 개별 승격 | `bio-tool-result` 중 `hardy-weinberg` | `HardyWeinbergResult` 타입 가드 후 allele frequency, observed/expected counts, chi-square/exact p-value 수치만 요약 |
| 개별 승격 | `bio-tool-result` 중 `icc` | `IccResult` 타입 가드 후 ICC type, ICC, CI, F/df/p, mean squares, 대상 수/평가자 수만 요약 |
| 개별 승격 | `bio-tool-result` 중 `length-weight` | `LengthWeightResult` 타입 가드 후 회귀 방정식, a/b, b SE, R², 등성장 검정 t/p, N만 요약 |
| 개별 승격 | `bio-tool-result` 중 `mantel-test` | `MantelResult` 타입 가드 후 Mantel r, p-value, permutations, method만 요약 |
| 개별 승격 | `bio-tool-result` 중 `meta-analysis` | `MetaAnalysisResult` 타입 가드 후 pooled effect, CI, z/p, Q/Q p, I²/τ², study-level effect/CI/weight만 요약 |
| 개별 승격 | `bio-tool-result` 중 `nmds` | `NmdsResult` 타입 가드 후 stress, 차원 수, 지점 수, optional group count, 좌표만 요약 |
| 개별 승격 | `bio-tool-result` 중 `permanova` | `PermanovaResult` 타입 가드 후 pseudo-F, p-value, R², permutations, SS 항목만 요약 |
| 개별 승격 | `bio-tool-result` 중 `rarefaction` | `RarefactionResult` 타입 가드 후 curve count, site labels, 곡선별 최종 n/expected species/point count만 요약 |
| 개별 승격 | `bio-tool-result` 중 `roc-auc` | `RocAucResult` 타입 가드 후 AUC, AUC CI, threshold, sensitivity, specificity, ROC point count만 요약 |
| 개별 승격 | `bio-tool-result` 중 `survival` | `SurvivalResult` 타입 가드 후 Kaplan-Meier 곡선 수, log-rank p-value, 중앙 생존 시간, 그룹별 N/event/censor/endpoint 수치만 요약 |
| 개별 승격 | `bio-tool-result` 중 `vbgf` | `VbgfResult` 타입 가드 후 L∞, K, t₀, parameter table, R²/AIC, predicted/residual counts, N만 요약 |
| generic 유지 | `bio-tool-result` 중 `species-validation` | coming-soon 상태이고 result schema/API provenance가 없으므로 broad writer 금지. 실제 schema와 테스트가 생길 때까지 입력 파일 fallback만 허용 |

`species-validation`은 별도 예외로 관리한다. 실제 API result schema, status enum, match confidence, database provenance, protected-species fields가 고정되기 전까지는 전용 writer로 승격하지 않는다.

전용/제한 writer 판단 기준:

| 구분 | 사용 조건 | 허용 출력 | 금지 |
|---|---|---|---|
| 전용 writer | 결과 타입별 저장 스키마가 안정적이고, 저장된 값만으로 타입별 요약이 가능함 | source-backed 수치, 상태, 식별 후보, 기술통계 | source에 없는 생물학적 의미, novelty, causal claim |
| 제한 writer | 타입별 writer는 필요하지만 저장된 값이 해석까지 뒷받침하지 못함 | 입력/처리/방법/기술통계 요약 | 기능 추론, 확정 동정, clade/support, 종 경계, topology 해석 |
| generic fallback | source snapshot이 없거나 broad 타입의 result schema가 `unknown`임 | entity label, 원본 제목, 검증된 최소 요약 | 결과 수치 생성, 해석 문장, 새 figure/table/citation 참조 |

현재 제한 writer로 취급하는 항목:

| 타입 | 제한 이유 | 허용 범위 |
|---|---|---|
| `translation-result` | ORF annotation이나 protein function source가 없음 | sequence length, genetic code, analysis mode, ORF count |
| `similarity-result` | distance matrix 결과가 종 경계나 clustering 해석을 직접 보장하지 않음 | sequence count, distance model, alignment length, mean distance |
| `phylogeny-result` | topology, clade, bootstrap/support source가 없음 | sequence count, tree method, distance model, alignment length |

Generic fallback 경계:

- 원본 entity label과 검증된 수치 요약만 사용한다.
- 분석 방법 선택 이유, 생물학적 의미, novelty, causal language는 생성하지 않는다.
- figure/table/citation이 없는 상태에서 해당 참조를 새로 만들지 않는다.
- 전용 writer 승격 전에는 결과 구조를 타입 가드와 회귀 테스트로 먼저 고정한다.

향후 writer 추가 체크리스트:

- result schema가 `unknown`이면 broad writer를 만들지 않는다.
- source snapshot이 없을 때 label fallback만 출력되는지 테스트한다.
- 전용 writer가 generic fallback보다 먼저 dispatch되는지 테스트한다.
- ko/en 출력 또는 최소한 언어별 label이 깨지지 않는지 확인한다.
- 금지 해석 문구가 출력되지 않는지 negative assertion을 둔다.
- Bio-Tools는 `BioToolId`별 타입 가드와 export table 기반 요약을 우선한다.
- Alpha Diversity writer는 site/species count, 지수 요약, 사이트별 주요 수치만 사용한다. diversity의 높고 낮음, 생태학적 의미, 군집 차이는 source 없이 생성하지 않는다.
- Beta Diversity writer는 distance metric, site labels, 쌍별 거리만 사용한다. clustering, group separation, ecological distance interpretation은 source 없이 생성하지 않는다.
- Condition Factor writer는 K 기술통계와 비교 검정 수치만 사용한다. condition의 좋고 나쁨, 생리 상태, 그룹 차이 유의성 해석은 source 없이 생성하지 않는다.
- Fst writer는 `interpretation` 문자열을 자동 본문에 사용하지 않는다. 분화 강도 해석은 사용자 확인 또는 별도 검증된 기준이 있을 때만 확장한다.
- Hardy-Weinberg writer는 `interpretation` 문자열과 평형/이탈 판정 문구를 자동 본문에 사용하지 않는다. 판정 문장은 사용자 확인 또는 별도 검증된 기준이 있을 때만 확장한다.
- ICC writer는 `interpretation` 문자열과 신뢰도 품질 판정을 자동 본문에 사용하지 않는다. ICC type, ICC, CI, F/df/p, mean squares, 대상 수/평가자 수만 제공한다.
- Length-Weight writer는 `growthType` 판정과 등성장 유의성 판단 문구를 자동 본문에 사용하지 않는다. 회귀 계수와 검정 통계량 수치만 제공한다.
- Mantel Test writer는 상관 강도, 유의성, 거리 행렬 간 생물학적 의미 또는 인과 해석을 자동 본문에 사용하지 않는다. permutation correlation 결과 수치만 제공한다.
- Meta-Analysis writer는 효과의 의미, 유의성, 이질성 높고 낮음, 모델 선택 해석을 자동 본문에 사용하지 않는다. 통합 및 study-level 수치만 제공한다.
- NMDS writer는 `stressInterpretation` 문자열, 군집 분리, gradient, 생태학적 의미 해석을 자동 본문에 사용하지 않는다. stress와 좌표 수치만 제공한다.
- PERMANOVA writer는 집단 차이 유의성, effect interpretation, group factor 의미 해석을 자동 본문에 사용하지 않는다. permutation 결과 수치만 제공한다.
- Rarefaction writer는 표본 충분성, 포화 여부, richness 해석을 자동 본문에 사용하지 않는다. 곡선 endpoint와 point count만 제공한다.
- ROC-AUC writer는 진단 성능 우수/불량, 임상적 유용성, 최적 cut-off 해석을 자동 본문에 사용하지 않는다. threshold는 중립 라벨로만 표기하고 ROC 수치 요약만 제공한다.
- Survival writer는 그룹 간 차이 유의성, 생존 우수/불량, 치료 효과 또는 위험 해석을 자동 본문에 사용하지 않는다. Kaplan-Meier 곡선과 log-rank p-value의 수치 요약만 제공한다.
- VBGF writer는 성장 양상 평가, 생물학적 의미, 모델 적합성 좋고 나쁨 해석을 자동 본문에 사용하지 않는다. 파라미터, 적합도 수치, 예측/잔차 개수, 관측치 수만 제공한다.
- Species Validation은 현재 전용 writer를 두지 않는다. 실제 API result schema, status enum, match confidence, database provenance, protected-species fields가 고정되기 전에는 학명 확정, 보호종 여부, 매칭 신뢰도 문장을 자동 생성하지 않는다.
- Bio-Tools가 추가/삭제되면 `BIO_TOOL_SUPPLEMENTARY_WRITER_POLICY_BY_TOOL`을 먼저 갱신한다. 새 도구는 기본적으로 `generic-only`로 등록하고, 타입 가드와 테스트가 준비된 뒤 `candidate` 또는 `dedicated`로 승격한다.
