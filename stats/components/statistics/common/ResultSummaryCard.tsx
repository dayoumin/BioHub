import React, { useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Copy, Check, CheckCircle2, XCircle, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { PValueBadge } from './PValueBadge'
import { formatNumber, formatDf, generateFullAPAString } from '@/lib/statistics/formatters'
import { cn } from '@/lib/utils'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

export interface ResultSummaryCardProps {
  /** Test name (e.g., "Sign Test", "Mann-Whitney U") */
  testName: string
  /** Test statistic information */
  statistic: {
    name: string
    value: number
    df?: number | { numerator: number; denominator: number }
  }
  /** p-value */
  pValue: number
  /** Significance level (default: 0.05) */
  alpha?: number
  /** Effect size (optional) */
  effectSize?: {
    value: number
    type: string
    interpretation?: string
  }
  /** Whether result is statistically significant */
  isSignificant: boolean
  /** Conclusion text (e.g., "Reject null hypothesis") */
  conclusion?: string
  /** Compact mode for smaller display */
  compact?: boolean
  /** Show copy button for APA format */
  showCopyButton?: boolean
  /** Additional class name */
  className?: string
}

/**
 * ResultSummaryCard - 3-column grid result summary
 *
 * Features:
 * - 3-column layout: Statistic | p-value | Effect size
 * - Conclusion with significance icon
 * - Full APA format copy
 * - Compact mode for space-constrained layouts
 */
export function ResultSummaryCard({
  testName,
  statistic,
  pValue,
  alpha = 0.05,
  effectSize,
  isSignificant,
  conclusion,
  compact = false,
  showCopyButton = true,
  className
}: ResultSummaryCardProps) {
  const [copied, setCopied] = React.useState(false)

  const apaString = generateFullAPAString(statistic.name, statistic.value, statistic.df, pValue, effectSize)

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(apaString)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }, [apaString])

  // Effect size direction icon
  const EffectIcon = effectSize
    ? effectSize.value > 0 ? TrendingUp
    : effectSize.value < 0 ? TrendingDown
    : Minus
    : null

  // Default conclusion based on significance
  const displayConclusion = conclusion || (
    isSignificant
      ? 'Reject null hypothesis'
      : 'Fail to reject null hypothesis'
  )

  if (compact) {
    return (
      <Card className={cn(
        'transition-all duration-200',
        isSignificant
          ? 'border-stat-significant/30 bg-stat-significant/5'
          : 'border-gray-200',
        className
      )}>
        <CardContent className="p-4">
          {/* Compact: Single row */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              {isSignificant ? (
                <CheckCircle2 className="w-5 h-5 text-stat-significant" />
              ) : (
                <XCircle className="w-5 h-5 text-stat-non-significant" />
              )}
              <span className="font-semibold">{testName}</span>
            </div>

            <div className="flex items-center gap-4">
              <span className="font-mono text-sm">
                {statistic.name}{formatDf(statistic.df)} = {formatNumber(statistic.value, 3)}
              </span>
              <PValueBadge value={pValue} alpha={alpha} size="sm" />
              {effectSize && (
                <span className="text-sm text-muted-foreground">
                  {effectSize.type} = {formatNumber(effectSize.value, 3)}
                </span>
              )}
              {showCopyButton && (
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleCopy}>
                  {copied ? <Check className="h-3 w-3 text-green-600" /> : <Copy className="h-3 w-3" />}
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={cn(
      'transition-all duration-200',
      isSignificant
        ? 'border-stat-significant/30 bg-stat-significant/5'
        : 'border-gray-200',
      className
    )}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            {isSignificant ? (
              <CheckCircle2 className="w-5 h-5 text-stat-significant" />
            ) : (
              <XCircle className="w-5 h-5 text-stat-non-significant" />
            )}
            {testName}
          </CardTitle>
          {showCopyButton && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleCopy}>
                    {copied ? (
                      <Check className="h-4 w-4 text-green-600" />
                    ) : (
                      <Copy className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{copied ? 'Copied!' : 'Copy APA format'}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* 3-column grid */}
        <div className="grid grid-cols-3 gap-4">
          {/* Column 1: Statistic */}
          <div className="text-center p-3 bg-background rounded-lg border">
            <div className="text-xs text-muted-foreground mb-1">Statistic</div>
            <div className="text-xl font-bold">
              {statistic.name}{formatDf(statistic.df)} = {formatNumber(statistic.value, 3)}
            </div>
          </div>

          {/* Column 2: p-value */}
          <div className="text-center p-3 bg-background rounded-lg border">
            <div className="text-xs text-muted-foreground mb-1">p-value</div>
            <div className="flex justify-center mt-1">
              <PValueBadge value={pValue} alpha={alpha} size="lg" />
            </div>
          </div>

          {/* Column 3: Effect size */}
          <div className="text-center p-3 bg-background rounded-lg border">
            <div className="text-xs text-muted-foreground mb-1">Effect Size</div>
            {effectSize ? (
              <div>
                <div className="text-xl font-bold flex items-center justify-center gap-1">
                  {formatNumber(effectSize.value, 3)}
                  {EffectIcon && <EffectIcon className="w-4 h-4 text-muted-foreground" />}
                </div>
                <div className="text-xs text-muted-foreground">
                  {effectSize.type}
                  {effectSize.interpretation && ` (${effectSize.interpretation})`}
                </div>
              </div>
            ) : (
              <div className="text-muted-foreground">-</div>
            )}
          </div>
        </div>

        {/* Conclusion */}
        <div className={cn(
          'flex items-center gap-2 px-4 py-3 rounded-lg',
          isSignificant
            ? 'bg-stat-significant/10'
            : 'bg-gray-100'
        )}>
          {isSignificant ? (
            <CheckCircle2 className="w-5 h-5 text-stat-significant flex-shrink-0" />
          ) : (
            <XCircle className="w-5 h-5 text-stat-non-significant flex-shrink-0" />
          )}
          <span className={cn(
            'font-medium',
            isSignificant ? 'text-stat-significant' : 'text-gray-600'
          )}>
            {displayConclusion}
          </span>
          <Badge
            variant={isSignificant ? 'default' : 'secondary'}
            className="ml-auto"
          >
            {isSignificant ? 'Significant' : 'Not Significant'}
          </Badge>
        </div>

        {/* APA format reference */}
        <div className="text-xs text-muted-foreground font-mono bg-muted/50 p-2 rounded">
          {apaString}
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * Minimal summary for inline use
 */
export function ResultSummaryInline({
  statistic,
  pValue,
  alpha = 0.05,
  effectSize,
  className
}: Omit<ResultSummaryCardProps, 'testName' | 'isSignificant' | 'conclusion' | 'compact' | 'showCopyButton'>) {
  const isSignificant = pValue < alpha

  return (
    <div className={cn('flex items-center gap-3 text-sm', className)}>
      <span className="font-mono">
        {statistic.name}{formatDf(statistic.df)} = {formatNumber(statistic.value, 3)}
      </span>
      <PValueBadge value={pValue} alpha={alpha} size="sm" />
      {effectSize && (
        <span className="text-muted-foreground">
          {effectSize.type} = {formatNumber(effectSize.value, 3)}
        </span>
      )}
      {isSignificant ? (
        <CheckCircle2 className="w-4 h-4 text-stat-significant" />
      ) : (
        <XCircle className="w-4 h-4 text-stat-non-significant" />
      )}
    </div>
  )
}
