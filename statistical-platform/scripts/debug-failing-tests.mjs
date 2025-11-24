/**
 * 실패하는 테스트들의 실제 출력 확인
 */

import { getInterpretation } from '../lib/interpretation/engine.js';

console.log('=== Kruskal-Wallis Test (significant) ===');
const kruskal1 = getInterpretation({
  method: 'Kruskal-Wallis Test',
  statistic: 10.5,
  pValue: 0.003
});
console.log(JSON.stringify(kruskal1, null, 2));

console.log('\n=== Linear Regression (significant) ===');
const linear1 = getInterpretation({
  method: 'Linear Regression',
  statistic: 10.5,
  pValue: 0.001,
  additional: { rSquared: 0.75 }
});
console.log(JSON.stringify(linear1, null, 2));

console.log('\n=== Logistic Regression (significant) ===');
const logistic1 = getInterpretation({
  method: 'Logistic Regression',
  statistic: 8.5,
  pValue: 0.002,
  additional: { pseudoRSquared: 0.42 }
});
console.log(JSON.stringify(logistic1, null, 2));

console.log('\n=== Chi-Square Test (significant) ===');
const chiSquare1 = getInterpretation({
  method: 'Chi-Square Test',
  statistic: 25.3,
  pValue: 0.0001,
  df: 4,
  effectSize: { value: 0.35, type: "Cramer's V" }
});
console.log(JSON.stringify(chiSquare1, null, 2));

console.log('\n=== Friedman Test (significant) ===');
const friedman1 = getInterpretation({
  method: 'Friedman Test',
  statistic: 12.8,
  pValue: 0.002
});
console.log(JSON.stringify(friedman1, null, 2));

console.log('\n=== ANOVA Scenario 2 (nonsignificant) ===');
const anova2 = getInterpretation({
  method: 'One-way ANOVA',
  statistic: 1.8,
  pValue: 0.172,
  df: [2, 87],
  effectSize: { value: 0.02, type: 'Eta-squared' },
  groupStats: [
    { name: 'Group A', mean: 50, std: 10, n: 30 },
    { name: 'Group B', mean: 52, std: 11, n: 30 },
    { name: 'Group C', mean: 51, std: 9, n: 30 }
  ]
});
console.log(JSON.stringify(anova2, null, 2));
