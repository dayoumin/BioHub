# 해석 엔진 커버리지 분석

## ✅ Phase 1 완료 (2025-11-23)

**결과**: 8개 비모수 검정 해석 추가 완료 + 3가지 버그 수정
- **Batch 1**: Wilcoxon, Sign Test, Friedman, Cochran Q (4개) ✓
- **Batch 2**: Mood's Median, Runs Test, Mann-Kendall, Binomial Test (4개) ✓
- **추가**: Mann-Whitney U Test 해석 추가 (누락 발견) ✓
- **커버리지**: 16개 → 24개 (+8개, +50%)
- **테스트**: 66개 → 107개 (+41개, +62%)
- **코드**: +290줄 (실제 기능) + 477줄 (테스트)

## ✅ Phase 2 완료 (2025-11-23)

**결과**: 4개 ANOVA 변형 해석 추가 완료
- **Batch 3**: Two-way ANOVA, Repeated Measures ANOVA (2개) ✓
- **Batch 4**: ANCOVA, MANOVA (2개) ✓
- **커버리지**: 24개 → 28개 (+4개, +17%)
- **테스트**: 107개 → 128개 (+21개, +20%)
- **코드**: +98줄 (실제 기능) + 457줄 (테스트)

## ✅ Phase 3 완료 (2025-11-23)

**결과**: 5개 회귀 변형 해석 추가 완료
- **Batch 5**: Poisson Regression, Ordinal Regression (2개) ✓
- **Batch 6**: Logistic Regression, Stepwise Regression, Partial Correlation (3개) ✓
- **커버리지**: 28개 → 33개 (+5개, +18%)
- **테스트**: 128개 → 151개 (+23개, +18%)
- **코드**: +150줄 (실제 기능) + 562줄 (테스트)

## ✅ Phase 4 완료 (2025-11-23)

**결과**: 5개 고급 분석 해석 추가 완료
- **Batch 7**: Dose-Response, Response Surface (2개) ✓
- **Batch 8**: Mixed Model, Power Analysis (2개) ✓
- **Batch 9**: Discriminant Analysis (1개) ✓
- **커버리지**: 33개 → 38개 (+5개, +15%)
- **테스트**: 151개 → 177개 (+26개, +17%)
- **코드**: +194줄 (실제 기능) + 687줄 (테스트)

**Phase 1 버그 수정** (Batch 1-2):
1. [High] Mann-Whitney null 반환 → 독립표본 비모수 검정 추가
2. [Low] Mood's Median "두 그룹" → "각 그룹" (3+ 그룹 대응)
3. [Low] Mann-Kendall NaN/Infinity 검증 강화

**Phase 2 버그 수정** (ANOVA 변형):
4. [Critical] Two-way ANOVA 매칭 실패 → normalizeMethod() 공백/하이픈 제거 강화
   - `'이원 분산분석'` (공백) / `'2-way ANOVA'` (하이픈) 매칭 실패
   - **원인**: `.replace(/\s+/g, ' ')` - 공백 정규화만 수행
   - **수정**: `.replace(/[-\s]+/g, '')` - 공백/하이픈 완전 제거
   - **추가 테스트**: 5개 엣지 케이스

**테스트 파일**:
- engine-batch1.test.ts (13개 테스트)
- engine-batch2.test.ts (16개 테스트)
- engine-fixes.test.ts (12개 테스트)
- engine-anova-variants.test.ts (26개 테스트) - 5개 엣지 케이스 포함
- engine-regression-variants.test.ts (23개 테스트) - 5개 회귀 변형
- engine-advanced.test.ts (26개 테스트) - 5개 고급 분석 + 엣지 케이스 (Discriminant Analysis +8개)

---

## 현재 지원 중인 통계 방법 (38개)

### Phase 1: Purpose 기반 (3개)
1. ✅ **그룹 비교** (2-group comparison)
   - t-test, Mann-Whitney, Welch-t 등
2. ✅ **상관관계** (correlation)
   - Pearson correlation, Spearman correlation
3. ✅ **예측/회귀** (regression)
   - Linear regression, Multiple regression

### Phase 2: Method 기반 (25개)
4. ✅ **ANOVA** (다집단 비교)
   - One-way ANOVA, Kruskal-Wallis
4-1. ✅ **ANOVA 변형** (4개) - Phase 2
   - Two-way ANOVA, Repeated Measures ANOVA, ANCOVA, MANOVA
5. ✅ **Chi-Square** (범주형 연관성)
   - Chi-square independence, Chi-square goodness-of-fit, Fisher exact test
6. ✅ **McNemar** (쌍대 범주형)
7. ✅ **정규성 검정**
   - Shapiro-Wilk, Kolmogorov-Smirnov, Anderson-Darling
8. ✅ **등분산성 검정**
   - Levene's test, Bartlett's test
9. ✅ **신뢰도 분석**
   - Cronbach's Alpha
10. ✅ **군집 분석**
    - K-means clustering
11. ✅ **PCA** (차원 축소)
    - Principal Component Analysis, Factor Analysis
12. ✅ **비모수 검정 - 대응/쌍대** (4개) - Batch 1
    - Wilcoxon Signed-Rank, Sign Test, Friedman, Cochran Q
13. ✅ **비모수 검정 - 독립/무작위** (4개) - Batch 2
    - Mood's Median, Runs Test, Mann-Kendall, Binomial Test
14. ✅ **Mann-Whitney U Test** (독립표본 비모수) - 버그 수정으로 추가
15. ✅ **회귀 변형** (5개) - Phase 3
    - Poisson Regression, Ordinal Regression, Logistic Regression, Stepwise Regression, Partial Correlation
16. ✅ **고급 분석** (5개) - Phase 4
    - Dose-Response Analysis, Response Surface, Mixed Model, Power Analysis, Discriminant Analysis

---

## 지원 필요한 통계 방법 (16개)

### ~~우선순위 1: 비모수 검정 (8개)~~ ✅ 완료
1. ✅ **Wilcoxon** (대응표본 비모수) - Batch 1
2. ✅ **Sign Test** (대응표본 부호 검정) - Batch 1
3. ✅ **Friedman** (반복측정 비모수) - Batch 1
4. ✅ **Mood's Median** (중앙값 검정) - Batch 2
5. ✅ **Runs Test** (무작위성 검정) - Batch 2
6. ✅ **Cochran Q** (다중 이분형) - Batch 1
7. ✅ **Mann-Kendall** (추세 검정) - Batch 2
8. ✅ **Binomial Test** (이항 검정) - Batch 2

14. ✅ **Mann-Whitney U Test** (독립표본 비모수) - 버그 수정으로 추가
15. ✅ **회귀 변형** (5개) - Phase 3
    - Poisson Regression (포아송 회귀)
    - Ordinal Regression (순서형 회귀)
    - Logistic Regression (로지스틱 회귀)
    - Stepwise Regression (단계적 회귀)
    - Partial Correlation (편상관)

---

### ~~우선순위 4: 고급 분석 (5개)~~ ✅ 완료
17. ✅ **Dose-Response Analysis** (용량-반응 분석) - Batch 7
18. ✅ **Response Surface** (반응표면 분석) - Batch 7
19. ✅ **Mixed Model** (혼합 모형) - Batch 8
20. ✅ **Power Analysis** (검정력 분석) - Batch 8
21. ✅ **Discriminant Analysis** (판별분석) - Batch 9

---

## 지원 필요한 통계 방법 (6개)

### ~~우선순위 1: 비모수 검정 (8개)~~ ✅ 완료
1. ✅ **Wilcoxon** (대응표본 비모수) - Batch 1
2. ✅ **Sign Test** (대응표본 부호 검정) - Batch 1
3. ✅ **Friedman** (반복측정 비모수) - Batch 1
4. ✅ **Mood's Median** (중앙값 검정) - Batch 2
5. ✅ **Runs Test** (무작위성 검정) - Batch 2
6. ✅ **Cochran Q** (다중 이분형) - Batch 1
7. ✅ **Mann-Kendall** (추세 검정) - Batch 2
8. ✅ **Binomial Test** (이항 검정) - Batch 2

### ~~우선순위 2: ANOVA 변형 (4개)~~ ✅ 완료
9. ✅ **Two-way ANOVA** (이원분산분석) - Batch 3
10. ✅ **Repeated Measures ANOVA** (반복측정) - Batch 3
11. ✅ **ANCOVA** (공분산분석) - Batch 4
12. ✅ **MANOVA** (다변량 분산분석) - Batch 4

### ~~우선순위 3: 회귀 변형 (5개)~~ ✅ 완료
13. ✅ **Logistic Regression** (로지스틱 회귀) - Batch 6
14. ✅ **Ordinal Regression** (순서형 회귀) - Batch 5
15. ✅ **Poisson Regression** (포아송 회귀) - Batch 5
16. ✅ **Stepwise Regression** (단계적 회귀) - Batch 6
17. ✅ **Partial Correlation** (편상관) - Batch 6

### ~~우선순위 4: 고급 분석 (6개)~~ ✅ 5개 완료
18. ✅ **Discriminant Analysis** (판별분석) - Batch 9 (해석 엔진만, UI는 기존재)
19. ⬜ **Factor Analysis** (요인분석) - PCA에 포함됨
20. ✅ **Mixed Model** (혼합 모형) - Batch 8
21. ✅ **Power Analysis** (검정력 분석) - Batch 8
22. ✅ **Dose-Response** (용량-반응) - Batch 7
23. ✅ **Response Surface** (반응표면) - Batch 7

### 우선순위 5: 기타 (5개)
24. ⬜ **Descriptive** (기술통계)
25. ⬜ **Proportion Test** (비율 검정)
26. ⬜ **One-sample t-test** (일표본 t검정)
27. ⬜ **Explore Data** (탐색적 분석)
28. ⬜ **Means Plot** (평균 플롯)

---

## 실제 작업 결과 (Phase 1)

### ✅ Batch 1 (4개) - 대응/쌍대 검정
1. ✅ Wilcoxon Signed-Rank Test (대응표본 비모수)
2. ✅ Sign Test (부호 검정)
3. ✅ Friedman Test (반복측정 비모수 ANOVA)
4. ✅ Cochran Q Test (다중 이분형 변수)

**코드**: +105줄 (engine.ts) | **테스트**: engine-batch1.test.ts (225줄, 13개 테스트)

### ✅ Batch 2 (4개) - 독립/무작위 검정
5. ✅ Mood's Median Test (중앙값 검정)
6. ✅ Runs Test (무작위성 검정)
7. ✅ Mann-Kendall Test (추세 검정)
8. ✅ Binomial Test (이항 검정)

**코드**: +95줄 (engine.ts) | **테스트**: engine-batch2.test.ts (267줄, 16개 테스트)

### ✅ 버그 수정 (3개)
- [High] Mann-Whitney U Test 해석 추가 (+13줄)
- [Low] Mood's Median 표현 개선 (+2줄)
- [Low] Mann-Kendall 검증 강화 (+27줄)

**코드**: +42줄 (engine.ts) | **테스트**: engine-fixes.test.ts (227줄, 12개 테스트)

---

## 실제 작업 결과 (Phase 2)

### ✅ Batch 3 (2개) - ANOVA 변형 1
1. ✅ Two-way ANOVA (이원분산분석)
2. ✅ Repeated Measures ANOVA (반복측정 분산분석)

**코드**: +49줄 (engine.ts) | **테스트**: engine-anova-variants.test.ts (374줄, 21개 테스트)

### ✅ Batch 4 (2개) - ANOVA 변형 2
3. ✅ ANCOVA (공분산분석)
4. ✅ MANOVA (다변량 분산분석)

**코드**: +49줄 (engine.ts) | **특징**: Batch 3와 동일 테스트 파일 공유

**주요 개선**:
- ANOVA 우선순위 매칭: 구체적 → 일반적 (Two-way → One-way)
- 다양한 표기 지원: 영어, 한글, 숫자 (2원분산분석)
- 맥락 기반 해석: 각 ANOVA 변형의 특성 반영

---

## 실제 vs 예상 비교

### Phase 1 (비모수 검정 8개)

| 항목 | 예상 | 실제 | 차이 |
|------|------|------|------|
| 기능 코드 | 200줄 | 290줄 | +45% (더 견고한 검증) |
| 테스트 코드 | 40개 | 41개 | +2.5% |
| 테스트 파일 크기 | - | 719줄 | - |
| 버그 발견/수정 | 0개 | 3개 | 품질 검증 효과 |
| TypeScript 에러 | 0개 | 0개 | ✓ |
| 테스트 통과율 | 100% | 107/107 | ✓ |

**결론**: 예상보다 45% 더 많은 코드를 작성했지만, 엣지 케이스 검증과 버그 수정으로 품질이 크게 향상됨.

### Phase 2 (ANOVA 변형 4개)

| 항목 | 예상 | 실제 | 차이 |
|------|------|------|------|
| 기능 코드 | 120줄 | 98줄 | -18% (간결한 구현) |
| 테스트 코드 | 20개 | 26개 | +30% |
| 테스트 파일 크기 | - | 457줄 | - |
| 버그 발견/수정 | 0개 | 1개 | [Critical] Two-way ANOVA 매칭 |
| TypeScript 에러 | 0개 | 0개 | ✓ |
| 테스트 통과율 | 100% | 128/128 | ✓ |

**결론**: 예상보다 코드가 적지만, 우선순위 매칭 전략으로 효율적 구현. 테스트는 목표 초과 달성.

**버그 수정** (Phase 2 추가):
4. [Critical] Two-way ANOVA 매칭 실패 → normalizeMethod() 공백/하이픈 제거 강화 (사용자 피드백)
   - `'이원 분산분석'` (공백 포함) → null 반환 문제
   - `'2-way ANOVA'` (하이픈 포함) → 매칭 실패 문제
   - **수정**: `.replace(/\s+/g, ' ')` → `.replace(/[-\s]+/g, '')`
   - **추가 테스트**: 5개 엣지 케이스 (26/26 통과)

### Phase 3 (회귀 변형 5개)

| 항목 | 예상 | 실제 | 차이 |
|------|------|------|------|
| 기능 코드 | 150줄 | 150줄 | 정확 일치 |
| 테스트 코드 | 25개 | 23개 | -8% |
| 테스트 파일 크기 | - | 562줄 | - |
| 버그 발견/수정 | 0개 | 3개 | [High] 3개 Critical 버그 |
| TypeScript 에러 | 0개 | 0개 | ✓ |
| 테스트 통과율 | 100% | 156/156 | ✓ |

**결론**: 예상과 거의 일치. CoefficientResult 타입 검증으로 타입 안전성 강화.

**Phase 3 버그 수정** (사후 검토):
5. [High] Transformer에 regression metrics 누락 → pseudo R², AIC, finalVariables 등 9개 필드 추가
6. [High] adjRSquared vs adjustedRSquared 키 불일치 → 두 키 모두 지원 (하위 호환성)
7. [Medium] Predictor counting 일관성 문제 → Intercept 필터링 후 카운트 (case-insensitive)
8. [Medium] Model p-value 무시 → 🟡 보류 (별도 이슈로 분리, Phase 4 검토 예정)

### Phase 4 (고급 분석 5개)

| 항목 | 예상 | 실제 | 차이 |
|------|------|------|------|
| 기능 코드 | 120줄 | 194줄 | +62% (Discriminant Analysis +48줄) |
| 테스트 코드 | 16개 | 26개 | +63% (Discriminant Analysis +8개) |
| 테스트 파일 크기 | - | 687줄 | +204줄 (Discriminant Analysis) |
| 버그 발견/수정 | 0개 | 0개 | ✓ |
| TypeScript 에러 | 0개 | 0개 | ✓ |
| 테스트 통과율 | 100% | 177/177 | ✓ (Discriminant 8/8 통과) |

**결론**: R² 임계값, Power 임계값 등 세밀한 해석 분기로 코드가 증가. 모든 테스트 100% 통과.

**특징**:
- Dose-Response: 4PL/Weibull 모델, EC50/IC50 값 해석
- Response Surface: 최적점/saddle point 탐색 가이드
- Mixed Model: 고정효과/무선효과, ICC 해석
- Power Analysis: A-priori/Post-hoc/Compromise 3가지 시나리오
- Discriminant Analysis: 정확도 3단계 해석 (70%/50% 기준), Wilks' Lambda, Box's M
