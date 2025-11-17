#!/usr/bin/env node
/**
 * 각 통계 페이지가 올바른 Worker 메서드를 호출하는지 검증
 * - Worker 파일에서 사용 가능한 메서드 목록 추출
 * - 각 페이지에서 호출하는 메서드 추출
 * - 매핑 유효성 검증
 */
const fs = require('fs');
const path = require('path');

const STATISTICS_PAGES = [
  'ancova', 'anova', 'binomial-test', 'chi-square', 'chi-square-goodness',
  'chi-square-independence', 'cluster', 'cochran-q', 'correlation',
  'descriptive', 'discriminant', 'dose-response', 'explore-data',
  'factor-analysis', 'friedman', 'kruskal-wallis', 'ks-test',
  'mann-kendall', 'mann-whitney', 'manova', 'mcnemar', 'means-plot',
  'mixed-model', 'mood-median', 'non-parametric', 'normality-test',
  'one-sample-t', 'ordinal-regression', 'partial-correlation', 'pca',
  'poisson', 'power-analysis', 'proportion-test', 'regression',
  'reliability', 'response-surface', 'runs-test', 'sign-test',
  'stepwise', 't-test', 'welch-t', 'wilcoxon'
];

// Worker 파일 경로
const WORKER_FILES = [
  'public/workers/python/comparison_worker.py',
  'public/workers/python/regression_worker.py',
  'public/workers/python/nonparametric_worker.py',
  'public/workers/python/multivariate_worker.py',
];

// 컬러 출력
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
};

function colorize(text, color) {
  return `${colors[color]}${text}${colors.reset}`;
}

/**
 * Worker 파일들에서 사용 가능한 메서드 추출
 */
function extractWorkerMethods() {
  const methodsByWorker = {};
  const allMethods = new Set();

  WORKER_FILES.forEach(file => {
    const filePath = path.join(__dirname, '..', file);
    const workerName = path.basename(file, '.py');

    if (!fs.existsSync(filePath)) {
      console.warn(colorize(`⚠️  Worker file not found: ${file}`, 'yellow'));
      return;
    }

    const content = fs.readFileSync(filePath, 'utf-8');

    // Python 함수 정의 패턴: def calculate_xxx( 또는 def analyze_xxx(
    const methodRegex = /def\s+(calculate_\w+|analyze_\w+|perform_\w+|run_\w+)\s*\(/g;
    const matches = [...content.matchAll(methodRegex)];

    const methods = matches.map(m => m[1]);

    methodsByWorker[workerName] = methods;
    methods.forEach(m => allMethods.add(m));
  });

  return {
    byWorker: methodsByWorker,
    all: Array.from(allMethods).sort(),
  };
}

/**
 * 페이지에서 호출하는 Worker 메서드 추출
 */
function extractPageWorkerCalls(pageName) {
  const pagePath = path.join(__dirname, `../app/(dashboard)/statistics/${pageName}/page.tsx`);

  if (!fs.existsSync(pagePath)) {
    return {
      success: false,
      error: 'File not found',
      pageName,
      methods: [],
    };
  }

  const content = fs.readFileSync(pagePath, 'utf-8');

  // callWorkerMethod<ReturnType>('method_name') 패턴
  const callPatterns = [
    /callWorkerMethod<[^>]+>\s*\(\s*['"`]([^'"`]+)['"`]/g,
    /executePython\s*\(\s*['"`]([^'"`]+)['"`]/g,
    /pyodideCore\.call\s*\(\s*['"`]([^'"`]+)['"`]/g,
  ];

  const calledMethods = new Set();

  callPatterns.forEach(pattern => {
    const matches = [...content.matchAll(pattern)];
    matches.forEach(m => calledMethods.add(m[1]));
  });

  return {
    success: true,
    pageName,
    methods: Array.from(calledMethods),
    usesWorker: calledMethods.size > 0,
  };
}

/**
 * 메인 검증 로직
 */
function main() {
  console.log(colorize('🔍 Starting Worker Method Mapping Validation...', 'cyan'));
  console.log('');

  // 1. Worker 메서드 추출
  console.log(colorize('📦 Step 1: Extracting Worker Methods', 'blue'));
  const workerMethods = extractWorkerMethods();

  console.log(colorize(`✅ Found ${workerMethods.all.length} total methods across ${WORKER_FILES.length} workers`, 'green'));
  console.log('');

  // Worker별 메서드 출력
  console.log(colorize('📊 Methods by Worker:', 'cyan'));
  Object.entries(workerMethods.byWorker).forEach(([worker, methods]) => {
    console.log(colorize(`\n   ${worker} (${methods.length} methods):`, 'blue'));
    methods.forEach(method => console.log(`     - ${method}`));
  });
  console.log('');

  // 2. 페이지별 Worker 호출 추출
  console.log(colorize('📄 Step 2: Analyzing Page Worker Calls', 'blue'));
  const pageResults = STATISTICS_PAGES.map(extractPageWorkerCalls);

  const withWorker = pageResults.filter(r => r.success && r.usesWorker);
  const withoutWorker = pageResults.filter(r => r.success && !r.usesWorker);
  const errors = pageResults.filter(r => !r.success);

  console.log(colorize(`✅ Pages with Worker: ${withWorker.length}`, 'green'));
  console.log(colorize(`⚠️  Pages without Worker: ${withoutWorker.length}`, 'yellow'));
  console.log(colorize(`❌ Errors: ${errors.length}`, errors.length > 0 ? 'red' : 'green'));
  console.log('');

  // 3. 매핑 검증
  console.log(colorize('🔗 Step 3: Validating Method Mappings', 'blue'));
  const validMappings = [];
  const invalidMappings = [];

  withWorker.forEach(({ pageName, methods }) => {
    methods.forEach(method => {
      const isValid = workerMethods.all.includes(method);
      const mapping = { pageName, method, isValid };

      if (isValid) {
        validMappings.push(mapping);
      } else {
        invalidMappings.push(mapping);
      }
    });
  });

  console.log(colorize(`✅ Valid mappings: ${validMappings.length}`, 'green'));
  console.log(colorize(`❌ Invalid mappings: ${invalidMappings.length}`, invalidMappings.length > 0 ? 'red' : 'green'));
  console.log('');

  // 잘못된 매핑 출력
  if (invalidMappings.length > 0) {
    console.log(colorize('❌ INVALID MAPPINGS:', 'red'));
    invalidMappings.forEach(({ pageName, method }) => {
      console.log(colorize(`   ${pageName} → ${method} (NOT FOUND)`, 'red'));
    });
    console.log('');
  }

  // Worker 미사용 페이지 출력
  if (withoutWorker.length > 0) {
    console.log(colorize('⚠️  PAGES WITHOUT WORKER CALLS:', 'yellow'));
    console.log(colorize('   (These may use direct calculations or be data tools)', 'yellow'));
    withoutWorker.forEach(({ pageName }) => {
      console.log(`   - ${pageName}`);
    });
    console.log('');
  }

  // 4. Worker 메서드 사용 통계
  console.log(colorize('📊 Worker Method Usage Statistics:', 'cyan'));
  const methodUsage = validMappings.reduce((acc, { method }) => {
    acc[method] = (acc[method] || 0) + 1;
    return acc;
  }, {});

  const sortedUsage = Object.entries(methodUsage)
    .sort((a, b) => b[1] - a[1]);

  sortedUsage.forEach(([method, count]) => {
    const bar = '█'.repeat(Math.min(count, 20));
    console.log(`   ${method.padEnd(40)} ${colorize(bar, 'green')} ${count}`);
  });
  console.log('');

  // 5. 미사용 Worker 메서드
  const usedMethods = new Set(validMappings.map(m => m.method));
  const unusedMethods = workerMethods.all.filter(m => !usedMethods.has(m));

  if (unusedMethods.length > 0) {
    console.log(colorize('🔍 UNUSED WORKER METHODS:', 'magenta'));
    console.log(colorize('   (These methods exist in workers but are not called by any page)', 'yellow'));
    unusedMethods.forEach(method => console.log(`   - ${method}`));
    console.log('');
  }

  // 6. 리포트 생성
  const reportPath = path.join(__dirname, '../test-results/worker-mapping.json');
  const reportDir = path.dirname(reportPath);

  if (!fs.existsSync(reportDir)) {
    fs.mkdirSync(reportDir, { recursive: true });
  }

  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      totalPages: STATISTICS_PAGES.length,
      pagesWithWorker: withWorker.length,
      pagesWithoutWorker: withoutWorker.length,
      totalWorkerMethods: workerMethods.all.length,
      validMappings: validMappings.length,
      invalidMappings: invalidMappings.length,
      unusedMethods: unusedMethods.length,
    },
    workerMethods: workerMethods.byWorker,
    pageResults,
    invalidMappings,
    unusedMethods,
    methodUsage,
  };

  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(colorize(`📄 Report saved to: ${reportPath}`, 'cyan'));
  console.log('');

  // 7. 최종 결과
  console.log(colorize('=' .repeat(60), 'blue'));
  console.log(colorize('📋 FINAL SUMMARY', 'cyan'));
  console.log(colorize('=' .repeat(60), 'blue'));
  console.log(colorize(`Total Pages: ${STATISTICS_PAGES.length}`, 'blue'));
  console.log(colorize(`Pages with Worker: ${withWorker.length} (${((withWorker.length/STATISTICS_PAGES.length)*100).toFixed(1)}%)`, 'green'));
  console.log(colorize(`Valid Mappings: ${validMappings.length}`, validMappings.length > 0 ? 'green' : 'yellow'));
  console.log(colorize(`Invalid Mappings: ${invalidMappings.length}`, invalidMappings.length === 0 ? 'green' : 'red'));
  console.log(colorize(`Unused Worker Methods: ${unusedMethods.length}`, unusedMethods.length === 0 ? 'green' : 'yellow'));
  console.log('');

  // Exit code
  if (invalidMappings.length > 0 || errors.length > 0) {
    console.log(colorize('❌ Validation FAILED', 'red'));
    process.exit(1);
  } else {
    console.log(colorize('✅ All worker mappings are valid!', 'green'));
    process.exit(0);
  }
}

// 실행
main();
