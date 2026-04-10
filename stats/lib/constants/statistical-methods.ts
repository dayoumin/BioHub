/**
 * Statistical Methods - Single Source of Truth (SSOT)
 *
 * Canonical method IDs are the primary keys.
 * Active page IDs (e.g., 't-test', 'anova') remain accessible via Proxy aliases.
 * Retired legacy aliases are intentionally removed from internal resolution.
 *
 * pageId = routing page slug (e.g., 't-test' → /statistics/t-test)
 * id     = canonical method ID (e.g., 'two-sample-t')
 *
 * ============================================
 * SUMMARY
 * ============================================
 * - Total definitions:    50 canonical entries (9개 VR-only 신규 메서드는 페이지/Worker 미구현으로 후속 추가)
 * - Analysis methods:     46 (가설검정·모델링·분석 기법)
 * - Data tools:            4 (descriptive-stats, explore-data, means-plot, power-analysis)
 * - Embedded (pageId !== id): paired-t, two-way-anova, logistic-regression
 * - Removed as standalone: chi-square (overview), non-parametric (overview), welch-anova (legacy alias of one-way-anova)
 *
 * @see docs/PLAN-METHOD-ID-UNIFICATION.md
 */

import type { StatisticalMethod } from '@/types/analysis'
// Ensure registry boot data is initialized before any STATISTICAL_METHODS consumer runs.
import '@/lib/registry'

// ============================================
// Interface
// ============================================

export interface StatisticalMethodEntry extends StatisticalMethod {
  /** Routing page slug (e.g., 't-test'). Self-page when id === pageId */
  pageId: string
  /** Korean display name */
  koreanName: string
  /** Korean description */
  koreanDescription: string
  /** Deprecated SM IDs + naming variants for backward-compat migration */
  aliases: string[]
  /** Permanent search/detection keywords */
  searchTerms: string[]
  /** true for data tools (descriptive-stats, explore-data, means-plot, power-analysis) */
  isDataTool: boolean
}

// ============================================
// Internal Registry (_METHODS)
// ============================================

const _METHODS: Record<string, StatisticalMethodEntry> = {
  // ============================================
  // 1. T-Test (4)
  // ============================================
  'two-sample-t': {
    id: 'two-sample-t',
    pageId: 't-test',
    name: 'Independent Samples t-Test',
    description: 'Two independent groups mean comparison',
    category: 't-test',
    koreanName: '독립표본 t-검정',
    koreanDescription: '두 독립 그룹의 평균 차이 검정',
    aliases: ['t-test'],
    searchTerms: ['t-test', 'independent', 'two-sample', 'student'],
    isDataTool: false,
  },
  'welch-t': {
    id: 'welch-t',
    pageId: 'welch-t',
    name: 'Welch t-Test',
    description: 'Two groups mean comparison without equal variance assumption',
    category: 't-test',
    koreanName: 'Welch t-검정',
    koreanDescription: '등분산 가정 없이 두 그룹 평균 비교',
    aliases: ['welch-t-test'],
    searchTerms: ['welch'],
    isDataTool: false,
  },
  'one-sample-t': {
    id: 'one-sample-t',
    pageId: 'one-sample-t',
    name: 'One-Sample t-Test',
    description: 'Sample mean vs population mean comparison',
    category: 't-test',
    koreanName: '단일표본 t-검정',
    koreanDescription: '표본 평균과 모집단 평균 비교',
    aliases: [],
    searchTerms: ['one-sample'],
    isDataTool: false,
  },
  'paired-t': {
    id: 'paired-t',
    pageId: 't-test',
    name: 'Paired Samples t-Test',
    description: 'Paired/matched samples mean comparison',
    category: 't-test',
    koreanName: '대응표본 t-검정',
    koreanDescription: '같은 대상을 전/후 측정하여 평균 차이 검정',
    aliases: [],
    searchTerms: ['paired', 'dependent', 'matched'],
    isDataTool: false,
  },

  // ============================================
  // 2. ANOVA (7) — retired aliases removed; page alias 'anova' retained
  // ============================================
  'one-way-anova': {
    id: 'one-way-anova',
    pageId: 'anova',
    name: 'One-Way ANOVA',
    description: 'Three or more groups mean comparison',
    category: 'anova',
    koreanName: '일원분산분석 (ANOVA)',
    koreanDescription: '3개 이상 독립 그룹의 평균 차이 검정',
    aliases: ['anova'],
    searchTerms: ['anova', 'one-way', 'oneway', 'welch'],
    isDataTool: false,
  },
  'two-way-anova': {
    id: 'two-way-anova',
    pageId: 'anova',
    name: 'Two-Way ANOVA',
    description: 'Two factor main effects and interaction analysis',
    category: 'anova',
    koreanName: '이원분산분석 (Two-Way ANOVA)',
    koreanDescription: '두 요인의 주효과와 상호작용 효과를 동시에 분석합니다',
    aliases: ['factorial-anova'],
    searchTerms: ['two-way', 'factorial', 'interaction'],
    isDataTool: false,
  },
  'repeated-measures-anova': {
    id: 'repeated-measures-anova',
    pageId: 'repeated-measures-anova',
    name: 'Repeated Measures ANOVA',
    description: 'Within-subjects factor analysis',
    category: 'anova',
    koreanName: '반복측정 분산분석',
    koreanDescription: '같은 대상을 여러 시점에서 측정',
    aliases: [],
    searchTerms: ['repeated', 'within-subjects'],
    isDataTool: false,
  },
  'ancova': {
    id: 'ancova',
    pageId: 'ancova',
    name: 'ANCOVA',
    description: 'Analysis of Covariance',
    category: 'anova',
    koreanName: '공분산분석 (ANCOVA)',
    koreanDescription: '공변량 통제 후 그룹 비교',
    aliases: ['analysis-of-covariance'],
    searchTerms: ['covariance', 'covariate'],
    isDataTool: false,
  },
  'manova': {
    id: 'manova',
    pageId: 'manova',
    name: 'MANOVA',
    description: 'Multivariate Analysis of Variance',
    category: 'anova',
    koreanName: '다변량 분산분석 (MANOVA)',
    koreanDescription: '여러 종속변수의 그룹 간 차이',
    aliases: ['multivariate-anova'],
    searchTerms: ['multivariate', 'manova'],
    isDataTool: false,
  },
  'mixed-model': {
    id: 'mixed-model',
    pageId: 'mixed-model',
    name: 'Mixed Effects Model',
    description: 'Fixed and random effects analysis',
    category: 'anova',
    koreanName: '혼합효과 모형',
    koreanDescription: '고정효과와 랜덤효과 포함 분석',
    aliases: ['mixed-effects', 'linear-mixed-model', 'lmm'],
    searchTerms: ['mixed', 'random-effects', 'lmm'],
    isDataTool: false,
  },

  // ============================================
  // 3. Nonparametric (11) — non-parametric overview removed
  // ============================================
  'mann-whitney': {
    id: 'mann-whitney',
    pageId: 'mann-whitney',
    name: 'Mann-Whitney U Test',
    description: 'Two independent groups nonparametric comparison',
    category: 'nonparametric',
    koreanName: 'Mann-Whitney U 검정',
    koreanDescription: '두 독립 그룹의 비모수 비교',
    aliases: ['mann-whitney-u', 'wilcoxon-rank-sum'],
    searchTerms: ['mann-whitney', 'rank-sum', 'nonparametric'],
    isDataTool: false,
  },
  'wilcoxon-signed-rank': {
    id: 'wilcoxon-signed-rank',
    pageId: 'wilcoxon',
    name: 'Wilcoxon Signed-Rank Test',
    description: 'Paired samples nonparametric comparison',
    category: 'nonparametric',
    koreanName: 'Wilcoxon 부호순위 검정',
    koreanDescription: '대응표본의 비모수 검정',
    aliases: ['wilcoxon', 'wilcoxon-test'],
    searchTerms: ['wilcoxon', 'signed-rank', 'paired-nonparametric'],
    isDataTool: false,
  },
  'kruskal-wallis': {
    id: 'kruskal-wallis',
    pageId: 'kruskal-wallis',
    name: 'Kruskal-Wallis H Test',
    description: 'Three or more groups nonparametric comparison',
    category: 'nonparametric',
    koreanName: 'Kruskal-Wallis 검정',
    koreanDescription: '3개 이상 그룹의 비모수 비교',
    aliases: ['kruskal-wallis-h'],
    searchTerms: ['kruskal', 'h-test'],
    isDataTool: false,
  },
  'friedman': {
    id: 'friedman',
    pageId: 'friedman',
    name: 'Friedman Test',
    description: 'Repeated measures nonparametric comparison',
    category: 'nonparametric',
    koreanName: 'Friedman 검정',
    koreanDescription: '반복측정의 비모수 대안',
    aliases: ['friedman-test'],
    searchTerms: ['friedman', 'repeated-nonparametric'],
    isDataTool: false,
  },
  'sign-test': {
    id: 'sign-test',
    pageId: 'sign-test',
    name: 'Sign Test',
    description: 'Paired samples sign test',
    category: 'nonparametric',
    koreanName: '부호 검정',
    koreanDescription: '대응표본의 방향성 검정',
    aliases: [],
    searchTerms: ['sign'],
    isDataTool: false,
  },
  'mcnemar': {
    id: 'mcnemar',
    pageId: 'mcnemar',
    name: 'McNemar Test',
    description: 'Paired nominal data comparison',
    category: 'nonparametric',
    koreanName: 'McNemar 검정',
    koreanDescription: '대응 이진 데이터 비교',
    aliases: ['mcnemar-test'],
    searchTerms: ['mcnemar', 'paired-nominal'],
    isDataTool: false,
  },
  'cochran-q': {
    id: 'cochran-q',
    pageId: 'cochran-q',
    name: "Cochran's Q Test",
    description: 'Multiple related samples binary comparison',
    category: 'nonparametric',
    koreanName: 'Cochran Q 검정',
    koreanDescription: '다중 대응 이진 비교',
    aliases: ['cochran-q-test'],
    searchTerms: ['cochran'],
    isDataTool: false,
  },
  'binomial-test': {
    id: 'binomial-test',
    pageId: 'binomial-test',
    name: 'Binomial Test',
    description: 'Binary outcome probability test',
    category: 'nonparametric',
    koreanName: '이항 검정',
    koreanDescription: '이진 결과 확률 검정',
    aliases: ['binomial'],
    searchTerms: ['binomial', 'binary'],
    isDataTool: false,
  },
  'runs-test': {
    id: 'runs-test',
    pageId: 'runs-test',
    name: 'Runs Test',
    description: 'Randomness test',
    category: 'nonparametric',
    koreanName: '런 검정',
    koreanDescription: '무작위성 검정',
    aliases: ['wald-wolfowitz'],
    searchTerms: ['runs', 'randomness', 'wald-wolfowitz'],
    isDataTool: false,
  },
  'kolmogorov-smirnov': {
    id: 'kolmogorov-smirnov',
    pageId: 'ks-test',
    name: 'Kolmogorov-Smirnov Test',
    description: 'Distribution comparison test',
    category: 'nonparametric',
    koreanName: 'Kolmogorov-Smirnov 검정',
    koreanDescription: '두 분포 비교',
    aliases: ['ks-test', 'ks-2samp'],
    searchTerms: ['ks', 'distribution-comparison'],
    isDataTool: false,
  },
  'mood-median': {
    id: 'mood-median',
    pageId: 'mood-median',
    name: "Mood's Median Test",
    description: 'Median comparison across groups',
    category: 'nonparametric',
    koreanName: 'Mood 중앙값 검정',
    koreanDescription: '그룹 간 중앙값 비교',
    aliases: ['mood-median-test'],
    searchTerms: ['mood', 'median'],
    isDataTool: false,
  },

  // ============================================
  // 4. Correlation (2)
  // ============================================
  'pearson-correlation': {
    id: 'pearson-correlation',
    pageId: 'correlation',
    name: 'Correlation Analysis',
    description: 'Pearson/Spearman correlation',
    category: 'correlation',
    koreanName: '상관분석',
    koreanDescription: '두 연속형 변수의 선형 상관관계',
    aliases: ['correlation', 'pearson', 'spearman', 'spearman-correlation', 'kendall-correlation', 'kendall'],
    searchTerms: ['pearson', 'spearman', 'kendall', 'correlation', 'linear-relationship'],
    isDataTool: false,
  },
  'partial-correlation': {
    id: 'partial-correlation',
    pageId: 'partial-correlation',
    name: 'Partial Correlation',
    description: 'Correlation controlling for variables',
    category: 'correlation',
    koreanName: '편상관분석',
    koreanDescription: '제3변수 통제 후 상관관계',
    aliases: ['partial-corr'],
    searchTerms: ['partial', 'controlling'],
    isDataTool: false,
  },

  // ============================================
  // 5. Regression (7)
  // ============================================
  'simple-regression': {
    id: 'simple-regression',
    pageId: 'regression',
    name: 'Linear Regression',
    description: 'Simple/multiple linear regression',
    category: 'regression',
    koreanName: '선형 회귀',
    koreanDescription: '예측 변수로 결과 예측',
    aliases: ['regression', 'linear-regression', 'multiple-regression', 'ols'],
    searchTerms: ['regression', 'linear', 'ols', 'prediction'],
    isDataTool: false,
  },
  'logistic-regression': {
    id: 'logistic-regression',
    pageId: 'regression',
    name: 'Logistic Regression',
    description: 'Binary outcome regression',
    category: 'regression',
    koreanName: '로지스틱 회귀',
    koreanDescription: '이진 결과 예측',
    aliases: ['logistic', 'binomial-regression'],
    searchTerms: ['logistic', 'binary-outcome'],
    isDataTool: false,
  },
  'poisson-regression': {
    id: 'poisson-regression',
    pageId: 'poisson',
    name: 'Poisson Regression',
    description: 'Count data regression',
    category: 'regression',
    koreanName: '포아송 회귀',
    koreanDescription: '빈도/개수 데이터 예측',
    aliases: ['poisson'],
    searchTerms: ['poisson', 'count-data'],
    isDataTool: false,
  },
  'ordinal-regression': {
    id: 'ordinal-regression',
    pageId: 'ordinal-regression',
    name: 'Ordinal Regression',
    description: 'Ordered categorical outcome regression',
    category: 'regression',
    koreanName: '순서형 로지스틱 회귀',
    koreanDescription: '순서형 범주 예측',
    aliases: ['ordinal-logistic'],
    searchTerms: ['ordinal', 'ordered-categorical'],
    isDataTool: false,
  },
  'stepwise-regression': {
    id: 'stepwise-regression',
    pageId: 'stepwise',
    name: 'Stepwise Regression',
    description: 'Automatic variable selection regression',
    category: 'regression',
    koreanName: '단계적 회귀',
    koreanDescription: '자동 변수 선택 회귀',
    aliases: ['stepwise', 'forward-selection', 'backward-elimination'],
    searchTerms: ['stepwise', 'forward', 'backward', 'variable-selection'],
    isDataTool: false,
  },
  'dose-response': {
    id: 'dose-response',
    pageId: 'dose-response',
    name: 'Dose-Response Analysis',
    description: 'EC50/IC50 curve fitting',
    category: 'regression',
    koreanName: '용량-반응 분석',
    koreanDescription: 'EC50/IC50 곡선 피팅',
    aliases: ['dose-response-curve', 'ec50', 'ic50'],
    searchTerms: ['dose-response', 'ec50', 'ic50', 'curve-fitting'],
    isDataTool: false,
  },
  'response-surface': {
    id: 'response-surface',
    pageId: 'response-surface',
    name: 'Response Surface Methodology',
    description: 'Optimization experiments analysis',
    category: 'regression',
    koreanName: '반응표면 분석',
    koreanDescription: '최적화 실험 분석',
    aliases: ['rsm', 'response-surface-methodology'],
    searchTerms: ['rsm', 'response-surface', 'optimization'],
    isDataTool: false,
  },

  // ============================================
  // 6. Chi-Square (2) — chi-square overview removed
  // ============================================
  'chi-square-goodness': {
    id: 'chi-square-goodness',
    pageId: 'chi-square-goodness',
    name: 'Chi-Square Goodness of Fit',
    description: 'Distribution fit test',
    category: 'chi-square',
    koreanName: '카이제곱 적합도 검정',
    koreanDescription: '관찰 빈도와 기대 빈도 비교',
    aliases: ['goodness-of-fit', 'chi-square-gof', 'chi-square', 'chi-squared', 'chi2'],
    searchTerms: ['chi-square', 'goodness-of-fit', 'expected-frequency'],
    isDataTool: false,
  },
  'chi-square-independence': {
    id: 'chi-square-independence',
    pageId: 'chi-square-independence',
    name: 'Chi-Square Independence Test',
    description: 'Categorical variables independence test',
    category: 'chi-square',
    koreanName: '카이제곱 독립성 검정',
    koreanDescription: '두 범주형 변수의 독립성 검정',
    aliases: ['independence-test', 'contingency-table'],
    searchTerms: ['independence', 'contingency', 'categorical'],
    isDataTool: false,
  },

  // ============================================
  // 7. Descriptive — 4개: 1 분석 메서드 + 3 데이터 도구
  // ============================================
  'descriptive-stats': {
    id: 'descriptive-stats',
    pageId: 'descriptive',
    name: 'Descriptive Statistics',
    description: 'Summary statistics',
    category: 'descriptive',
    koreanName: '기술통계량',
    koreanDescription: '평균, 표준편차, 분위수 등 요약',
    aliases: ['descriptive', 'summary-statistics'],
    searchTerms: ['descriptive', 'summary', 'mean', 'median', 'std'],
    isDataTool: true,
  },
  'normality-test': {
    id: 'normality-test',
    pageId: 'normality-test',
    name: 'Normality Test',
    description: 'Shapiro-Wilk, Kolmogorov-Smirnov normality tests',
    category: 'descriptive',
    koreanName: '정규성 검정',
    koreanDescription: 'Shapiro-Wilk, K-S 검정',
    aliases: ['shapiro-wilk', 'normality'],
    searchTerms: ['normality', 'shapiro-wilk', 'gaussian'],
    isDataTool: false,
  },
  'explore-data': {
    id: 'explore-data',
    pageId: 'explore-data',
    name: 'Explore Data',
    description: 'Data exploration and visualization',
    category: 'descriptive',
    koreanName: '데이터 탐색',
    koreanDescription: '데이터 탐색 및 시각화',
    aliases: ['data-exploration', 'eda'],
    searchTerms: ['explore', 'eda', 'visualization'],
    isDataTool: true,
  },
  'means-plot': {
    id: 'means-plot',
    pageId: 'means-plot',
    name: 'Means Plot',
    description: 'Group means visualization with CI',
    category: 'descriptive',
    koreanName: '평균 도표',
    koreanDescription: '그룹별 평균과 신뢰구간 시각화',
    aliases: ['means-comparison-plot'],
    searchTerms: ['means-plot', 'group-means', 'confidence-interval'],
    isDataTool: true,
  },

  // ============================================
  // 8. Time Series (4)
  // ============================================
  'arima': {
    id: 'arima',
    pageId: 'arima',
    name: 'ARIMA',
    description: 'Autoregressive Integrated Moving Average',
    category: 'timeseries',
    koreanName: 'ARIMA',
    koreanDescription: '시계열 예측 모형',
    aliases: ['arima-model', 'time-series-arima'],
    searchTerms: ['arima', 'autoregressive', 'time-series'],
    isDataTool: false,
  },
  'seasonal-decompose': {
    id: 'seasonal-decompose',
    pageId: 'seasonal-decompose',
    name: 'Seasonal Decomposition',
    description: 'Time series decomposition',
    category: 'timeseries',
    koreanName: 'STL 분해',
    koreanDescription: '추세, 계절성, 잔차 분리',
    aliases: ['stl-decomposition', 'decomposition'],
    searchTerms: ['seasonal', 'stl', 'decomposition'],
    isDataTool: false,
  },
  'stationarity-test': {
    id: 'stationarity-test',
    pageId: 'stationarity-test',
    name: 'Stationarity Test',
    description: 'ADF, KPSS stationarity tests',
    category: 'timeseries',
    koreanName: 'ADF 정상성 검정',
    koreanDescription: 'Augmented Dickey-Fuller 검정',
    aliases: ['adf-test', 'kpss-test'],
    searchTerms: ['stationarity', 'adf', 'kpss', 'unit-root'],
    isDataTool: false,
  },
  'mann-kendall-test': {
    id: 'mann-kendall-test',
    pageId: 'mann-kendall',
    name: 'Mann-Kendall Trend Test',
    description: 'Time series trend detection',
    category: 'timeseries',
    koreanName: 'Mann-Kendall 추세 검정',
    koreanDescription: '시계열 추세 탐지',
    aliases: ['mann-kendall', 'mk-test', 'trend-test'],
    searchTerms: ['mann-kendall', 'trend', 'monotonic'],
    isDataTool: false,
  },

  // ============================================
  // 9. Survival (3)
  // ============================================
  'kaplan-meier': {
    id: 'kaplan-meier',
    pageId: 'kaplan-meier',
    name: 'Kaplan-Meier Survival Analysis',
    description: 'Survival curve estimation',
    category: 'survival',
    koreanName: 'Kaplan-Meier 추정',
    koreanDescription: '생존 곡선 추정',
    aliases: ['km-curve', 'survival-curve', 'log-rank'],
    searchTerms: ['kaplan-meier', 'survival', 'log-rank'],
    isDataTool: false,
  },
  'cox-regression': {
    id: 'cox-regression',
    pageId: 'cox-regression',
    name: 'Cox Proportional Hazards',
    description: 'Survival regression with covariates',
    category: 'survival',
    koreanName: 'Cox 비례위험 회귀',
    koreanDescription: '생존에 영향을 미치는 요인 분석',
    aliases: ['cox-ph', 'proportional-hazards'],
    searchTerms: ['cox', 'hazards', 'survival-regression'],
    isDataTool: false,
  },
  'roc-curve': {
    id: 'roc-curve',
    pageId: 'roc-curve',
    name: 'ROC Curve Analysis',
    description: 'Diagnostic accuracy evaluation (AUC, sensitivity/specificity)',
    category: 'survival',
    koreanName: 'ROC 곡선 분석',
    koreanDescription: '진단 정확도 평가 (AUC, 민감도/특이도)',
    aliases: ['receiver-operating-characteristic', 'auc'],
    searchTerms: ['roc', 'auc', 'sensitivity', 'specificity'],
    isDataTool: false,
  },

  // ============================================
  // 10. Multivariate (4)
  // ============================================
  'pca': {
    id: 'pca',
    pageId: 'pca',
    name: 'Principal Component Analysis',
    description: 'Dimensionality reduction',
    category: 'multivariate',
    koreanName: '주성분 분석 (PCA)',
    koreanDescription: '차원 축소',
    aliases: ['principal-components'],
    searchTerms: ['pca', 'principal-component', 'dimensionality'],
    isDataTool: false,
  },
  'factor-analysis': {
    id: 'factor-analysis',
    pageId: 'factor-analysis',
    name: 'Factor Analysis',
    description: 'Latent factor extraction',
    category: 'multivariate',
    koreanName: '요인 분석',
    koreanDescription: '잠재 요인 추출',
    aliases: ['efa', 'exploratory-factor-analysis'],
    searchTerms: ['factor', 'latent', 'efa'],
    isDataTool: false,
  },
  'cluster': {
    id: 'cluster',
    pageId: 'cluster',
    name: 'Cluster Analysis',
    description: 'K-means, hierarchical clustering',
    category: 'multivariate',
    koreanName: '군집 분석',
    koreanDescription: 'K-means, 계층적 군집화',
    aliases: ['cluster-analysis', 'k-means', 'hierarchical-clustering'],
    searchTerms: ['cluster', 'k-means', 'hierarchical'],
    isDataTool: false,
  },
  'discriminant-analysis': {
    id: 'discriminant-analysis',
    pageId: 'discriminant',
    name: 'Discriminant Analysis',
    description: 'Group classification',
    category: 'multivariate',
    koreanName: '판별 분석',
    koreanDescription: '그룹 분류',
    aliases: ['discriminant', 'lda', 'linear-discriminant'],
    searchTerms: ['discriminant', 'lda', 'classification'],
    isDataTool: false,
  },

  // ============================================
  // 11. Other (3)
  // ============================================
  'power-analysis': {
    id: 'power-analysis',
    pageId: 'power-analysis',
    name: 'Power Analysis',
    description: 'Sample size and power calculation',
    category: 'design',
    koreanName: '검정력 분석',
    koreanDescription: '표본 크기 및 검정력 계산',
    aliases: ['sample-size', 'statistical-power'],
    searchTerms: ['power', 'sample-size', 'effect-size'],
    isDataTool: true,
  },
  'reliability-analysis': {
    id: 'reliability-analysis',
    pageId: 'reliability',
    name: 'Reliability Analysis',
    description: "Cronbach's alpha, internal consistency",
    category: 'psychometrics',
    koreanName: '신뢰도 분석',
    koreanDescription: 'Cronbach 알파, 내적 일관성',
    aliases: ['reliability', 'cronbach-alpha'],
    searchTerms: ['reliability', 'cronbach', 'internal-consistency'],
    isDataTool: false,
  },
  'one-sample-proportion': {
    id: 'one-sample-proportion',
    pageId: 'proportion-test',
    name: 'Proportion Test',
    description: 'One/two sample proportion test',
    category: 'nonparametric',
    koreanName: '비율 검정',
    koreanDescription: '단일/두 표본 비율 비교',
    aliases: ['proportion-test', 'z-test-proportion'],
    searchTerms: ['proportion', 'z-test', 'binomial-proportion'],
    isDataTool: false,
  },
}

// ============================================
// Proxy Wrapper + Alias Index
// ============================================

const _aliasIndex = new Map<string, string>()
for (const m of Object.values(_METHODS)) {
  for (const alias of m.aliases) {
    if (!(alias in _METHODS)) {
      _aliasIndex.set(alias, m.id)
    }
  }
}

/**
 * Register additional aliases at runtime (for dynamically registered methods).
 * Called by method-registry.ts registerMethod() to keep alias index in sync.
 */
export function registerAliases(canonicalId: string, aliases: string[]): void {
  for (const alias of aliases) {
    if (alias !== canonicalId && !_METHODS[alias]) {
      _aliasIndex.set(alias, canonicalId)
    }
  }
}

/**
 * STATISTICAL_METHODS — backward-compatible registry.
 *
 * Bracket access with legacy SM IDs (e.g., `STATISTICAL_METHODS['t-test']`)
 * returns the canonical entry (`two-sample-t`) via Proxy.
 *
 * Object.keys / Object.values / Object.entries return canonical keys only.
 */
export const STATISTICAL_METHODS: Record<string, StatisticalMethodEntry> = new Proxy(
  _METHODS,
  {
    get(target: Record<string, StatisticalMethodEntry>, key: string | symbol, receiver: unknown): unknown {
      if (typeof key === 'symbol') {
        return Reflect.get(target, key, receiver)
      }
      return getMethodByAlias(key) ?? undefined
    },
  },
)

// ============================================
// Helper Functions
// ============================================

/**
 * Get method by canonical ID
 */
export function getMethod(id: string): StatisticalMethodEntry | null {
  return _METHODS[id] ?? null
}

/**
 * Get method by any ID (canonical, alias, or legacy SM ID)
 */
export function getMethodByAlias(alias: string): StatisticalMethodEntry | null {
  const direct = _METHODS[alias]
  if (direct) return direct
  const canonical = _aliasIndex.get(alias)
  return canonical ? _METHODS[canonical] : null
}

/**
 * Get all methods that share a page route
 */
export function getMethodsByPage(pageId: string): StatisticalMethodEntry[] {
  return Object.values(_METHODS).filter((m) => m.pageId === pageId)
}

/**
 * Check if a pageId hosts multiple methods or a method with different canonical ID
 */
export function isIntegratedPage(pageId: string): boolean {
  const methods = getMethodsByPage(pageId)
  return methods.length > 1 || (methods.length === 1 && methods[0].id !== pageId)
}

/**
 * Check if a method has its own dedicated page (id === pageId)
 */
export function methodHasOwnPage(method: StatisticalMethodEntry): boolean {
  return method.id === method.pageId
}

/**
 * Get method by ID or alias (backward-compat wrapper)
 * @deprecated Use getMethodByAlias() or getMethod() instead. Will be removed in Phase 4.
 * @param idOrAlias - Method ID or alias
 * @returns StatisticalMethodEntry or null
 */
export function getMethodByIdOrAlias(
  idOrAlias: string,
): StatisticalMethodEntry | null {
  return getMethodByAlias(idOrAlias)
}

/**
 * Get methods by category
 * @param category - Category name
 * @returns Array of methods
 */
export function getMethodsByCategory(
  category: string,
): StatisticalMethodEntry[] {
  return Object.values(_METHODS).filter((m) => m.category === category)
}

/**
 * Get all methods
 * @returns Array of all methods
 */
export function getAllMethods(): StatisticalMethodEntry[] {
  return Object.values(_METHODS)
}

/**
 * Get all method IDs (canonical)
 * @returns Array of canonical method IDs
 */
export function getAllMethodIds(): string[] {
  return Object.keys(_METHODS)
}

/**
 * Get page route for a method
 * @param idOrAlias - Method ID or alias
 * @returns Route path (e.g., '/statistics/t-test')
 */
export function getMethodRoute(idOrAlias: string): string | null {
  const method = getMethodByAlias(idOrAlias)
  if (!method) return null
  return `/statistics/${method.pageId}`
}

/**
 * Validate method ID exists (canonical or alias)
 * @param id - Method ID to validate
 * @returns boolean
 */
export function isValidMethodId(id: string): boolean {
  return getMethodByAlias(id) !== null
}

/**
 * Get Korean name for a method
 * @param id - Method ID or alias
 * @returns Korean name or English name as fallback
 */
export function getKoreanName(id: string): string {
  if (id === 'welch-anova') return 'Welch ANOVA'
  const method = getMethodByAlias(id)
  return method?.koreanName ?? method?.name ?? id
}

/**
 * Get Korean description for a method
 * @param id - Method ID or alias
 * @returns Korean description or English description as fallback
 */
export function getKoreanDescription(id: string): string {
  if (id === 'welch-anova') return '등분산 가정 위반에 강건한 일원분산분석'
  const method = getMethodByAlias(id)
  return method?.koreanDescription ?? method?.description ?? ''
}

// ============================================
// Category Definitions (derived from registry)
// ============================================

const CATEGORY_LABELS: Record<string, { name: string; description: string; koreanName?: string; koreanDescription?: string }> = {
  't-test': {
    name: 'T-Test',
    description: 'Mean comparison tests',
    koreanName: '독립표본 t-검정',
    koreanDescription: '두 독립 그룹의 평균 차이 검정',
  },
  anova: {
    name: 'ANOVA',
    description: 'Analysis of Variance',
  },
  nonparametric: {
    name: 'Nonparametric',
    description: 'Distribution-free tests',
  },
  correlation: {
    name: 'Correlation',
    description: 'Correlation analysis',
  },
  regression: {
    name: 'Regression',
    description: 'Regression analysis',
  },
  'chi-square': {
    name: 'Chi-Square',
    description: 'Chi-square tests',
  },
  descriptive: {
    name: 'Descriptive',
    description: 'Descriptive statistics',
  },
  timeseries: {
    name: 'Time Series',
    description: 'Time series analysis',
  },
  survival: {
    name: 'Survival',
    description: 'Survival analysis',
  },
  multivariate: {
    name: 'Multivariate',
    description: 'Multivariate analysis',
  },
  design: {
    name: 'Design',
    description: 'Experimental design tools',
  },
  psychometrics: {
    name: 'Psychometrics',
    description: 'Psychometric analysis',
  },
}

export const METHOD_CATEGORIES: Record<string, { name: string; description: string; koreanName?: string; koreanDescription?: string; methods: string[] }> =
  Object.entries(
    Object.values(_METHODS).reduce<Record<string, string[]>>((acc, m) => {
      if (!acc[m.category]) acc[m.category] = []
      acc[m.category].push(m.id)
      return acc
    }, {}),
  ).reduce<Record<string, { name: string; description: string; koreanName?: string; koreanDescription?: string; methods: string[] }>>(
    (acc, [cat, methods]) => {
      const labels = CATEGORY_LABELS[cat] ?? { name: cat, description: '' }
      acc[cat] = { ...labels, methods }
      return acc
    },
    {},
  )

export type MethodCategoryKey = keyof typeof METHOD_CATEGORIES
