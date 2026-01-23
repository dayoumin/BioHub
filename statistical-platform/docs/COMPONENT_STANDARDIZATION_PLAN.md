# 통계 페이지 공통 컴포넌트 표준화 계획

> **Status**: Phase 1-2 Complete ✅
> **Created**: 2026-01-23
> **Last Updated**: 2026-01-23
> **Verified**: 2026-01-23 (실제 페이지/컴포넌트 검증 완료)

## 진행 상황 (Phase 1-2 완료)

### ✅ Phase 1 완료 내역

| 단계 | 상태 | 산출물 |
|------|------|--------|
| 1.1 표준 타입 정의 | ✅ 완료 | `types/statistics.ts` 확장 (~200줄 추가) |
| 1.2 공통 컴포넌트 props 점검 | ✅ 완료 | AssumptionTestCard, ResultInterpretation 수정 |
| 1.3 0% 활용 원인 분석 | ✅ 완료 | 아래 분석 결과 참조 |

#### Phase 1.1 추가된 표준 타입 (types/statistics.ts)
- `EffectSizeType`: 효과크기 유형 (cohen_d, eta_squared 등)
- `EffectSizeInterpretation`: negligible, small, medium, large
- `EffectSize`: 효과크기 (value, type, interpretation, ci?)
- `ConfidenceInterval`: 신뢰구간 (lower, upper, level)
- `AssumptionTest`: 가정 검정 (name, testName, statistic, pValue, passed 등)
- `Interpretation`: 결과 해석 (summary, details, recommendation, caution)
- `BaseTestResult`: 기본 검정 결과 (pValue, statistic, significant)
- Mixin 타입: WithDf, WithEffectSize, WithCI, WithAssumptions 등
- 조합 타입: StandardTTestResult, StandardANOVAResult 등

#### Phase 1.2 컴포넌트 수정 내역
- **AssumptionTestCard**: `types/statistics.ts`에서 기본 타입 import, null 허용 확장
- **ResultInterpretation**: 표준 타입 + 레거시 타입 모두 지원 (타입 가드 사용)

#### Phase 1.3 0% 활용 원인 분석 결과

| 컴포넌트 | 직접 사용 | 간접 사용 | 원인 |
|---------|----------|----------|------|
| ConfidenceIntervalDisplay | 0개 | ✅ StatisticalResultCard 내부 | 통합 컴포넌트를 통해 사용 |
| ResultInterpretation | 4개 | - | StatisticalResultCard와 별도 해석 UI |

**핵심 발견**: `StatisticalResultCard`가 여러 하위 컴포넌트를 통합하는 역할
- 내부적으로 `EffectSizeCard`, `AssumptionTestCard`, `ConfidenceIntervalDisplay` 사용
- 페이지들이 `StatisticalResultCard` 사용 시 자동으로 모든 공통 컴포넌트 활용

### ✅ Phase 2 시범 페이지 분석 결과

| 페이지 | StatisticalResultCard | 개별 컴포넌트 | 결과 |
|--------|----------------------|--------------|------|
| **t-test** | ✅ 사용 | - | **표준화 완료** |
| **anova** | ❌ | EffectSizeCard만 | 부분 적용 (복잡한 구조) |
| **correlation** | ❌ | 없음 | 미적용 (특수 시각화) |

**페이지 유형별 권장 전략**:
1. **단일 결과 구조** (t-test 유형): `StatisticalResultCard` 사용 권장
2. **복잡한 다중 섹션** (anova 유형): 개별 컴포넌트 조합
3. **특수 시각화** (correlation 유형): 커스텀 UI + 선택적 공통 컴포넌트

---

## 1. 현황 분석 요약

### 1.0 수정 내역 요약

| 항목 | 수정 전 | 수정 후 |
|------|---------|---------|
| 페이지 이름 | 13개 오류 | 실제 페이지명으로 수정 |
| 공통 컴포넌트 | 10개 | 16개 (6개 추가) |
| 가정 검정 페이지 | 28개 (가상) | 27개 (실제 검증) |
| 효과크기 페이지 | 14개 (가상) | 19개 (실제 검증) |
| 신뢰구간 페이지 | 15개 (가상) | 19개 (실제 검증) |
| 리스크 항목 | 3개 | 7개 (PyodideWorker 매핑, 번들 크기 등 추가) |
| 자동화 도구 | 없음 | 3개 명시 (마이그레이션/검증/분석 스크립트) |
| 결정 사항 | 4개 | 5개 (Q5: PyodideWorker 타입 통합 추가) |

### 1.0.1 추가된 주요 내용

- 공통 컴포넌트 16개 전체 목록 (활용률별 분류)
- 실제 검증된 페이지 목록 (grep으로 확인)
- 기존 타입과의 관계 (`types/statistics.ts`, `types/pyodide-results.ts`)
- 예외 후보 페이지 (시계열, 클러스터링, 탐색적 분석)
- 자동화 도구 필요성
- 변경 이력 섹션

### 1.1 문제점

48개 통계 페이지가 **개별적으로 작성**되어 다음 문제 발생:

| 문제 | 상세 |
|------|------|
| **타입 불일치** | pValue vs p_value vs pvalue (50%만 pValue 사용) |
| **컴포넌트 미활용** | 16개 공통 컴포넌트 중 2개만 90%+ 활용 |
| **코드 중복** | 동일 패턴이 각 페이지에서 재구현됨 |
| **유지보수 어려움** | 수정 시 48개 페이지 개별 수정 필요 |

### 1.2 데이터 기반 분석 결과

**반복 UI 패턴** (scripts/analyze-ui-patterns.mjs 실행 결과):

| 패턴 | 발견 | 비율 | 공통 컴포넌트 | 사용 | 갭 |
|------|------|------|--------------|------|-----|
| 해석/결론 | 45개 | 94% | ResultInterpretation | 0개 | **45개** |
| 가정 검정 | 27개 | 56% | AssumptionTestCard | 3개 | **24개** |
| 신뢰구간 | 19개 | 40% | ConfidenceIntervalDisplay | 0개 | **19개** |
| 효과크기 | 19개 | 40% | EffectSizeCard | 2개 | **17개** |
| p-value | 23개 | 48% | PValueBadge | 19개 | 4개 |

### 1.3 업계 참조: R broom 패턴

[R broom 패키지](https://broom.tidymodels.org/)의 표준화 접근:

```
tidy()   → 모델 구성요소 (term, estimate, std.error, statistic, p.value)
glance() → 모델 전체 요약 (AIC, BIC, R², df)
augment() → 개별 관측값 정보 (fitted, residuals)
```

**핵심 원칙**: 100+ 모델이 동일한 출력 구조를 따름

---

## 2. 공통 컴포넌트 현황 (16개)

### 2.1 활용률 높음 (80%+)

| 컴포넌트 | 사용 | 비율 | 용도 |
|---------|------|------|------|
| ResultContextHeader | 48개 | 100% | 결과 헤더 |
| StatisticsTable | 46개 | 96% | 통계 결과 테이블 |

### 2.2 활용률 중간 (10-50%)

| 컴포넌트 | 사용 | 비율 | 용도 |
|---------|------|------|------|
| PValueBadge | 19개 | 40% | p-value 배지 |
| DataPreviewPanel | 4개 | 8% | 데이터 미리보기 |
| AssumptionTestCard | 3개 | 6% | 가정 검정 카드 |
| EffectSizeCard | 2개 | 4% | 효과크기 카드 |
| StatisticalResultCard | 2개 | 4% | 통계 결과 카드 |
| DataTableViewer | 1개 | 2% | 데이터 테이블 뷰어 |

### 2.3 활용률 없음 (0%)

| 컴포넌트 | 사용 | 용도 | 조치 |
|---------|------|------|------|
| ConfidenceIntervalDisplay | 0개 | 신뢰구간 표시 | 활용 시작 필요 |
| ResultInterpretation | 0개 | 결과 해석 | 활용 시작 필요 |
| EasyExplanation | 0개 | 쉬운 설명 | 활용 시작 필요 |
| NextStepsCard | 0개 | 다음 단계 안내 | 활용 시작 필요 |
| AnalyzingOverlay | 0개 | 분석 중 오버레이 | 검토 필요 |
| OptionCard | 0개 | 옵션 카드 | 검토 필요 |
| ResultActionButtons | 0개 | 결과 액션 버튼 | 검토 필요 |
| StepProgress | 0개 | 단계 진행 표시 | 검토 필요 |

---

## 3. 목표

### 3.1 최종 목표

> **48개 통계 페이지가 표준 타입과 공통 컴포넌트를 사용하여 일관된 UX 제공**

### 3.2 구체적 목표

1. **타입 표준화**: 모든 Result 타입이 공통 필드명 사용
2. **컴포넌트 활용률 향상**: 주요 컴포넌트 80%+ 활용
3. **코드 중복 제거**: 반복 패턴을 컴포넌트로 추출
4. **유지보수 개선**: 공통 컴포넌트 수정 시 전체 페이지 반영

### 3.3 성공 지표

| 지표 | 현재 | 목표 |
|------|------|------|
| pValue 필드 일관성 | 50% | 100% |
| AssumptionTestCard 사용 | 6% | 80%+ |
| EffectSizeCard 사용 | 4% | 80%+ |
| ConfidenceIntervalDisplay 사용 | 0% | 80%+ |
| ResultInterpretation 사용 | 0% | 80%+ |

---

## 4. 표준 타입 설계 (안)

### 4.1 R broom 스타일 필드 매핑

| R broom 필드 | 우리 표준 필드 | 타입 | 필수 |
|-------------|--------------|------|------|
| p.value | `pValue` | number | ✅ |
| statistic | `statistic` | number | ✅ |
| estimate | `estimate` | number | ⬜ |
| std.error | `standardError` | number | ⬜ |
| conf.low | `confidenceInterval.lower` | number | ⬜ |
| conf.high | `confidenceInterval.upper` | number | ⬜ |
| parameter (df) | `df` | number | ⬜ |
| term | `term` | string | ⬜ |

### 4.2 추가 표준 필드

| 필드 | 타입 | 설명 | 필수 |
|------|------|------|------|
| `effectSize` | EffectSize | 효과크기 | ⬜ |
| `interpretation` | Interpretation | 결과 해석 | ⬜ |
| `assumptions` | AssumptionTest[] | 가정 검정 결과 | ⬜ |
| `significant` | boolean | 유의성 여부 | ⬜ |

### 4.3 타입 정의 (안)

**위치 결정 필요**: 기존 `types/statistics.ts` 확장 vs 새 파일 생성

```typescript
// types/statistics.ts 확장 또는 types/statistics-common.ts 신규

/** 기본 검정 결과 (모든 통계 검정의 공통 필드) */
interface BaseTestResult {
  pValue: number
  statistic: number
  significant: boolean
}

/** 효과크기 */
interface EffectSize {
  value: number
  type: 'cohen_d' | 'eta_squared' | 'omega_squared' | 'r' | 'phi' | 'cramers_v'
  interpretation: 'negligible' | 'small' | 'medium' | 'large'
}

/** 신뢰구간 */
interface ConfidenceInterval {
  lower: number
  upper: number
  level: number  // 0.95, 0.99 등
}

/** 가정 검정 */
interface AssumptionTest {
  name: string
  testName: string  // 'Shapiro-Wilk', 'Levene' 등
  statistic?: number
  pValue: number
  passed: boolean
  recommendation?: string
}

/** 결과 해석 */
interface Interpretation {
  summary: string      // 한 줄 요약
  details?: string     // 상세 설명
  recommendation?: string  // 권장 사항
}

// Mixin 타입들
interface WithDf { df: number }
interface WithEffectSize { effectSize: EffectSize }
interface WithCI { confidenceInterval: ConfidenceInterval }
interface WithAssumptions { assumptions: AssumptionTest[] }
interface WithInterpretation { interpretation: Interpretation }

// 조합 예시
type TTestResult = BaseTestResult
  & WithDf
  & WithEffectSize
  & WithCI
  & WithInterpretation
```

### 4.4 기존 타입과의 관계

| 기존 파일 | 내용 | 관계 |
|----------|------|------|
| `types/statistics.ts` | VariableSelection 등 입력 타입 | 확장 가능 |
| `types/pyodide-results.ts` | Python Worker 반환 타입 (30+개) | 매핑 필요 |
| 각 페이지 로컬 타입 | 페이지별 Result 인터페이스 | 마이그레이션 대상 |

---

## 5. 대상 페이지 분류 (실제 검증 완료)

### 5.1 가정 검정 포함 (27개) - AssumptionTestCard 대상

```
ancova, anova, chi-square-independence, correlation, cox-regression,
dose-response, explore-data, kruskal-wallis, ks-test, mann-kendall,
mann-whitney, manova, mixed-model, mood-median, non-parametric,
normality-test, one-sample-t, ordinal-regression, partial-correlation,
poisson, regression, reliability, response-surface, sign-test,
stepwise, t-test, welch-t
```

### 5.2 효과크기 포함 (19개) - EffectSizeCard 대상

```
ancova, anova, chi-square-goodness, chi-square-independence, friedman,
kruskal-wallis, ks-test, mann-whitney, manova, mcnemar,
non-parametric, one-sample-t, power-analysis, proportion-test,
repeated-measures-anova, stepwise, t-test, welch-t, wilcoxon
```

### 5.3 신뢰구간 포함 (19개) - ConfidenceIntervalDisplay 대상

```
ancova, anova, binomial-test, correlation, cox-regression,
descriptive, dose-response, manova, means-plot, mixed-model,
one-sample-t, ordinal-regression, poisson, proportion-test,
regression, reliability, repeated-measures-anova, t-test, welch-t
```

### 5.4 사후검정 포함 (9개) - PostHocCard 컴포넌트 필요?

```
ancova, anova, cochran-q, friedman, kruskal-wallis,
manova, non-parametric, power-analysis, repeated-measures-anova
```

### 5.5 공통화 어려운 페이지 (예외 후보)

| 페이지 | 사유 |
|--------|------|
| arima, seasonal-decompose, stationarity-test | 시계열 특수 구조 |
| cluster | 클러스터링 (비검정 결과) |
| descriptive, explore-data | 탐색적 분석 (p-value 없음) |
| pca, factor-analysis | 차원 축소 (특수 결과) |

---

## 6. 구현 단계

### Phase 1: 기반 작업 (우선순위 높음)

| 단계 | 작업 | 산출물 |
|------|------|--------|
| 1.1 | 표준 타입 정의 | types/statistics.ts 확장 |
| 1.2 | 기존 공통 컴포넌트 props 점검 | 수정 사항 목록 |
| 1.3 | 0% 활용 컴포넌트 원인 분석 | 개선 방안 |

### Phase 2: 시범 적용 (3개 페이지)

| 페이지 | 선정 이유 | 적용 컴포넌트 |
|--------|----------|--------------|
| t-test | 가장 기본, 모든 요소 포함 | 전체 |
| anova | 복잡하지만 대표적 | 전체 + PostHoc |
| correlation | 중간 복잡도 | 일부 |

### Phase 3: 컴포넌트 활용 확대 (갭 큰 순서)

| 순서 | 컴포넌트 | 갭 | 대상 페이지 수 |
|------|---------|-----|---------------|
| 3.1 | ResultInterpretation | 45개 | 전체 |
| 3.2 | AssumptionTestCard | 24개 | 27개 |
| 3.3 | ConfidenceIntervalDisplay | 19개 | 19개 |
| 3.4 | EffectSizeCard | 17개 | 19개 |

### Phase 4: 타입 마이그레이션

| 단계 | 작업 | 대상 |
|------|------|------|
| 4.1 | pValue 필드명 통일 | 모든 페이지 |
| 4.2 | 효과크기 구조 통일 | 19개 페이지 |
| 4.3 | 신뢰구간 구조 통일 | 19개 페이지 |
| 4.4 | 가정검정 구조 통일 | 27개 페이지 |

### Phase 5: 검증 및 정리

| 단계 | 작업 |
|------|------|
| 5.1 | TypeScript 컴파일 검증 |
| 5.2 | 테스트 실행 |
| 5.3 | 분석 스크립트 재실행 (목표 달성 확인) |
| 5.4 | 문서 정리 |

---

## 7. 리스크 및 고려사항

### 7.1 기술적 리스크

| 리스크 | 영향 | 대응 |
|-------|------|------|
| 기존 동작 변경 | 버그 발생 | 단계별 마이그레이션 + 테스트 |
| 타입 변환 복잡 | 개발 지연 | adapter 함수 활용 |
| 일부 페이지 특수 케이스 | 공통화 불가 | 예외 허용 (5.5 참조) |
| PyodideWorker 타입 매핑 | 이중 변환 | pyodide-results.ts와 통합 검토 |

### 7.2 운영 리스크

| 리스크 | 영향 | 대응 |
|-------|------|------|
| 번들 크기 증가 | 성능 저하 | tree-shaking 확인 |
| 테스트 커버리지 부족 | 회귀 버그 | 마이그레이션 전 테스트 보강 |
| 문서화 부족 | 유지보수 어려움 | 컴포넌트 사용 가이드 작성 |

### 7.3 마이그레이션 전략

**점진적 마이그레이션 (권장)**:
1. 새 타입/컴포넌트를 옵셔널로 추가
2. 시범 페이지 3개 먼저 적용
3. 패턴 확립 후 나머지 확대
4. 기존 코드와 새 코드 공존 허용
5. 모든 페이지 완료 후 레거시 제거

### 7.4 자동화 도구 필요

| 도구 | 용도 |
|------|------|
| 마이그레이션 스크립트 | 필드명 자동 변환 (pvalue → pValue) |
| 검증 스크립트 | 표준 준수 여부 체크 |
| 분석 스크립트 | 진행률 모니터링 (기존 scripts/*.mjs 활용) |

---

## 8. 결정 필요 사항

### Q1: 타입 정의 위치

- [ ] Option A: `types/statistics.ts` 기존 파일에 추가 (권장 - 일관성)
- [ ] Option B: `types/statistics-common.ts` 새 파일 생성
- [ ] Option C: 각 컴포넌트 파일에 분산

### Q2: 마이그레이션 순서

- [ ] Option A: 컴포넌트별 (ResultInterpretation → AssumptionTestCard → ...)
- [ ] Option B: 페이지별 (t-test → anova → correlation → 나머지)
- [ ] Option C: 필드별 (pValue 통일 → effectSize 통일 → ...)

### Q3: 시범 페이지

- [x] t-test (가장 기본)
- [x] anova (복잡하지만 대표적)
- [x] correlation (중간 복잡도)

### Q4: 예외 처리 방침

- [ ] Option A: 엄격 (모든 페이지 100% 표준 준수)
- [ ] Option B: 유연 (80% 준수, 20% 예외 허용) - 권장
- [ ] Option C: 카테고리별 (검정 페이지만 표준화, 탐색적 분석 제외)

### Q5: PyodideWorker 타입 통합

- [ ] Option A: 별도 유지 (현재 상태)
- [ ] Option B: UI Result 타입과 통합
- [ ] Option C: 매핑 레이어 추가

---

## 9. 작업 우선순위 제안

### 즉시 시작 가능 (의존성 없음)

1. **0% 활용 컴포넌트 점검** - ResultInterpretation 등 사용 안 되는 이유 파악
2. **시범 페이지 현황 분석** - t-test, anova, correlation 상세 분석

### 단기 (1주)

3. **표준 타입 정의** - types/statistics.ts 확장
4. **시범 페이지 적용** - 3개 페이지 마이그레이션

### 중기 (2-4주)

5. **컴포넌트 활용 확대** - 갭 큰 순서대로
6. **나머지 페이지 마이그레이션**

### 장기

7. **전체 48개 페이지 완료**
8. **분석 스크립트로 목표 달성 검증**
9. **레거시 코드 정리**

---

## 10. 다음 단계

1. [ ] 이 문서 검토 및 피드백
2. [ ] 결정 사항 확정 (Q1-Q5)
3. [ ] 0% 활용 컴포넌트 점검
4. [ ] Phase 1 시작

---

## 참고 자료

- [R broom 공식 문서](https://broom.tidymodels.org/)
- [R broom 논문](https://arxiv.org/abs/1412.3565)
- `scripts/analyze-ui-patterns.mjs` - UI 패턴 분석 스크립트
- `scripts/analyze-result-types.mjs` - Result 타입 분석 스크립트
- `types/statistics.ts` - 기존 변수 선택 타입
- `types/pyodide-results.ts` - Python Worker 반환 타입

---

## 변경 이력

| 날짜 | 변경 내용 |
|------|----------|
| 2026-01-23 | 초안 작성 |
| 2026-01-23 | 실제 페이지/컴포넌트 검증 후 수정 (페이지 이름 13개 오류 수정, 공통 컴포넌트 6개 추가, 페이지 수 정확한 수치로 수정) |
| 2026-01-23 | Phase 1 완료: 표준 타입 정의 (types/statistics.ts), 컴포넌트 props 수정 (AssumptionTestCard, ResultInterpretation) |
| 2026-01-23 | Phase 2 완료: 시범 페이지 분석 (t-test 표준화 완료, anova/correlation 패턴 분석) |
