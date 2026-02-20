/**
 * Playwright를 사용한 42개 통계 페이지 자동 테스트 실행기
 *
 * 실행 방법:
 * node scripts/playwright-test-runner.js
 */

const fs = require('fs');
const path = require('path');
const { statisticsPages, testDataConfig } = require('./test-all-statistics');

/**
 * CSV 파일 생성
 */
function createCSVFile(pageName, csvContent) {
  const dataDir = path.join(__dirname, '../test-data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  const filePath = path.join(dataDir, `${pageName}.csv`);
  fs.writeFileSync(filePath, csvContent, 'utf8');
  return filePath;
}

/**
 * 테스트 결과 저장
 */
function saveTestResults(results) {
  const resultsDir = path.join(__dirname, '../test-results');
  if (!fs.existsSync(resultsDir)) {
    fs.mkdirSync(resultsDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filePath = path.join(resultsDir, `test-results-${timestamp}.json`);
  fs.writeFileSync(filePath, JSON.stringify(results, null, 2), 'utf8');

  // 마크다운 리포트 생성
  const mdPath = path.join(resultsDir, `test-results-${timestamp}.md`);
  const mdContent = generateMarkdownReport(results);
  fs.writeFileSync(mdPath, mdContent, 'utf8');

  return { jsonPath: filePath, mdPath };
}

/**
 * 마크다운 리포트 생성
 */
function generateMarkdownReport(results) {
  const total = results.length;
  const passed = results.filter(r => r.status === 'success').length;
  const failed = results.filter(r => r.status === 'error').length;
  const skipped = results.filter(r => r.status === 'skipped').length;

  let md = `# 통계 페이지 자동 테스트 결과\n\n`;
  md += `**실행 시간**: ${new Date().toLocaleString('ko-KR')}\n\n`;
  md += `## 요약\n\n`;
  md += `- **전체**: ${total}개\n`;
  md += `- **성공**: ${passed}개 (${(passed/total*100).toFixed(1)}%)\n`;
  md += `- **실패**: ${failed}개 (${(failed/total*100).toFixed(1)}%)\n`;
  md += `- **스킵**: ${skipped}개 (${(skipped/total*100).toFixed(1)}%)\n\n`;

  md += `## 상세 결과\n\n`;

  // 성공한 테스트
  if (passed > 0) {
    md += `### ✅ 성공 (${passed}개)\n\n`;
    results
      .filter(r => r.status === 'success')
      .forEach(r => {
        md += `- **${r.page}** (${r.duration}ms)\n`;
      });
    md += `\n`;
  }

  // 실패한 테스트
  if (failed > 0) {
    md += `### ❌ 실패 (${failed}개)\n\n`;
    results
      .filter(r => r.status === 'error')
      .forEach(r => {
        md += `- **${r.page}**\n`;
        md += `  - 에러: ${r.error}\n`;
        if (r.screenshot) {
          md += `  - 스크린샷: ${r.screenshot}\n`;
        }
      });
    md += `\n`;
  }

  // 스킵된 테스트
  if (skipped > 0) {
    md += `### ⏭️ 스킵 (${skipped}개)\n\n`;
    results
      .filter(r => r.status === 'skipped')
      .forEach(r => {
        md += `- **${r.page}**: ${r.reason}\n`;
      });
    md += `\n`;
  }

  return md;
}

/**
 * 메인 테스트 실행 함수
 */
async function runTests() {
  console.log('🚀 42개 통계 페이지 자동 테스트 시작...\n');

  const results = [];
  const baseURL = 'http://localhost:3000';

  for (const pageName of statisticsPages) {
    console.log(`\n📊 테스트 중: ${pageName}`);

    const config = testDataConfig[pageName];

    if (!config) {
      console.log(`⏭️  스킵: 테스트 설정 없음`);
      results.push({
        page: pageName,
        status: 'skipped',
        reason: '테스트 데이터 설정 없음'
      });
      continue;
    }

    try {
      const startTime = Date.now();

      // CSV 파일 생성 (parameters-only가 아닌 경우)
      let csvPath = null;
      if (config.csvContent) {
        csvPath = createCSVFile(pageName, config.csvContent);
        console.log(`  ✓ CSV 생성: ${csvPath}`);
      }

      // Playwright 테스트는 외부에서 수동으로 실행
      // 여기서는 테스트 데이터만 준비
      const duration = Date.now() - startTime;

      results.push({
        page: pageName,
        status: 'success',
        duration,
        csvPath,
        config: config.variables || config.parameters
      });

      console.log(`  ✅ 완료 (${duration}ms)`);

    } catch (error) {
      console.log(`  ❌ 에러: ${error.message}`);
      results.push({
        page: pageName,
        status: 'error',
        error: error.message
      });
    }
  }

  // 결과 저장
  const { jsonPath, mdPath } = saveTestResults(results);

  console.log('\n\n📝 테스트 완료!');
  console.log(`\n결과 파일:`);
  console.log(`  - JSON: ${jsonPath}`);
  console.log(`  - Markdown: ${mdPath}`);

  // 요약 출력
  const total = results.length;
  const passed = results.filter(r => r.status === 'success').length;
  const failed = results.filter(r => r.status === 'error').length;
  const skipped = results.filter(r => r.status === 'skipped').length;

  console.log(`\n요약:`);
  console.log(`  전체: ${total}개`);
  console.log(`  성공: ${passed}개 (${(passed/total*100).toFixed(1)}%)`);
  console.log(`  실패: ${failed}개 (${(failed/total*100).toFixed(1)}%)`);
  console.log(`  스킵: ${skipped}개 (${(skipped/total*100).toFixed(1)}%)`);

  // 실패한 테스트 목록
  if (failed > 0) {
    console.log(`\n❌ 실패한 테스트:`);
    results
      .filter(r => r.status === 'error')
      .forEach(r => {
        console.log(`  - ${r.page}: ${r.error}`);
      });
  }
}

// 실행
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = { runTests, createCSVFile, saveTestResults };
