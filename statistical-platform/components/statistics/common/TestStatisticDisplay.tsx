import React, { useCallback } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Copy, Check, CheckCircle2, XCircle } from 'lucide-react'
import { PValueBadge } from './PValueBadge'
import { formatNumber, formatDf, generateAPAString } from '@/lib/statistics/formatters'
import { cn } from '@/lib/utils'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

export interface TestStatisticDisplayProps {
  /** Statistic name: 't', 'F', 'chi-squared', 'U', 'H', 'W', 'Z' etc. */
  name: string
  /** Statistic value */
  value: number
  /** Degrees of freedom (single or numerator/denominator) */
  df?: number | { numerator: number; denominator: number }
  /** p-value */
  pValue: number
  /** Significance level (default: 0.05) */
  alpha?: number
  /** Show APA formatted string */
  showFormatted?: boolean
  /** Show copy button */
  showCopyButton?: boolean
  /** Size variant */
  size?: 'sm' | 'default' | 'lg'
  /** Additional class name */
  className?: string
}

/**
 * TestStatisticDisplay - APA format statistic display component
 *
 * Features:
 * - APA formatted string generation
 * - Copy to clipboard button
 * - Significance indicator
 * - Reuses existing PValueBadge
 */
export function TestStatisticDisplay({
  name,
  value,
  df,
  pValue,
  alpha = 0.05,
  showFormatted = true,
  showCopyButton = true,
  size = 'default',
  className
}: TestStatisticDisplayProps) {
  const [copied, setCopied] = React.useState(false)

  const isSignificant = pValue < alpha
  const apaString = generateAPAString(name, value, df, pValue)

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(apaString)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }, [apaString])

  // Size-based styling
  const sizeStyles = {
    sm: {
      card: 'p-3',
      statistic: 'text-lg',
      label: 'text-xs',
      icon: 'w-4 h-4'
    },
    default: {
      card: 'p-4',
      statistic: 'text-2xl',
      label: 'text-sm',
      icon: 'w-5 h-5'
    },
    lg: {
      card: 'p-6',
      statistic: 'text-3xl',
      label: 'text-base',
      icon: 'w-6 h-6'
    }
  }

  const styles = sizeStyles[size]

  return (
    <Card className={cn(
      'transition-all duration-200',
      isSignificant
        ? 'border-stat-significant/30 bg-stat-significant/5'
        : 'border-gray-200',
      className
    )}>
      <CardContent className={cn(styles.card, 'space-y-3')}>
        {/* Main statistic display */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Significance icon */}
            {isSignificant ? (
              <CheckCircle2 className={cn(styles.icon, 'text-stat-significant')} />
            ) : (
              <XCircle className={cn(styles.icon, 'text-stat-non-significant')} />
            )}

            {/* Statistic value */}
            <div>
              <div className={cn(styles.statistic, 'font-bold tracking-tight')}>
                {name}{formatDf(df)} = {formatNumber(value, 3)}
              </div>
              {showFormatted && (
                <div className={cn(styles.label, 'text-muted-foreground font-mono mt-1')}>
                  {apaString}
                </div>
              )}
            </div>
          </div>

          {/* P-value badge */}
          <div className="flex items-center gap-2">
            <PValueBadge
              value={pValue}
              alpha={alpha}
              size={size === 'lg' ? 'lg' : size === 'sm' ? 'sm' : 'default'}
            />

            {/* Copy button */}
            {showCopyButton && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={handleCopy}
                    >
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
        </div>

        {/* Significance summary */}
        <div className={cn(
          'flex items-center gap-2 px-3 py-2 rounded-lg',
          isSignificant
            ? 'bg-stat-significant/10 text-stat-significant'
            : 'bg-gray-100 text-gray-600'
        )}>
          <Badge variant={isSignificant ? 'default' : 'secondary'} className="text-xs">
            {isSignificant ? 'Significant' : 'Not Significant'}
          </Badge>
          <span className={styles.label}>
            {isSignificant
              ? `p < ${alpha} (reject H₀)`
              : `p ≥ ${alpha} (fail to reject H₀)`
            }
          </span>
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * Compact inline version for use within tables or lists
 */
export function TestStatisticInline({
  name,
  value,
  df,
  pValue,
  alpha = 0.05,
  showCopyButton = false,
  className
}: Omit<TestStatisticDisplayProps, 'showFormatted' | 'size'>) {
  const [copied, setCopied] = React.useState(false)
  const apaString = generateAPAString(name, value, df, pValue)

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(apaString)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }, [apaString])

  return (
    <span className={cn('inline-flex items-center gap-2 font-mono text-sm', className)}>
      <span>{apaString}</span>
      {showCopyButton && (
        <button
          onClick={handleCopy}
          className="p-1 hover:bg-gray-100 rounded transition-colors"
        >
          {copied ? (
            <Check className="h-3 w-3 text-green-600" />
          ) : (
            <Copy className="h-3 w-3 text-muted-foreground" />
          )}
        </button>
      )}
    </span>
  )
}
