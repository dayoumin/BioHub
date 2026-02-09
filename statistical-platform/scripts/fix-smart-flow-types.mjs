/**
 * smart-flow.ts 중복 필드 및 잔여 snake_case 수정
 */

import { readFileSync, writeFileSync } from 'fs';

const filePath = 'types/smart-flow.ts';
let content = readFileSync(filePath, 'utf8');

// 중복 rSquared 제거 (라인 460의 Python Worker 호환 버전 - 이제 불필요)
content = content.replace(
  /    rSquared\?: number  \/\/ snake_case 버전 \(Python Worker 호환\)\n/,
  ''
);

// 잔여 혼합 형태 수정
content = content.replace(/marginal_rSquared/g, 'marginalRSquared');
content = content.replace(/conditional_rSquared/g, 'conditionalRSquared');
content = content.replace(/pseudo_rSquared/g, 'pseudoRSquared');

writeFileSync(filePath, content, 'utf8');
console.log('✅ smart-flow.ts 수정 완료');
