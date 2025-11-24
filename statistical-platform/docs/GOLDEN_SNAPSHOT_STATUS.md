# Golden Snapshot 구축 현황

**작성일**: 2025-11-24
**목표**: 43개 통계 × 3 시나리오 = 129개 스냅샷 구축
**현재 진행률**: **7%** (9/129 테스트 작성)

---

## ✅ 완료된 작업 (Phase 1-A)

### 1. 인프라 구축
- [x] `__tests__/lib/interpretation/snapshots/` 디렉토리 생성
- [x] JSON 기반 스냅샷 구조 설계
- [x] 스냅샷 테스트 러너 작성

### 2. 대표 통계 3개 스냅샷 작성
- [x] **t-test** (3 scenarios) - Purpose 기반
- [x] **ANOVA** (3 scenarios) - Method 기반
- [x] **Correlation** (3 scenarios) - Purpose 기반

**총 9개 테스트** (3개 통계 × 3 시나리오)

### 3. 테스트 파일
- [x] `snapshots.test.ts` - 자동 JSON 로더 (미완성, 수정 필요)
- [x] `snapshots-simple.test.ts` - 간소화 버전 (4/9 passing)
- [x] `debug-output.test.ts` - 실제 출력 확인용

---

## 📊 테스트 결과

### snapshots-simple.test.ts (2025-11-24)

```
Test Suites: 1 failed, 1 total
Tests:       4 passed, 5 failed, 9 total
Snapshots:   4 written, 4 total
```

**통과 (4개)**:
- ✅ ANOVA Scenario 1: significant + large effect
- ✅ ANOVA Scenario 3: boundary case
- ✅ t-test Scenario 2: nonsignificant
- ✅ t-test Scenario 3: boundary case

**실패 (5개)** - 기대값과 실제 출력 불일치:
- ❌ ANOVA Scenario 2: "집단 간..." vs "모든 그룹..."
- ❌ t-test Scenario 1: "p=< 0.001" vs "p<0.001" (띄어쓰기)
- ❌ Correlation 3개: r² 계산 방식 차이

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

### Phase 1-C: 나머지 40개 통계 스냅샷 작성 (예상 12시간)

**우선순위 높음** (10개, 예상 3시간):
- Mann-Whitney U Test
- Wilcoxon Signed-Rank Test
- Kruskal-Wallis Test
- Friedman Test
- Chi-Square Test
- McNemar Test
- Linear Regression
- Logistic Regression
- Shapiro-Wilk Test
- Levene Test

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

### Phase 1-B (다음 작업, 2시간)
- [ ] 실제 출력과 기대값 비교 분석
- [ ] JSON 파일 수정 (3개)
- [ ] 테스트 재실행 (9/9 passing 목표)
- [ ] 스냅샷 파일 확인 (`__snapshots__/`)

### Phase 1-C (이후 작업, 12시간)
- [ ] 나머지 40개 통계 JSON 작성
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

| 구분 | 개수 | 진행률 |
|------|------|--------|
| 완료 | 9 | 7% |
| 남음 | 120 | 93% |

**예상 총 시간**: 14시간 (2시간 수정 + 12시간 신규)

**완료 예상일**: 2일 작업 (7시간/일 기준)

---

**최종 업데이트**: 2025-11-24 23:00
**다음 작업**: Phase 1-B (JSON 수정, 2시간)
