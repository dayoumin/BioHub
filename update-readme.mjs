import { readFileSync, writeFileSync } from 'fs';

const filePath = 'd:/Projects/Statics/statistical-platform/docs/testing-guide/README.md';

// UTF-8로 읽기
let content = readFileSync(filePath, 'utf8');

// 제목 부분 변경
content = content.replace(
  /# 자동화 테스트 가이드 \(Testing Guide\)\n\n\*\*AI 시대에 필수적인 자동화 검증 전략\*\*\n\n이 폴더는 통계 플랫폼의 자동화 테스트 시스템을 설명합니다\./,
  `# 자동화 테스트 가이드 (Automated Testing Guide)

**AI 시대에 필수적인 자동화 검증 전략 (문서 모음)**

⚠️ **주의**: 이 폴더는 **테스트 가이드 문서**입니다. 실제 테스트 코드는 \`__tests__/\` 폴더에 있습니다.

---

이 폴더는 통계 플랫폼의 자동화 테스트 시스템을 설명합니다.`
);

// 폴더 구조 부분 수정
content = content.replace(
  /testing\//g,
  'testing-guide/'
);

// UTF-8로 쓰기
writeFileSync(filePath, content, 'utf8');

console.log('✅ README.md 업데이트 완료 (UTF-8 인코딩 보존)');
