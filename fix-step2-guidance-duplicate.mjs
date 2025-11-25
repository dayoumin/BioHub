import { readFileSync, writeFileSync } from 'fs';

const filePath = 'statistical-platform/__tests__/components/smart-flow-step2-guidance.test.tsx';
let content = readFileSync(filePath, 'utf8');

// 중복 제거: 41-42행, 57-58행 삭제
content = content.replace(
  /(name: 'age',\s+type: 'numeric',\s+numericCount: 100,\s+textCount: 0,\s+uniqueValues: 3,\s+missingCount: 0,)\s+numericCount: 3,\s+textCount: 0,/g,
  '$1'
);

content = content.replace(
  /(name: 'score',\s+type: 'numeric',\s+numericCount: 100,\s+textCount: 0,\s+uniqueValues: 3,\s+missingCount: 0,)\s+numericCount: 3,\s+textCount: 0,/g,
  '$1'
);

writeFileSync(filePath, content, 'utf8');
console.log('✅ smart-flow-step2-guidance 중복 속성 제거 완료');
