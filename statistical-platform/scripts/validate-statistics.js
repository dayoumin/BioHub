#!/usr/bin/env node

/**
 * TESTING_GUIDE 자동 검증 스크립트
 * Group 1-4 통계 페이지 L1-L3 검증 자동화
 */

const path = require('path');
const fs = require('fs');
const http = require('http');

const BASE_URL = 'http://localhost:3000';

// 검증 메타데이터
const STATISTICS = {
  'Group 1: Quick Wins': [
    {
      id: 'anova',
      name: 'ANOVA (분산 분석)',
      path: '/dashboard/statistics/anova',
      expectedElements: ['Dependent', 'Independent', 'Analyze'],
      testData: {
        headers: ['group', 'value'],
        rows: [
          ['A', '10.5'], ['A', '12.3'], ['A', '11.8'],
          ['B', '20.1'], ['B', '21.5'], ['B', '19.9'],
          ['C', '15.2'], ['C', '16.8'], ['C', '15.5']
        ]
      }
    },
    {
      id: 't-test',
      name: 't-test (독립표본 t 검정)',
      path: '/dashboard/statistics/t-test',
      expectedElements: ['Group', 'Value', 'Analyze'],
      testData: {
        headers: ['group', 'value'],
        rows: [
          ['Control', '5.2'], ['Control', '5.5'], ['Control', '4.8'],
          ['Treatment', '7.1'], ['Treatment', '7.5'], ['Treatment', '6.8']
        ]
      }
    },
    {
      id: 'one-sample-t',
      name: 'One-Sample t-test',
      path: '/dashboard/statistics/one-sample-t',
      expectedElements: ['Variable', 'Test Value', 'Analyze'],
      testData: {
        headers: ['value'],
        rows: [
          ['10.5'], ['11.2'], ['10.8'], ['11.5'], ['9.8']
        ]
      }
    },
    {
      id: 'normality-test',
      name: 'Normality Test (정규성 검정)',
      path: '/dashboard/statistics/normality-test',
      expectedElements: ['Variable', 'Analyze'],
      testData: {
        headers: ['value'],
        rows: [
          ['1.2'], ['1.5'], ['1.8'], ['2.1'], ['2.4'],
          ['2.3'], ['2.0'], ['1.9'], ['1.6']
        ]
      }
    },
    {
      id: 'means-plot',
      name: 'Means Plot (평균 플롯)',
      path: '/dashboard/statistics/means-plot',
      expectedElements: ['X-axis', 'Y-axis', 'Analyze'],
      testData: {
        headers: ['group', 'value'],
        rows: [
          ['A', '10'], ['A', '12'],
          ['B', '20'], ['B', '22'],
          ['C', '15'], ['C', '17']
        ]
      }
    },
    {
      id: 'ks-test',
      name: 'KS Test (Kolmogorov-Smirnov)',
      path: '/dashboard/statistics/ks-test',
      expectedElements: ['Variable', 'Test Distribution', 'Analyze'],
      testData: {
        headers: ['value'],
        rows: [
          ['1.2'], ['1.5'], ['1.8'], ['2.1'], ['2.4'],
          ['2.3'], ['2.0'], ['1.9'], ['1.6']
        ]
      }
    }
  ],
  'Group 2: Medium Complexity': [
    {
      id: 'friedman',
      name: 'Friedman Test',
      path: '/dashboard/statistics/friedman',
      expectedElements: ['Subjects', 'Groups', 'Values', 'Analyze'],
      testData: {
        headers: ['subject', 'condition', 'value'],
        rows: [
          ['1', 'A', '5'], ['1', 'B', '7'], ['1', 'C', '6'],
          ['2', 'A', '4'], ['2', 'B', '6'], ['2', 'C', '5'],
          ['3', 'A', '6'], ['3', 'B', '8'], ['3', 'C', '7']
        ]
      }
    },
    {
      id: 'kruskal-wallis',
      name: 'Kruskal-Wallis Test',
      path: '/dashboard/statistics/kruskal-wallis',
      expectedElements: ['Group', 'Value', 'Analyze'],
      testData: {
        headers: ['group', 'value'],
        rows: [
          ['A', '5'], ['A', '4'], ['A', '3'],
          ['B', '10'], ['B', '9'], ['B', '8'],
          ['C', '15'], ['C', '14'], ['C', '13']
        ]
      }
    }
  ],
  'Group 3: Complex Analysis': [
    {
      id: 'mann-kendall',
      name: 'Mann-Kendall Trend Test',
      path: '/dashboard/statistics/mann-kendall',
      expectedElements: ['Time', 'Value', 'Analyze'],
      testData: {
        headers: ['time', 'value'],
        rows: [
          ['1', '10'], ['2', '12'], ['3', '15'], ['4', '18'],
          ['5', '20'], ['6', '22'], ['7', '25']
        ]
      }
    },
    {
      id: 'reliability',
      name: 'Reliability (Cronbach\'s Alpha)',
      path: '/dashboard/statistics/reliability',
      expectedElements: ['Items', 'Analyze'],
      testData: {
        headers: ['item1', 'item2', 'item3', 'item4'],
        rows: [
          ['5', '4', '5', '4'],
          ['4', '4', '4', '3'],
          ['5', '5', '5', '5'],
          ['3', '3', '3', '3'],
          ['4', '5', '4', '5']
        ]
      }
    }
  ],
  'Group 4: Critical Complexity': [
    {
      id: 'regression',
      name: 'Regression (선형/로지스틱 회귀)',
      path: '/dashboard/statistics/regression',
      expectedElements: ['Dependent', 'Independent', 'Method', 'Analyze'],
      testData: {
        headers: ['x', 'y'],
        rows: [
          ['1', '2.5'], ['2', '3.8'], ['3', '5.1'],
          ['4', '6.2'], ['5', '7.8']
        ]
      }
    }
  ]
};

// L1 검증: UI 렌더링 체크
async function validateL1(statistic) {
  console.log(`  [L1] UI 렌더링 체크: ${statistic.name}`);

  try {
    const response = await fetch(`${BASE_URL}${statistic.path}`, {
      method: 'GET',
      timeout: 5000
    });

    if (response.status === 200) {
      const html = await response.text();

      // 필수 엘리먼트 체크
      let allElementsFound = true;
      const missingElements = [];

      for (const element of statistic.expectedElements) {
        if (!html.includes(element)) {
          allElementsFound = false;
          missingElements.push(element);
        }
      }

      if (allElementsFound) {
        console.log(`    ✅ L1 통과: 모든 엘리먼트 발견`);
        return { passed: true, type: 'L1' };
      } else {
        console.log(`    ⚠️ L1 경고: 누락된 엘리먼트 - ${missingElements.join(', ')}`);
        return { passed: false, type: 'L1', missing: missingElements };
      }
    } else {
      console.log(`    ❌ L1 실패: HTTP ${response.status}`);
      return { passed: false, type: 'L1', error: `HTTP ${response.status}` };
    }
  } catch (error) {
    console.log(`    ❌ L1 실패: ${error.message}`);
    return { passed: false, type: 'L1', error: error.message };
  }
}

// 검증 결과 보고서 생성
function generateReport(results) {
  console.log('\n' + '='.repeat(80));
  console.log('📊 통계 페이지 자동 검증 보고서');
  console.log('='.repeat(80) + '\n');

  let totalTests = 0;
  let passedTests = 0;
  const groups = {};

  for (const [groupName, stats] of Object.entries(STATISTICS)) {
    groups[groupName] = { total: stats.length, passed: 0, details: [] };

    for (const stat of stats) {
      totalTests++;
      const result = results[stat.id];

      if (result && result.L1 && result.L1.passed) {
        passedTests++;
        groups[groupName].passed++;
        groups[groupName].details.push(`✅ ${stat.name}`);
      } else {
        const reason = result?.L1?.missing?.join(', ') || result?.L1?.error || '알 수 없는 오류';
        groups[groupName].details.push(`❌ ${stat.name} (${reason})`);
      }
    }
  }

  // 그룹별 결과
  for (const [groupName, groupData] of Object.entries(groups)) {
    console.log(`\n${groupName}`);
    console.log(`상태: ${groupData.passed}/${groupData.total} 통과`);
    console.log('-'.repeat(60));
    for (const detail of groupData.details) {
      console.log(`  ${detail}`);
    }
  }

  // 최종 요약
  console.log('\n' + '='.repeat(80));
  console.log(`📈 최종 결과: ${passedTests}/${totalTests} 통과 (${Math.round(passedTests/totalTests*100)}%)`);
  console.log('='.repeat(80) + '\n');

  // 상세 보고서 저장
  const reportPath = path.join(__dirname, '../VALIDATION_REPORT.json');
  fs.writeFileSync(reportPath, JSON.stringify({
    timestamp: new Date().toISOString(),
    summary: {
      total: totalTests,
      passed: passedTests,
      percentage: Math.round(passedTests/totalTests*100)
    },
    groups,
    details: results
  }, null, 2));

  console.log(`📄 상세 보고서: ${reportPath}`);
}

// 메인 실행
async function main() {
  console.log('🚀 TESTING_GUIDE 자동 검증 시작...\n');

  const results = {};

  for (const [groupName, statistics] of Object.entries(STATISTICS)) {
    console.log(`\n${groupName} 검증 중...\n`);

    for (const stat of statistics) {
      console.log(`▶️ ${stat.name}`);

      const l1Result = await validateL1(stat);
      results[stat.id] = { L1: l1Result };

      console.log();
    }
  }

  // 보고서 생성
  generateReport(results);
}

// 실행
main().catch(console.error);