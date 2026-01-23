'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { StatisticalResultCard } from '@/components/statistics/common/StatisticalResultCard'

/** 데모용 고정 timestamp (스냅샷 테스트 안정성) */
const DEMO_TIMESTAMP = new Date('2025-01-15T10:30:00+09:00')

export function StatisticalResultDemo() {
  // 샘플 유의한 결과
  const significantResult = {
    testName: '독립표본 t-검정',
    testType: 'Independent Samples t-test',
    description: '두 독립 집단의 평균 비교',
    statistic: 3.542,
    statisticName: 't',
    df: 48,
    pValue: 0.0009,
    alpha: 0.05,
    effectSize: {
      value: 0.72,
      type: 'cohens_d' as const
    },
    confidenceInterval: {
      estimate: 5.23,
      lower: 2.15,
      upper: 8.31,
      level: 0.95
    },
    assumptions: [
      {
        name: '정규성',
        description: 'Shapiro-Wilk 검정',
        pValue: 0.234,
        passed: true
      },
      {
        name: '등분산성',
        description: "Levene's 검정",
        pValue: 0.156,
        passed: true
      }
    ],
    interpretation: '검정 결과 p-value(0.0009)가 유의수준 0.05보다 작아 귀무가설을 기각합니다. 두 집단 간에 통계적으로 유의한 차이가 있습니다. Cohen\'s d = 0.72로 중간~큰 효과크기를 나타냅니다.',
    recommendations: [
      '효과크기를 함께 보고하여 실질적 유의성을 평가하세요',
      '신뢰구간을 확인하여 추정치의 정밀도를 파악하세요'
    ],
    sampleSize: 50,
    groups: 2,
    variables: ['treatment_group', 'weight_change'],
    timestamp: DEMO_TIMESTAMP
  }

  // 샘플 비유의한 결과
  const nonSignificantResult = {
    testName: '일표본 t-검정',
    testType: 'One-Sample t-test',
    description: '표본 평균과 기준값 비교',
    statistic: 1.234,
    statisticName: 't',
    df: 29,
    pValue: 0.227,
    alpha: 0.05,
    interpretation: '검정 결과 p-value(0.227)가 유의수준 0.05보다 커서 귀무가설을 기각할 수 없습니다. 표본 평균이 기준값과 통계적으로 유의한 차이가 없습니다.',
    recommendations: [
      '표본 크기가 충분한지 검토하세요 (통계적 검정력 분석)',
      '효과크기가 작은 경우 더 큰 표본이 필요할 수 있습니다'
    ],
    sampleSize: 30,
    timestamp: DEMO_TIMESTAMP
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>StatisticalResultCard</CardTitle>
        <CardDescription>
          통계 분석 결과를 표시하는 통합 컴포넌트 (탭 구조, 효과크기, 가정검정, 해석)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* 유의한 결과 */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium">유의한 결과 (p &lt; 0.05)</h4>
          <StatisticalResultCard
            result={significantResult}
            showAssumptions={true}
            showEffectSize={true}
            showConfidenceInterval={true}
            showInterpretation={true}
            showActions={true}
            expandable={false}
          />
        </div>

        {/* 비유의한 결과 */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium">비유의한 결과 (p &gt; 0.05)</h4>
          <StatisticalResultCard
            result={nonSignificantResult}
            showAssumptions={false}
            showEffectSize={false}
            showInterpretation={true}
            showActions={false}
          />
        </div>

        {/* 코드 예시 */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium">사용법</h4>
          <pre className="text-xs bg-muted p-4 rounded-lg overflow-x-auto">
            <code>{`import { StatisticalResultCard } from '@/components/statistics/common/StatisticalResultCard'

const result = {
  testName: '독립표본 t-검정',
  statistic: 3.542,
  statisticName: 't',
  df: 48,
  pValue: 0.0009,
  alpha: 0.05,
  effectSize: { value: 0.72, type: 'cohens_d' },
  // ... more fields
}

<StatisticalResultCard
  result={result}
  showAssumptions={true}
  showEffectSize={true}
  showConfidenceInterval={true}
  showInterpretation={true}
  showActions={true}
  onRerun={() => handleRerun()}
/>`}</code>
          </pre>
        </div>
      </CardContent>
    </Card>
  )
}
