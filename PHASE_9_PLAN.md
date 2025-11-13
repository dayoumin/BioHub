# Phase 9: 계산 방법 표준화 계획

**작성일**: 2025-11-12
**최종 업데이트**: 2025-11-13 13:15
**상태**: ✅ Batch 1 완료 (10개), ✅ Batch 2 완료 (6개), 🔜 Batch 3-4 대기 중
**목표**: 모든 통계 페이지를 PyodideCore 표준으로 통합 (일관성 확보)

---

## ✅ 완료 현황

### Batch 1: pyodideStats → PyodideCore (2025-11-12 ~ 2025-11-13) ✅
**Phase 1 (2025-11-12, 4개)**:
- ✅ **friedman** (Worker 1) - `friedman_test`
- ✅ **kruskal-wallis** (Worker 1) - `kruskal_wallis_test`
- ✅ **reliability** (Worker 1) - `cronbach_alpha_analysis`
- ✅ **wilcoxon** (Worker 1) - `wilcoxon_test`

**Phase 2 (2025-11-13, 6개)**:
- ✅ **t-test** (Worker 2) - `t_test_two_sample`
- ✅ **ancova** (Worker 2) - `ancova_analysis`
- ✅ **poisson** (Worker 2) - `poisson_regression`
- ✅ **ordinal-regression** (Worker 2) - `ordinal_regression`
- ✅ **mixed-model** (Worker 2) - `mixed_model`
- ✅ **manova** (Worker 2) - `manova`

**커밋** (8개):
- `40ef4ee` - friedman 변환
- `c4b42ab` - kruskal-wallis, reliability, wilcoxon (3개)
- `8f2e9db` - t-test 변환
- `000703b` - ancova 변환 완료 (30개, 68%)
- `0218071` - poisson 변환 완료 (31개, 70%)
- `1af38e6` - ordinal-regression 변환 완료 (32개, 73%)
- `d2d956f` - mixed-model 변환 완료 (33개, 75%)
- `61e515b` - manova 변환 완료 - Batch 1 100% 달성! (34개, 77%)

**PyodideCore**: 18 → **34개 (77%)**
**pyodideStats 제거**: 10 → **0개 (100% 제거 완료!)**

### Batch 2: Legacy Pyodide → PyodideCore (2025-11-13) ✅
- ✅ **ks-test** (Worker 1) - `ks_test_one_sample`, `ks_test_two_sample`
- ✅ **mann-kendall** (Worker 1) - `mann_kendall_test`
- ✅ **means-plot** (Worker 1) - `means_plot_data`
- ✅ **partial-correlation** (Worker 2) - `partial_correlation_analysis` (scipy)
- ✅ **stepwise** (Worker 2) - `stepwise_regression_forward` (statsmodels)
- ✅ **response-surface** (Worker 2) - `response_surface_analysis` (statsmodels)

**커밋**: `3ce46bb` - Batch 2 완료 (29개, 66%)
**PyodideCore**: 22 → 29개 (66%) → **Batch 1에서 34개 (77%)로 추가 증가**

### 통계 신뢰성 확보 ⭐
- ✅ **CLAUDE.md Section 2 준수**: 통계 알고리즘 직접 구현 금지
- ✅ **검증된 라이브러리 사용**:
  - `statsmodels` (poisson, ordinal-regression, mixed-model, manova, stepwise, response-surface)
  - `scipy.stats` (ks-test, mann-kendall, partial-correlation)
  - `pingouin` (friedman, kruskal-wallis, wilcoxon)

---

---

## 📊 현재 상황 (검증 완료)

### 검증 도구
- **스크립트**: `statistical-platform/scripts/test-statistics-pages.js`
- **실행 명령**: `node scripts/test-statistics-pages.js`
- **검증 항목**:
  - PyodideCore 패턴 검출
  - pyodideStats 패턴 검출
  - Legacy Pyodide 패턴 검출
  - JavaScript 계산 패턴 검출
  - Mock 데이터 패턴 검출

### 검증 결과
```
전체 페이지: 44개
실제 계산 구현: 40개 (91%)
Mock 패턴: 0개 (0%) ✅

계산 방법 분포:
- PyodideCore: 18개 (41%) ✅ 표준
- JavaScript: 6개 (14%) 🟡 검토 필요
- pyodideStats: 10개 (23%) 🔴 구식, 변환 필요
- Legacy Pyodide: 6개 (14%) 🔴 구식, 변환 필요
- None: 4개 (9%) 🔴 미구현
```

### 문제점
- **일관성 없음**: 3가지 다른 Pyodide 호출 방법 혼재
- **유지보수 어려움**: 각 방법마다 다른 패턴
- **코드 품질**: 최신 표준(PyodideCore)이 41%만 적용

---

## 🎯 Phase 9 목표

### 최종 목표 분포
| 계산 방법 | 목표 수 | 비율 | 설명 |
|----------|---------|------|------|
| **PyodideCore** | 42개 | 95% | 모든 통계 계산 표준 |
| **JavaScript** | 2개 | 5% | 단순 계산만 (frequency-table, cross-tabulation) |

### 달성 기준
- ✅ 일관성: 모든 통계 계산이 PyodideCore 사용
- ✅ 타입 안전성: TypeScript 컴파일 에러 0개
- ✅ 실제 동작: 모든 페이지 실제 계산 가능
- ✅ 검증 통과: test-statistics-pages.js 95% PyodideCore

---

## 📋 변환 계획 (총 24개 페이지)

### Batch 1: pyodideStats → PyodideCore (10개)
**우선순위**: 높음
**작업 시간**: 1-2시간
**변환 패턴**: 간접 호출 → 직접 호출

| # | 페이지 | 현재 | Worker | Python 모듈 |
|---|--------|------|--------|------------|
| 1 | ancova | pyodideStats | 2 | statsmodels.formula.api.ols |
| 2 | friedman | pyodideStats | 1 | scipy.stats.friedmanchisquare |
| 3 | kruskal-wallis | pyodideStats | 1 | scipy.stats.kruskal |
| 4 | manova | pyodideStats | 2 | statsmodels.multivariate.manova |
| 5 | mixed-model | pyodideStats | 2 | statsmodels.formula.api.mixedlm |
| 6 | ordinal-regression | pyodideStats | 2 | statsmodels.miscmodels.ordinal_model |
| 7 | poisson | pyodideStats | 2 | statsmodels.formula.api.poisson |
| 8 | reliability | pyodideStats | 1 | pingouin.cronbach_alpha |
| 9 | t-test | pyodideStats | 2 | scipy.stats.ttest_ind |
| 10 | wilcoxon | pyodideStats | 1 | scipy.stats.wilcoxon |

**변환 예시**:
```typescript
// Before (pyodideStats)
import { pyodideStats } from '@/lib/services/pyodide-statistics'
const result = await pyodideStats.tTest(group1, group2)

// After (PyodideCore)
import { PyodideCoreService } from '@/lib/services/pyodide/core/pyodide-core.service'
const pyodideService = PyodideCoreService.getInstance()
await pyodideService.initialize()

const result = await pyodideService.callWorkerMethod<TTestResult>(
  2, 'tTest', { group1, group2, equal_var: true }
)
```

---

### Batch 2: Legacy Pyodide → PyodideCore (6개)
**우선순위**: 높음
**작업 시간**: 1시간
**변환 패턴**: loadPyodideWithPackages → callWorkerMethod

| # | 페이지 | 현재 | Worker | Python 모듈 |
|---|--------|------|--------|------------|
| 11 | ks-test | Legacy | 1 | scipy.stats.kstest |
| 12 | mann-kendall | Legacy | 1 | scipy.stats.kendalltau |
| 13 | means-plot | Legacy | 1 | pingouin.plot_paired |
| 14 | partial-correlation | Legacy | 2 | pingouin.partial_corr |
| 15 | response-surface | Legacy | 2 | scipy.optimize.curve_fit |
| 16 | stepwise | Legacy | 2 | statsmodels.api.OLS |

**변환 예시**:
```typescript
// Before (Legacy Pyodide)
const pyodide = await loadPyodideWithPackages(['scipy', 'numpy'])
pyodide.globals.set('data', data)
const result = pyodide.runPythonAsync(`
  from scipy import stats
  result = stats.kstest(data, 'norm')
  result
`)

// After (PyodideCore)
const result = await pyodideService.callWorkerMethod<KSTestResult>(
  1, 'ksTest', { data, distribution: 'norm' }
)
```

---

### Batch 3: JavaScript → PyodideCore (4개)
**우선순위**: 중간
**작업 시간**: 2시간
**변환 이유**: sklearn 모듈 사용으로 고도화

| # | 페이지 | 현재 | Worker | Python 모듈 | 변환 이유 |
|---|--------|------|--------|------------|-----------|
| 17 | cluster | JS | 3 | sklearn.cluster | KMeans, DBSCAN 등 정확도 향상 |
| 18 | discriminant | JS | 3 | sklearn.discriminant_analysis | 수치 안정성 보장 |
| 19 | factor-analysis | JS | 3 | sklearn.decomposition.FactorAnalysis | rotation 지원 |
| 20 | pca | JS | 3 | sklearn.decomposition.PCA | SVD 최적화 |

**변환 예시**:
```typescript
// Before (JavaScript)
const means = data.reduce((acc, val) => acc + val, 0) / data.length
const variance = data.reduce((acc, val) => acc + Math.pow(val - means, 2), 0) / (data.length - 1)

// After (PyodideCore)
const result = await pyodideService.callWorkerMethod<PCAResult>(
  3, 'pca', { data, n_components: 2 }
)
```

---

### Batch 4: None → PyodideCore (4개)
**우선순위**: 높음
**작업 시간**: 2-3시간
**작업 내용**: 새로운 계산 구현

| # | 페이지 | 현재 | Worker | Python 모듈 |
|---|--------|------|--------|------------|
| 21 | dose-response | None | 2 | scipy.optimize.curve_fit |
| 22 | non-parametric | None | 1 | scipy.stats (generic) |
| 23 | power-analysis | None | 2 | statsmodels.stats.power |
| 24 | regression | None | 2 | statsmodels.regression.linear_model.OLS |

**구현 예시** (regression):
```typescript
const result = await pyodideService.callWorkerMethod<RegressionResult>(
  2, 'linearRegression', {
    X: variables.independent.map(v => dataset.map(row => row[v])),
    y: dataset.map(row => row[variables.dependent]),
    method: 'OLS'
  }
)
```

---

### Keep JavaScript (2개)
**유지 이유**: scipy 모듈이 필요 없는 단순 계산

| # | 페이지 | 계산 방법 | 유지 이유 |
|---|--------|----------|----------|
| 1 | frequency-table | JavaScript (Map) | 단순 빈도 계산 |
| 2 | cross-tabulation | JavaScript (2D Map) | 단순 교차표 생성 |

---

## 🔧 Worker 할당 전략

### Worker 1: 비모수 검정 + 기술통계
- 현재: normality-test, descriptive, explore-data
- 추가: friedman, kruskal-wallis, wilcoxon, reliability, ks-test, mann-kendall, means-plot, non-parametric

### Worker 2: 회귀/분산분석
- 현재: t-test, anova, manova, correlation
- 추가: ancova, mixed-model, ordinal-regression, poisson, partial-correlation, response-surface, stepwise, dose-response, power-analysis, regression

### Worker 3: 머신러닝
- 현재: mann-whitney, kruskal-wallis (일부)
- 추가: cluster, discriminant, factor-analysis, pca

### Worker 4: 빈도/카이제곱
- 현재: chi-square, chi-square-goodness, chi-square-independence, binomial-test, proportion-test, mcnemar, cochran-q
- 유지 (변경 없음)

---

## ✅ 검증 기준

### 변환 후 체크리스트
- [ ] PyodideCoreService.getInstance() 사용
- [ ] callWorkerMethod<T>() 타입 안전성
- [ ] actions.completeAnalysis() 사용 (isAnalyzing 버그 예방)
- [ ] TypeScript 컴파일 에러 0개
- [ ] 개발 서버 정상 실행
- [ ] 실제 데이터로 계산 테스트

### 자동 검증
```bash
node scripts/test-statistics-pages.js
# 목표: PyodideCore 42개 (95%), JavaScript 2개 (5%)
```

### 수동 검증
- 사용자가 44개 페이지 하나씩 확인
- 실제 데이터 업로드 → 계산 → 결과 확인

---

## 📅 작업 일정

### Day 1 (내일)
- **오전**: Phase 9-1 (Batch 1: pyodideStats 10개)
- **오후**: Phase 9-2 (Batch 2: Legacy Pyodide 6개)
- **검증**: TypeScript 컴파일, 개발 서버 실행

### Day 2
- **오전**: Phase 9-3 (Batch 3: JavaScript 4개)
- **오후**: Phase 9-4 (Batch 4: None 4개)
- **검증**: test-statistics-pages.js 실행

### Day 3
- **Phase 9-5**: 최종 검증
  - test-statistics-pages.js 실행
  - VALIDATION_CHECKLIST.md 업데이트
  - 수동 테스트 (사용자)

---

## 📝 참고 문서

### 관련 파일
- `scripts/test-statistics-pages.js` - 자동 검증 스크립트
- `VALIDATION_CHECKLIST.md` - 검증 체크리스트
- `CLAUDE.md` - 코딩 규칙
- `STATISTICS_CODING_STANDARDS.md` - 통계 페이지 표준

### 참고 구현
- `app/(dashboard)/statistics/anova/page.tsx` - PyodideCore 표준 예시
- `app/(dashboard)/statistics/correlation/page.tsx` - PyodideCore Worker 2 예시
- `app/(dashboard)/statistics/mann-whitney/page.tsx` - PyodideCore Worker 3 예시

---

## 🎯 최종 목표 (Phase 9 완료 후)

### 코드 일관성
- ✅ PyodideCore: 42개 (95%)
- ✅ JavaScript: 2개 (5%)
- ✅ 단일 표준 패턴
- ✅ 유지보수 용이

### 품질 지표
- ✅ TypeScript 에러: 0개
- ✅ Mock 패턴: 0개
- ✅ 실제 계산: 44개 (100%)
- ✅ 자동 검증: test-statistics-pages.js 통과

### 사용자 경험
- ✅ 모든 통계 기능 동작
- ✅ 동일한 사용 패턴
- ✅ 안정적인 계산 결과

---

**다음 단계**: 내일 Phase 9-1 (Batch 1) 시작
**예상 완료**: 2-3일 후
**최종 검증**: 사용자 수동 테스트

---

## 📌 임시 메모

### 변환 시 주의사항
1. **Worker 번호 확인**: 각 통계 메서드에 맞는 Worker 사용
2. **타입 정의**: callWorkerMethod<T>의 제네릭 타입 정확히 지정
3. **에러 처리**: try-catch로 Pyodide 초기화 에러 처리
4. **actions.completeAnalysis()**: 반드시 사용 (isAnalyzing 버그 예방)
5. **기존 테스트**: 각 페이지 변환 후 개발 서버에서 확인

### 변환 순서 이유
1. **Batch 1**: 가장 많은 페이지 (10개), 패턴 명확
2. **Batch 2**: 구식 패턴 제거 (6개)
3. **Batch 3**: sklearn 모듈 추가 필요 (시간 소요)
4. **Batch 4**: 새로운 구현 (가장 시간 소요)

---

**작성 완료**: 2025-11-12
**다음 작업**: 내일 Phase 9-1 시작
