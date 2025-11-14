/**
 * Quick Smoke Test for 42 Statistics Pages
 *
 * 각 페이지가 에러 없이 로딩되는지만 확인
 * 소요 시간: ~5분 (42페이지 × 7초)
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const statisticsPages = [
  'ancova', 'anova', 'binomial-test', 'chi-square', 'chi-square-goodness',
  'chi-square-independence', 'cluster', 'cochran-q', 'correlation', 'descriptive',
  'discriminant', 'dose-response', 'explore-data', 'factor-analysis', 'friedman',
  'kruskal-wallis', 'ks-test', 'mann-kendall', 'mann-whitney', 'manova',
  'mcnemar', 'means-plot', 'mixed-model', 'mood-median', 'non-parametric',
  'normality-test', 'one-sample-t', 'ordinal-regression', 'partial-correlation',
  'pca', 'poisson', 'power-analysis', 'proportion-test', 'regression',
  'reliability', 'response-surface', 'runs-test', 'sign-test', 'stepwise',
  't-test', 'welch-t', 'wilcoxon'
];

const baseURL = 'http://localhost:3000';

async function testPage(browser, pageName) {
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  });
  const page = await context.newPage();

  const result = {
    page: pageName,
    url: `${baseURL}/statistics/${pageName}`,
    status: 'unknown',
    loadTime: 0,
    error: null,
    screenshot: null,
    hasDataUpload: false,
    hasAnalyzeButton: false
  };

  try {
    const startTime = Date.now();

    // 페이지 이동 (10초 타임아웃)
    await page.goto(result.url, {
      waitUntil: 'networkidle',
      timeout: 10000
    });

    result.loadTime = Date.now() - startTime;

    // "데이터 업로드" 텍스트 확인
    const hasDataUpload = await page.locator('text=/데이터 업로드|Data Upload/i').count() > 0;
    result.hasDataUpload = hasDataUpload;

    // "분석" 버튼 확인 (존재하지 않을 수 있음)
    const hasAnalyzeButton = await page.locator('button:has-text("분석")').count() > 0;
    result.hasAnalyzeButton = hasAnalyzeButton;

    // 콘솔 에러 수집
    const consoleErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // 스크린샷 저장
    const screenshotDir = path.join(__dirname, '../test-screenshots');
    if (!fs.existsSync(screenshotDir)) {
      fs.mkdirSync(screenshotDir, { recursive: true });
    }

    const screenshotPath = path.join(screenshotDir, `${pageName}.png`);
    await page.screenshot({
      path: screenshotPath,
      fullPage: false
    });
    result.screenshot = screenshotPath;

    // 2초 대기 (React 렌더링 완료)
    await page.waitForTimeout(2000);

    // 에러 페이지 확인
    const hasError = await page.locator('text=/에러|error|오류/i').count() > 0;

    if (hasError || consoleErrors.length > 0) {
      result.status = 'warning';
      result.error = consoleErrors.join('; ') || '페이지에 에러 메시지 표시됨';
    } else {
      result.status = 'success';
    }

  } catch (error) {
    result.status = 'error';
    result.error = error.message;
  } finally {
    await context.close();
  }

  return result;
}

async function runQuickSmokeTest() {
  console.log('🚀 Quick Smoke Test 시작...\n');
  console.log(`📊 테스트 대상: ${statisticsPages.length}개 페이지\n`);

  const browser = await chromium.launch({
    headless: true
  });

  const results = [];
  let successCount = 0;
  let warningCount = 0;
  let errorCount = 0;

  for (let i = 0; i < statisticsPages.length; i++) {
    const pageName = statisticsPages[i];
    const pageNum = i + 1;

    console.log(`[${pageNum}/${statisticsPages.length}] 테스트 중: ${pageName}`);

    const result = await testPage(browser, pageName);
    results.push(result);

    if (result.status === 'success') {
      console.log(`  ✅ 성공 (${result.loadTime}ms)`);
      successCount++;
    } else if (result.status === 'warning') {
      console.log(`  ⚠️  경고: ${result.error}`);
      warningCount++;
    } else {
      console.log(`  ❌ 실패: ${result.error}`);
      errorCount++;
    }

    console.log(`  - 데이터 업로드: ${result.hasDataUpload ? '✓' : '✗'}`);
    console.log(`  - 분석 버튼: ${result.hasAnalyzeButton ? '✓' : '✗'}`);
    console.log('');
  }

  await browser.close();

  // 결과 저장
  const resultsDir = path.join(__dirname, '../test-results');
  if (!fs.existsSync(resultsDir)) {
    fs.mkdirSync(resultsDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const jsonPath = path.join(resultsDir, `smoke-test-${timestamp}.json`);
  fs.writeFileSync(jsonPath, JSON.stringify(results, null, 2));

  // 마크다운 리포트 생성
  const mdPath = path.join(resultsDir, `smoke-test-${timestamp}.md`);
  const mdContent = generateMarkdownReport(results, successCount, warningCount, errorCount);
  fs.writeFileSync(mdPath, mdContent);

  // 요약 출력
  console.log('\n' + '='.repeat(60));
  console.log('📝 테스트 완료!\n');
  console.log(`✅ 성공: ${successCount}개 (${(successCount/statisticsPages.length*100).toFixed(1)}%)`);
  console.log(`⚠️  경고: ${warningCount}개 (${(warningCount/statisticsPages.length*100).toFixed(1)}%)`);
  console.log(`❌ 실패: ${errorCount}개 (${(errorCount/statisticsPages.length*100).toFixed(1)}%)`);
  console.log('\n결과 파일:');
  console.log(`  - JSON: ${jsonPath}`);
  console.log(`  - Markdown: ${mdPath}`);
  console.log('='.repeat(60));

  // 실패한 페이지 목록
  if (errorCount > 0) {
    console.log('\n❌ 실패한 페이지:');
    results
      .filter(r => r.status === 'error')
      .forEach(r => {
        console.log(`  - ${r.page}: ${r.error}`);
      });
  }

  // 경고 페이지 목록
  if (warningCount > 0) {
    console.log('\n⚠️  경고가 있는 페이지:');
    results
      .filter(r => r.status === 'warning')
      .forEach(r => {
        console.log(`  - ${r.page}: ${r.error}`);
      });
  }
}

function generateMarkdownReport(results, successCount, warningCount, errorCount) {
  const total = results.length;

  let md = '# Quick Smoke Test 결과\n\n';
  md += `**실행 시간**: ${new Date().toLocaleString('ko-KR')}\n\n`;
  md += '## 요약\n\n';
  md += `- **전체**: ${total}개\n`;
  md += `- **성공**: ${successCount}개 (${(successCount/total*100).toFixed(1)}%)\n`;
  md += `- **경고**: ${warningCount}개 (${(warningCount/total*100).toFixed(1)}%)\n`;
  md += `- **실패**: ${errorCount}개 (${(errorCount/total*100).toFixed(1)}%)\n\n`;

  md += '## 상세 결과\n\n';
  md += '| # | 페이지 | 상태 | 로딩시간 | 데이터업로드 | 분석버튼 | 비고 |\n';
  md += '|---|--------|------|----------|-------------|---------|------|\n';

  results.forEach((r, i) => {
    const statusIcon = r.status === 'success' ? '✅' : r.status === 'warning' ? '⚠️' : '❌';
    const dataUploadIcon = r.hasDataUpload ? '✓' : '✗';
    const analyzeButtonIcon = r.hasAnalyzeButton ? '✓' : '✗';
    const note = r.error || '-';

    md += `| ${i+1} | ${r.page} | ${statusIcon} | ${r.loadTime}ms | ${dataUploadIcon} | ${analyzeButtonIcon} | ${note} |\n`;
  });

  md += '\n## 스크린샷\n\n';
  md += '모든 페이지의 스크린샷이 `test-screenshots/` 디렉토리에 저장되었습니다.\n\n';

  if (errorCount > 0) {
    md += '## ❌ 실패한 페이지\n\n';
    results
      .filter(r => r.status === 'error')
      .forEach(r => {
        md += `- **${r.page}**: ${r.error}\n`;
      });
    md += '\n';
  }

  if (warningCount > 0) {
    md += '## ⚠️ 경고가 있는 페이지\n\n';
    results
      .filter(r => r.status === 'warning')
      .forEach(r => {
        md += `- **${r.page}**: ${r.error}\n`;
      });
    md += '\n';
  }

  return md;
}

// 실행
if (require.main === module) {
  runQuickSmokeTest()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('테스트 실행 중 오류:', error);
      process.exit(1);
    });
}

module.exports = { runQuickSmokeTest };
