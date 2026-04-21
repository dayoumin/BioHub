'use client'

import { useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { startNewAnalysis } from '@/lib/services'
import { logger } from '@/lib/utils/logger'
import { useAnalysisStore } from '@/lib/stores/analysis-store'
import { useHistoryStore, type AnalysisHistory } from '@/lib/stores/history-store'
import { useModeStore } from '@/lib/stores/mode-store'
import { prepareManualMethodBrowsing } from '@/lib/stores/store-orchestration'
import { useGraphStudioStore } from '@/lib/stores/graph-studio-store'
import {
  toAnalysisContext,
  buildKmCurveColumns,
  buildRocCurveColumns,
  inferColumnMeta,
  suggestChartType,
  analysisVizTypeToChartType,
  selectXYFields,
  applyAnalysisContext,
  createAutoConfiguredChartSpec,
  CHART_TYPE_HINTS,
} from '@/lib/graph-studio'
import type { AnalysisVisualizationColumnsResult } from '@/lib/graph-studio/analysis-adapter'
import type { KaplanMeierAnalysisResult, RocCurveAnalysisResult } from '@/lib/generated/method-types.generated'
import type { AnalysisResult } from '@/types/analysis'
import type { ChartType, DataPackage } from '@/types/graph-studio'
import type { useTerminology } from '@/hooks/use-terminology'

type Terminology = ReturnType<typeof useTerminology>

interface UseResultsNavigationOptions {
  results: AnalysisResult | null
  uploadedData: unknown[] | null
  analysisVisualizationColumns: AnalysisVisualizationColumnsResult | null
  currentHistoryId: string | null
  historyEntries: AnalysisHistory[]
  historyResultView: boolean
  clearInterpretationGuard: () => void
  t: Terminology
}

interface UseResultsNavigationResult {
  handleReanalyze: () => void
  handleNewAnalysisConfirm: () => Promise<void>
  handleChangeMethod: () => void
  handleOpenInGraphStudio: () => void
}

export function useResultsNavigation({
  results,
  uploadedData,
  analysisVisualizationColumns,
  currentHistoryId,
  historyEntries,
  historyResultView,
  clearInterpretationGuard,
  t,
}: UseResultsNavigationOptions): UseResultsNavigationResult {
  const router = useRouter()
  const {
    reset,
    setUploadedData,
    setUploadedFile,
    setValidationResults,
    setResults,
    setVariableMapping,
    pruneCompletedStepsFrom,
    setCurrentStep,
    navigateToStep,
    selectedMethod,
  } = useAnalysisStore()
  const { setStepTrack } = useModeStore()
  const {
    setCurrentHistoryId,
    setLoadedAiInterpretation,
    setLoadedInterpretationChat,
    setLoadedPaperDraft,
  } = useHistoryStore()
  const loadDataPackageWithSpec = useGraphStudioStore(s => s.loadDataPackageWithSpec)
  const disconnectProject = useGraphStudioStore(s => s.disconnectProject)

  const handleReanalyze = useCallback(() => {
    setUploadedData(null)
    setUploadedFile(null)
    setValidationResults(null)
    setResults(null)
    setLoadedAiInterpretation(null)
    setLoadedInterpretationChat(null)
    setLoadedPaperDraft(null)
    setCurrentHistoryId(null)
    setStepTrack('reanalysis')
    clearInterpretationGuard()
    navigateToStep(1)

    toast.info(t.results.toast.reanalyzeReady, {
      description: selectedMethod ? t.results.toast.reanalyzeMethod(selectedMethod.name) : '',
    })
  }, [
    setUploadedData,
    setUploadedFile,
    setValidationResults,
    setResults,
    setLoadedAiInterpretation,
    setLoadedInterpretationChat,
    setLoadedPaperDraft,
    setCurrentHistoryId,
    setStepTrack,
    clearInterpretationGuard,
    navigateToStep,
    selectedMethod,
    t,
  ])

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

  const handleChangeMethod = useCallback(() => {
    setResults(null)
    setVariableMapping(null)
    pruneCompletedStepsFrom(3)
    prepareManualMethodBrowsing()
    setCurrentStep(2)
  }, [setResults, setVariableMapping, pruneCompletedStepsFrom, setCurrentStep])

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
    } else if (analysisVisualizationColumns) {
      columns = analysisVisualizationColumns.columns
      data = analysisVisualizationColumns.data
      chartType = analysisVisualizationColumns.chartType
      xField = analysisVisualizationColumns.xField
      yField = analysisVisualizationColumns.yField
      colorField = analysisVisualizationColumns.colorField
    } else if (uploadedData?.length) {
      const rows = uploadedData as Record<string, unknown>[]
      columns = inferColumnMeta(rows)
      data = {}
      for (const column of columns) {
        data[column.name] = rows.map(row => row[column.name])
      }
      chartType = analysisVizTypeToChartType(vizType) ?? suggestChartType(columns)
      const hint = CHART_TYPE_HINTS[chartType]
      const fields = selectXYFields(columns, hint)
      xField = fields.xField
      yField = fields.yField
    } else {
      toast.error(
        historyResultView
          ? '이 기록에는 그래프 작성을 위한 원본 데이터가 없어 바로 열 수 없습니다.'
          : t.analysis.emptyStates.dataRequired,
      )
      return
    }

    const spec = createAutoConfiguredChartSpec(pkgId, chartType, xField, yField, columns)
    if (colorField) {
      spec.encoding.color = { field: colorField, type: 'nominal' }
    }
    if (analysisVisualizationColumns?.trendline) {
      spec.trendline = analysisVisualizationColumns.trendline
    }
    if (analysisVisualizationColumns?.errorBar) {
      spec.errorBar = analysisVisualizationColumns.errorBar
    }

    const pkg: DataPackage = {
      id: pkgId,
      source: 'analysis',
      label: `${results.method} 결과`,
      columns,
      data,
      projectId: linkedHistory?.projectId,
      analysisContext: toAnalysisContext(results),
      analysisResultId: currentHistoryId ?? undefined,
      sourceRefs: currentHistoryId
        ? [{ kind: 'analysis', sourceId: currentHistoryId, label: linkedHistory?.name ?? results.method }]
        : undefined,
      lineageMode: currentHistoryId ? 'derived' : 'manual',
      createdAt: new Date().toISOString(),
    }

    const finalSpec = pkg.analysisContext
      ? applyAnalysisContext(spec, pkg.analysisContext)
      : spec

    loadDataPackageWithSpec(pkg, finalSpec)
    disconnectProject()
    router.push('/graph-studio')
  }, [
    results,
    currentHistoryId,
    historyEntries,
    analysisVisualizationColumns,
    uploadedData,
    historyResultView,
    t,
    loadDataPackageWithSpec,
    disconnectProject,
    router,
  ])

  return {
    handleReanalyze,
    handleNewAnalysisConfirm,
    handleChangeMethod,
    handleOpenInGraphStudio,
  }
}
