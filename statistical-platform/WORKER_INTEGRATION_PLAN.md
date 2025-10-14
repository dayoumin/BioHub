# Worker 1-4 Integration Plan

## 목표
pyodide-statistics.ts (2495줄, 75KB) → ~800-1000줄, ~25-30KB (60% 감소)

## Worker별 메서드 매핑

### Worker 1 (기술통계 7개)
| Python 함수 | pyodide-statistics.ts 메서드 | 상태 |
|------------|------------------------------|------|
| descriptive_stats | calculateDescriptiveStats | ⏳ TODO |
| normality_test | normalityTest | ⏳ TODO |
| outlier_detection | outlierDetection | ⏳ TODO |
| frequency_analysis | frequencyAnalysis | ⏳ TODO |
| crosstab_analysis | crosstabAnalysis | ⏳ TODO |
| one_sample_proportion_test | oneSampleProportionTest | ⏳ TODO |
| cronbach_alpha | cronbachAlpha | ⏳ TODO |

### Worker 2 (가설검정 6개)
| Python 함수 | pyodide-statistics.ts 메서드 | 상태 |
|------------|------------------------------|------|
| t_test_two_sample | tTest (independent) | ⏳ TODO |
| t_test_paired | pairedTTest | ⏳ TODO |
| t_test_one_sample | oneSampleTTest | ⏳ TODO |
| z_test | zTest | ⏳ TODO |
| chi_square_test | chiSquareTest | ⏳ TODO |
| binomial_test | binomialTest | ⏳ TODO |
| correlation_test | correlationTest | ⏳ TODO |
| partial_correlation | partialCorrelation | ⏳ TODO |

### Worker 3 (비모수/ANOVA 16개)
| Python 함수 | pyodide-statistics.ts 메서드 | 상태 |
|------------|------------------------------|------|
| mann_whitney_test | mannWhitneyTest | ⏳ TODO |
| wilcoxon_test | wilcoxonTest | ⏳ TODO |
| kruskal_wallis_test | kruskalWallisTest | ⏳ TODO |
| friedman_test | friedmanTest | ⏳ TODO |
| one_way_anova | anova | ⏳ TODO |
| two_way_anova | twoWayAnova | ✅ 완료 |
| tukey_hsd | tukeyHSD | ⏳ TODO |
| sign_test | signTest | ⏳ TODO |
| runs_test | runsTest | ⏳ TODO |
| mcnemar_test | mcNemarTest | ⏳ TODO |
| cochran_q_test | cochranQTest | ⏳ TODO |
| mood_median_test | moodMedianTest | ⏳ TODO |
| repeated_measures_anova | repeatedMeasuresAnova | ⏳ TODO |
| ancova | ancova | ⏳ TODO |
| manova | manova | ⏳ TODO |
| scheffe_test | scheffeTest | ⏳ TODO |

### Worker 4 (회귀/고급 13개)
| Python 함수 | pyodide-statistics.ts 메서드 | 상태 |
|------------|------------------------------|------|
| linear_regression | regression | ⏳ TODO |
| multiple_regression | multipleRegression | ⏳ TODO |
| logistic_regression | logisticRegression | ⏳ TODO |
| pca_analysis | pcaAnalysis | ⏳ TODO |
| curve_estimation | curveEstimation | ⏳ TODO |
| nonlinear_regression | nonlinearRegression | ⏳ TODO |
| stepwise_regression | stepwiseRegression | ⏳ TODO |
| binary_logistic | binaryLogistic | ⏳ TODO |
| multinomial_logistic | multinomialLogistic | ⏳ TODO |
| ordinal_logistic | ordinalLogistic | ⏳ TODO |
| probit_regression | probitRegression | ⏳ TODO |
| poisson_regression | poissonRegression | ⏳ TODO |
| negative_binomial_regression | negativeBinomialRegression | ⏳ TODO |

## 통합 전략

### 1단계: Worker Loader 메서드 추가
```typescript
private async ensureWorker1Loaded(): Promise<void>
private async ensureWorker2Loaded(): Promise<void>
private async ensureWorker3Loaded(): Promise<void> // ✅ 이미 있음
private async ensureWorker4Loaded(): Promise<void>
```

### 2단계: 메서드별 변환 패턴
**Before (inline Python)**:
```typescript
async methodName(...): Promise<Type> {
  const result = await this.pyodide.runPythonAsync(`
    import numpy as np
    # ... 100+ lines of Python code
  `)
  return parsed
}
```

**After (Worker 호출)**:
```typescript
async methodName(...): Promise<Type> {
  await this.ensureWorkerNLoaded()

  const resultStr = await this.pyodide.runPythonAsync(`
    import json
    from workerN_module import python_function_name

    result = python_function_name(${JSON.stringify(params)})
    json.dumps(result)
  `)

  return this.parsePythonResult<Type>(resultStr)
}
```

### 3단계: 순서
1. Worker 1 (7개) - 기초 메서드
2. Worker 2 (6개) - 가설검정
3. Worker 3 (15개) - 비모수/ANOVA (1개 이미 완료)
4. Worker 4 (13개) - 회귀/고급

## 예상 결과
- **줄 수**: 2495 → ~800-1000줄 (-60%)
- **파일 크기**: 75KB → ~25-30KB (-60%)
- **유지보수성**: ⬆️ (Python 코드 분리)
- **테스트 용이성**: ⬆️ (Worker별 독립 테스트)
- **성능**: ➡️ (동일, 이미 Pyodide 사용 중)

## 시작
Worker 1부터 통합 시작!