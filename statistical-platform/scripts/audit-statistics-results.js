/**
 * 43개 통계 페이지 결과 표시 현황 자동 점검 스크립트
 *
 * 점검 항목:
 * 1. StatisticsTable 사용 여부
 * 2. 공통 컴포넌트 사용 (PValueBadge, EffectSizeCard, etc.)
 * 3. 가정 검정 표시 여부
 * 4. 사후검정 표시 여부
 * 5. 시각화 차트 종류
 * 6. 효과크기 표시 여부
 */

const fs = require('fs');
const path = require('path');

const STATISTICS_DIR = path.join(__dirname, '../app/(dashboard)/statistics');

// 점검할 패턴들
const PATTERNS = {
  statisticsTable: /StatisticsTable/,
  pValueBadge: /PValueBadge/,
  effectSizeCard: /EffectSizeCard/,
  confidenceInterval: /ConfidenceIntervalDisplay|신뢰구간|CI|confidenceInterval/i,
  assumptionTest: /AssumptionTestCard|가정\s*검정|정규성|등분산|Shapiro|Levene|normalityTest|homogeneityTest/i,
  postHoc: /사후검정|post\s*hoc|tukey|bonferroni|scheffe|dunn|nemenyi/i,
  effectSize: /효과\s*크기|effect\s*size|cohen|eta.*squared|omega.*squared|cramér|phi/i,

  // 시각화
  barChart: /BarChart|ResponsiveContainer.*Bar/,
  lineChart: /LineChart/,
  scatterChart: /ScatterChart/,
  boxPlot: /BoxPlot/,
  histogram: /Histogram|히스토그램/,
  qqPlot: /QQ.*Plot|Q-Q/i,
  heatmap: /Heatmap|히트맵/i,

  // 문제 패턴
  anyType: /:\s*any\b/,
  directTable: /<table\s/i,
};

// 검정 유형별 필수 항목
const REQUIRED_BY_TYPE = {
  't-test': ['assumptionTest', 'effectSize', 'confidenceInterval'],
  'anova': ['assumptionTest', 'effectSize', 'postHoc'],
  'regression': ['effectSize', 'confidenceInterval'],
  'correlation': ['effectSize', 'confidenceInterval'],
  'chi-square': ['effectSize'],
  'non-parametric': ['effectSize'],
};

function analyzeFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const pageName = path.basename(path.dirname(filePath));

  const result = {
    page: pageName,
    components: {
      statisticsTable: PATTERNS.statisticsTable.test(content),
      pValueBadge: PATTERNS.pValueBadge.test(content),
      effectSizeCard: PATTERNS.effectSizeCard.test(content),
      confidenceInterval: PATTERNS.confidenceInterval.test(content),
      assumptionTest: PATTERNS.assumptionTest.test(content),
      postHoc: PATTERNS.postHoc.test(content),
      effectSize: PATTERNS.effectSize.test(content),
    },
    charts: {
      barChart: PATTERNS.barChart.test(content),
      lineChart: PATTERNS.lineChart.test(content),
      scatterChart: PATTERNS.scatterChart.test(content),
      boxPlot: PATTERNS.boxPlot.test(content),
      histogram: PATTERNS.histogram.test(content),
      qqPlot: PATTERNS.qqPlot.test(content),
      heatmap: PATTERNS.heatmap.test(content),
    },
    issues: {
      anyType: PATTERNS.anyType.test(content),
      directTable: PATTERNS.directTable.test(content) && !PATTERNS.statisticsTable.test(content),
    },
    lineCount: content.split('\n').length,
  };

  // 차트 개수 계산
  result.chartCount = Object.values(result.charts).filter(Boolean).length;

  // 점수 계산 (10점 만점)
  let score = 0;
  if (result.components.statisticsTable) score += 2;
  if (result.components.effectSize) score += 2;
  if (result.components.confidenceInterval) score += 1;
  if (result.components.assumptionTest) score += 2;
  if (result.components.postHoc) score += 1;
  if (result.chartCount > 0) score += 1;
  if (!result.issues.anyType) score += 0.5;
  if (!result.issues.directTable) score += 0.5;

  result.score = score;

  return result;
}

function main() {
  const results = [];

  // 모든 통계 페이지 스캔
  const dirs = fs.readdirSync(STATISTICS_DIR);

  for (const dir of dirs) {
    const pageFile = path.join(STATISTICS_DIR, dir, 'page.tsx');
    if (fs.existsSync(pageFile)) {
      results.push(analyzeFile(pageFile));
    }
  }

  // 점수순 정렬
  results.sort((a, b) => a.score - b.score);

  // 요약 통계
  const summary = {
    total: results.length,
    withStatisticsTable: results.filter(r => r.components.statisticsTable).length,
    withEffectSize: results.filter(r => r.components.effectSize).length,
    withAssumptionTest: results.filter(r => r.components.assumptionTest).length,
    withPostHoc: results.filter(r => r.components.postHoc).length,
    withConfidenceInterval: results.filter(r => r.components.confidenceInterval).length,
    withAnyType: results.filter(r => r.issues.anyType).length,
    withDirectTable: results.filter(r => r.issues.directTable).length,
    avgScore: (results.reduce((sum, r) => sum + r.score, 0) / results.length).toFixed(2),
  };

  // 결과 출력
  console.log('\n========================================');
  console.log('📊 43개 통계 페이지 결과 표시 현황 점검');
  console.log('========================================\n');

  console.log('📈 요약 통계:');
  console.log(`  총 페이지: ${summary.total}개`);
  console.log(`  StatisticsTable 사용: ${summary.withStatisticsTable}개 (${(summary.withStatisticsTable/summary.total*100).toFixed(0)}%)`);
  console.log(`  효과크기 표시: ${summary.withEffectSize}개 (${(summary.withEffectSize/summary.total*100).toFixed(0)}%)`);
  console.log(`  가정검정 포함: ${summary.withAssumptionTest}개 (${(summary.withAssumptionTest/summary.total*100).toFixed(0)}%)`);
  console.log(`  사후검정 포함: ${summary.withPostHoc}개 (${(summary.withPostHoc/summary.total*100).toFixed(0)}%)`);
  console.log(`  신뢰구간 표시: ${summary.withConfidenceInterval}개 (${(summary.withConfidenceInterval/summary.total*100).toFixed(0)}%)`);
  console.log(`  평균 점수: ${summary.avgScore}/10`);
  console.log('');

  // 문제 페이지
  console.log('⚠️  문제 페이지:');
  console.log(`  any 타입 사용: ${summary.withAnyType}개`);
  console.log(`  직접 <table> 사용: ${summary.withDirectTable}개`);
  console.log('');

  // 개선 필요 페이지 (점수 5점 미만)
  const needsImprovement = results.filter(r => r.score < 5);
  console.log(`\n🔧 개선 필요 페이지 (점수 5점 미만): ${needsImprovement.length}개`);
  console.log('─'.repeat(70));
  console.log('페이지명'.padEnd(30) + '점수'.padEnd(8) + 'StatTable'.padEnd(12) + '효과크기'.padEnd(10) + '가정검정');
  console.log('─'.repeat(70));

  for (const r of needsImprovement) {
    const st = r.components.statisticsTable ? '✅' : '❌';
    const es = r.components.effectSize ? '✅' : '❌';
    const at = r.components.assumptionTest ? '✅' : '❌';
    console.log(`${r.page.padEnd(30)}${r.score.toFixed(1).padEnd(8)}${st.padEnd(12)}${es.padEnd(10)}${at}`);
  }

  // 우수 페이지 (점수 8점 이상)
  const excellent = results.filter(r => r.score >= 8);
  console.log(`\n✨ 우수 페이지 (점수 8점 이상): ${excellent.length}개`);
  console.log('─'.repeat(70));

  for (const r of excellent.slice(0, 10)) {
    console.log(`  ${r.page}: ${r.score.toFixed(1)}/10`);
  }

  // JSON 파일로 저장
  const outputPath = path.join(__dirname, '../docs/statistics-audit-results.json');
  fs.writeFileSync(outputPath, JSON.stringify({ summary, results }, null, 2));
  console.log(`\n📁 상세 결과 저장: docs/statistics-audit-results.json`);

  // 우선순위별 개선 목록
  console.log('\n\n========================================');
  console.log('🎯 개선 우선순위 목록');
  console.log('========================================\n');

  // 1순위: StatisticsTable 미사용 + 직접 table 사용
  const priority1 = results.filter(r => !r.components.statisticsTable && r.issues.directTable);
  console.log(`1순위 (Critical) - StatisticsTable 미사용 + 직접 <table>: ${priority1.length}개`);
  priority1.forEach(r => console.log(`  - ${r.page}`));

  // 2순위: StatisticsTable만 미사용
  const priority2 = results.filter(r => !r.components.statisticsTable && !r.issues.directTable);
  console.log(`\n2순위 (High) - StatisticsTable 미사용: ${priority2.length}개`);
  priority2.forEach(r => console.log(`  - ${r.page}`));

  // 3순위: 가정검정 누락 (t-test, ANOVA 계열)
  const priority3 = results.filter(r =>
    !r.components.assumptionTest &&
    (r.page.includes('test') || r.page.includes('anova'))
  );
  console.log(`\n3순위 (Medium) - 가정검정 누락 (t-test/ANOVA): ${priority3.length}개`);
  priority3.forEach(r => console.log(`  - ${r.page}`));

  // 4순위: 효과크기 누락
  const priority4 = results.filter(r => !r.components.effectSize && r.score >= 3);
  console.log(`\n4순위 (Low) - 효과크기 누락: ${priority4.length}개`);
  priority4.forEach(r => console.log(`  - ${r.page}`));
}

main();
