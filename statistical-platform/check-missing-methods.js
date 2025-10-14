const fs = require('fs');

// 우선순위 1-2 메서드 (24개)
const priority12 = [
  'frequency', 'crosstab', 'oneSampleProportionTest', 'zTest', 'binomialTest',
  'partialCorrelation', 'signTest', 'runsTest', 'mcNemarTest', 'cochranQTest',
  'moodMedianTest', 'curveEstimation', 'nonlinearRegression', 'stepwiseRegression',
  'binaryLogistic', 'multinomialLogistic', 'ordinalLogistic', 'probitRegression',
  'poissonRegression', 'negativeBinomial', 'repeatedMeasuresAnova', 'ancova',
  'manova', 'scheffeTest'
];

// 메타데이터에 등록된 메서드
const metadata = fs.readFileSync('d:/Projects/Statics/statistical-platform/lib/statistics/registry/method-metadata.ts', 'utf8');
const registered = [];
const lines = metadata.split('\n');
for (const line of lines) {
  const match = line.match(/^\s+(\w+):\s+\{/);
  if (match) registered.push(match[1]);
}

console.log('=== 메타데이터 등록 현황 ===');
console.log('총 등록:', registered.length + '개\n');

console.log('=== 우선순위 1-2 메서드 매칭 ===');
const notInMeta = [];
const inMeta = [];

priority12.forEach(method => {
  // 카멜케이스 변형 확인
  const variants = [
    method,
    method.replace(/Test$/, ''),
    method.replace(/Anova$/, ''),
    method.charAt(0).toLowerCase() + method.slice(1)
  ];
  
  const found = variants.some(v => registered.includes(v));
  
  if (found) {
    const matched = variants.find(v => registered.includes(v));
    console.log('✅', method, '→', matched);
    inMeta.push(method);
  } else {
    console.log('❌', method, '← 메타데이터에 없음');
    notInMeta.push(method);
  }
});

console.log('\n=== 요약 ===');
console.log('이미 등록:', inMeta.length + '개');
console.log('누락:', notInMeta.length + '개');
console.log('\n누락된 메서드:', notInMeta.join(', '));
