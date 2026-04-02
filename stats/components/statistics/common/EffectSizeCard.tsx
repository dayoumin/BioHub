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

type EffectSeverity = 'negligible' | 'small' | 'medium' | 'large'

type EffectType = 'cohensD' | 'hedgesG' | 'glassDelta' | 'etaSquared' | 'partialEtaSquared' | 'omegaSquared' | 'epsilonSquared' | 'r' | 'rSquared' | 'phi' | 'cramersV' | 'w'

/** Thresholds: [negligible→small, small→medium, medium→large] */
const COHEN_THRESHOLDS = [0.2, 0.5, 0.8] as const
const ETA_THRESHOLDS = [0.01, 0.06, 0.14] as const
const CORRELATION_THRESHOLDS = [0.1, 0.3, 0.5] as const

const TYPE_THRESHOLDS: Record<EffectType, readonly [number, number, number]> = {
  cohensD: COHEN_THRESHOLDS, hedgesG: COHEN_THRESHOLDS, glassDelta: COHEN_THRESHOLDS,
  etaSquared: ETA_THRESHOLDS, partialEtaSquared: ETA_THRESHOLDS,
  omegaSquared: ETA_THRESHOLDS, epsilonSquared: ETA_THRESHOLDS,
  r: CORRELATION_THRESHOLDS, phi: CORRELATION_THRESHOLDS,
  cramersV: CORRELATION_THRESHOLDS, rSquared: CORRELATION_THRESHOLDS,
  w: CORRELATION_THRESHOLDS,
}

function getEffectSizeSeverity(absValue: number, type: EffectType = 'cohensD'): EffectSeverity {
  const [s, m, l] = TYPE_THRESHOLDS[type]
  if (absValue < s) return 'negligible'
  if (absValue < m) return 'small'
  if (absValue < l) return 'medium'
  return 'large'
}

const SEVERITY_STYLES: Record<EffectSeverity, { text: string; bg: string; progress: string }> = {
  negligible: { text: 'text-muted-foreground', bg: 'text-muted-foreground bg-muted', progress: 'bg-muted-foreground' },
  small: { text: 'text-warning', bg: 'text-warning bg-warning-bg', progress: 'bg-warning' },
  medium: { text: 'text-orange-600 dark:text-orange-400', bg: 'text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-950/30', progress: 'bg-orange-500 dark:bg-orange-400' },
  large: { text: 'text-error', bg: 'text-error bg-error-bg', progress: 'bg-error' },
}

interface EffectSizeCardProps {
  title: string
  value: number | null | undefined
  type?: EffectType
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
  type = 'cohensD',
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
          <div className="text-center text-muted-foreground">N/A</div>
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
      case 'cohensD':
      case 'hedgesG':
      case 'glassDelta':
        return Math.min(absValue * 50, 100) // 0-2 범위를 0-100으로
      case 'etaSquared':
      case 'partialEtaSquared':
      case 'omegaSquared':
      case 'epsilonSquared':
      case 'r':
      case 'rSquared':
      case 'phi':
      case 'cramersV':
      case 'w':
        return absValue * 100 // 이미 0-1 범위
      default:
        return absValue * 100
    }
  }

  const severity = getEffectSizeSeverity(absValue, type)

  const DirectionIcon = value > 0 ? TrendingUp : value < 0 ? TrendingDown : Minus

  const typeDescriptions: Record<string, string> = {
    cohensD: "Cohen's d - 표준화된 평균 차이",
    hedgesG: "Hedges' g - 소표본 보정 효과크기",
    glassDelta: "Glass's Δ - 통제집단 기준 효과크기",
    etaSquared: 'η² - 설명된 분산의 비율',
    partialEtaSquared: 'Partial η² - 부분 에타제곱',
    omegaSquared: 'ω² - 조정된 설명 분산',
    epsilonSquared: 'ε² - Kruskal-Wallis 효과크기',
    r: 'r - 상관계수 효과크기',
    rSquared: 'R² - 결정계수',
    phi: 'φ - 2×2 분할표 연관성',
    cramersV: "Cramér's V - 명목 변수 연관성",
    w: "Kendall's W - 일치도 계수"
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
        <div className="flex items-center justify-between">
          <div className="flex items-baseline gap-3">
            <span className="text-3xl font-bold tracking-tight">
              {formattedValue}
            </span>
            <DirectionIcon className={cn('w-5 h-5', SEVERITY_STYLES[severity].text)} />
          </div>

          {compareValue !== undefined && (
            <div className="text-right">
              <p className="text-xs text-muted-foreground">기준값</p>
              <p className="text-sm font-medium">{formatNumber(compareValue, 4)}</p>
            </div>
          )}
        </div>

        {showInterpretation && (
          <div className={cn('px-3 py-2 rounded-lg transition-colors duration-200', SEVERITY_STYLES[severity].bg)}>
            <p className="text-sm font-medium">
              {interpretation}
            </p>
          </div>
        )}

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
        const interpretation = item.value ? interpretEffectSize(item.value, item.type || 'cohensD') : 'N/A'

        return (
          <div key={index} className="space-y-1">
            <div className="flex justify-between items-baseline">
              <span className="text-sm font-medium">{item.title}</span>
              <span className="text-sm tabular-nums">
                {item.value ? formatNumber(item.value, 3) : 'N/A'}
              </span>
            </div>
            <div className="relative">
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className={cn(
                    'h-full transition-all duration-500',
                    SEVERITY_STYLES[getEffectSizeSeverity(absValue, item.type || 'cohensD')].progress
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

const GUIDE_COHEN = [
  { label: '무시할 만함', range: '< 0.2', color: 'bg-muted' },
  { label: '작음', range: '0.2 - 0.5', color: 'bg-warning-bg' },
  { label: '중간', range: '0.5 - 0.8', color: 'bg-warning-bg' },
  { label: '큼', range: '> 0.8', color: 'bg-error-bg' },
] as const
const GUIDE_ETA = [
  { label: '작음', range: '< 0.01', color: 'bg-muted' },
  { label: '중간', range: '0.01 - 0.06', color: 'bg-warning-bg' },
  { label: '큼', range: '> 0.14', color: 'bg-warning-bg' },
] as const
const GUIDE_CORRELATION = [
  { label: '약함', range: '< 0.3', color: 'bg-muted' },
  { label: '중간', range: '0.3 - 0.5', color: 'bg-warning-bg' },
  { label: '강함', range: '> 0.5', color: 'bg-warning-bg' },
] as const
const GUIDE_R_SQUARED = [
  { label: '작음', range: '< 0.09', color: 'bg-muted' },
  { label: '중간', range: '0.09 - 0.25', color: 'bg-warning-bg' },
  { label: '큼', range: '> 0.25', color: 'bg-warning-bg' },
] as const
const GUIDE_W = [
  { label: '약한 일치', range: '< 0.3', color: 'bg-muted' },
  { label: '보통 일치', range: '0.3 - 0.5', color: 'bg-warning-bg' },
  { label: '강한 일치', range: '0.5 - 0.7', color: 'bg-warning-bg' },
  { label: '매우 강한 일치', range: '> 0.7', color: 'bg-error-bg' },
] as const

type GuidelineEntry = readonly { readonly label: string; readonly range: string; readonly color: string }[]

const GUIDELINES_BY_TYPE: Record<string, GuidelineEntry> = {
  cohensD: GUIDE_COHEN, hedgesG: GUIDE_COHEN, glassDelta: GUIDE_COHEN,
  etaSquared: GUIDE_ETA, partialEtaSquared: GUIDE_ETA, omegaSquared: GUIDE_ETA, epsilonSquared: GUIDE_ETA,
  r: GUIDE_CORRELATION, phi: GUIDE_CORRELATION, cramersV: GUIDE_CORRELATION,
  rSquared: GUIDE_R_SQUARED,
  w: GUIDE_W,
}

export function EffectSizeGuidelines({ type = 'cohensD', className }: EffectSizeGuidelinesProps) {
  const currentGuidelines = GUIDELINES_BY_TYPE[type] ?? GUIDE_COHEN

  return (
    <Card className={cn('bg-muted', className)}>
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