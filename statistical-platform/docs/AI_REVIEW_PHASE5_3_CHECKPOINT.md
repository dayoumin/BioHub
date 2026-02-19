# AI Review Checkpoint: Phase 5-3 (2026-02-19)

## 목적

외부 AI 리뷰를 빠르게 받기 위한 중간 체크포인트 문서입니다.  
이번 체크포인트는 `pyodide-statistics` 안정화 + Track A(결과 계약 통합) 초기 가드 도입까지 포함합니다.

---

## 이번 체크포인트 결론

1. 단기 안정화(S1/S2/S3)는 코드와 테스트 기준으로 유효함
2. Track B(v2 레지스트리 메타) 최소 확장은 이미 반영됨
3. Track A의 "계약 검증 자동화"는 1차 도입 완료 (`validate:result-contracts`)
4. Track A 계약 가드를 위한 CI 워크플로 초안이 추가됨 (`result-contract-guard.yml`)
5. 남은 핵심은 "범위 확장(상관/Bonferroni)" + "브랜치 보호 규칙 연동 확인"

---

## 리뷰 대상 파일(핵심만)

### 계약/실행 경로
- `lib/services/pyodide-statistics.ts`
- `lib/services/pyodide-statistics.adapters.ts`
- `lib/services/statistical-executor.ts`
- `lib/utils/result-transformer.ts`
- `types/smart-flow.ts`
- `lib/validation/result-schema-validator.ts`

### 레지스트리/스키마
- `lib/constants/methods-registry.schema.json`
- `lib/constants/methods-registry.types.ts`
- `lib/constants/methods-registry.json`

### 검증 자동화
- `scripts/statistics/validate-result-contracts.ts`
- `package.json` (`validate:result-contracts`)
- `.github/workflows/result-contract-guard.yml`

### 계획/계약 문서
- `docs/PHASE5-3-PLAN.md`
- `docs/PHASE5-3-TRACK-A-CONTRACT-UNIFICATION.md`
- `docs/PHASE5-3-TRACK-B-REGISTRY-V2.md`
- `docs/RESULT_CONTRACT_MAP.md`

### 회귀 테스트
- `__tests__/services/pyodide-statistics-regression-fixes.test.ts`
- `__tests__/services/executors/statistical-executor-routing.test.ts`
- `__tests__/unit/result-transformer.test.ts`
- `__tests__/lib/validation/result-schema-validator.test.ts`

---

## 핵심 변경 요약

1. `clusterAnalysis` alias 후처리를 adapter로 분리 (`clusterAnalysisAdapter`)
2. executor PCA 경로를 `pcaAnalysis`로 통일하고 퍼센트(0~100) → 비율(0~1) 정규화
3. `result-transformer`에 `additional.isNormal` 매핑 추가
4. validator에 메서드별 필수 필드(`METHOD_REQUIRED_FIELDS`) 추가
- `pca`: `explainedVarianceRatio`, `eigenvalues`
- `factor-analysis`: `explainedVarianceRatio`, `loadings`, `communalities`
- `cluster-analysis`: `clusters`, `centers`, `silhouetteScore`
- `normality-test`/`shapiro-wilk`: `isNormal`
 - `correlation`/`pearson-correlation`: `rSquared`, `pearson`, `spearman`, `kendall`
 - `pearson`: `rSquared`
5. 레지스트리 스키마에 메타 필드(`status`, `since`, `replacement`, `notes`) 지원 추가
6. 계약 가드 스크립트 도입: 고위험 메서드의 category/required/source 정합 체크
 - 현재 커버리지: `correlation`, `pearson-correlation`, `pearson`, `normality-test`, `shapiro-wilk`, `pca`, `factor-analysis`, `cluster-analysis` + `bonferroni_correction` utility
7. ANOVA 사후검정 fallback에 `performBonferroni()`를 연결하고 `postHoc[]`를 표준 키(`pvalue`, `pvalueAdjusted`)로 정규화

---

## 실행 검증(최근 통과)

```bash
pnpm validate:result-contracts
pnpm test --run __tests__/lib/validation/result-schema-validator.test.ts
pnpm test --run __tests__/services/executors/statistical-executor-routing.test.ts
pnpm test --run __tests__/unit/result-transformer.test.ts
pnpm test --run __tests__/services/pyodide-statistics-regression-fixes.test.ts
pnpm test --run pyodide
```

메모:
- 저장소 전체 `tsc --noEmit`은 기존 베이스라인 에러가 있어 이번 체크포인트의 합격 기준으로 사용하지 않음
- 변경 범위 회귀 테스트 중심으로 판정

---

## 외부 AI 리뷰 요청 포인트

1. `METHOD_REQUIRED_FIELDS` + `validate-result-contracts.ts` 조합이 장기적으로 충분한지
2. PCA/Factor/Cluster의 `additional` 표준 키셋이 과소/과잉 요구인지
3. `normality` 계열에서 `isNormal`을 UI 계약 필수로 둔 판단의 적절성
4. `bonferroni_correction`(worker 유틸) vs `performBonferroni`(service orchestration) 명명/책임 분리 전략
5. CI 단계에서 어떤 레벨로 가드를 강제할지 (`PR required` vs `nightly`)

---

## 다음 작업(이어갈 항목)

1. `result-contract-guard`를 브랜치 보호의 required check로 지정
2. `bonferroni` 표준화 범위를 ANOVA 외 실행 경로까지 확장
3. `RESULT_CONTRACT_MAP`의 필드 수준 표를 method군별로 더 세분화

---

## 리뷰 시 주의사항

현재 저장소는 Phase 5-3 외 변경이 다수 섞여 있습니다.  
리뷰 시 위 "리뷰 대상 파일(핵심만)" 목록으로 범위를 제한해 주세요.
