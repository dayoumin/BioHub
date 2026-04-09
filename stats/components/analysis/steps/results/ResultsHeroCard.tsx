'use client'

import { motion } from 'framer-motion'
import {
  CheckCircle2,
  XCircle,
  AlertCircle,
  Sparkles,
  Copy,
} from 'lucide-react'
import { toast } from 'sonner'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { TOAST } from '@/lib/constants/toast-messages'
import { cn } from '@/lib/utils'
import type { StatisticalResult } from '@/components/statistics/common/StatisticalResultCard'
import { STATISTICAL_METHODS } from '@/lib/constants/statistical-methods'
import { VALIDATION_METADATA } from '@/lib/constants/validation-metadata'
import {
  heroRevealVariants,
} from './results-helpers'
import type { TerminologyDictionary } from '@/lib/terminology'

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
  const uploadedColumnCount = uploadedData?.[0] ? Object.keys(uploadedData[0]).length : 0
  const variablePreview = statisticalResult.variables?.slice(0, 4) ?? []
  const remainingVariableCount = Math.max((statisticalResult.variables?.length ?? 0) - variablePreview.length, 0)

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
              <Sparkles className="w-3.5 h-3.5 text-primary flex-shrink-0 mt-0.5" />
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

            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
                분석 방법
              </p>
              <p className="truncate text-sm font-semibold text-foreground">{statisticalResult.testName}</p>
            </div>

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

          {/* 2행: APA + 메타데이터 */}
          {(apaFormat || uploadedFileName || uploadedData || statisticalResult.variables || validationMeta) && (
            <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
              {apaFormat && (
                <div className="rounded-xl border border-border/40 bg-surface-container/30 px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">APA</span>
                    <button
                      type="button"
                      className="inline-flex items-center text-muted-foreground/40 hover:text-foreground/70 transition-colors"
                      onClick={() => {
                        void navigator.clipboard.writeText(apaFormat)
                        toast.success(TOAST.clipboard.copySuccess)
                      }}
                      aria-label="APA 복사"
                    >
                      <Copy className="w-3 h-3" />
                    </button>
                  </div>
                  <code className="mt-2 block text-xs leading-relaxed font-mono text-foreground/75 select-all break-words">
                    {apaFormat}
                  </code>
                </div>
              )}

              <div className="rounded-xl border border-border/40 bg-surface-container/20 px-4 py-3 space-y-2.5">
                {(uploadedFileName || uploadedData) && (
                  <div className="grid gap-2 sm:grid-cols-2">
                    {uploadedFileName && (
                      <div className="rounded-lg border border-border/40 bg-background/70 px-3 py-2.5">
                        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
                          파일
                        </p>
                        <p className="mt-1 text-sm text-foreground/80 break-all">{uploadedFileName}</p>
                      </div>
                    )}

                    {uploadedData && (
                      <div className="rounded-lg border border-border/40 bg-background/70 px-3 py-2.5">
                        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
                          데이터 크기
                        </p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {t.results.metadata.rowsCols(uploadedData.length, uploadedColumnCount)}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {statisticalResult.variables && statisticalResult.variables.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
                      변수
                    </p>
                    <div
                      className="flex flex-wrap gap-1.5"
                      title={statisticalResult.variables.join(', ')}
                    >
                      {variablePreview.map((variable) => (
                        <Badge key={variable} variant="outline" className="bg-background/70 text-[11px] font-normal">
                          {variable}
                        </Badge>
                      ))}
                      {remainingVariableCount > 0 && (
                        <Badge variant="outline" className="bg-background/70 text-[11px] font-normal">
                          +{remainingVariableCount}
                        </Badge>
                      )}
                    </div>
                  </div>
                )}

                {validationMeta && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="inline-flex items-center gap-2 text-[11px] text-muted-foreground/70 cursor-help">
                        <Badge variant="outline" className="border-border/50 bg-background/70 text-[11px] font-normal">
                          {validationMeta.isCustomImpl ? '자체 구현' : validationMeta.pythonLib}
                        </Badge>
                        <Badge variant="outline" className="border-border/50 bg-background/70 text-[11px] font-normal">
                          R 검증 완료
                        </Badge>
                      </div>
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
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}
