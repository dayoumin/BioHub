'use client'

import { useState, useRef, useEffect, useLayoutEffect, useMemo, useCallback } from 'react'
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
  BookOpen,
  Code2,
} from 'lucide-react'
import { EmptyState } from '@/components/common/EmptyState'
import { toast } from 'sonner'
import { TOAST } from '@/lib/constants/toast-messages'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  TooltipProvider,
} from '@/components/ui/tooltip'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { AnalysisResult } from '@/types/analysis'
import { useAnalysisStore } from '@/lib/stores/analysis-store'
import { buildHistorySnapshot } from '@/lib/stores/store-orchestration'
import {
  exportCodeFromAnalysis,
  isCodeExportAvailable,
  type CodeLanguage,
  splitInterpretation,
  generateSummaryText,
} from '@/lib/services'
import { convertToStatisticalResult } from '@/lib/statistics/result-converter'
import { buildAnalysisExecutionContext } from '@/lib/utils/analysis-execution'
import { getMethodRequirements } from '@/lib/statistics/variable-requirements'
import { TemplateSaveModal } from '@/components/analysis/TemplateSaveModal'
import { cn } from '@/lib/utils'
import { AI_ACCENT } from '@/lib/design-tokens'
import { StepHeader } from '@/components/analysis/common'
import { AssumptionTestsSection } from '@/components/analysis/steps/exploration/AssumptionTestsSection'
import { ResultsHeroCard, ResultsStatsCards, ResultsChartsSection, ResultsActionButtons, AiInterpretationCard, FollowUpQASection } from '@/components/analysis/steps/results'
import { useFollowUpQA } from '@/hooks/use-follow-up-qa'
import { useErrorRecovery } from '@/hooks/use-error-recovery'
import { formatStatisticalResult } from '@/lib/statistics/formatters'
import { useTerminology } from '@/hooks/use-terminology'
import { useResultsHistory } from '@/hooks/use-results-history'
import { useResultsNavigation } from '@/hooks/use-results-navigation'
import { useResultsPaperDraft } from '@/hooks/use-results-paper-draft'
import { useResultsCopyExport } from '@/hooks/use-results-copy-export'
import { useResearchProjectStore, selectActiveProject } from '@/lib/stores/research-project-store'
import {
  buildAnalysisVisualizationColumns,
} from '@/lib/graph-studio'
import { DraftContextEditor } from './DraftContextEditor'
import dynamic from 'next/dynamic'

const PaperDraftPanel = dynamic(() => import('./PaperDraftPanel').then(m => ({ default: m.PaperDraftPanel })), {
  ssr: false,
})

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

  const [templateModalOpen, setTemplateModalOpen] = useState(false)
  const [detailedResultsOpen, setDetailedResultsOpen] = useState(false)
  const activeProject = useResearchProjectStore(selectActiveProject)
  const [resultTimestamp] = useState(() => new Date())

  // AI 해석 (커스텀 훅으로 캡슐화)
  const interpretRecovery = useErrorRecovery({ maxRetries: 2 })
  const resetInterpretRecovery = interpretRecovery.reset
  const recordInterpretRetry = interpretRecovery.recordRetry
  const isInterpretRetryExhausted = interpretRecovery.isExhausted

  // 확인 다이얼로그 — ResultsActionButtons 내부에서 관리

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
    navigateToStep,
    uploadedData,
    validationResults,
    variableMapping,
    uploadedFileName,
    selectedMethod,
    assumptionResults,
    analysisOptions,
    suggestedSettings,
  } = useAnalysisStore()
  const analysisVisualizationColumns = useMemo(
    () => (results ? buildAnalysisVisualizationColumns(results) : null),
    [results],
  )
  const methodRequirements = useMemo(
    () => (selectedMethod?.id ? getMethodRequirements(selectedMethod.id) : undefined),
    [selectedMethod?.id],
  )
  const { executionSettingEntries } = useMemo(
    () => buildAnalysisExecutionContext({
      analysisOptions,
      methodRequirements,
      selectedMethodId: selectedMethod?.id,
      suggestedSettings,
      variableMapping,
    }),
    [analysisOptions, methodRequirements, selectedMethod?.id, suggestedSettings, variableMapping],
  )
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

    aiInterpretationRef,
    onInterpretationComplete,
  } = useInterpretation({
    results,
    uploadedData,
    mappedVariables,
    uploadedFileName,
    variableMapping: variableMapping as Record<string, unknown> | null,
    errorMessage: t.results.ai.defaultError,
    autoTrigger: false,
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

  // 논문 초안 생성용 ExportContext (두 핸들러 공용)
  const draftExportCtx = useMemo(() => {
    if (!results || !statisticalResult) return null
    return {
      analysisResult: results,
      statisticalResult,
      aiInterpretation: interpretation,
      apaFormat,
      exportOptions: { includeInterpretation: false, includeRawData: false, includeMethodology: false, includeReferences: false } as const,
      dataInfo: exportDataInfo,
      rawDataRows: uploadedData as Array<Record<string, unknown>> | null,
    }
  }, [results, statisticalResult, interpretation, apaFormat, exportDataInfo, uploadedData])

  const {
    draftEditorOpen,
    paperDraftOpen,
    paperDraft,
    discussionState,
    lastDraftContext,
    setDraftEditorOpen,
    setPaperDraftOpen,
    setDiscussionState,
    handlePaperDraftToggle,
    handleDraftConfirm,
    handleDraftLanguageChange,
    resetPaperDraftState,
  } = useResultsPaperDraft({
    draftExportCtx,
    selectedMethodId: selectedMethod?.id,
  })

  const {
    currentHistoryId,
    historyEntries,
    historyResultView,
    isSaved,
    isSavingToHistory,
    isExporting,
    exportDialogOpen,
    exportFormat,
    exportOptions,
    setExportDialogOpen,
    setExportFormat,
    setExportOptions,
    handleSaveButtonClick,
    handleSaveAsFile,
    openExportDialog,
    handleExportWithOptions,
    resetHistoryUiState,
  } = useResultsHistory({
    results,
    uploadedData,
    validationResults,
    statisticalResult,
    selectedMethodName: selectedMethod?.name,
    buildHistorySnapshot,
    interpretation,
    interpretationModel,
    isInterpreting,
    interpretError,
    apaFormat,
    exportDataInfo,
    followUpMessages,
    isFollowUpStreaming,
    paperDraft,
    activeProjectId: activeProject?.id,
    activeProjectName: activeProject?.name,
    setFollowUpMessages,
    t,
  })

  const {
    handleReanalyze,
    handleNewAnalysisConfirm,
    handleChangeMethod,
    handleOpenInGraphStudio,
  } = useResultsNavigation({
    results,
    uploadedData,
    analysisVisualizationColumns,
    currentHistoryId,
    historyEntries,
    historyResultView,
    clearInterpretationGuard,
    t,
  })

  const {
    isCopied,
    codeExportAvailable,
    handleCopyResults,
    handleCodeExport,
    resetCopyState,
  } = useResultsCopyExport({
    results,
    statisticalResult,
    interpretation,
    apaFormat,
    selectedMethod,
    variableMapping,
    analysisOptions,
    uploadedFileName: uploadedFileName ?? null,
    uploadedData,
    t,
  })

  useEffect(() => {
    resetCopyState()
  }, [resetCopyState, results, statisticalResult, currentHistoryId])

  // 히스토리 전환 시 Q&A·Phase·UI 초기화 (AI 해석은 useInterpretation이 처리)
  const prevHistoryIdRef = useRef<string | null | undefined>(undefined)
  useLayoutEffect(() => {
    if (prevHistoryIdRef.current === undefined) {
      prevHistoryIdRef.current = currentHistoryId
      return
    }
    if (prevHistoryIdRef.current === currentHistoryId) return
    prevHistoryIdRef.current = currentHistoryId

    resetFollowUp()
    setPhase(0)
    if (phaseTimerRef.current) clearTimeout(phaseTimerRef.current)

    setUsedChips(new Set())
    resetInterpretRecovery()
    resetHistoryUiState()
    resetPaperDraftState()
  }, [currentHistoryId, resetFollowUp, resetInterpretRecovery, resetHistoryUiState, resetPaperDraftState])

  // AI 해석 파싱 (summary/detail 분리) — 렌더마다 재파싱 방지
  const parsedInterpretation = useMemo(() => {
    if (!interpretation) return null
    return splitInterpretation(interpretation)
  }, [interpretation])

  // 재해석 + Q&A 초기화 (소진 시 차단)
  const handleReinterpretWithQAReset = useCallback(() => {
    if (isInterpretRetryExhausted) return
    recordInterpretRetry()
    resetFollowUp()
    setUsedChips(new Set())
    resetAndReinterpret()
  }, [
    isInterpretRetryExhausted,
    recordInterpretRetry,
    resetFollowUp,
    resetAndReinterpret,
  ])

  const handleRequestInterpretation = useCallback(() => {
    if (isInterpreting) return
    resetInterpretRecovery()
    resetFollowUp()
    setUsedChips(new Set())
    handleInterpretation()
  }, [
    handleInterpretation,
    isInterpreting,
    resetFollowUp,
    resetInterpretRecovery,
  ])

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
      <div className="space-y-6">
        {/* ===== 스텝 헤더 (P0-1: Copy + Save 상단 배치) ===== */}
        <StepHeader
          icon={BarChart3}
          title={t.analysis.stepTitles.results}
          badge={selectedMethod ? { label: selectedMethod.name } : undefined}
          action={
            <div className="flex items-center gap-2 rounded-xl border border-border/50 bg-surface-container-lowest px-2 py-1.5">
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopyResults}
                aria-label={isCopied ? t.results.buttons.copied : t.results.buttons.copy}
                className={cn("h-9 px-3 gap-1.5 border-border/50 shadow-none", isCopied && "text-primary")}
              >
                {isCopied ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{isCopied ? t.results.buttons.copied : t.results.buttons.copy}</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleSaveButtonClick}
                disabled={isSaved || isSavingToHistory}
                aria-label={isSaved ? t.results.buttons.saved : t.results.buttons.save}
                className={cn("h-9 px-3 gap-1.5 border-border/50 shadow-none", isSaved && "text-success")}
                data-testid="save-history-btn"
              >
                {isSaved ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
                <span>{isSaved ? t.results.buttons.saved : t.results.buttons.save}</span>
              </Button>
              <div className="w-px h-5 bg-surface-container-highest/40" />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" disabled={isExporting} aria-label={t.results.buttons.export} className="h-9 px-3 gap-1.5 border-border/50 shadow-none" data-testid="export-dropdown">
                    <Download className="w-3.5 h-3.5" />
                    <span>{isExporting ? t.results.buttons.exporting : t.results.buttons.export}</span>
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
                  {codeExportAvailable && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => handleCodeExport('R')} data-testid="export-r">
                        <Code2 className="w-4 h-4 mr-2" />
                        R Script (.R)
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleCodeExport('python')} data-testid="export-python">
                        <Code2 className="w-4 h-4 mr-2" />
                        Python (.py)
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          }
        />

        {historyResultView && (
          <Card className="border-0 bg-surface-container-low shadow-none">
            <CardContent className="flex flex-col gap-3 px-4 py-3 md:flex-row md:items-center md:justify-between">
              <div className="space-y-1">
                <p className="text-sm font-semibold tracking-tight text-foreground">히스토리 결과 보기</p>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  이전 단계 데이터는 저장되지 않아 다시 열 수 없습니다. 같은 방법으로 다시 확인하려면 재분석을 사용하세요.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {analysisVisualizationColumns ? (
                  <Button type="button" variant="secondary" size="sm" className="h-9 px-3" onClick={handleOpenInGraphStudio}>
                    <BarChart3 className="mr-1.5 h-3.5 w-3.5" />
                    Graph Studio
                  </Button>
                ) : null}
                <Button type="button" variant="outline" size="sm" className="h-9 px-3" onClick={handleReanalyze}>
                  {t.results.buttons.reanalyze}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ===== [Phase 0] Hero 컴팩트 바 ===== */}
        <ResultsHeroCard
          statisticalResult={statisticalResult}
          methodId={selectedMethod?.id}
          isSignificant={isSignificant}
          assumptionsPassed={assumptionsPassed}
          resultTimestamp={resultTimestamp}
          apaFormat={apaFormat}
          uploadedFileName={uploadedFileName ?? null}
          uploadedData={uploadedData}
          executionSettingEntries={executionSettingEntries}
          methodRequirements={methodRequirements}
          prefersReducedMotion={prefersReducedMotion}
          t={t}
        />

        {/* ===== 가정 검정 상세 (Hero 아래 통합 배치) ===== */}
        {assumptionResults && !statisticalResult?.assumptions?.length && (
          <AssumptionTestsSection
            assumptionResults={assumptionResults}
            isLoading={false}
            visibility="secondary"
            testedVariable={assumptionResults.testedVariable}
          />
        )}

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

        {/* ===== [Phase 1+] AI 해석 카드 (Phase 1부터 스켈레톤 표시) ===== */}
        <AiInterpretationCard
          parsedInterpretation={parsedInterpretation}
          isInterpreting={isInterpreting}
          interpretationModel={interpretationModel}
          interpretError={interpretError}
          isRetryExhausted={interpretRecovery.isExhausted}
          prefersReducedMotion={prefersReducedMotion}
          onReinterpret={handleReinterpretWithQAReset}
          onRequestInterpretation={handleRequestInterpretation}
          containerRef={aiInterpretationRef}
          phase={phase}
          t={t}
          footerAction={
            interpretation && !isInterpreting && (phase >= 3 || prefersReducedMotion) ? (
              <div className={cn('flex items-center gap-3 px-4 py-3 rounded-lg', AI_ACCENT.surface)}>
                <BookOpen className={cn('w-4 h-4 flex-shrink-0', AI_ACCENT.icon)} />
                <span className="text-sm text-muted-foreground flex-1">
                  {paperDraft ? t.results.buttons.viewSummary : t.results.ai.draftCta}
                </span>
                <Button
                  variant={paperDraft ? 'secondary' : 'outline'}
                  size="sm"
                  onClick={handlePaperDraftToggle}
                  className="text-xs h-8 px-3 shadow-sm"
                  data-testid="paper-draft-btn"
                >
                  {paperDraft ? t.results.buttons.viewSummary : t.results.buttons.resultsSummary}
                </Button>
              </div>
            ) : null
          }
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
          onOpenGraphStudio={handleOpenInGraphStudio}
          onReanalyze={handleReanalyze}
          onNewAnalysisConfirm={handleNewAnalysisConfirm}
          onChangeMethodConfirm={handleChangeMethod}
          onSaveTemplate={() => setTemplateModalOpen(true)}
          exportDialogOpen={exportDialogOpen}
          onExportDialogOpenChange={setExportDialogOpen}
          exportFormat={exportFormat}
          onExportFormatChange={setExportFormat}
          exportOptions={exportOptions}
          onExportOptionsChange={setExportOptions}
          onExportWithOptions={handleExportWithOptions}
          isExporting={isExporting}
          hasUploadedData={!!uploadedData && uploadedData.length > 0}
          showBackToVariables={!historyResultView}
          t={t}
        />

        {/* 논문 초안 — 컨텍스트 에디터 모달 */}
        {draftEditorOpen && results && (
          <DraftContextEditor
            analysisResult={results}
            variableMapping={variableMapping ?? null}
            initialContext={lastDraftContext}
            onConfirm={handleDraftConfirm}
            onCancel={() => setDraftEditorOpen(false)}
          />
        )}

        {/* 논문 초안 패널 */}
        <Sheet open={paperDraftOpen} onOpenChange={setPaperDraftOpen}>
          <SheetContent side="right" className="w-full md:w-[560px] max-w-[90vw] p-0 flex flex-col gap-0">
            <SheetHeader className="px-4 py-3 border-b shrink-0">
              <SheetTitle className="text-sm font-semibold">{t.results.buttons.resultsSummary}</SheetTitle>
            </SheetHeader>
            {paperDraft && (
              <div className="flex-1 min-h-0 overflow-hidden">
                <PaperDraftPanel
                  draft={paperDraft}
                  discussionState={discussionState}
                  onGenerateDiscussion={() => { /* Phase B: LLM Discussion 생성 */ }}
                  onCancelDiscussion={() => setDiscussionState({ status: 'idle' })}
                  onLanguageChange={handleDraftLanguageChange}
                />
              </div>
            )}
          </SheetContent>
        </Sheet>

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
