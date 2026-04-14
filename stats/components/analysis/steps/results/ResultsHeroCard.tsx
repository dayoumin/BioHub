'use client'

import { motion } from 'framer-motion'
import {
  CheckCircle2,
  XCircle,
  AlertCircle,
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
import type { ExecutionSettingEntry } from '@/lib/utils/analysis-execution'
import { getSettingOptionLabel } from '@/lib/utils/analysis-execution'
import type { StatisticalMethodRequirements } from '@/lib/statistics/variable-requirements'
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
  /** Step 3 `buildAnalysisExecutionContext`가 생성한 라벨 해석 entry. Hero 메타 배지로 표시. */
  executionSettingEntries?: ExecutionSettingEntry[]
  /** 각 entry의 default 값을 조회해 "기본값 그대로"인 배지는 숨기는 데 쓴다. */
  methodRequirements?: StatisticalMethodRequirements
  prefersReducedMotion: boolean
  t: Pick<TerminologyDictionary, 'results'>
}

// showAssumptions/showEffectSize는 hero에 노출하기에 과도함 (assumption은 별도 섹션, effect는 StatsCards).
// alpha는 기본값(0.05)이면 숨긴다. methodRequirements가 있으면 각 setting.default와 비교해
// 기본값 그대로인 항목은 숨겨 "사용자가 실제로 바꾼 옵션"만 hero 상단에 강조한다.
// 의도적 비대칭: alpha는 methodRequirements 유무와 무관하게 하드코딩 default(0.05)로 숨김,
// 다른 항목은 methodRequirements 있을 때만 숨김. 히스토리 복원처럼 method 해석이 불가능한
// 경우 default-but-shown 배지가 노출될 수 있으나, 이는 "선택 이력이 보존됐다"는 시각적 신호로
// 수용한다. 통합 숨김이 필요하면 KNOWN_DEFAULT_LABELS 폴백 맵 추가 고려.
const HERO_HIDDEN_ENTRY_KEYS = new Set(['showAssumptions', 'showEffectSize'])
const DEFAULT_ALPHA = 0.05

export function pickHeroOptionEntries(
  entries: ExecutionSettingEntry[] | undefined,
  methodRequirements?: StatisticalMethodRequirements,
): ExecutionSettingEntry[] {
  if (!entries) return []
  const settings = methodRequirements?.settings
  return entries.filter((entry) => {
    if (HERO_HIDDEN_ENTRY_KEYS.has(entry.key)) return false
    if (entry.key === 'alpha') return Number(entry.value) !== DEFAULT_ALPHA
    const setting = settings?.[entry.key]
    if (setting?.default !== undefined && setting?.default !== null) {
      const defaultLabel = getSettingOptionLabel(setting.options, setting.default)
      if (entry.value === defaultLabel) return false
    }
    return true
  })
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
  executionSettingEntries,
  methodRequirements,
  prefersReducedMotion,
  t,
}: ResultsHeroCardProps): React.ReactElement {
  const resolvedMethodId = methodId ?? statisticalResult.testName
  const methodEntry = resolvedMethodId ? STATISTICAL_METHODS[resolvedMethodId] : null
  const validationMeta = resolvedMethodId ? VALIDATION_METADATA[resolvedMethodId] : undefined
  const heroOptionEntries = pickHeroOptionEntries(executionSettingEntries, methodRequirements)
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
        "overflow-hidden rounded-xl border border-border/40",
        isSignificant || !showBinaryConclusion
          ? "bg-surface-container-lowest"
          : "bg-surface-container-low"
      )}>
        <CardContent className="px-4 py-3.5">
          <div className={cn(
            'mb-3 rounded-lg px-3 py-2',
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
            <div className="mt-3 grid gap-2.5 xl:grid-cols-[minmax(0,1.3fr)_minmax(280px,0.95fr)] xl:items-start">
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

              <div className="rounded-xl border border-border/40 bg-surface-container/20 px-4 py-3 space-y-2">
                <div className="flex flex-wrap gap-1.5">
                  {uploadedFileName && (
                    <Badge variant="outline" className="max-w-full bg-background/70 text-[11px] font-normal" title={uploadedFileName}>
                      <span className="truncate">파일 · {uploadedFileName}</span>
                    </Badge>
                  )}
                  {uploadedData && (
                    <Badge variant="outline" className="bg-background/70 text-[11px] font-normal">
                      {t.results.metadata.rowsCols(uploadedData.length, uploadedColumnCount)}
                    </Badge>
                  )}
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

                {heroOptionEntries.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 bg-surface-container/25 rounded-md px-2 py-1.5" data-testid="analysis-options-badges">
                    <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60 self-start pt-[3px]">옵션</span>
                    {heroOptionEntries.map((entry) => (
                      <Badge
                        key={entry.key}
                        variant="outline"
                        className="border-border/50 bg-background/70 text-[11px] font-normal"
                        data-testid={`option-badge-${entry.key}`}
                      >
                        {entry.label === entry.value ? entry.label : `${entry.label} ${entry.value}`}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}
