# UI-Registry 매핑 분석 및 개선 계획

**작성일**: 2025-11-05
**목적**: UI 페이지와 Registry 메서드 간 매핑 현황 파악 및 개선

---

## 📊 현재 상태 스냅샷

### 통계
- **UI 페이지**: 43개 (메인 페이지 포함 44개)
- **Registry 메서드**: 60개
- **UI 카테고리**: 8개
- **Registry 그룹**: 6개

---

## 🗂️ 상세 매핑 테이블

### 1. 평균 비교 (compare) - 5개 메뉴 항목

| UI 페이지 | Registry 메서드 | 상태 | 비고 |
|----------|----------------|------|------|
| `/t-test` | `tTest`, `pairedTTest` | ✅ | |
| `/one-sample-t` | `oneSampleTTest` | ✅ | |
| `/welch-t` | `tTest` (welch=True) | ✅ | 별도 메서드 없음 |
| `/proportion-test` | `proportionTest` | ✅ | |
| `/means-plot` | `descriptive` + 시각화 | ✅ | 시각화 중심 |

**Registry에 있지만 UI 없음**:
- `zTest` - ⚠️ **추가 필요**

---

### 2. 일반선형모델 (glm) - 7개 메뉴 항목

| UI 페이지 | Registry 메서드 | 상태 | 비고 |
|----------|----------------|------|------|
| `/anova` | `oneWayAnova` | ✅ | |
| `/two-way-anova` (메뉴) | `twoWayAnova` | ⚠️ | 페이지 없음? |
| `/three-way-anova` (메뉴) | - | ⚠️ | 페이지 + 메서드 없음 |
| `/ancova` | `ancova` | ✅ | |
| `/repeated-measures` (메뉴) | `repeatedMeasures` | ⚠️ | 페이지 없음? |
| `/manova` | `manova` | ✅ | |
| `/mixed-model` | `multilevelModel` | ✅ | |

**Registry에 있지만 UI 없음** (사후 검정):
- `tukeyHSD` - ANOVA 내부 사용?
- `scheffeTest` - ANOVA 내부 사용?
- `bonferroni` - ANOVA 내부 사용?
- `gamesHowell` - ANOVA 내부 사용?

---

### 3. 상관분석 (correlate) - 2개 메뉴 항목

| UI 페이지 | Registry 메서드 | 상태 | 비고 |
|----------|----------------|------|------|
| `/correlation` | `correlation` | ✅ | Pearson/Spearman/Kendall |
| `/partial-correlation` | `partialCorrelation` | ✅ | |

---

### 4. 회귀분석 (regression) - 6개 메뉴 항목

| UI 페이지 | Registry 메서드 | 상태 | 비고 |
|----------|----------------|------|------|
| `/regression` | `linearRegression`, `multipleRegression`, `logisticRegression` | ✅ | 통합 페이지 |
| `/stepwise` | `stepwiseRegression` | ✅ | |
| `/ordinal-regression` | `ordinalLogistic` | ✅ | |
| `/poisson` | `poissonRegression` | ✅ | |
| `/dose-response` | - | ⚠️ | 커스텀 구현? |
| `/response-surface` | - | ⚠️ | 커스텀 구현? |

**Registry에 있지만 UI 없음**:
- `curveEstimation` - ⚠️ **추가 검토**
- `nonlinearRegression` - ⚠️ **추가 검토**
- `binaryLogistic` - `logisticRegression`에 포함?
- `multinomialLogistic` - `logisticRegression`에 포함?
- `probitRegression` - ⚠️ **추가 검토**
- `negativeBinomial` - ⚠️ **추가 검토**

---

### 5. 비모수 검정 (nonparametric) - 5개 메뉴 항목

| UI 페이지 | Registry 메서드 | 상태 | 비고 |
|----------|----------------|------|------|
| `/non-parametric` | `mannWhitney`, `wilcoxon`, `kruskalWallis` | ✅ | 통합 페이지 |
| `/mann-whitney` | `mannWhitney` | ✅ | 별도 페이지 |
| `/wilcoxon` | `wilcoxon` | ✅ | 별도 페이지 |
| `/kruskal-wallis` | `kruskalWallis` | ✅ | 별도 페이지 |
| `/friedman` | `friedman` | ✅ | |
| `/sign-test` | `signTest` | ✅ | |
| `/runs-test` | `runsTest` | ✅ | |
| `/ks-test` | - | ⚠️ | Kolmogorov-Smirnov 커스텀? |
| `/mcnemar` | `mcNemar` | ✅ | |

**Registry에 있지만 UI 없음**:
- `cochranQ` - ⚠️ **추가 검토**
- `moodMedian` - ⚠️ **추가 검토**

---

### 6. 카이제곱 검정 (chi-square) - 3개 메뉴 항목

| UI 페이지 | Registry 메서드 | 상태 | 비고 |
|----------|----------------|------|------|
| `/chi-square-independence` | `chiSquare` | ✅ | |
| `/chi-square-goodness` | `chiSquare` | ✅ | |
| `/chi-square` | - | ✅ | Fisher 정확 검정 (SciPy) |

---

### 7. 고급 분석 (advanced) - 4개 메뉴 항목

| UI 페이지 | Registry 메서드 | 상태 | 비고 |
|----------|----------------|------|------|
| `/factor-analysis` | `factorAnalysis` | ✅ | |
| `/pca` | `pca` | ✅ | |
| `/cluster` | `clusterAnalysis` | ✅ | |
| `/discriminant` | `discriminantAnalysis` | ✅ | |

**Registry에 있지만 UI 없음** (8개 고급 메서드):
- `canonicalCorrelation` - ⚠️ **추가 검토**
- `survivalAnalysis` - ⚠️ **추가 검토**
- `timeSeries` - ⚠️ **추가 검토**
- `metaAnalysis` - ⚠️ **추가 검토**
- `sem` (구조방정식) - ⚠️ **추가 검토**
- `multilevelModel` - `/mixed-model`에서 사용?
- `mediation` - ⚠️ **추가 검토**
- `moderation` - ⚠️ **추가 검토**

---

### 8. 진단 및 검정 (diagnostic) - 3개 메뉴 항목

| UI 페이지 | Registry 메서드 | 상태 | 비고 |
|----------|----------------|------|------|
| `/normality-test` | `normality` | ✅ | |
| `/mann-kendall` | - | ⚠️ | 커스텀 구현? |
| `/power-analysis` | - | ⚠️ | 커스텀 구현? |

---

### 9. 기타 UI 페이지 (Registry 없음)

| UI 페이지 | 용도 | 비고 |
|----------|------|------|
| `/explore-data` | 탐색적 데이터 분석 | `descriptive` 메서드 사용 |
| `/frequency-table` | 빈도표 | `frequency` 메서드 사용 |
| `/cross-tabulation` | 교차표 | `crosstab` 메서드 사용 |
| `/reliability` | 신뢰도 분석 | `reliability` 메서드 사용 |
| `/descriptive` | 기술통계 | `descriptive` 메서드 사용 |

---

## 🔴 발견된 문제점

### 1. 누락된 페이지 (High Priority)
- `zTest` - z-검정 페이지 없음
- `binomialTest` - 이항 검정 페이지 없음

### 2. 메뉴와 페이지 불일치 (Medium Priority)
- `two-way-anova`, `three-way-anova`, `repeated-measures` - 메뉴에는 있지만 페이지 확인 필요

### 3. Registry에만 존재하는 메서드 (Low Priority)
- 회귀: `curveEstimation`, `nonlinearRegression`, `probitRegression`, `negativeBinomial`
- 비모수: `cochranQ`, `moodMedian`
- 고급: 8개 메서드

---

## 📋 개선 계획

### Phase 1: 긴급 수정 (1-2일)
- [ ] `welch-t` 페이지 구현 확인
- [ ] `two-way-anova`, `three-way-anova`, `repeated-measures` 페이지 확인
- [ ] 누락된 페이지와 메뉴 항목 정합성 검증

### Phase 2: 핵심 페이지 추가 (3-5일)
- [ ] `z-test` 페이지 추가
- [ ] `binomial-test` 페이지 추가

### Phase 3: 고급 메서드 로드맵 (선택)
- [ ] 17개 누락된 메서드 UI 추가 계획 수립
- [ ] 사용자 피드백 수집

### Phase 4: 문서화 (진행중)
- [x] UI-Registry 매핑 테이블 생성
- [ ] 개발자 가이드 업데이트
- [ ] 사용자 매뉴얼 작성

---

## 📌 다음 단계

1. **현재 페이지 실제 구현 확인**
   - `welch-t`, `two-way-anova` 등 페이지가 실제로 작동하는지 검증

2. **우선순위 결정**
   - 사용자와 함께 어떤 메서드를 먼저 추가할지 결정

3. **점진적 개선**
   - 한 번에 모두 수정하지 않고 단계별로 진행

---

**Updated**: 2025-11-05 | **Status**: 분석 완료, 사용자 승인 대기
