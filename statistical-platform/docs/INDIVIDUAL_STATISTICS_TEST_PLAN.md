# 개별 통계 분석 테스트 계획

## 📊 현황

- **총 통계 분석**: 48개
- **그룹**: 6개 (descriptive, hypothesis, anova, nonparametric, regression, advanced)
- **테스트 방식**: 단위 테스트 (Jest) + Python 실제 계산 검증

## 🎯 테스트 전략

### Phase 1: 핵심 통계 (High Priority) - 15개
가장 자주 사용되는 기본 통계

#### 1.1 기술통계 그룹 (3개)
- [ ] `descriptive` - 기술통계량
- [ ] `frequency` - 빈도분석
- [ ] `crosstab` - 교차표

#### 1.2 가설검정 그룹 (4개)
- [ ] `one-sample-t` - 일표본 t-검정
- [ ] `independent-t` - 독립표본 t-검정
- [ ] `paired-t` - 대응표본 t-검정
- [ ] `chi-square` - 카이제곱 검정

#### 1.3 분산분석 그룹 (3개)
- [ ] `one-way-anova` - 일원분산분석
- [ ] `repeated-anova` - 반복측정 분산분석
- [ ] `two-way-anova` - 이원분산분석

#### 1.4 비모수 그룹 (3개)
- [ ] `mann-whitney` - Mann-Whitney U 검정
- [ ] `wilcoxon` - Wilcoxon 부호순위 검정
- [ ] `kruskal-wallis` - Kruskal-Wallis 검정

#### 1.5 회귀분석 그룹 (2개)
- [ ] `correlation` - 상관분석
- [ ] `simple-regression` - 단순선형회귀

---

### Phase 2: 중급 통계 (Medium Priority) - 18개

#### 2.1 가설검정 추가 (5개)
- [ ] `z-test` - Z-검정
- [ ] `proportion-test` - 비율검정
- [ ] `variance-test` - 분산검정
- [ ] `normality-test` - 정규성 검정
- [ ] `levene-test` - Levene 검정

#### 2.2 분산분석 추가 (4개)
- [ ] `ancova` - 공분산분석
- [ ] `manova` - 다변량분산분석
- [ ] `mixed-anova` - 혼합분산분석
- [ ] `nested-anova` - 중첩분산분석

#### 2.3 비모수 추가 (4개)
- [ ] `friedman` - Friedman 검정
- [ ] `mcnemar` - McNemar 검정
- [ ] `cochran-q` - Cochran's Q 검정
- [ ] `kendall-w` - Kendall's W 검정

#### 2.4 회귀분석 추가 (5개)
- [ ] `multiple-regression` - 다중회귀분석
- [ ] `logistic-regression` - 로지스틱 회귀
- [ ] `polynomial-regression` - 다항회귀
- [ ] `partial-correlation` - 편상관분석
- [ ] `spearman-correlation` - Spearman 상관

---

### Phase 3: 고급 통계 (Low Priority) - 15개

#### 3.1 고급분석 그룹 (15개)
- [ ] `factor-analysis` - 요인분석
- [ ] `pca` - 주성분분석
- [ ] `cluster-analysis` - 군집분석
- [ ] `discriminant-analysis` - 판별분석
- [ ] `reliability-analysis` - 신뢰도 분석
- [ ] `survival-analysis` - 생존분석
- [ ] `time-series` - 시계열 분석
- [ ] `structural-equation` - 구조방정식
- [ ] `multilevel-model` - 다층모형
- [ ] `meta-analysis` - 메타분석
- [ ] `bootstrap` - 부트스트랩
- [ ] `permutation-test` - 순열검정
- [ ] `power-analysis` - 검정력 분석
- [ ] `sample-size` - 표본크기 계산
- [ ] `effect-size` - 효과크기 분석

---

## 🧪 테스트 구조

### 1. 테스트 파일 구조
```
statistical-platform/
├── __tests__/
│   ├── statistics/
│   │   ├── descriptive/
│   │   │   ├── descriptive.test.ts
│   │   │   ├── frequency.test.ts
│   │   │   └── crosstab.test.ts
│   │   ├── hypothesis/
│   │   │   ├── one-sample-t.test.ts
│   │   │   ├── independent-t.test.ts
│   │   │   └── ...
│   │   ├── anova/
│   │   ├── nonparametric/
│   │   ├── regression/
│   │   └── advanced/
│   └── integration/
│       └── pyodide-core.test.ts
```

### 2. 테스트 케이스 구성

각 통계 분석마다:

1. **기본 케이스** (정상 데이터)
   ```typescript
   it('should calculate correctly with normal data', async () => {
     const result = await method.analyze({
       data: normalData,
       variables: { ... }
     })
     expect(result).toMatchSnapshot()
   })
   ```

2. **엣지 케이스**
   - 작은 샘플 크기 (n < 5)
   - 결측치 포함
   - 이상치 포함
   - 분산=0

3. **에러 케이스**
   - 잘못된 변수 타입
   - 필수 변수 누락
   - 가정 위반

4. **Python 검증** (선택적)
   ```typescript
   it('should match Python SciPy results', async () => {
     const result = await method.analyze(testData)
     expect(result.statistic).toBeCloseTo(expectedFromPython, 5)
   })
   ```

---

## 📈 진행 방식

### Step 1: Phase 1 시작 (15개 핵심 통계)
- 1일차: 기술통계 3개
- 2일차: 가설검정 4개
- 3일차: 분산분석 3개
- 4일차: 비모수 3개
- 5일차: 회귀분석 2개

### Step 2: Phase 1 통과 후 Phase 2 진행
- 중급 통계 18개 (예상 7일)

### Step 3: Phase 3은 필요 시
- 고급 통계 15개 (예상 6일)

---

## ✅ 완료 기준

각 통계 분석마다:
- [x] 기본 케이스 테스트 작성
- [x] 엣지 케이스 테스트 작성
- [x] TypeScript 컴파일 에러 0개
- [x] 테스트 통과율 100%
- [x] (선택) Python 결과와 비교 검증

---

## 📝 현재 상태

- Phase 1: **0/15** (0%)
- Phase 2: **0/18** (0%)
- Phase 3: **0/15** (0%)
- **전체**: **0/48** (0%)

---

**Updated**: 2025-11-11
**Next**: Phase 1 시작 - 기술통계 3개
