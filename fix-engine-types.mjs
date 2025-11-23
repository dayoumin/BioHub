import { readFileSync, writeFileSync } from 'fs';

const filePath = 'statistical-platform/lib/interpretation/engine.ts';

// UTF-8로 읽기
let content = readFileSync(filePath, 'utf8');

// 1. Line 112: results.coefficients 체크
content = content.replace(
  'const coef = results.coefficients[1].value',
  'const coef = results.coefficients?.[1]?.value ?? 0'
);

// 2. Line 113: results.additional 체크
content = content.replace(
  'const rSquared = results.additional.rSquared',
  'const rSquared = results.additional?.rSquared ?? 0'
);

// 3. Line 118-123: rSquared null 체크 (이미 0으로 fallback되므로 OK)
// 변경 불필요 (rSquared는 이제 number 타입)

// UTF-8로 쓰기
writeFileSync(filePath, content, 'utf8');

console.log('✅ 완료: UTF-8 인코딩 보존됨');
console.log('수정 사항:');
console.log('- Line 112: Optional chaining 추가 (coefficients?.[1]?.value)');
console.log('- Line 113: Optional chaining 추가 (additional?.rSquared)');
