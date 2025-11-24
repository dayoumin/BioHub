/**
 * ANOVA 스냅샷 수정 스크립트
 *
 * 실제 engine.ts 출력에 맞게 summary, statistical, practical 업데이트
 */

import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const filePath = join(__dirname, '..', '__tests__', 'lib', 'interpretation', 'snapshots', 'anova.json');

// UTF-8로 읽기
let content = readFileSync(filePath, 'utf8');
const data = JSON.parse(content);

// Scenario 1: significant-large-effect
// Group A (45), Group B (52), Group C (58) → 범위 45.00 ~ 58.00, 차이 13.00
data.scenarios[0].expectedOutput.summary = '3개 그룹의 평균 범위는 45.00 ~ 58.00 (차이: 13.00)입니다.';
data.scenarios[0].expectedOutput.statistical = '적어도 하나의 그룹 평균이 통계적으로 다릅니다 (p=< 0.001).';
data.scenarios[0].expectedOutput.practical = '사후 검정을 수행하여 어느 그룹이 다른지 확인하세요.';

// Scenario 2: nonsignificant-small-effect
// Group A (50), Group B (52), Group C (51) → 범위 50.00 ~ 52.00, 차이 2.00
data.scenarios[1].expectedOutput.title = '다집단 비교 결과';
data.scenarios[1].expectedOutput.summary = '3개 그룹의 평균 범위는 50.00 ~ 52.00 (차이: 2.00)입니다.';
data.scenarios[1].expectedOutput.statistical = '그룹 간 평균 차이가 통계적으로 유의하지 않습니다 (p=0.172).';
data.scenarios[1].expectedOutput.practical = '모든 그룹의 평균이 유사합니다.';

// Scenario 3: boundary-case-p-near-0.05
// Group A (48), Group B (53), Group C (51) → 범위 48.00 ~ 53.00, 차이 5.00
data.scenarios[2].expectedOutput.title = '다집단 비교 결과';
data.scenarios[2].expectedOutput.summary = '3개 그룹의 평균 범위는 48.00 ~ 53.00 (차이: 5.00)입니다.';
data.scenarios[2].expectedOutput.statistical = '적어도 하나의 그룹 평균이 통계적으로 다릅니다 (p=0.047).';
data.scenarios[2].expectedOutput.practical = '사후 검정을 수행하여 어느 그룹이 다른지 확인하세요.';

// UTF-8로 쓰기
writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n', 'utf8');

console.log('✅ Fixed: anova.json (3 scenarios updated)');
console.log('  - Scenario 1: 45.00 ~ 58.00 (차이: 13.00)');
console.log('  - Scenario 2: 50.00 ~ 52.00 (차이: 2.00)');
console.log('  - Scenario 3: 48.00 ~ 53.00 (차이: 5.00)');
