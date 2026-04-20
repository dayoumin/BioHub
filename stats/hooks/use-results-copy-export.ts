'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { TOAST } from '@/lib/constants/toast-messages'
import { exportCodeFromAnalysis, generateSummaryText, isCodeExportAvailable, splitInterpretation, type CodeLanguage } from '@/lib/services'
import { logger } from '@/lib/utils/logger'
import type { AnalysisOptions, AnalysisResult, DataRow, StatisticalMethod } from '@/types/analysis'
import type { VariableMapping } from '@/lib/statistics/variable-mapping'
import type { convertToStatisticalResult } from '@/lib/statistics/result-converter'
import type { useTerminology } from '@/hooks/use-terminology'

type StatisticalResult = NonNullable<ReturnType<typeof convertToStatisticalResult>>
type Terminology = ReturnType<typeof useTerminology>

interface UseResultsCopyExportOptions {
  results: AnalysisResult | null
  statisticalResult: StatisticalResult | null
  interpretation: string | null
  apaFormat: string | null
  selectedMethod: StatisticalMethod | null
  variableMapping: VariableMapping | null
  analysisOptions: AnalysisOptions
  uploadedFileName: string | null
  uploadedData: DataRow[] | null
  t: Terminology
}

interface UseResultsCopyExportResult {
  isCopied: boolean
  codeExportAvailable: boolean
  handleCopyResults: () => Promise<void>
  handleCodeExport: (language: CodeLanguage) => void
  resetCopyState: () => void
}

export function useResultsCopyExport({
  results,
  statisticalResult,
  interpretation,
  apaFormat,
  selectedMethod,
  variableMapping,
  analysisOptions,
  uploadedFileName,
  uploadedData,
  t,
}: UseResultsCopyExportOptions): UseResultsCopyExportResult {
  const [isCopied, setIsCopied] = useState(false)
  const copiedTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const clearCopiedState = useCallback(() => {
    if (copiedTimeoutRef.current) {
      clearTimeout(copiedTimeoutRef.current)
      copiedTimeoutRef.current = null
    }
    setIsCopied(false)
  }, [])

  useEffect(() => {
    return () => {
      if (copiedTimeoutRef.current) {
        clearTimeout(copiedTimeoutRef.current)
      }
    }
  }, [])

  const codeExportAvailable = isCodeExportAvailable(selectedMethod?.id)

  const handleCodeExport = useCallback((language: CodeLanguage) => {
    const exportResult = exportCodeFromAnalysis({
      method: selectedMethod,
      variableMapping,
      analysisOptions,
      dataFileName: uploadedFileName ?? null,
      dataRowCount: uploadedData?.length ?? 0,
      results: results ?? null,
    }, language)

    if (exportResult.success) {
      toast.success(TOAST.codeExport.success(language), {
        description: exportResult.fileName,
      })
      return
    }

    toast.error(exportResult.error ?? TOAST.codeExport.error)
  }, [selectedMethod, variableMapping, analysisOptions, uploadedFileName, uploadedData, results])

  const handleCopyResults = useCallback(async () => {
    if (!results || !statisticalResult) return

    try {
      const plainText = generateSummaryText(results)
      const aiPlain = interpretation
        ? `\n\n${t.results.clipboard.aiSeparator}\n${interpretation}`
        : ''

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

      if (interpretation) {
        const { summary, detail } = splitInterpretation(interpretation)
        html += `<hr/><h4>${t.results.clipboard.aiInterpretation}</h4>`
        html += `<pre style="white-space:pre-wrap;font-family:inherit;margin:0">${summary}</pre>`
        if (detail) {
          html += `<pre style="white-space:pre-wrap;font-family:inherit;margin:8px 0 0">${detail}</pre>`
        }
      }

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
        await navigator.clipboard.writeText(plainText + aiPlain)
      }

      setIsCopied(true)
      toast.success(interpretation ? t.results.toast.copyWithAi : t.results.toast.copySuccess)

      if (copiedTimeoutRef.current) {
        clearTimeout(copiedTimeoutRef.current)
      }
      copiedTimeoutRef.current = setTimeout(() => {
        setIsCopied(false)
        copiedTimeoutRef.current = null
      }, 2000)
    } catch (error) {
      logger.error('Copy failed', { error })
      toast.error(t.results.toast.copyError)
    }
  }, [results, statisticalResult, interpretation, apaFormat, t])

  return {
    isCopied,
    codeExportAvailable,
    handleCopyResults,
    handleCodeExport,
    resetCopyState: clearCopiedState,
  }
}
