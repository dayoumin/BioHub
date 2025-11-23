// Fix old Box's M test to check statistical instead of practical
import { readFileSync, writeFileSync } from 'fs';

const filePath = 'statistical-platform/__tests__/lib/interpretation/engine-advanced.test.ts';

// UTF-8로 읽기
let content = readFileSync(filePath, 'utf8');

// Line 689-690: Change practical to statistical
const oldCode = `      expect(interpretation).not.toBeNull()
      expect(interpretation?.practical).toContain('Box\\'s M 검정이 유의하여')
      expect(interpretation?.practical).toContain('공분산 행렬 동질성 가정이 위배')`;

const newCode = `      expect(interpretation).not.toBeNull()
      expect(interpretation?.statistical).toContain('Box\\'s M 검정이 유의하여')
      expect(interpretation?.statistical).toContain('공분산 행렬 동질성 가정이 위배')`;

content = content.replace(oldCode, newCode);

// UTF-8로 쓰기
writeFileSync(filePath, content, 'utf8');

console.log('✅ Box M 테스트 수정 완료');
console.log('📍 변경 내역:');
console.log('  - Line 689-690: practical → statistical (Issue 3에 따라 Box M 경고는 statistical에 표시)');
