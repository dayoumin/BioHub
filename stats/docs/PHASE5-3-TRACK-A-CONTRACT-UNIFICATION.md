# Phase 5-3 Track A: 결과 계약 통합

## 배경

현재 결과 계약이 아래 3계층에 분산되어 있습니다.

1. Generated 타입 (`lib/generated/method-types.generated.ts`)
2. Executor 결과 (`lib/services/executors/types.ts`)
3. UI 결과 (`types/smart-flow.ts`)

이 분산 구조는 필드 누락/alias 중복/타입 드리프트를 유발합니다.

---

## 목표

1. method별 결과 필드의 단일 출처(Source of Truth) 정의
2. `ExecutorResult -> UI AnalysisResult` 변환 경로 단일화
3. 새 메서드 추가 시 계약 갱신을 강제하는 체크 도입

---

## 범위

- 포함:
  - `lib/services/executors/*`
  - `lib/services/statistical-executor.ts`
  - `lib/utils/result-transformer.ts`
  - `types/smart-flow.ts`
- 제외:
  - Python Worker 계산 로직 변경
  - UI 디자인 변경

---

## 작업 단계

### A1. 계약 맵 작성
- 파일: `docs/RESULT_CONTRACT_MAP.md` (신규)
- 내용: method별 필수/선택/alias 필드, 출처 계층, 변환 책임 위치
- 상태: ✅ 초안 작성 및 핵심 메서드 반영 완료

### A2. 변환 책임 정리
- 원칙:
  - Generated: Worker 계약 반영
  - Executor: 계산 결과 조합/도메인 해석
  - Transformer: UI 호환 필드 매핑
- 중복 alias(`adjRSquared` 등) 정책 명시
- 상태: ✅ 1차 반영 완료 (PCA/Cluster/Normality 경로 우선)

### A3. 정적 검증 도입
- 방법 후보:
  - 타입 테스트(dts test 또는 ts compile assertion)
  - 스키마 기반 필드 체크 스크립트
- CI에서 변경 파일 영향 검증 수행
- 상태: ✅ 스크립트 도입 + CI 워크플로 연결 완료
  - 스크립트: `scripts/statistics/validate-result-contracts.ts`
  - 명령: `pnpm validate:result-contracts`
  - 워크플로: `.github/workflows/result-contract-guard.yml`

---

## 완료 기준

1. method 계약 맵 문서가 생성되고 리뷰 완료됨
2. 중복 필드/불명확 alias 목록이 해소되거나 TODO로 추적됨
3. 계약 검증 스크립트 또는 타입 테스트가 CI에 연결됨

---

## 현재 체크포인트 (2026-02-19)

1. A1: 완료
2. A2: 핵심 메서드(PCA/Factor/Cluster/Normality/Correlation + ANOVA Bonferroni fallback) 우선 완료
3. A3: 로컬 가드 + 경로 기반 CI 검증 워크플로 추가 완료
