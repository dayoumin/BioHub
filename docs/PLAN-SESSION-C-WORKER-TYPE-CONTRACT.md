# Session C: Worker 타입 계약 정비

**생성**: 2026-04-04
**범위**: Worker 1-2 (기술통계 + 가설검정) — 나머지 Worker 3-9는 후속 세션
**선행**: 없음 (독립 세션)

---

## 배경

결과 타입이 3곳에서 서로 다른 정의로 존재:

| 파일 | 타입 수 | 정본 여부 |
|------|---------|----------|
| `types/pyodide.d.ts` | 9개 Result | 사용 안 됨 (PyodideInterface만 import) |
| `types/pyodide-results.ts` | 39개 | 1곳만 import (`cross-tabulation/page.tsx`) |
| `lib/generated/method-types.generated.ts` | 84개 | **registry 기반 생성** — Python 실제 반환과 불일치 |

**정본 = Python Worker 실제 반환값** (`worker*.py`의 return dict).
Generated는 `methods-registry.json` 기반이라 Python과 동기화되지 않은 상태.

---

## C1a: Python ↔ Registry 불일치 전수 조사 결과

### Worker 1 (descriptive) — 8 MISMATCH / 5 MATCH

| # | 메서드 | 판정 | Registry | Python 실제 | 차이 |
|---|--------|------|----------|-------------|------|
| 1 | `descriptive_stats` | **MISMATCH** | 13필드 | 18필드 | Python에 `se, sem, confidenceLevel, ciLower, ciUpper` 추가 |
| 2 | `normality_test` | **MISMATCH** | `interpretation` | `alpha` | 키 자체가 다름 |
| 3 | `outlier_detection` | **MISMATCH** | `outlierValues, lowerBound, upperBound` | `outlierCount` | Registry에 없는 필드 3개 / Python에 없는 필드 3개 |
| 4 | `frequency_analysis` | MATCH | — | — | — |
| 5 | `crosstab_analysis` | MATCH | — | — | — |
| 6 | `one_sample_proportion_test` | **MISMATCH** | `pValue` 포함 | `pValue` 없음 | Python은 `pValueExact/pValueApprox`만 반환 |
| 7 | `cronbach_alpha` | MATCH | — | — | — |
| 8 | `kolmogorov_smirnov_test` | MATCH | — | — | — |
| 9 | `ks_test_one_sample` | **MISMATCH** | 5필드 | 10필드 | Python에 `testType, statisticKS, criticalValue, sampleSizes, distributionInfo` 추가 |
| 10 | `ks_test_two_sample` | **MISMATCH** | 5필드 | 10필드 | Python에 `testType, statisticKS, criticalValue, effectSize, sampleSizes` 추가 |
| 11 | `mann_kendall_test` | **MISMATCH** | `statistic, slope` | `zScore, senSlope, n` | 키 이름 불일치 + Python에 `n` 추가 |
| 12 | `bonferroni_correction` | **MISMATCH** | `adjustedPValues, significantResults, alpha, correctedAlpha` | `originalPValues, correctedPValues, adjustedAlpha, nComparisons, significant` | 거의 전면 불일치 |
| 13 | `means_plot_data` | MATCH* | — | — | *최상위 키는 일치하나 nested 구조는 registry 형식이 표현 불가 |

### Worker 2 (hypothesis) — 3 MISMATCH / 14 MATCH

| # | 메서드 | 판정 | Registry | Python 실제 | 차이 |
|---|--------|------|----------|-------------|------|
| 1 | `t_test_two_sample` | MATCH | — | — | — |
| 2 | `t_test_paired` | MATCH | — | — | — |
| 3 | `t_test_one_sample` | **MISMATCH** | 5필드 (`sampleStd, n` 포함) | 3필드 | Registry가 Python보다 많음 |
| 4 | `t_test_one_sample_summary` | MATCH | — | — | — |
| 5 | `t_test_two_sample_summary` | MATCH | — | — | — |
| 6 | `t_test_paired_summary` | MATCH | — | — | — |
| 7 | `z_test` | MATCH | — | — | — |
| 8 | `chi_square_test` | MATCH | — | — | — |
| 9 | `binomial_test` | MATCH | — | — | — |
| 10 | `correlation_test` | MATCH | — | — | — |
| 11 | `partial_correlation` | MATCH | — | — | — |
| 12 | `levene_test` | MATCH | — | — | — |
| 13 | `bartlett_test` | MATCH | — | — | — |
| 14 | `chi_square_goodness_test` | MATCH | — | — | — |
| 15 | `chi_square_independence_test` | MATCH | — | — | — |
| 16 | `fisher_exact_test` | **MISMATCH** | 2필드 | 10필드 | Python에 `reject, alternative, oddsRatioInterpretation, observedMatrix, expectedMatrix, rowTotals, columnTotals, sampleSize` 추가 |
| 17 | `power_analysis` | **MISMATCH** | flat 5필드 | nested 구조 (analysisType별 4 variant) | 구조 자체가 다름 |

**합계: 11건 MISMATCH** (W1: 8건, W2: 3건)

---

## C1a 수정 작업

### 방침

- **Python이 정본**. Registry를 Python에 맞춤.
- `t_test_one_sample`: Python에 `sampleStd, n` 추가가 더 나은 방향인지 판단 필요 → Python 쪽에 추가하는 게 소비자에게 유용.
- `power_analysis`: nested 구조는 registry의 flat returns 형식으로 표현 불가 → Generated 인터페이스를 수동 override하거나 registry에 `returnsOverride` 필드 도입.
- `means_plot_data`: 동일 이유. nested 구조 표현 한계.

### 체크리스트

- [x] Python 전수 조사 완료
- [x] Registry 수정: `descriptive_stats` — `se, sem, confidenceLevel, ciLower, ciUpper` 추가
- [x] Registry 수정: `normality_test` — `interpretation` → `alpha` 교체
- [x] Registry 수정: `outlier_detection` — `outlierValues, lowerBound, upperBound` 삭제 → `outlierCount` 추가
- [x] Registry 수정: `one_sample_proportion_test` — `pValue` 삭제
- [x] Registry 수정: `ks_test_one_sample` — `testType, statisticKS, criticalValue, sampleSizes, distributionInfo` 추가
- [x] Registry 수정: `ks_test_two_sample` — `testType, statisticKS, criticalValue, effectSize, sampleSizes` 추가
- [x] Registry 수정: `mann_kendall_test` — `statistic→zScore, slope→senSlope`, `n` 추가
- [x] Registry 수정: `bonferroni_correction` — 전면 교체 `originalPValues, correctedPValues, adjustedAlpha, nComparisons, significant`
- [x] Registry 수정: `fisher_exact_test` — 8필드 추가
- [x] Python 수정: `t_test_one_sample` — `sampleStd, n` 추가 (소비자 유용성)
- [x] `power_analysis` `sides` 파라미터 버그 수정 — `number`(1|2) → `string`('two-sided'|'one-sided'), 래퍼 문자열 직접 전달
- [x] `descriptive_stats` `ciLower/ciUpper` 타입 수정 — `number[]` → `number` (scalar)
- [ ] `power_analysis` 반환값 nested 구조 대응 방안 결정 (registry 한계) → **보류, 후속 세션**
- [x] `node scripts/generate-method-types.mjs` 실행
- [x] `generate-method-types.mjs` METHOD_TYPE_OVERRIDES 추가 (descriptive_stats, outlier_detection, ks_test_*, mann_kendall, bonferroni, fisher_exact, fst)
- [x] `pyodide-statistics.ts` 래퍼 반환 타입 정합성 확인 (outlierValues→outlierCount 수정)
- [x] 테스트 수정 (`statistical-executor-routing.test.ts` pValue 제거)
- [x] tsc --noEmit 통과 확인

---

## C1b: 레거시 타입 파일 정리

C1a 완료 후 진행.

- [x] `cross-tabulation/page.tsx`의 `FisherExactTestResult` import를 Generated로 이관
- [x] `types/pyodide-results.ts` 삭제 (소비자 0곳 확인 후)
- [x] `types/pyodide.d.ts`에서 Result 타입 9개 삭제 (`PyodideInterface` + `Window` 확장은 유지)
- [x] `pyodide-statistics.ts` 래퍼가 `pyodide-results.ts` 타입을 참조하는 곳 확인 → 이미 없음
- [x] tsc --noEmit 통과 확인

---

## C2: 출력 검증 추가

현재 `parsePythonResult<T>()`가 `as T` 캐스팅만 수행 — 런타임 검증 없음.

**방향**: Worker 내부 Zod 삽입 아님. `pyodide-statistics.ts` 래퍼 또는 `callWorkerMethod` optional validator.

- [x] `assertWorkerResultFields(result, fields, methodName)` 유틸 구현 (`lib/utils/type-guards.ts`)
- [x] `pyodide-statistics.ts` 래퍼 11곳에 적용: normalityTest, outlierDetection, correlationTest, tTestTwoSample, tTestPaired, tTestOneSample, zTest, chiSquareTest, mannWhitneyTest, twoWayAnova, durbinWatsonTest
- [x] 검증 실패 시 에러 메시지에 `[메서드명] 필수 필드 누락: field1, field2` 포함
- [x] tsc --noEmit + 전체 테스트(7109) 통과

---

## C3: 기존 type-guards.ts 확장

`lib/utils/type-guards.ts` (410줄)에 Worker/통계용 헬퍼 추가. 새 파일 생성 아님.

- [x] `getNumberOrDefault(obj, key, defaultValue)` — `pyodide-core.service.ts:getStatisticValue` 독립 버전
- [x] `hasOwnNumberFields(obj, fields[])` — `pyodide-core.service.ts:hasStatisticFields` 독립 버전
- [x] `isPythonErrorShape(obj)` — `{ error: string }` 타입 가드
- [x] `assertWorkerResultFields(result, fields, methodName)` — C2에�� 함께 구현
- [ ] 기존 산발적 패턴 치환 — code-export.ts 등의 `typeof x === 'number'` 패턴은 AnalysisResult 옵셔널 필드 접근이라 치환 대상 아님. **보류**
- [x] tsc --noEmit 통과 확인

---

## 범위 외 (후속 세션)

- Worker 3-9 동기화 (C1a 패턴 반복)
- Zod 스키마 전면 도입 (84개)
- `pyodide-statistics.ts` 전체 래퍼 → Generated 직접 호출 전환
- Worker 2 고급 메서드 (partial_correlation_analysis, stepwise_regression_forward, response_surface_analysis, ancova_analysis, poisson_regression, ordinal_regression, mixed_model, manova) — 복잡 nested 구조, registry 형식 한계 대응 필요
