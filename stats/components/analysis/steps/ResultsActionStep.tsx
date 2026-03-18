'use client'

import { useState, useRef, useEffect, useMemo, useCallback } from 'react'
import { useReducedMotion } from '@/lib/hooks/useReducedMotion'
import { useCountUp } from '@/hooks/use-count-up'
import { useInterpretation } from '@/hooks/use-interpretation'
import {
  Save,
  Copy,
  Download,
  CheckCircle2,
  FileText,
  BarChart3,
  FileSearch,
} from 'lucide-react'
import { EmptyState } from '@/components/common/EmptyState'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { TooltipProvider } from '@/components/ui/tooltip'
import { AnalysisResult } from '@/types/analysis'
import { useAnalysisStore } from '@/lib/stores/analysis-store'
import { useHistoryStore } from '@/lib/stores/history-store'
import { useModeStore } from '@/lib/stores/mode-store'
import { buildHistorySnapshot } from '@/lib/stores/store-orchestration'
import { startNewAnalysis } from '@/lib/services/data-management'
import { ExportService } from '@/lib/services/export/export-service'
import type { ExportFormat, ExportContext, ExportContentOptions } from '@/lib/services/export/export-types'
import { splitInterpretation, generateSummaryText } from '@/lib/services/export/export-data-builder'
import { convertToStatisticalResult } from '@/lib/statistics/result-converter'
import { TemplateSaveModal } from '@/components/analysis/TemplateSaveModal'
import { cn } from '@/lib/utils'
import { StepHeader } from '@/components/analysis/common'
import { AssumptionTestsSection } from '@/components/analysis/steps/exploration/AssumptionTestsSection'
import { ResultsHeroCard, ResultsStatsCards, ResultsChartsSection, ResultsActionButtons, AiInterpretationCard, FollowUpQASection } from '@/components/analysis/steps/results'
import { useFollowUpQA } from '@/hooks/use-follow-up-qa'
import { formatStatisticalResult } from '@/lib/statistics/formatters'
import { useTerminology } from '@/hooks/use-terminology'
import { logger } from '@/lib/utils/logger'
import { useRouter } from 'next/navigation'
import { useGraphStudioStore } from '@/lib/stores/graph-studio-store'
import { toAnalysisContext, buildKmCurveColumns, buildRocCurveColumns } from '@/lib/graph-studio/analysis-adapter'
import { inferColumnMeta, suggestChartType, selectXYFields, applyAnalysisContext } from '@/lib/graph-studio/chart-spec-utils'
import { createDefaultChartSpec, CHART_TYPE_HINTS } from '@/lib/graph-studio/chart-spec-defaults'
import type { DataPackage, ChartType } from '@/types/graph-studio'
import type { KaplanMeierAnalysisResult, RocCurveAnalysisResult } from '@/lib/generated/method-types.generated'

interface ResultsActionStepProps {
  results: AnalysisResult | null
}


export function ResultsActionStep({ results }: ResultsActionStepProps) {
  // Terminology System
  const t = useTerminology()

  // Reduced motion
  const prefersReducedMotion = useReducedMotion()

  // Phase: 0=Hero만, 1=수치카드(150ms), 2=차트+L2(400ms), 3=AI섹션(AI완료), 4=Q&A(phase3+300ms)
  const [phase, setPhase] = useState(0)
  const phaseTimerRef = useRef<NodeJS.Timeout | null>(null)

  const [isSaved, setIsSaved] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [isCopied, setIsCopied] = useState(false)
  const [templateModalOpen, setTemplateModalOpen] = useState(false)
  const [detailedResultsOpen, setDetailedResultsOpen] = useState(false)
  const [exportDialogOpen, setExportDialogOpen] = useState(false)
  const [exportFormat, setExportFormat] = useState<ExportFormat>('docx')
  const [exportOptions, setExportOptions] = useState<ExportContentOptions>({
    includeInterpretation: true,
    includeRawData: false,
    includeMethodology: false,
    includeReferences: false,
  })
  const [resultTimestamp] = useState(() => new Date())

  // AI 해석 (커스텀 훅으로 캡슐화)
  const [detailedInterpretOpen, setDetailedInterpretOpen] = useState(true)

  // 새 분석 시작 확인
  const [showNewAnalysisConfirm, setShowNewAnalysisConfirm] = useState(false)

  // 후속 칩 사용 추적
  const [usedChips, setUsedChips] = useState<Set<string>>(new Set())

  // 언마운트 시 phaseTimer 정리
  useEffect(() => {
    return () => {
      if (phaseTimerRef.current) clearTimeout(phaseTimerRef.current)
    }
  }, [])

  // Phase 0→1(150ms)→2(400ms) 자동 진행
  useEffect(() => {
    const t1 = setTimeout(() => setPhase(prev => Math.max(prev, 1)), 150)
    const t2 = setTimeout(() => setPhase(prev => Math.max(prev, 2)), 400)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [results?.method, results?.pValue])

  // reduced-motion: 모든 섹션 즉시 표시
  useEffect(() => {
    if (prefersReducedMotion) setPhase(4)
  }, [prefersReducedMotion])

  const {
    reset,
    setUploadedData,
    setUploadedFile,
    setValidationResults,
    setResults,
    setAssumptionResults,
    setVariableMapping,
    pruneCompletedStepsFrom,
    setCurrentStep,
    navigateToStep,
    uploadedData,
    variableMapping,
    uploadedFileName,
    selectedMethod,
    assumptionResults,
  } = useAnalysisStore()
  const { setStepTrack } = useModeStore()
  const { saveToHistory, loadedInterpretationChat, currentHistoryId } = useHistoryStore()

  // 히스토리 전환 시 Q&A·Phase·UI 초기화 (AI 해석은 useInterpretation이 처리)
  const prevHistoryIdRef = useRef<string | null | undefined>(undefined)
  useEffect(() => {
    if (prevHistoryIdRef.current === undefined) {
      prevHistoryIdRef.current = currentHistoryId
      return
    }
    if (prevHistoryIdRef.current === currentHistoryId) return
    prevHistoryIdRef.current = currentHistoryId

    // 진행 중인 Q&A 스트림 abort + 상태 초기화 (loadedInterpretationChat effect가 복원)
    resetFollowUp()

    // Phase 초기화 (단계적 등장 재시작)
    setPhase(0)
    if (phaseTimerRef.current) clearTimeout(phaseTimerRef.current)

    // UI state 초기화
    setIsSaved(false)
    setUsedChips(new Set())
    hasSavedToHistoryRef.current = false
  }, [currentHistoryId])

  // 히스토리에서 로드된 후속 Q&A 대화 복원
  useEffect(() => {
    if (loadedInterpretationChat?.length) {
      setFollowUpMessages(loadedInterpretationChat)
      // 소비 후 store에서 제거 (재렌더링 시 중복 방지)
      useHistoryStore.getState().setLoadedInterpretationChat(null)
    }
  }, [loadedInterpretationChat])

  const router = useRouter()
  const loadDataPackageWithSpec = useGraphStudioStore(s => s.loadDataPackageWithSpec)
  const disconnectProject = useGraphStudioStore(s => s.disconnectProject)

  const savedTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const copiedTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  // UI 상태(isSaved)와 별도로 "히스토리에 저장됐는지" 여부 추적
  // isSaved는 5초 후 리셋되지만 이 ref는 컴포넌트 생애 동안 유지 → 중복 저장 방지
  const hasSavedToHistoryRef = useRef(false)

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

  // AI 해석 훅
  const {
    interpretation,
    interpretationModel,
    isInterpreting,
    interpretError,
    handleInterpretation,
    resetAndReinterpret,
    clearInterpretationGuard,
    interpretAbortRef,
    aiInterpretationRef,
    onInterpretationComplete,
  } = useInterpretation({
    results,
    uploadedData,
    mappedVariables,
    uploadedFileName,
    variableMapping: variableMapping as Record<string, unknown> | null,
    errorMessage: t.results.ai.defaultError,
  })

  // 후속 Q&A 훅
  const {
    followUpMessages,
    setFollowUpMessages,
    followUpInput,
    setFollowUpInput,
    isFollowUpStreaming,
    chatBottomRef,
    handleFollowUp,
    resetFollowUp,
  } = useFollowUpQA({
    results,
    interpretation,
    sampleSize: uploadedData?.length,
    mappedVariables,
    uploadedFileName: uploadedFileName ?? null,
    errorPrefix: t.analysis.executionLogs.errorPrefix,
    errorMessage: t.results.followUp.errorMessage,
  })

  // Phase 진행 콜백: 해석 완료 시 Phase 3→4 전환
  onInterpretationComplete.current = useCallback(() => {
    if (phaseTimerRef.current) clearTimeout(phaseTimerRef.current)
    setPhase(prev => Math.max(prev, 3))
    phaseTimerRef.current = setTimeout(() => {
      setPhase(prev => Math.max(prev, 4))
      phaseTimerRef.current = null
    }, 300)
  }, [])

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

  // L2 상세 결과: post-hoc/계수 테이블(additionalResults) 있을 때만 자동 열기 (P2-3)
  useEffect(() => {
    if (statisticalResult?.additionalResults && statisticalResult.additionalResults.length > 0) {
      setDetailedResultsOpen(true)
    }
  }, [statisticalResult?.additionalResults])

  // Layer 2 표시 여부 (추가 테이블 또는 방법별 상세 결과가 있을 때)
  // CI/효과크기는 StatsCards에서 표시하므로 L2 조건에서 제외
  const hasDetailedResults = useMemo(() => {
    if (!statisticalResult) return false
    return !!(
      (statisticalResult.additionalResults && statisticalResult.additionalResults.length > 0) ||
      results?.additional
    )
  }, [statisticalResult, results])

  // APA 형식 요약 (df 없는 검정도 지원: "U = 234.0, p = .003")
  const apaFormat = useMemo(() => {
    if (!statisticalResult) return null
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
  // 히스토리 저장 (IndexedDB — 파일 다운로드 없음)
  const handleSaveToHistory = useCallback(async () => {
    if (!results || !statisticalResult || isSaved) return

    const historyLabel = statisticalResult.testName || selectedMethod?.name || 'Analysis'
    const historyName = `${historyLabel} — ${new Date().toLocaleString('ko-KR', {
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    })}`

    try {
      await saveToHistory(buildHistorySnapshot(), historyName, {
        aiInterpretation: interpretation,
        apaFormat,
        interpretationChat: !isFollowUpStreaming && followUpMessages.length > 0 ? followUpMessages : undefined,
      })

      if (savedTimeoutRef.current) clearTimeout(savedTimeoutRef.current)
      hasSavedToHistoryRef.current = true  // UI 리셋 후에도 중복 저장 방지용 영속 플래그
      setIsSaved(true)
      toast.success(t.results.save.success)
      savedTimeoutRef.current = setTimeout(() => {
        setIsSaved(false)
        savedTimeoutRef.current = null
      }, 5000)
    } catch (err) {
      logger.error('Save to history failed', { error: err })
      toast.error(t.results.save.errorTitle, { description: t.results.save.unknownError })
    }
  }, [results, statisticalResult, selectedMethod, interpretation, apaFormat, isSaved, saveToHistory, followUpMessages, isFollowUpStreaming, t])

  // 파일 내보내기 (DOCX/Excel/HTML 다운로드)
  const handleSaveAsFile = useCallback(async (
    format: ExportFormat = 'docx',
    optionsOverride?: ExportContentOptions,
  ) => {
    if (!results || !statisticalResult) return
    setIsExporting(true)

    try {
      const effectiveExportOptions: ExportContentOptions = {
        includeInterpretation: true,
        includeRawData: false,
        includeMethodology: false,
        includeReferences: false,
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
        toast.success(t.results.toast.exportSuccess ?? t.results.save.success)

        // 명시적 "저장"을 아직 안 했으면 히스토리에 silent 저장 (내보내기만 하고 닫는 경우 대비)
        // isSaved 대신 ref 사용: 클로저 staleness + 5초 리셋 문제 해결
        if (!hasSavedToHistoryRef.current) {
          const historyLabel = statisticalResult.testName || selectedMethod?.name || 'Analysis'
          const historyName = `${historyLabel} — ${new Date().toLocaleString('ko-KR', {
            month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
          })}`
          saveToHistory(buildHistorySnapshot(), historyName, {
            aiInterpretation: interpretation,
            apaFormat,
            interpretationChat: !isFollowUpStreaming && followUpMessages.length > 0 ? followUpMessages : undefined,
          }).catch(() => { /* 히스토리 저장 실패 무시 */ })
        }
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
  }, [results, statisticalResult, interpretation, apaFormat, exportDataInfo, uploadedData, selectedMethod, saveToHistory, followUpMessages, isFollowUpStreaming, t])

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
    setStepTrack('reanalysis')
    // ★ 새 결과에 대한 AI 자동 해석이 동작하도록 가드 해제
    clearInterpretationGuard()
    navigateToStep(1)

    toast.info(t.results.toast.reanalyzeReady, {
      description: selectedMethod ? t.results.toast.reanalyzeMethod(selectedMethod.name) : ''
    })
  }, [setUploadedData, setUploadedFile, setValidationResults, setResults, setStepTrack, navigateToStep, clearInterpretationGuard, selectedMethod, t])

  const handleNewAnalysis = useCallback(() => {
    setShowNewAnalysisConfirm(true)
  }, [])

  const handleNewAnalysisConfirm = useCallback(async () => {
    try {
      await startNewAnalysis()
      toast.info(t.results.toast.newAnalysis)
    } catch (error) {
      logger.error('Failed to start new analysis', { error })
      reset()
      toast.info(t.results.toast.newAnalysis)
    }
  }, [reset, t])

  // U2-3: 방법 변경 — downstream 전체 무효화 후 Step 2 이동
  // setCurrentStep 직접 사용: navigateToStep → saveCurrentStepData가 pruned step 4를 다시 추가하는 문제 방지
  const handleChangeMethod = useCallback(() => {
    setResults(null)
    setAssumptionResults(null)
    setVariableMapping(null)
    pruneCompletedStepsFrom(3)  // Step 3,4 완료 상태 제거
    setStepTrack('normal')      // quick/reanalysis 모드 누수 방지
    setCurrentStep(2)
  }, [setResults, setAssumptionResults, setVariableMapping, pruneCompletedStepsFrom, setStepTrack, setCurrentStep])

  // Graph Studio 연결 — DataPackage 빌드 후 이동
  const handleOpenInGraphStudio = useCallback(() => {
    if (!results) return

    const pkgId = crypto.randomUUID()
    const vizType = results.visualizationData?.type

    let columns: DataPackage['columns']
    let data: DataPackage['data']
    let chartType: ChartType
    let xField: string
    let yField: string
    let colorField: string | undefined

    if (vizType === 'km-curve' && results.visualizationData?.data) {
      const kmData = results.visualizationData.data as unknown as KaplanMeierAnalysisResult
      const built = buildKmCurveColumns(kmData)
      columns = built.columns
      data = built.data
      chartType = 'km-curve'
      xField = built.xField
      yField = built.yField
      colorField = built.colorField
    } else if (vizType === 'roc-curve' && results.visualizationData?.data) {
      const rocData = results.visualizationData.data as unknown as RocCurveAnalysisResult
      const built = buildRocCurveColumns(rocData)
      columns = built.columns
      data = built.data
      chartType = 'roc-curve'
      xField = built.xField
      yField = built.yField
      colorField = undefined
    } else {
      // 일반 분석: 업로드 데이터 사용
      if (!uploadedData?.length) {
        toast.error(t.analysis.emptyStates.dataRequired)
        return
      }
      const rows = uploadedData as Record<string, unknown>[]
      columns = inferColumnMeta(rows)
      data = {}
      for (const col of columns) {
        data[col.name] = rows.map(r => r[col.name])
      }
      chartType = suggestChartType(columns)
      const hint = CHART_TYPE_HINTS[chartType]
      const fields = selectXYFields(columns, hint)
      xField = fields.xField
      yField = fields.yField
    }

    const spec = createDefaultChartSpec(pkgId, chartType, xField, yField, columns)
    if (colorField) {
      spec.encoding.color = { field: colorField, type: 'nominal' }
    }

    const pkg: DataPackage = {
      id: pkgId,
      source: 'analysis',
      label: `${results.method} 결과`,
      columns,
      data,
      analysisContext: toAnalysisContext(results),
      analysisResultId: currentHistoryId ?? undefined, // U4-1: 저장된 분석 역참조
      createdAt: new Date().toISOString(),
    }

    // analysisContext에서 significance marks 자동 적용
    const finalSpec = pkg.analysisContext
      ? applyAnalysisContext(spec, pkg.analysisContext)
      : spec

    loadDataPackageWithSpec(pkg, finalSpec)
    disconnectProject() // 결과 가져오기는 새 작업 — 기존 프로젝트 덮어쓰기 방지
    router.push('/graph-studio')
  }, [results, uploadedData, currentHistoryId, loadDataPackageWithSpec, disconnectProject, router])

  // 재해석 + Q&A 초기화
  const handleReinterpretWithQAReset = useCallback(() => {
    resetFollowUp()
    setUsedChips(new Set())
    resetAndReinterpret()
  }, [resetFollowUp, resetAndReinterpret])


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
      logger.error('Copy failed', { error: err })
      toast.error(t.results.toast.copyError)
    }
  }, [results, statisticalResult, interpretation, apaFormat, t])

  // count-up: 컴포넌트 레벨 호출 (Rules of Hooks — early return 전)
  const statisticDisplay = useCountUp(statisticalResult?.statistic, { started: phase >= 1 })
  const effectSizeDisplay = useCountUp(statisticalResult?.effectSize?.value, { started: phase >= 1 })

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
      <div className="space-y-4">
        {/* ===== 스텝 헤더 (P0-1: Copy + Save 상단 배치) ===== */}
        <StepHeader
          icon={BarChart3}
          title={t.analysis.stepTitles.results}
          badge={selectedMethod ? { label: selectedMethod.name } : undefined}
          action={
            <div className="flex items-center gap-1.5">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCopyResults}
                className={cn("h-8 px-2.5", isCopied && "text-primary")}
              >
                {isCopied ? <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> : <Copy className="w-3.5 h-3.5 mr-1" />}
                {isCopied ? t.results.buttons.copied : t.results.buttons.copy}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSaveToHistory}
                disabled={isSaved}
                className={cn("h-8 px-2.5", isSaved && "text-emerald-600")}
                data-testid="save-history-btn"
              >
                {isSaved ? <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> : <Save className="w-3.5 h-3.5 mr-1" />}
                {isSaved ? t.results.buttons.saved : t.results.buttons.save}
              </Button>
              <div className="w-px h-4 bg-border/50" />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" disabled={isExporting} className="h-8 px-2.5 shadow-sm" data-testid="export-dropdown">
                    <Download className="w-3.5 h-3.5 mr-1" />
                    {isExporting ? t.results.buttons.exporting : t.results.buttons.export}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => handleSaveAsFile('docx')} data-testid="export-docx">
                    <FileText className="w-4 h-4 mr-2" />
                    {t.results.buttons.exportDocx}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleSaveAsFile('xlsx')} data-testid="export-xlsx">
                    <BarChart3 className="w-4 h-4 mr-2" />
                    {t.results.buttons.exportExcel}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleSaveAsFile('html')} data-testid="export-html">
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
          }
        />

        {/* ===== 가정 검정 결과 (Step 4 store 기반) — executor result에 assumptions가 없을 때만 표시 */}
        {assumptionResults && !statisticalResult?.assumptions?.length && (
          <AssumptionTestsSection
            assumptionResults={assumptionResults}
            isLoading={false}
            visibility="secondary"
            testedVariable={assumptionResults.testedVariable}
          />
        )}

        {/* ===== [Phase 0] Hero 컴팩트 바 ===== */}
        <ResultsHeroCard
          statisticalResult={statisticalResult}
          isSignificant={isSignificant}
          assumptionsPassed={assumptionsPassed}
          resultTimestamp={resultTimestamp}
          apaFormat={apaFormat}
          uploadedFileName={uploadedFileName ?? null}
          uploadedData={uploadedData}
          prefersReducedMotion={prefersReducedMotion}
          t={t}
        />

        {/* ===== [Phase 1] 수치 카드 4개 (stagger + count-up) ===== */}
        <ResultsStatsCards
          statisticalResult={statisticalResult}
          isSignificant={isSignificant}
          statisticDisplay={statisticDisplay}
          effectSizeDisplay={effectSizeDisplay}
          phase={phase}
          prefersReducedMotion={prefersReducedMotion}
          t={t}
        />

        {/* ===== [Phase 2] L2 상세 결과 (CI, 효과크기, 추가 테이블) ===== */}
        <ResultsChartsSection
          results={results!}
          statisticalResult={statisticalResult}
          hasDetailedResults={hasDetailedResults}
          phase={phase}
          prefersReducedMotion={prefersReducedMotion}
          detailedResultsOpen={detailedResultsOpen}
          onDetailedResultsOpenChange={setDetailedResultsOpen}
          t={t}
        />

        {/* ===== [Phase 3] AI 해석 카드 ===== */}
        <AiInterpretationCard
          parsedInterpretation={parsedInterpretation}
          isInterpreting={isInterpreting}
          interpretationModel={interpretationModel}
          interpretError={interpretError}
          prefersReducedMotion={prefersReducedMotion}
          detailedInterpretOpen={detailedInterpretOpen}
          onDetailedInterpretOpenChange={setDetailedInterpretOpen}
          onReinterpret={handleReinterpretWithQAReset}
          containerRef={aiInterpretationRef}
          t={t}
        />

        {/* ===== [Phase 4] 후속 Q&A 카드 ===== */}
        <FollowUpQASection
          phase={phase}
          prefersReducedMotion={prefersReducedMotion}
          interpretation={interpretation}
          isInterpreting={isInterpreting}
          followUpMessages={followUpMessages}
          isFollowUpStreaming={isFollowUpStreaming}
          chatBottomRef={chatBottomRef}
          followUpInput={followUpInput}
          onFollowUpInputChange={setFollowUpInput}
          onFollowUp={handleFollowUp}
          usedChips={usedChips}
          onChipUsed={(label) => setUsedChips(prev => new Set(prev).add(label))}
          t={t}
        />

        {/* ===== 액션 버튼 + 다이얼로그 ===== */}
        <ResultsActionButtons
          onBackToVariables={() => navigateToStep(3)}
          onChangeMethod={handleChangeMethod}
          onOpenGraphStudio={handleOpenInGraphStudio}
          onReanalyze={handleReanalyze}
          onNewAnalysis={handleNewAnalysis}
          onSaveTemplate={() => setTemplateModalOpen(true)}
          showNewAnalysisConfirm={showNewAnalysisConfirm}
          onShowNewAnalysisConfirmChange={setShowNewAnalysisConfirm}
          onNewAnalysisConfirm={handleNewAnalysisConfirm}
          exportDialogOpen={exportDialogOpen}
          onExportDialogOpenChange={setExportDialogOpen}
          exportFormat={exportFormat}
          onExportFormatChange={setExportFormat}
          exportOptions={exportOptions}
          onExportOptionsChange={setExportOptions}
          onExportWithOptions={handleExportWithOptions}
          isExporting={isExporting}
          hasUploadedData={!!uploadedData && uploadedData.length > 0}
          t={t}
        />

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
