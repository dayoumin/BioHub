/**
 * 통계 페이지의 "적용 예시" 섹션에서 색상을 제거하는 스크립트
 *
 * 사용법: node scripts/remove-example-colors.js
 */

const fs = require('fs');
const path = require('path');
const glob = require('glob');

// 통계 페이지 디렉토리
const STATS_DIR = path.join(__dirname, '../statistical-platform/app/(dashboard)/statistics');

// 색상 패턴 정의
const COLOR_PATTERNS = [
  // 배경 색상
  { pattern: /bg-green-50/g, replacement: 'bg-muted' },
  { pattern: /bg-blue-50/g, replacement: 'bg-muted' },
  { pattern: /bg-red-50/g, replacement: 'bg-muted' },
  { pattern: /bg-orange-50/g, replacement: 'bg-muted' },
  { pattern: /bg-yellow-50/g, replacement: 'bg-muted' },
  { pattern: /bg-purple-50/g, replacement: 'bg-muted' },

  // 텍스트 색상 (제목)
  { pattern: /text-green-800/g, replacement: '' },
  { pattern: /text-blue-800/g, replacement: '' },
  { pattern: /text-red-800/g, replacement: '' },
  { pattern: /text-orange-800/g, replacement: '' },
  { pattern: /text-yellow-800/g, replacement: '' },
  { pattern: /text-purple-800/g, replacement: '' },

  // 텍스트 색상 (설명)
  { pattern: /text-green-700/g, replacement: 'text-muted-foreground' },
  { pattern: /text-blue-700/g, replacement: 'text-muted-foreground' },
  { pattern: /text-red-700/g, replacement: 'text-muted-foreground' },
  { pattern: /text-orange-700/g, replacement: 'text-muted-foreground' },
  { pattern: /text-yellow-700/g, replacement: 'text-muted-foreground' },
  { pattern: /text-purple-700/g, replacement: 'text-muted-foreground' },

  // 텍스트 색상 (대체)
  { pattern: /text-green-600/g, replacement: 'text-muted-foreground' },
  { pattern: /text-blue-600/g, replacement: 'text-muted-foreground' },
  { pattern: /text-red-600/g, replacement: 'text-muted-foreground' },
  { pattern: /text-orange-600/g, replacement: 'text-muted-foreground' },
  { pattern: /text-yellow-600/g, replacement: 'text-muted-foreground' },
  { pattern: /text-purple-600/g, replacement: 'text-muted-foreground' },
];

// "적용 예시" 섹션에서만 색상을 제거하는 함수
function removeColorsFromExamples(content) {
  // "적용 예시" 섹션 찾기
  const exampleSectionRegex = /(<CardTitle[^>]*>\s*<[^>]*>\s*\w*\s*<\/[^>]*>\s*적용 예시[\s\S]*?<\/Card>)/g;

  let modifiedContent = content;
  let changesMade = 0;

  // 각 "적용 예시" 섹션에 대해 색상 제거
  modifiedContent = modifiedContent.replace(exampleSectionRegex, (match) => {
    let section = match;

    COLOR_PATTERNS.forEach(({ pattern, replacement }) => {
      const before = section;
      section = section.replace(pattern, replacement);
      if (before !== section) {
        changesMade++;
      }
    });

    // 빈 className 속성 정리
    section = section.replace(/className="(\s*)"/g, '');
    section = section.replace(/className="\s+/g, 'className="');

    // bg-muted 다음에 border가 없으면 추가
    section = section.replace(/bg-muted p-3 rounded(?!.*border)/g, 'bg-muted p-3 rounded border');

    // font-medium만 남은 경우 처리
    section = section.replace(/<h4 className="">/g, '<h4 className="font-medium">');

    return section;
  });

  return { content: modifiedContent, changesMade };
}

// 모든 통계 페이지 파일 찾기
function findStatisticsPages() {
  const pattern = path.join(STATS_DIR, '**', 'page.tsx');
  return glob.sync(pattern);
}

// 메인 함수
function main() {
  console.log('🎨 통계 페이지 "적용 예시" 색상 제거 시작...\n');

  const files = findStatisticsPages();
  console.log(`📂 총 ${files.length}개 파일 발견\n`);

  let totalChanges = 0;
  let modifiedFiles = 0;

  files.forEach((filePath) => {
    const relativePath = path.relative(process.cwd(), filePath);
    const content = fs.readFileSync(filePath, 'utf8');

    // "적용 예시" 섹션이 있는지 확인
    if (!content.includes('적용 예시')) {
      return;
    }

    const { content: modifiedContent, changesMade } = removeColorsFromExamples(content);

    if (changesMade > 0) {
      fs.writeFileSync(filePath, modifiedContent, 'utf8');
      console.log(`✅ ${relativePath}: ${changesMade}개 변경`);
      totalChanges += changesMade;
      modifiedFiles++;
    }
  });

  console.log(`\n✨ 완료!`);
  console.log(`   - 수정된 파일: ${modifiedFiles}개`);
  console.log(`   - 총 변경 사항: ${totalChanges}개`);
}

// 실행
try {
  main();
} catch (error) {
  console.error('❌ 에러 발생:', error.message);
  process.exit(1);
}
