# DecisionTree 확장 계획서

## 현황 분석

### 현재 상태
- **공통 파일**: 48개 메서드 정의 (`lib/constants/statistical-methods.ts`)
- **DecisionTree**: 27개 메서드만 안내 가능 (56%)
- **누락**: 21개 메서드 (44%)

### 현재 Purpose 구조 (6개)
```typescript
type AnalysisPurpose =
  | 'compare'       // 그룹 간 차이 비교
  | 'relationship'  // 변수 간 관계 분석
  | 'distribution'  // 분포와 빈도 분석
  | 'prediction'    // 예측 모델링
  | 'timeseries'    // 시계열 분석
  | 'survival'      // 생존 분석
```

---

## Phase 1: 기존 Purpose 확장 (17개 메서드)

### 1.1 Compare 확장 (+9개)

| 메서드 | 질문 분기 | 조건 |
|--------|----------|------|
| `one-sample-t` | group_count='1' | 단일 표본 vs 모집단 |
| `ancova` | group_count='2+', has_covariate='yes' | 공변량 포함 |
| `manova` | outcome_count='2+' | 다변량 종속변수 |
| `mixed-model` | design='mixed' | 고정+랜덤 효과 |
| `sign-test` | paired + 순서형 | 부호 검정 |
| `mcnemar` | paired + 이진 범주형 | 대응 범주 비교 |
| `cochran-q` | paired + 3+시점 + 이진 | 다중 대응 이진 |
| `mood-median` | non-normal + 중앙값 비교 | 중앙값 검정 |
| `proportion-test` | variable_type='binary' | 비율 비교 |

**새로운 질문 추가 필요**:
- `comparison_target`: 'group' | 'population' | 'proportion'
- `has_covariate`: 'yes' | 'no'
- `outcome_count`: '1' | '2+'
- `design_type`: 'simple' | 'mixed'

### 1.2 Distribution 확장 (+5개)

| 메서드 | 질문 분기 | 조건 |
|--------|----------|------|
| `binomial-test` | analysis_type='test_probability' | 이진 확률 검정 |
| `runs-test` | analysis_type='randomness' | 무작위성 검정 |
| `ks-test` | analysis_type='distribution_compare' | 두 분포 비교 |
| `chi-square` | 일반 카이제곱 개요 | 메인 페이지 |
| `explore-data` | analysis_type='explore' | 데이터 탐색 |
| `means-plot` | analysis_type='visualize_means' | 평균 시각화 |

**새로운 질문 추가 필요**:
- `distribution_goal`: 'describe' | 'normality' | 'frequency' | 'explore' | 'test_probability' | 'randomness' | 'distribution_compare' | 'visualize_means'

### 1.3 Prediction 확장 (+3개)

| 메서드 | 질문 분기 | 조건 |
|--------|----------|------|
| `stepwise` | variable_selection='automatic' | 자동 변수 선택 |
| `dose-response` | model_type='dose_response' | EC50/IC50 |
| `response-surface` | model_type='optimization' | 최적화 실험 |

**새로운 질문 추가 필요**:
- `variable_selection`: 'manual' | 'automatic'
- `model_type`: 'linear' | 'logistic' | 'dose_response' | 'optimization'

### 1.4 Timeseries 확장 (+1개)

| 메서드 | 질문 분기 | 조건 |
|--------|----------|------|
| `mann-kendall` | goal='trend_test' | 추세 검정 |

**수정 필요**:
- `goal` 옵션 추가: 'forecast' | 'decompose' | 'stationarity' | 'trend_test'

---

## Phase 2: 새로운 Purpose 추가 (4개 메서드)

### 2.1 Multivariate Purpose (신규)

```typescript
// types/smart-flow.ts 수정
type AnalysisPurpose =
  | ... 기존 6개 ...
  | 'multivariate'  // 다변량 분석 (신규)
```

| 메서드 | 질문 분기 | 조건 |
|--------|----------|------|
| `pca` | goal='dimension_reduction' | 차원 축소 |
| `factor-analysis` | goal='latent_factors' | 잠재 요인 추출 |
| `cluster` | goal='grouping' | 군집화 |
| `discriminant` | goal='classification' | 판별/분류 |

**새로운 질문**:
```typescript
// multivariate_goal: 분석 목적
'dimension_reduction' | 'latent_factors' | 'grouping' | 'classification'
```

### 2.2 Utility Purpose (신규)

```typescript
type AnalysisPurpose =
  | ... 기존 7개 ...
  | 'utility'  // 유틸리티/계획 (신규)
```

| 메서드 | 질문 분기 | 조건 |
|--------|----------|------|
| `power-analysis` | goal='sample_size' | 표본 크기 계산 |
| `reliability` | goal='reliability' | 신뢰도 분석 |

---

## 구현 순서

### Step 1: 타입 정의 확장
```
파일: types/smart-flow.ts
- AnalysisPurpose에 'multivariate', 'utility' 추가
```

### Step 2: KOREAN_NAMES 확장
```
파일: components/smart-flow/steps/purpose/DecisionTree.ts
- 21개 누락 메서드의 한글 이름 추가
```

### Step 3: 기존 decide 함수 확장
```
파일: components/smart-flow/steps/purpose/DecisionTree.ts
- decideCompare() 확장: 9개 메서드
- decideDistribution() 확장: 5개 메서드
- decidePrediction() 확장: 3개 메서드
- decideTimeseries() 확장: 1개 메서드
```

### Step 4: 새로운 decide 함수 추가
```
파일: components/smart-flow/steps/purpose/DecisionTree.ts
- decideMultivariate() 신규: 4개 메서드
- decideUtility() 신규: 2개 메서드
- decide() 메인 함수에 case 추가
```

### Step 5: 질문 정의 확장
```
파일: components/smart-flow/steps/purpose/QuestionDefinitions.ts (확인 필요)
- 새로운 질문 ID 및 옵션 추가
```

### Step 6: UI 업데이트
```
파일: components/smart-flow/steps/purpose/PurposeInputStep.tsx (확인 필요)
- 새로운 Purpose 카드 추가 (multivariate, utility)
```

### Step 7: 테스트 작성
```
파일: __tests__/components/smart-flow/decision-tree-expansion.test.ts
- 새로운 분기에 대한 테스트 케이스
```

---

## 예상 결과

| 단계 | 현재 | 목표 | 증가 |
|------|------|------|------|
| Phase 1 완료 | 27개 | 44개 | +17개 |
| Phase 2 완료 | 44개 | 48개 | +4개 |
| **최종** | **27개 (56%)** | **48개 (100%)** | **+21개** |

---

## 우선순위

### 높음 (자주 사용)
1. `one-sample-t` - 기본 검정
2. `ancova` - 공변량 분석
3. `pca` - 차원 축소
4. `cluster` - 군집 분석
5. `power-analysis` - 표본 크기

### 중간 (특수 목적)
6. `manova` - 다변량 ANOVA
7. `mixed-model` - 혼합 모델
8. `factor-analysis` - 요인 분석
9. `discriminant` - 판별 분석
10. `stepwise` - 단계적 회귀
11. `reliability` - 신뢰도 분석

### 낮음 (전문 분야)
12. `sign-test`, `mcnemar`, `cochran-q` - 특수 비모수
13. `mood-median` - 중앙값 검정
14. `proportion-test` - 비율 검정
15. `binomial-test`, `runs-test`, `ks-test` - 분포 검정
16. `dose-response`, `response-surface` - 실험 설계
17. `mann-kendall` - 추세 검정
18. `explore-data`, `means-plot`, `chi-square` - 탐색/시각화

---

## 작업 일정 (예상)

- **Phase 1**: 기존 Purpose 확장 (17개)
- **Phase 2**: 새로운 Purpose 추가 (4개)
- **Phase 3**: 테스트 및 검증

**총 예상**: 48개 메서드 100% 커버리지

---

Created: 2025-12-01
Author: Claude Code
