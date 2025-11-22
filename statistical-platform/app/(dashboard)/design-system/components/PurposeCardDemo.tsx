'use client'

import { useState } from 'react'
import { PurposeCard } from '@/components/common/analysis/PurposeCard'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { GitCompare, TrendingUp } from 'lucide-react'

export function PurposeCardDemo() {
  const [selectedPurpose, setSelectedPurpose] = useState<string | null>(null)

  return (
    <div className="space-y-4 mt-6 animate-in fade-in duration-300">
      <Card>
        <CardHeader>
          <CardTitle>PurposeCard</CardTitle>
          <CardDescription>선택 가능한 카드 컴포넌트 - 분석 목적 또는 방법 선택에 사용</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* 라이브 데모 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <PurposeCard
              icon={<GitCompare className="h-6 w-6" />}
              title="비교 분석"
              description="그룹 간 차이를 비교합니다"
              selected={selectedPurpose === 'compare'}
              onClick={() => setSelectedPurpose('compare')}
            />
            <PurposeCard
              icon={<TrendingUp className="h-6 w-6" />}
              title="추세 분석"
              description="시간에 따른 변화를 분석합니다"
              selected={selectedPurpose === 'trend'}
              onClick={() => setSelectedPurpose('trend')}
            />
          </div>

          {/* Props 테이블 */}
          <div className="bg-muted/50 rounded-lg p-4 space-y-2">
            <h4 className="font-medium text-sm">Props:</h4>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li>• <code>icon</code>: ReactNode - 카드 아이콘</li>
              <li>• <code>title</code>: string - 카드 제목</li>
              <li>• <code>description</code>: string - 카드 설명</li>
              <li>• <code>selected</code>: boolean - 선택 상태</li>
              <li>• <code>onClick</code>: () =&gt; void - 클릭 핸들러</li>
            </ul>
          </div>

          {/* 사용 예제 */}
          <div className="relative">
            <pre className="text-xs bg-muted p-4 rounded-lg overflow-x-auto">
              <code>{`<PurposeCard
  icon={<GitCompare className="h-6 w-6" />}
  title="비교 분석"
  description="그룹 간 차이를 비교합니다"
  selected={selected === 'compare'}
  onClick={() => setSelected('compare')}
/>`}</code>
            </pre>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
