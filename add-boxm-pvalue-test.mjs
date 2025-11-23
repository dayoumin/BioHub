// Add Box's M pValue fallback test
import { readFileSync, writeFileSync } from 'fs';

const filePath = 'statistical-platform/__tests__/lib/interpretation/engine-advanced.test.ts';

// UTF-8로 읽기
let content = readFileSync(filePath, 'utf8');

// Line 136 직후 (마지막 가드 테스트 뒤)에 추가
const insertPoint = content.indexOf("    it('Issue 3: Box M warning should appear when accuracy is undefined'");

if (insertPoint === -1) {
  console.error('❌ 삽입 위치를 찾을 수 없습니다.');
  process.exit(1);
}

// 해당 테스트의 마지막 })를 찾기
let bracketCount = 0;
let currentPos = insertPoint;
let testEnd = -1;

while (currentPos < content.length) {
  if (content[currentPos] === '{') bracketCount++;
  if (content[currentPos] === '}') {
    bracketCount--;
    if (bracketCount === 0) {
      testEnd = currentPos + 1;
      break;
    }
  }
  currentPos++;
}

if (testEnd === -1) {
  console.error('❌ 테스트 끝을 찾을 수 없습니다.');
  process.exit(1);
}

// 다음 줄 찾기
const nextLine = content.indexOf('\n', testEnd);

const newTest = `

    it('Issue 3 (Minor): Box M pValue fallback (significant 없이 pValue < 0.05)', () => {
      const results: AnalysisResult = {
        method: 'Discriminant Analysis',
        statistic: 0,
        pValue: 0.05,
        interpretation: '',
        additional: {
          accuracy: 0.75, // high
          boxM: { pValue: 0.03 } // significant 없음, pValue만 제공
        }
      }

      const interpretation = getInterpretation(results)

      expect(interpretation).not.toBeNull()
      expect(interpretation?.statistical).toContain('Box\\'s M 검정이 유의하여')
      expect(interpretation?.statistical).toContain('공분산 행렬 동질성 가정이 위배')
    })`;

content = content.slice(0, nextLine) + newTest + content.slice(nextLine);

// UTF-8로 쓰기
writeFileSync(filePath, content, 'utf8');

console.log('✅ Box M pValue fallback 테스트 추가 완료');
console.log('📍 테스트 시나리오:');
console.log('  - boxM.significant 없음');
console.log('  - boxM.pValue = 0.03 (< 0.05)');
console.log('  - 예상 결과: Box M 경고 표시 (pValue fallback 동작)');
