#!/usr/bin/env node

/**
 * 통계 분석 페이지 자동 검증 스크립트
 *
 * 용도:
 * - 모든 통계 페이지의 TypeScript 타입 검증
 * - 페이지 렌더링 가능 여부 확인
 * - 핵심 버그 패턴 감지 (isAnalyzing, useCallback 등)
 *
 * 사용법:
 * node scripts/test-statistics-pages.js
 */

const fs = require('fs');
const path = require('path');

// 색상 코드
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

// 테스트 결과 저장소
const results = {
  total: 0,
  passed: 0,
  failed: 0,
  warnings: 0,
  errors: []
};

// 통계 페이지 목록
const statisticsPages = [
  // Group 1: Quick Wins
  'anova', 't-test', 'one-sample-t', 'normality-test', 'means-plot', 'ks-test',
  // Group 2: Medium
  'friedman', 'kruskal-wallis',
  // Group 3: Complex
  'mann-kendall', 'reliability',
  // Group 4: Critical
  'regression',
  // Group 5: Remaining
  'ancova', 'chi-square', 'chi-square-goodness', 'chi-square-independence',
  'cluster', 'correlation', 'cross-tabulation', 'descriptive', 'discriminant',
  'dose-response', 'explore-data', 'factor-analysis', 'frequency-table',
  'manova', 'mcnemar', 'mixed-model', 'non-parametric', 'ordinal-regression',
  'partial-correlation', 'pca', 'poisson', 'power-analysis', 'proportion-test',
  'response-surface', 'runs-test', 'sign-test', 'stepwise', 'welch-t', 'wilcoxon'
];

/**
 * 페이지 파일 읽기
 */
function readPageFile(pageName) {
  const filePath = path.join(
    __dirname,
    `../../app/(dashboard)/statistics/${pageName}/page.tsx`
  );

  try {
    return fs.readFileSync(filePath, 'utf-8');
  } catch (error) {
    return null;
  }
}

/**
 * 핵심 버그 패턴 검사
 */
function checkBugPatterns(content, pageName) {
  const issues = [];
  const warnings = [];

  if (!content) {
    issues.push('❌ 파일을 찾을 수 없음');
    return { issues, warnings };
  }

  // 1. any 타입 검사 (금지)
  if (/:\s*any\b|as\s+any\b/g.test(content)) {
    issues.push('❌ any 타입 사용 (금지됨 - unknown 사용)');
  }

  // 2. Non-null assertion (!) 검사 (금지)
  const nonNullAssertions = content.match(/\w+!\./g) || [];
  if (nonNullAssertions.length > 0) {
    issues.push(`❌ Non-null assertion (!) ${nonNullAssertions.length}개 (금지됨)`);
  }

  // 3. useStatisticsPage hook 사용 확인
  if (/useStatisticsPage/.test(content)) {
    warnings.push('✅ useStatisticsPage hook 사용');
  } else if (/useState/.test(content) && /statistics/i.test(content)) {
    issues.push('⚠️ useState 사용 (useStatisticsPage 권장)');
  }

  // 4. useCallback 사용 확인
  const useCallbackCount = (content.match(/useCallback/g) || []).length;
  if (useCallbackCount > 0) {
    warnings.push(`✅ useCallback ${useCallbackCount}개 사용`);
  } else {
    issues.push('⚠️ useCallback 없음 (이벤트 핸들러에 사용 권장)');
  }

  // 5. setTimeout 사용 검사 (금지)
  if (/setTimeout/.test(content)) {
    issues.push('❌ setTimeout 사용 (금지됨 - await 패턴 사용)');
  }

  // 6. isAnalyzing 버그 패턴 검사
  // 버그: setResults → setCurrentStep을 completeAnalysis 없이 호출
  if (/actions\.setResults\(/.test(content) && !/actions\.completeAnalysis/.test(content)) {
    // 추가 검사: setResults 다음에 setCurrentStep이 있으면 버그
    const setResultsPattern = /actions\.setResults\([^)]+\)\s*[\n;]\s*actions\.setCurrentStep/;
    if (setResultsPattern.test(content)) {
      issues.push('🔴 isAnalyzing 버그 패턴 감지: setResults → setCurrentStep (completeAnalysis 사용)');
    }
  }

  // 7. 옵셔널 체이닝 사용 확인
  const optionalChaining = (content.match(/\?\./g) || []).length;
  if (optionalChaining > 0) {
    warnings.push(`✅ 옵셔널 체이닝 ${optionalChaining}개 사용`);
  }

  // 8. DataUploadStep 사용 확인
  if (/DataUploadStep/.test(content)) {
    warnings.push('✅ DataUploadStep 사용 (최신 표준)');
  }

  // 9. VariableSelector 사용 확인
  if (/VariableSelector/.test(content)) {
    warnings.push('✅ VariableSelector 사용 (최신 표준)');
  }

  // 10. 직접 통계 계산 검사 (금지)
  const mathPatterns = [
    /function\s+\w*(?:mean|variance|stddev|percentile)\s*\(/i,
    /const\s+\w*(?:mean|variance|stddev)\s*=/i
  ];

  mathPatterns.forEach(pattern => {
    if (pattern.test(content)) {
      issues.push('❌ 직접 통계 계산 (금지됨 - Python workers 사용)');
    }
  });

  // 11. JavaScript 근사 함수 검사 (예: Abramowitz-Stegun)
  if (/Abramowitz|Stegun|erf|normalCDF/.test(content)) {
    issues.push('❌ JavaScript 통계 근사 함수 (금지됨 - scipy 사용)');
  }

  return { issues, warnings };
}

/**
 * TypeScript 기본 검사 (파일 존재 여부만)
 */
function checkTypeScriptBasics(content, pageName) {
  const issues = [];

  if (!content) return issues;

  // 1. import 구문 검사
  if (!/^import\s+/m.test(content)) {
    issues.push('⚠️ import 구문 없음');
  }

  // 2. export 구문 검사
  if (!/export\s+(default|const|function)/m.test(content)) {
    issues.push('⚠️ export 구문 없음');
  }

  // 3. interface/type 정의 검사
  if (!/(?:interface|type)\s+\w+/.test(content)) {
    issues.push('⚠️ 타입 정의 없음 (interface/type 권장)');
  }

  return issues;
}

/**
 * 페이지 구조 검사
 */
function checkPageStructure(content, pageName) {
  const issues = [];

  if (!content) return issues;

  // 1. 필수 컴포넌트 확인
  const requiredComponents = ['StatisticsPageLayout', 'StepCard'];
  requiredComponents.forEach(comp => {
    if (!content.includes(comp)) {
      issues.push(`⚠️ ${comp} 컴포넌트 미사용`);
    }
  });

  // 2. Steps 배열 확인
  if (!/const\s+steps\s*=\s*\[/.test(content)) {
    issues.push('⚠️ steps 배열 미정의');
  }

  return issues;
}

/**
 * 페이지 검증 실행
 */
function validatePage(pageName) {
  const content = readPageFile(pageName);
  const report = {
    name: pageName,
    exists: !!content,
    bugs: [],
    typeErrors: [],
    structureIssues: [],
    warnings: [],
    score: 0
  };

  if (!content) {
    report.bugs.push('파일을 찾을 수 없음');
    return report;
  }

  // 버그 패턴 검사
  const { issues: bugIssues, warnings: bugWarnings } = checkBugPatterns(content, pageName);
  report.bugs = bugIssues;
  report.warnings.push(...bugWarnings);

  // TypeScript 기본 검사
  const typeErrors = checkTypeScriptBasics(content, pageName);
  report.typeErrors = typeErrors;
  report.warnings.push(...typeErrors);

  // 페이지 구조 검사
  const structureIssues = checkPageStructure(content, pageName);
  report.structureIssues = structureIssues;
  report.warnings.push(...structureIssues);

  // 점수 계산
  let score = 5.0;
  score -= report.bugs.length * 0.5;  // 버그당 -0.5
  score -= report.typeErrors.length * 0.2;  // 타입 에러당 -0.2
  score -= report.structureIssues.length * 0.1;  // 구조 이슈당 -0.1
  report.score = Math.max(0, score);

  return report;
}

/**
 * 결과 출력
 */
function printReport(report) {
  const statusIcon = report.bugs.length > 0 ? '❌' : (report.warnings.length > 0 ? '⚠️' : '✅');
  console.log(`\n${colors.bright}${statusIcon} ${report.name}${colors.reset} (점수: ${report.score.toFixed(1)}/5.0)`);

  if (report.bugs.length > 0) {
    console.log(`${colors.red}버그:${colors.reset}`);
    report.bugs.forEach(bug => console.log(`  ${bug}`));
  }

  if (report.warnings.length > 0) {
    console.log(`${colors.yellow}경고/안내:${colors.reset}`);
    report.warnings.forEach(warning => console.log(`  ${warning}`));
  }

  if (report.structureIssues.length > 0) {
    console.log(`${colors.yellow}구조 이슈:${colors.reset}`);
    report.structureIssues.forEach(issue => console.log(`  ${issue}`));
  }
}

/**
 * 메인 실행
 */
function main() {
  console.log(`\n${colors.bright}${colors.cyan}📊 통계 페이지 자동 검증 시작${colors.reset}`);
  console.log(`총 ${statisticsPages.length}개 페이지 검증\n`);

  const reports = [];

  statisticsPages.forEach(pageName => {
    results.total++;
    const report = validatePage(pageName);
    reports.push(report);

    if (report.bugs.length === 0 && report.warnings.length === 0) {
      results.passed++;
    } else if (report.bugs.length > 0) {
      results.failed++;
      results.errors.push(report);
    } else {
      results.warnings++;
    }

    printReport(report);
  });

  // 최종 요약
  console.log(`\n${colors.bright}${colors.cyan}=== 최종 요약 ===${colors.reset}`);
  console.log(`✅ 완벽: ${results.passed}/${results.total}`);
  console.log(`⚠️  경고: ${results.warnings}/${results.total}`);
  console.log(`❌ 버그: ${results.failed}/${results.total}`);

  // 버그 있는 페이지 목록
  if (results.failed > 0) {
    console.log(`\n${colors.red}버그 있는 페이지:${colors.reset}`);
    results.errors.forEach(report => {
      console.log(`  - ${report.name} (점수: ${report.score.toFixed(1)}/5.0)`);
    });
  }

  // 평균 점수
  const avgScore = (reports.reduce((sum, r) => sum + r.score, 0) / reports.length).toFixed(2);
  console.log(`\n평균 점수: ${avgScore}/5.0`);

  // 결과 JSON 저장
  const reportPath = path.join(__dirname, '../../__tests__/reports/statistics-pages-validation.json');
  const reportDir = path.dirname(reportPath);

  if (!fs.existsSync(reportDir)) {
    fs.mkdirSync(reportDir, { recursive: true });
  }

  fs.writeFileSync(reportPath, JSON.stringify({
    timestamp: new Date().toISOString(),
    summary: {
      total: results.total,
      passed: results.passed,
      warnings: results.warnings,
      failed: results.failed,
      avgScore
    },
    reports
  }, null, 2));

  console.log(`\n📄 상세 보고서: __tests__/reports/statistics-pages-validation.json`);
}

main();