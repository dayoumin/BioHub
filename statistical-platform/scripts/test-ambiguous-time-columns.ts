/**
 * 애매한 시간 관련 컬럼명 테스트
 * "공부_시간", "study_time" 같은 변수명이 시계열로 오인되는지 확인
 */

import { SmartAnalysisEngine, DataColumn } from '../lib/smart-analysis-engine'

console.log('='.repeat(80))
console.log('🧪 애매한 시간 컬럼명 테스트')
console.log('='.repeat(80))

const ambiguousTests = [
  {
    name: 'study_time (영문 언더스코어)',
    columns: [
      { name: 'study_time', type: 'numeric' as const, sampleValues: [1, 2, 3, 4, 5], missingCount: 0, uniqueCount: 10 },
      { name: 'score', type: 'numeric' as const, sampleValues: [70, 75, 80, 85, 90], missingCount: 0, uniqueCount: 50 }
    ],
    description: '공부한 시간(hours) → 수치형 변수, 시계열 아님'
  },
  {
    name: '공부_시간 (한글 언더스코어)',
    columns: [
      { name: '공부_시간', type: 'numeric' as const, sampleValues: [1, 2, 3, 4, 5], missingCount: 0, uniqueCount: 10 },
      { name: '성적', type: 'numeric' as const, sampleValues: [70, 75, 80, 85, 90], missingCount: 0, uniqueCount: 50 }
    ],
    description: '공부한 시간(hours) → 수치형 변수, 시계열 아님'
  },
  {
    name: 'working_time (일반 지표)',
    columns: [
      { name: 'working_time', type: 'numeric' as const, sampleValues: [8, 9, 10, 8, 7], missingCount: 0, uniqueCount: 5 },
      { name: 'productivity', type: 'numeric' as const, sampleValues: [80, 85, 90, 82, 75], missingCount: 0, uniqueCount: 50 }
    ],
    description: '근무 시간(hours) → 수치형 변수, 시계열 아님'
  },
  {
    name: 'response_time (응답 시간)',
    columns: [
      { name: 'response_time', type: 'numeric' as const, sampleValues: [100, 150, 120, 200, 180], missingCount: 0, uniqueCount: 100 },
      { name: 'user_id', type: 'categorical' as const, sampleValues: ['A', 'B', 'C'], missingCount: 0, uniqueCount: 100 }
    ],
    description: '응답 시간(ms) → 수치형 변수, 시계열 아님'
  },
  {
    name: '측정_시간 (실제 시계열)',
    columns: [
      { name: '측정_시간', type: 'categorical' as const, sampleValues: ['09:00', '10:00', '11:00'], missingCount: 0, uniqueCount: 24 },
      { name: '온도', type: 'numeric' as const, sampleValues: [20, 22, 25], missingCount: 0, uniqueCount: 100 }
    ],
    description: '측정한 시간(timestamp) → 범주형, 시계열 O'
  },
  {
    name: 'time_stamp (실제 시계열)',
    columns: [
      { name: 'time_stamp', type: 'categorical' as const, sampleValues: ['2024-01-01 09:00', '2024-01-01 10:00'], missingCount: 0, uniqueCount: 1000 },
      { name: 'temperature', type: 'numeric' as const, sampleValues: [20, 22], missingCount: 0, uniqueCount: 100 }
    ],
    description: '타임스탬프 → 범주형, 시계열 O'
  }
]

console.log('\n')

ambiguousTests.forEach(test => {
  console.log(`테스트: ${test.name}`)
  console.log(`  설명: ${test.description}`)

  const recommendations = SmartAnalysisEngine.recommendAnalyses(test.columns)
  const hasTimeSeries = recommendations.some(r => r.method === '시계열 분석')

  console.log(`  시계열 추천: ${hasTimeSeries ? '✅ YES' : '❌ NO'}`)

  if (hasTimeSeries) {
    const timeSeriesRec = recommendations.find(r => r.method === '시계열 분석')
    console.log(`  사용 컬럼: ${timeSeriesRec?.requiredColumns[0]}`)
  }

  console.log()
})

console.log('='.repeat(80))
console.log('📋 분석 결과')
console.log('='.repeat(80))
console.log('')
console.log('현재 로직의 한계:')
console.log('  1. endsWith("_time") → "study_time", "working_time" 모두 매칭')
console.log('  2. endsWith("_시간") → "공부_시간", "측정_시간" 모두 매칭')
console.log('  3. 컬럼 타입(numeric vs categorical)을 구분하지 않음')
console.log('')
console.log('개선 방향:')
console.log('  • 시계열 컬럼은 보통 categorical 또는 text 타입')
console.log('  • numeric 타입 + "_time"은 지표일 가능성 높음')
console.log('  • 데이터 타입 필터 추가 고려')
console.log('')
