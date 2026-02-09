/**
 * Python Worker 반환 딕셔너리 키만 snake_case → camelCase 변환
 *
 * 변환 대상: 따옴표로 감싸진 딕셔너리 키만 ('key': 또는 "key":)
 * 보존 대상: 함수명, 내부 변수, 주석 등
 */

import { readFileSync, writeFileSync } from 'fs';

// snake_case → camelCase 변환 함수
function snakeToCamel(str) {
  return str.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
}

// 변환 대상 키 목록 (Python Worker 반환값에서 발견된 snake_case 키)
const targetKeys = [
  // 공통
  'p_value', 'std_error', 'z_value', 't_statistic', 'f_statistic',
  'log_likelihood', 'test_name', 'test_statistic',

  // 효과 크기
  'eta_squared', 'partial_eta_squared', 'omega_squared', 'epsilon_squared',

  // 회귀분석 모델
  'r_squared', 'adj_r_squared', 'adjusted_r_squared',
  'pseudo_r_squared', 'pseudo_r_squared_mcfadden', 'pseudo_r_squared_nagelkerke',
  'pseudo_r_squared_cox_snell', 'pseudo_r_squared_deviance',
  'n_observations', 'n_predictors', 'n_categories',
  'model_type', 'model_info', 'model_fit',
  'link_function', 'condition_number',

  // 계수/예측
  'exp_coefficient', 'odds_ratio',
  'fitted_values', 'predicted_values', 'predicted_count', 'actual_count',
  'predicted_category', 'actual_category',
  'predicted_probabilities', 'classification_metrics',
  'confusion_matrix', 'category_labels',
  'confidence_intervals',

  // 잔차/진단
  'pearson_residual', 'deviance_residual',
  'durbin_watson', 'pearson_chi2',
  'dispersion_parameter', 'dispersion_ratio',
  'assumption_met', 'significant_predictors',
  'pearson_gof', 'deviance_gof',

  // 분산분석
  'chi_square', 'degrees_freedom',
  'proportional_odds',
  'approximate_f', 'numerator_df', 'denominator_df',

  // Stepwise
  'final_model', 'step_history', 'model_diagnostics',
  'excluded_variables', 'criterion_value',
  'partial_corr', 'mean_partial_corr', 'max_partial_corr', 'min_partial_corr',
  't_for_inclusion', 'f_change', 'f_p_value',
  'jarque_bera_p', 'breusch_pagan_p',

  // Dose-response
  'goodness_of_fit',

  // f1_score
  'f1_score',
];

const pyFiles = [
  'public/workers/python/worker1-descriptive.py',
  'public/workers/python/worker2-hypothesis.py',
  'public/workers/python/worker3-nonparametric-anova.py',
  'public/workers/python/worker4-regression-advanced.py',
];

let totalChanges = 0;

for (const filePath of pyFiles) {
  let content = readFileSync(filePath, 'utf8');
  let originalContent = content;
  let fileChanges = 0;

  for (const key of targetKeys) {
    const camelKey = snakeToCamel(key);
    if (camelKey === key) continue; // 이미 camelCase면 스킵

    // 패턴: 'key': 또는 'key', 또는 "key": 또는 "key",
    // 따옴표로 감싸진 딕셔너리 키만 변환
    const patterns = [
      // 작은따옴표 키
      new RegExp(`'${key}'(\\s*:)`, 'g'),
      new RegExp(`'${key}'(\\s*,)`, 'g'),
      new RegExp(`'${key}'(\\s*\\})`, 'g'),
      // 큰따옴표 키
      new RegExp(`"${key}"(\\s*:)`, 'g'),
      new RegExp(`"${key}"(\\s*,)`, 'g'),
      new RegExp(`"${key}"(\\s*\\})`, 'g'),
    ];

    for (const pattern of patterns) {
      const matches = content.match(pattern);
      if (matches) {
        fileChanges += matches.length;
        // 작은따옴표 → 작은따옴표, 큰따옴표 → 큰따옴표 유지
        content = content.replace(pattern, (match, suffix) => {
          if (match.startsWith("'")) return `'${camelKey}'${suffix}`;
          return `"${camelKey}"${suffix}`;
        });
      }
    }
  }

  if (content !== originalContent) {
    writeFileSync(filePath, content, 'utf8');
    console.log(`✅ ${filePath} (${fileChanges}개 반환 키 변환)`);
    totalChanges += fileChanges;
  } else {
    console.log(`⏭️  ${filePath} (변경 없음)`);
  }
}

// out/ 디렉토리에도 복사
for (const filePath of pyFiles) {
  const outPath = filePath.replace('public/', 'out/');
  const content = readFileSync(filePath, 'utf8');
  writeFileSync(outPath, content, 'utf8');
}

console.log(`\n📊 총 ${totalChanges}개 반환 키 변환 완료`);
console.log('📋 out/ 디렉토리에도 복사 완료');
