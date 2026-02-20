# 코딩 표준 준수 검증 결과

**검증일**: 2025-11-18
**검증 대상**: 통계 페이지 43개

## 요약

- **전체**: 43개
- **완전 준수**: 20개 (47%)
- **부분 준수**: 14개 (33%)
- **미준수**: 9개 (21%)

## 주요 발견 사항

### 1. Mock 데이터 사용 현황

모든 페이지가 Pyodide 서비스를 사용합니다. ✅

### 2. Critical 버그 (setResults 사용)

setResults 사용 없음. ✅

### 3. any 타입 사용

any 타입 사용 없음. ✅

## 상세 분석 (전체 페이지)

| 순위 | 페이지 | 점수 | 상태 | 주요 이슈 |
|------|--------|------|------|----------|
| 1 | chi-square-goodness | 100 | ✅ | - |
| 2 | chi-square-independence | 100 | ✅ | - |
| 3 | explore-data | 100 | ✅ | - |
| 4 | mixed-model | 100 | ✅ | - |
| 5 | non-parametric | 100 | ✅ | - |
| 6 | ordinal-regression | 100 | ✅ | - |
| 7 | regression | 100 | ✅ | - |
| 8 | binomial-test | 91 | ✅ | - |
| 9 | cochran-q | 91 | ✅ | - |
| 10 | discriminant | 91 | ✅ | - |
| 11 | dose-response | 91 | ✅ | - |
| 12 | friedman | 91 | ✅ | - |
| 13 | kruskal-wallis | 91 | ✅ | - |
| 14 | mann-whitney | 91 | ✅ | - |
| 15 | mcnemar | 91 | ✅ | - |
| 16 | normality-test | 91 | ✅ | - |
| 17 | partial-correlation | 91 | ✅ | - |
| 18 | poisson | 91 | ✅ | - |
| 19 | proportion-test | 91 | ✅ | - |
| 20 | wilcoxon | 91 | ✅ | - |
| 21 | ancova | 86 | ❌ | Hook 미사용 |
| 22 | manova | 86 | ❌ | Hook 미사용 |
| 23 | pca | 86 | ❌ | Hook 미사용 |
| 24 | cluster | 77 | ❌ | Hook 미사용 |
| 25 | ks-test | 77 | ❌ | Hook 미사용 |
| 26 | anova | 76 | 🟡 | - |
| 27 | correlation | 76 | 🟡 | - |
| 28 | descriptive | 76 | 🟡 | - |
| 29 | means-plot | 76 | 🟡 | - |
| 30 | mood-median | 76 | 🟡 | - |
| 31 | one-sample-t | 76 | 🟡 | - |
| 32 | reliability | 76 | 🟡 | - |
| 33 | repeated-measures-anova | 76 | 🟡 | - |
| 34 | runs-test | 76 | 🟡 | - |
| 35 | sign-test | 76 | 🟡 | - |
| 36 | t-test | 76 | 🟡 | - |
| 37 | welch-t | 76 | 🟡 | - |
| 38 | response-surface | 72 | ❌ | Hook 미사용 |
| 39 | chi-square | 65 | 🟡 | - |
| 40 | power-analysis | 65 | 🟡 | - |
| 41 | factor-analysis | 62 | ❌ | Hook 미사용 |
| 42 | mann-kendall | 62 | ❌ | Hook 미사용 |
| 43 | stepwise | 62 | ❌ | Hook 미사용 |

## 검증 항목별 통과율

| 검증 항목 | 통과 | 비율 |
|----------|------|------|
| noDirectUseState | 43/43 | 100% ✅ |
| useCompleteAnalysis | 43/43 | 100% ✅ |
| usesPyodide | 43/43 | 100% ✅ |
| noAnyType | 43/43 | 100% ✅ |
| usesDataUploadStep | 41/43 | 95% ✅ |
| useStatisticsPage | 34/43 | 79% 🟡 |
| usesCallback | 25/43 | 58% 🟡 |
| usesCommonHandlers | 25/43 | 58% 🟡 |
| usesVariableSelectorModern | 11/43 | 26% ❌ |

## 권장 개선 사항

4. **useCallback 적용**: 18개 페이지에서 이벤트 핸들러에 `useCallback`을 적용하세요.
