# UI-Registry 최종 검증 보고서

**작성일**: 2025-11-05
**상태**: 분석 완료, 개선 방향 제시

---

## 📊 Executive Summary

### 주요 발견 사항
- ✅ **UI와 Registry의 분리는 적절함** (중복이 아닌 계층 구조)
- ⚠️ **메뉴와 실제 페이지 불일치**: 3개 페이지 누락
- ⚠️ **메뉴에 없는 페이지**: 9개 (내부 사용 페이지)
- ⚠️ **Registry 메서드 미활용**: 17개 메서드가 UI 없음

---

## 🔍 상세 분석

### 1. 메뉴 vs 실제 페이지 비교

| 구분 | 개수 | 비고 |
|------|------|------|
| 메뉴 항목 (menu-config.ts) | 35개 | href 기준 |
| 실제 페이지 (app/statistics/) | 41개 | page.tsx 있는 디렉토리 |
| **불일치** | **6개** | |

---

## 🔴 Critical Issues (즉시 수정 필요)

### Issue 1: 메뉴에는 있지만 페이지 없음 (3개)

| 메뉴 항목 | 경로 | Registry 메서드 | 조치 필요 |
|----------|------|----------------|----------|
| 이원분산분석 | `/two-way-anova` | `twoWayAnova` | ✅ 페이지 생성 |
| 삼원분산분석 | `/three-way-anova` | - | ⚠️ 메서드 + 페이지 생성 또는 메뉴 제거 |
| 반복측정 ANOVA | `/repeated-measures` | `repeatedMeasures` | ✅ 페이지 생성 |

**영향도**: 🔴 High
- 사용자가 메뉴 클릭 시 404 에러 발생
- 사용자 경험 저하

**권장 조치**:
1. `two-way-anova` 페이지 생성 (Registry 메서드 있음)
2. `repeated-measures` 페이지 생성 (Registry 메서드 있음)
3. `three-way-anova`:
   - Option A: Registry에 메서드 추가 후 페이지 생성
   - Option B: 메뉴에서 제거 (향후 추가 예정으로 표시)

---

### Issue 2: 페이지는 있지만 메뉴 없음 (9개)

| 페이지 | 경로 | 용도 | 조치 필요 |
|--------|------|------|----------|
| explore-data | `/explore-data` | 탐색적 데이터 분석 | ✅ 메뉴 추가 고려 |
| descriptive | `/descriptive` | 기술통계 | ✅ 메뉴 추가 고려 |
| frequency-table | `/frequency-table` | 빈도표 | ✅ 메뉴 추가 고려 |
| cross-tabulation | `/cross-tabulation` | 교차표 | ✅ 메뉴 추가 고려 |
| reliability | `/reliability` | 신뢰도 분석 | ✅ 메뉴 추가 고려 |
| friedman | `/friedman` | Friedman 검정 | ⚠️ 메뉴 누락 (비모수) |
| kruskal-wallis | `/kruskal-wallis` | Kruskal-Wallis | ⚠️ 메뉴 누락 (비모수) |
| mann-whitney | `/mann-whitney` | Mann-Whitney | ⚠️ 메뉴 누락 (비모수) |
| wilcoxon | `/wilcoxon` | Wilcoxon | ⚠️ 메뉴 누락 (비모수) |

**분석**:
- **5개 기술통계/탐색 페이지**: 의도적으로 메뉴에서 제외? (내부 사용)
- **4개 비모수 검정**: `/non-parametric` 통합 페이지에 포함되어 있어서 메뉴에서 제외?

**권장 조치**:
- 비모수 4개: 메뉴에 추가하거나, 통합 페이지에서만 접근하도록 명시
- 기술통계 5개: 메뉴 추가 여부 결정 필요

---

## 🟡 Medium Priority Issues

### Issue 3: Registry에 있지만 UI 없는 메서드 (17개)

#### 3-1. Hypothesis 그룹
- `zTest` - z-검정 ⚠️
- `binomialTest` - 이항 검정 ⚠️

#### 3-2. Regression 그룹
- `curveEstimation` - 곡선 추정
- `nonlinearRegression` - 비선형 회귀
- `binaryLogistic` - 이진 로지스틱 (logistic에 통합?)
- `multinomialLogistic` - 다항 로지스틱 (logistic에 통합?)
- `probitRegression` - Probit 회귀
- `negativeBinomial` - 음이항 회귀

#### 3-3. Nonparametric 그룹
- `cochranQ` - Cochran Q 검정
- `moodMedian` - Mood 중위수 검정

#### 3-4. ANOVA 그룹 (사후 검정)
- `tukeyHSD` - Tukey HSD (ANOVA 페이지 내부 사용?)
- `scheffeTest` - Scheffe (ANOVA 페이지 내부 사용?)
- `bonferroni` - Bonferroni (ANOVA 페이지 내부 사용?)
- `gamesHowell` - Games-Howell (ANOVA 페이지 내부 사용?)

#### 3-5. Advanced 그룹
- `canonicalCorrelation` - 정준상관
- `survivalAnalysis` - 생존분석
- `timeSeries` - 시계열 분석
- `metaAnalysis` - 메타분석
- `sem` - 구조방정식 모델
- `multilevelModel` - 다층모형 (mixed-model에서 사용?)
- `mediation` - 매개효과
- `moderation` - 조절효과

**권장 조치**:
- High Priority (즉시): `zTest`, `binomialTest`
- Medium Priority (1-2주): 회귀 4개, 비모수 2개
- Low Priority (장기): 고급 8개

---

## 📋 개선 로드맵

### 🚀 Sprint 1: 긴급 수정 (1-2일)

**목표**: 404 에러 제거, 메뉴 정합성 확보

```
[ ] Task 1: two-way-anova 페이지 생성
    - 경로: app/(dashboard)/statistics/two-way-anova/page.tsx
    - Registry: twoWayAnova 사용
    - 참고: anova 페이지 구조 복사

[ ] Task 2: repeated-measures 페이지 생성
    - 경로: app/(dashboard)/statistics/repeated-measures/page.tsx
    - Registry: repeatedMeasures 사용

[ ] Task 3: three-way-anova 처리
    - Option A: 메뉴에서 제거 (comingSoon: true)
    - Option B: Registry 메서드 추가 + 페이지 생성

[ ] Task 4: menu-config.ts 업데이트
    - 누락된 비모수 4개 추가 (friedman, kruskal-wallis, mann-whitney, wilcoxon)
    - 기술통계 5개 추가 여부 결정
```

**예상 시간**: 4-6시간

---

### 🎯 Sprint 2: 핵심 메서드 추가 (3-5일)

**목표**: 자주 사용되는 통계 메서드 UI 추가

```
[ ] Task 1: z-test 페이지
    - 새 카테고리 또는 compare에 추가
    - Registry: zTest

[ ] Task 2: binomial-test 페이지
    - nonparametric 또는 새 카테고리
    - Registry: binomialTest

[ ] Task 3: 회귀 고급 메서드 4개
    - curve-estimation
    - nonlinear-regression
    - probit-regression
    - negative-binomial

[ ] Task 4: 비모수 2개
    - cochran-q
    - mood-median
```

**예상 시간**: 2-3일

---

### 🌟 Sprint 3: 고급 메서드 (선택, 2-4주)

**목표**: 고급 통계 사용자를 위한 메서드 추가

```
[ ] canonical-correlation
[ ] survival-analysis
[ ] time-series
[ ] meta-analysis
[ ] sem (구조방정식)
[ ] mediation
[ ] moderation
```

**예상 시간**: 10-15일 (우선순위 낮음)

---

## 🎯 즉시 결정이 필요한 사항

### 질문 1: three-way-anova 처리 방법
- **Option A**: 메뉴에서 제거 (comingSoon: true로 표시)
- **Option B**: Registry 메서드 추가 후 페이지 생성
- **Option C**: 완전히 삭제

**권장**: Option A (향후 추가 예정)

---

### 질문 2: 비모수 검정 4개 메뉴 추가 여부
- friedman, kruskal-wallis, mann-whitney, wilcoxon
- 현재 `/non-parametric` 통합 페이지에서만 접근 가능
- 별도 페이지도 이미 존재

**권장**: 메뉴에 추가 (사용자 접근성 향상)

---

### 질문 3: 기술통계 5개 메뉴 추가 여부
- explore-data, descriptive, frequency-table, cross-tabulation, reliability
- 현재 메뉴 없이 직접 URL로만 접근

**권장**:
- 새 카테고리 "기초 분석" 추가
- 또는 diagnostic 카테고리에 통합

---

## 📝 수정 우선순위 요약

| 우선순위 | 항목 | 개수 | 예상 시간 | 영향도 |
|---------|------|------|----------|--------|
| 🔴 P0 | 404 페이지 수정 | 2-3개 | 4-6시간 | 매우 높음 |
| 🟡 P1 | 비모수 메뉴 추가 | 4개 | 1-2시간 | 높음 |
| 🟡 P1 | z-test, binomial-test | 2개 | 1일 | 높음 |
| 🟢 P2 | 회귀/비모수 고급 | 6개 | 2-3일 | 중간 |
| ⚪ P3 | 고급 통계 메서드 | 8개 | 2-4주 | 낮음 |

---

## ✅ 최종 결론

### 중복성 평가
**❌ UI와 Registry 간 중복 없음**
- UI 카테고리 (8개): 사용자 중심 분류
- Registry 그룹 (6개): 기술 중심 분류
- **서로 다른 목적의 계층적 구조**

### 통계 단계 적절성
**✅ 2단계 네비게이션 적절**
- 카테고리 → 통계 페이지 → Registry 메서드
- SPSS/R Studio와 유사한 UX

### 개선 필요성
**⚠️ 정합성 개선 필요**
- 메뉴와 페이지 불일치 3개
- 메뉴 누락 9개
- Registry 미활용 17개

---

## 📌 Next Actions

### 즉시 실행 (사용자 승인 후)
1. ✅ `two-way-anova` 페이지 생성
2. ✅ `repeated-measures` 페이지 생성
3. ⚠️ `three-way-anova` 처리 방법 결정
4. ✅ 비모수 4개 메뉴 추가

### 사용자 승인 필요
- 기술통계 5개 메뉴 추가 여부
- 고급 메서드 17개 추가 로드맵
- 카테고리 재구조화 여부

---

**문서**:
- [UI_REGISTRY_MAPPING_ANALYSIS.md](./UI_REGISTRY_MAPPING_ANALYSIS.md) - 상세 매핑
- [UI_REGISTRY_IMPROVEMENT_CHECKLIST.md](./UI_REGISTRY_IMPROVEMENT_CHECKLIST.md) - 체크리스트

**Updated**: 2025-11-05 | **Status**: 사용자 승인 대기
