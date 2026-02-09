import { readFileSync, writeFileSync } from 'fs';

const filePath = '../CLAUDE.md';
let content = readFileSync(filePath, 'utf8');

// ppnpm → pnpm 오타 수정
content = content.replaceAll('ppnpm', 'pnpm');

writeFileSync(filePath, content, 'utf8');
console.log('✅ ppnpm → pnpm 오타 수정 완료');
