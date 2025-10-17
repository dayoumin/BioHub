/**
 * 비모수 검정 서비스 모듈
 */

import { BasePyodideService } from './base'
import type {
  INonparametricService,
  StatisticalTestResult
} from './types'

export class NonparametricService extends BasePyodideService implements INonparametricService {
  private static instance: NonparametricService | null = null

  private constructor() {
    super()
  }

  static getInstance(): NonparametricService {
    if (!NonparametricService.instance) {
      NonparametricService.instance = new NonparametricService()
    }
    return NonparametricService.instance
  }

  /**
   * Mann-Whitney U 검정 (독립표본 비모수)
   */
  async mannWhitneyU(group1: number[], group2: number[], alternative: string = 'two-sided'): Promise<StatisticalTestResult> {
    await this.initialize()
    this.setData('group1', group1)
    this.setData('group2', group2)
    this.setData('alternative', alternative)

    const py_result = await this.runPythonSafely(`
      # 결측값 제거
      g1 = np.array([x for x in group1 if x is not None and not np.isnan(x)])
      g2 = np.array([x for x in group2 if x is not None and not np.isnan(x)])

      if len(g1) < 1 or len(g2) < 1:
        py_result = {'error': 'Each group must have at least 1 observation'}
      else:
        # Mann-Whitney U 검정
        u_stat, p_value = stats.mannwhitneyu(
          g1, g2,
          alternative=alternative if alternative in ['two-sided', 'less', 'greater'] else 'two-sided'
        )

        # 기본 통계량
        n1, n2 = len(g1), len(g2)
        median1 = np.median(g1)
        median2 = np.median(g2)

        # 효과크기 (r = Z / sqrt(N))
        # Z는 정규분포 근사에서 U 통계량을 표준화한 값
        mean_u = n1 * n2 / 2
        std_u = np.sqrt(n1 * n2 * (n1 + n2 + 1) / 12)
        z_score = (u_stat - mean_u) / std_u if std_u > 0 else 0
        effect_size_r = abs(z_score) / np.sqrt(n1 + n2)

        py_result = {
          'statistic': float(u_stat),
          'pValue': float(p_value),
          'zScore': float(z_score),
          'effectSizeR': float(effect_size_r),
          'median1': float(median1),
          'median2': float(median2),
          'sampleSize1': int(n1),
          'sampleSize2': int(n2),
          'alternative': alternative,
          'method': 'Mann-Whitney U test'
        }

      import json
      result = json.dumps(py_result)
      result
    `)

    const result = JSON.parse(py_result)
    if (result.error) {
      throw new Error(result.error)
    }

    return result as StatisticalTestResult
  }

  /**
   * Wilcoxon 부호순위 검정 (대응표본 비모수)
   */
  async wilcoxonSignedRank(values1: number[], values2: number[], alternative: string = 'two-sided'): Promise<StatisticalTestResult> {
    await this.initialize()
    this.setData('values1', values1)
    this.setData('values2', values2)
    this.setData('alternative', alternative)

    const py_result = await this.runPythonSafely(`
      # 쌍별 결측값 제거
      pairs = [(x, y) for x, y in zip(values1, values2)
               if x is not None and y is not None and not np.isnan(x) and not np.isnan(y)]

      if len(pairs) < 2:
        py_result = {'error': 'Insufficient paired data for Wilcoxon test (minimum 2 pairs required)'}
      else:
        v1, v2 = zip(*pairs)
        v1, v2 = np.array(v1), np.array(v2)

        # 차이값 계산 (0인 차이는 제외)
        differences = v1 - v2
        non_zero_diff = differences[differences != 0]

        if len(non_zero_diff) < 2:
          py_result = {'error': 'Insufficient non-zero differences for Wilcoxon test'}
        else:
          # Wilcoxon 부호순위 검정
          w_stat, p_value = stats.wilcoxon(
            v1, v2,
            alternative=alternative if alternative in ['two-sided', 'less', 'greater'] else 'two-sided'
          )

          # 기본 통계량
          n_pairs = len(pairs)
          n_nonzero = len(non_zero_diff)
          median_diff = np.median(differences)

          # 효과크기 (r = Z / sqrt(N))
          mean_w = n_nonzero * (n_nonzero + 1) / 4
          std_w = np.sqrt(n_nonzero * (n_nonzero + 1) * (2 * n_nonzero + 1) / 24)
          z_score = (w_stat - mean_w) / std_w if std_w > 0 else 0
          effect_size_r = abs(z_score) / np.sqrt(n_nonzero)

          py_result = {
            'statistic': float(w_stat),
            'pValue': float(p_value),
            'zScore': float(z_score),
            'effectSizeR': float(effect_size_r),
            'medianDifference': float(median_diff),
            'nPairs': int(n_pairs),
            'nNonZeroDiff': int(n_nonzero),
            'alternative': alternative,
            'method': 'Wilcoxon signed-rank test'
          }

      import json
      result = json.dumps(py_result)
      result
    `)

    const result = JSON.parse(py_result)
    if (result.error) {
      throw new Error(result.error)
    }

    return result as StatisticalTestResult
  }

  /**
   * Kruskal-Wallis H 검정 (일원분산분석의 비모수 버전)
   */
  async kruskalWallis(groups: number[][]): Promise<StatisticalTestResult> {
    await this.initialize()
    this.setData('groups_data', groups)

    const py_result = await this.runPythonSafely(`
      # 각 그룹 데이터 정리
      groups_clean = []
      group_stats = []

      for group in groups_data:
        clean = [x for x in group if x is not None and not np.isnan(x)]
        if len(clean) > 0:
          groups_clean.append(clean)
          group_stats.append({
            'n': len(clean),
            'median': np.median(clean),
            'mean_rank': 0  # 이후 계산
          })

      if len(groups_clean) < 2:
        py_result = {'error': 'Kruskal-Wallis requires at least 2 groups'}
      elif any(len(group) < 1 for group in groups_clean):
        py_result = {'error': 'Each group must have at least 1 observation'}
      else:
        # Kruskal-Wallis 검정
        h_stat, p_value = stats.kruskal(*groups_clean)

        # 자유도
        df = len(groups_clean) - 1

        # 전체 데이터를 합쳐서 순위 계산
        all_data = []
        group_indices = []
        for i, group in enumerate(groups_clean):
          all_data.extend(group)
          group_indices.extend([i] * len(group))

        # 순위 계산
        ranks = stats.rankdata(all_data)

        # 각 그룹의 평균 순위 계산
        for i, stats_dict in enumerate(group_stats):
          group_ranks = [ranks[j] for j, group_idx in enumerate(group_indices) if group_idx == i]
          stats_dict['mean_rank'] = np.mean(group_ranks)

        # 효과크기 (epsilon-squared)
        n_total = len(all_data)
        epsilon_squared = (h_stat - df) / (n_total - df) if n_total > df else 0

        py_result = {
          'statistic': float(h_stat),
          'pValue': float(p_value),
          'df': int(df),
          'epsilonSquared': float(max(0, epsilon_squared)),  # 음수 방지
          'nGroups': len(groups_clean),
          'totalSampleSize': int(n_total),
          'groupStats': group_stats,
          'method': 'Kruskal-Wallis H test'
        }

      import json
      result = json.dumps(py_result)
      result
    `)

    const result = JSON.parse(py_result)
    if (result.error) {
      throw new Error(result.error)
    }

    return result as StatisticalTestResult
  }

  /**
   * Friedman 검정 (반복측정 일원분산분석의 비모수 버전)
   */
  async friedman(data: number[][]): Promise<StatisticalTestResult> {
    await this.initialize()
    this.setData('data_matrix', data)

    const py_result = await this.runPythonSafely(`
      # 데이터가 subjects x conditions 형태라고 가정
      data_array = np.array(data_matrix)

      # 결측값이 있는 행 제거
      valid_rows = ~np.isnan(data_array).any(axis=1)
      clean_data = data_array[valid_rows]

      if clean_data.shape[0] < 2:
        py_result = {'error': 'Friedman test requires at least 2 subjects'}
      elif clean_data.shape[1] < 2:
        py_result = {'error': 'Friedman test requires at least 2 conditions'}
      else:
        n_subjects, n_conditions = clean_data.shape

        # Friedman 검정
        # scipy.stats.friedmanchisquare는 그룹별로 분리된 데이터를 받음
        groups = [clean_data[:, i] for i in range(n_conditions)]
        chi2_stat, p_value = stats.friedmanchisquare(*groups)

        # 자유도
        df = n_conditions - 1

        # 각 조건의 순위 합계 계산 (수동)
        ranks = np.zeros_like(clean_data)
        for i in range(n_subjects):
          ranks[i, :] = stats.rankdata(clean_data[i, :])

        rank_sums = np.sum(ranks, axis=0)
        mean_ranks = rank_sums / n_subjects

        # 효과크기 (Kendall's W)
        sum_squared_deviations = np.sum((rank_sums - np.mean(rank_sums))**2)
        kendalls_w = 12 * sum_squared_deviations / (n_subjects**2 * (n_conditions**3 - n_conditions))

        py_result = {
          'statistic': float(chi2_stat),
          'pValue': float(p_value),
          'df': int(df),
          'kendallsW': float(kendalls_w),
          'nSubjects': int(n_subjects),
          'nConditions': int(n_conditions),
          'rankSums': rank_sums.tolist(),
          'meanRanks': mean_ranks.tolist(),
          'method': 'Friedman test'
        }

      import json
      result = json.dumps(py_result)
      result
    `)

    const result = JSON.parse(py_result)
    if (result.error) {
      throw new Error(result.error)
    }

    return result as StatisticalTestResult
  }

  /**
   * 카이제곱 검정 (독립성 검정 및 적합도 검정)
   */
  async chiSquareTest(observedMatrix: number[][], correction: boolean = false): Promise<StatisticalTestResult> {
    await this.initialize()
    this.setData('observed_matrix', observedMatrix)
    this.setData('apply_correction', correction)

    const py_result = await this.runPythonSafely(`
      observed = np.array(observed_matrix)

      if observed.size == 0:
        py_result = {'error': 'Empty contingency table'}
      elif np.any(observed < 0):
        py_result = {'error': 'All observed frequencies must be non-negative'}
      else:
        # 카이제곱 검정 수행
        if observed.ndim == 1:
          # 적합도 검정 (1차원)
          # 기대빈도는 균등분포로 가정
          expected_freq = np.sum(observed) / len(observed)
          expected = np.full_like(observed, expected_freq, dtype=float)

          chi2_stat = np.sum((observed - expected)**2 / expected)
          df = len(observed) - 1
          p_value = 1 - stats.chi2.cdf(chi2_stat, df)

          test_type = 'Goodness of fit'

        else:
          # 독립성 검정 (2차원)
          if apply_correction and observed.shape == (2, 2):
            # Yates' continuity correction for 2x2 tables
            chi2_stat, p_value, df, expected = stats.chi2_contingency(observed, correction=True)
          else:
            chi2_stat, p_value, df, expected = stats.chi2_contingency(observed, correction=False)

          test_type = 'Independence test'

        # 효과크기 계산
        n_total = np.sum(observed)

        if observed.ndim == 1:
          # Cramér's V for goodness of fit
          cramers_v = np.sqrt(chi2_stat / (n_total * (len(observed) - 1)))
        else:
          # Cramér's V for contingency table
          min_dim = min(observed.shape[0] - 1, observed.shape[1] - 1)
          cramers_v = np.sqrt(chi2_stat / (n_total * min_dim)) if min_dim > 0 else 0

        # 기대빈도 5 미만인 셀의 비율
        if 'expected' in locals():
          low_expected_ratio = np.sum(expected < 5) / expected.size
        else:
          low_expected_ratio = 0

        py_result = {
          'statistic': float(chi2_stat),
          'pValue': float(p_value),
          'df': int(df),
          'cramersV': float(cramers_v),
          'expectedFrequencies': expected.tolist() if 'expected' in locals() else [],
          'observedFrequencies': observed.tolist(),
          'lowExpectedRatio': float(low_expected_ratio),
          'totalSampleSize': int(n_total),
          'testType': test_type,
          'correctionApplied': bool(apply_correction),
          'method': f'Chi-square {test_type.lower()}'
        }

        # 경고 메시지
        if low_expected_ratio > 0.2:
          py_result['warning'] = 'More than 20% of cells have expected frequency < 5. Results may be unreliable.'

      import json
      result = json.dumps(py_result)
      result
    `)

    const result = JSON.parse(py_result)
    if (result.error) {
      throw new Error(result.error)
    }

    return result as StatisticalTestResult
  }

  /**
   * Dunn's 사후검정 (Kruskal-Wallis 후속 검정)
   */
  async dunnTest(groups: number[][], groupNames?: string[], alpha: number = 0.05): Promise<{
    comparisons: Array<{
      group1: string
      group2: string
      zStatistic: number
      pValue: number
      adjustedPValue: number
      reject: boolean
    }>
    method: string
    alpha: number
  }> {
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
        py_result = {'error': 'At least 2 groups required for Dunn test'}
      else:
        # 전체 데이터 풀링 및 순위 계산
        all_data = []
        group_info = []

        for i, group in enumerate(groups_clean):
          start_idx = len(all_data)
          all_data.extend(group)
          end_idx = len(all_data)
          group_info.append({
            'name': names_clean[i],
            'start': start_idx,
            'end': end_idx,
            'n': len(group)
          })

        # 전체 순위 계산
        ranks = stats.rankdata(all_data)
        n_total = len(all_data)
        k = len(groups_clean)

        # 각 그룹의 순위 합계
        rank_sums = []
        for info in group_info:
          group_ranks = ranks[info['start']:info['end']]
          rank_sums.append(np.sum(group_ranks))

        # 모든 쌍별 비교
        comparisons = []
        n_comparisons = k * (k - 1) // 2

        for i in range(k):
          for j in range(i + 1, k):
            n_i = group_info[i]['n']
            n_j = group_info[j]['n']
            R_i = rank_sums[i]
            R_j = rank_sums[j]

            # Dunn's test Z-statistic
            mean_diff = R_i / n_i - R_j / n_j
            se = np.sqrt((n_total * (n_total + 1) / 12) * (1/n_i + 1/n_j))
            z_stat = mean_diff / se if se > 0 else 0

            # 양측 검정 p-value
            p_value = 2 * (1 - stats.norm.cdf(abs(z_stat)))

            # Bonferroni 조정
            adjusted_p = min(1.0, p_value * n_comparisons)

            comparisons.append({
              'group1': names_clean[i],
              'group2': names_clean[j],
              'zStatistic': float(z_stat),
              'pValue': float(p_value),
              'adjustedPValue': float(adjusted_p),
              'reject': bool(adjusted_p < alpha_level)
            })

        py_result = {
          'comparisons': comparisons,
          'method': "Dunn's test with Bonferroni correction",
          'alpha': float(alpha_level),
          'nComparisons': int(n_comparisons)
        }

      import json
      result = json.dumps(py_result)
      result
    `)

    const result = JSON.parse(py_result)
    if (result.error) {
      throw new Error(result.error)
    }

    return result
  }
}