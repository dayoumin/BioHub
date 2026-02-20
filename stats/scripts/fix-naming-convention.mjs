/**
 * snake_case → camelCase 명명 규칙 통일 스크립트
 * CLAUDE.md 규칙 준수를 위한 일괄 변환
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join, extname } from 'path';

// 변환 매핑 (순서 중요 - 긴 것부터)
const replacements = [
  // EffectSizeType 리터럴 (따옴표 포함)
  ["'partial_eta_squared'", "'partialEtaSquared'"],
  ["'pseudo_r_squared_mcfadden'", "'pseudoRSquaredMcfadden'"],
  ["'pseudo_r_squared_nagelkerke'", "'pseudoRSquaredNagelkerke'"],
  ["'pseudo_r_squared_cox_snell'", "'pseudoRSquaredCoxSnell'"],
  ["'pseudo_r_squared_deviance'", "'pseudoRSquaredDeviance'"],
  ["'omega_squared'", "'omegaSquared'"],
  ["'epsilon_squared'", "'epsilonSquared'"],
  ["'eta_squared'", "'etaSquared'"],
  ["'cohens_d'", "'cohensD'"],
  ["'hedges_g'", "'hedgesG'"],
  ["'glass_delta'", "'glassDelta'"],
  ["'cramers_v'", "'cramersV'"],
  ["'r_squared'", "'rSquared'"],

  // 쌍따옴표 버전
  ['"partial_eta_squared"', '"partialEtaSquared"'],
  ['"pseudo_r_squared_mcfadden"', '"pseudoRSquaredMcfadden"'],
  ['"pseudo_r_squared_nagelkerke"', '"pseudoRSquaredNagelkerke"'],
  ['"pseudo_r_squared_cox_snell"', '"pseudoRSquaredCoxSnell"'],
  ['"pseudo_r_squared_deviance"', '"pseudoRSquaredDeviance"'],
  ['"omega_squared"', '"omegaSquared"'],
  ['"epsilon_squared"', '"epsilonSquared"'],
  ['"eta_squared"', '"etaSquared"'],
  ['"cohens_d"', '"cohensD"'],
  ['"hedges_g"', '"hedgesG"'],
  ['"glass_delta"', '"glassDelta"'],
  ['"cramers_v"', '"cramersV"'],
  ['"r_squared"', '"rSquared"'],

  // TypeScript 인터페이스 속성 (긴 것부터)
  ['pseudo_r_squared_mcfadden', 'pseudoRSquaredMcfadden'],
  ['pseudo_r_squared_nagelkerke', 'pseudoRSquaredNagelkerke'],
  ['pseudo_r_squared_cox_snell', 'pseudoRSquaredCoxSnell'],
  ['pseudo_r_squared_deviance', 'pseudoRSquaredDeviance'],
  ['partial_eta_squared', 'partialEtaSquared'],
  ['breusch_pagan_p', 'breuschPaganP'],
  ['condition_number', 'conditionNumber'],
  ['jarque_bera_p', 'jarqueBeraP'],
  ['durbin_watson', 'durbinWatson'],
  ['omega_squared', 'omegaSquared'],
  ['epsilon_squared', 'epsilonSquared'],
  ['adj_r_squared', 'adjRSquared'],
  ['eta_squared', 'etaSquared'],
  ['glass_delta', 'glassDelta'],
  ['t_statistic', 'tStatistic'],
  ['f_statistic', 'fStatistic'],
  ['z_statistic', 'zStatistic'],
  ['partial_corr', 'partialCorr'],
  ['mean_partial_corr', 'meanPartialCorr'],
  ['max_partial_corr', 'maxPartialCorr'],
  ['min_partial_corr', 'minPartialCorr'],
  ['t_for_inclusion', 'tForInclusion'],
  ['chi_square', 'chiSquare'],
  ['degrees_freedom', 'degreesFreedom'],
  ['fitted_values', 'fittedValues'],
  ['confidence_intervals', 'confidenceIntervals'],
  ['goodness_of_fit', 'goodnessOfFit'],
  ['model_diagnostics', 'modelDiagnostics'],
  ['excluded_variables', 'excludedVariables'],
  ['step_history', 'stepHistory'],
  ['final_model', 'finalModel'],
  ['criterion_value', 'criterionValue'],
  ['actual_count', 'actualCount'],
  ['predicted_count', 'predictedCount'],
  ['pearson_residual', 'pearsonResidual'],
  ['deviance_residual', 'devianceResidual'],
  ['significant_predictors', 'significantPredictors'],
  ['predicted_values', 'predictedValues'],
  ['dispersion_parameter', 'dispersionParameter'],
  ['dispersion_ratio', 'dispersionRatio'],
  ['assumption_met', 'assumptionMet'],
  ['exp_coefficient', 'expCoefficient'],
  ['log_likelihood', 'logLikelihood'],
  ['n_observations', 'nObservations'],
  ['n_predictors', 'nPredictors'],
  ['n_categories', 'nCategories'],
  ['link_function', 'linkFunction'],
  ['model_type', 'modelType'],
  ['model_info', 'modelInfo'],
  ['model_fit', 'modelFit'],
  ['pearson_gof', 'pearsonGof'],
  ['deviance_gof', 'devianceGof'],
  ['pearson_chi2', 'pearsonChi2'],
  ['proportional_odds', 'proportionalOdds'],
  ['test_statistic', 'testStatistic'],
  ['test_name', 'testName'],
  ['predicted_category', 'predictedCategory'],
  ['actual_category', 'actualCategory'],
  ['confusion_matrix', 'confusionMatrix'],
  ['category_labels', 'categoryLabels'],
  ['predicted_probabilities', 'predictedProbabilities'],
  ['classification_metrics', 'classificationMetrics'],
  ['approximate_f', 'approximateF'],
  ['numerator_df', 'numeratorDf'],
  ['denominator_df', 'denominatorDf'],
  ['odds_ratio', 'oddsRatio'],
  ['f1_score', 'f1Score'],
  ['cramers_v', 'cramersV'],
  ['hedges_g', 'hedgesG'],
  ['cohens_d', 'cohensD'],
  ['r_squared', 'rSquared'],
  ['std_error', 'stdError'],
  ['z_value', 'zValue'],
  ['p_value', 'pValue'],
  ['f_change', 'fChange'],
  ['f_p_value', 'fPValue'],
];

// 대상 파일 확장자
const targetExtensions = ['.ts', '.tsx', '.py', '.json'];

// 제외 디렉토리
const excludeDirs = ['node_modules', '.next', 'dist', '.git', 'coverage'];

// 제외 파일 (문서는 수정하지 않음)
const excludeFiles = [
  'CLAUDE.md',
  'PARAMETER_NAMING_FIX_CHECKLIST.md',
  'STATISTICS_CODING_STANDARDS.md',
  'COMMON_COMPONENT_GUIDELINES.md',
];

function getAllFiles(dir, files = []) {
  const items = readdirSync(dir);

  for (const item of items) {
    const fullPath = join(dir, item);

    if (excludeDirs.some(ex => fullPath.includes(ex))) continue;
    if (excludeFiles.some(ex => item === ex)) continue;

    const stat = statSync(fullPath);

    if (stat.isDirectory()) {
      getAllFiles(fullPath, files);
    } else if (targetExtensions.includes(extname(item))) {
      files.push(fullPath);
    }
  }

  return files;
}

function processFile(filePath) {
  let content = readFileSync(filePath, 'utf8');
  let originalContent = content;
  let changeCount = 0;

  for (const [from, to] of replacements) {
    const regex = new RegExp(escapeRegex(from), 'g');
    const matches = content.match(regex);
    if (matches) {
      changeCount += matches.length;
      content = content.replace(regex, to);
    }
  }

  if (content !== originalContent) {
    writeFileSync(filePath, content, 'utf8');
    return { filePath, changeCount };
  }

  return null;
}

function escapeRegex(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// 메인 실행
console.log('🔄 snake_case → camelCase 변환 시작...\n');

const baseDir = process.cwd();
const files = getAllFiles(baseDir);
const results = [];

for (const file of files) {
  const result = processFile(file);
  if (result) {
    results.push(result);
    console.log(`✅ ${result.filePath.replace(baseDir, '.')} (${result.changeCount}개 변환)`);
  }
}

console.log('\n' + '='.repeat(50));
console.log(`📊 총 ${results.length}개 파일, ${results.reduce((sum, r) => sum + r.changeCount, 0)}개 변환 완료`);
console.log('\n⚠️  다음 명령어로 검증하세요:');
console.log('   npx tsc --noEmit');
console.log('   npm test');
