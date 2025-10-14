/**
 * ANOVA 및 사후검정 서비스 모듈
 */

import { BasePyodideService } from './base'
import type {
  IANOVAService,
  ANOVAResult,
  TukeyHSDResult,
  MANOVAResult
} from './types'

export class ANOVAService extends BasePyodideService implements IANOVAService {
  private static instance: ANOVAService | null = null

  private constructor() {
    super()
  }

  static getInstance(): ANOVAService {
    if (!ANOVAService.instance) {
      ANOVAService.instance = new ANOVAService()
    }
    return ANOVAService.instance
  }

  /**
   * 일원분산분석 (One-way ANOVA)
   */
  async oneWayANOVA(groups: number[][]): Promise<ANOVAResult> {
    await this.initialize()
    this.setData('groups_data', groups)

    const py_result = await this.runPythonSafely(`
      # 각 그룹 데이터 정리
      groups_clean = []
      for group in groups_data:
        clean = [x for x in group if x is not None and not np.isnan(x)]
        if len(clean) > 0:
          groups_clean.append(clean)

      if len(groups_clean) < 2:
        py_result = {'error': 'ANOVA requires at least 2 groups'}
      elif any(len(group) < 2 for group in groups_clean):
        py_result = {'error': 'Each group must have at least 2 observations'}
      else:
        # ANOVA 수행
        f_stat, p_value = stats.f_oneway(*groups_clean)

        # 제곱합 계산
        all_data = []
        group_means = []
        group_sizes = []

        for group in groups_clean:
          all_data.extend(group)
          group_means.append(np.mean(group))
          group_sizes.append(len(group))

        grand_mean = np.mean(all_data)
        n_total = len(all_data)
        n_groups = len(groups_clean)

        # Between-group sum of squares (SSB)
        ssb = sum(n * (mean - grand_mean)**2 for n, mean in zip(group_sizes, group_means))

        # Within-group sum of squares (SSW)
        ssw = 0
        for i, group in enumerate(groups_clean):
          ssw += sum((x - group_means[i])**2 for x in group)

        # Total sum of squares
        sst = ssb + ssw

        # Degrees of freedom
        df_between = n_groups - 1
        df_within = n_total - n_groups
        df_total = n_total - 1

        # Mean squares
        ms_between = ssb / df_between
        ms_within = ssw / df_within

        # Effect sizes
        eta_squared = ssb / sst
        omega_squared = (ssb - df_between * ms_within) / (sst + ms_within)
        partial_eta_squared = ssb / (ssb + ssw)

        py_result = {
          'fStatistic': float(f_stat),
          'pValue': float(p_value),
          'dfBetween': int(df_between),
          'dfWithin': int(df_within),
          'dfTotal': int(df_total),
          'ssBetween': float(ssb),
          'ssWithin': float(ssw),
          'ssTotal': float(sst),
          'msBetween': float(ms_between),
          'msWithin': float(ms_within),
          'etaSquared': float(eta_squared),
          'omegaSquared': float(max(0, omega_squared)),  # omega_squared can be negative
          'partialEtaSquared': float(partial_eta_squared),
          'groupMeans': [float(mean) for mean in group_means],
          'groupSizes': group_sizes,
          'totalSampleSize': int(n_total)
        }

      import json
      result = json.dumps(py_result)
      result
    `)

    const result = JSON.parse(py_result)
    if (result.error) {
      throw new Error(result.error)
    }

    return result as ANOVAResult
  }

  /**
   * 이원분산분석 (Two-way ANOVA)
   */
  async twoWayANOVA(data: number[][], factor1: string[], factor2: string[]): Promise<ANOVAResult> {
    await this.initialize()
    this.setData('data_values', data.flat())
    this.setData('factor1_labels', factor1)
    this.setData('factor2_labels', factor2)

    const py_result = await this.runPythonSafely(`
      import pandas as pd
      from scipy import stats

      # 데이터 프레임 생성
      df_data = {
        'value': data_values,
        'factor1': factor1_labels,
        'factor2': factor2_labels
      }
      df = pd.DataFrame(df_data)

      # 결측값 제거
      df_clean = df.dropna()

      if len(df_clean) < 4:
        py_result = {'error': 'Insufficient data for two-way ANOVA'}
      else:
        # 그룹별 통계량 계산
        grand_mean = df_clean['value'].mean()

        # Factor 1 main effect
        factor1_means = df_clean.groupby('factor1')['value'].mean()
        factor1_sizes = df_clean.groupby('factor1')['value'].count()

        # Factor 2 main effect
        factor2_means = df_clean.groupby('factor2')['value'].mean()
        factor2_sizes = df_clean.groupby('factor2')['value'].count()

        # Interaction effect
        interaction_means = df_clean.groupby(['factor1', 'factor2'])['value'].mean()
        interaction_sizes = df_clean.groupby(['factor1', 'factor2'])['value'].count()

        # Total sum of squares
        sst = sum((df_clean['value'] - grand_mean)**2)

        # Sum of squares for Factor 1
        ss_factor1 = sum(factor1_sizes * (factor1_means - grand_mean)**2)

        # Sum of squares for Factor 2
        ss_factor2 = sum(factor2_sizes * (factor2_means - grand_mean)**2)

        # Sum of squares for interaction (simplified calculation)
        # This is an approximation - full calculation would require balanced design
        ss_interaction = 0
        for (f1, f2), group_mean in interaction_means.items():
          expected = factor1_means[f1] + factor2_means[f2] - grand_mean
          ss_interaction += interaction_sizes[(f1, f2)] * (group_mean - expected)**2

        # Error sum of squares
        ss_error = sst - ss_factor1 - ss_factor2 - ss_interaction

        # Degrees of freedom
        n_levels_f1 = len(factor1_means)
        n_levels_f2 = len(factor2_means)
        n_total = len(df_clean)

        df_factor1 = n_levels_f1 - 1
        df_factor2 = n_levels_f2 - 1
        df_interaction = df_factor1 * df_factor2
        df_error = n_total - n_levels_f1 * n_levels_f2

        # Mean squares
        ms_factor1 = ss_factor1 / df_factor1 if df_factor1 > 0 else 0
        ms_factor2 = ss_factor2 / df_factor2 if df_factor2 > 0 else 0
        ms_interaction = ss_interaction / df_interaction if df_interaction > 0 else 0
        ms_error = ss_error / df_error if df_error > 0 else 0

        # F-statistics
        f_factor1 = ms_factor1 / ms_error if ms_error > 0 else 0
        f_factor2 = ms_factor2 / ms_error if ms_error > 0 else 0
        f_interaction = ms_interaction / ms_error if ms_error > 0 else 0

        # P-values
        p_factor1 = 1 - stats.f.cdf(f_factor1, df_factor1, df_error) if f_factor1 > 0 else 1
        p_factor2 = 1 - stats.f.cdf(f_factor2, df_factor2, df_error) if f_factor2 > 0 else 1
        p_interaction = 1 - stats.f.cdf(f_interaction, df_interaction, df_error) if f_interaction > 0 else 1

        py_result = {
          'factor1': {
            'fStatistic': float(f_factor1),
            'pValue': float(p_factor1),
            'df': int(df_factor1),
            'ss': float(ss_factor1),
            'ms': float(ms_factor1)
          },
          'factor2': {
            'fStatistic': float(f_factor2),
            'pValue': float(p_factor2),
            'df': int(df_factor2),
            'ss': float(ss_factor2),
            'ms': float(ms_factor2)
          },
          'interaction': {
            'fStatistic': float(f_interaction),
            'pValue': float(p_interaction),
            'df': int(df_interaction),
            'ss': float(ss_interaction),
            'ms': float(ms_interaction)
          },
          'error': {
            'df': int(df_error),
            'ss': float(ss_error),
            'ms': float(ms_error)
          },
          'total': {
            'ss': float(sst),
            'df': int(n_total - 1)
          },
          'sampleSize': int(n_total)
        }

      import json
      result = json.dumps(py_result)
      result
    `)

    const result = JSON.parse(py_result)
    if (result.error) {
      throw new Error(result.error)
    }

    // 기본 응답인 경우 그대로 반환
    if (!result.factor1 || !result.error || !result.total) {
      return result as ANOVAResult
    }

    // 호환성을 위해 main effect 결과를 기본 형식으로 변환
    return {
      fStatistic: result.factor1.fStatistic,
      pValue: result.factor1.pValue,
      dfBetween: result.factor1.df,
      dfWithin: result.error.df,
      dfTotal: result.total.df,
      ssBetween: result.factor1.ss,
      ssWithin: result.error.ss,
      ssTotal: result.total.ss,
      msBetween: result.factor1.ms,
      msWithin: result.error.ms,
      etaSquared: result.factor1.ss / result.total.ss,
      omegaSquared: (result.factor1.ss - result.factor1.df * result.error.ms) / (result.total.ss + result.error.ms),
      partialEtaSquared: result.factor1.ss / (result.factor1.ss + result.error.ss),
      ...result
    } as ANOVAResult
  }

  /**
   * 반복측정 ANOVA (Repeated Measures ANOVA)
   */
  async repeatedMeasuresANOVA(data: number[][]): Promise<ANOVAResult> {
    await this.initialize()
    this.setData('data_matrix', data)

    const py_result = await this.runPythonSafely(`
      # 데이터가 subjects x conditions 형태라고 가정
      data_array = np.array(data_matrix)

      # 결측값이 있는 행 제거
      valid_rows = ~np.isnan(data_array).any(axis=1)
      clean_data = data_array[valid_rows]

      if clean_data.shape[0] < 2 or clean_data.shape[1] < 2:
        py_result = {'error': 'Insufficient data for repeated measures ANOVA'}
      else:
        n_subjects, n_conditions = clean_data.shape

        # 전체 평균
        grand_mean = np.mean(clean_data)

        # 조건별 평균
        condition_means = np.mean(clean_data, axis=0)

        # 피험자별 평균
        subject_means = np.mean(clean_data, axis=1)

        # Sum of squares
        # Total SS
        sst = np.sum((clean_data - grand_mean)**2)

        # Between-subjects SS
        ss_subjects = n_conditions * np.sum((subject_means - grand_mean)**2)

        # Within-subjects SS
        ss_within = sst - ss_subjects

        # Between-conditions SS (within-subjects)
        ss_conditions = n_subjects * np.sum((condition_means - grand_mean)**2)

        # Error SS
        ss_error = ss_within - ss_conditions

        # Degrees of freedom
        df_conditions = n_conditions - 1
        df_subjects = n_subjects - 1
        df_error = df_conditions * df_subjects
        df_total = n_subjects * n_conditions - 1

        # Mean squares
        ms_conditions = ss_conditions / df_conditions
        ms_error = ss_error / df_error if df_error > 0 else 0

        # F-statistic
        f_stat = ms_conditions / ms_error if ms_error > 0 else 0

        # P-value
        p_value = 1 - stats.f.cdf(f_stat, df_conditions, df_error) if f_stat > 0 else 1

        # Effect sizes
        eta_squared = ss_conditions / sst
        partial_eta_squared = ss_conditions / (ss_conditions + ss_error)

        py_result = {
          'fStatistic': float(f_stat),
          'pValue': float(p_value),
          'dfBetween': int(df_conditions),
          'dfWithin': int(df_error),
          'dfTotal': int(df_total),
          'ssBetween': float(ss_conditions),
          'ssWithin': float(ss_error),
          'ssTotal': float(sst),
          'ssSubjects': float(ss_subjects),
          'msBetween': float(ms_conditions),
          'msWithin': float(ms_error),
          'etaSquared': float(eta_squared),
          'partialEtaSquared': float(partial_eta_squared),
          'nSubjects': int(n_subjects),
          'nConditions': int(n_conditions),
          'conditionMeans': [float(m) for m in condition_means]
        }

      import json
      result = json.dumps(py_result)
      result
    `)

    const result = JSON.parse(py_result)
    if (result.error) {
      throw new Error(result.error)
    }

    return {
      ...result,
      omegaSquared: Math.max(0, (result.ssBetween - result.dfBetween * result.msWithin) / (result.ssTotal + result.msWithin))
    } as ANOVAResult
  }

  /**
   * Tukey HSD 사후검정
   */
  async tukeyHSD(groups: number[][], groupNames?: string[], alpha: number = 0.05): Promise<TukeyHSDResult> {
    await this.initialize()
    this.setData('groups_data', groups)
    this.setData('group_names', groupNames || groups.map((_, i) => `Group${i + 1}`))
    this.setData('alpha_level', alpha)

    const py_result = await this.runPythonSafely(`
      # 데이터 정리
      groups_clean = []
      names_clean = []
      for i, group in enumerate(groups_data):
        clean = [x for x in group if x is not None and not np.isnan(x)]
        if len(clean) > 0:
          groups_clean.append(clean)
          names_clean.append(group_names[i] if i < len(group_names) else f"Group{i+1}")

      if len(groups_clean) < 2:
        py_result = {'error': 'At least 2 groups required for Tukey HSD'}
      else:
        # 전체 MSE 계산 (ANOVA에서 구한 오차평균제곱)
        all_data = []
        group_means = []
        group_sizes = []

        for group in groups_clean:
          all_data.extend(group)
          group_means.append(np.mean(group))
          group_sizes.append(len(group))

        grand_mean = np.mean(all_data)
        n_total = len(all_data)
        n_groups = len(groups_clean)

        # MSE (Mean Square Error) 계산
        ss_within = 0
        for i, group in enumerate(groups_clean):
          ss_within += sum((x - group_means[i])**2 for x in group)

        df_within = n_total - n_groups
        mse = ss_within / df_within

        # Tukey HSD 임계값 (studentized range distribution)
        # 정확한 계산을 위해서는 scipy.stats의 tukey_hsd를 사용해야 하지만
        # 여기서는 근사치 사용
        from scipy.stats import studentized_range
        q_critical = studentized_range.ppf(1 - alpha_level, n_groups, df_within)

        # 모든 쌍별 비교
        comparisons = []
        for i in range(n_groups):
          for j in range(i + 1, n_groups):
            mean_diff = group_means[i] - group_means[j]

            # 표준오차 계산
            n_harmonic = 2 / (1/group_sizes[i] + 1/group_sizes[j])  # 조화평균
            se = np.sqrt(mse / n_harmonic * 2)

            # HSD (Honestly Significant Difference)
            hsd = q_critical * se

            # 신뢰구간
            lower_ci = mean_diff - hsd
            upper_ci = mean_diff + hsd

            # p-value 근사 (정확한 계산을 위해서는 더 복잡한 방법 필요)
            q_stat = abs(mean_diff) / se
            # 근사적 p-value
            p_value = 2 * (1 - studentized_range.cdf(q_stat, n_groups, df_within))

            comparisons.append({
              'group1': names_clean[i],
              'group2': names_clean[j],
              'meanDiff': float(mean_diff),
              'pValue': float(p_value),
              'reject': bool(abs(mean_diff) > hsd),
              'lowerCI': float(lower_ci),
              'upperCI': float(upper_ci),
              'hsd': float(hsd)
            })

        py_result = {
          'comparisons': comparisons,
          'criticalValue': float(q_critical),
          'alpha': float(alpha_level),
          'mse': float(mse),
          'dfWithin': int(df_within),
          'nGroups': int(n_groups),
          'groupMeans': [float(m) for m in group_means],
          'groupNames': names_clean
        }

      import json
      result = json.dumps(py_result)
      result
    `)

    const result = JSON.parse(py_result)
    if (result.error) {
      throw new Error(result.error)
    }

    return result as TukeyHSDResult
  }

  /**
   * Games-Howell 사후검정 (등분산 가정을 위반한 경우)
   */
  async gamesHowell(groups: number[][], groupNames?: string[], alpha: number = 0.05): Promise<TukeyHSDResult> {
    await this.initialize()
    this.setData('groups_data', groups)
    this.setData('group_names', groupNames || groups.map((_, i) => `Group${i + 1}`))
    this.setData('alpha_level', alpha)

    const py_result = await this.runPythonSafely(`
      # 데이터 정리
      groups_clean = []
      names_clean = []
      for i, group in enumerate(groups_data):
        clean = [x for x in group if x is not None and not np.isnan(x)]
        if len(clean) > 0:
          groups_clean.append(clean)
          names_clean.append(group_names[i] if i < len(group_names) else f"Group{i+1}")

      if len(groups_clean) < 2:
        py_result = {'error': 'At least 2 groups required for Games-Howell test'}
      else:
        n_groups = len(groups_clean)
        group_stats = []

        # 각 그룹의 통계량 계산
        for group in groups_clean:
          group_stats.append({
            'mean': np.mean(group),
            'var': np.var(group, ddof=1),
            'n': len(group)
          })

        # 모든 쌍별 비교
        comparisons = []
        for i in range(n_groups):
          for j in range(i + 1, n_groups):
            stat_i = group_stats[i]
            stat_j = group_stats[j]

            mean_diff = stat_i['mean'] - stat_j['mean']

            # Welch-type 표준오차
            se = np.sqrt(stat_i['var']/stat_i['n'] + stat_j['var']/stat_j['n'])

            # Welch 자유도
            df = (stat_i['var']/stat_i['n'] + stat_j['var']/stat_j['n'])**2 / (
              (stat_i['var']/stat_i['n'])**2/(stat_i['n']-1) +
              (stat_j['var']/stat_j['n'])**2/(stat_j['n']-1)
            )

            # t-통계량
            t_stat = abs(mean_diff) / se if se > 0 else 0

            # Games-Howell 임계값 (studentized range with Welch adjustment)
            # 근사치 사용
            q_critical = studentized_range.ppf(1 - alpha_level, n_groups, df) / np.sqrt(2)
            critical_diff = q_critical * se

            # 신뢰구간
            lower_ci = mean_diff - critical_diff
            upper_ci = mean_diff + critical_diff

            # p-value (조정된 t-검정)
            p_value = 2 * (1 - stats.t.cdf(t_stat, df))
            # 다중비교 조정 (Bonferroni-like adjustment)
            adjusted_p = min(1.0, p_value * n_groups * (n_groups - 1) / 2)

            comparisons.append({
              'group1': names_clean[i],
              'group2': names_clean[j],
              'meanDiff': float(mean_diff),
              'pValue': float(adjusted_p),
              'reject': bool(abs(mean_diff) > critical_diff),
              'lowerCI': float(lower_ci),
              'upperCI': float(upper_ci),
              'criticalDiff': float(critical_diff),
              'df': float(df)
            })

        py_result = {
          'comparisons': comparisons,
          'alpha': float(alpha_level),
          'nGroups': int(n_groups),
          'groupNames': names_clean,
          'method': 'Games-Howell'
        }

      import json
      result = json.dumps(py_result)
      result
    `)

    const result = JSON.parse(py_result)
    if (result.error) {
      throw new Error(result.error)
    }

    return {
      ...result,
      criticalValue: 0  // Games-Howell에서는 각 비교마다 다른 임계값 사용
    } as TukeyHSDResult
  }

  /**
   * Bonferroni 사후검정
   */
  async manova(dependentVars: number[][], groups: string[]): Promise<MANOVAResult> {
    await this.initialize()
    this.setData('dependent_vars', dependentVars)
    this.setData('groups', groups)

    const py_result = await this.runPythonSafely(`
      import pandas as pd
      from statsmodels.multivariate.manova import MANOVA

      # 데이터 준비
      dependent_vars = list(map(list, zip(*dependent_vars)))  # Transpose
      n_obs = len(dependent_vars)
      n_vars = len(dependent_vars[0]) if n_obs > 0 else 0

      # 데이터프레임 생성
      df_data = {}
      for i in range(n_vars):
        df_data[f'Y{i+1}'] = [row[i] for row in dependent_vars]
      df_data['group'] = groups

      df = pd.DataFrame(df_data)

      # MANOVA 수행
      try:
        # 종속변수 열 이름들
        dep_var_names = [f'Y{i+1}' for i in range(n_vars)]
        formula = ' + '.join(dep_var_names) + ' ~ group'

        manova = MANOVA.from_formula(formula, data=df)
        mv_test = manova.mv_test()

        # 테스트 통계량 추출
        test_results = mv_test.results['group']['stat']

        # 각 테스트 통계량 파싱
        stats = {}
        test_names = ['Wilks\' lambda', 'Pillai\\'s trace', 'Hotelling-Lawley trace', 'Roy\\'s greatest root']
        stat_keys = ['wilks_lambda', 'pillai_trace', 'hotelling_trace', 'roy_greatest_root']

        for i, (test_name, stat_key) in enumerate(zip(test_names, stat_keys)):
          row = test_results.iloc[i]
          stats[stat_key] = {
            'statistic': float(row['Value']),
            'f_value': float(row['F Value']),
            'df_num': float(row['Num DF']),
            'df_den': float(row['Den DF']),
            'p_value': float(row['Pr > F'])
          }

        # 각 종속변수별 단변량 ANOVA
        univariate_results = []
        for var_name in dep_var_names:
          from scipy import stats as sp_stats
          groups_data = [df[df['group'] == g][var_name].values for g in df['group'].unique()]
          f_stat, p_val = sp_stats.f_oneway(*groups_data)
          univariate_results.append({
            'variable': var_name,
            'f_statistic': float(f_stat),
            'p_value': float(p_val),
            'df': [len(df['group'].unique()) - 1, len(df) - len(df['group'].unique())]
          })

        py_result = {
          'test_statistics': stats,
          'univariate_anovas': univariate_results,
          'n_groups': int(df['group'].nunique()),
          'n_dependent_vars': int(n_vars),
          'n_observations': int(len(df))
        }

      except Exception as e:
        py_result = {'error': str(e)}

      import json
      result = json.dumps(py_result)
      result
    `)

    const result = JSON.parse(py_result)
    if (result.error) {
      throw new Error(result.error)
    }

    return result as MANOVAResult
  }

  async bonferroni(groups: number[][], groupNames?: string[], alpha: number = 0.05): Promise<TukeyHSDResult> {
    await this.initialize()
    this.setData('groups_data', groups)
    this.setData('group_names', groupNames || groups.map((_, i) => `Group${i + 1}`))
    this.setData('alpha_level', alpha)

    const py_result = await this.runPythonSafely(`
      # 데이터 정리
      groups_clean = []
      names_clean = []
      for i, group in enumerate(groups_data):
        clean = [x for x in group if x is not None and not np.isnan(x)]
        if len(clean) > 0:
          groups_clean.append(clean)
          names_clean.append(group_names[i] if i < len(group_names) else f"Group{i+1}")

      if len(groups_clean) < 2:
        py_result = {'error': 'At least 2 groups required for Bonferroni test'}
      else:
        n_groups = len(groups_clean)
        n_comparisons = n_groups * (n_groups - 1) // 2
        bonferroni_alpha = alpha_level / n_comparisons

        # 모든 쌍별 비교
        comparisons = []
        for i in range(n_groups):
          for j in range(i + 1, n_groups):
            # 독립표본 t-검정
            group_i = np.array(groups_clean[i])
            group_j = np.array(groups_clean[j])

            t_stat, p_value = stats.ttest_ind(group_i, group_j)

            # Bonferroni 조정
            adjusted_p = min(1.0, p_value * n_comparisons)

            # 기본 통계량
            mean_i = np.mean(group_i)
            mean_j = np.mean(group_j)
            mean_diff = mean_i - mean_j

            # 신뢰구간 (Bonferroni 조정된 alpha 사용)
            pooled_std = np.sqrt(((len(group_i)-1)*np.var(group_i, ddof=1) +
                                (len(group_j)-1)*np.var(group_j, ddof=1)) /
                               (len(group_i) + len(group_j) - 2))
            se = pooled_std * np.sqrt(1/len(group_i) + 1/len(group_j))
            df = len(group_i) + len(group_j) - 2
            t_critical = stats.t.ppf(1 - bonferroni_alpha/2, df)

            lower_ci = mean_diff - t_critical * se
            upper_ci = mean_diff + t_critical * se

            comparisons.append({
              'group1': names_clean[i],
              'group2': names_clean[j],
              'meanDiff': float(mean_diff),
              'pValue': float(adjusted_p),
              'reject': bool(adjusted_p < alpha_level),
              'lowerCI': float(lower_ci),
              'upperCI': float(upper_ci),
              'tStatistic': float(t_stat),
              'df': int(df),
              'adjustedAlpha': float(bonferroni_alpha)
            })

        py_result = {
          'comparisons': comparisons,
          'alpha': float(alpha_level),
          'adjustedAlpha': float(bonferroni_alpha),
          'nComparisons': int(n_comparisons),
          'nGroups': int(n_groups),
          'groupNames': names_clean,
          'method': 'Bonferroni'
        }

      import json
      result = json.dumps(py_result)
      result
    `)

    const result = JSON.parse(py_result)
    if (result.error) {
      throw new Error(result.error)
    }

    return {
      ...result,
      criticalValue: 0  // Bonferroni에서는 각 비교마다 다른 임계값 사용
    } as TukeyHSDResult
  }
}