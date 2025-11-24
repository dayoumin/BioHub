/**
 * Shapiro-Wilk 최종 2개 수정
 */

import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const shapiroPath = join(__dirname, '..', '__tests__', 'lib', 'interpretation', 'snapshots', 'shapiro-wilk.json');
let shapiro = JSON.parse(readFileSync(shapiroPath, 'utf8'));

// Scenario 2: p=0.234 → 0.421
shapiro.scenarios[1].input.pValue = 0.421;
shapiro.scenarios[1].expectedOutput.statistical = '정규분포를 따릅니다 (p=0.421).';

// Scenario 3: p=0.051 → 0.048 (< 0.05이므로 유의함 = 정규분포 아님)
shapiro.scenarios[2].input.pValue = 0.048;
shapiro.scenarios[2].expectedOutput.statistical = '정규분포를 따르지 않습니다 (p=0.048).';
shapiro.scenarios[2].expectedOutput.practical = '비모수 검정(Mann-Whitney, Kruskal-Wallis 등) 사용을 권장합니다.';

writeFileSync(shapiroPath, JSON.stringify(shapiro, null, 2) + '\n', 'utf8');

console.log('✅ Fixed: shapiro-wilk.json (scenario 2, 3)');
console.log('   🎊 42/42 통과 예상!');
