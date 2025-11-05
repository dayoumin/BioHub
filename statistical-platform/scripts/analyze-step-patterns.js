/**
 * Analyze Step Patterns Across All Statistics Pages
 *
 * This script extracts and categorizes step patterns to inform
 * Phase 3 createStandardSteps utility design decisions.
 */

const fs = require('fs');
const path = require('path');

const statisticsDir = path.join(__dirname, '../app/(dashboard)/statistics');

// Get all page files
const pageFiles = fs.readdirSync(statisticsDir)
  .filter(dir => {
    const pagePath = path.join(statisticsDir, dir, 'page.tsx');
    return fs.existsSync(pagePath) && dir !== '__tests__';
  })
  .map(dir => ({
    dir,
    path: path.join(statisticsDir, dir, 'page.tsx')
  }));

console.log(`📊 분석 대상: ${pageFiles.length}개 페이지\n`);

// Pattern categories
const patterns = {
  '2-step': [],
  '3-step': [],
  '4-step': [],
  '5-step': [],
  'useMemo': [],
  'custom': []
};

const stepDetails = [];

pageFiles.forEach(({ dir, path: pagePath }) => {
  const content = fs.readFileSync(pagePath, 'utf-8');

  // Check if useMemo
  const usesUseMemo = /const\s+steps(?::\s*StatisticsStep\[\])?\s*=\s*useMemo/.test(content);

  // Extract steps definition
  const stepsMatch = content.match(/const\s+steps[:\s\S]*?=\s*(?:useMemo\([^)]*?\)\s*=>\s*)?\[[\s\S]*?\n\s*\]/m);

  if (stepsMatch) {
    const stepsContent = stepsMatch[0];

    // Count steps by id: pattern
    const stepCount = (stepsContent.match(/id:\s*['\"`]/g) || []).length;

    // Extract step IDs and titles
    const stepIds = [];
    const idMatches = stepsContent.matchAll(/id:\s*['\"`]([^'"`]+)['\"`]/g);
    for (const match of idMatches) {
      stepIds.push(match[1]);
    }

    // Categorize
    if (usesUseMemo) {
      patterns['useMemo'].push(dir);
    } else if (stepCount === 2) {
      patterns['2-step'].push(dir);
    } else if (stepCount === 3) {
      patterns['3-step'].push(dir);
    } else if (stepCount === 4) {
      patterns['4-step'].push(dir);
    } else if (stepCount === 5) {
      patterns['5-step'].push(dir);
    } else {
      patterns['custom'].push(dir);
    }

    stepDetails.push({
      page: dir,
      stepCount,
      useMemo: usesUseMemo,
      stepIds,
      pattern: stepIds.join(' → ')
    });
  } else {
    patterns['custom'].push(dir);
    stepDetails.push({
      page: dir,
      stepCount: 0,
      useMemo: false,
      stepIds: [],
      pattern: 'NO STEPS FOUND'
    });
  }
});

// Print summary
console.log('📈 패턴 분포:\n');
Object.entries(patterns).forEach(([pattern, pages]) => {
  console.log(`${pattern}: ${pages.length}개`);
  if (pages.length > 0 && pages.length <= 5) {
    console.log(`  → ${pages.join(', ')}`);
  }
});

console.log('\n\n🔍 상세 분석:\n');

// Group by common patterns
const patternGroups = {};
stepDetails.forEach(detail => {
  const key = detail.pattern;
  if (!patternGroups[key]) {
    patternGroups[key] = [];
  }
  patternGroups[key].push(detail.page);
});

// Sort by frequency
const sortedPatterns = Object.entries(patternGroups)
  .sort((a, b) => b[1].length - a[1].length)
  .slice(0, 10);

console.log('가장 많이 사용되는 패턴 (Top 10):\n');
sortedPatterns.forEach(([pattern, pages], index) => {
  console.log(`${index + 1}. [${pages.length}개] ${pattern}`);
  if (pages.length <= 3) {
    console.log(`   페이지: ${pages.join(', ')}`);
  } else {
    console.log(`   페이지: ${pages.slice(0, 3).join(', ')}... (외 ${pages.length - 3}개)`);
  }
  console.log('');
});

// Identify standardizable patterns
console.log('\n\n💡 표준화 가능성 분석:\n');

const uploadVariableAnalysis = stepDetails.filter(d =>
  d.stepIds.includes('upload-data') &&
  d.stepIds.includes('select-variables') &&
  (d.stepIds.includes('run-analysis') || d.stepIds.includes('view-results'))
).length;

const uploadVariableOptionsResults = stepDetails.filter(d =>
  d.stepIds.includes('upload-data') &&
  d.stepIds.includes('select-variables') &&
  (d.stepIds.includes('configure-options') || d.stepIds.includes('set-options')) &&
  d.stepIds.includes('view-results')
).length;

const inputAnalysis = stepDetails.filter(d =>
  !d.stepIds.includes('upload-data') &&
  d.stepCount === 2
).length;

console.log(`✅ "upload → variables → analysis" 패턴: ${uploadVariableAnalysis}개`);
console.log(`✅ "upload → variables → options → results" 패턴: ${uploadVariableOptionsResults}개`);
console.log(`✅ "input → results" 패턴 (업로드 없음): ${inputAnalysis}개`);
console.log(`⚠️  useMemo 패턴 (성능 최적화): ${patterns['useMemo'].length}개`);

// Recommendation calculation
const standardizableCount = uploadVariableAnalysis + uploadVariableOptionsResults + inputAnalysis;
const totalCount = stepDetails.filter(d => d.stepCount > 0).length;
const standardizablePercentage = ((standardizableCount / totalCount) * 100).toFixed(1);

console.log(`\n📊 표준화 가능 비율: ${standardizableCount}/${totalCount} (${standardizablePercentage}%)`);

// Risk assessment
console.log('\n\n⚠️  리스크 평가:\n');
console.log(`1. 리팩토링 대상: ${totalCount}개 페이지`);
console.log(`2. useMemo 패턴 유지 필요: ${patterns['useMemo'].length}개 (성능 최적화)`);
console.log(`3. 고유 패턴 (표준화 어려움): ${patterns['custom'].length}개`);
console.log(`4. 테스트 커버리지: 208개 테스트 케이스 (회귀 방지)`);

// Benefit assessment
console.log('\n\n✨ 기대 효과:\n');
const avgDuplicateLines = 25; // Estimated lines per steps definition
const savedLines = standardizableCount * avgDuplicateLines;
console.log(`1. 코드 중복 제거: 약 ${savedLines}줄 감소`);
console.log(`2. 유지보수 개선: 단계 수정 시 1곳만 변경`);
console.log(`3. 일관성 향상: 모든 페이지 동일한 단계 로직`);

// Final recommendation
console.log('\n\n🎯 권장사항:\n');
if (standardizablePercentage > 70) {
  console.log('✅ Phase 3 진행 권장');
  console.log(`   - 표준화 가능 비율이 ${standardizablePercentage}%로 높음`);
  console.log('   - createStandardSteps 유틸리티로 코드 중복 대폭 감소 가능');
  console.log('   - 208개 테스트로 회귀 방지 가능');
} else if (standardizablePercentage > 50) {
  console.log('⚠️  Phase 3 신중 검토 필요');
  console.log(`   - 표준화 가능 비율: ${standardizablePercentage}%`);
  console.log('   - 일부 페이지는 여전히 커스텀 로직 필요');
} else {
  console.log('❌ Phase 3 보류 권장');
  console.log(`   - 표준화 가능 비율이 ${standardizablePercentage}%로 낮음`);
  console.log('   - 현재 구조 유지가 더 안정적');
}
