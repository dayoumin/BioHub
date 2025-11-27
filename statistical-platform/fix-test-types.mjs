import { readFileSync, writeFileSync } from 'fs';

const filePath = '__tests__/components/smart-flow/data-exploration-id-filter.test.ts';
let content = readFileSync(filePath, 'utf8');

// 각 ColumnStatistics 객체에 numericCount, textCount 추가
// numeric 타입: numericCount = uniqueValues, textCount = 0
// categorical 타입: numericCount = 0, textCount = uniqueValues

// Pattern 1: numeric 타입에 numericCount, textCount 추가
content = content.replace(
  /type: 'numeric',\n(\s+)uniqueValues: (\d+),/g,
  "type: 'numeric',\n$1numericCount: $2,\n$1textCount: 0,\n$1uniqueValues: $2,"
);

// Pattern 2: categorical 타입에 numericCount, textCount 추가
content = content.replace(
  /type: 'categorical',\n(\s+)uniqueValues: (\d+),/g,
  "type: 'categorical',\n$1numericCount: 0,\n$1textCount: $2,\n$1uniqueValues: $2,"
);

writeFileSync(filePath, content, 'utf8');
console.log('Fixed: ' + filePath);
