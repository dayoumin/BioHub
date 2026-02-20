/**
 * 명명 규칙 자동 검증 테스트
 *
 * CLAUDE.md 섹션 7 규칙 준수를 자동으로 검증합니다.
 * - Python Worker 반환 키: camelCase 필수
 * - TypeScript 인터페이스 속성: camelCase 필수
 * - Python 함수명: snake_case 유지
 *
 * 이 테스트가 실패하면 명명 규칙 위반이 있다는 뜻입니다.
 */

import { readFileSync } from 'fs'
import { glob } from 'glob'

// snake_case 패턴 감지 (따옴표 안의 딕셔너리 키)
const SNAKE_CASE_RETURN_KEY = /['"]([a-z]+_[a-z_]+)['"]\s*:/g

// TypeScript 인터페이스 속성의 snake_case 패턴
const SNAKE_CASE_PROPERTY = /^\s+([a-z]+_[a-z_]+)\??:\s/gm

// 허용 목록: Python 함수명 참조 (TypeScript에서 문자열로 호출)
const ALLOWED_SNAKE_CASE_STRINGS = [
  // Worker 1
  'descriptive_stats', 'normality_test', 'outlier_detection',
  'frequency_analysis', 'crosstab_analysis', 'one_sample_proportion_test',
  'cronbach_alpha', 'kolmogorov_smirnov_test', 'ks_test_one_sample',
  'ks_test_two_sample', 'mann_kendall_test', 'bonferroni_correction',
  'means_plot_data',
  // Worker 2
  't_test_two_sample', 't_test_paired', 't_test_one_sample',
  't_test_one_sample_summary', 't_test_two_sample_summary', 't_test_paired_summary',
  'z_test', 'chi_square_test', 'binomial_test', 'correlation_test',
  'partial_correlation', 'levene_test', 'bartlett_test',
  'chi_square_goodness_test', 'chi_square_independence_test',
  'fisher_exact_test', 'partial_correlation_analysis',
  'stepwise_regression_forward', 'power_analysis',
  'poisson_regression', 'ordinal_regression',
  'generalized_linear_model', 'negative_binomial_regression',
  'ordinal_multinomial_regression', 'multivariate_normality_test',
  // Worker 3
  'one_way_anova', 'two_way_anova', 'three_way_anova',
  'repeated_measures_anova', 'mixed_anova', 'ancova_analysis',
  'welch_anova', 'mann_whitney_u', 'wilcoxon_signed_rank',
  'kruskal_wallis', 'friedman_test', 'friedman_posthoc',
  'mood_median_test', 'sign_test', 'runs_test', 'mcnemar_test',
  'manova_analysis', 'mixed_model_analysis',
  // Worker 4
  'linear_regression', 'multiple_regression', 'logistic_regression',
  'pca_analysis', 'curve_estimation', 'nonlinear_regression',
  'stepwise_regression', 'binary_logistic', 'multinomial_logistic',
  'ordinal_logistic', 'probit_regression', 'negative_binomial_regression',
  'factor_analysis_method', 'cluster_analysis', 'time_series_analysis',
  'durbin_watson_test', 'discriminant_analysis',
  'kaplan_meier_survival', 'cox_regression', 'dose_response_analysis',
  'arima_forecast', 'sarima_forecast', 'response_surface_analysis',
  'var_model',
]

// Python 내부에서 허용되는 패턴 (함수 정의, import 등)
const PYTHON_INTERNAL_PATTERNS = [
  /^def\s/, /^import\s/, /^from\s/, /^class\s/,
  /^\s*#/, // 주석
  /^\s*[a-z_]+\s*=/, // 내부 변수 할당
]

describe('Naming Convention Enforcement', () => {
  describe('Python Worker return keys must be camelCase', () => {
    const workerFiles = [
      'public/workers/python/worker1-descriptive.py',
      'public/workers/python/worker2-hypothesis.py',
      'public/workers/python/worker3-nonparametric-anova.py',
      'public/workers/python/worker4-regression-advanced.py',
    ]

    for (const file of workerFiles) {
      it(`${file} - return keys should be camelCase`, () => {
        const content = readFileSync(file, 'utf8')
        const lines = content.split('\n')
        const violations: string[] = []

        for (let i = 0; i < lines.length; i++) {
          const line = lines[i]

          // 주석이나 내부 변수 할당은 건너뜀
          if (PYTHON_INTERNAL_PATTERNS.some(p => p.test(line.trim()))) continue

          // if/elif 조건문의 콜론은 딕셔너리 키가 아님
          if (line.match(/^\s*(if|elif|else)\s/)) continue

          // 딕셔너리 키 패턴 검사: 'snake_case': 형태
          const matches = [...line.matchAll(SNAKE_CASE_RETURN_KEY)]
          for (const match of matches) {
            const key = match[1]
            // Python 함수명 참조는 허용
            if (ALLOWED_SNAKE_CASE_STRINGS.includes(key)) continue
            // 라이브러리 속성 접근은 허용 (예: model.null_deviance)
            if (line.includes('model.') || line.includes('result.') || line.includes('stats.')) continue
            // == 비교의 문자열 값은 허용 (enum 값)
            if (line.includes('==') || line.includes('!=')) continue

            violations.push(`Line ${i + 1}: '${key}' should be camelCase`)
          }
        }

        if (violations.length > 0) {
          throw new Error(
            `Found ${violations.length} snake_case return keys:\n` +
            violations.slice(0, 10).join('\n') +
            (violations.length > 10 ? `\n... and ${violations.length - 10} more` : '')
          )
        }
      })
    }
  })

  describe('TypeScript interface properties must be camelCase', () => {
    it('statistics page interfaces should not have snake_case properties', () => {
      const pageFiles = glob.sync('app/(dashboard)/statistics/*/page.tsx')
      const violations: string[] = []

      for (const file of pageFiles) {
        const content = readFileSync(file, 'utf8')
        const lines = content.split('\n')
        let inInterface = false

        for (let i = 0; i < lines.length; i++) {
          const line = lines[i]

          if (line.match(/^\s*interface\s/)) inInterface = true
          if (inInterface && line.trim() === '}') inInterface = false

          if (inInterface) {
            const propMatch = line.match(/^\s+([a-z]+_[a-z_]+)\??:/)
            if (propMatch) {
              const prop = propMatch[1]
              violations.push(`${file}:${i + 1}: '${prop}' should be camelCase`)
            }
          }
        }
      }

      if (violations.length > 0) {
        throw new Error(
          `Found ${violations.length} snake_case interface properties:\n` +
          violations.slice(0, 10).join('\n') +
          (violations.length > 10 ? `\n... and ${violations.length - 10} more` : '')
        )
      }
    })
  })

  describe('EffectSizeType literals must be camelCase', () => {
    it('types/statistics.ts EffectSizeType should use camelCase', () => {
      const content = readFileSync('types/statistics.ts', 'utf8')
      const effectSizeMatch = content.match(/export type EffectSizeType\s*=([\s\S]*?)(?=\n\n|\/\*\*)/)?.[1]

      if (!effectSizeMatch) {
        throw new Error('EffectSizeType not found in types/statistics.ts')
      }

      const snakeCaseLiterals = [...effectSizeMatch.matchAll(/'([a-z]+_[a-z_]+)'/g)]
      if (snakeCaseLiterals.length > 0) {
        throw new Error(
          `EffectSizeType has snake_case literals:\n` +
          snakeCaseLiterals.map(m => `  '${m[1]}'`).join('\n')
        )
      }
    })
  })

  describe('Python function names must be snake_case', () => {
    const workerFiles = [
      'public/workers/python/worker1-descriptive.py',
      'public/workers/python/worker2-hypothesis.py',
      'public/workers/python/worker3-nonparametric-anova.py',
      'public/workers/python/worker4-regression-advanced.py',
    ]

    for (const file of workerFiles) {
      it(`${file} - function names should be snake_case`, () => {
        const content = readFileSync(file, 'utf8')
        const funcDefs = [...content.matchAll(/^def ([a-zA-Z_]\w*)\(/gm)]
        const violations: string[] = []

        for (const match of funcDefs) {
          const funcName = match[1]
          // private 함수 (_로 시작)는 건너뜀
          if (funcName.startsWith('_')) continue
          // camelCase 감지: 소문자 뒤에 대문자가 오는 패턴
          if (/[a-z][A-Z]/.test(funcName)) {
            violations.push(`'${funcName}' should be snake_case (Python convention)`)
          }
        }

        if (violations.length > 0) {
          throw new Error(
            `Found ${violations.length} non-snake_case function names:\n` +
            violations.join('\n')
          )
        }
      })
    }
  })
})
