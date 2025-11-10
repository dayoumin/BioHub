/**
 * 스마트 분석 엔진 시뮬레이션 테스트
 * 여러 데이터 시나리오에서 AI 추천이 적절한지 검증
 */

import { SmartAnalysisEngine, DataColumn, AnalysisRecommendation } from '../lib/smart-analysis-engine'

// 테스트 시나리오 정의
interface TestScenario {
  name: string
  description: string
  columns: DataColumn[]
  researchQuestion?: string
  expectedMethods: string[]
  expectedConfidence: 'high' | 'medium' | 'low'
}

const scenarios: TestScenario[] = [
  // 시나리오 1: 두 그룹 비교 (t-test)
  {
    name: '시나리오 1: 두 그룹 비교',
    description: '남자와 여자의 키 차이 분석',
    columns: [
      {
        name: '키',
        type: 'numeric',
        sampleValues: [165, 170, 175, 180, 160],
        missingCount: 0,
        uniqueCount: 50
      },
      {
        name: '성별',
        type: 'categorical',
        sampleValues: ['남', '여'],
        missingCount: 0,
        uniqueCount: 2
      }
    ],
    researchQuestion: '남자와 여자의 키에 차이가 있나요?',
    expectedMethods: ['독립표본 t-검정'],
    expectedConfidence: 'high'
  },

  // 시나리오 2: 여러 그룹 비교 (ANOVA)
  {
    name: '시나리오 2: 여러 그룹 비교',
    description: 'A, B, C 반의 성적 차이 분석',
    columns: [
      {
        name: '성적',
        type: 'numeric',
        sampleValues: [85, 90, 78, 92, 88],
        missingCount: 0,
        uniqueCount: 100
      },
      {
        name: '반',
        type: 'categorical',
        sampleValues: ['A반', 'B반', 'C반'],
        missingCount: 0,
        uniqueCount: 3
      }
    ],
    researchQuestion: '반별로 성적에 차이가 있나요?',
    expectedMethods: ['일원분산분석'],
    expectedConfidence: 'high'
  },

  // 시나리오 3: 상관분석
  {
    name: '시나리오 3: 두 변수 관계',
    description: '키와 몸무게의 관계 분석',
    columns: [
      {
        name: '키',
        type: 'numeric',
        sampleValues: [165, 170, 175, 180, 160],
        missingCount: 0,
        uniqueCount: 50
      },
      {
        name: '몸무게',
        type: 'numeric',
        sampleValues: [55, 60, 70, 75, 50],
        missingCount: 0,
        uniqueCount: 50
      }
    ],
    researchQuestion: '키와 몸무게는 관련이 있나요?',
    expectedMethods: ['상관분석'],
    expectedConfidence: 'high'
  },

  // 시나리오 4: 회귀분석 (예측)
  {
    name: '시나리오 4: 예측 모델',
    description: '공부시간으로 성적 예측',
    columns: [
      {
        name: '공부시간',
        type: 'numeric',
        sampleValues: [1, 2, 3, 4, 5],
        missingCount: 0,
        uniqueCount: 30
      },
      {
        name: '성적',
        type: 'numeric',
        sampleValues: [60, 70, 75, 85, 90],
        missingCount: 0,
        uniqueCount: 40
      }
    ],
    researchQuestion: '공부시간으로 성적을 예측할 수 있나요?',
    expectedMethods: ['단순선형회귀'],
    expectedConfidence: 'high' // '예측' 키워드로 신뢰도 상승
  },

  // 시나리오 5: 복잡한 케이스 (여러 변수)
  {
    name: '시나리오 5: 복합 분석',
    description: '여러 수치형 + 범주형 변수',
    columns: [
      {
        name: '나이',
        type: 'numeric',
        sampleValues: [25, 30, 35, 40, 45],
        missingCount: 0,
        uniqueCount: 50
      },
      {
        name: '수입',
        type: 'numeric',
        sampleValues: [3000, 4000, 5000, 6000, 7000],
        missingCount: 0,
        uniqueCount: 60
      },
      {
        name: '만족도',
        type: 'numeric',
        sampleValues: [3, 4, 5, 4, 3],
        missingCount: 0,
        uniqueCount: 5
      },
      {
        name: '직업',
        type: 'categorical',
        sampleValues: ['사무직', '기술직', '서비스직'],
        missingCount: 0,
        uniqueCount: 3
      }
    ],
    researchQuestion: '직업별로 수입에 차이가 있나요?',
    expectedMethods: ['일원분산분석', '상관분석'],
    expectedConfidence: 'high'
  },

  // 시나리오 6: 단일 수치형 변수 (기술통계만)
  {
    name: '시나리오 6: 단일 변수 분석',
    description: '학생들의 평균 키',
    columns: [
      {
        name: '키',
        type: 'numeric',
        sampleValues: [165, 170, 175, 180, 160],
        missingCount: 0,
        uniqueCount: 50
      }
    ],
    expectedMethods: ['기술통계량'],
    expectedConfidence: 'high'
  },

  // 시나리오 7: 비모수 검정 필요 (소수 그룹)
  {
    name: '시나리오 7: 그룹 수 많음 (5개 이상)',
    description: '5개 지역의 소득 차이',
    columns: [
      {
        name: '소득',
        type: 'numeric',
        sampleValues: [3000, 4000, 5000, 3500, 4500],
        missingCount: 0,
        uniqueCount: 100
      },
      {
        name: '지역',
        type: 'categorical',
        sampleValues: ['서울', '부산', '대구', '인천', '광주'],
        missingCount: 0,
        uniqueCount: 5
      }
    ],
    researchQuestion: '지역별로 소득 차이가 있나요?',
    expectedMethods: ['일원분산분석'],
    expectedConfidence: 'high'
  },

  // 시나리오 8: 다중회귀분석
  {
    name: '시나리오 8: 다변량 분석',
    description: '광고비, 가격, 계절이 매출에 미치는 영향',
    columns: [
      {
        name: '광고비',
        type: 'numeric',
        sampleValues: [100, 200, 150, 300, 250],
        missingCount: 0,
        uniqueCount: 50
      },
      {
        name: '가격',
        type: 'numeric',
        sampleValues: [10000, 12000, 11000, 13000, 11500],
        missingCount: 0,
        uniqueCount: 40
      },
      {
        name: '계절점수',
        type: 'numeric',
        sampleValues: [1, 2, 3, 4, 2],
        missingCount: 0,
        uniqueCount: 4
      },
      {
        name: '매출',
        type: 'numeric',
        sampleValues: [5000, 6000, 5500, 7000, 6200],
        missingCount: 0,
        uniqueCount: 60
      }
    ],
    researchQuestion: '여러 요인이 매출에 영향을 주나요?',
    expectedMethods: ['다중선형회귀'],
    expectedConfidence: 'high'
  },

  // 시나리오 9: 이원분산분석
  {
    name: '시나리오 9: 2개 요인 분석',
    description: '성별과 연령대가 점수에 미치는 영향',
    columns: [
      {
        name: '점수',
        type: 'numeric',
        sampleValues: [85, 90, 78, 92, 88],
        missingCount: 0,
        uniqueCount: 100
      },
      {
        name: '성별',
        type: 'categorical',
        sampleValues: ['남', '여'],
        missingCount: 0,
        uniqueCount: 2
      },
      {
        name: '연령대',
        type: 'categorical',
        sampleValues: ['20대', '30대', '40대'],
        missingCount: 0,
        uniqueCount: 3
      }
    ],
    researchQuestion: '성별과 연령대가 함께 점수에 영향을 주나요?',
    expectedMethods: ['이원분산분석'],
    expectedConfidence: 'high'
  },

  // 시나리오 10: 시계열 분석
  {
    name: '시나리오 10: 시계열 데이터',
    description: '월별 매출 트렌드',
    columns: [
      {
        name: '날짜',
        type: 'categorical',
        sampleValues: ['2024-01', '2024-02', '2024-03', '2024-04', '2024-05'],
        missingCount: 0,
        uniqueCount: 12
      },
      {
        name: '매출',
        type: 'numeric',
        sampleValues: [1000, 1200, 1150, 1300, 1250],
        missingCount: 0,
        uniqueCount: 12
      }
    ],
    researchQuestion: '시간에 따라 매출이 어떻게 변하나요?',
    expectedMethods: ['시계열 분석'],
    expectedConfidence: 'medium'
  },

  // 시나리오 11: 데이터 품질 문제 (결측치)
  {
    name: '시나리오 11: 결측치 많음',
    description: '결측치 30%인 데이터 (전체 100행 중 30개 결측)',
    columns: [
      {
        name: '키',
        type: 'numeric',
        sampleValues: [165, 170, 175],
        missingCount: 30,  // 30개 결측
        uniqueCount: 50,
        totalCount: 100    // 전체 행 수 명시
      },
      {
        name: '몸무게',
        type: 'numeric',
        sampleValues: [55, 60, 70],
        missingCount: 5,
        uniqueCount: 50,
        totalCount: 100    // 전체 행 수 명시
      }
    ],
    expectedMethods: ['기술통계량', '상관분석'],
    expectedConfidence: 'high'
  }
]

// 테스트 실행 함수
function runTest(scenario: TestScenario): {
  passed: boolean
  recommendations: AnalysisRecommendation[]
  issues: string[]
} {
  const issues: string[] = []

  console.log(`\n${'='.repeat(80)}`)
  console.log(`📊 ${scenario.name}`)
  console.log(`설명: ${scenario.description}`)
  console.log(`변수: ${scenario.columns.map(c => `${c.name}(${c.type})`).join(', ')}`)
  if (scenario.researchQuestion) {
    console.log(`연구질문: ${scenario.researchQuestion}`)
  }
  console.log(`${'='.repeat(80)}`)

  // AI 추천 실행
  const recommendations = SmartAnalysisEngine.recommendAnalyses(
    scenario.columns,
    scenario.researchQuestion
  )

  console.log(`\n🤖 AI 추천 결과 (총 ${recommendations.length}개):`)
  recommendations.forEach((rec, index) => {
    console.log(`\n${index + 1}. ${rec.title}`)
    console.log(`   방법: ${rec.method}`)
    console.log(`   신뢰도: ${rec.confidence}`)
    console.log(`   설명: ${rec.easyDescription}`)
    console.log(`   필요 변수: ${rec.requiredColumns.join(', ')}`)
    console.log(`   가정: ${rec.assumptions.join(', ')}`)
  })

  // 검증: 기대한 방법이 추천되었는가?
  const recommendedMethods = recommendations.map(r => r.method)
  const hasExpectedMethod = scenario.expectedMethods.some(expected =>
    recommendedMethods.includes(expected)
  )

  if (!hasExpectedMethod) {
    issues.push(
      `❌ 기대한 방법 [${scenario.expectedMethods.join(', ')}]이 추천되지 않음. ` +
      `실제 추천: [${recommendedMethods.join(', ')}]`
    )
  } else {
    console.log(`\n✅ 기대한 방법이 추천됨: ${scenario.expectedMethods.join(', ')}`)
  }

  // 검증: 신뢰도가 적절한가? (기대한 방법의 신뢰도 확인)
  const expectedRecommendations = recommendations.filter(r =>
    scenario.expectedMethods.includes(r.method)
  )

  if (expectedRecommendations.length > 0) {
    const expectedRec = expectedRecommendations[0]
    if (expectedRec.confidence !== scenario.expectedConfidence) {
      issues.push(
        `⚠️ 신뢰도 불일치: 기대값=${scenario.expectedConfidence}, ` +
        `실제값=${expectedRec.confidence} (방법: ${expectedRec.method})`
      )
    }
  }

  // 검증: 추천이 비어있지 않은가?
  if (recommendations.length === 0) {
    issues.push(`❌ 추천 결과가 없음 (최소 1개 이상 필요)`)
  }

  // 검증: 필수 필드가 모두 있는가?
  recommendations.forEach((rec, index) => {
    if (!rec.title || !rec.method || !rec.easyDescription) {
      issues.push(`❌ 추천 ${index + 1}번에 필수 필드 누락`)
    }
  })

  const passed = issues.length === 0

  if (passed) {
    console.log(`\n✅ 테스트 통과`)
  } else {
    console.log(`\n❌ 테스트 실패 (${issues.length}개 이슈)`)
    issues.forEach(issue => console.log(`   ${issue}`))
  }

  return { passed, recommendations, issues }
}

// 모든 테스트 실행
function runAllTests() {
  console.log(`\n${'*'.repeat(80)}`)
  console.log(`🧪 스마트 분석 엔진 시뮬레이션 테스트 시작`)
  console.log(`총 ${scenarios.length}개 시나리오 테스트`)
  console.log(`${'*'.repeat(80)}`)

  const results = scenarios.map(scenario => ({
    scenario: scenario.name,
    ...runTest(scenario)
  }))

  // 요약 리포트
  console.log(`\n\n${'*'.repeat(80)}`)
  console.log(`📋 테스트 결과 요약`)
  console.log(`${'*'.repeat(80)}`)

  const passCount = results.filter(r => r.passed).length
  const failCount = results.filter(r => !r.passed).length

  console.log(`\n✅ 통과: ${passCount}/${scenarios.length}`)
  console.log(`❌ 실패: ${failCount}/${scenarios.length}`)

  if (failCount > 0) {
    console.log(`\n⚠️ 실패한 시나리오:`)
    results.filter(r => !r.passed).forEach(result => {
      console.log(`\n- ${result.scenario}`)
      result.issues.forEach(issue => console.log(`  ${issue}`))
    })
  }

  // 전체 개선 사항 도출
  console.log(`\n\n${'*'.repeat(80)}`)
  console.log(`💡 개선 사항 제안`)
  console.log(`${'*'.repeat(80)}`)

  const improvements: string[] = []

  // 1. 중복 추천 체크
  results.forEach(result => {
    const methods = result.recommendations.map(r => r.method)
    const uniqueMethods = new Set(methods)
    if (methods.length !== uniqueMethods.size) {
      improvements.push(`${result.scenario}: 중복된 방법 추천됨`)
    }
  })

  // 2. 추천 개수 체크
  const avgRecommendations = results.reduce((sum, r) => sum + r.recommendations.length, 0) / results.length
  console.log(`\n평균 추천 개수: ${avgRecommendations.toFixed(1)}개`)
  if (avgRecommendations > 5) {
    improvements.push(`추천 개수가 너무 많음 (평균 ${avgRecommendations.toFixed(1)}개). 상위 3-5개로 제한 권장`)
  }

  // 3. 신뢰도 분포 체크
  const confidenceDistribution = results.flatMap(r => r.recommendations.map(rec => rec.confidence))
  const highCount = confidenceDistribution.filter(c => c === 'high').length
  const mediumCount = confidenceDistribution.filter(c => c === 'medium').length
  const lowCount = confidenceDistribution.filter(c => c === 'low').length

  console.log(`\n신뢰도 분포:`)
  console.log(`  High: ${highCount}`)
  console.log(`  Medium: ${mediumCount}`)
  console.log(`  Low: ${lowCount}`)

  if (lowCount > highCount) {
    improvements.push(`신뢰도가 낮은 추천이 너무 많음. 알고리즘 개선 필요`)
  }

  // 개선 사항 출력
  if (improvements.length > 0) {
    console.log(`\n발견된 이슈:`)
    improvements.forEach((improvement, index) => {
      console.log(`${index + 1}. ${improvement}`)
    })
  } else {
    console.log(`\n✅ 발견된 이슈 없음`)
  }

  // 최종 결론
  console.log(`\n\n${'*'.repeat(80)}`)
  console.log(`🎯 최종 결론`)
  console.log(`${'*'.repeat(80)}`)

  if (passCount === scenarios.length && improvements.length === 0) {
    console.log(`\n✅ 모든 테스트 통과! 스마트 분석 엔진이 정상 작동합니다.`)
  } else if (passCount >= scenarios.length * 0.8) {
    console.log(`\n⚠️ 대부분 통과했으나 일부 개선 필요 (통과율: ${(passCount/scenarios.length*100).toFixed(0)}%)`)
  } else {
    console.log(`\n❌ 심각한 문제 발견. 엔진 수정 필요 (통과율: ${(passCount/scenarios.length*100).toFixed(0)}%)`)
  }

  console.log(`\n${'*'.repeat(80)}\n`)

  return {
    passCount,
    failCount,
    improvements,
    results
  }
}

// 실행
runAllTests()

export { runAllTests, scenarios }