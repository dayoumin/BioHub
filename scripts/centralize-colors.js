/**
 * 통계 페이지의 모든 하드코딩된 색상을 중립 색상으로 일괄 변경하는 스크립트
 *
 * 사용법: node scripts/centralize-colors.js
 */

const fs = require('fs');
const path = require('path');

// 통계 페이지 디렉토리
const STATS_DIR = path.join(__dirname, '../statistical-platform/app/(dashboard)/statistics');

// 색상 교체 패턴 정의 (순서 중요!)
const REPLACEMENT_PATTERNS = [
  // 1. 배경 색상 (가장 구체적인 것부터)
  {
    pattern: /bg-(green|blue|red|orange|yellow|purple|amber|emerald|indigo|pink)-(50|100)/g,
    replacement: 'bg-muted',
    description: '배경 색상'
  },

  // 2. 텍스트 색상 (제목용 진한 색) - 공백 그대로 유지
  {
    pattern: /text-(green|blue|red|orange|yellow|purple|amber|emerald|indigo|pink)-(800|900)/g,
    replacement: '',
    description: '진한 텍스트 색상 제거'
  },

  // 3. 텍스트 색상 (중간/연한 색)
  {
    pattern: /text-(green|blue|red|orange|yellow|purple|amber|emerald|indigo|pink)-(600|700)/g,
    replacement: 'text-muted-foreground',
    description: '텍스트 색상'
  },

  // 4. border 색상
  {
    pattern: /border-(green|blue|red|orange|yellow|purple|amber|emerald|indigo|pink)-(200|300)/g,
    replacement: 'border',
    description: 'border 색상'
  },

  // 5. Alert/Badge 특수 케이스
  {
    pattern: /border-(green|blue|red|orange|yellow)-(500|600)\s+bg-(green|blue|red|orange|yellow)-(50|100)/g,
    replacement: 'border bg-muted',
    description: 'Alert 테두리+배경'
  },
];

// cleanup 패턴 (className 내부 공백만 정리, 줄바꿈 보존)
const CLEANUP_PATTERNS = [
  // className 내부의 중복 공백만 제거 (줄바꿈은 건드리지 않음)
  { pattern: /className="([^"]*?)  +([^"]*)"/g, replacement: 'className="$1 $2"' },

  // 빈 className 속성 제거
  { pattern: / className=""/g, replacement: '' },

  // className 시작/끝 공백 제거
  { pattern: /className=" ([^"]*)"/g, replacement: 'className="$1"' },
  { pattern: /className="([^"]*) "/g, replacement: 'className="$1"' },
];

/**
 * 파일 내용에서 모든 색상을 교체
 */
function replaceColors(content, filePath) {
  let modifiedContent = content;
  const changes = [];

  // 1단계: 색상 교체
  REPLACEMENT_PATTERNS.forEach(({ pattern, replacement, description }) => {
    const matches = modifiedContent.match(pattern);
    if (matches && matches.length > 0) {
      changes.push(`  - ${description}: ${matches.length}개`);
      modifiedContent = modifiedContent.replace(pattern, replacement);
    }
  });

  // 2단계: cleanup
  CLEANUP_PATTERNS.forEach(({ pattern, replacement }) => {
    modifiedContent = modifiedContent.replace(pattern, replacement);
  });

  return {
    content: modifiedContent,
    changed: content !== modifiedContent,
    changes
  };
}

/**
 * 디렉토리 내 모든 .tsx 파일 찾기 (재귀)
 */
function findAllTsxFiles(dir) {
  let results = [];
  const files = fs.readdirSync(dir);

  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      results = results.concat(findAllTsxFiles(filePath));
    } else if (file.endsWith('.tsx')) {
      results.push(filePath);
    }
  });

  return results;
}

/**
 * 메인 함수
 */
function main() {
  console.log('🎨 통계 페이지 색상 중앙화 시작...\n');

  const files = findAllTsxFiles(STATS_DIR);
  console.log(`📂 총 ${files.length}개 파일 발견\n`);

  let totalModified = 0;
  const modifiedFiles = [];

  files.forEach(filePath => {
    const relativePath = path.relative(process.cwd(), filePath);
    const content = fs.readFileSync(filePath, 'utf8');

    const { content: modifiedContent, changed, changes } = replaceColors(content, filePath);

    if (changed) {
      fs.writeFileSync(filePath, modifiedContent, 'utf8');
      console.log(`✅ ${relativePath}`);
      if (changes.length > 0) {
        changes.forEach(change => console.log(change));
      }
      console.log('');
      totalModified++;
      modifiedFiles.push(relativePath);
    }
  });

  console.log(`\n${'='.repeat(60)}`);
  console.log(`✨ 완료!`);
  console.log(`   - 총 파일: ${files.length}개`);
  console.log(`   - 수정된 파일: ${totalModified}개`);
  console.log(`   - 변경 없는 파일: ${files.length - totalModified}개`);

  if (modifiedFiles.length > 0) {
    console.log(`\n📝 수정된 파일 목록:`);
    modifiedFiles.forEach(file => console.log(`   - ${file}`));
  }
}

// 실행
try {
  main();
} catch (error) {
  console.error('❌ 에러 발생:', error.message);
  console.error(error.stack);
  process.exit(1);
}
