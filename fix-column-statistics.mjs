import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

// ColumnStatistics 객체에 numericCount와 textCount 추가
function fixColumnStatistics(content) {
  // Pattern 1: numeric 타입인 경우
  // { name: 'x', type: 'numeric', uniqueValues: 10, missingCount: 0, mean: 5, ... }
  // → { name: 'x', type: 'numeric', numericCount: 100, textCount: 0, uniqueValues: 10, missingCount: 0, mean: 5, ... }

  // Pattern 2: categorical 타입인 경우
  // { name: 'x', type: 'categorical', uniqueValues: 10, missingCount: 0, ... }
  // → { name: 'x', type: 'categorical', numericCount: 0, textCount: 100, uniqueValues: 10, missingCount: 0, ... }

  let modified = content;

  // Regex: type: 'numeric' 다음에 numericCount가 없으면 추가
  modified = modified.replace(
    /type:\s*['"]numeric['"]\s*,\s*(?!numericCount)/g,
    "type: 'numeric',\n      numericCount: 100,\n      textCount: 0,\n      "
  );

  // Regex: type: 'categorical' 다음에 numericCount가 없으면 추가
  modified = modified.replace(
    /type:\s*['"]categorical['"]\s*,\s*(?!numericCount)/g,
    "type: 'categorical',\n      numericCount: 0,\n      textCount: 100,\n      "
  );

  return modified;
}

// 모든 __tests__ 디렉토리의 .test.tsx 파일 찾기
function findTestFiles(dir, fileList = []) {
  const files = readdirSync(dir);

  files.forEach(file => {
    const filePath = join(dir, file);
    const stat = statSync(filePath);

    if (stat.isDirectory()) {
      findTestFiles(filePath, fileList);
    } else if (file.endsWith('.test.tsx') || file.endsWith('.test.ts')) {
      fileList.push(filePath);
    }
  });

  return fileList;
}

const testFiles = findTestFiles('statistical-platform/__tests__');

let fixedCount = 0;

testFiles.forEach(filePath => {
  const content = readFileSync(filePath, 'utf8');

  // ColumnStatistics 타입 사용 여부 확인
  if (content.includes('ColumnStatistics') ||
      (content.includes("type: 'numeric'") || content.includes('type: "numeric"')) ||
      (content.includes("type: 'categorical'") || content.includes('type: "categorical"'))) {

    const fixed = fixColumnStatistics(content);

    if (fixed !== content) {
      writeFileSync(filePath, fixed, 'utf8');
      console.log(`✅ Fixed: ${filePath}`);
      fixedCount++;
    }
  }
});

console.log(`\n✅ ColumnStatistics 타입 에러 수정 완료: ${fixedCount}개 파일`);
