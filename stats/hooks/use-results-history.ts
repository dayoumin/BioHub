'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import { ExportService } from '@/lib/services/export/export-service'
import { TOAST } from '@/lib/constants/toast-messages'
import { logger } from '@/lib/utils/logger'
import { useHistoryStore, type AnalysisHistory, type HistorySnapshot } from '@/lib/stores/history-store'
import { isHistoryResultsView } from '@/lib/utils/history-view'
import type { ChatMessage } from '@/lib/types/chat'
import type { AnalysisResult, DataRow, ValidationResults } from '@/types/analysis'
import type { PaperDraft } from '@/lib/services/paper-draft/paper-types'
import type {
  ExportContentOptions,
  ExportContext,
  ExportFormat,
} from '@/lib/services/export/export-types'
import type { convertToStatisticalResult } from '@/lib/statistics/result-converter'
import type { useTerminology } from '@/hooks/use-terminology'

type StatisticalResult = NonNullable<ReturnType<typeof convertToStatisticalResult>>
type Terminology = ReturnType<typeof useTerminology>

interface UseResultsHistoryOptions {
  results: AnalysisResult | null
  uploadedData: DataRow[] | null
  validationResults: ValidationResults | null
  statisticalResult: StatisticalResult | null
  selectedMethodName?: string
  buildHistorySnapshot: () => HistorySnapshot
  interpretation: string | null
  interpretationModel: string | null
  isInterpreting: boolean
  interpretError: string | null
  apaFormat: string | null
  exportDataInfo: ExportContext['dataInfo']
  followUpMessages: ChatMessage[]
  isFollowUpStreaming: boolean
  paperDraft: PaperDraft | null
  activeProjectId?: string
  activeProjectName?: string
  setFollowUpMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>
  t: Terminology
}

interface UseResultsHistoryResult {
  currentHistoryId: string | null
  historyEntries: AnalysisHistory[]
  currentHistoryProjectId?: string
  historyResultView: boolean
  isSaved: boolean
  isSavingToHistory: boolean
  isExporting: boolean
  exportDialogOpen: boolean
  exportFormat: ExportFormat
  exportOptions: ExportContentOptions
  setExportDialogOpen: React.Dispatch<React.SetStateAction<boolean>>
  setExportFormat: React.Dispatch<React.SetStateAction<ExportFormat>>
  setExportOptions: React.Dispatch<React.SetStateAction<ExportContentOptions>>
  handleSaveButtonClick: () => void
  handleSaveAsFile: (
    format?: ExportFormat,
    optionsOverride?: ExportContentOptions,
  ) => Promise<void>
  openExportDialog: (format: ExportFormat) => void
  handleExportWithOptions: () => Promise<void>
  resetHistoryUiState: () => void
}

interface PersistHistoryOptions {
  projectId?: string
  silent?: boolean
}

export function useResultsHistory({
  results,
  uploadedData,
  validationResults,
  statisticalResult,
  selectedMethodName,
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
  activeProjectId,
  activeProjectName,
  setFollowUpMessages,
  t,
}: UseResultsHistoryOptions): UseResultsHistoryResult {
  const [isSaved, setIsSaved] = useState(false)
  const [isSavingToHistory, setIsSavingToHistory] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [exportDialogOpen, setExportDialogOpen] = useState(false)
  const [exportFormat, setExportFormat] = useState<ExportFormat>('docx')
  const [exportOptions, setExportOptions] = useState<ExportContentOptions>({
    includeInterpretation: true,
    includeRawData: false,
    includeMethodology: false,
    includeReferences: false,
  })

  const {
    analysisHistory,
    currentHistoryId,
    loadedInterpretationChat,
    saveToHistory,
    patchHistoryInterpretation,
  } = useHistoryStore()

  const savedTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const hasSavedToHistoryRef = useRef(false)

  const historyEntries = useMemo(() => analysisHistory ?? [], [analysisHistory])
  const currentHistoryProjectId = useMemo(
    () => historyEntries.find(entry => entry.id === currentHistoryId)?.projectId,
    [currentHistoryId, historyEntries],
  )
  const historyResultView = useMemo(
    () =>
      isHistoryResultsView({
        currentHistoryId,
        results,
        uploadedData,
        validationResults,
      }),
    [currentHistoryId, results, uploadedData, validationResults],
  )

  const resetHistoryUiState = useCallback(() => {
    if (savedTimeoutRef.current) {
      clearTimeout(savedTimeoutRef.current)
      savedTimeoutRef.current = null
    }
    hasSavedToHistoryRef.current = false
    setIsSaved(false)
    setIsSavingToHistory(false)
  }, [])

  useEffect(() => {
    return () => {
      if (savedTimeoutRef.current) {
        clearTimeout(savedTimeoutRef.current)
      }
    }
  }, [])

  useEffect(() => {
    if (!loadedInterpretationChat?.length) return
    setFollowUpMessages(loadedInterpretationChat)
    useHistoryStore.getState().setLoadedInterpretationChat(null)
  }, [loadedInterpretationChat, setFollowUpMessages])

  useEffect(() => {
    const nextInterpretation = interpretation?.trim() ?? ''
    if (!currentHistoryId || isInterpreting || interpretError || nextInterpretation.length === 0) return

    const currentEntry = historyEntries.find((entry) => entry.id === currentHistoryId)
    if (currentEntry?.aiInterpretation === nextInterpretation) return

    patchHistoryInterpretation(currentHistoryId, nextInterpretation).catch((error) => {
      logger.error('Failed to patch AI interpretation into history', { error, historyId: currentHistoryId })
    })
  }, [currentHistoryId, historyEntries, interpretation, isInterpreting, interpretError, patchHistoryInterpretation])

  const buildHistoryName = useCallback((): string => {
    const historyLabel = statisticalResult?.testName || selectedMethodName || 'Analysis'
    return `${historyLabel} — ${new Date().toLocaleString('ko-KR', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })}`
  }, [selectedMethodName, statisticalResult?.testName])

  const persistToHistory = useCallback(async ({
    projectId,
    silent = false,
  }: PersistHistoryOptions = {}): Promise<boolean> => {
    if (!results || !statisticalResult || isSavingToHistory) return false
    if (!silent && isSaved) return false
    if (silent && hasSavedToHistoryRef.current) return true

    try {
      if (!silent) {
        setIsSavingToHistory(true)
      }

      await saveToHistory(buildHistorySnapshot(), buildHistoryName(), {
        projectId,
        aiInterpretation: interpretation,
        apaFormat,
        interpretationModel,
        interpretationChat: !isFollowUpStreaming && followUpMessages.length > 0 ? followUpMessages : undefined,
        paperDraft: paperDraft ?? null,
      })

      hasSavedToHistoryRef.current = true

      if (!silent) {
        if (savedTimeoutRef.current) {
          clearTimeout(savedTimeoutRef.current)
        }
        setIsSaved(true)
        toast.success(
          activeProjectName
            ? TOAST.project.savedToProject(activeProjectName)
            : t.results.save.success,
        )
        savedTimeoutRef.current = setTimeout(() => {
          setIsSaved(false)
          savedTimeoutRef.current = null
        }, 5000)
      }

      return true
    } catch (error) {
      if (silent) {
        logger.warn('Silent history save failed during export', { error })
        return false
      }

      logger.error('Save to history failed', { error })
      toast.error(t.results.save.errorTitle, { description: t.results.save.unknownError })
      return false
    } finally {
      if (!silent) {
        setIsSavingToHistory(false)
      }
    }
  }, [
    results,
    statisticalResult,
    isSavingToHistory,
    isSaved,
    saveToHistory,
    buildHistorySnapshot,
    buildHistoryName,
    interpretation,
    apaFormat,
    interpretationModel,
    isFollowUpStreaming,
    followUpMessages,
    paperDraft,
    activeProjectName,
    t,
  ])

  const handleSaveButtonClick = useCallback(() => {
    void persistToHistory({ projectId: activeProjectId })
  }, [activeProjectId, persistToHistory])

  const handleSaveAsFile = useCallback(async (
    format: ExportFormat = 'docx',
    optionsOverride?: ExportContentOptions,
  ): Promise<void> => {
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

      if (!result.success) {
        toast.error(t.results.save.errorTitle, { description: result.error })
        return
      }

      toast.success(t.results.toast.exportSuccess ?? t.results.save.success)

      if (!hasSavedToHistoryRef.current) {
        void persistToHistory({
          projectId: currentHistoryProjectId,
          silent: true,
        })
      }
    } catch (error) {
      toast.error(t.results.save.errorTitle, {
        description: error instanceof Error ? error.message : t.results.save.unknownError,
      })
    } finally {
      setIsExporting(false)
    }
  }, [
    results,
    statisticalResult,
    interpretation,
    apaFormat,
    exportDataInfo,
    uploadedData,
    t,
    persistToHistory,
    currentHistoryProjectId,
  ])

  const openExportDialog = useCallback((format: ExportFormat) => {
    setExportFormat(format)
    setExportDialogOpen(true)
  }, [])

  const handleExportWithOptions = useCallback(async () => {
    setExportDialogOpen(false)
    await handleSaveAsFile(exportFormat, exportOptions)
  }, [handleSaveAsFile, exportFormat, exportOptions])

  return {
    currentHistoryId,
    historyEntries,
    currentHistoryProjectId,
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
  }
}
