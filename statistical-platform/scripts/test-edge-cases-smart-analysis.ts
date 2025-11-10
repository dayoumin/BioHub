/**
 * 스마트 분석 엔진 엣지 케이스 테스트
 * Issue #1 (결측치 비율) & Issue #2 (시계열 감지) 검증
 */

import { SmartAnalysisEngine, DataColumn } from '../lib/smart-analysis-engine'

console.log('='.repeat(80))
console.log('🧪 스마트 분석 엔진 엣지 케이스 테스트')
console.log('='.repeat(80))

// ============================================================================
// Test Suite 1: 결측치 비율 계산 엣지 케이스
// ============================================================================
console.log('\n📊 Test Suite 1: 결측치 비율 계산\n')

const missingRateTests = [
  {
    name: '테스트 1-1: totalCount 명시 (30% 결측)',
    columns: [{
      name: '키',
      type: 'numeric' as const,
      sampleValues: [170, 175, 180],
      missingCount: 30,
      uniqueCount: 100,
      totalCount: 100  // 명시
    }],
    expected: '30%'
  },
  {
    name: '테스트 1-2: totalCount 없음 (샘플 기반 추정)',
    columns: [{
      name: '키',
      type: 'numeric' as const,
      sampleValues: [170, 175, 180],  // 3개 샘플
      missingCount: 30,
      uniqueCount: 100
      // totalCount 없음 → 3 + 30 = 33으로 추정
    }],
    expected: '91%'  // 30/33 = 91%
  },
  {
    name: '테스트 1-3: 결측치 0개',
    columns: [{
      name: '키',
      type: 'numeric' as const,
      sampleValues: [170, 175, 180],
      missingCount: 0,
      uniqueCount: 100,
      totalCount: 100
    }],
    expected: 'no warning'
  },
  {
    name: '테스트 1-4: 전체 데이터 결측 (100%)',
    columns: [{
      name: '키',
      type: 'numeric' as const,
      sampleValues: [],
      missingCount: 100,
      uniqueCount: 0,
      totalCount: 100
    }],
    expected: '100%'
  },
  {
    name: '테스트 1-5: totalCount = 0 (엣지 케이스)',
    columns: [{
      name: '키',
      type: 'numeric' as const,
      sampleValues: [],
      missingCount: 0,
      uniqueCount: 0,
      totalCount: 0
    }],
    expected: 'no warning'  // missingRate = 0 (0 나누기 방지)
  }
]

missingRateTests.forEach(test => {
  console.log(`\n${test.name}`)
  const recommendations = SmartAnalysisEngine.recommendAnalyses(test.columns)
  const warnings = recommendations.flatMap(r => r.assumptions.filter(a => a.startsWith('⚠️')))

  if (test.expected === 'no warning') {
    if (warnings.length === 0) {
      console.log(`✅ 통과: 경고 없음`)
    } else {
      console.log(`❌ 실패: 경고가 있어야 함 - ${warnings.join(', ')}`)
    }
  } else {
    const expectedWarning = `⚠️ 키: 결측치가 ${test.expected}로 높습니다`
    const found = warnings.some(w => w.includes(test.expected))

    if (found) {
      console.log(`✅ 통과: ${expectedWarning}`)
    } else {
      console.log(`❌ 실패: 예상 "${test.expected}", 실제 ${warnings.length > 0 ? warnings[0] : '경고 없음'}`)
    }
  }
})

// ============================================================================
// Test Suite 2: 시계열 감지 엣지 케이스
// ============================================================================
console.log('\n\n📈 Test Suite 2: 시계열 감지\n')

const timeSeriesTests = [
  {
    name: '테스트 2-1: "시간" (단독) → 시계열 O',
    columns: [
      { name: '시간', type: 'categorical' as const, sampleValues: ['09:00', '10:00'], missingCount: 0, uniqueCount: 24 },
      { name: '온도', type: 'numeric' as const, sampleValues: [20, 25], missingCount: 0, uniqueCount: 100 }
    ],
    expectTimeSeries: true
  },
  {
    name: '테스트 2-2: "공부시간" → 시계열 X',
    columns: [
      { name: '공부시간', type: 'numeric' as const, sampleValues: [1, 2, 3], missingCount: 0, uniqueCount: 10 },
      { name: '성적', type: 'numeric' as const, sampleValues: [70, 80, 90], missingCount: 0, uniqueCount: 50 }
    ],
    expectTimeSeries: false
  },
  {
    name: '테스트 2-3: "시간_축" → 시계열 O',
    columns: [
      { name: '시간_축', type: 'categorical' as const, sampleValues: ['2024-01', '2024-02'], missingCount: 0, uniqueCount: 12 },
      { name: '매출', type: 'numeric' as const, sampleValues: [1000, 1200], missingCount: 0, uniqueCount: 100 }
    ],
    expectTimeSeries: true
  },
  {
    name: '테스트 2-4: "공부_시간" (numeric) → 시계열 X',
    columns: [
      { name: '공부_시간', type: 'numeric' as const, sampleValues: [1, 2, 3], missingCount: 0, uniqueCount: 10 },
      { name: '집중도', type: 'numeric' as const, sampleValues: [70, 80, 90], missingCount: 0, uniqueCount: 100 }
    ],
    expectTimeSeries: false
  },
  {
    name: '테스트 2-5: "시간대" → 시계열 X',
    columns: [
      { name: '시간대', type: 'categorical' as const, sampleValues: ['오전', '오후'], missingCount: 0, uniqueCount: 2 },
      { name: '매출', type: 'numeric' as const, sampleValues: [1000, 1200], missingCount: 0, uniqueCount: 100 }
    ],
    expectTimeSeries: false
  },
  {
    name: '테스트 2-6: "날짜" → 시계열 O',
    columns: [
      { name: '날짜', type: 'categorical' as const, sampleValues: ['2024-01-01', '2024-01-02'], missingCount: 0, uniqueCount: 365 },
      { name: '방문자', type: 'numeric' as const, sampleValues: [100, 150], missingCount: 0, uniqueCount: 1000 }
    ],
    expectTimeSeries: true
  },
  {
    name: '테스트 2-7: "년도" → 시계열 O (includes "년")',
    columns: [
      { name: '년도', type: 'categorical' as const, sampleValues: ['2022', '2023', '2024'], missingCount: 0, uniqueCount: 10 },
      { name: 'GDP', type: 'numeric' as const, sampleValues: [1000, 1100, 1200], missingCount: 0, uniqueCount: 100 }
    ],
    expectTimeSeries: true
  },
  {
    name: '테스트 2-8: "time_series" (categorical) → 시계열 O',
    columns: [
      { name: 'time_series', type: 'categorical' as const, sampleValues: ['t1', 't2'], missingCount: 0, uniqueCount: 100 },
      { name: 'value', type: 'numeric' as const, sampleValues: [10, 20], missingCount: 0, uniqueCount: 100 }
    ],
    expectTimeSeries: true
  },
  {
    name: '테스트 2-9: "study_time" (numeric) → 시계열 X',
    columns: [
      { name: 'study_time', type: 'numeric' as const, sampleValues: [1, 2, 3, 4, 5], missingCount: 0, uniqueCount: 10 },
      { name: 'score', type: 'numeric' as const, sampleValues: [70, 75, 80, 85, 90], missingCount: 0, uniqueCount: 50 }
    ],
    expectTimeSeries: false
  },
  {
    name: '테스트 2-10: "response_time" (numeric) → 시계열 X',
    columns: [
      { name: 'response_time', type: 'numeric' as const, sampleValues: [100, 150, 120], missingCount: 0, uniqueCount: 100 },
      { name: 'user_id', type: 'categorical' as const, sampleValues: ['A', 'B', 'C'], missingCount: 0, uniqueCount: 100 }
    ],
    expectTimeSeries: false
  },
  {
    name: '테스트 2-11: "측정_시간" (categorical) → 시계열 O',
    columns: [
      { name: '측정_시간', type: 'categorical' as const, sampleValues: ['09:00', '10:00', '11:00'], missingCount: 0, uniqueCount: 24 },
      { name: '온도', type: 'numeric' as const, sampleValues: [20, 22, 25], missingCount: 0, uniqueCount: 100 }
    ],
    expectTimeSeries: true
  }
]

timeSeriesTests.forEach(test => {
  console.log(`\n${test.name}`)
  const recommendations = SmartAnalysisEngine.recommendAnalyses(test.columns)
  const hasTimeSeries = recommendations.some(r => r.method === '시계열 분석')

  if (hasTimeSeries === test.expectTimeSeries) {
    console.log(`✅ 통과: 시계열 ${test.expectTimeSeries ? '추천됨' : '추천 안 됨'}`)
  } else {
    console.log(`❌ 실패: 예상 ${test.expectTimeSeries ? '추천' : '추천 안 함'}, 실제 ${hasTimeSeries ? '추천됨' : '추천 안 됨'}`)
    if (hasTimeSeries) {
      const timeSeriesRec = recommendations.find(r => r.method === '시계열 분석')
      console.log(`   → 사용된 컬럼: ${timeSeriesRec?.requiredColumns.join(', ')}`)
    }
  }
})

// ============================================================================
// 요약
// ============================================================================
console.log('\n\n' + '='.repeat(80))
console.log('📋 테스트 결과 요약')
console.log('='.repeat(80))

console.log('\n✅ 모든 엣지 케이스 테스트 완료')
console.log('\n💡 개선 사항:')
console.log('   • numeric 타입 + "_time" 패턴은 시계열에서 제외')
console.log('   • "study_time", "response_time" 같은 지표는 시계열로 분류되지 않음')
console.log('   • "측정_시간" (categorical)은 여전히 시계열로 인정')
console.log('   • 시계열 컬럼은 categorical 또는 text 타입만 허용\n')
