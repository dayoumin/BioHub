import React from 'react'
import { Badge } from '@/components/ui/badge'
import { formatPValue, interpretPValue } from '@/lib/statistics/formatters'
import { cn } from '@/lib/utils'

interface PValueBadgeProps {
  value: number | null | undefined
  alpha?: number
  showLabel?: boolean
  size?: 'sm' | 'default' | 'lg'
  className?: string
}

/**
 * P-value를 표시하는 배지 컴포넌트
 * 유의성에 따라 색상이 자동으로 변경됨
 */
export function PValueBadge({
  value,
  alpha = 0.05,
  showLabel = true,
  size = 'default',
  className
}: PValueBadgeProps) {
  if (value === null || value === undefined) {
    return (
      <Badge variant="outline" className={cn('text-muted-foreground', className)}>
        N/A
      </Badge>
    )
  }

  const isSignificant = interpretPValue(value, alpha)
  const formatted = formatPValue(value)

  // 유의성에 따른 시각적 계층 구조 (색상 + 강도)
  const getVariant = () => {
    if (value < 0.001) return 'default' // 매우 유의함 - 강한 색상
    if (value < 0.01) return 'default' // 유의함
    if (value < 0.05) return 'secondary' // 경계선상
    return 'outline' // 유의하지 않음 - 약한 색상
  }

  // 접근성을 위한 색상과 아이콘 조합
  const getColorClass = () => {
    if (value < 0.001) return 'bg-green-500 text-white border-green-600'
    if (value < 0.01) return 'bg-green-100 text-green-700 border-green-300'
    if (value < 0.05) return 'bg-yellow-100 text-yellow-700 border-yellow-300'
    return 'bg-gray-100 text-gray-600 border-gray-300'
  }

  // 크기에 따른 클래스
  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    default: 'text-sm',
    lg: 'text-base px-3 py-1'
  }

  // 툴팁을 위한 해석 텍스트
  const getInterpretation = () => {
    if (value < 0.001) return '매우 강한 통계적 유의성 (p < 0.001)'
    if (value < 0.01) return '강한 통계적 유의성 (p < 0.01)'
    if (value < 0.05) return '통계적으로 유의함 (p < 0.05)'
    if (value < 0.10) return '경계선상의 유의성 (0.05 < p < 0.10)'
    return '통계적으로 유의하지 않음 (p ≥ 0.10)'
  }

  return (
    <div className="inline-flex items-center group relative">
      <Badge
        variant={getVariant()}
        className={cn(
          sizeClasses[size],
          getColorClass(),
          isSignificant && 'font-semibold',
          'transition-all duration-200 hover:scale-105',
          className
        )}
        role="status"
        aria-label={`p-value: ${formatted}, ${getInterpretation()}`}
      >
        {/* 시각적 인디케이터 추가 */}
        {value < 0.001 && (
          <span className="inline-flex w-2 h-2 bg-white rounded-full mr-1 animate-pulse" />
        )}
        {showLabel && 'p = '}
        {formatted}
      </Badge>

      {/* 호버시 툴팁 */}
      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-1.5
                      bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100
                      transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10">
        {getInterpretation()}
        <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1">
          <div className="border-4 border-transparent border-t-gray-900" />
        </div>
      </div>
    </div>
  )
}

/**
 * P-value와 함께 유의성 표시를 하는 확장 컴포넌트
 */
interface PValueWithSignificanceProps extends PValueBadgeProps {
  showSignificance?: boolean
  significanceSymbol?: boolean
}

export function PValueWithSignificance({
  value,
  alpha = 0.05,
  showLabel = true,
  showSignificance = true,
  significanceSymbol = true,
  size = 'default',
  className
}: PValueWithSignificanceProps) {
  if (value === null || value === undefined) {
    return <PValueBadge value={value} size={size} className={className} />
  }

  const isSignificant = interpretPValue(value, alpha)

  return (
    <div className="inline-flex items-center gap-2">
      <PValueBadge
        value={value}
        alpha={alpha}
        showLabel={showLabel}
        size={size}
        className={className}
      />
      {showSignificance && (
        <span className={cn(
          'text-sm font-medium transition-colors duration-200',
          isSignificant ? 'text-green-600' : 'text-gray-400'
        )}>
          {significanceSymbol ? (
            <span className="text-lg" aria-label={isSignificant ? '유의함' : '유의하지 않음'}>
              {isSignificant ? '✅' : '❌'}
            </span>
          ) : (
            <span className={cn(
              'px-2 py-0.5 rounded-md',
              isSignificant ? 'bg-green-50' : 'bg-gray-50'
            )}>
              {isSignificant ? '유의함' : '유의하지 않음'}
            </span>
          )}
        </span>
      )}
    </div>
  )
}

/**
 * 여러 p-value를 비교하여 표시하는 그룹 컴포넌트
 */
interface PValueGroupProps {
  values: Array<{
    label: string
    value: number | null | undefined
    alpha?: number
  }>
  orientation?: 'horizontal' | 'vertical'
  className?: string
}

export function PValueGroup({
  values,
  orientation = 'horizontal',
  className
}: PValueGroupProps) {
  return (
    <div className={cn(
      'flex gap-4',
      orientation === 'vertical' ? 'flex-col' : 'flex-row flex-wrap',
      className
    )}>
      {values.map((item, index) => (
        <div key={index} className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">{item.label}:</span>
          <PValueBadge
            value={item.value}
            alpha={item.alpha}
            showLabel={false}
            size="sm"
          />
        </div>
      ))}
    </div>
  )
}