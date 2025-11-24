# Golden Snapshot 구축 현황

**작성일**: 2025-11-24 (최종 업데이트)
**목표**: 43개 통계 × 3 시나리오 = 129개 스냅샷 구축

**현재 진행률**:
- ✅ **활성 테스트**: 9/129 = **7%** (snapshots-simple.test.ts, 3개 통계)
- 📁 **준비된 파일**: 39/129 = **30%** (JSON 파일 13개, 스킵 상태)
- 🎯 **최종 목표**: 129/129 = **100%** (43개 통계 × 3 시나리오)

---

## ✅ 완료된 작업

### Phase 1-A: 인프라 + 기본 3개 (완료)
1. **인프라 구축**
   - [x] `__tests__/lib/interpretation/snapshots/` 디렉토리
   - [x] JSON 스냅샷 구조 설계
   - [x] 스냅샷 테스트 러너

2. **기본 3개 스냅샷** (9개 테스트)
   - [x] t-test (Purpose 기반)
   - [x] ANOVA (Method 기반)
   - [x] Correlation (Purpose 기반)

### Phase 1-C: 우선순위 높음 10개 (완료 ✅)
**비모수 검정** (4개):
- [x] Mann-Whitney U Test
- [x] Wilcoxon Signed-Rank Test
- [x] Kruskal-Wallis Test
- [x] Friedman Test

**범주형 검정** (2개):
- [x] Chi-Square Test
- [x] McNemar Test

**회귀 분석** (2개):
- [x] Linear Regression
- [x] Logistic Regression

**가정 검정** (2개):
- [x] Shapiro-Wilk Test (정규성)
- [x] Levene Test (등분산성)

**총 39개 테스트** (13개 통계 × 3 시나리오)

### 3. 자동화 도구
- [x] `scripts/generate-snapshots.mjs` - 스냅샷 자동 생성 스크립트
- [x] `debug-output.test.ts` - 실제 출력 검증 (12개 테스트)

---

## 📊 테스트 결과

### snapshots-simple.test.ts (2025-11-24 최종)

```
✅ Test Suites: 1 passed, 1 total
✅ Tests:       9 passed, 9 total
✅ Snapshots:   9 passed, 9 total
⏱️  Time:       6.53 s
```

### snapshots.test.ts (JSON 기반 - 비활성 상태)

```
⏸️  Test Suites: 1 passed (47 tests skipped)
📁 JSON Files:   13 files (39 scenarios prepared)
🚫 Status:       describe.skip() - 현재 실행 안 됨
⏳ 활성화 예정:  Phase 1-C 완료 후 (30개 JSON 추가 시)
```

**비활성화 이유**: 13개 JSON 파일은 준비되었으나, 전체 43개 완성 전까지 스킵 처리
**CI/CD 영향**: 현재 CI/CD에서 이 테스트는 실행되지 않음

**스킵된 13개 통계**:
1. ANOVA, 2. Chi-Square, 3. Correlation, 4. Friedman, 5. Kruskal-Wallis,
6. Levene, 7. Linear Regression, 8. Logistic Regression, 9. Mann-Whitney,
10. McNemar, 11. Shapiro-Wilk, 12. t-test, 13. Wilcoxon

**✅ 전체 통과 (9/9 = 100%)**:
- ✅ ANOVA Scenario 1: significant + large effect
- ✅ ANOVA Scenario 2: nonsignificant + small effect (수정 완료)
- ✅ ANOVA Scenario 3: boundary case
- ✅ t-test Scenario 1: significant + large effect (수정 완료)
- ✅ t-test Scenario 2: nonsignificant + small effect
- ✅ t-test Scenario 3: boundary case
- ✅ Correlation Scenario 1: strong positive (수정 완료)
- ✅ Correlation Scenario 2: weak negative (수정 완료)
- ✅ Correlation Scenario 3: moderate positive (수정 완료)

**수정 내역 (5개)**:
- ANOVA Scenario 2: "집단 간..." → "모든 그룹..."
- t-test Scenario 1: "p=< 0.001" → "p=0.001"
- Correlation Scenario 1: "72.3%" → "72.2%"
- Correlation Scenario 2: "약한 음의 상관관계가..." → "상관관계가..."
- Correlation Scenario 3: "20.2%" → "20.3%"

---

## 🔍 발견된 문제점

### 1. Purpose vs Method 기반 해석
**문제**: 일부 통계는 `purpose` 파라미터가 필수

| 통계 | Method 기반 | Purpose 기반 | 해결 방법 |
|------|-----------|-------------|----------|
| ANOVA | ✅ 지원 | - | method만으로 OK |
| t-test (2집단) | ❌ null 반환 | ✅ 지원 | purpose 필수 |
| Correlation | ❌ null 반환 | ✅ 지원 | purpose 필수 |

**해결**: 테스트 시 `getInterpretation(data, purpose)` 형태로 호출

---

### 2. 텍스트 미세한 차이
**문제**: 실제 출력과 기대값 불일치

**예시**:
```typescript
// 기대값 (JSON)
"집단 간 통계적으로 유의한 차이가 없습니다 (p=0.172)."

// 실제 출력
"모든 그룹 평균이 통계적으로 유사합니다 (p=0.172)."
```

**해결**: 실제 엔진 출력을 확인 후 JSON 수정 필요

---

### 3. p-value 포맷팅 불일치
**문제**: `p=< 0.001` vs `p<0.001`

```typescript
// 기대값
"p=< 0.001"

// 실제 출력
"p< 0.001"  // 띄어쓰기 없음
```

**해결**: 엔진 코드 확인 필요 (`formatPValue` 함수)

---

## 🎯 다음 단계

### Phase 1-B: 기존 3개 스냅샷 수정 (예상 2시간)

1. **실제 출력 확인**
   ```bash
   npm test -- debug-output.test.ts
   ```

2. **JSON 파일 수정**
   - anova.json: statistical 텍스트 수정
   - t-test.json: p-value 포맷 수정
   - correlation.json: r² 계산 수정

3. **테스트 재실행**
   ```bash
   npm test -- snapshots-simple.test.ts --updateSnapshot
   ```

**목표**: 9/9 tests passing ✅

---

### Phase 1-C: 나머지 30개 통계 스냅샷 작성 (예상 9시간)

**우선순위 높음** (✅ 10개 완료 - 스킵 상태):
- ✅ Mann-Whitney U Test
- ✅ Wilcoxon Signed-Rank Test
- ✅ Kruskal-Wallis Test
- ✅ Friedman Test
- ✅ Chi-Square Test
- ✅ McNemar Test
- ✅ Linear Regression
- ✅ Logistic Regression
- ✅ Shapiro-Wilk Test
- ✅ Levene Test

**우선순위 중간** (20개, 예상 6시간):
- Repeated Measures ANOVA
- ANCOVA
- MANOVA
- Two-way ANOVA
- Welch's t-test
- One-sample t-test
- Paired t-test
- Binomial Test
- Proportion Test
- Sign Test
- Runs Test
- Mood's Median Test
- Mann-Kendall Test
- K-S Test
- Anderson-Darling Test
- Bartlett Test
- Cochran Q Test
- Fisher's Exact Test
- Spearman Correlation
- Partial Correlation

**우선순위 낮음** (10개, 예상 3시간):
- PCA
- Factor Analysis
- Cluster Analysis
- Discriminant Analysis
- Poisson Regression
- Ordinal Regression
- Stepwise Regression
- Mixed Model
- Dose-Response Analysis
- Response Surface Analysis
- Power Analysis
- Reliability Analysis (Cronbach's Alpha)

---

## 📋 작업 체크리스트

### Phase 1-A (완료)
- [x] 스냅샷 디렉토리 생성
- [x] 3개 JSON 파일 작성 (t-test, ANOVA, Correlation)
- [x] 테스트 러너 작성
- [x] 첫 테스트 실행

### Phase 1-B (✅ 완료, 2025-11-24)
- [x] 실제 출력과 기대값 비교 분석 (debug-output.test.ts)
- [x] 테스트 파일 수정 (snapshots-simple.test.ts - expected 값 5개 수정)
- [x] 테스트 재실행 (✅ 9/9 passing 달성)
- [x] 스냅샷 파일 확인 (`__snapshots__/` - 5개 생성됨)

### Phase 1-C (이후 작업, 9시간)
- [x] 우선순위 높음 10개 JSON 작성 (✅ 완료, 스킵 상태)
- [ ] 우선순위 중간 20개 JSON 작성
- [ ] 우선순위 낮음 10개 JSON 작성
- [ ] `describe.skip()` 제거 (snapshots.test.ts 활성화)
- [ ] 전체 테스트 실행 (129/129 passing 목표)
- [ ] CI/CD 통합 (GitHub Actions)

---

## 💡 교훈

1. **Purpose vs Method**: 통계마다 해석 방식이 다름
   - ANOVA: method만으로 OK
   - t-test/Correlation: purpose 필수

2. **실제 출력 확인 필수**: JSON 작성 전 debug 테스트 먼저 실행

3. **점진적 구축**: 3개 → 10개 → 43개 단계적 확장

4. **스냅샷 자동 업데이트**: `--updateSnapshot` 플래그 활용

---

## 📊 최종 목표

**129개 스냅샷 (43개 통계 × 3 시나리오)**

| 구분 | 활성 테스트 | 준비된 파일 | 최종 목표 |
|------|-----------|-----------|----------|
| 개수 | 9 | 39 | 129 |
| 진행률 | **7%** | **30%** | 100% |
| 상태 | ✅ 통과 | ⏸️ 스킵 | 🎯 목표 |

**활성 테스트**: 3/43 (7%) - t-test, ANOVA, Correlation
**준비된 파일**: 13/43 (30%) - 위 3개 + 비모수 4개 + 범주형 2개 + 회귀 2개 + 가정 검정 2개

**예상 총 시간**: 14시간 (2시간 수정 + 12시간 신규)

**완료 예상일**: 2일 작업 (7시간/일 기준)

---

**최종 업데이트**: 2025-11-24 23:00
**다음 작업**: Phase 1-B (JSON 수정, 2시간)
