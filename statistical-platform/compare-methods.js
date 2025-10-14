const fs = require('fs');

// 1. pyodide-statistics.ts 구현된 메서드 (42개)
const pyodideImplemented = [
  'anova', 'bartlettTest', 'calculateCorrelation', 'calculateDescriptiveStatistics',
  'checkAllAssumptions', 'chiSquare', 'chiSquareTest', 'clusterAnalysis',
  'correlation', 'cronbachAlpha', 'descriptiveStats', 'detectOutliersIQR',
  'dunnTest', 'factorAnalysis', 'friedman', 'gamesHowellTest',
  'kolmogorovSmirnovTest', 'kruskalWallis', 'leveneTest', 'logisticRegression',
  'mannWhitneyU', 'multipleRegression', 'oneSampleTTest', 'oneWayANOVA',
  'pairedTTest', 'pca', 'performBonferroni', 'performPCA', 'performTukeyHSD',
  'regression', 'shapiroWilkTest', 'simpleLinearRegression', 'testHomogeneity',
  'testIndependence', 'testNormality', 'timeSeriesAnalysis', 'tTest',
  'tukeyHSD', 'twoSampleTTest', 'twoWayANOVA', 'wilcoxon'
];

// 2. 메타데이터 등록된 메서드 (60개)
const metadata = fs.readFileSync('d:/Projects/Statics/statistical-platform/lib/statistics/registry/method-metadata.ts', 'utf8');
const registered = [];
const lines = metadata.split('\n');
for (const line of lines) {
  const match = line.match(/^\s+(\w+):\s+\{/);
  if (match) registered.push(match[1]);
}

// 3. 우선순위 1-2 작성한 Python 코드 (24개)
const priority12 = {
  // Priority 1 (11개)
  'frequency': 'frequency',
  'crosstab': 'crosstab', 
  'oneSampleProportionTest': 'proportionTest',
  'zTest': 'zTest',
  'binomialTest': 'binomialTest',
  'partialCorrelation': 'partialCorrelation',
  'signTest': 'signTest',
  'runsTest': 'runsTest',
  'mcNemarTest': 'mcNemar',
  'cochranQTest': 'cochranQ',
  'moodMedianTest': 'moodMedian',
  
  // Priority 2 (13개)
  'curveEstimation': 'curveEstimation',
  'nonlinearRegression': 'nonlinearRegression',
  'stepwiseRegression': 'stepwiseRegression',
  'binaryLogistic': 'binaryLogistic',
  'multinomialLogistic': 'multinomialLogistic',
  'ordinalLogistic': 'ordinalLogistic',
  'probitRegression': 'probitRegression',
  'poissonRegression': 'poissonRegression',
  'negativeBinomial': 'negativeBinomial',
  'repeatedMeasuresAnova': 'repeatedMeasures',
  'ancova': 'ancova',
  'manova': 'manova',
  'scheffeTest': 'scheffeTest'
};

console.log('=== 1. 기존 구현 vs 우선순위 1-2 비교 ===\n');

const needImplement = [];
const alreadyImplemented = [];
const inMetadata = [];

Object.entries(priority12).forEach(([pythonName, metadataName]) => {
  const existsInPyodide = pyodideImplemented.includes(pythonName) || 
                          pyodideImplemented.includes(metadataName);
  const existsInMetadata = registered.includes(metadataName);
  
  if (existsInPyodide) {
    console.log(`✅ ${pythonName} → pyodide-statistics.ts에 이미 구현됨`);
    alreadyImplemented.push(pythonName);
  } else if (existsInMetadata) {
    console.log(`⚠️  ${pythonName} → 메타데이터만 있음 (${metadataName})`);
    inMetadata.push({python: pythonName, metadata: metadataName});
    needImplement.push(pythonName);
  } else {
    console.log(`❌ ${pythonName} → 메타데이터도 없음`);
    needImplement.push(pythonName);
  }
});

console.log('\n=== 2. 통계 ===');
console.log('pyodide-statistics.ts 구현:', pyodideImplemented.length + '개');
console.log('method-metadata.ts 등록:', registered.length + '개');
console.log('우선순위 1-2 중 이미 구현:', alreadyImplemented.length + '개');
console.log('우선순위 1-2 중 구현 필요:', needImplement.length + '개');

console.log('\n=== 3. 구현해야 할 메서드 (Python 코드 있음) ===');
needImplement.forEach((method, i) => {
  console.log(`${i+1}. ${method}`);
});

console.log('\n=== 4. 최종 메서드 수 ===');
console.log('현재 구현:', pyodideImplemented.length + '개');
console.log('추가 구현 필요:', needImplement.length + '개');
console.log('완료 후 총:', (pyodideImplemented.length + needImplement.length) + '개');
console.log('우선순위 3 (미작성):', (registered.length - pyodideImplemented.length - needImplement.length) + '개');
