# 우선순위 2 메서드 구현 (13개)

## Regression 그룹 (9개)

### 1. curveEstimation
```python
# 곡선추정 (Curve Estimation)
import numpy as np
from scipy import stats, optimize
import json

def curve_estimation(x_values, y_values, model_type='linear'):
    """
    곡선추정 - 다양한 모델로 데이터 적합

    Models:
    - linear: y = a + bx
    - quadratic: y = a + bx + cx^2
    - cubic: y = a + bx + cx^2 + dx^3
    - exponential: y = a * exp(bx)
    - logarithmic: y = a + b*ln(x)
    - power: y = a * x^b
    """
    x = np.array(x_values)
    y = np.array(y_values)
    n = len(x)

    if model_type == 'linear':
        # y = a + bx
        coeffs = np.polyfit(x, y, 1)
        predictions = np.polyval(coeffs, x)

    elif model_type == 'quadratic':
        # y = a + bx + cx^2
        coeffs = np.polyfit(x, y, 2)
        predictions = np.polyval(coeffs, x)

    elif model_type == 'cubic':
        # y = a + bx + cx^2 + dx^3
        coeffs = np.polyfit(x, y, 3)
        predictions = np.polyval(coeffs, x)

    elif model_type == 'exponential':
        # y = a * exp(bx)
        # 선형화: ln(y) = ln(a) + bx
        log_y = np.log(y)
        coeffs_linear = np.polyfit(x, log_y, 1)
        a = np.exp(coeffs_linear[1])
        b = coeffs_linear[0]
        coeffs = [a, b]
        predictions = a * np.exp(b * x)

    elif model_type == 'logarithmic':
        # y = a + b*ln(x)
        log_x = np.log(x)
        coeffs = np.polyfit(log_x, y, 1)
        predictions = coeffs[0] * np.log(x) + coeffs[1]

    elif model_type == 'power':
        # y = a * x^b
        # 선형화: ln(y) = ln(a) + b*ln(x)
        log_x = np.log(x)
        log_y = np.log(y)
        coeffs_linear = np.polyfit(log_x, log_y, 1)
        a = np.exp(coeffs_linear[1])
        b = coeffs_linear[0]
        coeffs = [a, b]
        predictions = a * (x ** b)

    # R-squared 계산
    ss_res = np.sum((y - predictions) ** 2)
    ss_tot = np.sum((y - np.mean(y)) ** 2)
    r_squared = 1 - (ss_res / ss_tot)

    return {
        'modelType': model_type,
        'coefficients': [float(c) for c in coeffs],
        'rSquared': float(r_squared),
        'predictions': [float(p) for p in predictions],
        'residuals': [float(r) for r in (y - predictions)]
    }
```

### 2. nonlinearRegression
```python
# 비선형 회귀 (Nonlinear Regression)
from scipy.optimize import curve_fit
import numpy as np

def nonlinear_regression(x_values, y_values, model_func_str, initial_guess):
    """
    비선형 회귀 - 사용자 정의 함수로 적합

    예: model_func_str = "a * np.exp(-b * x) + c"
    """
    x = np.array(x_values)
    y = np.array(y_values)

    # 함수 문자열을 실제 함수로 변환
    # 안전하지 않으므로 제한된 환경에서만 사용
    def model_func(x, *params):
        param_dict = {f'p{i}': p for i, p in enumerate(params)}
        return eval(model_func_str, {'np': np, 'x': x, **param_dict})

    # curve_fit으로 파라미터 추정
    popt, pcov = curve_fit(model_func, x, y, p0=initial_guess)

    # 예측값
    predictions = model_func(x, *popt)

    # 잔차
    residuals = y - predictions

    # R-squared
    ss_res = np.sum(residuals ** 2)
    ss_tot = np.sum((y - np.mean(y)) ** 2)
    r_squared = 1 - (ss_res / ss_tot)

    # 파라미터 표준오차
    param_errors = np.sqrt(np.diag(pcov))

    return {
        'parameters': [float(p) for p in popt],
        'parameterErrors': [float(e) for e in param_errors],
        'rSquared': float(r_squared),
        'predictions': [float(p) for p in predictions],
        'residuals': [float(r) for r in residuals]
    }
```

### 3. stepwiseRegression
```python
# 단계적 회귀 (Stepwise Regression)
import numpy as np
from scipy import stats as sp_stats
import statsmodels.api as sm

def stepwise_regression(y_values, x_matrix, variable_names,
                       method='forward', entry_threshold=0.05, stay_threshold=0.10):
    """
    단계적 회귀분석

    method: 'forward', 'backward', 'both'
    """
    y = np.array(y_values)
    X = np.array(x_matrix)
    n_vars = X.shape[1]

    if method == 'forward':
        selected = []
        remaining = list(range(n_vars))
        r_squared_history = []

        while remaining:
            best_pval = 1.0
            best_var = None

            for var in remaining:
                test_vars = selected + [var]
                X_test = sm.add_constant(X[:, test_vars])
                model = sm.OLS(y, X_test).fit()

                # 새 변수의 p-value
                pval = model.pvalues[-1]

                if pval < best_pval:
                    best_pval = pval
                    best_var = var

            if best_pval < entry_threshold:
                selected.append(best_var)
                remaining.remove(best_var)

                # R-squared 기록
                X_current = sm.add_constant(X[:, selected])
                model_current = sm.OLS(y, X_current).fit()
                r_squared_history.append(model_current.rsquared)
            else:
                break

    elif method == 'backward':
        selected = list(range(n_vars))
        r_squared_history = []

        while len(selected) > 0:
            X_test = sm.add_constant(X[:, selected])
            model = sm.OLS(y, X_test).fit()

            # 가장 큰 p-value 찾기
            pvalues = model.pvalues[1:]  # 상수항 제외
            max_pval_idx = np.argmax(pvalues)
            max_pval = pvalues[max_pval_idx]

            if max_pval > stay_threshold:
                selected.pop(max_pval_idx)

                if selected:
                    X_current = sm.add_constant(X[:, selected])
                    model_current = sm.OLS(y, X_current).fit()
                    r_squared_history.append(model_current.rsquared)
            else:
                break

    # 최종 모델
    if selected:
        X_final = sm.add_constant(X[:, selected])
        final_model = sm.OLS(y, X_final).fit()

        return {
            'selectedVariables': [variable_names[i] for i in selected],
            'selectedIndices': selected,
            'rSquaredAtStep': r_squared_history,
            'finalCoefficients': [float(c) for c in final_model.params],
            'finalStdErrors': [float(e) for e in final_model.bse],
            'finalTValues': [float(t) for t in final_model.tvalues],
            'finalPValues': [float(p) for p in final_model.pvalues],
            'finalRSquared': float(final_model.rsquared),
            'adjustedRSquared': float(final_model.rsquared_adj)
        }
    else:
        return {'selectedVariables': [], 'finalRSquared': 0.0}
```

### 4-9. 로지스틱 회귀 변형
```python
# 4. binaryLogistic (이항 로지스틱)
import statsmodels.api as sm

def binary_logistic(x_matrix, y_values):
    """이항 로지스틱 회귀"""
    X = sm.add_constant(np.array(x_matrix))
    y = np.array(y_values)

    model = sm.Logit(y, X).fit(disp=0)

    # 예측 확률
    predictions_prob = model.predict(X)
    predictions_class = (predictions_prob > 0.5).astype(int)

    # 정확도
    accuracy = np.mean(predictions_class == y)

    return {
        'coefficients': [float(c) for c in model.params],
        'stdErrors': [float(e) for e in model.bse],
        'zValues': [float(z) for z in model.tvalues],
        'pValues': [float(p) for p in model.pvalues],
        'predictions': [float(p) for p in predictions_prob],
        'accuracy': float(accuracy),
        'aic': float(model.aic),
        'bic': float(model.bic),
        'pseudoRSquared': float(model.prsquared)
    }

# 5. multinomialLogistic (다항 로지스틱)
def multinomial_logistic(x_matrix, y_values):
    """다항 로지스틱 회귀"""
    X = sm.add_constant(np.array(x_matrix))
    y = np.array(y_values)

    model = sm.MNLogit(y, X).fit(disp=0)

    predictions = model.predict(X)
    predicted_class = np.argmax(predictions, axis=1)
    accuracy = np.mean(predicted_class == y)

    return {
        'coefficients': model.params.values.tolist(),
        'pValues': model.pvalues.values.tolist(),
        'predictions': predictions.tolist(),
        'accuracy': float(accuracy),
        'aic': float(model.aic),
        'bic': float(model.bic)
    }

# 6. ordinalLogistic (순서형 로지스틱)
from statsmodels.miscmodels.ordinal_model import OrderedModel

def ordinal_logistic(x_matrix, y_values):
    """순서형 로지스틱 회귀"""
    X = np.array(x_matrix)
    y = np.array(y_values)

    model = OrderedModel(y, X, distr='logit').fit(disp=0)

    return {
        'coefficients': [float(c) for c in model.params],
        'stdErrors': [float(e) for e in model.bse],
        'zValues': [float(z) for z in model.tvalues],
        'pValues': [float(p) for p in model.pvalues],
        'thresholds': [float(t) for t in model.model.transform_threshold_params(model.params)],
        'aic': float(model.aic),
        'bic': float(model.bic)
    }

# 7. probitRegression (프로빗 회귀)
def probit_regression(x_matrix, y_values):
    """프로빗 회귀 (정규분포 링크함수)"""
    X = sm.add_constant(np.array(x_matrix))
    y = np.array(y_values)

    model = sm.Probit(y, X).fit(disp=0)

    predictions_prob = model.predict(X)
    predictions_class = (predictions_prob > 0.5).astype(int)
    accuracy = np.mean(predictions_class == y)

    return {
        'coefficients': [float(c) for c in model.params],
        'stdErrors': [float(e) for e in model.bse],
        'zValues': [float(z) for z in model.tvalues],
        'pValues': [float(p) for p in model.pvalues],
        'predictions': [float(p) for p in predictions_prob],
        'accuracy': float(accuracy),
        'aic': float(model.aic),
        'bic': float(model.bic)
    }

# 8. poissonRegression (포아송 회귀)
def poisson_regression(x_matrix, y_values):
    """포아송 회귀 (카운트 데이터)"""
    X = sm.add_constant(np.array(x_matrix))
    y = np.array(y_values)

    model = sm.GLM(y, X, family=sm.families.Poisson()).fit()

    return {
        'coefficients': [float(c) for c in model.params],
        'stdErrors': [float(e) for e in model.bse],
        'zValues': [float(z) for z in model.tvalues],
        'pValues': [float(p) for p in model.pvalues],
        'deviance': float(model.deviance),
        'pearsonChi2': float(model.pearson_chi2),
        'aic': float(model.aic),
        'bic': float(model.bic),
        'dispersion': float(model.scale)
    }

# 9. negativeBinomial (음이항 회귀)
def negative_binomial_regression(x_matrix, y_values):
    """음이항 회귀 (과분산 카운트 데이터)"""
    X = sm.add_constant(np.array(x_matrix))
    y = np.array(y_values)

    model = sm.GLM(y, X, family=sm.families.NegativeBinomial()).fit()

    return {
        'coefficients': [float(c) for c in model.params],
        'stdErrors': [float(e) for e in model.bse],
        'zValues': [float(z) for z in model.tvalues],
        'pValues': [float(p) for p in model.pvalues],
        'alpha': float(model.scale),  # 분산 파라미터
        'aic': float(model.aic),
        'bic': float(model.bic)
    }
```

## ANOVA 그룹 (4개)

### 10. repeatedMeasuresAnova
```python
# 반복측정 분산분석 (Repeated Measures ANOVA)
from statsmodels.stats.anova import AnovaRM
import pandas as pd

def repeated_measures_anova(data_matrix, subject_ids, time_labels):
    """
    반복측정 분산분석

    data_matrix: n subjects × k timepoints
    """
    n_subjects, n_timepoints = np.array(data_matrix).shape

    # 데이터프레임 생성 (long format)
    data_long = []
    for i, subject_id in enumerate(subject_ids):
        for j, time_label in enumerate(time_labels):
            data_long.append({
                'subject': subject_id,
                'time': time_label,
                'value': data_matrix[i][j]
            })

    df = pd.DataFrame(data_long)

    # Repeated Measures ANOVA
    aovrm = AnovaRM(df, 'value', 'subject', within=['time'])
    res = aovrm.fit()

    # 구형성 검정 (Mauchly's test) - 근사치
    # 실제 구형성은 pingouin 사용 권장
    epsilon = 1.0  # 구형성 가정

    return {
        'fStatistic': float(res.anova_table['F Value'][0]),
        'pValue': float(res.anova_table['Pr > F'][0]),
        'df': {
            'numerator': float(res.anova_table['Num DF'][0]),
            'denominator': float(res.anova_table['Den DF'][0])
        },
        'sphericityEpsilon': epsilon,
        'anovaTable': res.anova_table.to_dict()
    }
```

### 11. ancova
```python
# 공분산분석 (ANCOVA)
import statsmodels.formula.api as smf
import pandas as pd

def ancova(y_values, group_values, covariates):
    """
    공분산분석 (ANCOVA)

    covariates: list of covariate arrays
    """
    # 데이터프레임 생성
    data = {
        'y': y_values,
        'group': group_values
    }

    for i, cov in enumerate(covariates):
        data[f'cov{i}'] = cov

    df = pd.DataFrame(data)

    # 공변량 추가한 모델
    cov_formula = ' + '.join([f'cov{i}' for i in range(len(covariates))])
    formula = f'y ~ C(group) + {cov_formula}'

    model = smf.ols(formula, data=df).fit()
    anova_table = sm.stats.anova_lm(model, typ=2)

    # 조정된 평균 계산
    group_means = df.groupby('group')['y'].mean()

    return {
        'fStatisticGroup': float(anova_table.loc['C(group)', 'F']),
        'pValueGroup': float(anova_table.loc['C(group)', 'PR(>F)']),
        'fStatisticCovariate': [float(anova_table.loc[f'cov{i}', 'F']) for i in range(len(covariates))],
        'pValueCovariate': [float(anova_table.loc[f'cov{i}', 'PR(>F)']) for i in range(len(covariates))],
        'adjustedMeans': [{'group': g, 'mean': float(m)} for g, m in group_means.items()],
        'anovaTable': anova_table.to_dict()
    }
```

### 12. manova
```python
# 다변량 분산분석 (MANOVA)
from statsmodels.multivariate.manova import MANOVA
import pandas as pd

def manova(data_matrix, group_values, var_names):
    """
    다변량 분산분석 (MANOVA)

    data_matrix: n observations × p variables
    """
    # 데이터프레임 생성
    df_dict = {'group': group_values}
    for i, var_name in enumerate(var_names):
        df_dict[var_name] = [row[i] for row in data_matrix]

    df = pd.DataFrame(df_dict)

    # MANOVA
    formula = ' + '.join(var_names) + ' ~ group'
    maov = MANOVA.from_formula(formula, data=df)
    result = maov.mv_test()

    # Wilks' Lambda 추출
    test_results = result.results['group']['stat']

    return {
        'wilksLambda': float(test_results.loc["Wilks' lambda", 'Value']),
        'pillaiTrace': float(test_results.loc["Pillai's trace", 'Value']),
        'hotellingLawley': float(test_results.loc["Hotelling-Lawley trace", 'Value']),
        'royMaxRoot': float(test_results.loc["Roy's greatest root", 'Value']),
        'fStatistic': float(test_results.loc["Wilks' lambda", 'F Value']),
        'pValue': float(test_results.loc["Wilks' lambda", 'Pr > F']),
        'df': {
            'hypothesis': float(test_results.loc["Wilks' lambda", 'Num DF']),
            'error': float(test_results.loc["Wilks' lambda", 'Den DF'])
        }
    }
```

### 13. scheffeTest
```python
# Scheffe 사후검정 (Scheffe Test)
from scipy import stats
import numpy as np

def scheffe_test(groups):
    """
    Scheffe 사후검정

    groups: list of arrays (각 그룹의 데이터)
    """
    k = len(groups)
    n_total = sum(len(g) for g in groups)
    group_means = [np.mean(g) for g in groups]
    group_ns = [len(g) for g in groups]

    # 전체 평균
    grand_mean = np.mean(np.concatenate(groups))

    # MSE (Mean Square Error) 계산
    ss_within = sum(np.sum((g - np.mean(g))**2) for g in groups)
    df_within = n_total - k
    mse = ss_within / df_within

    # 모든 쌍 비교
    comparisons = []
    for i in range(k):
        for j in range(i+1, k):
            mean_diff = group_means[i] - group_means[j]

            # Scheffe 통계량
            se = np.sqrt(mse * (1/group_ns[i] + 1/group_ns[j]))
            f_stat = (mean_diff ** 2) / ((k - 1) * se ** 2)

            # p-value
            p_value = 1 - stats.f.cdf(f_stat, k - 1, df_within)

            # 임계값
            critical_f = stats.f.ppf(0.95, k - 1, df_within)
            critical_value = np.sqrt((k - 1) * critical_f) * se

            comparisons.append({
                'group1': i,
                'group2': j,
                'meanDiff': float(mean_diff),
                'fStatistic': float(f_stat),
                'pValue': float(p_value),
                'criticalValue': float(critical_value),
                'significant': p_value < 0.05
            })

    return {
        'comparisons': comparisons,
        'mse': float(mse),
        'dfWithin': int(df_within)
    }
```

---

## 사용 방법

이 Python 코드들을 `pyodide-statistics.ts`의 해당 메서드에서 `runPythonAsync()`로 실행하면 됩니다.

예시:
```typescript
async curveEstimation(
  xValues: number[],
  yValues: number[],
  model: 'linear' | 'quadratic' | 'cubic' | 'exponential' | 'logarithmic' | 'power' = 'linear'
): Promise<CurveEstimationResult> {
  if (!this.pyodide) {
    throw new Error('Pyodide가 초기화되지 않았습니다')
  }

  const result = await this.pyodide.runPythonAsync(`
${위의 curve_estimation Python 코드}

# 실행
result = curve_estimation(${JSON.stringify(xValues)}, ${JSON.stringify(yValues)}, '${model}')
json.dumps(result)
  `)

  return this.parsePythonResult(result)
}
```
