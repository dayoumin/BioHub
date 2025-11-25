import { readFileSync, writeFileSync } from 'fs';

const filePath = 'statistical-platform/__tests__/components/smart-flow/data-validation-step-new-window.test.tsx';
let content = readFileSync(filePath, 'utf8');

// 57-58행 삭제: numericCount: 3, textCount: 0,
content = content.replace(
  /(uniqueValues: 3,\s+missingCount: 0,)\s+numericCount: 3,\s+textCount: 0,/g,
  '$1'
);

// 73-74행 삭제: numericCount: 0, textCount: 3,
content = content.replace(
  /(missingCount: 0,)\s+numericCount: 0,\s+textCount: 3,/g,
  '$1'
);

writeFileSync(filePath, content, 'utf8');
console.log('✅ data-validation-step-new-window 중복 속성 제거 완료');
