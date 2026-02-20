# JSDoc 문서화 템플릿

**목적**: 모든 핸들러 함수에 일관된 고품질 문서 제공

---

## 📝 표준 JSDoc 템플릿

### 기본 구조

```typescript
/**
 * [메서드 이름] ([영문명])
 *
 * [한 줄 설명: 이 메서드가 무엇을 하는지]
 * [상세 설명: 어떻게 작동하는지, 어떤 통계 이론을 사용하는지]
 *
 * **검정 가정:** (해당하는 경우)
 * - [가정 1]
 * - [가정 2]
 * - [가정 3]
 *
 * **귀무가설(H₀):** [귀무가설 설명]
 * **대립가설(H₁):** [대립가설 설명]
 *
 * @param context - Pyodide 서비스를 포함한 계산 컨텍스트
 * @param data - 분석할 데이터 배열
 * @param parameters - 검정 파라미터
 * @param parameters.[필수파라미터1] - [설명] (필수)
 * @param parameters.[필수파라미터2] - [설명] (필수)
 * @param parameters.[선택파라미터1] - [설명] (선택, 기본값: [값])
 *
 * @returns 검정 결과
 * @returns result.success - 성공 여부
 * @returns result.data.metrics - 주요 통계량
 * @returns result.data.tables - 상세 결과 테이블
 * @returns result.data.interpretation - 결과 해석
 * @returns result.error - 에러 발생 시 에러 메시지
 *
 * @example
 * ```typescript
 * // [실제 사용 사례 설명]
 * const data = [
 *   { [예시 데이터] }
 * ]
 *
 * const result = await [함수명](context, data, {
 *   [파라미터 예시]
 * })
 *
 * if (result.success) {
 *   console.log('[결과 활용 예시]')
 * }
 * ```
 *
 * @throws [에러 조건 1]
 * @throws [에러 조건 2]
 *
 * @see {@link [위키피디아 링크] [제목]}
 * @see {@link [SciPy/statsmodels 문서] [함수명]}
 */
```

---

## 📚 메서드별 JSDoc

### 1. 가설검정 (hypothesis-tests.ts)

#### oneSampleTTest
```typescript
/**
 * 일표본 t-검정 (One-Sample t-Test)
 *
 * 단일 표본의 평균이 특정 모평균과 통계적으로 유의하게 다른지 검정합니다.
 * Student's t-분포를 사용하여 표본 평균과 모평균의 차이를 평가합니다.
 *
 * **검정 가정:**
 * - 데이터가 정규분포를 따름 (n≥30이면 완화 가능)
 * - 표본이 무작위 추출됨
 * - 관측치가 독립적임
 *
 * **귀무가설(H₀):** 표본 평균 = 모평균
 * **대립가설(H₁):** 표본 평균 ≠ 모평균 (양측검정)
 *
 * @param context - Pyodide 서비스를 포함한 계산 컨텍스트
 * @param data - 분석할 데이터 배열 (최소 2개 이상)
 * @param parameters - 검정 파라미터
 * @param parameters.column - 분석할 열 이름 (필수)
 * @param parameters.popmean - 귀무가설의 모평균 (필수)
 * @param parameters.alpha - 유의수준 (선택, 기본값: 0.05)
 * @param parameters.alternative - 대립가설 방향 (선택, 기본값: 'two-sided')
 *
 * @returns 검정 결과
 *
 * @example
 * ```typescript
 * // 학생들의 시험 점수가 전국 평균(75점)과 다른지 검정
 * const result = await oneSampleTTest(context, data, {
 *   column: 'score',
 *   popmean: 75
 * })
 * ```
 *
 * @throws 필수 파라미터 누락 시
 * @throws 데이터 크기 < 2 시
 *
 * @see {@link https://en.wikipedia.org/wiki/Student%27s_t-test Student's t-test}
 * @see {@link https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.ttest_1samp.html scipy.stats.ttest_1samp}
 */
```

#### twoSampleTTest
```typescript
/**
 * 독립표본 t-검정 (Independent Two-Sample t-Test)
 *
 * 두 독립된 그룹의 평균이 통계적으로 유의하게 다른지 검정합니다.
 * 등분산 가정 여부에 따라 Student's t-test 또는 Welch's t-test를 사용합니다.
 *
 * **검정 가정:**
 * - 두 그룹의 데이터가 정규분포를 따름
 * - 두 그룹이 독립적임
 * - 등분산성 (equal_var=true일 때만)
 *
 * **귀무가설(H₀):** 그룹1 평균 = 그룹2 평균
 * **대립가설(H₁):** 그룹1 평균 ≠ 그룹2 평균
 *
 * @param context - 계산 컨텍스트
 * @param data - 분석 데이터 (그룹 변수와 값 변수 포함)
 * @param parameters - 검정 파라미터
 * @param parameters.groupColumn - 그룹을 구분하는 열 이름 (필수)
 * @param parameters.valueColumn - 비교할 값의 열 이름 (필수)
 * @param parameters.equal_var - 등분산 가정 여부 (선택, 기본값: true)
 * @param parameters.alpha - 유의수준 (선택, 기본값: 0.05)
 *
 * @returns 검정 결과
 *
 * @example
 * ```typescript
 * // 남성과 여성의 평균 키 차이 검정
 * const data = [
 *   { gender: '남', height: 175 },
 *   { gender: '여', height: 162 }
 * ]
 *
 * const result = await twoSampleTTest(context, data, {
 *   groupColumn: 'gender',
 *   valueColumn: 'height',
 *   equal_var: true
 * })
 * ```
 *
 * @throws 그룹 수가 정확히 2개가 아닐 때
 * @throws 필수 파라미터 누락 시
 *
 * @see {@link https://en.wikipedia.org/wiki/Student%27s_t-test#Independent_two-sample_t-test Independent t-test}
 */
```

#### pairedTTest
```typescript
/**
 * 대응표본 t-검정 (Paired t-Test)
 *
 * 동일한 대상에 대한 두 번의 측정값 차이가 통계적으로 유의한지 검정합니다.
 * 사전-사후 측정, 좌우 비교 등에 사용됩니다.
 *
 * **검정 가정:**
 * - 차이값이 정규분포를 따름
 * - 각 쌍이 독립적임
 * - 같은 대상에 대한 반복 측정
 *
 * **귀무가설(H₀):** 평균 차이 = 0
 * **대립가설(H₁):** 평균 차이 ≠ 0
 *
 * @param context - 계산 컨텍스트
 * @param data - 분석 데이터 (두 열의 값 포함)
 * @param parameters - 검정 파라미터
 * @param parameters.column1 - 첫 번째 측정값 열 (필수)
 * @param parameters.column2 - 두 번째 측정값 열 (필수)
 * @param parameters.alpha - 유의수준 (선택, 기본값: 0.05)
 *
 * @returns 검정 결과
 *
 * @example
 * ```typescript
 * // 운동 전후 체중 변화 검정
 * const data = [
 *   { before: 70, after: 68 },
 *   { before: 75, after: 72 }
 * ]
 *
 * const result = await pairedTTest(context, data, {
 *   column1: 'before',
 *   column2: 'after'
 * })
 * ```
 *
 * @throws 필수 파라미터 누락 시
 * @throws 두 열의 데이터 크기가 다를 때
 *
 * @see {@link https://en.wikipedia.org/wiki/Student%27s_t-test#Dependent_t-test_for_paired_samples Paired t-test}
 */
```

#### welchTTest
```typescript
/**
 * Welch t-검정 (Welch's t-Test)
 *
 * 두 그룹의 평균을 비교하되, 등분산 가정을 하지 않는 검정입니다.
 * 표준 독립표본 t-검정의 강건한 대안입니다.
 *
 * **검정 가정:**
 * - 두 그룹의 데이터가 정규분포를 따름 (완화 가능)
 * - 두 그룹이 독립적임
 * - 등분산 가정 불필요 (주요 장점)
 *
 * **귀무가설(H₀):** 그룹1 평균 = 그룹2 평균
 * **대립가설(H₁):** 그룹1 평균 ≠ 그룹2 평균
 *
 * @param context - 계산 컨텍스트
 * @param data - 분석 데이터
 * @param parameters - 검정 파라미터
 * @param parameters.groupColumn - 그룹 열 (필수)
 * @param parameters.valueColumn - 값 열 (필수)
 * @param parameters.alpha - 유의수준 (선택, 기본값: 0.05)
 *
 * @returns 검정 결과
 *
 * @example
 * ```typescript
 * // 두 실험 그룹의 효과 비교 (분산이 다를 것으로 예상)
 * const result = await welchTTest(context, data, {
 *   groupColumn: 'treatment',
 *   valueColumn: 'outcome'
 * })
 * ```
 *
 * @throws 그룹 수가 2개가 아닐 때
 *
 * @see {@link https://en.wikipedia.org/wiki/Welch%27s_t-test Welch's t-test}
 */
```

---

### 2. 분산분석 (anova.ts)

#### oneWayANOVA
```typescript
/**
 * 일원 분산분석 (One-Way ANOVA)
 *
 * 3개 이상의 독립된 그룹 간 평균 차이가 존재하는지 검정합니다.
 * F-분포를 사용하여 그룹 간 분산과 그룹 내 분산을 비교합니다.
 *
 * **검정 가정:**
 * - 각 그룹의 데이터가 정규분포를 따름
 * - 그룹 간 등분산성
 * - 관측치가 독립적임
 *
 * **귀무가설(H₀):** 모든 그룹의 평균이 같음
 * **대립가설(H₁):** 적어도 하나의 그룹 평균이 다름
 *
 * @param context - 계산 컨텍스트
 * @param data - 분석 데이터
 * @param parameters - 검정 파라미터
 * @param parameters.groupColumn - 그룹 변수 (필수)
 * @param parameters.valueColumn - 종속 변수 (필수)
 * @param parameters.alpha - 유의수준 (선택, 기본값: 0.05)
 * @param parameters.postHoc - 사후검정 방법 (선택: 'tukey', 'bonferroni', 'games-howell')
 *
 * @returns ANOVA 결과 (F-통계량, p-value, 효과크기 등)
 *
 * @example
 * ```typescript
 * // 세 가지 교수법의 시험 점수 비교
 * const result = await oneWayANOVA(context, data, {
 *   groupColumn: 'method',
 *   valueColumn: 'score',
 *   postHoc: 'tukey'
 * })
 * ```
 *
 * @throws 그룹 수 < 2일 때
 *
 * @see {@link https://en.wikipedia.org/wiki/One-way_analysis_of_variance One-way ANOVA}
 */
```

---

### 3. 회귀분석 (regression.ts)

#### simpleLinearRegression
```typescript
/**
 * 단순 선형 회귀분석 (Simple Linear Regression)
 *
 * 하나의 독립변수와 종속변수 간의 선형 관계를 모델링합니다.
 * y = β₀ + β₁x + ε 형태의 회귀식을 추정합니다.
 *
 * **가정:**
 * - 선형성: 독립변수와 종속변수가 선형 관계
 * - 독립성: 관측치가 서로 독립
 * - 등분산성: 오차의 분산이 일정
 * - 정규성: 오차가 정규분포를 따름
 *
 * @param context - 계산 컨텍스트
 * @param data - 분석 데이터
 * @param parameters - 회귀 파라미터
 * @param parameters.independentColumn - 독립변수(X) 열 (필수)
 * @param parameters.dependentColumn - 종속변수(Y) 열 (필수)
 * @param parameters.predictValues - 예측할 X 값들 (선택)
 *
 * @returns 회귀분석 결과 (계수, R², p-value, 예측값 등)
 *
 * @example
 * ```typescript
 * // 공부 시간과 시험 점수의 관계
 * const result = await simpleLinearRegression(context, data, {
 *   independentColumn: 'study_hours',
 *   dependentColumn: 'score',
 *   predictValues: [5, 10, 15] // 5시간, 10시간, 15시간 공부 시 예상 점수
 * })
 * ```
 *
 * @see {@link https://en.wikipedia.org/wiki/Simple_linear_regression Simple Linear Regression}
 */
```

---

## 💡 작성 가이드라인

### DO (권장)
1. ✅ 한국어와 영어 병기
2. ✅ 실제 사용 사례 예시 제공
3. ✅ 통계적 가정 명시
4. ✅ 귀무가설/대립가설 설명 (검정인 경우)
5. ✅ 외부 참고 문서 링크
6. ✅ 에러 조건 명시
7. ✅ 파라미터 기본값 표시

### DON'T (지양)
1. ❌ 이모지 사용 (CLAUDE.md 규칙)
2. ❌ 모호한 설명
3. ❌ 예제 코드 없음
4. ❌ 너무 긴 설명 (간결하게)
5. ❌ 기술 용어만 나열

---

## 📋 체크리스트

각 함수 문서화 시 확인:

- [ ] 한 줄 요약 (무엇을 하는가)
- [ ] 상세 설명 (어떻게 작동하는가)
- [ ] 통계적 가정/전제 조건
- [ ] 귀무가설/대립가설 (검정인 경우)
- [ ] 모든 파라미터 설명
- [ ] 반환값 설명
- [ ] 실제 사용 예제
- [ ] 에러 조건
- [ ] 외부 참고 링크

---

*작성일: 2025-10-01*
