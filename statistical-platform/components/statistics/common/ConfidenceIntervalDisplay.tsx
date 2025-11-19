import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Slider } from '@/components/ui/slider'
import {
  Info,
  TrendingUp,
  TrendingDown,
  Minus,
  ZoomIn,
  ZoomOut,
  Maximize2
} from 'lucide-react'
import { formatNumber, formatConfidenceInterval } from '@/lib/statistics/formatters'
import { cn } from '@/lib/utils'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Button } from '@/components/ui/button'

interface ConfidenceIntervalProps {
  lower: number
  upper: number
  estimate: number
  level?: number // 95, 99, etc.
  unit?: string
  referenceValue?: number // 비교 기준값 (예: 0 for difference, 1 for ratio)
  label?: string
  description?: string
  showVisualization?: boolean
  showInterpretation?: boolean
  precision?: number
  className?: string
  color?: 'default' | 'primary' | 'success' | 'warning' | 'danger'
}

/**
 * 신뢰구간을 시각적으로 표현하는 컴포넌트
 * 점추정치와 구간을 함께 표시하여 불확실성을 직관적으로 전달
 */
export function ConfidenceIntervalDisplay({
  lower,
  upper,
  estimate,
  level = 95,
  unit = '',
  referenceValue,
  label,
  description,
  showVisualization = true,
  showInterpretation = true,
  precision = 4,
  className,
  color = 'default'
}: ConfidenceIntervalProps) {
  const [zoomLevel, setZoomLevel] = React.useState(1)

  // 구간 너비 계산
  const width = upper - lower
  const margin = width * 0.2 // 시각화를 위한 여백

  // 시각화 범위 설정
  const visualMin = (lower - margin) * zoomLevel
  const visualMax = (upper + margin) * zoomLevel

  // 위치 계산 (0-100 스케일)
  const getPosition = (value: number) => {
    return ((value - visualMin) / (visualMax - visualMin)) * 100
  }

  // 색상 설정
  const getColorClasses = () => {
    switch (color) {
      case 'primary':
        return {
          bar: 'bg-primary',
          point: 'bg-primary',
          text: 'text-primary'
        }
      case 'success':
        return {
          bar: 'bg-success',
          point: 'bg-success',
          text: 'text-success'
        }
      case 'warning':
        return {
          bar: 'bg-yellow-500',
          point: 'bg-yellow-600',
          text: 'text-yellow-600'
        }
      case 'danger':
        return {
          bar: 'bg-red-500',
          point: 'bg-red-600',
          text: 'text-red-600'
        }
      default:
        return {
          bar: 'bg-blue-500',
          point: 'bg-blue-600',
          text: 'text-blue-600'
        }
    }
  }

  const colors = getColorClasses()

  // 해석 텍스트 생성
  const getInterpretation = () => {
    if (referenceValue === undefined) {
      return `${level}% 확률로 실제 값이 ${formatNumber(lower, precision)}${unit}와 ${formatNumber(upper, precision)}${unit} 사이에 있습니다.`
    }

    const includesReference = lower <= referenceValue && upper >= referenceValue
    if (includesReference) {
      return `신뢰구간이 ${referenceValue}${unit}를 포함하므로 통계적으로 유의하지 않습니다.`
    } else if (lower > referenceValue) {
      return `신뢰구간 전체가 ${referenceValue}${unit}보다 크므로 통계적으로 유의한 증가입니다.`
    } else {
      return `신뢰구간 전체가 ${referenceValue}${unit}보다 작으므로 통계적으로 유의한 감소입니다.`
    }
  }

  // 방향 아이콘 결정
  const DirectionIcon = estimate > (referenceValue ?? 0) ? TrendingUp :
                        estimate < (referenceValue ?? 0) ? TrendingDown : Minus

  return (
    <Card className={cn('overflow-hidden', className)}>
      {(label || description) && (
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div>
              {label && <CardTitle className="text-lg">{label}</CardTitle>}
              {description && (
                <CardDescription className="mt-1 text-sm">{description}</CardDescription>
              )}
            </div>
            <Badge variant="outline" className="ml-2">
              {level}% CI
            </Badge>
          </div>
        </CardHeader>
      )}

      <CardContent className="space-y-4">
        {/* 주요 수치 표시 */}
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-xs text-muted-foreground mb-1">하한</p>
            <p className={cn('text-lg font-semibold', colors.text)}>
              {formatNumber(lower, precision)}{unit}
            </p>
          </div>
          <div className="relative">
            <p className="text-xs text-muted-foreground mb-1">추정치</p>
            <div className="flex items-center justify-center gap-2">
              <p className="text-xl font-bold">
                {formatNumber(estimate, precision)}{unit}
              </p>
              {referenceValue !== undefined && (
                <DirectionIcon className={cn('w-4 h-4', colors.text)} />
              )}
            </div>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">상한</p>
            <p className={cn('text-lg font-semibold', colors.text)}>
              {formatNumber(upper, precision)}{unit}
            </p>
          </div>
        </div>

        {/* 시각화 */}
        {showVisualization && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>신뢰구간 시각화</span>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={() => setZoomLevel(Math.min(zoomLevel * 1.2, 3))}
                >
                  <ZoomIn className="w-3 h-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={() => setZoomLevel(Math.max(zoomLevel / 1.2, 0.5))}
                >
                  <ZoomOut className="w-3 h-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={() => setZoomLevel(1)}
                >
                  <Maximize2 className="w-3 h-3" />
                </Button>
              </div>
            </div>

            <div className="relative h-12 bg-gray-100 rounded-lg overflow-hidden">
              {/* 기준선 (있는 경우) */}
              {referenceValue !== undefined &&
                referenceValue >= visualMin &&
                referenceValue <= visualMax && (
                  <div
                    className="absolute top-0 bottom-0 w-px bg-gray-400 z-10"
                    style={{ left: `${getPosition(referenceValue)}%` }}
                  >
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="absolute -top-1 -left-1 w-2 h-2 bg-gray-400 rounded-full" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="text-xs">기준값: {referenceValue}{unit}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                )}

              {/* 신뢰구간 막대 */}
              <div
                className={cn(
                  'absolute top-4 h-4 opacity-60 rounded-full transition-all duration-300',
                  colors.bar
                )}
                style={{
                  left: `${getPosition(lower)}%`,
                  width: `${getPosition(upper) - getPosition(lower)}%`
                }}
              />

              {/* 점추정치 */}
              <div
                className={cn(
                  'absolute top-3 w-6 h-6 rounded-full shadow-md transition-all duration-300',
                  colors.point
                )}
                style={{
                  left: `calc(${getPosition(estimate)}% - 12px)`
                }}
              >
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="w-full h-full" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="text-xs font-semibold">
                        점추정치: {formatNumber(estimate, precision)}{unit}
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>

              {/* 구간 끝점 표시 */}
              <div
                className="absolute top-4 w-1 h-4 bg-white rounded"
                style={{ left: `${getPosition(lower)}%` }}
              />
              <div
                className="absolute top-4 w-1 h-4 bg-white rounded"
                style={{ left: `calc(${getPosition(upper)}% - 4px)` }}
              />
            </div>

            {/* 스케일 표시 */}
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{formatNumber(visualMin, 2)}{unit}</span>
              <span>{formatNumber((visualMin + visualMax) / 2, 2)}{unit}</span>
              <span>{formatNumber(visualMax, 2)}{unit}</span>
            </div>
          </div>
        )}

        {/* 해석 */}
        {showInterpretation && (
          <div className="p-3 bg-muted/50 rounded-lg">
            <div className="flex items-start gap-2">
              <Info className="w-4 h-4 text-muted-foreground mt-0.5" />
              <div className="flex-1 space-y-1">
                <p className="text-sm">{getInterpretation()}</p>
                <p className="text-xs text-muted-foreground">
                  구간 너비: {formatNumber(width, precision)}{unit}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* 텍스트 표현 */}
        <div className="text-center">
          <code className="text-sm bg-muted px-2 py-1 rounded">
            {formatConfidenceInterval(lower, upper, precision)}
            {unit && ` ${unit}`}
          </code>
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * 여러 신뢰구간을 비교하는 컴포넌트
 */
interface MultipleConfidenceIntervalsProps {
  intervals: Array<{
    name: string
    lower: number
    upper: number
    estimate: number
    color?: ConfidenceIntervalProps['color']
  }>
  level?: number
  unit?: string
  referenceValue?: number
  className?: string
}

export function MultipleConfidenceIntervals({
  intervals,
  level = 95,
  unit = '',
  referenceValue,
  className
}: MultipleConfidenceIntervalsProps) {
  // 전체 범위 계산
  const allValues = intervals.flatMap(ci => [ci.lower, ci.upper])
  const min = Math.min(...allValues)
  const max = Math.max(...allValues)
  const range = max - min
  const visualMin = min - range * 0.1
  const visualMax = max + range * 0.1

  const getPosition = (value: number) => {
    return ((value - visualMin) / (visualMax - visualMin)) * 100
  }

  const getColorClass = (color?: ConfidenceIntervalProps['color']) => {
    switch (color) {
      case 'primary': return 'bg-primary'
      case 'success': return 'bg-success'
      case 'warning': return 'bg-warning'
      case 'danger': return 'bg-error'
      default: return 'bg-info'
    }
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>신뢰구간 비교</CardTitle>
        <CardDescription>{level}% 신뢰구간</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          {intervals.map((ci, index) => (
            <div key={index} className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{ci.name}</span>
                <span className="text-xs text-muted-foreground">
                  {formatConfidenceInterval(ci.lower, ci.upper, 2)}
                  {unit && ` ${unit}`}
                </span>
              </div>

              <div className="relative h-8 bg-gray-100 rounded">
                {/* 기준선 */}
                {referenceValue !== undefined &&
                  referenceValue >= visualMin &&
                  referenceValue <= visualMax && (
                    <div
                      className="absolute top-0 bottom-0 w-px bg-gray-400 opacity-50 z-10"
                      style={{ left: `${getPosition(referenceValue)}%` }}
                    />
                  )}

                {/* 구간 막대 */}
                <div
                  className={cn(
                    'absolute top-2 h-4 opacity-70 rounded-full',
                    getColorClass(ci.color)
                  )}
                  style={{
                    left: `${getPosition(ci.lower)}%`,
                    width: `${getPosition(ci.upper) - getPosition(ci.lower)}%`
                  }}
                />

                {/* 점추정치 */}
                <div
                  className={cn(
                    'absolute top-2 w-4 h-4 rounded-full',
                    getColorClass(ci.color)
                  )}
                  style={{
                    left: `calc(${getPosition(ci.estimate)}% - 8px)`
                  }}
                />
              </div>
            </div>
          ))}
        </div>

        {/* 스케일 */}
        <div className="flex justify-between text-xs text-muted-foreground pt-2 border-t">
          <span>{formatNumber(visualMin, 2)}{unit}</span>
          {referenceValue !== undefined && (
            <span className="font-medium">기준: {referenceValue}{unit}</span>
          )}
          <span>{formatNumber(visualMax, 2)}{unit}</span>
        </div>
      </CardContent>
    </Card>
  )
}