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
import {
  heroRevealVariants,
} from './results-helpers'

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
      sections: { caution: string }
      conclusion: { assumptionWarning: string }
      metadata: { analysisTime: string; rowsCols: (rows: number, cols: number) => string }
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
        "overflow-hidden rounded-xl border-0",
        !assumptionsPassed
          ? "bg-warning-bg/30 shadow-[0_1px_3px_0_rgba(0,0,0,0.04)]"
          : isSignificant
            ? "bg-surface-container-lowest shadow-[0_1px_3px_0_rgba(0,0,0,0.04)]"
            : "bg-surface-container-low shadow-[0_1px_2px_0_rgba(0,0,0,0.03)]"
      )}>
        <CardContent className="py-4 px-5">
          {/* 1행: 아이콘 + 메서드명 + 경고 배지 + 타임스탬프 */}
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

            {/* 가정 미충족 경고 배지 */}
            {!assumptionsPassed && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge variant="outline" className="text-xs border-0 bg-warning-bg text-warning cursor-help">
                    <AlertCircle className="w-3 h-3 mr-1" />
                    {t.results.sections.caution}
                  </Badge>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-xs">
                  {t.results.conclusion.assumptionWarning}
                </TooltipContent>
              </Tooltip>
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
            <div className="mt-3 pt-3 pb-1 bg-surface-container/30 -mx-5 px-5 rounded-b-xl flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
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
