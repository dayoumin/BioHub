'use client'

/**
 * MethodCardComparisonSection - 방법 선택 Card UI Before/After 비교
 *
 * 현재 통계 페이지 (correlation, t-test, anova, regression)에서
 * 직접 구현된 Card 선택 UI와 PurposeCard 공통 컴포넌트를 비교합니다.
 */

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { PurposeCard } from '@/components/common/analysis/PurposeCard'
import {
  TrendingUp,
  Activity,
  Network,
  CheckCircle,
  ArrowRight
} from 'lucide-react'

// 데모용 상관분석 타입 정보
const correlationTypes = [
  {
    id: 'pearson',
    title: 'Pearson 상관계수',
    subtitle: 'Pearson Correlation',
    description: '연속형 변수 간 선형 상관관계 측정',
    example: '키와 몸무게의 관계',
    icon: TrendingUp
  },
  {
    id: 'spearman',
    title: 'Spearman 상관계수',
    subtitle: 'Spearman Correlation',
    description: '순위 기반 단조 상관관계 측정',
    example: '순위 간 일치성 분석',
    icon: Activity
  },
  {
    id: 'kendall',
    title: 'Kendall 상관계수',
    subtitle: 'Kendall Tau',
    description: '순위 쌍의 일치/불일치 비교',
    example: '순서형 변수 간 관계',
    icon: Network
  }
]

export function MethodCardComparisonSection() {
  const [selectedBefore, setSelectedBefore] = useState<string>('')
  const [selectedAfter, setSelectedAfter] = useState<string>('')

  return (
    <div className="space-y-8">
      {/* 설명 */}
      <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
        <h3 className="font-semibold text-amber-800 dark:text-amber-200 mb-2">
          🔄 개선 대상: 방법 선택 Card UI
        </h3>
        <p className="text-sm text-amber-700 dark:text-amber-300">
          현재 correlation, t-test, anova, regression 페이지에서 직접 구현된 Card 선택 UI를
          <strong> PurposeCard</strong> 공통 컴포넌트로 통일하여 일관성과 유지보수성을 향상시킵니다.
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Before: 현재 구현 (correlation 페이지 스타일) */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
              Before
            </Badge>
            <span className="text-sm font-medium">현재 구현 (직접 Card)</span>
          </div>

          <div className="border rounded-lg p-4 bg-muted/30">
            <p className="text-xs text-muted-foreground mb-4">
              correlation/page.tsx - 직접 구현된 Card 선택 UI
            </p>

            <div className="grid gap-3">
              {correlationTypes.map((type) => {
                const Icon = type.icon
                const isSelected = selectedBefore === type.id

                return (
                  <Card
                    key={type.id}
                    className={`cursor-pointer transition-all hover:shadow-md ${
                      isSelected ? 'border-primary bg-primary/5' : ''
                    }`}
                    onClick={() => setSelectedBefore(type.id)}
                  >
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <div className="p-2 bg-gradient-to-br from-primary/20 to-primary/10 rounded-lg">
                          <Icon className="w-5 h-5" />
                        </div>
                        {isSelected && (
                          <CheckCircle className="w-5 h-5 text-primary" />
                        )}
                      </div>
                      <CardTitle className="text-base mt-2">{type.title}</CardTitle>
                      <Badge variant="outline" className="w-fit text-xs">
                        {type.subtitle}
                      </Badge>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <p className="text-sm text-muted-foreground">
                        {type.description}
                      </p>
                      <div className="bg-muted/50 p-2 rounded mt-2">
                        <p className="text-xs text-muted-foreground">
                          예: {type.example}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </div>

          {/* 문제점 */}
          <div className="text-xs space-y-1 text-muted-foreground">
            <p>❌ 페이지마다 직접 구현 (중복 코드)</p>
            <p>❌ 스타일 불일치 가능성</p>
            <p>❌ 접근성 속성 누락 (role, aria-*)</p>
            <p>❌ 키보드 네비게이션 미지원</p>
          </div>
        </div>

        {/* After: PurposeCard 사용 */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Badge className="bg-green-500">
              After
            </Badge>
            <span className="text-sm font-medium">PurposeCard 공통 컴포넌트</span>
          </div>

          <div className="border rounded-lg p-4 bg-muted/30">
            <p className="text-xs text-muted-foreground mb-4">
              PurposeCard 컴포넌트 사용
            </p>

            <div className="grid gap-3">
              {correlationTypes.map((type) => {
                const Icon = type.icon

                return (
                  <PurposeCard
                    key={type.id}
                    icon={<Icon className="w-5 h-5" />}
                    title={type.title}
                    description={type.description}
                    examples={type.example}
                    selected={selectedAfter === type.id}
                    onClick={() => setSelectedAfter(type.id)}
                  />
                )
              })}
            </div>
          </div>

          {/* 개선점 */}
          <div className="text-xs space-y-1 text-muted-foreground">
            <p>✅ 공통 컴포넌트로 코드 재사용</p>
            <p>✅ 일관된 디자인 (호버, 선택 효과)</p>
            <p>✅ 접근성 지원 (role="radio", aria-checked)</p>
            <p>✅ 키보드 지원 (Enter, Space)</p>
          </div>
        </div>
      </div>

      {/* 마이그레이션 가이드 */}
      <div className="border rounded-lg p-4 bg-muted/20">
        <h4 className="font-semibold mb-3 flex items-center gap-2">
          <ArrowRight className="w-4 h-4" />
          마이그레이션 코드 예시
        </h4>

        <div className="grid lg:grid-cols-2 gap-4 text-xs">
          <div>
            <p className="font-medium mb-2 text-red-600">Before (직접 구현):</p>
            <pre className="bg-muted p-3 rounded overflow-x-auto">
{`<Card
  className={\`cursor-pointer
    \${selected ? 'border-primary' : ''}\`}
  onClick={() => setType(key)}
>
  <CardHeader>
    <Icon className="w-5 h-5" />
    <CardTitle>{info.title}</CardTitle>
  </CardHeader>
  <CardContent>
    {info.description}
  </CardContent>
</Card>`}
            </pre>
          </div>

          <div>
            <p className="font-medium mb-2 text-green-600">After (PurposeCard):</p>
            <pre className="bg-muted p-3 rounded overflow-x-auto">
{`<PurposeCard
  icon={<Icon className="w-5 h-5" />}
  title={info.title}
  description={info.description}
  examples={info.example}
  selected={type === key}
  onClick={() => setType(key)}
/>`}
            </pre>
          </div>
        </div>
      </div>

      {/* 대상 페이지 목록 */}
      <div className="flex flex-wrap gap-2">
        <span className="text-sm font-medium">대상 페이지:</span>
        {['correlation', 't-test', 'anova', 'regression'].map(page => (
          <Badge key={page} variant="outline">
            {page}
          </Badge>
        ))}
      </div>
    </div>
  )
}
