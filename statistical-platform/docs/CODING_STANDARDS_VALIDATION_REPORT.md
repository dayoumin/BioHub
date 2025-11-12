# 코딩 표준 준수 검증 결과

**검증일**: 2025-11-12
**검증 대상**: 통계 페이지 44개

## 요약

- **전체**: 44개
- **완전 준수**: 29개 (66%)
- **부분 준수**: 3개 (7%)
- **미준수**: 12개 (27%)

## 주요 발견 사항

### 1. Mock 데이터 사용 현황

**11개 페이지**가 Mock 데이터만 사용하고 있으며 실제 Pyodide 통계 계산을 호출하지 않습니다.

- chi-square-goodness (점수: 100점)
- descriptive (점수: 100점)
- explore-data (점수: 100점)
- frequency-table (점수: 100점)
- normality-test (점수: 100점)
- one-sample-t (점수: 100점)
- proportion-test (점수: 100점)
- welch-t (점수: 100점)
- cross-tabulation (점수: 86점)
- non-parametric (점수: 86점)
- correlation (점수: 74점)

### 2. Critical 버그 (setResults 사용)

setResults 사용 없음. ✅

### 3. any 타입 사용

⚠️ **1개 페이지**가 `any` 타입을 사용합니다.

- non-parametric (1개)

## 상세 분석 (전체 페이지)

| 순위 | 페이지 | 점수 | 상태 | 주요 이슈 |
|------|--------|------|------|----------|
| 1 | anova | 100 | ✅ | - |
| 2 | binomial-test | 100 | ✅ | - |
| 3 | chi-square-goodness | 100 | ✅ | Mock만 |
| 4 | chi-square-independence | 100 | ✅ | - |
| 5 | cochran-q | 100 | ✅ | - |
| 6 | descriptive | 100 | ✅ | Mock만 |
| 7 | explore-data | 100 | ✅ | Mock만 |
| 8 | frequency-table | 100 | ✅ | Mock만 |
| 9 | friedman | 100 | ✅ | - |
| 10 | kruskal-wallis | 100 | ✅ | - |
| 11 | mann-whitney | 100 | ✅ | - |
| 12 | mcnemar | 100 | ✅ | - |
| 13 | mixed-model | 100 | ✅ | - |
| 14 | mood-median | 100 | ✅ | - |
| 15 | normality-test | 100 | ✅ | Mock만 |
| 16 | one-sample-t | 100 | ✅ | Mock만 |
| 17 | ordinal-regression | 100 | ✅ | - |
| 18 | proportion-test | 100 | ✅ | Mock만 |
| 19 | regression | 100 | ✅ | - |
| 20 | runs-test | 100 | ✅ | - |
| 21 | sign-test | 100 | ✅ | - |
| 22 | t-test | 100 | ✅ | - |
| 23 | welch-t | 100 | ✅ | Mock만 |
| 24 | wilcoxon | 100 | ✅ | - |
| 25 | discriminant | 89 | ✅ | - |
| 26 | partial-correlation | 89 | ✅ | - |
| 27 | ancova | 86 | ❌ | Hook 미사용 |
| 28 | cross-tabulation | 86 | ❌ | Hook 미사용, Mock만 |
| 29 | manova | 86 | ❌ | Hook 미사용 |
| 30 | non-parametric | 86 | ❌ | any(1), Mock만 |
| 31 | poisson | 85 | ✅ | - |
| 32 | reliability | 85 | ✅ | - |
| 33 | dose-response | 80 | ✅ | - |
| 34 | pca | 76 | ❌ | Hook 미사용 |
| 35 | stepwise | 76 | ❌ | Hook 미사용 |
| 36 | correlation | 74 | 🟡 | Mock만 |
| 37 | means-plot | 74 | 🟡 | - |
| 38 | chi-square | 65 | 🟡 | - |
| 39 | ks-test | 61 | ❌ | Hook 미사용 |
| 40 | mann-kendall | 61 | ❌ | Hook 미사용 |
| 41 | response-surface | 61 | ❌ | Hook 미사용 |
| 42 | cluster | 55 | ❌ | Hook 미사용 |
| 43 | factor-analysis | 55 | ❌ | Hook 미사용 |
| 44 | power-analysis | 54 | ❌ | - |

## 검증 항목별 통과율

| 검증 항목 | 통과 | 비율 |
|----------|------|------|
| noDirectUseState | 44/44 | 100% ✅ |
| useCompleteAnalysis | 44/44 | 100% ✅ |
| noAnyType | 43/44 | 98% ✅ |
| usesDataUploadStep | 40/44 | 91% ✅ |
| usesVariableSelectorModern | 39/44 | 89% ✅ |
| usesCallback | 35/44 | 80% ✅ |
| usesCommonHandlers | 35/44 | 80% ✅ |
| useStatisticsPage | 34/44 | 77% 🟡 |
| usesPyodide | 31/44 | 70% 🟡 |

## 권장 개선 사항

1. **Mock 데이터 제거**: 11개 페이지에서 Pyodide 통계 계산을 구현하세요.
3. **타입 안전성**: 1개 페이지에서 `any` 타입을 제거하고 명시적 타입을 사용하세요.
4. **useCallback 적용**: 9개 페이지에서 이벤트 핸들러에 `useCallback`을 적용하세요.
