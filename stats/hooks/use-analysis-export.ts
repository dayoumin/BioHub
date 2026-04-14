'use client'

import { useCallback } from 'react'
import { toast } from 'sonner'
import { ExportService } from '@/lib/services/export/export-service'
import { convertToStatisticalResult } from '@/lib/statistics/result-converter'
import type { AnalysisHistory } from '@/lib/stores/history-store'
import type { AnalysisResult } from '@/types/analysis'
import type {
  ExportContentOptions,
  ExportContext,
  ExportFormat,
} from '@/lib/services/export/export-types'
import { TOAST } from '@/lib/constants/toast-messages'

export interface UseAnalysisExportResult {
  exportAnalysis: (
    item: AnalysisHistory,
    format: ExportFormat,
    optionsOverride?: ExportContentOptions,
  ) => Promise<void>
}

export function useAnalysisExport(): UseAnalysisExportResult {
  const exportAnalysis = useCallback(
    async (
      item: AnalysisHistory,
      format: ExportFormat,
      optionsOverride?: ExportContentOptions,
    ): Promise<void> => {
      try {
        if (!item.results) {
          toast.error(TOAST.history.noResults)
          return
        }

        const effectiveOptions: ExportContentOptions = {
          includeInterpretation: true,
          includeRawData: false,
          includeMethodology: false,
          includeReferences: false,
          ...(optionsOverride ?? {}),
        }

        const safeGetString = (value: unknown): string | null => {
          if (typeof value !== 'string') return null
          const trimmed = value.trim()
          return trimmed.length > 0 ? trimmed : null
        }

        const resultRecord =
          typeof item.results === 'object' && item.results !== null
            ? (item.results as Record<string, unknown>)
            : null
        const recoveredAiInterpretation =
          safeGetString(item.aiInterpretation) ??
          safeGetString(resultRecord?.aiInterpretation)
        const recoveredApaFormat =
          safeGetString(item.apaFormat) ??
          safeGetString(resultRecord?.apaFormat)

        const analysisResult = item.results as unknown as AnalysisResult
        const statisticalResult = convertToStatisticalResult(analysisResult, {
          sampleSize: item.dataRowCount,
          timestamp: new Date(item.timestamp),
        })

        const context: ExportContext = {
          analysisResult,
          statisticalResult,
          aiInterpretation: recoveredAiInterpretation,
          apaFormat: recoveredApaFormat,
          exportOptions: effectiveOptions,
          dataInfo: {
            fileName: item.dataFileName,
            totalRows: item.dataRowCount,
            columnCount: 0,
            variables: [],
          },
          rawDataRows: null,
        }

        toast.info(TOAST.history.reportGenerating(format))

        const result = await ExportService.export(context, format)

        if (result.success) {
          toast.success(TOAST.history.reportSuccess, {
            description: result.fileName,
          })
        } else {
          toast.error(TOAST.history.reportError, {
            description: result.error,
          })
        }
      } catch (error) {
        console.error('Export failed:', error)
        toast.error(TOAST.history.exportError)
      }
    },
    [],
  )

  return { exportAnalysis }
}
