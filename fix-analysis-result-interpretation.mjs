import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

// AnalysisResult 객체에 interpretation 필드 추가
function addInterpretation(content) {
  let modified = content;

  // Pattern: { method: 'xxx', statistic: X, pValue: Y, ... } 형태에 interpretation 추가
  // pValue 다음에 interpretation이 없으면 추가

  // 간단한 패턴: pValue: 다음에 interpretation이 없는 경우
  // 먼저 pValue 뒤에 }, } 가 오는 경우 (마지막 속성)
  modified = modified.replace(
    /(\bpValue:\s*[\d.]+),?\s*(\})/g,
    (match, p1, p2) => {
      // interpretation이 이미 있는지 확인
      if (match.includes('interpretation')) {
        return match;
      }
      return `${p1},\n      interpretation: 'Test interpretation'${p2}`;
    }
  );

  // pValue 뒤에 다른 속성이 오는 경우 (중간 속성)
  modified = modified.replace(
    /(\bpValue:\s*[\d.]+),\s*(\b(?:df|effectSize|groupStats|coefficients|additional|postHoc))/g,
    (match, p1, p2) => {
      // interpretation이 이미 있는지 확인
      if (match.includes('interpretation')) {
        return match;
      }
      return `${p1},\n      interpretation: 'Test interpretation',\n      ${p2}`;
    }
  );

  return modified;
}

// 모든 __tests__ 디렉토리의 .test.ts 파일 찾기
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

const testFiles = findTestFiles('statistical-platform/__tests__/lib/interpretation');

let fixedCount = 0;

testFiles.forEach(filePath => {
  try {
    const content = readFileSync(filePath, 'utf8');

    // AnalysisResult 타입 사용 여부 확인
    if (content.includes('AnalysisResult') || content.includes('as AnalysisResult')) {
      const fixed = addInterpretation(content);

      if (fixed !== content) {
        writeFileSync(filePath, fixed, 'utf8');
        console.log(`✅ Fixed: ${filePath}`);
        fixedCount++;
      }
    }
  } catch (err) {
    console.log(`❌ Error: ${filePath} - ${err.message}`);
  }
});

console.log(`\n✅ AnalysisResult interpretation 필드 추가 완료: ${fixedCount}개 파일`);
