# Phase 1-C: 40개 스냅샷 작성 가이드

**작성일**: 2025-11-24
**예상 소요 시간**: 9시간 (12시간 - 3시간 완료)
**현재 상태**: 13/43 완료 (3개 활성 + 10개 스킵 상태)
**목표**: 30/43 스냅샷 JSON 파일 작성 + 테스트 활성화

---

## 📋 작업 개요

### 목표
- **30개 통계 방법**에 대한 스냅샷 JSON 파일 작성 (나머지)
- 각 통계당 **3개 시나리오** (significant, nonsignificant, boundary)
- 총 **90개 테스트 케이스** 추가

### 현재 완성된 13개
**활성 테스트** (3개 - snapshots-simple.test.ts):
1. ✅ **t-test** (Independent t-test) - Purpose 기반
2. ✅ **ANOVA** (One-way ANOVA) - Method 기반
3. ✅ **Correlation** (Pearson Correlation) - Purpose 기반

**JSON 파일 준비** (10개 - snapshots.test.ts, 스킵 상태):
4. ✅ **Mann-Whitney** U Test
5. ✅ **Wilcoxon** Signed-Rank Test
6. ✅ **Kruskal-Wallis** Test
7. ✅ **Friedman** Test
8. ✅ **Chi-Square** Test
9. ✅ **McNemar** Test
10. ✅ **Linear Regression**
11. ✅ **Logistic Regression**
12. ✅ **Shapiro-Wilk** Test
13. ✅ **Levene** Test

---

## 🎯 작업 단계

### Step 1: 통계 방법 분류 및 우선순위 설정

#### 우선순위 높음 (✅ 10개 완료 - 스킵 상태)
비모수 검정 + 기본 검정:
1. ✅ **Mann-Whitney U Test** (비모수 2집단 비교)
2. ✅ **Wilcoxon Signed-Rank Test** (비모수 대응표본)
3. ✅ **Kruskal-Wallis Test** (비모수 다집단 비교)
4. ✅ **Friedman Test** (비모수 반복측정)
5. ✅ **Chi-Square Test** (범주형 독립성 검정)
6. ✅ **McNemar Test** (대응표본 범주형)
7. ✅ **Linear Regression** (선형 회귀)
8. ✅ **Logistic Regression** (로지스틱 회귀)
9. ✅ **Shapiro-Wilk Test** (정규성 검정)
10. ✅ **Levene Test** (등분산성 검정)

**상태**: JSON 파일 작성 완료, `snapshots.test.ts`에서 `describe.skip()` 처리

#### 우선순위 중간 (20개, 6시간)
고급 ANOVA + 특수 검정:
1. **Repeated Measures ANOVA** (반복측정 분산분석)
2. **ANCOVA** (공분산분석)
3. **MANOVA** (다변량 분산분석)
4. **Two-way ANOVA** (이원 분산분석)
5. **Welch's t-test** (등분산 가정 완화 t-검정)
6. **One-sample t-test** (일표본 t-검정)
7. **Paired t-test** (대응표본 t-검정)
8. **Binomial Test** (이항검정)
9. **Proportion Test** (비율검정)
10. **Sign Test** (부호검정)
11. **Runs Test** (무작위성 검정)
12. **Mood's Median Test** (중위수 검정)
13. **Mann-Kendall Test** (추세 검정)
14. **K-S Test** (Kolmogorov-Smirnov 검정)
15. **Anderson-Darling Test** (정규성 검정)
16. **Bartlett Test** (등분산성 검정)
17. **Cochran Q Test** (다중 이분형 변수 검정)
18. **Fisher's Exact Test** (소표본 범주형 검정)
19. **Spearman Correlation** (비모수 상관분석)
20. **Partial Correlation** (편상관분석)

#### 우선순위 낮음 (12개, 3시간)
다변량 + 고급 모델링:
1. **PCA** (주성분분석)
2. **Factor Analysis** (요인분석)
3. **Cluster Analysis** (군집분석)
4. **Discriminant Analysis** (판별분석)
5. **Poisson Regression** (포아송 회귀)
6. **Ordinal Regression** (순서형 회귀)
7. **Stepwise Regression** (단계적 회귀)
8. **Mixed Model** (혼합모형)
9. **Dose-Response Analysis** (용량-반응 분석)
10. **Response Surface Analysis** (반응표면분석)
11. **Power Analysis** (검정력 분석)
12. **Reliability Analysis** (신뢰도 분석 - Cronbach's Alpha)

---

## 📝 JSON 파일 작성 템플릿

### 파일 위치
```
__tests__/lib/interpretation/snapshots/[통계명].json
```

### JSON 구조
```json
{
  "method": "통계 방법명 (engine.ts의 method와 정확히 일치)",
  "scenarios": [
    {
      "name": "significant-large-effect",
      "description": "유의한 결과 + 큰 효과 크기",
      "input": {
        "method": "통계 방법명",
        "statistic": 숫자,
        "pValue": 0.001,
        "df": 숫자 또는 [df1, df2],
        "effectSize": { "value": 0.8, "type": "Cohen's d" },
        "groupStats": [...],  // 필요시
        "coefficients": [...],  // 필요시
        "additional": { ... }  // 필요시
      },
      "expectedOutput": {
        "title": "기대되는 제목",
        "summary": "기대되는 요약",
        "statistical": "기대되는 통계적 해석",
        "practical": "기대되는 실질적 해석 (또는 null)"
      }
    },
    {
      "name": "nonsignificant-small-effect",
      "description": "비유의한 결과 + 작은 효과 크기",
      "input": { ... },
      "expectedOutput": { ... }
    },
    {
      "name": "boundary-case-p-near-0.05",
      "description": "경계값 케이스 (p ≈ 0.05)",
      "input": { ... },
      "expectedOutput": { ... }
    }
  ]
}
```

---

## 🔍 작업 프로세스 (통계당 15-20분)

### 1. engine.ts에서 해당 통계 로직 확인
```bash
grep -n "mann-whitney" lib/interpretation/engine.ts -i -A 30
```
- method명 정확히 확인 (대소문자, 띄어쓰기)
- 필요한 필드 확인 (groupStats, coefficients, additional 등)
- title, summary, statistical, practical 패턴 확인

### 2. debug-output.test.ts로 실제 출력 확인
```typescript
// __tests__/lib/interpretation/debug-output.test.ts에 임시 테스트 추가
it('Mann-Whitney 실제 출력 확인', () => {
  const result = getInterpretation({
    method: 'Mann-Whitney U Test',
    statistic: 350,
    pValue: 0.012,
    groupStats: [
      { name: 'Group A', mean: 50, std: 10, n: 30 },
      { name: 'Group B', mean: 58, std: 12, n: 30 }
    ]
  } as AnalysisResult)

  console.log('=== Mann-Whitney 실제 출력 ===')
  console.log(JSON.stringify(result, null, 2))
})
```

### 3. JSON 파일 작성
- 실제 출력을 expectedOutput에 복사
- 3가지 시나리오 (significant, nonsignificant, boundary) 작성

### 4. snapshots-simple.test.ts에 테스트 추가
```typescript
describe('Golden Snapshot: Mann-Whitney (Method-based)', () => {
  it('Scenario 1: significant + large effect', () => {
    const result = getInterpretation({
      method: 'Mann-Whitney U Test',
      statistic: 350,
      pValue: 0.012,
      // ...
    } as AnalysisResult)

    expect(result).not.toBeNull()
    expect(result!.title).toBe('비모수 두 집단 비교')
    // ... (expectedOutput 기반)
    expect(result).toMatchSnapshot()
  })
  // Scenario 2, 3 추가
})
```

### 5. 테스트 실행 및 검증
```bash
npm test -- snapshots-simple.test.ts
```
- 실패 시 expectedOutput 수정
- `--updateSnapshot` 플래그로 스냅샷 갱신

---

## 🎯 Purpose vs Method 기반 구분

### Method 기반 (method명만으로 해석 가능)
- ANOVA 계열 (One-way, Two-way, Repeated, ANCOVA, MANOVA)
- 비모수 다집단 (Kruskal-Wallis, Friedman)
- 정규성 검정 (Shapiro-Wilk, K-S, Anderson-Darling)
- 등분산성 검정 (Levene, Bartlett)
- 다변량 분석 (PCA, Factor, Cluster, Discriminant)

**테스트 방법**:
```typescript
const result = getInterpretation({
  method: 'One-way ANOVA',
  // ...
} as AnalysisResult)  // purpose 파라미터 없음
```

### Purpose 기반 (purpose 파라미터 필수)
- 2집단 비교 (t-test, Mann-Whitney, Welch, Wilcoxon)
- 상관분석 (Pearson, Spearman, Partial Correlation)
- 회귀분석 (Linear, Logistic, Poisson, Ordinal)

**테스트 방법**:
```typescript
const result = getInterpretation(
  {
    method: 'Independent t-test',
    // ...
  } as AnalysisResult,
  '비교'  // purpose 필수!
)
```

---

## 🚨 주의사항

### 1. method명 정확성
```typescript
// ✅ 올바름
"method": "Mann-Whitney U Test"

// ❌ 틀림 (띄어쓰기, 대소문자)
"method": "mann-whitney"
"method": "Mann Whitney Test"
```

### 2. pValue 포맷
- engine.ts는 `p< 0.001` (띄어쓰기 없음) 또는 `p=0.001` 형태
- 소수점 3자리 기준 (`p=0.023`)

### 3. effectSize 타입
```typescript
// Cohen's d
"effectSize": { "value": 0.8, "type": "Cohen's d" }

// Eta-squared
"effectSize": { "value": 0.15, "type": "Eta-squared" }

// r (상관계수)
"effectSize": { "value": 0.7, "type": "Pearson r" }
```

### 4. additional 필드
- 회귀: `rSquared`, `adjustedRSquared`, `fStatistic`
- ANOVA: `etaSquared`, `omegaSquared`
- 군집: `silhouetteScore`, `nClusters`
- 검정력: `power`, `sampleSize`
- 신뢰도: `alpha`, `nItems`

---

## 📊 진행 상황 추적

### Checklist (30개 남음)
```markdown
### 비모수 검정 (2개)
- [x] Mann-Whitney U Test ✅
- [x] Wilcoxon Signed-Rank Test ✅
- [x] Kruskal-Wallis Test ✅
- [x] Friedman Test ✅
- [ ] Sign Test
- [ ] Mood's Median Test

### 범주형 검정 (4개)
- [x] Chi-Square Test ✅
- [x] McNemar Test ✅
- [ ] Binomial Test
- [ ] Cochran Q Test
- [ ] Fisher's Exact Test
- [ ] Proportion Test

### 회귀 분석 (3개)
- [x] Linear Regression ✅
- [x] Logistic Regression ✅
- [ ] Poisson Regression
- [ ] Ordinal Regression
- [ ] Stepwise Regression

### 고급 ANOVA (4개)
- [ ] Repeated Measures ANOVA
- [ ] ANCOVA
- [ ] MANOVA
- [ ] Two-way ANOVA

### t-검정 변형 (3개)
- [ ] Welch's t-test
- [ ] One-sample t-test
- [ ] Paired t-test

### 정규성/가정 검정 (3개)
- [x] Shapiro-Wilk Test ✅
- [x] Levene Test ✅
- [ ] K-S Test
- [ ] Anderson-Darling Test
- [ ] Bartlett Test

### 상관분석 (2개)
- [ ] Spearman Correlation
- [ ] Partial Correlation

### 다변량 분석 (4개)
- [ ] PCA
- [ ] Factor Analysis
- [ ] Cluster Analysis
- [ ] Discriminant Analysis

### 고급 모델링 (4개)
- [ ] Mixed Model
- [ ] Dose-Response Analysis
- [ ] Response Surface Analysis
- [ ] Power Analysis

### 기타 (3개)
- [ ] Runs Test
- [ ] Mann-Kendall Test
- [ ] Reliability Analysis (Cronbach's Alpha)
```

---

## 🎯 완료 기준

1. ✅ 30개 JSON 파일 작성 완료 (13개 완료 + 30개 남음)
2. ✅ `describe.skip()` 제거 (snapshots.test.ts)
3. ✅ `npm test -- snapshots.test.ts` 전체 통과
4. ✅ 129/129 테스트 통과 (43개 통계 × 3 시나리오)

---

## 📚 참고 자료

### 기존 완성 파일
- `__tests__/lib/interpretation/snapshots/t-test.json`
- `__tests__/lib/interpretation/snapshots/anova.json`
- `__tests__/lib/interpretation/snapshots/correlation.json`

### 테스트 파일
- `__tests__/lib/interpretation/snapshots-simple.test.ts`
- `__tests__/lib/interpretation/debug-output.test.ts`

### 해석 엔진
- `lib/interpretation/engine.ts` (1,334줄)

### 문서
- `docs/GOLDEN_SNAPSHOT_STATUS.md`
- `docs/RECONCILIATION_REPORT.md`

---

**작성**: 2025-11-24
**다음 단계**: Phase 1-C 완료 후 `describe.skip()` 제거 + CI/CD 통합
