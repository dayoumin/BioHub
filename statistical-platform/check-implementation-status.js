// METHOD_METADATA의 60개 메서드
const metadata = {
  descriptive: ['mean', 'median', 'mode', 'descriptive', 'normality', 'outliers', 'frequency', 'crosstab', 'proportionTest', 'reliability'],
  hypothesis: ['tTest', 'pairedTTest', 'oneSampleTTest', 'zTest', 'chiSquare', 'binomialTest', 'correlation', 'partialCorrelation'],
  regression: ['linearRegression', 'multipleRegression', 'logisticRegression', 'curveEstimation', 'nonlinearRegression', 'stepwiseRegression', 'binaryLogistic', 'multinomialLogistic', 'ordinalLogistic', 'probitRegression', 'poissonRegression', 'negativeBinomial'],
  nonparametric: ['mannWhitney', 'wilcoxon', 'kruskalWallis', 'friedman', 'signTest', 'runsTest', 'mcNemar', 'cochranQ', 'moodMedian'],
  anova: ['oneWayAnova', 'twoWayAnova', 'repeatedMeasures', 'ancova', 'manova', 'tukeyHSD', 'scheffeTest', 'bonferroni', 'gamesHowell'],
  advanced: ['pca', 'factorAnalysis', 'clusterAnalysis', 'discriminantAnalysis', 'canonicalCorrelation', 'survivalAnalysis', 'timeSeries', 'metaAnalysis', 'sem', 'multilevelModel', 'mediation', 'moderation']
}

// Pyodide Service 구현 (42개)
const pyodide = ['anova', 'bartlettTest', 'calculateCorrelation', 'calculateDescriptiveStatistics', 'checkAllAssumptions', 'chiSquare', 'chiSquareTest', 'clusterAnalysis', 'correlation', 'cronbachAlpha', 'descriptiveStats', 'detectOutliersIQR', 'dunnTest', 'factorAnalysis', 'friedman', 'gamesHowellTest', 'initialize', 'kolmogorovSmirnovTest', 'kruskalWallis', 'leveneTest', 'logisticRegression', 'mannWhitneyU', 'multipleRegression', 'oneSampleTTest', 'oneWayANOVA', 'pairedTTest', 'pca', 'performBonferroni', 'performPCA', 'performTukeyHSD', 'regression', 'shapiroWilkTest', 'simpleLinearRegression', 'testHomogeneity', 'testIndependence', 'testNormality', 'timeSeriesAnalysis', 'tTest', 'tukeyHSD', 'twoSampleTTest', 'twoWayANOVA', 'wilcoxon']

// 매핑 규칙 (METHOD_METADATA → Pyodide Service)
const mapping = {
  mean: 'descriptiveStats',
  median: 'descriptiveStats',
  mode: 'descriptiveStats',
  descriptive: 'descriptiveStats',
  normality: 'shapiroWilkTest',
  outliers: 'detectOutliersIQR',
  reliability: 'cronbachAlpha',
  tTest: 'twoSampleTTest',
  linearRegression: 'simpleLinearRegression',
  oneWayAnova: 'oneWayANOVA',
  twoWayAnova: 'twoWayANOVA',
  mannWhitney: 'mannWhitneyU',
  bonferroni: 'performBonferroni',
  gamesHowell: 'gamesHowellTest',
  timeSeries: 'timeSeriesAnalysis'
}

console.log('=== 구현 상태 분석 ===\n')

let implemented = 0
let notImplemented = []

Object.entries(metadata).forEach(([group, methods]) => {
  console.log('[' + group.toUpperCase() + ']')
  methods.forEach(method => {
    const mapped = mapping[method] || method
    const exists = pyodide.some(p =>
      p.toLowerCase() === mapped.toLowerCase()
    )

    if (exists) {
      console.log('  ✅ ' + method + ' → ' + mapped)
      implemented++
    } else {
      console.log('  ❌ ' + method + ' (미구현)')
      notImplemented.push({ group, method })
    }
  })
  console.log()
})

console.log('\n=== 요약 ===')
console.log('구현됨: ' + implemented + '개')
console.log('미구현: ' + notImplemented.length + '개\n')

console.log('=== 미구현 목록 (' + notImplemented.length + '개) ===')
const byGroup = {}
notImplemented.forEach(({ group, method }) => {
  if (!byGroup[group]) byGroup[group] = []
  byGroup[group].push(method)
})

Object.entries(byGroup).forEach(([group, methods]) => {
  console.log('\n[' + group + '] ' + methods.length + '개')
  methods.forEach(m => console.log('  - ' + m))
})
