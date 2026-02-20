'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ResultContextHeader } from '@/components/statistics/common/ResultContextHeader'

/** 데모용 고정 timestamp (스냅샷 테스트 안정성) */
const DEMO_TIMESTAMP = new Date('2025-01-15T10:30:00+09:00')

export function ResultContextDemo() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>ResultContextHeader</CardTitle>
        <CardDescription>
          분석 결과 상단에 표시되는 컨텍스트 정보 (파일명, 변수, 표본크기)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* 기본 사용 */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium">기본 사용</h4>
          <ResultContextHeader
            analysisType="독립표본 t-검정"
            analysisSubtitle="Independent Samples t-test"
            fileName="sample_data.csv"
            variables={['group', 'weight']}
            sampleSize={150}
            timestamp={DEMO_TIMESTAMP}
          />
        </div>

        {/* 최소 정보 */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium">최소 정보</h4>
          <ResultContextHeader
            analysisType="Pearson 상관분석"
          />
        </div>

        {/* 다변수 */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium">다변수 분석</h4>
          <ResultContextHeader
            analysisType="다중회귀분석"
            analysisSubtitle="Multiple Regression"
            fileName="research_data.xlsx"
            variables={['height', 'weight', 'age', 'bmi', 'cholesterol']}
            sampleSize={500}
            timestamp={DEMO_TIMESTAMP}
          />
        </div>

        {/* 코드 예시 */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium">사용법</h4>
          <pre className="text-xs bg-muted p-4 rounded-lg overflow-x-auto">
            <code>{`import { ResultContextHeader } from '@/components/statistics/common/ResultContextHeader'

<ResultContextHeader
  analysisType="독립표본 t-검정"
  analysisSubtitle="Independent Samples t-test"
  fileName="data.csv"
  variables={['group', 'weight']}
  sampleSize={150}
  timestamp={new Date()}
/>`}</code>
          </pre>
        </div>
      </CardContent>
    </Card>
  )
}
