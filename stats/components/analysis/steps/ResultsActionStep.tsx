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
  BookOpen,
} from 'lucide-react'
import { EmptyState } from '@/components/common/EmptyState'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { TooltipProvider } from '@/components/ui/tooltip'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
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
import { useErrorRecovery } from '@/hooks/use-error-recovery'
import { formatStatisticalResult } from '@/lib/statistics/formatters'
import { useTerminology } from '@/hooks/use-terminology'
import { logger } from '@/lib/utils/logger'
import { useRouter } from 'next/navigation'
import { useGraphStudioStore } from '@/lib/stores/graph-studio-store'
import { listResearchProjects } from '@/lib/research/project-storage'
import { toAnalysisContext, buildKmCurveColumns, buildRocCurveColumns } from '@/lib/graph-studio/analysis-adapter'
import { inferColumnMeta, suggestChartType, selectXYFields, applyAnalysisContext } from '@/lib/graph-studio/chart-spec-utils'
import { createDefaultChartSpec, CHART_TYPE_HINTS } from '@/lib/graph-studio/chart-spec-defaults'
import type { DataPackage, ChartType } from '@/types/graph-studio'
import type { KaplanMeierAnalysisResult, RocCurveAnalysisResult } from '@/lib/generated/method-types.generated'
import { generatePaperDraft } from '@/lib/services/paper-draft'
import type { PaperDraft, DiscussionState, DraftContext } from '@/lib/services/paper-draft'
import type { ResearchProject } from '@/lib/types/research'
import { DraftContextEditor } from './DraftContextEditor'
import dynamic from 'next/dynamic'

const PaperDraftPanel = dynamic(() => import('./PaperDraftPanel').then(m => ({ default: m.PaperDraftPanel })), {
  ssr: false,
})

interface ResultsActionStepProps {
  results: AnalysisResult | null
}

const NO_PROJECT_SAVE_ID = '__no-project__'


export function ResultsActionStep({ results }: ResultsActionStepProps) {
  // Terminology System
  const t = useTerminology()

  // Reduced motion
  const prefersReducedMotion = useReducedMotion()

  // Phase: 0=Heroë§? 1=?˜ì¹˜ì¹´ë“œ(150ms), 2=ì°¨íŠ¸+L2(400ms), 3=AI?¹ì…˜(AI?„ë£Œ), 4=Q&A(phase3+300ms)
  const [phase, setPhase] = useState(0)
  const phaseTimerRef = useRef<NodeJS.Timeout | null>(null)

  const [isSaved, setIsSaved] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [isCopied, setIsCopied] = useState(false)
  const [templateModalOpen, setTemplateModalOpen] = useState(false)
  const [detailedResultsOpen, setDetailedResultsOpen] = useState(false)
  const [exportDialogOpen, setExportDialogOpen] = useState(false)
  const [projectSaveDialogOpen, setProjectSaveDialogOpen] = useState(false)
  const [availableProjects, setAvailableProjects] = useState<ResearchProject[]>([])
  const [selectedSaveProjectId, setSelectedSaveProjectId] = useState(NO_PROJECT_SAVE_ID)
  const [isSavingToHistory, setIsSavingToHistory] = useState(false)
  const [draftEditorOpen, setDraftEditorOpen] = useState(false)
  const [paperDraftOpen, setPaperDraftOpen] = useState(false)
  const [paperDraft, setPaperDraft] = useState<PaperDraft | null>(null)
  const [discussionState, setDiscussionState] = useState<DiscussionState>({ status: 'idle' })
  const [lastDraftContext, setLastDraftContext] = useState<DraftContext | undefined>(undefined)
  const [lastDraftOptions, setLastDraftOptions] = useState<{ language: 'ko' | 'en'; postHocDisplay: 'significant-only' | 'all' }>({ language: 'ko', postHocDisplay: 'significant-only' })
  const [exportFormat, setExportFormat] = useState<ExportFormat>('docx')
  const [exportOptions, setExportOptions] = useState<ExportContentOptions>({
    includeInterpretation: true,
    includeRawData: false,
    includeMethodology: false,
    includeReferences: false,
  })
  const [resultTimestamp] = useState(() => new Date())

  // AI ?´ì„ (ì»¤ìŠ¤?€ ?…ìœ¼ë¡?ìº¡ìŠ??
  const [detailedInterpretOpen, setDetailedInterpretOpen] = useState(true)
  const interpretRecovery = useErrorRecovery({ maxRetries: 2 })

  // ??ë¶„ì„ ?œì‘ ?•ì¸
  const [showNewAnalysisConfirm, setShowNewAnalysisConfirm] = useState(false)

  // ?„ì† ì¹??¬ìš© ì¶”ì 
  const [usedChips, setUsedChips] = useState<Set<string>>(new Set())

  // ?¸ë§ˆ?´íŠ¸ ??phaseTimer ?•ë¦¬
  useEffect(() => {
    return () => {
      if (phaseTimerRef.current) clearTimeout(phaseTimerRef.current)
    }
  }, [])

  // Phase 0??(150ms)??(400ms) ?ë™ ì§„í–‰
  useEffect(() => {
    const t1 = setTimeout(() => setPhase(prev => Math.max(prev, 1)), 150)
    const t2 = setTimeout(() => setPhase(prev => Math.max(prev, 2)), 400)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [results?.method, results?.pValue])

  // reduced-motion: ëª¨ë“  ?¹ì…˜ ì¦‰ì‹œ ?œì‹œ
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
  const { analysisHistory, saveToHistory, loadedInterpretationChat, currentHistoryId, loadedPaperDraft, patchHistoryPaperDraft, setLoadedPaperDraft } = useHistoryStore()
  const historyEntries = useMemo(() => analysisHistory ?? [], [analysisHistory])
  const currentHistoryProjectId = useMemo(
    () => historyEntries.find(entry => entry.id === currentHistoryId)?.projectId,
    [currentHistoryId, historyEntries]
  )

  // ?ˆìŠ¤? ë¦¬ ?„í™˜ ??Q&AÂ·PhaseÂ·UI ì´ˆê¸°??(AI ?´ì„?€ useInterpretation??ì²˜ë¦¬)
  const prevHistoryIdRef = useRef<string | null | undefined>(undefined)
  useEffect(() => {
    if (prevHistoryIdRef.current === undefined) {
      prevHistoryIdRef.current = currentHistoryId
      return
    }
    if (prevHistoryIdRef.current === currentHistoryId) return
    prevHistoryIdRef.current = currentHistoryId

    // ì§„í–‰ ì¤‘ì¸ Q&A ?¤íŠ¸ë¦?abort + ?íƒœ ì´ˆê¸°??(loadedInterpretationChat effectê°€ ë³µì›)
    resetFollowUp()

    // Phase ì´ˆê¸°??(?¨ê³„???±ì¥ ?¬ì‹œ??
    setPhase(0)
    if (phaseTimerRef.current) clearTimeout(phaseTimerRef.current)

    // UI state ì´ˆê¸°??
    setIsSaved(false)
    setUsedChips(new Set())
    hasSavedToHistoryRef.current = false
    setPaperDraft(null)
    setPaperDraftOpen(false)
    interpretRecovery.reset()
    setLastDraftContext(undefined)
    setLastDraftOptions({ language: 'ko', postHocDisplay: 'significant-only' })
  }, [currentHistoryId, resetFollowUp])

  // ?ˆìŠ¤? ë¦¬?ì„œ ë¡œë“œ???„ì† Q&A ?€??ë³µì›
  useEffect(() => {
    if (loadedInterpretationChat?.length) {
      setFollowUpMessages(loadedInterpretationChat)
      // ?Œë¹„ ??store?ì„œ ?œê±° (?¬ë Œ?”ë§ ??ì¤‘ë³µ ë°©ì?)
      useHistoryStore.getState().setLoadedInterpretationChat(null)
    }
  }, [loadedInterpretationChat, setFollowUpMessages])

  // ?ˆìŠ¤? ë¦¬?ì„œ ë¡œë“œ???¼ë¬¸ ì´ˆì•ˆ ë³µì› (context/options???¨ê»˜ ë³µì› ???¬ìƒ???¸ì–´?„í™˜ ê°€??
  useEffect(() => {
    if (loadedPaperDraft) {
      setPaperDraft(loadedPaperDraft)
      setLastDraftContext(loadedPaperDraft.context)
      setLastDraftOptions({
        language: loadedPaperDraft.language,
        postHocDisplay: loadedPaperDraft.postHocDisplay ?? 'significant-only',
      })
      setLoadedPaperDraft(null)
    }
  }, [loadedPaperDraft, setLoadedPaperDraft])

  const router = useRouter()
  const loadDataPackageWithSpec = useGraphStudioStore(s => s.loadDataPackageWithSpec)
  const disconnectProject = useGraphStudioStore(s => s.disconnectProject)

  const savedTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const copiedTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  // UI ?íƒœ(isSaved)?€ ë³„ë„ë¡?"?ˆìŠ¤? ë¦¬???€?¥ë?”ì?" ?¬ë? ì¶”ì 
  // isSaved??5ì´???ë¦¬ì…‹?˜ì?ë§???ref??ì»´í¬?ŒíŠ¸ ?ì•  ?™ì•ˆ ? ì? ??ì¤‘ë³µ ?€??ë°©ì?
  const hasSavedToHistoryRef = useRef(false)

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (savedTimeoutRef.current) clearTimeout(savedTimeoutRef.current)
      if (copiedTimeoutRef.current) clearTimeout(copiedTimeoutRef.current)
    }
  }, [])

  // variableMapping ??ë³€???´ë¦„ ë°°ì—´ (statisticalResult, handleInterpretation ê³µìœ )
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

  // AI ?´ì„ ??
  const {
    interpretation,
    interpretationModel,
    isInterpreting,
    interpretError,
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
  })

  // ?„ì† Q&A ??
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

  // Phase ì§„í–‰ ì½œë°±: ?´ì„ ?„ë£Œ ??Phase 3?? ?„í™˜
  onInterpretationComplete.current = useCallback(() => {
    if (phaseTimerRef.current) clearTimeout(phaseTimerRef.current)
    setPhase(prev => Math.max(prev, 3))
    phaseTimerRef.current = setTimeout(() => {
      setPhase(prev => Math.max(prev, 4))
      phaseTimerRef.current = null
    }, 300)
  }, [])

  // AnalysisResult -> StatisticalResult ë³€??
  const statisticalResult = useMemo(() => {
    if (!results) return null
    return convertToStatisticalResult(results, {
      sampleSize: uploadedData?.length,
      groups: results.groupStats?.length,
      variables: mappedVariables.length > 0 ? mappedVariables : undefined,
      timestamp: resultTimestamp
    })
  }, [results, uploadedData, mappedVariables, resultTimestamp])

  // ? ì˜???ë‹¨
  const isSignificant = useMemo(() => {
    if (!statisticalResult) return false
    return statisticalResult.pValue < (statisticalResult.alpha || 0.05)
  }, [statisticalResult])

  // ê°€??ì¶©ì¡± ?¬ë?
  const assumptionsPassed = useMemo(() => {
    if (!statisticalResult?.assumptions) return true
    return statisticalResult.assumptions.every(a => a.passed !== false)
  }, [statisticalResult])

  // L2 ?ì„¸ ê²°ê³¼: post-hoc/ê³„ìˆ˜ ?Œì´ë¸?additionalResults) ?ˆì„ ?Œë§Œ ?ë™ ?´ê¸° (P2-3)
  useEffect(() => {
    if (statisticalResult?.additionalResults && statisticalResult.additionalResults.length > 0) {
      setDetailedResultsOpen(true)
    }
  }, [statisticalResult?.additionalResults])

  // Layer 2 ?œì‹œ ?¬ë? (ì¶”ê? ?Œì´ë¸??ëŠ” ë°©ë²•ë³??ì„¸ ê²°ê³¼ê°€ ?ˆì„ ??
  // CI/?¨ê³¼?¬ê¸°??StatsCards?ì„œ ?œì‹œ?˜ë?ë¡?L2 ì¡°ê±´?ì„œ ?œì™¸
  const hasDetailedResults = useMemo(() => {
    if (!statisticalResult) return false
    return !!(
      (statisticalResult.additionalResults && statisticalResult.additionalResults.length > 0) ||
      results?.additional
    )
  }, [statisticalResult, results])

  // APA ?•ì‹ ?”ì•½ (df ?†ëŠ” ê²€?•ë„ ì§€?? "U = 234.0, p = .003")
  const apaFormat = useMemo(() => {
    if (!statisticalResult) return null
    return formatStatisticalResult(
      statisticalResult.statisticName || 'Statistic',
      statisticalResult.statistic,
      statisticalResult.df,
      statisticalResult.pValue
    )
  }, [statisticalResult])

  // ?´ë³´?´ê¸°???°ì´???•ë³´
  const exportDataInfo = useMemo(() => {
    if (!uploadedData || uploadedData.length === 0) return null
    return {
      fileName: uploadedFileName ?? null,
      totalRows: uploadedData.length,
      columnCount: Object.keys(uploadedData[0] || {}).length,
      variables: Object.keys(uploadedData[0] || {}),
    }
  }, [uploadedData, uploadedFileName])

  // ?¼ë¬¸ ì´ˆì•ˆ ?ì„±??ExportContext (???¸ë“¤??ê³µìš©)
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

  // AI ?´ì„ ?Œì‹± (summary/detail ë¶„ë¦¬) ???Œë”ë§ˆë‹¤ ?¬íŒŒ??ë°©ì?
  const parsedInterpretation = useMemo(() => {
    if (!interpretation) return null
    return splitInterpretation(interpretation)
  }, [interpretation])

  const refreshAvailableProjects = useCallback(() => {
    const projects = listResearchProjects()
      .filter(project => project.status !== 'archived')
      .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt))

    setAvailableProjects(projects)
    return projects
  }, [])

  const openProjectSaveDialog = useCallback(() => {
    if (!results || !statisticalResult || isSaved || isSavingToHistory) return

    const projects = refreshAvailableProjects()
    const defaultProjectId = currentHistoryProjectId && projects.some(project => project.id === currentHistoryProjectId)
      ? currentHistoryProjectId
      : NO_PROJECT_SAVE_ID

    setSelectedSaveProjectId(defaultProjectId)
    setProjectSaveDialogOpen(true)
  }, [currentHistoryProjectId, isSaved, isSavingToHistory, refreshAvailableProjects, results, statisticalResult])

  // Handlers
  // ?ˆìŠ¤? ë¦¬ ?€??(IndexedDB ???Œì¼ ?¤ìš´ë¡œë“œ ?†ìŒ)
  const saveAnalysisToHistory = useCallback(async (projectId?: string) => {
    if (!results || !statisticalResult || isSaved || isSavingToHistory) return

    const historyLabel = statisticalResult.testName || selectedMethod?.name || 'Analysis'
    const historyName = `${historyLabel} ??${new Date().toLocaleString('ko-KR', {
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    })}`

    try {
      setIsSavingToHistory(true)
      await saveToHistory(buildHistorySnapshot(), historyName, {
        projectId,
        aiInterpretation: interpretation,
        apaFormat,
        interpretationChat: !isFollowUpStreaming && followUpMessages.length > 0 ? followUpMessages : undefined,
        paperDraft: paperDraft ?? null,
      })

      setProjectSaveDialogOpen(false)
      if (savedTimeoutRef.current) clearTimeout(savedTimeoutRef.current)
      hasSavedToHistoryRef.current = true  // UI ë¦¬ì…‹ ?„ì—??ì¤‘ë³µ ?€??ë°©ì????ì† ?Œë˜ê·?
      setIsSaved(true)
      toast.success(t.results.save.success)
      savedTimeoutRef.current = setTimeout(() => {
        setIsSaved(false)
        savedTimeoutRef.current = null
      }, 5000)
    } catch (err) {
      logger.error('Save to history failed', { error: err })
      toast.error(t.results.save.errorTitle, { description: t.results.save.unknownError })
    } finally {
      setIsSavingToHistory(false)
    }
  }, [results, statisticalResult, selectedMethod, interpretation, apaFormat, isSaved, isSavingToHistory, saveToHistory, followUpMessages, isFollowUpStreaming, paperDraft, t])

  const handleSaveButtonClick = useCallback(() => {
    if (!results || !statisticalResult || isSaved || isSavingToHistory) return

    const projects = refreshAvailableProjects()
    if (projects.length === 0) {
      setSelectedSaveProjectId(NO_PROJECT_SAVE_ID)
      void saveAnalysisToHistory()
      return
    }

    openProjectSaveDialog()
  }, [isSaved, isSavingToHistory, openProjectSaveDialog, refreshAvailableProjects, results, saveAnalysisToHistory, statisticalResult])

  const handleSaveToHistory = useCallback(async () => {
    const projectId = selectedSaveProjectId === NO_PROJECT_SAVE_ID ? undefined : selectedSaveProjectId
    await saveAnalysisToHistory(projectId)
  }, [saveAnalysisToHistory, selectedSaveProjectId])

  // ?Œì¼ ?´ë³´?´ê¸° (DOCX/Excel/HTML ?¤ìš´ë¡œë“œ)
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

        // ëª…ì‹œ??"?€?????„ì§ ???ˆìœ¼ë©??ˆìŠ¤? ë¦¬??silent ?€??(?´ë³´?´ê¸°ë§??˜ê³  ?«ëŠ” ê²½ìš° ?€ë¹?
        // isSaved ?€??ref ?¬ìš©: ?´ë¡œ?€ staleness + 5ì´?ë¦¬ì…‹ ë¬¸ì œ ?´ê²°
        if (!hasSavedToHistoryRef.current) {
          const historyLabel = statisticalResult.testName || selectedMethod?.name || 'Analysis'
          const historyName = `${historyLabel} ??${new Date().toLocaleString('ko-KR', {
            month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
          })}`
          saveToHistory(buildHistorySnapshot(), historyName, {
            projectId: currentHistoryProjectId,
            aiInterpretation: interpretation,
            apaFormat,
            interpretationChat: !isFollowUpStreaming && followUpMessages.length > 0 ? followUpMessages : undefined,
            paperDraft: paperDraft ?? null,
          }).catch(() => { /* ?ˆìŠ¤? ë¦¬ ?€???¤íŒ¨ ë¬´ì‹œ */ })
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
  }, [results, statisticalResult, interpretation, apaFormat, exportDataInfo, uploadedData, selectedMethod, currentHistoryProjectId, saveToHistory, followUpMessages, isFollowUpStreaming, paperDraft, t])

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
    // ????ê²°ê³¼???€??AI ?ë™ ?´ì„???™ì‘?˜ë„ë¡?ê°€???´ì œ
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

  // U2-3: ë°©ë²• ë³€ê²???downstream ?„ì²´ ë¬´íš¨????Step 2 ?´ë™
  // setCurrentStep ì§ì ‘ ?¬ìš©: navigateToStep ??saveCurrentStepDataê°€ pruned step 4ë¥??¤ì‹œ ì¶”ê??˜ëŠ” ë¬¸ì œ ë°©ì?
  const handleChangeMethod = useCallback(() => {
    setResults(null)
    setAssumptionResults(null)
    setVariableMapping(null)
    pruneCompletedStepsFrom(3)  // Step 3,4 ?„ë£Œ ?íƒœ ?œê±°
    setStepTrack('normal')      // quick/reanalysis ëª¨ë“œ ?„ìˆ˜ ë°©ì?
    setCurrentStep(2)
  }, [setResults, setAssumptionResults, setVariableMapping, pruneCompletedStepsFrom, setStepTrack, setCurrentStep])

  // Graph Studio ?°ê²° ??DataPackage ë¹Œë“œ ???´ë™
  const handleOpenInGraphStudio = useCallback(() => {
    if (!results) return

    const pkgId = crypto.randomUUID()
    const vizType = results.visualizationData?.type
    const linkedHistory = currentHistoryId
      ? historyEntries.find(history => history.id === currentHistoryId)
      : null

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
      // ?¼ë°˜ ë¶„ì„: ?…ë¡œ???°ì´???¬ìš©
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
      label: `${results.method} ê²°ê³¼`,
      columns,
      data,
      projectId: linkedHistory?.projectId,
      analysisContext: toAnalysisContext(results),
      analysisResultId: currentHistoryId ?? undefined, // U4-1: ?€?¥ëœ ë¶„ì„ ??°¸ì¡?
      createdAt: new Date().toISOString(),
    }

    // analysisContext?ì„œ significance marks ?ë™ ?ìš©
    const finalSpec = pkg.analysisContext
      ? applyAnalysisContext(spec, pkg.analysisContext)
      : spec

    loadDataPackageWithSpec(pkg, finalSpec)
    disconnectProject() // ê²°ê³¼ ê°€?¸ì˜¤ê¸°ëŠ” ???‘ì—… ??ê¸°ì¡´ ?„ë¡œ?íŠ¸ ??–´?°ê¸° ë°©ì?
    router.push('/graph-studio')
  }, [results, uploadedData, currentHistoryId, historyEntries, loadDataPackageWithSpec, disconnectProject, router])

  // ?¬í•´??+ Q&A ì´ˆê¸°??(?Œì§„ ??ì°¨ë‹¨)
  const handleReinterpretWithQAReset = useCallback(() => {
    if (interpretRecovery.isExhausted) return
    interpretRecovery.recordRetry()
    resetFollowUp()
    setUsedChips(new Set())
    resetAndReinterpret()
  }, [resetFollowUp, resetAndReinterpret, interpretRecovery.isExhausted, interpretRecovery.recordRetry])

  const handlePaperDraftToggle = useCallback(() => {
    if (paperDraft) {
      setPaperDraftOpen(true)
    } else {
      setDraftEditorOpen(true)
    }
  }, [paperDraft])

  // ?¼ë¬¸ ì´ˆì•ˆ ?ì„± ?•ì • (DraftContextEditor ??generatePaperDraft)
  const handleDraftConfirm = useCallback((
    context: DraftContext,
    options: { language: 'ko' | 'en'; postHocDisplay: 'significant-only' | 'all' }
  ) => {
    if (!draftExportCtx) return
    setDraftEditorOpen(false)
    setLastDraftContext(context)
    setLastDraftOptions(options)

    const draft = generatePaperDraft(draftExportCtx, context, selectedMethod?.id ?? '', {
      language: options.language,
      postHocDisplay: options.postHocDisplay,
    })
    setPaperDraft(draft)
    setDiscussionState({ status: 'idle' })
    setPaperDraftOpen(true)
    if (currentHistoryId) {
      patchHistoryPaperDraft(currentHistoryId, draft).catch(console.error)
    }
  }, [draftExportCtx, selectedMethod, currentHistoryId, patchHistoryPaperDraft])

  // ?¼ë¬¸ ì´ˆì•ˆ ?¸ì–´ ë³€ê²?(?¨ë„ ??? ê? ???¬ìƒ??
  const handleDraftLanguageChange = useCallback((lang: 'ko' | 'en') => {
    if (!draftExportCtx || !lastDraftContext) return
    const newOptions = { ...lastDraftOptions, language: lang }
    setLastDraftOptions(newOptions)

    const draft = generatePaperDraft(draftExportCtx, lastDraftContext, selectedMethod?.id ?? '', {
      language: lang,
      postHocDisplay: newOptions.postHocDisplay,
    })
    setPaperDraft(draft)
    setDiscussionState({ status: 'idle' })
    if (currentHistoryId) {
      patchHistoryPaperDraft(currentHistoryId, draft).catch(console.error)
    }
  }, [draftExportCtx, lastDraftContext, lastDraftOptions, selectedMethod, currentHistoryId, patchHistoryPaperDraft])


  const handleCopyResults = useCallback(async () => {
    if (!results || !statisticalResult) return

    try {
      // ---- plain text ë²„ì „ ----
      const plainText = generateSummaryText(results)
      const aiPlain = interpretation
        ? `\n\n${t.results.clipboard.aiSeparator}\n${interpretation}`
        : ''

      // ---- HTML ë²„ì „ ----
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

      // AI ?´ì„ (?ˆì„ ?Œë§Œ) ??ë§ˆí¬?¤ìš´ ?ë¬¸??preë¡?ê°ì‹¸???œì‹ ? ì?
      if (interpretation) {
        const { summary, detail } = splitInterpretation(interpretation)
        html += `<hr/><h4>${t.results.clipboard.aiInterpretation}</h4>`
        html += `<pre style="white-space:pre-wrap;font-family:inherit;margin:0">${summary}</pre>`
        if (detail) {
          html += `<pre style="white-space:pre-wrap;font-family:inherit;margin:8px 0 0">${detail}</pre>`
        }
      }

      // ClipboardItem API (HTML + plain text ?™ì‹œ ?œê³µ)
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
        // ?´ë°±: plain text only
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

  // count-up: ì»´í¬?ŒíŠ¸ ?ˆë²¨ ?¸ì¶œ (Rules of Hooks ??early return ??
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
        {/* ===== ?¤í… ?¤ë” (P0-1: Copy + Save ?ë‹¨ ë°°ì¹˜) ===== */}
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
                onClick={handleSaveButtonClick}
                disabled={isSaved || isSavingToHistory}
                className={cn("h-8 px-2.5", isSaved && "text-emerald-600")}
                data-testid="save-history-btn"
              >
                {isSaved ? <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> : <Save className="w-3.5 h-3.5 mr-1" />}
                {isSaved ? t.results.buttons.saved : t.results.buttons.save}
              </Button>
              <Button
                variant={paperDraft ? 'secondary' : 'outline'}
                size="sm"
                onClick={handlePaperDraftToggle}
                className={cn("h-8 px-2.5 shadow-sm", paperDraft && "text-primary")}
                data-testid="paper-draft-btn"
              >
                <BookOpen className="w-3.5 h-3.5 mr-1" />
                {paperDraft ? 'ì´ˆì•ˆ ë³´ê¸°' : '?¼ë¬¸ ì´ˆì•ˆ'}
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
        <Dialog open={projectSaveDialogOpen} onOpenChange={setProjectSaveDialogOpen}>
          <DialogContent className="sm:max-w-[560px]" data-testid="project-save-dialog">
            <DialogHeader>
              <DialogTitle>{t.results.save.projectDialog.title}</DialogTitle>
              <DialogDescription>
                {t.results.save.projectDialog.description}
              </DialogDescription>
            </DialogHeader>

            <RadioGroup
              value={selectedSaveProjectId}
              onValueChange={setSelectedSaveProjectId}
              className="space-y-3 py-2"
            >
              <Label
                htmlFor="save-project-none-clean"
                className="flex cursor-pointer items-start gap-3 rounded-lg border border-border/60 p-3"
              >
                <RadioGroupItem value={NO_PROJECT_SAVE_ID} id="save-project-none-clean" className="mt-0.5" />
                <div className="space-y-1">
                  <div className="text-sm font-medium">?„ë¡œ?íŠ¸ ?†ì´ ?€??/div>
                  <div className="text-xs text-muted-foreground">
                    ë¶„ì„ ê¸°ë¡ë§??€?¥í•˜ê³?ResearchProject?ëŠ” ?°ê²°?˜ì? ?ŠìŠµ?ˆë‹¤.
                  </div>
                </div>
              </Label>

              {availableProjects.length > 0 ? (
                availableProjects.map(project => (
                  <Label
                    key={project.id}
                    htmlFor={`save-project-clean-${project.id}`}
                    className="flex cursor-pointer items-start gap-3 rounded-lg border border-border/60 p-3"
                  >
                    <RadioGroupItem value={project.id} id={`save-project-clean-${project.id}`} className="mt-0.5" />
                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2 text-sm font-medium">
                        {project.presentation?.emoji ? <span>{project.presentation.emoji}</span> : null}
                        <span>{project.name}</span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {project.description?.trim() || t.results.save.projectDialog.noDescription}
                      </div>
                    </div>
                  </Label>
                ))
              ) : (
                <div className="rounded-lg border border-dashed border-border/60 px-4 py-5 text-sm text-muted-foreground">
                  ?°ê²° ê°€?¥í•œ ?œì„± ?„ë¡œ?íŠ¸ê°€ ?†ìŠµ?ˆë‹¤. ì§€ê¸ˆì? ?„ë¡œ?íŠ¸ ?†ì´ ?€?¥í•˜ê±°ë‚˜, ë¨¼ì? ?„ë¡œ?íŠ¸ë¥?ë§Œë“  ???¤ì‹œ ?€?¥í•˜?¸ìš”.
                </div>
              )}
            </RadioGroup>

            <DialogFooter>
              <Button variant="outline" onClick={() => setProjectSaveDialogOpen(false)}>
                ì·¨ì†Œ
              </Button>
              <Button onClick={handleSaveToHistory} disabled={isSavingToHistory}>
                {isSavingToHistory ? '?€??ì¤?..' : '?€??}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ===== ê°€??ê²€??ê²°ê³¼ (Step 4 store ê¸°ë°˜) ??executor result??assumptionsê°€ ?†ì„ ?Œë§Œ ?œì‹œ */}
        {assumptionResults && !statisticalResult?.assumptions?.length && (
          <AssumptionTestsSection
            assumptionResults={assumptionResults}
            isLoading={false}
            visibility="secondary"
            testedVariable={assumptionResults.testedVariable}
          />
        )}

        {/* ===== [Phase 0] Hero ì»´íŒ©??ë°?===== */}
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

        {/* ===== [Phase 1] ?˜ì¹˜ ì¹´ë“œ 4ê°?(stagger + count-up) ===== */}
        <ResultsStatsCards
          statisticalResult={statisticalResult}
          isSignificant={isSignificant}
          statisticDisplay={statisticDisplay}
          effectSizeDisplay={effectSizeDisplay}
          phase={phase}
          prefersReducedMotion={prefersReducedMotion}
          t={t}
        />

        {/* ===== [Phase 2] L2 ?ì„¸ ê²°ê³¼ (CI, ?¨ê³¼?¬ê¸°, ì¶”ê? ?Œì´ë¸? ===== */}
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

        {/* ===== [Phase 3] AI ?´ì„ ì¹´ë“œ ===== */}
        <AiInterpretationCard
          parsedInterpretation={parsedInterpretation}
          isInterpreting={isInterpreting}
          interpretationModel={interpretationModel}
          interpretError={interpretError}
          isRetryExhausted={interpretRecovery.isExhausted}
          prefersReducedMotion={prefersReducedMotion}
          detailedInterpretOpen={detailedInterpretOpen}
          onDetailedInterpretOpenChange={setDetailedInterpretOpen}
          onReinterpret={handleReinterpretWithQAReset}
          containerRef={aiInterpretationRef}
          t={t}
        />

        {/* ===== [Phase 4] ?„ì† Q&A ì¹´ë“œ ===== */}
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

        {/* ===== ?¡ì…˜ ë²„íŠ¼ + ?¤ì´?¼ë¡œê·?===== */}
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

        {/* ?¼ë¬¸ ì´ˆì•ˆ ??ì»¨í…?¤íŠ¸ ?ë””??ëª¨ë‹¬ */}
        {draftEditorOpen && results && (
          <DraftContextEditor
            analysisResult={results}
            variableMapping={variableMapping ?? null}
            initialContext={lastDraftContext}
            onConfirm={handleDraftConfirm}
            onCancel={() => setDraftEditorOpen(false)}
          />
        )}

        {/* ?¼ë¬¸ ì´ˆì•ˆ ?¨ë„ */}
        <Sheet open={paperDraftOpen} onOpenChange={setPaperDraftOpen}>
          <SheetContent side="right" className="w-[560px] max-w-[90vw] p-0 flex flex-col gap-0">
            <SheetHeader className="px-4 py-3 border-b shrink-0">
              <SheetTitle className="text-sm font-semibold">?¼ë¬¸ ì´ˆì•ˆ</SheetTitle>
            </SheetHeader>
            {paperDraft && (
              <div className="flex-1 min-h-0 overflow-hidden">
                <PaperDraftPanel
                  draft={paperDraft}
                  discussionState={discussionState}
                  onGenerateDiscussion={() => { /* Phase B: LLM Discussion ?ì„± */ }}
                  onCancelDiscussion={() => setDiscussionState({ status: 'idle' })}
                  onLanguageChange={handleDraftLanguageChange}
                />
              </div>
            )}
          </SheetContent>
        </Sheet>

        {/* ?œí”Œë¦??€??ëª¨ë‹¬ */}
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

