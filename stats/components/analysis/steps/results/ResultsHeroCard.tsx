'use client'

import { motion } from 'framer-motion'
import {
  CheckCircle2,
  XCircle,
  AlertCircle,
  Sparkles,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import type { StatisticalResult } from '@/components/statistics/common/StatisticalResultCard'
import { STATISTICAL_METHODS } from '@/lib/constants/statistical-methods'
import { VALIDATION_METADATA } from '@/lib/constants/validation-metadata'
import {
  heroRevealVariants,
} from './results-helpers'
import type { TerminologyDictionary } from '@/lib/terminology/terminology-types'

export interface ResultsHeroCardProps {
  statisticalResult: StatisticalResult
  methodId?: string
  isSignificant: boolean
  assumptionsPassed: boolean
  resultTimestamp: Date
  apaFormat: string | null
  uploadedFileName: string | null
  uploadedData: Record<string, unknown>[] | null
  /** AI 해석 요약 한 줄 (스트리밍 완료 전에는 null) */
  aiSummary: string | null
  isInterpreting: boolean
  prefersReducedMotion: boolean
  t: Pick<TerminologyDictionary, 'results'>
}

export function ResultsHeroCard({
  statisticalResult,
  methodId,
  isSignificant,
  assumptionsPassed,
  resultTimestamp,
  apaFormat,
  uploadedFileName,
  uploadedData,
  aiSummary,
  isInterpreting,
  prefersReducedMotion,
  t,
}: ResultsHeroCardProps): React.ReactElement {
  const resolvedMethodId = methodId ?? statisticalResult.testName
  const methodEntry = resolvedMethodId ? STATISTICAL_METHODS[resolvedMethodId] : null
  const validationMeta = resolvedMethodId ? VALIDATION_METADATA[resolvedMethodId] : undefined
  const showBinaryConclusion = methodEntry ? (!methodEntry.isDataTool && 
    methodEntry.category !== 'multivariate' && 
    methodEntry.category !== 'design' &&
    methodEntry.id !== 'arima' && 
    methodEntry.id !== 'seasonal-decompose') : false

  // 비가설 검정의 경우 배경/아이콘 처리를 위한 변수
  const highlightAsSuccess = showBinaryConclusion ? isSignificant : true

  return (
    <motion.div
      data-testid="results-main-card"
      variants={prefersReducedMotion ? undefined : heroRevealVariants}
      initial={prefersReducedMotion ? undefined : 'hidden'}
      animate={prefersReducedMotion ? undefined : 'visible'}
    >
      <Card className={cn(
        "overflow-hidden rounded-xl border-0",
        isSignificant || !showBinaryConclusion
          ? "bg-surface-container-lowest shadow-[0_1px_3px_0_rgba(0,0,0,0.04)]"
          : "bg-surface-container-low shadow-[0_1px_2px_0_rgba(0,0,0,0.03)]"
      )}>
        <CardContent className="py-4 px-5">
          <div className={cn(
            'mb-3 px-3 py-2.5 rounded-lg',
            !assumptionsPassed
              ? 'bg-warning-bg/60'
              : highlightAsSuccess
                ? 'bg-success-bg/50'
                : 'bg-muted/60'
          )}>
            <p className={cn(
              'text-base font-semibold leading-snug',
              !assumptionsPassed ? 'text-warning-foreground' :
                highlightAsSuccess ? 'text-success' : 'text-muted-foreground'
            )}>
              {!assumptionsPassed
                ? t.results.conclusion.assumptionWarning
                : !showBinaryConclusion
                  ? (statisticalResult.interpretation?.split('.')[0] || statisticalResult.description || t.results.conclusion.analysisComplete)
                  : isSignificant
                    ? t.results.conclusion.significant
                    : t.results.conclusion.notSignificant
              }
            </p>
          </div>

          {/* AI 요약 한 줄 (해석 완료 시) */}
          {aiSummary && !isInterpreting && (
            <p className="text-sm text-muted-foreground leading-relaxed mb-3 flex items-start gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-violet-400 flex-shrink-0 mt-0.5" />
              <span className="line-clamp-2">{aiSummary}</span>
            </p>
          )}

          {/* 1행: 아이콘 + 메서드명 + 경고 배지 + 타임스탬프 */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
              !assumptionsPassed ? "bg-warning-bg" :
                highlightAsSuccess ? "bg-success-bg" : "bg-muted"
            )}>
              {!assumptionsPassed ? (
                <AlertCircle className="w-4 h-4 text-warning" />
              ) : highlightAsSuccess ? (
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

          {/* 2행: APA + 메타데이터 + 검증 배지 (간결) */}
          {(apaFormat || uploadedFileName || uploadedData || statisticalResult.variables || validationMeta) && (
            <div className="mt-3 pt-3 pb-1 bg-surface-container/30 -mx-5 px-5 rounded-b-xl flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
              {apaFormat && (
                <>
                  <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50 flex-shrink-0">APA</span>
                  <code className="text-xs font-mono text-foreground/70 select-all">{apaFormat}</code>
                </>
              )}
              {uploadedFileName && (
                <span className="text-xs text-muted-foreground/50">{uploadedFileName}</span>
              )}
              {uploadedData && (
                <span className="text-xs text-muted-foreground/50">
                  {t.results.metadata.rowsCols(uploadedData.length, Object.keys(uploadedData[0] || {}).length)}
                </span>
              )}
              {statisticalResult.variables && (
                <span className="text-xs text-muted-foreground/50">{statisticalResult.variables.join(', ')}</span>
              )}
              {validationMeta && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="text-[10px] text-muted-foreground/40 cursor-help ml-auto flex-shrink-0">
                      {validationMeta.isCustomImpl ? '자체 구현' : validationMeta.pythonLib}
                      {' · R 검증 완료'}
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="max-w-xs text-xs">
                    <p>
                      {validationMeta.isCustomImpl
                        ? '자체 구현 (Pyodide 라이브러리 제약)'
                        : `${validationMeta.pythonLib} 기반 계산`}
                    </p>
                    <p className="text-muted-foreground">
                      {'R 교차검증 정밀도 LRE '}
                      {validationMeta.lre.toFixed(1)}
                      {' / 15.0'}
                    </p>
                  </TooltipContent>
                </Tooltip>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}
