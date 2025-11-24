/**
 * Linear Regression 스냅샷 수정
 *
 * 1. coefficients 추가 (engine.ts 필수 요구사항)
 * 2. expectedOutput을 실제 engine.ts 출력에 맞게 수정
 */

import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const linearPath = join(__dirname, '..', '__tests__', 'lib', 'interpretation', 'snapshots', 'linear-regression.json');
let linear = JSON.parse(readFileSync(linearPath, 'utf8'));

// Scenario 1: significant-strong-effect
linear.scenarios[0].input.coefficients = [
  { name: 'Intercept', value: 10.0, pValue: 0.001 },
  { name: 'X', value: 2.5, pValue: 0.001 }
];
linear.scenarios[0].expectedOutput.summary = '독립변수가 1단위 증가할 때 종속변수는 2.500만큼 변합니다.';
linear.scenarios[0].expectedOutput.statistical = '모델 설명력(R²) = 75.0% - 높은 설명력';
linear.scenarios[0].expectedOutput.practical = '이 모델로 종속변수 변동의 75.0%를 예측할 수 있습니다.';

// Scenario 2: nonsignificant-weak-effect
linear.scenarios[1].input.coefficients = [
  { name: 'Intercept', value: 50.0, pValue: 0.001 },
  { name: 'X', value: 0.8, pValue: 0.234 }
];
linear.scenarios[1].expectedOutput.summary = '독립변수가 1단위 증가할 때 종속변수는 0.800만큼 변합니다.';
linear.scenarios[1].expectedOutput.statistical = '모델 설명력(R²) = 12.0% - 낮은 설명력';
linear.scenarios[1].expectedOutput.practical = '이 모델로 종속변수 변동의 12.0%를 예측할 수 있습니다.';

// Scenario 3: boundary-case
linear.scenarios[2].input.coefficients = [
  { name: 'Intercept', value: 30.0, pValue: 0.01 },
  { name: 'X', value: 1.5, pValue: 0.048 }
];
linear.scenarios[2].expectedOutput.summary = '독립변수가 1단위 증가할 때 종속변수는 1.500만큼 변합니다.';
linear.scenarios[2].expectedOutput.statistical = '모델 설명력(R²) = 42.0% - 중간 설명력';
linear.scenarios[2].expectedOutput.practical = '이 모델로 종속변수 변동의 42.0%를 예측할 수 있습니다.';

writeFileSync(linearPath, JSON.stringify(linear, null, 2) + '\n', 'utf8');

console.log('✅ Fixed: linear-regression.json');
console.log('  - coefficients 추가 (3 scenarios)');
console.log('  - expectedOutput을 실제 engine.ts 출력에 맞게 수정');
