/**
 * DecisionTreeRecommender의 모든 return문에 addExpectedKeywords() 적용
 */

const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../lib/services/decision-tree-recommender.ts');
let content = fs.readFileSync(filePath, 'utf8');

// 패턴: "return {" 로 시작하고 "this.addExpectedKeywords({" 가 아닌 경우
// 단, "return this.addExpectedKeywords({" 는 이미 적용된 것이므로 제외

const lines = content.split('\n');
const result = [];
let i = 0;

while (i < lines.length) {
  const line = lines[i];
  const trimmed = line.trim();

  // "return {" 패턴 찾기 (단, "this.addExpectedKeywords" 포함하지 않음)
  if (trimmed === 'return {' && !line.includes('this.addExpectedKeywords')) {
    const indent = line.match(/^(\s*)/)[1];

    // "return {" 를 "return this.addExpectedKeywords({" 로 변경
    result.push(indent + 'return this.addExpectedKeywords({');
    i++;

    // 닫는 괄호 찾기
    let braceCount = 1;
    let returnBlock = [];

    while (i < lines.length && braceCount > 0) {
      const currentLine = lines[i];
      returnBlock.push(currentLine);

      // 중괄호 카운트
      const openBraces = (currentLine.match(/\{/g) || []).length;
      const closeBraces = (currentLine.match(/\}/g) || []).length;
      braceCount += openBraces - closeBraces;

      i++;
    }

    // 마지막 줄 ("}") 을 "}" 에서 "})" 로 변경
    if (returnBlock.length > 0) {
      const lastLine = returnBlock[returnBlock.length - 1];
      const lastTrimmed = lastLine.trim();

      if (lastTrimmed === '}') {
        const lastIndent = lastLine.match(/^(\s*)/)[1];
        returnBlock[returnBlock.length - 1] = lastIndent + '})';
      }
    }

    result.push(...returnBlock);
  } else {
    result.push(line);
    i++;
  }
}

const newContent = result.join('\n');
fs.writeFileSync(filePath, newContent, 'utf8');

console.log('✅ 모든 return문에 addExpectedKeywords() 적용 완료!');
