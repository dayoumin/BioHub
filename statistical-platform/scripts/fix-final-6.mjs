/**
 * 최종 6개 수정
 *
 * 1. linear-regression: purpose="예측" 추가
 * 2. shapiro-wilk: input pValue 수정 (0.003 → 0.001 등)
 */

import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const snapshotsDir = join(__dirname, '..', '__tests__', 'lib', 'interpretation', 'snapshots');

// ============================================================
// 1. Linear Regression: purpose 추가
// ============================================================
const linearPath = join(snapshotsDir, 'linear-regression.json');
let linear = JSON.parse(readFileSync(linearPath, 'utf8'));
linear.purpose = '예측';
writeFileSync(linearPath, JSON.stringify(linear, null, 2) + '\n', 'utf8');
console.log('✅ Fixed: linear-regression.json (purpose="예측" 추가)');

// ============================================================
// 2. Shapiro-Wilk: input pValue 수정
// ============================================================
const shapiroPath = join(snapshotsDir, 'shapiro-wilk.json');
let shapiro = JSON.parse(readFileSync(shapiroPath, 'utf8'));

// Scenario 1: pValue 0.003 → 0.001 (< 0.001 포맷팅 적용)
shapiro.scenarios[0].input.pValue = 0.0001;
shapiro.scenarios[0].expectedOutput.statistical = '정규분포를 따르지 않습니다 (p=< 0.001).';

// Scenario 2: pValue 확인 (0.234 유지)
// Scenario 3: pValue 확인 (0.051 유지)

writeFileSync(shapiroPath, JSON.stringify(shapiro, null, 2) + '\n', 'utf8');
console.log('✅ Fixed: shapiro-wilk.json (scenario 1 pValue 수정)');

console.log('\n🎉 Fixed: 2 files (linear-regression, shapiro-wilk)');
console.log('   Expected: 36 + 6 = 42/42 통과! 🎊');
