/**
 * Reasoning 키워드 검증 스크립트 (Phase 4-v1.2)
 *
 * 목적:
 * - AI 추천 시 reasoning에 expectedReasoningKeywords가 포함되는지 검증
 * - 큐레이션 데이터셋 기반 정확도 측정
 *
 * 실행: npx tsx scripts/validate-reasoning-keywords.ts
 */

import { DecisionTreeRecommender } from '../lib/services/decision-tree-recommender'
import type { AnalysisPurpose, AIRecommendation } from '../types/smart-flow'

/**
 * 큐레이션 테스트 케이스 (교과서 데이터셋)
 */
interface CuratedTestCase {
  name: string
  source: string
  purpose: AnalysisPurpose
  expectedMethod: string
  expectedReasoningKeywords: string[] // ✅ Phase 4 신규 필드
  description: string
}

const CURATED_TEST_CASES: CuratedTestCase[] = [
  {
    name: 'Fisher Iris (1936)',
    source: 'sklearn.datasets',
    purpose: 'compare',
    expectedMethod: 'one-way-anova',
    expectedReasoningKeywords: ['3개', 'species', '정규성', '등분산성'],
    description: '3종의 붓꽃 꽃잎 크기 비교 (ANOVA 교과서 예제)'
  },
  {
    name: 'Student Sleep Data',
    source: 'R datasets',
    purpose: 'compare',
    expectedMethod: 'paired-t-test',
    expectedReasoningKeywords: ['대응표본', 'paired', 'ID', '전후'],
    description: '수면제 전후 수면 시간 비교 (대응표본 t-검정)'
  },
  {
    name: 'mtcars (Motor Trend)',
    source: 'R datasets',
    purpose: 'relationship',
    expectedMethod: 'pearson-correlation',
    expectedReasoningKeywords: ['상관', 'correlation', '선형', '정규성'],
    description: '자동차 연비와 무게 간 상관관계'
  },
  {
    name: 'Two Independent Groups',
    source: 'synthetic',
    purpose: 'compare',
    expectedMethod: 'independent-t-test',
    expectedReasoningKeywords: ['2개 그룹', '독립', '정규성', '등분산성'],
    description: '두 독립 그룹 비교 (t-검정)'
  },
  {
    name: 'Non-normal Data',
    source: 'synthetic',
    purpose: 'compare',
    expectedMethod: 'mann-whitney',
    expectedReasoningKeywords: ['비모수', '순위', '정규성 위배'],
    description: '정규성 위배 시 비모수 검정'
  }
]

/**
 * Reasoning 키워드 검증 로직
 */
function validateReasoningKeywords(
  recommendation: AIRecommendation,
  expectedKeywords: string[]
): {
  passed: boolean
  missingKeywords: string[]
  foundKeywords: string[]
} {
  const reasoningText = recommendation.reasoning.join(' ').toLowerCase()

  const foundKeywords: string[] = []
  const missingKeywords: string[] = []

  for (const keyword of expectedKeywords) {
    const normalizedKeyword = keyword.toLowerCase()
    if (reasoningText.includes(normalizedKeyword)) {
      foundKeywords.push(keyword)
    } else {
      missingKeywords.push(keyword)
    }
  }

  // 50% 이상의 키워드가 포함되면 통과
  const passed = foundKeywords.length >= expectedKeywords.length * 0.5

  return { passed, missingKeywords, foundKeywords }
}

/**
 * Mock 데이터 생성 (실제 추천 테스트용)
 * 테스트 케이스별로 적절한 데이터 구조 생성
 */
function generateMockData(testCase: CuratedTestCase): {
  assumptionResults: any
  validationResults: any
  data: any[]
} {
  const methodId = testCase.expectedMethod

  // 기본 assumption results (정규성 + 등분산성 만족)
  let assumptionResults: any = {
    normality: {
      shapiroWilk: {
        statistic: 0.95,
        pValue: 0.15,
        isNormal: true
      }
    },
    homogeneity: {
      levene: {
        statistic: 1.2,
        pValue: 0.25,
        equalVariance: true
      }
    }
  }

  let validationResults: any
  let data: any[]

  // 테스트 케이스별 데이터 생성
  switch (methodId) {
    case 'one-way-anova':
      // Fisher Iris: 3개 그룹 (species)
      validationResults = {
        isValid: true,
        totalRows: 150,
        columnCount: 2,
        missingValues: 0,
        duplicateRows: 0,
        dataType: 'numeric',
        variables: ['species', 'petal_length'],
        errors: [],
        warnings: [],
        columns: [
          { name: 'species', type: 'categorical' as const, numericCount: 0, textCount: 150, missingCount: 0, uniqueValues: 3 },
          { name: 'petal_length', type: 'numeric' as const, numericCount: 150, textCount: 0, missingCount: 0, uniqueValues: 150, mean: 3.76, std: 1.76 }
        ]
      }
      data = [
        ...Array.from({ length: 50 }, (_, i) => ({ species: 'setosa', petal_length: 1.4 + Math.random() * 0.5 })),
        ...Array.from({ length: 50 }, (_, i) => ({ species: 'versicolor', petal_length: 4.2 + Math.random() * 0.8 })),
        ...Array.from({ length: 50 }, (_, i) => ({ species: 'virginica', petal_length: 5.5 + Math.random() * 1.0 }))
      ]
      break

    case 'paired-t-test':
      // Student Sleep Data: 대응표본 (ID 반복 - 각 ID가 2행씩)
      validationResults = {
        isValid: true,
        totalRows: 20,
        columnCount: 2,
        missingValues: 0,
        duplicateRows: 0,
        dataType: 'numeric',
        variables: ['Subject', 'sleep_hours'],
        errors: [],
        warnings: [],
        columns: [
          { name: 'Subject', type: 'categorical' as const, numericCount: 0, textCount: 20, missingCount: 0, uniqueValues: 10 },
          { name: 'sleep_hours', type: 'numeric' as const, numericCount: 20, textCount: 0, missingCount: 0, uniqueValues: 20, mean: 6.3, std: 2.0 }
        ]
      }
      // 10명의 피험자, 각 2회 측정 (전후)
      data = [
        ...Array.from({ length: 10 }, (_, i) => ({
          Subject: `P${i + 1}`,
          sleep_hours: 5 + Math.random() * 2  // before: 5~7시간
        })),
        ...Array.from({ length: 10 }, (_, i) => ({
          Subject: `P${i + 1}`,
          sleep_hours: 7 + Math.random() * 3  // after: 7~10시간
        }))
      ]
      break

    case 'pearson-correlation':
      // mtcars: 연속형 변수 간 상관관계
      validationResults = {
        isValid: true,
        totalRows: 32,
        columnCount: 2,
        missingValues: 0,
        duplicateRows: 0,
        dataType: 'numeric',
        variables: ['mpg', 'wt'],
        errors: [],
        warnings: [],
        columns: [
          { name: 'mpg', type: 'numeric' as const, numericCount: 32, textCount: 0, missingCount: 0, uniqueValues: 32, mean: 20.1, std: 6.0 },
          { name: 'wt', type: 'numeric' as const, numericCount: 32, textCount: 0, missingCount: 0, uniqueValues: 32, mean: 3.2, std: 0.98 }
        ]
      }
      data = Array.from({ length: 32 }, (_, i) => ({
        mpg: 15 + Math.random() * 15,
        wt: 2 + Math.random() * 3
      }))
      break

    case 'independent-t-test':
      // 두 독립 그룹
      validationResults = {
        isValid: true,
        totalRows: 100,
        columnCount: 2,
        missingValues: 0,
        duplicateRows: 0,
        dataType: 'numeric',
        variables: ['group', 'value'],
        errors: [],
        warnings: [],
        columns: [
          { name: 'group', type: 'categorical' as const, numericCount: 0, textCount: 100, missingCount: 0, uniqueValues: 2 },
          { name: 'value', type: 'numeric' as const, numericCount: 100, textCount: 0, missingCount: 0, uniqueValues: 100, mean: 50, std: 10 }
        ]
      }
      data = Array.from({ length: 100 }, (_, i) => ({
        group: i < 50 ? 'A' : 'B',
        value: 50 + Math.random() * 10
      }))
      break

    case 'mann-whitney':
      // 비모수 검정: 정규성 위배
      assumptionResults = {
        normality: {
          shapiroWilk: {
            statistic: 0.82,
            pValue: 0.01, // ❌ 정규성 위배
            isNormal: false
          }
        },
        homogeneity: {
          levene: {
            statistic: 1.2,
            pValue: 0.25,
            equalVariance: true
          }
        }
      }
      validationResults = {
        isValid: true,
        totalRows: 100,
        columnCount: 2,
        missingValues: 0,
        duplicateRows: 0,
        dataType: 'numeric',
        variables: ['group', 'value'],
        errors: [],
        warnings: [],
        columns: [
          { name: 'group', type: 'categorical' as const, numericCount: 0, textCount: 100, missingCount: 0, uniqueValues: 2 },
          { name: 'value', type: 'numeric' as const, numericCount: 100, textCount: 0, missingCount: 0, uniqueValues: 100, mean: 50, std: 10 }
        ]
      }
      data = Array.from({ length: 100 }, (_, i) => ({
        group: i < 50 ? 'A' : 'B',
        value: 50 + Math.random() * 10
      }))
      break

    default:
      // 기본 2그룹 데이터
      validationResults = {
        isValid: true,
        totalRows: 100,
        columnCount: 2,
        missingValues: 0,
        duplicateRows: 0,
        dataType: 'numeric',
        variables: ['group', 'value'],
        errors: [],
        warnings: [],
        columns: [
          { name: 'group', type: 'categorical' as const, numericCount: 0, textCount: 100, missingCount: 0, uniqueValues: 2 },
          { name: 'value', type: 'numeric' as const, numericCount: 100, textCount: 0, missingCount: 0, uniqueValues: 100, mean: 50, std: 10 }
        ]
      }
      data = Array.from({ length: 100 }, (_, i) => ({
        group: i < 50 ? 'A' : 'B',
        value: 50 + Math.random() * 10
      }))
  }

  return { assumptionResults, validationResults, data }
}

/**
 * 메인 검증 함수
 */
async function validateReasoningAccuracy() {
  console.log('🧪 Reasoning 키워드 검증 시작...\n')

  let totalCases = 0
  let keywordFieldCount = 0
  let methodMatchCount = 0
  let reasoningKeywordMatchCount = 0

  for (const testCase of CURATED_TEST_CASES) {
    totalCases++

    console.log(`\n📋 [${testCase.name}]`)
    console.log(`   목적: ${testCase.purpose}`)
    console.log(`   예상 메서드: ${testCase.expectedMethod}`)
    console.log(`   큐레이션 키워드: ${testCase.expectedReasoningKeywords.join(', ')}`)

    // ✅ 실제 DecisionTreeRecommender 호출
    const { assumptionResults, validationResults, data } = generateMockData(testCase)

    let recommendation: AIRecommendation
    try {
      recommendation = DecisionTreeRecommender.recommend(
        testCase.purpose,
        assumptionResults,
        validationResults,
        data
      )
    } catch (error) {
      console.log(`   ❌ 추천 실패: ${error}`)
      continue
    }

    console.log(`   실제 추천: ${recommendation.method.id}`)

    // ✅ Level 1 검증: expectedReasoningKeywords 필드 존재 확인 (핵심 검증)
    if (recommendation.expectedReasoningKeywords && recommendation.expectedReasoningKeywords.length > 0) {
      keywordFieldCount++
      console.log(`   ✅ [필수] expectedReasoningKeywords 존재: [${recommendation.expectedReasoningKeywords.join(', ')}]`)
    } else {
      console.log(`   ❌ [필수] expectedReasoningKeywords 필드 없음 또는 비어있음`)
    }

    // ✅ 메서드 일치 확인
    if (recommendation.method.id === testCase.expectedMethod) {
      methodMatchCount++
      console.log(`   ✅ 메서드 일치`)
    } else {
      console.log(`   ⚠️  메서드 불일치 (예상: ${testCase.expectedMethod})`)
    }

    // ℹ️ Level 2 검증: reasoning 텍스트에 큐레이션 키워드 포함 여부 (참고용)
    const curatedValidation = validateReasoningKeywords(
      recommendation,
      testCase.expectedReasoningKeywords
    )

    if (curatedValidation.passed) {
      reasoningKeywordMatchCount++
      console.log(`   ℹ️  [참고] reasoning 텍스트 키워드 ${curatedValidation.foundKeywords.length}/${testCase.expectedReasoningKeywords.length}개 포함`)
    } else {
      console.log(`   ℹ️  [참고] reasoning 텍스트 키워드 부족: ${curatedValidation.foundKeywords.length}/${testCase.expectedReasoningKeywords.length}개`)
      if (curatedValidation.foundKeywords.length > 0) {
        console.log(`        발견: ${curatedValidation.foundKeywords.join(', ')}`)
      }
    }

    console.log(`   실제 reasoning: ${recommendation.reasoning.slice(0, 2).join(' / ')}`)
  }

  console.log(`\n\n📊 결과 요약`)
  console.log(`──────────────────────────────────────────────`)
  console.log(`총 테스트: ${totalCases}`)

  const level1Passed = keywordFieldCount === totalCases
  const level2Passed = methodMatchCount === totalCases
  const level3Threshold = Math.ceil(totalCases * 0.6)
  const level3Passed = reasoningKeywordMatchCount >= level3Threshold

  console.log(`\n[Level 1 - 필수] expectedReasoningKeywords 필드 존재`)
  console.log(
    `  ${level1Passed ? '✅' : '❌'} ${keywordFieldCount}/${totalCases} (${(
      (keywordFieldCount / totalCases) *
      100
    ).toFixed(1)}%)`
  )

  console.log(`\n[Level 2 - 필수] 추천 메서드 정확도`)
  console.log(
    `  ${level2Passed ? '✅' : '❌'} ${methodMatchCount}/${totalCases} (${(
      (methodMatchCount / totalCases) *
      100
    ).toFixed(1)}%)`
  )

  console.log(`\n[Level 3 - 권장] reasoning 텍스트 키워드 포함`)
  console.log(
    `  ${level3Passed ? '✅' : '⚠️'} ${reasoningKeywordMatchCount}/${totalCases} (${(
      (reasoningKeywordMatchCount / totalCases) *
      100
    ).toFixed(1)}%) · 목표: ${level3Threshold}개 이상`
  )
  console.log(`──────────────────────────────────────────────`)

  if (level1Passed && level2Passed) {
    if (level3Passed) {
      console.log(`\n✅ Phase 4 완전 달성! 🎉`)
    } else {
      console.log(`\n⚠️  Phase 4 기본 목표 달성 (Level 3 개선 권장)`)
    }
    return true
  }

  console.log(`\n❌ Phase 4 기본 목표 미달성: Level 1, 2 모두 충족되어야 합니다.`)
  return false

}

// 스크립트 실행
if (require.main === module) {
  validateReasoningAccuracy()
    .then(success => {
      process.exit(success ? 0 : 1)
    })
    .catch(error => {
      console.error('❌ 검증 중 오류 발생:', error)
      process.exit(1)
    })
}

export { validateReasoningAccuracy, validateReasoningKeywords }
