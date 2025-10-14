const fs = require('fs');

// 1. pyodide-statistics.ts 구현된 메서드
const pyodide = `anova bartlettTest calculateCorrelation calculateDescriptiveStatistics checkAllAssumptions chiSquare chiSquareTest clusterAnalysis correlation cronbachAlpha descriptiveStats detectOutliersIQR dunnTest factorAnalysis friedman gamesHowellTest initialize kolmogorovSmirnovTest kruskalWallis leveneTest logisticRegression mannWhitneyU multipleRegression oneSampleTTest oneWayANOVA pairedTTest pca performBonferroni performPCA performTukeyHSD regression shapiroWilkTest simpleLinearRegression testHomogeneity testIndependence testNormality timeSeriesAnalysis tTest tukeyHSD twoSampleTTest twoWayANOVA wilcoxon`.split(' ');

// 2. 메타데이터 등록 (60개)
const metadata = fs.readFileSync('d:/Projects/Statics/statistical-platform/lib/statistics/registry/method-metadata.ts', 'utf8');
const registered = [];
const lines = metadata.split('\n');
for (const line of lines) {
  const match = line.match(/^\s+(\w+):\s+\{/);
  if (match) registered.push(match[1]);
}

// 3. 우선순위 1-2
const priority12 = [
  'frequency', 'crosstab', 'oneSampleProportionTest', 'zTest', 'binomialTest',
  'partialCorrelation', 'signTest', 'runsTest', 'mcNemarTest', 'cochranQTest',
  'moodMedianTest', 'curveEstimation', 'nonlinearRegression', 'stepwiseRegression',
  'binaryLogistic', 'multinomialLogistic', 'ordinalLogistic', 'probitRegression',
  'poissonRegression', 'negativeBinomial', 'repeatedMeasuresAnova', 'ancova',
  'manova', 'scheffeTest'
];

console.log('=== 1. pyodide-statistics.ts ===');
console.log('구현된 메서드:', pyodide.length + '개\n');

console.log('=== 2. method-metadata.ts ===');
console.log('등록된 메서드:', registered.length + '개\n');

console.log('=== 3. 우선순위 1-2 중 pyodide-statistics.ts 구현 여부 ===');
const implemented = [];
const notImplemented = [];

priority12.forEach(method => {
  const variants = [
    method,
    method.replace(/Test$/, ''),
    method.replace(/Anova$/, ''),
    method.replace(/Measures/, ''),
    method.charAt(0).toLowerCase() + method.slice(1)
  ];
  
  const found = variants.some(v => pyodide.includes(v));
  
  if (found) {
    const matched = variants.find(v => pyodide.includes(v));
    console.log(`✅ ${method} → ${matched} (이미 구현)`);
    implemented.push(method);
  } else {
    console.log(`❌ ${method} (미구현)`);
    notImplemented.push(method);
  }
});

console.log('\n=== 4. 최종 요약 ===');
console.log('pyodide-statistics.ts 구현:', pyodide.length + '개');
console.log('method-metadata.ts 등록:', registered.length + '개');
console.log('우선순위 1-2 중 구현됨:', implemented.length + '개 / 24개');
console.log('우선순위 1-2 중 미구현:', notImplemented.length + '개');
console.log('\n미구현 메서드:', notImplemented.join(', '));
