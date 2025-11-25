#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// 트리거 매핑 (6개 전체)
const TRIGGERS = {
  // 1. Type Guards
  'statistical-platform/lib/utils/type-guards.ts':
    'statistical-platform/app/(dashboard)/design-system/coding-patterns/type-guards.json',

  // 2. RAG Components
  'statistical-platform/components/rag/':
    'statistical-platform/app/(dashboard)/design-system/coding-patterns/rag-components.json',
  'statistical-platform/lib/rag/':
    'statistical-platform/app/(dashboard)/design-system/coding-patterns/rag-components.json',

  // 3. Statistics Page Pattern
  'statistical-platform/docs/STATISTICS_CODING_STANDARDS.md':
    'statistical-platform/app/(dashboard)/design-system/coding-patterns/statistics-page-pattern.json',
  'statistical-platform/hooks/use-statistics-page.ts':
    'statistical-platform/app/(dashboard)/design-system/coding-patterns/statistics-page-pattern.json',

  // 4. Test Snippets (새 패턴 발견 시만 - 자주 체크 안 됨)
  'statistical-platform/__tests__/':
    'statistical-platform/app/(dashboard)/design-system/coding-patterns/test-snippets.json',
};

// 스테이징된 파일 확인
let stagedFiles;
try {
  stagedFiles = execSync('git diff --cached --name-only', { encoding: 'utf8' })
    .split('\n')
    .filter(Boolean);
} catch (error) {
  console.error('❌ ERROR: git diff 실행 실패');
  process.exit(1);
}

let hasError = false;

// 각 트리거 체크
for (const [trigger, metadataPath] of Object.entries(TRIGGERS)) {
  const matchedFiles = stagedFiles.filter(file => file.includes(trigger));

  if (matchedFiles.length > 0) {
    console.log(`\n🔍 트리거 감지: ${trigger}`);
    console.log(`   변경된 파일: ${matchedFiles.join(', ')}`);

    // 메타데이터도 스테이징되었는지 확인
    if (!stagedFiles.includes(metadataPath)) {
      console.error(`\n❌ ERROR: ${trigger} 수정됨, 하지만 ${metadataPath} 업데이트 안 됨!`);
      console.error(`   → 메타데이터 파일도 함께 커밋하세요.`);
      hasError = true;
      continue;
    }

    // lastUpdated 날짜 확인
    try {
      const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
      const today = new Date().toISOString().split('T')[0];

      if (metadata.lastUpdated !== today) {
        console.error(`\n❌ ERROR: ${metadataPath}의 lastUpdated가 오늘 날짜가 아님!`);
        console.error(`   현재: ${metadata.lastUpdated}`);
        console.error(`   예상: ${today}`);
        hasError = true;
      } else {
        console.log(`   ✅ 메타데이터 업데이트 확인됨 (${today})`);
      }
    } catch (error) {
      console.error(`\n❌ ERROR: ${metadataPath} 읽기 실패`);
      console.error(`   ${error.message}`);
      hasError = true;
    }
  }
}

if (hasError) {
  console.error('\n💡 Tip: statistical-platform/docs/DESIGN_SYSTEM_SYNC_RULES.md 참조');
  process.exit(1);
}

console.log('\n✅ Design System 메타데이터 동기화 확인 완료');
