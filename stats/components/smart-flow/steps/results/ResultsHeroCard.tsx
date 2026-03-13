'use client'

import { motion } from 'framer-motion'
import {
  CheckCircle2,
  XCircle,
  AlertCircle,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import type { StatisticalResult } from '@/components/statistics/common/StatisticalResultCard'
import type { ResultsText } from '@/lib/terminology/terminology-types'

// ===== Animation Variants =====
const heroRevealVariants = {
  hidden: { opacity: 0, scale: 0.96, y: -8 },
  visible: {
    opacity: 1, scale: 1, y: 0,
    transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] as const }
  }
}

// 효과크기 해석 (L1 배지용 — 지역화 레이블 사용)
function getEffectSizeInterpretation(value: number, type: string | undefined, labels: ResultsText['effectSizeLabels']): string {
  const absValue = Math.abs(value)
  switch (type) {
    case 'cohensD':
      if (absValue < 0.2) return labels.small
      if (absValue < 0.5) return labels.medium
      if (absValue < 0.8) return labels.large
      return labels.veryLarge
    case 'etaSquared':
      if (absValue < 0.01) return labels.small
      if (absValue < 0.06) return labels.medium
      if (absValue < 0.14) return labels.large
      return labels.veryLarge
    case 'r':
    case 'phi':
    case 'cramersV':
      if (absValue < 0.1) return labels.small
      if (absValue < 0.3) return labels.medium
      if (absValue < 0.5) return labels.large
      return labels.veryLarge
    default:
      if (absValue < 0.2) return labels.small
      if (absValue < 0.5) return labels.medium
      if (absValue < 0.8) return labels.large
      return labels.veryLarge
  }
}

// 효과크기 타입 → 간결한 기호
function formatEffectSizeSymbol(type: string | undefined): string {
  switch (type) {
    case 'cohensD': return 'd'
    case 'hedgesG': return 'g'
    case 'glassDelta': return 'Δ'
    case 'etaSquared': return 'η²'
    case 'partialEtaSquared': return 'η²ₚ'
    case 'omegaSquared': return 'ω²'
    case 'epsilonSquared': return 'ε²'
    case 'r': return 'r'
    case 'phi': return 'φ'
    case 'cramersV': return 'V'
    case 'rSquared': return 'R²'
    case 'w': return 'W'
    default: return type ?? '?'
  }
}

// p-value 포맷팅
function formatPValue(p: number): string {
  if (p == null || isNaN(p)) return '-'
  if (p < 0.001) return '< .001'
  if (p < 0.01) return '< .01'
  if (p < 0.05) return '< .05'
  return p.toFixed(3)
}

export interface ResultsHeroCardProps {
  statisticalResult: StatisticalResult
  isSignificant: boolean
  assumptionsPassed: boolean
  resultTimestamp: Date
  apaFormat: string | null
  uploadedFileName: string | null
  uploadedData: Record<string, unknown>[] | null
  prefersReducedMotion: boolean
  t: {
    results: {
      statistics: { significant: string; notSignificant: string }
      sections: { caution: string }
      conclusion: { assumptionWarning: string }
      metadata: { analysisTime: string; rowsCols: (rows: number, cols: number) => string }
      effectSizeLabels: ResultsText['effectSizeLabels']
    }
  }
}

export function ResultsHeroCard({
  statisticalResult,
  isSignificant,
  assumptionsPassed,
  resultTimestamp,
  apaFormat,
  uploadedFileName,
  uploadedData,
  prefersReducedMotion,
  t,
}: ResultsHeroCardProps): React.ReactElement {
  return (
    <motion.div
      data-testid="results-main-card"
      variants={prefersReducedMotion ? undefined : heroRevealVariants}
      initial={prefersReducedMotion ? undefined : 'hidden'}
      animate={prefersReducedMotion ? undefined : 'visible'}
    >
      <Card className={cn(
        "overflow-hidden rounded-xl shadow-sm",
        !assumptionsPassed ? "border-warning-border" :
          isSignificant ? "border-success-border/60" : "border-border/50"
      )}>
        <CardContent className="py-3.5 px-4">
          {/* 1행: 아이콘 + 메서드명 + p값 배지 + 효과크기 배지 + 타임스탬프 */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
              !assumptionsPassed ? "bg-warning-bg" :
                isSignificant ? "bg-success-bg" : "bg-muted"
            )}>
              {!assumptionsPassed ? (
                <AlertCircle className="w-4 h-4 text-warning" />
              ) : isSignificant ? (
                <CheckCircle2 className="w-4 h-4 text-success" />
              ) : (
                <XCircle className="w-4 h-4 text-muted-foreground" />
              )}
            </div>

            <span className="text-sm font-semibold truncate">{statisticalResult.testName}</span>

            {/* p-value 인라인 배지 */}
            <Badge
              variant={isSignificant ? "default" : "secondary"}
              className={cn(
                "text-xs font-mono tabular-nums",
                isSignificant && "bg-success hover:bg-success/90"
              )}
            >
              p {formatPValue(statisticalResult.pValue)}
              <span className="ml-1 font-sans">
                ({isSignificant ? t.results.statistics.significant : t.results.statistics.notSignificant})
              </span>
            </Badge>

            {/* 가정 미충족 경고 배지 */}
            {!assumptionsPassed && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge variant="outline" className="text-xs border-warning bg-warning-bg text-warning cursor-help">
                    <AlertCircle className="w-3 h-3 mr-1" />
                    {t.results.sections.caution}
                  </Badge>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-xs">
                  {t.results.conclusion.assumptionWarning}
                </TooltipContent>
              </Tooltip>
            )}

            {/* 효과크기 인라인 배지 */}
            {statisticalResult.effectSize && (
              <Badge variant="outline" className="text-xs font-mono tabular-nums">
                {formatEffectSizeSymbol(statisticalResult.effectSize.type)}={statisticalResult.effectSize.value.toFixed(2)}
                <span className="ml-1 font-sans text-muted-foreground">
                  ({getEffectSizeInterpretation(statisticalResult.effectSize.value, statisticalResult.effectSize.type, t.results.effectSizeLabels)})
                </span>
              </Badge>
            )}

            {/* 타임스탬프 (우측 밀기) */}
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="text-[10px] text-muted-foreground/40 font-mono tabular-nums cursor-help ml-auto flex-shrink-0">
                  {resultTimestamp.toLocaleString('ko-KR', {
                    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                  })}
                </span>
              </TooltipTrigger>
              <TooltipContent side="left">{t.results.metadata.analysisTime}</TooltipContent>
            </Tooltip>
          </div>

          {/* 2행: APA + 메타데이터 (간결) */}
          {(apaFormat || uploadedFileName || uploadedData || statisticalResult.variables) && (
            <div className="mt-2 pt-2 border-t border-border/10 flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
              {apaFormat && (
                <>
                  <span className="text-[9px] font-semibold uppercase tracking-widest text-muted-foreground/40 flex-shrink-0">APA</span>
                  <code className="text-[11px] font-mono text-foreground/60">{apaFormat}</code>
                </>
              )}
              {uploadedFileName && (
                <span className="text-[11px] text-muted-foreground/50">{uploadedFileName}</span>
              )}
              {uploadedData && (
                <span className="text-[11px] text-muted-foreground/50">
                  {t.results.metadata.rowsCols(uploadedData.length, Object.keys(uploadedData[0] || {}).length)}
                </span>
              )}
              {statisticalResult.variables && (
                <span className="text-[11px] text-muted-foreground/50">{statisticalResult.variables.join(', ')}</span>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}
