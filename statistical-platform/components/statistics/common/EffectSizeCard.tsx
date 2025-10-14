import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Info, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { formatNumber, interpretEffectSize } from '@/lib/statistics/formatters'
import { cn } from '@/lib/utils'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

interface EffectSizeCardProps {
  title: string
  value: number | null | undefined
  type?: 'cohen_d' | 'eta_squared' | 'omega_squared' | 'r' | 'phi' | 'cramers_v'
  description?: string
  showInterpretation?: boolean
  showVisualScale?: boolean
  compareValue?: number // 비교를 위한 기준값
  className?: string
}

/**
 * 효과크기를 시각적으로 표현하는 카드 컴포넌트
 * 연구자가 직관적으로 효과의 크기를 이해할 수 있도록 설계
 */
export function EffectSizeCard({
  title,
  value,
  type = 'cohen_d',
  description,
  showInterpretation = true,
  showVisualScale = true,
  compareValue,
  className
}: EffectSizeCardProps) {
  if (value === null || value === undefined) {
    return (
      <Card className={cn('opacity-60', className)}>
        <CardContent className="pt-6">
          <div className="text-center text-muted-foreground">
            데이터 없음
          </div>
        </CardContent>
      </Card>
    )
  }

  const interpretation = interpretEffectSize(value, type)
  const formattedValue = formatNumber(value, 4)
  const absValue = Math.abs(value)

  // 효과크기를 0-100 스케일로 변환 (시각화용)
  const getProgressValue = () => {
    switch (type) {
      case 'cohen_d':
        return Math.min(absValue * 50, 100) // 0-2 범위를 0-100으로
      case 'eta_squared':
      case 'omega_squared':
      case 'r':
      case 'phi':
        return absValue * 100 // 이미 0-1 범위
      case 'cramers_v':
        return absValue * 100
      default:
        return absValue * 100
    }
  }

  // 효과크기에 따른 색상
  const getColorClass = () => {
    if (absValue < 0.2) return 'text-gray-500 bg-gray-50'
    if (absValue < 0.5) return 'text-yellow-600 bg-yellow-50'
    if (absValue < 0.8) return 'text-orange-600 bg-orange-50'
    return 'text-red-600 bg-red-50'
  }

  // 진행바 색상
  const getProgressColor = () => {
    if (absValue < 0.2) return 'bg-gray-400'
    if (absValue < 0.5) return 'bg-yellow-500'
    if (absValue < 0.8) return 'bg-orange-500'
    return 'bg-red-500'
  }

  // 방향 아이콘
  const DirectionIcon = value > 0 ? TrendingUp : value < 0 ? TrendingDown : Minus

  // 효과크기 타입별 설명
  const typeDescriptions = {
    cohen_d: "Cohen's d - 표준화된 평균 차이",
    eta_squared: 'η² - 설명된 분산의 비율',
    omega_squared: 'ω² - 조정된 설명 분산',
    r: 'r - 상관계수 효과크기',
    phi: 'φ - 2×2 분할표 연관성',
    cramers_v: "Cramér's V - 명목 변수 연관성"
  }

  return (
    <Card className={cn('overflow-hidden transition-all duration-300 hover:shadow-lg', className)}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg flex items-center gap-2">
              {title}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="w-4 h-4 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p className="font-semibold">{typeDescriptions[type]}</p>
                    {description && <p className="mt-1 text-xs">{description}</p>}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </CardTitle>
          </div>
          <Badge variant="outline" className="ml-2">
            {type.replace('_', ' ')}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* 주요 값 표시 */}
        <div className="flex items-center justify-between">
          <div className="flex items-baseline gap-3">
            <span className="text-3xl font-bold tracking-tight">
              {formattedValue}
            </span>
            <DirectionIcon className={cn('w-5 h-5', getColorClass().split(' ')[0])} />
          </div>

          {compareValue !== undefined && (
            <div className="text-right">
              <p className="text-xs text-muted-foreground">기준값</p>
              <p className="text-sm font-medium">{formatNumber(compareValue, 4)}</p>
            </div>
          )}
        </div>

        {/* 해석 */}
        {showInterpretation && (
          <div className={cn('px-3 py-2 rounded-lg transition-colors duration-200', getColorClass())}>
            <p className="text-sm font-medium">
              {interpretation}
            </p>
          </div>
        )}

        {/* 시각적 스케일 */}
        {showVisualScale && (
          <div className="space-y-2">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>작음</span>
              <span>중간</span>
              <span>큼</span>
            </div>
            <div className="relative">
              <Progress
                value={getProgressValue()}
                className="h-2"
              />
              {/* 기준선 표시 */}
              <div className="absolute top-0 left-1/4 w-px h-2 bg-gray-400 opacity-50" />
              <div className="absolute top-0 left-1/2 w-px h-2 bg-gray-400 opacity-50" />
              <div className="absolute top-0 left-3/4 w-px h-2 bg-gray-400 opacity-50" />
            </div>
          </div>
        )}

        {/* 추가 정보 */}
        <div className="pt-2 border-t">
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-muted-foreground">절댓값:</span>
              <span className="ml-1 font-medium">{formatNumber(absValue, 4)}</span>
            </div>
            <div>
              <span className="text-muted-foreground">방향:</span>
              <span className="ml-1 font-medium">
                {value > 0 ? '양(+)' : value < 0 ? '음(-)' : '없음'}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * 여러 효과크기를 비교하는 그룹 컴포넌트
 */
interface EffectSizeComparisonProps {
  items: Array<{
    title: string
    value: number | null | undefined
    type?: EffectSizeCardProps['type']
  }>
  className?: string
}

export function EffectSizeComparison({ items, className }: EffectSizeComparisonProps) {
  // 가장 큰 효과크기 찾기
  const maxEffect = Math.max(
    ...items.map(item => Math.abs(item.value || 0))
  )

  return (
    <div className={cn('space-y-3', className)}>
      <h3 className="text-sm font-medium text-muted-foreground">효과크기 비교</h3>
      {items.map((item, index) => {
        const absValue = Math.abs(item.value || 0)
        const percentage = maxEffect > 0 ? (absValue / maxEffect) * 100 : 0
        const interpretation = item.value ? interpretEffectSize(item.value, item.type || 'cohen_d') : 'N/A'

        return (
          <div key={index} className="space-y-1">
            <div className="flex justify-between items-baseline">
              <span className="text-sm font-medium">{item.title}</span>
              <span className="text-sm tabular-nums">
                {item.value ? formatNumber(item.value, 3) : 'N/A'}
              </span>
            </div>
            <div className="relative">
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={cn(
                    'h-full transition-all duration-500',
                    absValue < 0.2 ? 'bg-gray-400' :
                    absValue < 0.5 ? 'bg-yellow-500' :
                    absValue < 0.8 ? 'bg-orange-500' : 'bg-red-500'
                  )}
                  style={{ width: `${percentage}%` }}
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">{interpretation}</p>
          </div>
        )
      })}
    </div>
  )
}

/**
 * 효과크기 가이드라인을 표시하는 참조 컴포넌트
 */
interface EffectSizeGuidelinesProps {
  type?: EffectSizeCardProps['type']
  className?: string
}

export function EffectSizeGuidelines({ type = 'cohen_d', className }: EffectSizeGuidelinesProps) {
  const guidelines = {
    cohen_d: [
      { label: '무시할 만함', range: '< 0.2', color: 'bg-gray-100' },
      { label: '작음', range: '0.2 - 0.5', color: 'bg-yellow-100' },
      { label: '중간', range: '0.5 - 0.8', color: 'bg-orange-100' },
      { label: '큼', range: '> 0.8', color: 'bg-red-100' }
    ],
    eta_squared: [
      { label: '작음', range: '< 0.01', color: 'bg-gray-100' },
      { label: '중간', range: '0.01 - 0.06', color: 'bg-yellow-100' },
      { label: '큼', range: '> 0.14', color: 'bg-orange-100' }
    ],
    r: [
      { label: '약함', range: '< 0.3', color: 'bg-gray-100' },
      { label: '중간', range: '0.3 - 0.5', color: 'bg-yellow-100' },
      { label: '강함', range: '> 0.5', color: 'bg-orange-100' }
    ]
  }

  const currentGuidelines = guidelines[type as keyof typeof guidelines] || guidelines.cohen_d

  return (
    <Card className={cn('bg-gray-50', className)}>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm">효과크기 해석 가이드</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {currentGuidelines.map((guide, index) => (
            <div key={index} className="flex items-center gap-3">
              <div className={cn('w-4 h-4 rounded', guide.color)} />
              <span className="text-sm font-medium">{guide.label}</span>
              <span className="text-xs text-muted-foreground">({guide.range})</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}