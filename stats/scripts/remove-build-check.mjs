import { readFileSync, writeFileSync } from 'fs';

const filePath = '../../CLAUDE.md';
let content = readFileSync(filePath, 'utf8');

// Step 2-2 빌드 체크 섹션 제거
content = content.replace(
  `**2-2. 빌드 체크** (🟡 선택 - 10+ 파일 수정 시)
\`\`\`bash
pnpm build
\`\`\`

**2-3. 테스트 실행**`,
  `**2-2. 테스트 실행**`
);

writeFileSync(filePath, content, 'utf8');
console.log('✅ CLAUDE.md에서 빌드 체크 항목 제거 완료');
