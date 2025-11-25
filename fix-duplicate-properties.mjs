import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

// 중복된 numericCount, textCount 제거
function removeDuplicateProperties(content) {
  // 정규식: 객체 내에서 numericCount, textCount가 중복되는 경우
  // 패턴: numericCount: 100,\n      textCount: 0,\n      uniqueValues: 3,\n      missingCount: 0,\n      numericCount: 3,\n      textCount: 0,

  // 먼저 전체 객체를 찾고, 그 안에서 중복을 제거
  let modified = content;

  // 중복 제거: 첫 번째 numericCount, textCount만 유지
  const lines = modified.split('\n');
  const result = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // numericCount나 textCount인 경우, 이미 추가되었는지 확인
    if (trimmed.startsWith('numericCount:') || trimmed.startsWith('textCount:')) {
      // 이전 몇 줄을 확인하여 같은 속성이 있는지 체크
      const lookBack = Math.min(20, i);
      let isDuplicate = false;

      for (let j = i - 1; j >= i - lookBack; j--) {
        if (j < 0) break;

        const prevLine = lines[j].trim();

        // 이전 객체의 시작점 (name: 'xxx',)을 만나면 중단
        if (prevLine.startsWith('name:')) {
          break;
        }

        // 같은 속성을 발견한 경우
        if (trimmed.startsWith('numericCount:') && prevLine.startsWith('numericCount:')) {
          isDuplicate = true;
          break;
        }
        if (trimmed.startsWith('textCount:') && prevLine.startsWith('textCount:')) {
          isDuplicate = true;
          break;
        }
      }

      if (!isDuplicate) {
        result.push(line);
      }
      // else: 중복이므로 추가하지 않음
    } else {
      result.push(line);
    }
  }

  return result.join('\n');
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

  // 중복 속성 체크
  const numericCountMatches = (content.match(/numericCount:/g) || []).length;
  const textCountMatches = (content.match(/textCount:/g) || []).length;

  // 중복이 있는 경우에만 처리
  if (numericCountMatches > 5 || textCountMatches > 5) {
    const fixed = removeDuplicateProperties(content);

    if (fixed !== content) {
      writeFileSync(filePath, fixed, 'utf8');
      console.log(`✅ Fixed: ${filePath}`);
      fixedCount++;
    }
  }
});

console.log(`\n✅ 중복 속성 제거 완료: ${fixedCount}개 파일`);
