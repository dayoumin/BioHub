/**
 * 잔여 snake_case 혼합 형태 수정
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join, extname } from 'path';

const replacements = [
  ['pseudo_rSquared', 'pseudoRSquared'],
  ['marginal_rSquared', 'marginalRSquared'],
  ['conditional_rSquared', 'conditionalRSquared'],
];

const targetExtensions = ['.ts', '.tsx', '.json'];
const excludeDirs = ['node_modules', '.next', 'dist', '.git', 'coverage'];

function getAllFiles(dir, files = []) {
  const items = readdirSync(dir);
  for (const item of items) {
    const fullPath = join(dir, item);
    if (excludeDirs.some(ex => fullPath.includes(ex))) continue;
    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      getAllFiles(fullPath, files);
    } else if (targetExtensions.includes(extname(item))) {
      files.push(fullPath);
    }
  }
  return files;
}

function processFile(filePath) {
  let content = readFileSync(filePath, 'utf8');
  let originalContent = content;
  let changeCount = 0;

  for (const [from, to] of replacements) {
    const regex = new RegExp(from, 'g');
    const matches = content.match(regex);
    if (matches) {
      changeCount += matches.length;
      content = content.replace(regex, to);
    }
  }

  if (content !== originalContent) {
    writeFileSync(filePath, content, 'utf8');
    return { filePath, changeCount };
  }
  return null;
}

console.log('🔄 잔여 혼합 형태 수정 중...\n');

const baseDir = process.cwd();
const files = getAllFiles(baseDir);
const results = [];

for (const file of files) {
  const result = processFile(file);
  if (result) {
    results.push(result);
    console.log(`✅ ${result.filePath.replace(baseDir, '.')} (${result.changeCount}개 변환)`);
  }
}

console.log(`\n📊 총 ${results.length}개 파일 수정`);
