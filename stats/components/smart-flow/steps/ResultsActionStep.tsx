'use client'

import { useState, useRef, useEffect, useMemo, useCallback } from 'react'
import {
  Save,
  Copy,
  RotateCcw,
  CheckCircle2,
  XCircle,
  AlertCircle,
  RefreshCw,
  FileText,
  Sparkles,
  BarChart3,
  Lightbulb,
  ChevronRight,
  FileSearch,
  ArrowLeft,
  Send,
  MessageCircle,
} from 'lucide-react'
import { EmptyState } from '@/components/common/EmptyState'
import { toast } from 'sonner'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { TooltipProvider } from '@/components/ui/tooltip'
import { AnalysisResult } from '@/types/smart-flow'
import { useSmartFlowStore } from '@/lib/stores/smart-flow-store'
import { startNewAnalysis } from '@/lib/services/data-management'
import { ExportService } from '@/lib/services/export/export-service'
import type { ExportFormat, ExportContext, ExportContentOptions } from '@/lib/services/export/export-types'
import { splitInterpretation, generateSummaryText } from '@/lib/services/export/export-data-builder'
import { convertToStatisticalResult } from '@/lib/statistics/result-converter'
import { TemplateSaveModal } from '@/components/smart-flow/TemplateSaveModal'
import ReactMarkdown from 'react-markdown'
import { cn } from '@/lib/utils'
import { StepHeader, CollapsibleSection, StatisticCard } from '@/components/smart-flow/common'
import { ConfidenceIntervalDisplay } from '@/components/statistics/common/ConfidenceIntervalDisplay'
import { MethodSpecificResults } from '@/components/smart-flow/steps/results/MethodSpecificResults'
import { ResultsVisualization } from '@/components/smart-flow/ResultsVisualization'
import { requestInterpretation, streamFollowUp, type InterpretationContext } from '@/lib/services/result-interpreter'
import type { ChatMessage } from '@/lib/types/chat'
import { EffectSizeCard } from '@/components/statistics/common/EffectSizeCard'
import { AssumptionTestCard, type AssumptionTest } from '@/components/statistics/common/AssumptionTestCard'
import { StatisticsTable } from '@/components/statistics/common/StatisticsTable'
import { formatStatisticalResult } from '@/lib/statistics/formatters'
import { useTerminology } from '@/hooks/use-terminology'
import type { ResultsText } from '@/lib/terminology/terminology-types'

interface ResultsActionStepProps {
  results: AnalysisResult | null
}

// 효과크기 해석 (export-data-builder의 interpretEffectSize와 동일 기준)
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
      if (absValue < 0.8) return labels.large
      return labels.veryLarge
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

const FOLLOW_UP_CHIPS: Array<{ label: string; prompt: string }> = [
  { label: '논문에 어떻게 쓰나요?', prompt: '이 결과를 APA 형식으로 논문에 어떻게 작성하면 되나요?' },
  { label: '효과크기 해석', prompt: '효과크기를 비전문가도 이해할 수 있게 쉽게 설명해주세요.' },
  { label: '가정 위반 대안', prompt: '가정 검정이 충족되지 않았을 때 어떤 대안적 분석 방법이 있나요?' },
  { label: '연구 한계점', prompt: '이 분석 결과의 한계점과 주의사항은 무엇인가요?' },
  { label: '다음 분석은?', prompt: '이 결과를 바탕으로 다음에 어떤 분석이나 조치를 하면 좋을까요?' },
]

export function ResultsActionStep({ results }: ResultsActionStepProps) {
  // Terminology System
  const t = useTerminology()

  const [isSaved, setIsSaved] = useState(false)
  const [savedName, setSavedName] = useState<string | null>(null)
  const [isExporting, setIsExporting] = useState(false)
  const [isCopied, setIsCopied] = useState(false)
  const [templateModalOpen, setTemplateModalOpen] = useState(false)
  const [detailedResultsOpen, setDetailedResultsOpen] = useState(true)
  const [diagnosticsOpen, setDiagnosticsOpen] = useState(false)
  const [exportDialogOpen, setExportDialogOpen] = useState(false)
  const [exportFormat, setExportFormat] = useState<ExportFormat>('docx')
  const [exportOptions, setExportOptions] = useState<ExportContentOptions>({
    includeInterpretation: true,
    includeRawData: false,
    includeMethodology: false,
    includeReferences: false,
    includeCharts: false,
  })
  const chartRef = useRef<HTMLDivElement>(null)
  const [resultTimestamp] = useState(() => new Date())

  // AI 해석 상태
  const [interpretation, setInterpretation] = useState<string | null>(null)
  const [isInterpreting, setIsInterpreting] = useState(false)
  const [interpretError, setInterpretError] = useState<string | null>(null)
  const [detailedInterpretOpen, setDetailedInterpretOpen] = useState(true)
  const interpretAbortRef = useRef<AbortController | null>(null)
  const interpretedResultRef = useRef<string | null>(null) // 캐시 key (results.method + pValue)

  // 후속 Q&A 상태
  const [followUpMessages, setFollowUpMessages] = useState<ChatMessage[]>([])
  const [followUpInput, setFollowUpInput] = useState('')
  const [isFollowUpStreaming, setIsFollowUpStreaming] = useState(false)
  const isFollowUpStreamingRef = useRef(false)  // 동기 가드 (더블클릭 방지)
  const followUpAbortRef = useRef<AbortController | null>(null)
  const chatBottomRef = useRef<HTMLDivElement | null>(null)

  // 언마운트 시 후속 Q&A 스트림 취소
  useEffect(() => {
    return () => { followUpAbortRef.current?.abort() }
  }, [])

  const {
    saveToHistory,
    reset,
    setUploadedData,
    setUploadedFile,
    setValidationResults,
    setResults,
    setIsReanalysisMode,
    navigateToStep,
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

  // variableMapping → 변수 이름 배열 (statisticalResult, handleInterpretation 공유)
  const mappedVariables = useMemo(() => {
    const vars: string[] = []
    if (variableMapping?.dependentVar) {
      if (Array.isArray(variableMapping.dependentVar)) vars.push(...variableMapping.dependentVar)
      else vars.push(variableMapping.dependentVar)
    }
    if (variableMapping?.independentVar) {
      if (Array.isArray(variableMapping.independentVar)) vars.push(...variableMapping.independentVar)
      else vars.push(variableMapping.independentVar)
    }
    if (variableMapping?.groupVar) vars.push(variableMapping.groupVar)
    return vars
  }, [variableMapping])

  // AnalysisResult -> StatisticalResult 변환
  const statisticalResult = useMemo(() => {
    if (!results) return null
    return convertToStatisticalResult(results, {
      sampleSize: uploadedData?.length,
      groups: results.groupStats?.length,
      variables: mappedVariables.length > 0 ? mappedVariables : undefined,
      timestamp: resultTimestamp
    })
  }, [results, uploadedData, mappedVariables, resultTimestamp])

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

  // AI 해석 파싱 (summary/detail 분리) — 렌더마다 재파싱 방지
  const parsedInterpretation = useMemo(() => {
    if (!interpretation) return null
    return splitInterpretation(interpretation)
  }, [interpretation])

  // Handlers
  // 파일 저장 (DOCX/Excel 다운로드)
  const handleSaveAsFile = useCallback(async (
    format: ExportFormat = 'docx',
    optionsOverride?: ExportContentOptions,
  ) => {
    if (!results || !statisticalResult) return
    setIsExporting(true)

    // 이전 성공 상태 초기화 (실패 시 오래된 배너 잔류 방지)
    if (savedTimeoutRef.current) clearTimeout(savedTimeoutRef.current)
    setIsSaved(false)
    setSavedName(null)

    try {
      const effectiveExportOptions: ExportContentOptions = {
        includeInterpretation: true,
        includeRawData: false,
        includeMethodology: false,
        includeReferences: false,
        includeCharts: false,
        ...(optionsOverride ?? {}),
      }
      const context: ExportContext = {
        analysisResult: results,
        statisticalResult,
        aiInterpretation: interpretation,
        apaFormat,
        exportOptions: effectiveExportOptions,
        dataInfo: exportDataInfo,
        rawDataRows: uploadedData as Array<Record<string, unknown>> | null,
      }

      const result = await ExportService.export(context, format)

      if (result.success) {
        // 실제 다운로드 파일명 사용 (없으면 폴백)
        const displayName = result.fileName
          ?? `${statisticalResult.testName || selectedMethod?.name || 'Analysis'}.${format}`
        setIsSaved(true)
        setSavedName(displayName)

        // IndexedDB에도 자동 저장 (히스토리용)
        const historyLabel = statisticalResult.testName || selectedMethod?.name || 'Analysis'
        const historyName = `${historyLabel} — ${new Date().toLocaleString('ko-KR', {
          month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
        })}`
        await saveToHistory(historyName, {
          aiInterpretation: interpretation,
          apaFormat,
          // 스트리밍 중이면 미완성 메시지 제외, 완료된 교환만 저장
          interpretationChat: !isFollowUpStreaming && followUpMessages.length > 0 ? followUpMessages : undefined,
        }).catch(() => { /* 히스토리 저장 실패 무시 */ })

        if (effectiveExportOptions.includeCharts) {
          toast.info(t.results.toast.chartsNotReady)
        }

        savedTimeoutRef.current = setTimeout(() => {
          setIsSaved(false)
          setSavedName(null)
          savedTimeoutRef.current = null
        }, 5000)
      } else {
        toast.error(t.results.save.errorTitle, { description: result.error })
      }
    } catch (err) {
      toast.error(t.results.save.errorTitle, {
        description: err instanceof Error ? err.message : t.results.save.unknownError
      })
    } finally {
      setIsExporting(false)
    }
  }, [results, statisticalResult, interpretation, apaFormat, exportDataInfo, selectedMethod, saveToHistory, uploadedData, followUpMessages, isFollowUpStreaming])

  const openExportDialog = useCallback((format: ExportFormat) => {
    setExportFormat(format)
    setExportDialogOpen(true)
  }, [])

  const handleExportWithOptions = useCallback(async () => {
    setExportDialogOpen(false)
    await handleSaveAsFile(exportFormat, exportOptions)
  }, [handleSaveAsFile, exportFormat, exportOptions])

  const handleReanalyze = useCallback(() => {
    setUploadedData(null)
    setUploadedFile(null)
    setValidationResults(null)
    setResults(null)
    setIsReanalysisMode(true)
    navigateToStep(1)

    toast.info(t.results.toast.reanalyzeReady, {
      description: selectedMethod ? t.results.toast.reanalyzeMethod(selectedMethod.name) : ''
    })
  }, [setUploadedData, setUploadedFile, setValidationResults, setResults, setIsReanalysisMode, navigateToStep, selectedMethod])

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
      const ctx: InterpretationContext = {
        results,
        sampleSize: uploadedData?.length,
        variables: mappedVariables.length > 0 ? mappedVariables : undefined,
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
  }, [results, uploadedData, mappedVariables, uploadedFileName])

  // 후속 질문 전송
  const handleFollowUp = useCallback(async (question: string) => {
    // ref 기반 동기 가드 — state 업데이트 지연으로 인한 더블클릭 race 방지
    if (!results || !interpretation || isFollowUpStreamingRef.current || !question.trim()) return
    isFollowUpStreamingRef.current = true

    const userMsg: ChatMessage = { id: crypto.randomUUID(), role: 'user', content: question.trim(), timestamp: Date.now() }
    setFollowUpMessages(prev => [...prev, userMsg])
    setFollowUpInput('')

    const assistantPlaceholder: ChatMessage = { id: crypto.randomUUID(), role: 'assistant', content: '', timestamp: Date.now() }
    setFollowUpMessages(prev => [...prev, assistantPlaceholder])
    setIsFollowUpStreaming(true)

    const controller = new AbortController()
    followUpAbortRef.current = controller

    const ctx: InterpretationContext = {
      results,
      sampleSize: uploadedData?.length,
      variables: mappedVariables.length > 0 ? mappedVariables : undefined,
      uploadedFileName: uploadedFileName ?? undefined,
    }

    try {
      let accumulated = ''
      await streamFollowUp(
        question.trim(),
        followUpMessages,
        ctx,
        interpretation,
        (chunk) => {
          accumulated += chunk
          setFollowUpMessages(prev => {
            if (prev.length === 0) return prev  // 재해석으로 배열이 초기화된 경우 무시
            const last = prev[prev.length - 1]
            if (last.role !== 'assistant') return prev  // 마지막이 assistant가 아니면 무시
            return [...prev.slice(0, -1), { ...last, content: accumulated }]
          })
        },
        controller.signal
      )
    } catch (error) {
      if (controller.signal.aborted) return
      const msg = error instanceof Error ? error.message : '후속 질문 처리 중 오류가 발생했습니다.'
      setFollowUpMessages(prev => {
        if (prev.length === 0) return prev
        const last = prev[prev.length - 1]
        if (last.role !== 'assistant') return prev
        return [...prev.slice(0, -1), { ...last, content: `오류: ${msg}` }]
      })
    } finally {
      isFollowUpStreamingRef.current = false
      setIsFollowUpStreaming(false)
      followUpAbortRef.current = null
      setTimeout(() => chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
    }
  }, [results, interpretation, followUpMessages, uploadedData, mappedVariables, uploadedFileName])

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
      <EmptyState
        icon={FileSearch}
        title={t.results.noResults}
        description={t.results.noResultsDescription}
      />
    )
  }

  return (
    <TooltipProvider>
      <div className="space-y-6" ref={chartRef}>
        {/* ===== 스텝 헤더 (다른 스텝과 동일 패턴) ===== */}
        <StepHeader
          icon={BarChart3}
          title={t.smartFlow.stepTitles.results}
          badge={selectedMethod ? { label: selectedMethod.name } : undefined}
          action={
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigateToStep(3)}
              className="gap-1.5 text-muted-foreground"
            >
              <ArrowLeft className="w-4 h-4" />
              {t.results.buttons.backToVariables}
            </Button>
          }
        />

        {/* ===== 메인 결과 카드 ===== */}
        <Card className={cn(
          "overflow-hidden shadow-sm rounded-xl",
          !assumptionsPassed ? "border-warning-border bg-warning-bg" :
            isSignificant ? "border-success-border bg-success-bg" : "border-border/40"
        )} data-testid="results-main-card">
          {/* 헤더: 분석명 + 시간 */}
          <CardHeader className="pb-3 bg-muted/10 border-b border-border/20">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base tracking-tight flex items-center gap-2.5">
                <div className={cn(
                  "w-7 h-7 rounded-lg flex items-center justify-center",
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
                {statisticalResult.testName}
              </CardTitle>
              <span className="text-[11px] text-muted-foreground/60 font-mono tabular-nums">
                {resultTimestamp.toLocaleString('ko-KR', {
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
              "p-4 rounded-xl text-center text-sm font-semibold tracking-tight",
              !assumptionsPassed ? "bg-warning-bg text-warning border border-warning-border" :
                isSignificant ? "bg-success-bg text-success border border-success-border" :
                  "bg-muted/50 text-muted-foreground border border-border/30"
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
                  isSignificant ? "text-success" : "text-muted-foreground"
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
              <div className="p-3 bg-info-bg rounded-lg border border-info-border">
                <p className="text-sm text-info flex items-start gap-2">
                  <Lightbulb className="h-4 w-4 flex-shrink-0 mt-0.5" />
                  <span>{statisticalResult.interpretation}</span>
                </p>
              </div>
            )}

            {/* ===== AI 해석 (인라인 2단 구조) ===== */}
            <div className="space-y-2" data-testid="ai-interpretation-section">
              {/* 로딩 중 */}
              {isInterpreting && !interpretation && (
                <div className="p-4 bg-violet-50 dark:bg-violet-950/20 rounded-xl border border-violet-100 dark:border-violet-900/50 flex items-center gap-2.5">
                  <div className="w-6 h-6 rounded-md bg-violet-100 dark:bg-violet-900/50 flex items-center justify-center">
                    <Sparkles className="w-3.5 h-3.5 text-violet-500 animate-pulse" />
                  </div>
                  <span className="text-sm text-violet-700 dark:text-violet-300 font-medium">{t.results.ai.loading}</span>
                </div>
              )}

              {/* 한줄 요약 (항상 표시) */}
              {parsedInterpretation && (
                <>
                  <div className="p-4 bg-violet-50 dark:bg-violet-950/20 rounded-xl border border-violet-100 dark:border-violet-900/50">
                    <div className="prose prose-sm dark:prose-invert max-w-none text-sm leading-relaxed">
                      <ReactMarkdown>{parsedInterpretation.summary}</ReactMarkdown>
                      {isInterpreting && (
                        <span className="inline-block w-1.5 h-4 bg-purple-500 animate-pulse ml-0.5 align-text-bottom" />
                      )}
                    </div>
                  </div>

                  {/* 상세 해석 (펼침) */}
                  {parsedInterpretation.detail && (
                    <CollapsibleSection
                      label={t.results.ai.detailedLabel}
                      open={detailedInterpretOpen}
                      onOpenChange={setDetailedInterpretOpen}
                      contentClassName="pt-2"
                      icon={<Sparkles className="h-3.5 w-3.5 text-purple-500" />}
                    >
                      <div className="prose prose-sm dark:prose-invert max-w-none text-sm leading-relaxed">
                        <ReactMarkdown>{parsedInterpretation.detail}</ReactMarkdown>
                      </div>
                    </CollapsibleSection>
                  )}

                  {/* 다시 해석 */}
                  {!isInterpreting && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        followUpAbortRef.current?.abort()
                        isFollowUpStreamingRef.current = false
                        setIsFollowUpStreaming(false)
                        interpretedResultRef.current = null
                        setInterpretation(null)
                        setFollowUpMessages([])
                        handleInterpretation()
                      }}
                      className="text-xs text-muted-foreground h-6 px-2"
                    >
                      <RefreshCw className="w-3 h-3 mr-1" />
                      {t.results.ai.reinterpret}
                    </Button>
                  )}
                </>
              )}

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
                        followUpAbortRef.current?.abort()
                        isFollowUpStreamingRef.current = false
                        setIsFollowUpStreaming(false)
                        interpretedResultRef.current = null
                        setFollowUpMessages([])
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

            {/* ===== 후속 Q&A ===== */}
            {interpretation && !isInterpreting && (
              <div className="space-y-3" data-testid="follow-up-section">
                {/* 이전 Q&A 스레드 */}
                {followUpMessages.length > 0 && (
                  <div className="space-y-2">
                    {followUpMessages.map((msg, idx) => (
                      <div
                        key={msg.id}
                        className={cn(
                          'px-3 py-2 rounded-lg text-sm',
                          msg.role === 'user'
                            ? 'bg-muted ml-6 text-foreground'
                            : 'bg-violet-50 dark:bg-violet-950/20 border border-violet-100 dark:border-violet-900/50 text-foreground'
                        )}
                      >
                        {msg.role === 'user' ? (
                          <p className="font-medium text-xs text-muted-foreground mb-0.5">질문</p>
                        ) : (
                          <p className="font-medium text-xs text-violet-600 dark:text-violet-400 mb-0.5 flex items-center gap-1">
                            <Sparkles className="w-3 h-3" /> AI 답변
                          </p>
                        )}
                        <div className="prose prose-sm dark:prose-invert max-w-none leading-relaxed">
                          <ReactMarkdown>{msg.content}</ReactMarkdown>
                        </div>
                        {msg.role === 'assistant' && isFollowUpStreaming && idx === followUpMessages.length - 1 && (
                          <span className="inline-block w-1.5 h-3.5 bg-purple-500 animate-pulse ml-0.5 align-text-bottom" />
                        )}
                      </div>
                    ))}
                    <div ref={chatBottomRef} />
                  </div>
                )}

                {/* Chips */}
                <div className="flex flex-wrap gap-1.5">
                  {FOLLOW_UP_CHIPS.map((chip) => (
                    <button
                      key={chip.label}
                      onClick={() => handleFollowUp(chip.prompt)}
                      disabled={isFollowUpStreaming}
                      className="text-xs px-2.5 py-1 rounded-full border border-violet-200 dark:border-violet-800 text-violet-700 dark:text-violet-300 hover:bg-violet-50 dark:hover:bg-violet-950/30 disabled:opacity-40 transition-colors flex items-center gap-1"
                    >
                      <MessageCircle className="w-3 h-3" />
                      {chip.label}
                    </button>
                  ))}
                </div>

                {/* 직접 입력 */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={followUpInput}
                    onChange={(e) => setFollowUpInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault()
                        handleFollowUp(followUpInput)
                      }
                    }}
                    placeholder="추가로 궁금한 점을 질문하세요..."
                    disabled={isFollowUpStreaming}
                    className="flex-1 text-sm px-3 py-1.5 rounded-lg border border-input bg-background focus:outline-none focus:ring-1 focus:ring-violet-400 disabled:opacity-50"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleFollowUp(followUpInput)}
                    disabled={isFollowUpStreaming || !followUpInput.trim()}
                    className="px-2.5 border-violet-200 dark:border-violet-800 text-violet-700 dark:text-violet-300 hover:bg-violet-50 dark:hover:bg-violet-950/30"
                  >
                    <Send className="w-3.5 h-3.5" />
                  </Button>
                </div>

                {/* 후속 Q&A 완료 후 방법 변경 버튼 */}
                {followUpMessages.length > 0 && !isFollowUpStreaming && (
                  <div className="pt-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigateToStep(2)}
                      className="gap-2 text-violet-700 dark:text-violet-300 border-violet-200 dark:border-violet-800 hover:bg-violet-50 dark:hover:bg-violet-950/30"
                    >
                      <RefreshCw className="w-4 h-4" />
                      다른 방법으로 분석하기
                    </Button>
                  </div>
                )}
              </div>
            )}

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

        {/* ===== 저장 확인 배너 (인라인, 중앙) ===== */}
        {savedName && (
          <div className="flex items-center justify-center gap-2.5 p-4 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="w-7 h-7 rounded-full bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center flex-shrink-0">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div className="text-sm">
              <span className="font-semibold text-emerald-800 dark:text-emerald-200">
                {t.results.save.success}
              </span>
              <span className="text-emerald-600 dark:text-emerald-400 ml-1.5">
                — {savedName}
              </span>
            </div>
          </div>
        )}

        {/* ===== 액션 버튼 (모든 버튼 직접 노출) ===== */}
        <div className="space-y-2" data-testid="action-buttons">
          {/* Row 1: 출력 액션 */}
          <div className="flex items-center gap-2 p-3 bg-muted/20 border border-border/20 rounded-xl">
            {/* 저장 (DOCX 기본 + Excel 드롭다운) */}
            <div className="flex flex-1">
              <Button
                variant={isSaved ? "default" : "outline"}
                size="sm"
                onClick={() => handleSaveAsFile('docx')}
                disabled={isExporting}
                className={cn(
                  "flex-1 rounded-r-none border-r-0 shadow-sm",
                  isSaved && "bg-emerald-600 hover:bg-emerald-600 text-white"
                )}
              >
                {isSaved ? (
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                ) : (
                  <Save className="w-3.5 h-3.5 mr-1.5" />
                )}
                {isExporting ? t.results.buttons.exporting : isSaved ? t.results.buttons.saved : t.results.buttons.save}
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={isExporting}
                    className="px-1.5 rounded-l-none shadow-sm"
                  >
                    <ChevronRight className="w-3.5 h-3.5 rotate-90" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => handleSaveAsFile('docx')}>
                    <FileText className="w-4 h-4 mr-2" />
                    {t.results.buttons.exportDocx}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleSaveAsFile('xlsx')}>
                    <BarChart3 className="w-4 h-4 mr-2" />
                    {t.results.buttons.exportExcel}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleSaveAsFile('html')}>
                    <FileText className="w-4 h-4 mr-2" />
                    {t.results.buttons.exportHtml}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => openExportDialog('docx')}>
                    <FileSearch className="w-4 h-4 mr-2" />
                    {t.results.buttons.exportWithOptions}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* 복사 */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopyResults}
              className={cn("flex-1 shadow-sm", isCopied && "bg-blue-600 hover:bg-blue-600 text-white border-blue-600")}
            >
              {isCopied ? (
                <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
              ) : (
                <Copy className="w-3.5 h-3.5 mr-1.5" />
              )}
              {isCopied ? t.results.buttons.copied : t.results.buttons.copy}
            </Button>
          </div>

          {/* Row 2: 워크플로우 액션 */}
          <div className="flex items-center gap-2 p-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleReanalyze}
              className="flex-1 text-muted-foreground hover:text-foreground"
            >
              <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
              {t.results.buttons.reanalyze}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleNewAnalysis}
              className="flex-1 text-muted-foreground hover:text-foreground"
            >
              <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
              {t.results.buttons.newAnalysis}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setTemplateModalOpen(true)}
              className="text-muted-foreground hover:text-foreground"
            >
              <FileText className="w-3.5 h-3.5 mr-1.5" />
              {t.results.buttons.saveTemplate}
            </Button>
          </div>
        </div>

        {/* 템플릿 저장 모달 */}
        <TemplateSaveModal
          open={templateModalOpen}
          onOpenChange={setTemplateModalOpen}
          onSaved={() => {
            toast.success(t.results.toast.templateSaved)
          }}
        />

        <Dialog open={exportDialogOpen} onOpenChange={setExportDialogOpen}>
          <DialogContent className="sm:max-w-[560px]">
            <DialogHeader>
              <DialogTitle>{t.results.exportDialog.title}</DialogTitle>
              <DialogDescription>
                {t.results.exportDialog.description}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-5 py-2">
              <div className="space-y-2">
                <Label>{t.results.exportDialog.formatLabel}</Label>
                <RadioGroup
                  value={exportFormat}
                  onValueChange={(value) => setExportFormat(value as ExportFormat)}
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="docx" id="export-docx" />
                    <Label htmlFor="export-docx">Word (.docx)</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="xlsx" id="export-xlsx" />
                    <Label htmlFor="export-xlsx">Excel (.xlsx)</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="html" id="export-html" />
                    <Label htmlFor="export-html">HTML (.html)</Label>
                  </div>
                </RadioGroup>
              </div>

              <div className="space-y-2">
                <Label>{t.results.exportDialog.contentLabel}</Label>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="opt-interpretation"
                      checked={!!exportOptions.includeInterpretation}
                      onCheckedChange={(checked) => setExportOptions(prev => ({ ...prev, includeInterpretation: !!checked }))}
                    />
                    <Label htmlFor="opt-interpretation">{t.results.exportDialog.includeInterpretation}</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="opt-raw-data"
                      checked={!!exportOptions.includeRawData}
                      disabled={!uploadedData || uploadedData.length === 0}
                      onCheckedChange={(checked) => setExportOptions(prev => ({ ...prev, includeRawData: !!checked }))}
                    />
                    <Label htmlFor="opt-raw-data">{t.results.exportDialog.includeRawData}</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="opt-methodology"
                      checked={!!exportOptions.includeMethodology}
                      onCheckedChange={(checked) => setExportOptions(prev => ({ ...prev, includeMethodology: !!checked }))}
                    />
                    <Label htmlFor="opt-methodology">{t.results.exportDialog.includeMethodology}</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="opt-references"
                      checked={!!exportOptions.includeReferences}
                      onCheckedChange={(checked) => setExportOptions(prev => ({ ...prev, includeReferences: !!checked }))}
                    />
                    <Label htmlFor="opt-references">{t.results.exportDialog.includeReferences}</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="opt-charts"
                      checked={!!exportOptions.includeCharts}
                      onCheckedChange={(checked) => setExportOptions(prev => ({ ...prev, includeCharts: !!checked }))}
                    />
                    <Label htmlFor="opt-charts">{t.results.exportDialog.includeCharts}</Label>
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setExportDialogOpen(false)}>
                {t.results.exportDialog.cancel}
              </Button>
              <Button onClick={handleExportWithOptions} disabled={isExporting}>
                {t.results.exportDialog.confirm}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  )
}
