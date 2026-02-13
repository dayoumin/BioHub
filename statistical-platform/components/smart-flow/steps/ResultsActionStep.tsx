'use client'

import { useState, useRef, useEffect, useMemo, useCallback } from 'react'
import {
  Save,
  Copy,
  RotateCcw,
  CheckCircle2,
  XCircle,
  AlertCircle,
  MoreHorizontal,
  RefreshCw,
  FileText,
  Sparkles,
  BarChart3,
  Lightbulb,
  ChevronRight
} from 'lucide-react'
import { toast } from 'sonner'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { AnalysisResult } from '@/types/smart-flow'
import { useSmartFlowStore } from '@/lib/stores/smart-flow-store'
import { startNewAnalysis } from '@/lib/services/data-management'
import { ExportDropdown } from '@/components/smart-flow/ExportDropdown'
import { splitInterpretation, generateSummaryText } from '@/lib/services/export/export-data-builder'
import { convertToStatisticalResult } from '@/lib/statistics/result-converter'
import { TemplateSaveModal } from '@/components/smart-flow/TemplateSaveModal'
import ReactMarkdown from 'react-markdown'
import { cn } from '@/lib/utils'
import { CollapsibleSection, StatisticCard } from '@/components/smart-flow/common'
import { ConfidenceIntervalDisplay } from '@/components/statistics/common/ConfidenceIntervalDisplay'
import { MethodSpecificResults } from '@/components/smart-flow/steps/results/MethodSpecificResults'
import { ResultsVisualization } from '@/components/smart-flow/ResultsVisualization'
import { requestInterpretation, type InterpretationContext } from '@/lib/services/result-interpreter'
import { EffectSizeCard } from '@/components/statistics/common/EffectSizeCard'
import { AssumptionTestCard, type AssumptionTest } from '@/components/statistics/common/AssumptionTestCard'
import { StatisticsTable } from '@/components/statistics/common/StatisticsTable'
import { formatStatisticalResult } from '@/lib/statistics/formatters'
import { useTerminology } from '@/hooks/use-terminology'
import type { ResultsText } from '@/lib/terminology/terminology-types'

interface ResultsActionStepProps {
  results: AnalysisResult | null
}

// 효과크기 해석
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
    default:
      if (absValue < 0.2) return labels.small
      if (absValue < 0.5) return labels.medium
      return labels.large
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

export function ResultsActionStep({ results }: ResultsActionStepProps) {
  // Terminology System
  const t = useTerminology()

  const [isSaved, setIsSaved] = useState(false)
  const [isCopied, setIsCopied] = useState(false)
  const [templateModalOpen, setTemplateModalOpen] = useState(false)
  const [detailedResultsOpen, setDetailedResultsOpen] = useState(true)
  const [diagnosticsOpen, setDiagnosticsOpen] = useState(false)
  const chartRef = useRef<HTMLDivElement>(null)

  // AI 해석 상태
  const [interpretation, setInterpretation] = useState<string | null>(null)
  const [isInterpreting, setIsInterpreting] = useState(false)
  const [interpretError, setInterpretError] = useState<string | null>(null)
  const [detailedInterpretOpen, setDetailedInterpretOpen] = useState(false)
  const interpretAbortRef = useRef<AbortController | null>(null)
  const interpretedResultRef = useRef<string | null>(null) // 캐시 key (results.method + pValue)


  const {
    saveToHistory,
    reset,
    setCurrentStep,
    setUploadedData,
    setUploadedFile,
    setValidationResults,
    setResults,
    setIsReanalysisMode,
    uploadedData,
    variableMapping,
    uploadedFileName,
    selectedMethod,
  } = useSmartFlowStore()

  const savedTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const copiedTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (savedTimeoutRef.current) clearTimeout(savedTimeoutRef.current)
      if (copiedTimeoutRef.current) clearTimeout(copiedTimeoutRef.current)
    }
  }, [])

  // AnalysisResult -> StatisticalResult 변환
  const statisticalResult = useMemo(() => {
    if (!results) return null

    const variables: string[] = []
    if (variableMapping?.dependentVar) {
      if (Array.isArray(variableMapping.dependentVar)) {
        variables.push(...variableMapping.dependentVar)
      } else {
        variables.push(variableMapping.dependentVar)
      }
    }
    if (variableMapping?.independentVar) {
      if (Array.isArray(variableMapping.independentVar)) {
        variables.push(...variableMapping.independentVar)
      } else {
        variables.push(variableMapping.independentVar)
      }
    }
    if (variableMapping?.groupVar) {
      variables.push(variableMapping.groupVar)
    }

    return convertToStatisticalResult(results, {
      sampleSize: uploadedData?.length,
      groups: results.groupStats?.length,
      variables: variables.length > 0 ? variables : undefined,
      timestamp: new Date()
    })
  }, [results, uploadedData, variableMapping])

  // 유의성 판단
  const isSignificant = useMemo(() => {
    if (!statisticalResult) return false
    return statisticalResult.pValue < (statisticalResult.alpha || 0.05)
  }, [statisticalResult])

  // 가정 충족 여부
  const assumptionsPassed = useMemo(() => {
    if (!statisticalResult?.assumptions) return true
    return statisticalResult.assumptions.every(a => a.passed !== false)
  }, [statisticalResult])

  // 가정 미충족 시 진단 섹션 자동 열림
  useEffect(() => {
    if (!assumptionsPassed) {
      setDiagnosticsOpen(true)
    }
  }, [assumptionsPassed])

  // AssumptionTest[] 매핑 (AssumptionTestCard용)
  const assumptionTests = useMemo((): AssumptionTest[] => {
    if (!statisticalResult?.assumptions) return []
    return statisticalResult.assumptions.map((a) => ({
      name: a.name,
      description: a.description,
      statistic: a.testStatistic,
      testStatistic: a.testStatistic,
      pValue: a.pValue,
      passed: a.passed,
      recommendation: a.recommendation,
      severity: a.severity ?? (a.passed === false ? 'medium' as const : 'low' as const),
      alpha: 0.05,
    }))
  }, [statisticalResult])

  // Layer 2 표시 여부 (상세 결과 + 메타데이터)
  const hasDetailedResults = useMemo(() => {
    if (!statisticalResult) return false
    return !!(
      statisticalResult.confidenceInterval ||
      statisticalResult.effectSize ||
      (statisticalResult.additionalResults && statisticalResult.additionalResults.length > 0) ||
      uploadedFileName ||
      uploadedData
    )
  }, [statisticalResult, uploadedFileName, uploadedData])

  // Layer 3 표시 여부 (가정검정, 권장사항, 경고, 대안 중 하나라도 있을 때)
  const hasDiagnostics = useMemo(() => {
    if (!statisticalResult) return false
    return !!(
      (statisticalResult.assumptions && statisticalResult.assumptions.length > 0) ||
      (statisticalResult.recommendations && statisticalResult.recommendations.length > 0) ||
      (statisticalResult.warnings && statisticalResult.warnings.length > 0) ||
      (statisticalResult.alternatives && statisticalResult.alternatives.length > 0)
    )
  }, [statisticalResult])

  // APA 형식 요약
  const apaFormat = useMemo(() => {
    if (!statisticalResult || statisticalResult.df === undefined) return null
    return formatStatisticalResult(
      statisticalResult.statisticName || 'Statistic',
      statisticalResult.statistic,
      statisticalResult.df,
      statisticalResult.pValue
    )
  }, [statisticalResult])

  // Handlers
  const handleSaveToHistory = useCallback(async () => {
    const defaultName = t.results.save.defaultName(new Date().toLocaleString())
    const name = prompt(t.results.save.promptMessage, defaultName)

    if (name && name.trim()) {
      const sanitizedName = name.trim().slice(0, 100)
      try {
        await saveToHistory(sanitizedName)
        setIsSaved(true)
        toast.success(t.results.save.success)

        if (savedTimeoutRef.current) clearTimeout(savedTimeoutRef.current)
        savedTimeoutRef.current = setTimeout(() => {
          setIsSaved(false)
          savedTimeoutRef.current = null
        }, 3000)
      } catch (err) {
        toast.error(t.results.save.errorTitle, {
          description: err instanceof Error ? err.message : t.results.save.unknownError
        })
      }
    }
  }, [saveToHistory])

  const handleReanalyze = useCallback(() => {
    setUploadedData(null)
    setUploadedFile(null)
    setValidationResults(null)
    setResults(null)
    setIsReanalysisMode(true)
    setCurrentStep(1)

    toast.info(t.results.toast.reanalyzeReady, {
      description: selectedMethod ? t.results.toast.reanalyzeMethod(selectedMethod.name) : ''
    })
  }, [setUploadedData, setUploadedFile, setValidationResults, setResults, setIsReanalysisMode, setCurrentStep, selectedMethod])

  const handleNewAnalysis = useCallback(async () => {
    try {
      await startNewAnalysis()
      toast.info(t.results.toast.newAnalysis)
    } catch (error) {
      console.error('Failed to start new analysis:', error)
      reset()
      toast.info(t.results.toast.newAnalysis)
    }
  }, [reset])

  // 내보내기용 데이터 정보
  const exportDataInfo = useMemo(() => {
    if (!uploadedData || uploadedData.length === 0) return null
    return {
      fileName: uploadedFileName ?? null,
      totalRows: uploadedData.length,
      columnCount: Object.keys(uploadedData[0] || {}).length,
      variables: Object.keys(uploadedData[0] || {}),
    }
  }, [uploadedData, uploadedFileName])

  // AI 해석 요청 (스트리밍)
  const handleInterpretation = useCallback(async () => {
    if (!results) return

    // 캐시: 같은 결과면 재호출 안 함
    const cacheKey = `${results.method}:${results.pValue}:${results.statistic}`
    if (interpretedResultRef.current === cacheKey) return

    setIsInterpreting(true)
    setInterpretError(null)
    setInterpretation('')

    const controller = new AbortController()
    interpretAbortRef.current = controller

    try {
      const variables: string[] = []
      if (variableMapping?.dependentVar) {
        if (Array.isArray(variableMapping.dependentVar)) variables.push(...variableMapping.dependentVar)
        else variables.push(variableMapping.dependentVar)
      }
      if (variableMapping?.independentVar) {
        if (Array.isArray(variableMapping.independentVar)) variables.push(...variableMapping.independentVar)
        else variables.push(variableMapping.independentVar)
      }
      if (variableMapping?.groupVar) variables.push(variableMapping.groupVar)

      const ctx: InterpretationContext = {
        results,
        sampleSize: uploadedData?.length,
        variables: variables.length > 0 ? variables : undefined,
        uploadedFileName: uploadedFileName ?? undefined
      }

      let accumulated = ''
      await requestInterpretation(
        ctx,
        (chunk) => {
          accumulated += chunk
          setInterpretation(accumulated)
        },
        controller.signal
      )

      interpretedResultRef.current = cacheKey
    } catch (error) {
      if (controller.signal.aborted) return
      const msg = error instanceof Error ? error.message : t.results.ai.defaultError
      setInterpretError(msg)
    } finally {
      setIsInterpreting(false)
      interpretAbortRef.current = null
    }
  }, [results, uploadedData, variableMapping, uploadedFileName])

  // 결과 로드 시 자동 AI 해석 요청
  useEffect(() => {
    if (results && interpretation === null && !isInterpreting) {
      handleInterpretation()
    }
    return () => {
      interpretAbortRef.current?.abort()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [results?.method, results?.pValue, results?.statistic])

  const handleCopyResults = useCallback(async () => {
    if (!results || !statisticalResult) return

    try {
      // ---- plain text 버전 ----
      const plainText = generateSummaryText(results)
      const aiPlain = interpretation
        ? `\n\n${t.results.clipboard.aiSeparator}\n${interpretation}`
        : ''

      // ---- HTML 버전 ----
      const pVal = results.pValue < 0.001 ? '< .001' : results.pValue.toFixed(4)
      const esValue = results.effectSize !== undefined
        ? (typeof results.effectSize === 'number'
          ? results.effectSize.toFixed(4)
          : results.effectSize.value.toFixed(4))
        : '-'

      let html = `<h3>${statisticalResult.testName}</h3>`
      html += `<table border="1" cellpadding="6" cellspacing="0" style="border-collapse:collapse;font-size:14px">`
      html += `<thead><tr style="background:#f3f4f6"><th>${t.results.clipboard.itemHeader}</th><th>${t.results.clipboard.valueHeader}</th></tr></thead><tbody>`
      html += `<tr><td>${t.results.clipboard.statistic(statisticalResult.statisticName || 't')}</td><td><b>${(statisticalResult.statistic ?? 0).toFixed(4)}</b></td></tr>`
      if (statisticalResult.df !== undefined) {
        const dfStr = Array.isArray(statisticalResult.df) ? statisticalResult.df.join(', ') : String(statisticalResult.df)
        html += `<tr><td>${t.results.clipboard.df}</td><td>${dfStr}</td></tr>`
      }
      html += `<tr><td>p-value</td><td><b>${pVal}</b></td></tr>`
      html += `<tr><td>${t.results.clipboard.effectSize}</td><td>${esValue}</td></tr>`
      if (results.confidence) {
        html += `<tr><td>${t.results.clipboard.confidenceInterval}</td><td>[${results.confidence.lower.toFixed(4)}, ${results.confidence.upper.toFixed(4)}]</td></tr>`
      }
      html += `</tbody></table>`

      if (statisticalResult.interpretation) {
        html += `<p><b>${t.results.clipboard.interpretation}</b> ${statisticalResult.interpretation}</p>`
      }
      if (apaFormat) {
        html += `<p><b>APA:</b> <i>${apaFormat}</i></p>`
      }

      // AI 해석 (있을 때만) — 마크다운 원문을 pre로 감싸서 서식 유지
      if (interpretation) {
        const { summary, detail } = splitInterpretation(interpretation)
        html += `<hr/><h4>${t.results.clipboard.aiInterpretation}</h4>`
        html += `<pre style="white-space:pre-wrap;font-family:inherit;margin:0">${summary}</pre>`
        if (detail) {
          html += `<pre style="white-space:pre-wrap;font-family:inherit;margin:8px 0 0">${detail}</pre>`
        }
      }

      // ClipboardItem API (HTML + plain text 동시 제공)
      if (typeof ClipboardItem !== 'undefined') {
        const htmlBlob = new Blob([html], { type: 'text/html' })
        const textBlob = new Blob([plainText + aiPlain], { type: 'text/plain' })
        await navigator.clipboard.write([
          new ClipboardItem({
            'text/html': htmlBlob,
            'text/plain': textBlob,
          }),
        ])
      } else {
        // 폴백: plain text only
        await navigator.clipboard.writeText(plainText + aiPlain)
      }

      setIsCopied(true)
      toast.success(interpretation ? t.results.toast.copyWithAi : t.results.toast.copySuccess)

      if (copiedTimeoutRef.current) clearTimeout(copiedTimeoutRef.current)
      copiedTimeoutRef.current = setTimeout(() => {
        setIsCopied(false)
        copiedTimeoutRef.current = null
      }, 2000)
    } catch (err) {
      console.error('Copy failed:', err)
      toast.error(t.results.toast.copyError)
    }
  }, [results, statisticalResult, interpretation, apaFormat])

  if (!results || !statisticalResult) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">{t.results.noResults}</p>
      </div>
    )
  }

  return (
    <TooltipProvider>
      <div className="space-y-6" ref={chartRef}>
        {/* ===== 메인 결과 카드 ===== */}
        <Card className={cn(
          "overflow-hidden",
          !assumptionsPassed ? "border-amber-300" :
          isSignificant ? "border-green-300" : "border-gray-200"
        )} data-testid="results-main-card">
          {/* 헤더: 분석명 + 시간 */}
          <CardHeader className="pb-3 bg-muted/30">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                {!assumptionsPassed ? (
                  <AlertCircle className="w-5 h-5 text-amber-500" />
                ) : isSignificant ? (
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                ) : (
                  <XCircle className="w-5 h-5 text-gray-400" />
                )}
                {statisticalResult.testName}
              </CardTitle>
              <span className="text-xs text-muted-foreground">
                {new Date().toLocaleString('ko-KR', {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </span>
            </div>
          </CardHeader>

          <CardContent className="pt-4 space-y-4">
            {/* ===== 핵심 결론 (1줄) ===== */}
            <div className={cn(
              "p-3 rounded-lg text-center font-medium",
              !assumptionsPassed ? "bg-amber-50 text-amber-800 dark:bg-amber-950/30 dark:text-amber-200" :
              isSignificant ? "bg-green-50 text-green-800 dark:bg-green-950/30 dark:text-green-200" :
              "bg-gray-50 text-gray-600 dark:bg-gray-900/30 dark:text-gray-300"
            )}>
              {!assumptionsPassed ? (
                t.results.conclusion.assumptionWarning
              ) : isSignificant ? (
                t.results.conclusion.significant
              ) : (
                t.results.conclusion.notSignificant
              )}
            </div>

            {/* ===== 핵심 숫자 3개 ===== */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* 통계량 */}
              <StatisticCard label={t.results.statistics.statistic} tooltip={t.results.statistics.statisticTooltip}>
                <p className="text-xl font-bold font-mono">
                  {statisticalResult.statisticName || 't'} = {(statisticalResult.statistic ?? 0).toFixed(2)}
                </p>
                {statisticalResult.df && (
                  <p className="text-xs text-muted-foreground mt-1">
                    df = {Array.isArray(statisticalResult.df) ? statisticalResult.df.join(', ') : statisticalResult.df}
                  </p>
                )}
              </StatisticCard>

              {/* p-value */}
              <StatisticCard label={t.results.statistics.pValue} tooltip={t.results.statistics.pValueTooltip}>
                <p className={cn(
                  "text-xl font-bold font-mono",
                  isSignificant ? "text-green-600 dark:text-green-400" : "text-gray-500"
                )}>
                  p {formatPValue(statisticalResult.pValue)}
                </p>
                <Badge variant={isSignificant ? "default" : "secondary"} className="mt-1 text-xs">
                  {isSignificant ? t.results.statistics.significant : t.results.statistics.notSignificant}
                </Badge>
              </StatisticCard>

              {/* 효과크기 */}
              <StatisticCard label={t.results.statistics.effectSize} tooltip={t.results.statistics.effectSizeTooltip}>
                {statisticalResult.effectSize ? (
                  <>
                    <p className="text-xl font-bold font-mono">
                      {(statisticalResult.effectSize.value ?? 0).toFixed(2)}
                    </p>
                    <Badge variant="outline" className="mt-1 text-xs">
                      {getEffectSizeInterpretation(statisticalResult.effectSize.value, statisticalResult.effectSize.type, t.results.effectSizeLabels)}
                    </Badge>
                  </>
                ) : (
                  <p className="text-xl font-bold text-muted-foreground">-</p>
                )}
              </StatisticCard>
            </div>

            {/* ===== 해석 ===== */}
            {statisticalResult.interpretation && (
              <div className="p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-100 dark:border-blue-900">
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  💡 {statisticalResult.interpretation}
                </p>
              </div>
            )}

            {/* ===== AI 해석 (인라인 2단 구조) ===== */}
            <div className="space-y-2" data-testid="ai-interpretation-section">
              {/* 로딩 중 */}
              {isInterpreting && !interpretation && (
                <div className="p-3 bg-purple-50 dark:bg-purple-950/30 rounded-lg border border-purple-100 dark:border-purple-900 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-purple-500 animate-pulse" />
                  <span className="text-sm text-purple-700 dark:text-purple-300">{t.results.ai.loading}</span>
                </div>
              )}

              {/* 한줄 요약 (항상 표시) */}
              {interpretation && (() => {
                const { summary, detail } = splitInterpretation(interpretation)
                return (
                  <>
                    <div className="p-3 bg-purple-50 dark:bg-purple-950/30 rounded-lg border border-purple-100 dark:border-purple-900">
                      <div className="flex items-start gap-2">
                        <Sparkles className="w-4 h-4 text-purple-500 mt-0.5 shrink-0" />
                        <div className="prose prose-sm dark:prose-invert max-w-none text-sm leading-relaxed flex-1">
                          <ReactMarkdown>{summary}</ReactMarkdown>
                          {isInterpreting && (
                            <span className="inline-block w-1.5 h-4 bg-purple-500 animate-pulse ml-0.5 align-text-bottom" />
                          )}
                        </div>
                      </div>
                    </div>

                    {/* 상세 해석 (펼침) */}
                    {detail && (
                      <CollapsibleSection
                        label={t.results.ai.detailedLabel}
                        open={detailedInterpretOpen}
                        onOpenChange={setDetailedInterpretOpen}
                        contentClassName="pt-2"
                        icon={<Sparkles className="h-3.5 w-3.5 text-purple-500" />}
                      >
                        <div className="prose prose-sm dark:prose-invert max-w-none text-sm leading-relaxed">
                          <ReactMarkdown>{detail}</ReactMarkdown>
                        </div>
                      </CollapsibleSection>
                    )}

                    {/* 다시 해석 */}
                    {!isInterpreting && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          interpretedResultRef.current = null
                          setInterpretation(null)
                          handleInterpretation()
                        }}
                        className="text-xs text-muted-foreground h-6 px-2"
                      >
                        <RefreshCw className="w-3 h-3 mr-1" />
                        {t.results.ai.reinterpret}
                      </Button>
                    )}
                  </>
                )
              })()}

              {/* 에러 표시 */}
              {interpretError && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="text-sm">
                    {interpretError}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        interpretedResultRef.current = null
                        handleInterpretation()
                      }}
                      className="ml-2 text-xs h-6 px-2"
                    >
                      {t.results.ai.retry}
                    </Button>
                  </AlertDescription>
                </Alert>
              )}
            </div>

            {/* ===== 시각화 ===== */}
            <ResultsVisualization results={results} />

            {/* ===== Layer 2: 상세 결과 (접기/펼치기) ===== */}
            {hasDetailedResults && (
              <CollapsibleSection
                label={t.results.sections.detailedResults}
                data-testid="detailed-results-section"
                open={detailedResultsOpen}
                onOpenChange={setDetailedResultsOpen}
                contentClassName="pt-3 space-y-4"
                icon={<BarChart3 className="h-3.5 w-3.5" />}
              >
                {/* 신뢰구간 */}
                {statisticalResult.confidenceInterval && (
                  <ConfidenceIntervalDisplay
                    label={t.results.sections.confidenceInterval}
                    lower={statisticalResult.confidenceInterval.lower}
                    upper={statisticalResult.confidenceInterval.upper}
                    estimate={statisticalResult.confidenceInterval.estimate}
                    level={Math.round((statisticalResult.confidenceInterval.level ?? 0.95) * 100)}
                    showVisualization
                    showInterpretation
                    className="border-0 shadow-none bg-transparent"
                  />
                )}

                {/* 효과크기 상세 스케일 */}
                {statisticalResult.effectSize && (
                  <EffectSizeCard
                    title={t.smartFlow.resultSections.effectSizeDetail}
                    value={statisticalResult.effectSize.value}
                    type={statisticalResult.effectSize.type}
                    showInterpretation
                    showVisualScale
                    className="border-0 shadow-none bg-transparent"
                  />
                )}

                {/* 추가 결과 테이블 (그룹통계, 사후검정, 회귀계수) */}
                {statisticalResult.additionalResults?.map((table, idx) => (
                  <StatisticsTable
                    key={idx}
                    title={table.title}
                    columns={(table.columns as Array<{ key: string; label: string }>).map(col => ({
                      key: col.key,
                      header: col.label,
                    }))}
                    data={table.data}
                    compactMode
                    className="border-0 shadow-none"
                  />
                ))}

                {/* 방법별 추가 메트릭 */}
                <MethodSpecificResults results={results} />

                {/* APA 형식 요약 */}
                {apaFormat && (
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <p className="text-xs text-muted-foreground mb-1">{t.results.sections.apaFormat}</p>
                    <code className="text-sm font-mono">{apaFormat}</code>
                  </div>
                )}

                {/* 메타데이터 */}
                <div className="grid grid-cols-2 gap-2 text-sm pt-2 border-t">
                  {uploadedFileName && (
                    <div>
                      <span className="text-muted-foreground">{t.results.metadata.file} </span>
                      <span className="font-medium">{uploadedFileName}</span>
                    </div>
                  )}
                  {uploadedData && (
                    <div>
                      <span className="text-muted-foreground">{t.results.metadata.data} </span>
                      <span className="font-medium">{t.results.metadata.rowsCols(uploadedData.length, Object.keys(uploadedData[0] || {}).length)}</span>
                    </div>
                  )}
                  {statisticalResult.variables && (
                    <div className="col-span-2">
                      <span className="text-muted-foreground">{t.results.metadata.variables} </span>
                      <span className="font-medium">{statisticalResult.variables.join(', ')}</span>
                    </div>
                  )}
                </div>
              </CollapsibleSection>
            )}

            {/* ===== Layer 3: 진단 & 권장 (접기/펼치기) ===== */}
            {hasDiagnostics && (
              <CollapsibleSection
                label={t.results.sections.diagnostics}
                data-testid="diagnostics-section"
                open={diagnosticsOpen}
                onOpenChange={setDiagnosticsOpen}
                contentClassName="pt-3 space-y-4"
                icon={<Lightbulb className="h-3.5 w-3.5" />}
                badge={
                  !assumptionsPassed ? (
                    <Badge variant="outline" className="text-xs border-amber-300 text-amber-700">
                      {t.results.sections.caution}
                    </Badge>
                  ) : undefined
                }
              >
                {/* 가정 검정 상세 */}
                {assumptionTests.length > 0 && (
                  <AssumptionTestCard
                    tests={assumptionTests}
                    testType={statisticalResult.testType}
                    showRecommendations
                    showDetails
                    className="border-0 shadow-none bg-transparent"
                  />
                )}

                {/* 권장사항 */}
                {statisticalResult.recommendations && statisticalResult.recommendations.length > 0 && (
                  <div className="space-y-2" data-testid="recommendations-section">
                    <p className="text-sm font-medium flex items-center gap-1.5">
                      <Lightbulb className="w-3.5 h-3.5 text-blue-600" />
                      {t.results.sections.recommendations}
                    </p>
                    <ul className="space-y-1.5">
                      {statisticalResult.recommendations.map((rec, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-sm text-muted-foreground">
                          <ChevronRight className="w-3 h-3 mt-1 shrink-0" />
                          <span>{rec}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* 경고 (generateWarnings()는 가정 관련 경고만 생성 → AssumptionTestCard와 중복 제거) */}
                {statisticalResult.warnings && statisticalResult.warnings.length > 0 &&
                  assumptionTests.length === 0 && (
                  <Alert variant="destructive" data-testid="warnings-section">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>{t.results.sections.warnings}</AlertTitle>
                    <AlertDescription>
                      <ul className="mt-1 space-y-1">
                        {statisticalResult.warnings.map((warning, idx) => (
                          <li key={idx} className="text-sm">{warning}</li>
                        ))}
                      </ul>
                    </AlertDescription>
                  </Alert>
                )}

                {/* 대안 분석 방법 (AssumptionTestCard가 testType으로 이미 표시하는 경우 중복 제거) */}
                {statisticalResult.alternatives && statisticalResult.alternatives.length > 0 &&
                  !statisticalResult.testType && (
                  <div className="space-y-2" data-testid="alternatives-section">
                    <p className="text-sm font-medium">{t.results.sections.alternatives}</p>
                    <div className="space-y-1.5">
                      {statisticalResult.alternatives.map((alt, idx) => (
                        <div key={idx} className={cn("p-2.5 rounded-lg border text-sm",
                          alt.action ? "hover:bg-muted/50 cursor-pointer transition-colors" : ""
                        )} onClick={alt.action}>
                          <span className="font-medium">{alt.name}</span>
                          <span className="text-muted-foreground ml-1.5">{alt.reason}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              </CollapsibleSection>
            )}
          </CardContent>
        </Card>

        {/* ===== 액션 버튼 (1줄) ===== */}
        <div className="flex items-center gap-2 flex-wrap" data-testid="action-buttons">
          {/* Primary Actions */}
          <Button
            variant={isSaved ? "default" : "outline"}
            size="sm"
            onClick={handleSaveToHistory}
            className="flex-1"
          >
            <Save className="w-4 h-4 mr-1.5" />
            {isSaved ? t.results.buttons.saved : t.results.buttons.save}
          </Button>

          <ExportDropdown
            results={results}
            statisticalResult={statisticalResult}
            interpretation={interpretation}
            apaFormat={apaFormat}
            dataInfo={exportDataInfo}
            t={t.results}
          />

          <Button
            variant="outline"
            size="sm"
            onClick={handleCopyResults}
            className="flex-1"
          >
            <Copy className="w-4 h-4 mr-1.5" />
            {isCopied ? t.results.buttons.copied : t.results.buttons.copy}
          </Button>

          {/* More Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setTemplateModalOpen(true)}>
                <FileText className="w-4 h-4 mr-2" />
                {t.results.buttons.saveTemplate}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleReanalyze}>
                <RefreshCw className="w-4 h-4 mr-2" />
                {t.results.buttons.reanalyze}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleNewAnalysis}>
                <RotateCcw className="w-4 h-4 mr-2" />
                {t.results.buttons.newAnalysis}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* 템플릿 저장 모달 */}
        <TemplateSaveModal
          open={templateModalOpen}
          onOpenChange={setTemplateModalOpen}
          onSaved={() => {
            toast.success(t.results.toast.templateSaved)
          }}
        />
      </div>
    </TooltipProvider>
  )
}
