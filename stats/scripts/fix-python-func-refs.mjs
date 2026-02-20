/**
 * TypeScript에서 Python 함수명 참조를 원래 snake_case로 복원
 * (Python 함수명은 snake_case를 유지해야 함)
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join, extname } from 'path';

// 잘못 변환된 Python 함수명 참조 복원
const restoreMap = [
  // 함수명 참조 (따옴표 포함)
  ["'chiSquare_test'", "'chi_square_test'"],
  ["'chiSquare_goodness_test'", "'chi_square_goodness_test'"],
  ["'chiSquare_independence_test'", "'chi_square_independence_test'"],
  ["'durbinWatson_test'", "'durbin_watson_test'"],
  ["'partialCorrelation'", "'partial_correlation'"],

  // 큰따옴표 버전
  ['"chiSquare_test"', '"chi_square_test"'],
  ['"chiSquare_goodness_test"', '"chi_square_goodness_test"'],
  ['"chiSquare_independence_test"', '"chi_square_independence_test"'],
  ['"durbinWatson_test"', '"durbin_watson_test"'],
  ['"partialCorrelation"', '"partial_correlation"'],

  // Worker 타입 리터럴
  ["| 'chiSquare_test'", "| 'chi_square_test'"],
  ["| 'chiSquare_goodness_test'", "| 'chi_square_goodness_test'"],
  ["| 'chiSquare_independence_test'", "| 'chi_square_independence_test'"],
  ["| 'durbinWatson_test'", "| 'durbin_watson_test'"],
  ["| 'partialCorrelation'", "| 'partial_correlation'"],

  // function: 'xxx' 패턴 (테스트 파일)
  ["function: 'chiSquare_test'", "function: 'chi_square_test'"],
  ["function: 'partialCorrelation'", "function: 'partial_correlation'"],

  // 주석 내 참조
  ['chiSquare_test', 'chi_square_test'],
  ['chiSquare_goodness_test', 'chi_square_goodness_test'],
  ['chiSquare_independence_test', 'chi_square_independence_test'],
  ['durbinWatson_test', 'durbin_watson_test'],
];

const targetExtensions = ['.ts', '.tsx', '.json'];
const excludeDirs = ['node_modules', '.next', 'dist', '.git', 'coverage', 'public', 'out'];

function escapeRegex(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function getAllFiles(dir, files = []) {
  const items = readdirSync(dir);
  for (const item of items) {
    const fullPath = join(dir, item);
    if (excludeDirs.some(ex => fullPath.includes(`\\${ex}\\`) || fullPath.endsWith(`\\${ex}`))) continue;
    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      getAllFiles(fullPath, files);
    } else if (targetExtensions.includes(extname(item))) {
      files.push(fullPath);
    }
  }
  return files;
}

console.log('🔄 Python 함수명 참조 복원 중...\n');

const baseDir = process.cwd();
const files = getAllFiles(baseDir);
let totalChanges = 0;

for (const filePath of files) {
  let content = readFileSync(filePath, 'utf8');
  let original = content;
  let changes = 0;

  for (const [from, to] of restoreMap) {
    const regex = new RegExp(escapeRegex(from), 'g');
    const matches = content.match(regex);
    if (matches) {
      changes += matches.length;
      content = content.replace(regex, to);
    }
  }

  if (content !== original) {
    writeFileSync(filePath, content, 'utf8');
    console.log(`✅ ${filePath.replace(baseDir, '.')} (${changes}개 복원)`);
    totalChanges += changes;
  }
}

console.log(`\n📊 총 ${totalChanges}개 Python 함수명 참조 복원`);
