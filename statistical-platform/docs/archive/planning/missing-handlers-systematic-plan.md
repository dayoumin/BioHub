# 누락 핸들러 체계적 구현 계획

**원칙**: 정석대로, 완벽하게, 미래 문제 없이
**기간**: 충분한 시간 확보 (서두르지 않음)

---

## 🎯 체계적 접근 방법

### Phase 0: 사전 준비 (Foundation)

#### 1. Pyodide 메서드 전체 조사
```bash
# 모든 통계 메서드 목록 추출
grep "async.*(" pyodide-statistics.ts > pyodide-methods-list.txt

# 누락된 메서드 식별
# 필요한 메서드 vs 존재하는 메서드 비교
```

#### 2. 타입 정의 선행 작업
```typescript
// method-parameter-types.ts에 모든 20개 메서드 타입 먼저 정의
// 이렇게 하면 핸들러 작성 시 타입 안전성 확보

export interface CronbachAlphaParams extends BaseParameters {
  columns: string[]  // 최소 2개
}

export interface FactorAnalysisParams extends BaseParameters {
  columns: string[]
  nFactors?: number
  rotation?: 'varimax' | 'promax' | 'none'
}

// ... 모든 20개 타입 정의
```

#### 3. 테스트 템플릿 작성
```typescript
// __tests__/statistics/handler-test-template.ts
// 모든 핸들러에 적용 가능한 표준 테스트 구조
```

---

## 📋 도메인별 분류 및 순서

### Group 1: 기술통계/신뢰도 (descriptive + reliability)
**파일**: `descriptive.ts`, `reliability.ts`
**핸들러**: 2개
**예상 소요**: 반나절

1. ✅ **cronbachAlpha** (완료)
   - Pyodide: ✅ 존재
   - 파일: reliability.ts (신규)
   - 복잡도: 중간

2. **crosstabAnalysis** (교차표 분석)
   - Pyodide: 확인 필요
   - 파일: descriptive.ts
   - 복잡도: 중간
   - 의존: pandas.crosstab 또는 직접 구현

---

### Group 2: 가설검정 (hypothesis-tests.ts)
**파일**: `hypothesis-tests.ts`
**핸들러**: 1개
**예상 소요**: 2-3시간

3. **oneSampleProportionTest** (비율 검정)
   - Pyodide: 추가 필요
   - 복잡도: 낮음
   - Python: `scipy.stats.binomtest`

```python
# Pyodide에 추가할 메서드
async oneSampleProportionTest(
  successes: number,
  n: number,
  p0: number,
  alternative: string = 'two-sided'
): Promise<ProportionTestResult>
```

---

### Group 3: 비모수 검정 (nonparametric.ts)
**파일**: `nonparametric.ts`
**핸들러**: 4개
**예상 소요**: 1일

4. **ksTest** (Kolmogorov-Smirnov)
   - Pyodide: ✅ 존재 (kolmogorovSmirnovTest)
   - 복잡도: 낮음

5. **signTest** (부호 검정)
   - Pyodide: 추가 필요
   - Python: `scipy.stats.sign_test` (SciPy 1.10+)
   - 복잡도: 낮음

6. **runsTest** (런 검정)
   - Pyodide: 추가 필요
   - Python: `statsmodels.stats.runs.runstest_1samp`
   - 복잡도: 중간

7. **mcNemarTest** (McNemar 검정)
   - Pyodide: 추가 필요
   - Python: `statsmodels.stats.contingency_tables.mcnemar`
   - 복잡도: 낮음

---

### Group 4: 분산분석 확장 (anova.ts)
**파일**: `anova.ts`
**핸들러**: 3개
**예상 소요**: 1-2일

8. **ancova** (공분산분석)
   - Pyodide: 추가 필요
   - Python: `statsmodels.formula.api.ols` + ANCOVA
   - 복잡도: 높음
   - 참고: statsmodels.stats.anova.anova_lm

9. **repeatedMeasuresANOVA** (반복측정)
   - Pyodide: 추가 필요
   - Python: `pingouin.rm_anova` 또는 statsmodels
   - 복잡도: 높음

10. **threeWayANOVA** (삼원분산분석)
    - Pyodide: 추가 필요
    - Python: `statsmodels.formula.api.ols`
    - 복잡도: 중간
    - 참고: 이원분산분석 확장

---

### Group 5: 회귀분석 확장 (regression.ts)
**파일**: `regression.ts`
**핸들러**: 6개
**예상 소요**: 2-3일

11. **partialCorrelation** (편상관)
    - Pyodide: 추가 필요
    - Python: `pingouin.partial_corr`
    - 복잡도: 중간

12. **poissonRegression** (포아송 회귀)
    - Pyodide: 추가 필요
    - Python: `statsmodels.api.GLM` with Poisson family
    - 복잡도: 중간

13. **ordinalRegression** (서열 회귀)
    - Pyodide: 추가 필요
    - Python: `statsmodels.miscmodels.ordinal_model.OrderedModel`
    - 복잡도: 높음

14. **stepwiseRegression** (단계적 회귀)
    - Pyodide: 추가 필요
    - Python: 직접 구현 (forward/backward selection)
    - 복잡도: 높음

15. **doseResponse** (용량-반응)
    - Pyodide: 추가 필요
    - Python: `scipy.optimize.curve_fit` (4-parameter logistic)
    - 복잡도: 높음

16. **responseSurface** (반응표면)
    - Pyodide: 추가 필요
    - Python: `sklearn.preprocessing.PolynomialFeatures` + 회귀
    - 복잡도: 높음

---

### Group 6: 고급 분석 (advanced.ts)
**파일**: `advanced.ts`
**핸들러**: 4개
**예상 소요**: 1-2일

17. **factorAnalysis** (요인분석)
    - Pyodide: ✅ 존재
    - 복잡도: 중간

18. **discriminantAnalysis** (판별분석)
    - Pyodide: 추가 필요
    - Python: `sklearn.discriminant_analysis.LinearDiscriminantAnalysis`
    - 복잡도: 높음

19. **mannKendallTest** (Mann-Kendall 추세)
    - Pyodide: 추가 필요
    - Python: `pymannkendall` 또는 직접 구현
    - 복잡도: 중간

20. **powerAnalysis** (검정력 분석)
    - Pyodide: 추가 필요
    - Python: `statsmodels.stats.power`
    - 복잡도: 중간

---

## 🔧 그룹별 작업 프로세스

### 각 그룹 작업 시:

#### Step 1: 사전 조사 (30분)
```bash
# 1. Pyodide 메서드 확인
grep -A 30 "async methodName" pyodide-statistics.ts

# 2. Python 라이브러리 문서 확인
# - scipy.stats
# - statsmodels
# - pingouin
# - scikit-learn
```

#### Step 2: Pyodide 메서드 추가 (필요시, 1-2시간)
```python
# pyodide-statistics.ts에 추가
async methodName(params): Promise<Result> {
  await this.initialize()

  this.pyodide.globals.set('data', data)

  const resultStr = await this.pyodide.runPythonAsync(`
    from scipy.stats import ...
    # Python 구현
    result = {...}
    json.dumps(result)
  `)

  return this.parsePythonResult<Result>(resultStr)
}
```

#### Step 3: 타입 정의 (30분)
```typescript
// method-parameter-types.ts
export interface MethodNameParams extends BaseParameters {
  param1: type1
  param2: type2
  // ...
}
```

#### Step 4: 핸들러 구현 (1-2시간)
```typescript
// calculator-handlers/xxx.ts
const methodNameHandler = async (
  context: CalculatorContext,
  data: DataRow[],
  parameters: MethodNameParams
): Promise<CalculationResult> => {
  // 1. 파라미터 검증
  // 2. 데이터 추출
  // 3. Pyodide 호출
  // 4. 결과 포맷팅
  // 5. 해석 생성
}
```

#### Step 5: 테스트 작성 (30분-1시간)
```typescript
// __tests__/statistics/xxx-handlers.test.ts
describe('MethodName Handler', () => {
  test('정상 실행', async () => {})
  test('파라미터 검증', async () => {})
  test('에러 처리', async () => {})
})
```

#### Step 6: 통합 및 검증 (30분)
```typescript
// method-router.ts에 등록
// 테스트 실행
// 문서 업데이트
```

---

## 📅 전체 일정 (체계적 진행)

### Week 1: 기초 그룹 (Group 1-3)
- **Day 1**: Group 1 - 기술통계/신뢰도 (2개)
  - ✅ cronbachAlpha (완료)
  - crosstabAnalysis

- **Day 2**: Group 2 - 가설검정 (1개)
  - oneSampleProportionTest
  - Pyodide 메서드 추가

- **Day 3-4**: Group 3 - 비모수 검정 (4개)
  - ksTest
  - signTest
  - runsTest
  - mcNemarTest

### Week 2: 분산분석 (Group 4)
- **Day 5-6**: ANOVA 확장 (3개)
  - ancova (복잡)
  - repeatedMeasuresANOVA (복잡)
  - threeWayANOVA

### Week 3-4: 회귀분석 (Group 5)
- **Day 7-8**: 기본 회귀 (2개)
  - partialCorrelation
  - poissonRegression

- **Day 9-10**: 고급 회귀 (4개)
  - ordinalRegression (복잡)
  - stepwiseRegression (복잡)
  - doseResponse (복잡)
  - responseSurface (복잡)

### Week 5: 고급 분석 (Group 6)
- **Day 11-12**: 고급 분석 (4개)
  - factorAnalysis
  - discriminantAnalysis (복잡)
  - mannKendallTest
  - powerAnalysis

### Week 6: 통합 및 검증
- **Day 13**: 전체 테스트 실행
- **Day 14**: 문서화 및 정리

---

## 🎯 품질 보증 체크리스트

### 각 핸들러 완성 시 확인:

#### 코드 품질
- [ ] 타입 안전성 (no `any`)
- [ ] 에러 처리 완비
- [ ] 주석 및 JSDoc
- [ ] 일관된 코드 스타일

#### 기능성
- [ ] Pyodide 메서드 정상 작동
- [ ] 파라미터 검증 완료
- [ ] 결과 포맷팅 정확
- [ ] 해석 문구 명확

#### 테스트
- [ ] 단위 테스트 작성
- [ ] 통과율 100%
- [ ] 엣지 케이스 커버
- [ ] Mock 데이터 적절

#### 문서
- [ ] 타입 정의 완료
- [ ] JSDoc 작성
- [ ] 예제 코드 포함
- [ ] README 업데이트

---

## 📊 진행 상황 추적

### 완료 현황 (1/20)
```
Group 1: [✅] [ ] (1/2) - 50%
Group 2: [ ] (0/1) - 0%
Group 3: [ ] [ ] [ ] [ ] (0/4) - 0%
Group 4: [ ] [ ] [ ] (0/3) - 0%
Group 5: [ ] [ ] [ ] [ ] [ ] [ ] (0/6) - 0%
Group 6: [ ] [ ] [ ] [ ] (0/4) - 0%
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
전체: 1/20 완료 (5%)
```

---

## 💡 핵심 원칙

1. **속도보다 품질**
   - 각 핸들러를 완벽하게 구현
   - 테스트 통과 확인
   - 문서화 완료

2. **일관성 유지**
   - 같은 패턴 반복
   - 코딩 스타일 통일
   - 네이밍 규칙 준수

3. **미래 확장성**
   - 타입 안전성 확보
   - 모듈화 구조
   - 재사용 가능한 유틸리티

4. **검증 철저**
   - 각 단계마다 테스트
   - 통합 테스트
   - 실제 데이터로 검증

---

## 🚀 시작: Group 1 완성부터

**다음 작업: crosstabAnalysis**

1. Pyodide 메서드 확인
2. 타입 정의
3. 핸들러 구현
4. 테스트 작성
5. 통합

**준비되셨으면 시작하겠습니다!**

---

*작성일: 2025-10-01*
*예상 완료: 2025-10-31 (1개월)*
