#!/usr/bin/env node
/**
 * 45개 통계 페이지의 필수 구조 검증
 * - useStatisticsPage hook 사용 여부
 * - TwoPanelLayout or StatisticsPageLayout 사용
 * - runAnalysis 또는 handleAnalyze 함수 존재
 * - Worker 메서드 호출 확인
 * - setTimeout 패턴 없음 (Phase 1 완료)
 * - any 타입 없음 (Phase 2 완료)
 */
const fs = require('fs');
const path = require('path');

const STATISTICS_PAGES = [
  'ancova', 'anova', 'arima', 'binomial-test', 'chi-square', 'chi-square-goodness',
  'chi-square-independence', 'cluster', 'cochran-q', 'correlation',
  'descriptive', 'discriminant', 'dose-response', 'explore-data',
  'factor-analysis', 'friedman', 'kruskal-wallis', 'ks-test',
  'mann-kendall', 'mann-whitney', 'manova', 'mcnemar', 'means-plot',
  'mixed-model', 'mood-median', 'non-parametric', 'normality-test',
  'one-sample-t', 'ordinal-regression', 'partial-correlation', 'pca',
  'poisson', 'power-analysis', 'proportion-test', 'regression',
  'reliability', 'response-surface', 'runs-test', 'seasonal-decompose',
  'sign-test', 'stationarity-test', 'stepwise', 't-test', 'welch-t', 'wilcoxon'
];

function validatePageStructure(pageName) {
  const pagePath = path.join(__dirname, `../app/(dashboard)/statistics/${pageName}/page.tsx`);

  if (!fs.existsSync(pagePath)) {
    return {
      success: false,
      error: 'File not found',
      pageName,
      checks: {}
    };
  }

  const content = fs.readFileSync(pagePath, 'utf-8');

  // 체크 항목들
  const checks = {
    hasUseStatisticsPage: content.includes('useStatisticsPage'),
    hasLayout: content.includes('TwoPanelLayout') || content.includes('StatisticsPageLayout'),
    hasAnalysisFunction: /const\s+\w*(run|handle|perform)\w*\s*=\s*useCallback\s*\(\s*async/.test(content),
    hasWorkerCall: content.includes('callWorkerMethod') || content.includes('pyodideStats.') || content.includes('executePython'),
    noSetTimeout: !content.includes('setTimeout('),
    noAnyType: !content.match(/:\s*any[\s,\)]/),
    hasUseCallback: content.includes('useCallback'),
    hasErrorHandling: content.includes('try') && content.includes('catch'),
  };

  const allPassed = Object.values(checks).every(v => v === true);

  // 추가 정보 수집
  const metadata = {
    lineCount: content.split('\n').length,
    hasComments: content.includes('/**') || content.includes('//'),
    layoutType: content.includes('TwoPanelLayout') ? 'TwoPanelLayout' :
                content.includes('StatisticsPageLayout') ? 'StatisticsPageLayout' :
                'Unknown',
  };

  return {
    success: allPassed,
    checks,
    metadata,
    pageName
  };
}

// 컬러 출력 헬퍼
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function colorize(text, color) {
  return `${colors[color]}${text}${colors.reset}`;
}

// 전체 검증 실행
console.log(colorize('🔍 Starting Page Structure Validation...', 'cyan'));
console.log(colorize(`📊 Total pages to check: ${STATISTICS_PAGES.length}`, 'blue'));
console.log('');

const results = STATISTICS_PAGES.map(validatePageStructure);
const passed = results.filter(r => r.success);
const failed = results.filter(r => !r.success);

// 요약 출력
console.log(colorize('=' .repeat(60), 'blue'));
console.log(colorize('📋 SUMMARY', 'cyan'));
console.log(colorize('=' .repeat(60), 'blue'));
console.log(colorize(`✅ Passed: ${passed.length}/${STATISTICS_PAGES.length}`, 'green'));
console.log(colorize(`❌ Failed: ${failed.length}/${STATISTICS_PAGES.length}`, failed.length > 0 ? 'red' : 'green'));
console.log('');

// 실패 상세 출력
if (failed.length > 0) {
  console.log(colorize('❌ FAILED PAGES:', 'red'));
  console.log('');

  failed.forEach(({ pageName, checks, error }) => {
    console.log(colorize(`📄 ${pageName}:`, 'yellow'));

    if (error) {
      console.log(colorize(`   Error: ${error}`, 'red'));
    } else {
      Object.entries(checks).forEach(([key, value]) => {
        const icon = value ? '✅' : '❌';
        const color = value ? 'green' : 'red';
        console.log(colorize(`   ${icon} ${key}`, color));
      });
    }
    console.log('');
  });
}

// 성공 페이지 통계
if (passed.length > 0) {
  console.log(colorize('✅ PASSED PAGES:', 'green'));
  console.log('');

  // 레이아웃 타입별 분류
  const layoutStats = passed.reduce((acc, { metadata }) => {
    acc[metadata.layoutType] = (acc[metadata.layoutType] || 0) + 1;
    return acc;
  }, {});

  console.log(colorize('📊 Layout Distribution:', 'cyan'));
  Object.entries(layoutStats).forEach(([layout, count]) => {
    console.log(`   ${layout}: ${count} pages`);
  });
  console.log('');

  // 평균 라인 수
  const avgLines = Math.round(
    passed.reduce((sum, { metadata }) => sum + metadata.lineCount, 0) / passed.length
  );
  console.log(colorize(`📏 Average lines per page: ${avgLines}`, 'cyan'));
  console.log('');
}

// 체크 항목별 통과율
console.log(colorize('📊 CHECK ITEM PASS RATES:', 'cyan'));
console.log('');

const allChecks = results.flatMap(r => Object.entries(r.checks));
const checkStats = allChecks.reduce((acc, [key, value]) => {
  if (!acc[key]) {
    acc[key] = { passed: 0, total: 0 };
  }
  acc[key].total++;
  if (value) acc[key].passed++;
  return acc;
}, {});

Object.entries(checkStats).forEach(([key, { passed, total }]) => {
  const rate = ((passed / total) * 100).toFixed(1);
  const color = rate === '100.0' ? 'green' : rate >= '90.0' ? 'yellow' : 'red';
  console.log(colorize(`   ${key}: ${passed}/${total} (${rate}%)`, color));
});

console.log('');
console.log(colorize('=' .repeat(60), 'blue'));

// 검증 결과를 JSON으로 저장
const reportPath = path.join(__dirname, '../test-results/structure-validation.json');
const reportDir = path.dirname(reportPath);

if (!fs.existsSync(reportDir)) {
  fs.mkdirSync(reportDir, { recursive: true });
}

const report = {
  timestamp: new Date().toISOString(),
  summary: {
    total: STATISTICS_PAGES.length,
    passed: passed.length,
    failed: failed.length,
    passRate: ((passed.length / STATISTICS_PAGES.length) * 100).toFixed(1) + '%',
  },
  checkStats,
  layoutStats: passed.reduce((acc, { metadata }) => {
    acc[metadata.layoutType] = (acc[metadata.layoutType] || 0) + 1;
    return acc;
  }, {}),
  pages: results,
};

fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
console.log(colorize(`📄 Report saved to: ${reportPath}`, 'cyan'));
console.log('');

// Exit code
if (failed.length > 0) {
  console.log(colorize('❌ Validation FAILED', 'red'));
  process.exit(1);
} else {
  console.log(colorize('✅ All pages passed structure validation!', 'green'));
  process.exit(0);
}
