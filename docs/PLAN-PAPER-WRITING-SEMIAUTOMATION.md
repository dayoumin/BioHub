# BioHub 논문 작성 반자동화 계획

**작성일**: 2026-04-27
**목적**: Analysis 결과를 논문용 산출물로 승격해 Methods/Results 중심의 반자동 작성 기능 범위를 정의한다.
**관련 조사**: [RESEARCH-AI-SCIENTIST-2026.md](./RESEARCH-AI-SCIENTIST-2026.md)

---

## 1. 방향 정리

BioHub의 현실적인 목표는 연구 전 과정을 자동화하는 것이 아니라, 연구자가 이미 확보한 데이터와 분석 결과를 바탕으로 논문 작성의 반복 작업을 줄이는 것이다.

- 지향: `분석 + 해석 + 문서화`의 반자동화
- 비지향: 연구 질문의 참신성 판단, 생물학적 의미의 강한 해석, 과장된 Discussion 자동 생성
- 포지셔닝: `AI Scientist`가 아니라 `검증 가능한 연구 작성 보조 시스템`

핵심 메시지:

> BioHub는 연구를 대신 수행하는 시스템이 아니라, 분석 산출물을 구조화해 논문 작성의 반복 작업을 줄이고 연구자의 판단을 강화하는 반자동화 도구다.

---

## 2. 왜 완전자동화가 아니라 반자동화인가

Sakana AI의 2026 Nature 논문은 아이디어 생성, 코드 작성, 계산 실험, 논문 작성, 자동 리뷰를 하나의 파이프라인으로 묶었지만, 적용 대상이 주로 `컴퓨터 안에서 닫히는 ML 연구`에 한정되어 있다.

BioHub의 실제 사용 맥락에서는 아래 항목이 여전히 사람 판단에 크게 의존한다.

- 연구 질문의 타당성
- 데이터 수집 과정의 신뢰성
- 변수 정의와 전처리의 적절성
- 통계 가정 위반의 맥락적 해석
- 생물학적 의미 해석
- 최종 주장 수위 조절

따라서 BioHub는 `Methods`, `Results`, `Figure/Table caption`, `체크리스트`, `제한점 초안`처럼 형식화 가능한 산출물에 집중하는 편이 제품 적합성이 높다.

---

## 3. 제품 범위

### 3.1 자동화 우선 범위

- 분석 방법 설명 초안
- 결과 문장 자동 생성
- 표/그림 캡션 자동 생성
- 통계 결과 요약 카드
- 보고 체크리스트 자동 생성
- 가정 위반/주의사항 기반 limitation 초안

### 3.2 보조 초안까지만 허용할 범위

- Abstract 초안
- Discussion 초안
- Related work 비교 문장

### 3.3 기본 비범위

- 연구 novelty 주장 자동화
- 인과 해석 자동화
- 생물학적 의미의 강한 결론 자동 생성
- 문헌 인용을 동반한 장문 Discussion 완전자동화

---

## 4. 입력 스키마 요구사항

`통계 결과만 있으면 나머지를 자동으로 쓴다`는 접근은 품질이 불안정하다. 문서 생성을 위해서는 결과값 외에도 연구 메타데이터가 필요하다.

필수 입력:

- 연구 제목 또는 작업 제목
- 연구 질문
- 가설
- 데이터셋/집단 설명
- 변수 역할 (`independent`, `dependent`, `group`, `covariate` 등)
- 표본수
- 결측 처리 방식
- 분석 방법
- 분석 방법 선택 이유
- 통계량
- p-value
- effect size
- confidence interval
- 가정 점검 결과
- 다중비교 여부와 보정 방식

권장 입력:

- Figure/Table 번호 체계
- 저널 스타일 또는 출력 포맷
- 결과 해석 톤
- 제한점 메모

---

## 5. 출력 산출물

### Phase 1

- Methods 초안
- Results 초안
- Figure caption 초안
- Table footnote 초안

### Phase 2

- Abstract 초안
- Statistical reporting checklist
- Limitation 초안

### Phase 3

- Project 단위 paper package 조립
- 섹션별 재생성
- 저널 포맷별 문체 변환

---

## 6. 신뢰성 설계 원칙

자동 생성 전 검증 게이트가 필요하다. 아래 조건이 충족되지 않으면 생성보다 보완 입력을 우선해야 한다.

- 변수 role 누락 금지
- 분석 방법과 변수 구조 mismatch 금지
- effect size 누락 시 경고
- 가정 점검 미실시 시 경고
- 다중비교 보정 필요 여부 누락 시 경고
- 결측 처리 정보 누락 시 경고
- 표본수 정보 누락 시 경고

각 문장은 근거를 추적 가능해야 한다.

예시:

- 이 Results 문장은 ANOVA의 `F`, `p`, `etaSquared`에서 생성됨
- 이 limitation 문장은 normality warning과 unequal variance 경고에서 생성됨

즉, 생성 결과는 단순 텍스트가 아니라 `문장 + provenance` 형태여야 한다.

---

## 7. 보수적 자동화 원칙

BioHub의 논문 작성 자동화는 `많이 써주는 AI`가 아니라 `틀린 말을 하지 않는 작성 보조 시스템`을 기본 원칙으로 한다.

- 현재는 보수적으로 작성하고, 사용자가 확인한 입력과 검증된 분석 결과가 쌓이면 자동화 범위를 단계적으로 넓힌다
- 시스템이 모르는 연구 설계, 결측 처리, 전처리, 제외 기준, 분석 선택 이유는 추론하지 않는다
- 자동 작성이 가능한 항목과 사용자 확인이 필요한 항목을 명확히 분리한다
- 필수 근거가 없는 문장은 생성하지 않고 `blocked` 또는 `needs-review`로 표시한다
- 초안은 최종 문장이 아니라 `검토 가능한 초안`으로 제공하며, 사용자가 확인 후 문서에 반영한다
- 자동화 수준을 높일 때도 먼저 provenance, 재생성 가능성, 사용자 책임 경계를 유지한다

이 원칙은 Methods에만 한정하지 않는다. Results, caption, limitation, abstract로 확장할 때도 동일하게 적용한다.

---

## 8. 추천 UX 흐름

1. 사용자가 데이터 업로드 후 Analysis 실행
2. 시스템이 분석 결과를 기반으로 `study schema` 초안 생성
3. 부족한 메타데이터만 짧게 보완 입력 받음
4. 생성 가능한 섹션 목록을 제시
5. Methods/Results/caption을 먼저 생성
6. Discussion/Abstract는 보조 초안으로만 생성
7. 각 문장에 근거 연결과 경고 배지를 표시

추천 UI 단위:

- `Paper Draft Builder`
- `Study Metadata Form`
- `Reporting Checklist Panel`
- `Provenance Drawer`

---

## 9. 현재 프로젝트 기준 우선 구현안

### 우선순위 A

- Analysis 결과 객체에 논문 작성용 메타 필드 추가
- 공통 `study schema` 타입 정의
- Methods 자동 생성기
- Results 자동 생성기

현재 저장 위치 원칙:

- 프로젝트 전역 기본값은 `Project.paperConfig`
- 분석별 사용자 확인 입력은 `HistoryRecord.paperDraft.context`가 원본이다
- `StudySchema`는 `DraftContext + AnalysisResult + 변수 매핑 + 옵션`에서 파생되는 버전형 생성 스냅샷이다
- 문서 단위 반자동 작성 상태는 `DocumentBlueprint`가 소유하되, 여러 분석을 포함할 수 있으므로 단일 `metadata.studySchema`를 문서 전체 원본으로 쓰지 않는다
- 별도 `ProjectEntityKind` 추가 없이 기존 `draft` 엔티티 흐름 재사용

2026-04-29 구현 메모:

- `StudySchema` 타입과 `buildStudySchema()` 추가
- `PaperDraft.studySchema`로 결과 패널/히스토리 초안 생성 입력 보존
- `generatePaperDraftFromSchema()` 추가, 기존 `generatePaperDraft()` API는 호환 어댑터로 유지
- stale schema 재사용 방지를 위해 method/history/project/file identity와 `sourceFingerprint` 검증 추가
- `generatePaperDraftFromSchema()` 직접 호출 시 언어/분석 방법/데이터 소스/핵심 결과 불일치 차단
- 문서 작성 경로는 저장된 `PaperDraft` 언어가 요청 언어와 다르면 재생성
- Methods UX 계약 추가: `ready / needs-review / blocked` 준비도, 체크리스트, 사용자 확인 질문을 `StudySchema`에서 파생
- `DocumentBlueprint.metadata.studySchema`와 `generatedArtifacts` 타입 및 metadata 정규화 추가. 단, 다중 분석 문서에서는 단일 `studySchema` 연결을 보류하고 `historyId`별 schema/provenance 구조를 별도로 설계한다

### Methods 사용자 경험 원칙

- 버튼 라벨은 `자동 작성 완료`가 아니라 `검토 가능한 Methods 초안` 기준으로 둔다
- 필수 정보가 없으면 초안을 생성하지 않고 `blocked`로 표시한다
- 결측 처리, 가정 점검, 연구 목적처럼 사용자가 책임져야 할 항목은 추론하지 않고 짧은 확인 질문으로 받는다
- 초안 문서는 바로 삽입하지 않고 사용자가 확인 후 반영하게 한다
- Methods 준비도는 문서 원본이 아니라 `StudySchema`에서 파생되는 UX 상태로 취급한다

### 우선순위 B

- figure/table caption 생성기
- 가정 위반 기반 limitation 초안
- 결과 문장별 provenance 표시

### 우선순위 C

- project entity와 연결되는 paper package
- journal/report template 선택
- 섹션별 재생성 및 비교

---

## 10. 성공 기준

- 사용자가 통계 결과를 복붙하지 않고 초안을 바로 얻는다
- 결과 문장이 숫자와 모순되지 않는다
- 가정 위반이 있을 때 이를 숨기지 않는다
- Methods/Results 작성 시간이 유의미하게 줄어든다
- 과장된 해석보다 보수적이고 검증 가능한 초안이 생성된다

---

## 11. 결론

BioHub에서 참고해야 할 핵심은 `AI Scientist처럼 전 과정을 자율화한다`가 아니라, `분석 결과를 구조화된 논문용 artifact로 바꾸고 신뢰성 높은 반자동 작성 흐름을 만든다`는 점이다.

가장 먼저 제품화할 만한 것은 다음 세 가지다.

- Methods 자동 작성
- Results 자동 작성
- Figure/Table caption 자동 작성

이 세 가지는 사용자가 즉시 가치를 느끼기 쉽고, 완전자동화보다 실패 비용이 낮으며, 현재 Analysis 중심 아키텍처와도 잘 맞는다.
