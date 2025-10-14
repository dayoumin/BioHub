const fs = require('fs');

// 1. 메타데이터에 등록된 메서드 (60개)
const metadata = fs.readFileSync('d:/Projects/Statics/statistical-platform/lib/statistics/registry/method-metadata.ts', 'utf8');
const registered = [];
const lines = metadata.split('\n');
for (const line of lines) {
  const match = line.match(/^\s+(\w+):\s+\{/);
  if (match) registered.push(match[1]);
}

// 2. 우선순위 1-2-3 메서드
const priority1 = [
  'frequency', 'crosstab', 'oneSampleProportionTest', 'zTest', 'binomialTest',
  'partialCorrelation', 'signTest', 'runsTest', 'mcNemarTest', 'cochranQTest',
  'moodMedianTest'
]; // 11개

const priority2 = [
  'curveEstimation', 'nonlinearRegression', 'stepwiseRegression',
  'binaryLogistic', 'multinomialLogistic', 'ordinalLogistic', 'probitRegression',
  'poissonRegression', 'negativeBinomial',
  'repeatedMeasuresAnova', 'ancova', 'manova', 'scheffeTest'
]; // 13개

// 우선순위 3은 없음 (8개 고급 분석은 아직 미구현)

console.log('=== 1. 메타데이터 등록 현황 ===');
console.log('총 등록:', registered.length + '개\n');

console.log('=== 2. 우선순위 1 (11개) ===');
priority1.forEach(method => {
  const variants = [
    method,
    method.replace(/Test$/, ''),
    method.replace(/Anova$/, ''),
    method.charAt(0).toLowerCase() + method.slice(1)
  ];
  
  const found = variants.find(v => registered.includes(v));
  if (found) {
    console.log(`✅ ${method} → ${found} (이미 등록)`);
  } else {
    console.log(`❌ ${method} (신규 추가 필요)`);
  }
});

console.log('\n=== 3. 우선순위 2 (13개) ===');
priority2.forEach(method => {
  const variants = [
    method,
    method.replace(/Anova$/, ''),
    method.replace(/Measures/, ''),
    method.charAt(0).toLowerCase() + method.slice(1)
  ];
  
  const found = variants.find(v => registered.includes(v));
  if (found) {
    console.log(`✅ ${method} → ${found} (이미 등록)`);
  } else {
    console.log(`❌ ${method} (신규 추가 필요)`);
  }
});

console.log('\n=== 4. 우선순위 3 (고급 분석) ===');
console.log('❌ 아직 구현되지 않음 (Phase 6 예정)');
console.log('   - 구조방정식(SEM), 다층모형(Multilevel), 매개효과(Mediation) 등');

console.log('\n=== 5. 최종 요약 ===');
const p1Existing = priority1.filter(m => {
  const variants = [m, m.replace(/Test$/, ''), m.charAt(0).toLowerCase() + m.slice(1)];
  return variants.some(v => registered.includes(v));
});

const p2Existing = priority2.filter(m => {
  const variants = [m, m.replace(/Anova$/, ''), m.replace(/Measures/, ''), m.charAt(0).toLowerCase() + m.slice(1)];
  return variants.some(v => registered.includes(v));
});

console.log('현재 등록:', registered.length + '개');
console.log('우선순위 1 중 기존:', p1Existing.length + '개 / 11개');
console.log('우선순위 2 중 기존:', p2Existing.length + '개 / 13개');
console.log('신규 추가 필요:', (24 - p1Existing.length - p2Existing.length) + '개');
console.log('\n최종 메서드 수:', registered.length + ' (우선순위 3 없음)');
