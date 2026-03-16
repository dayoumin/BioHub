'use client'

/**
 * 데이터 업로드 처리 훅
 *
 * handleUploadComplete (검증 + 정규성 + 재분석 호환성 + 빠른분석 자동이동)
 * + reanalysisCompatibility 상태를 캡슐화.
 *
 * useAnalysisHandlers에서 추출 (TD-10-C).
 */

import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { useAnalysisStore } from '@/lib/stores/analysis-store'
import { useModeStore } from '@/lib/stores/mode-store'
import { DataValidationService } from '@/lib/services/data-validation-service'
import { checkVariableCompatibility, CompatibilityResult } from '@/lib/utils/variable-compatibility'
import { extractDetectedVariables } from '@/lib/services/variable-detection-service'
import { enrichWithNormality } from '@/lib/services/normality-enrichment-service'
import { useTerminology } from '@/hooks/use-terminology'
import type { ColumnInfo } from '@/lib/statistics/variable-mapping'
import type { DataRow } from '@/types/analysis'

interface UseDataUploadReturn {
  handleUploadComplete: (file: File, data: DataRow[]) => Promise<void>
  reanalysisCompatibility: CompatibilityResult | null
}

export function useDataUpload(): UseDataUploadReturn {
  const t = useTerminology()
  const [reanalysisCompatibility, setReanalysisCompatibility] = useState<CompatibilityResult | null>(null)

  const {
    setUploadedFile,
    setUploadedData,
    setValidationResults,
    setDetectedVariables,
    patchColumnNormality,
    setError,
  } = useAnalysisStore()

  const { stepTrack } = useModeStore()

  // Reset compatibility when leaving reanalysis mode
  useEffect(() => {
    if (stepTrack !== 'reanalysis') {
      setReanalysisCompatibility(null)
    }
  }, [stepTrack])

  const handleUploadComplete = useCallback(async (file: File, data: DataRow[]) => {
    try {
      setUploadedFile(file)
      setUploadedData(data)
      const detailedValidation = DataValidationService.performValidation(data)
      setValidationResults(detailedValidation)

      const currentAnalysis = useAnalysisStore.getState()
      const currentMode = useModeStore.getState()
      if (currentMode.stepTrack === 'reanalysis' && currentAnalysis.variableMapping) {
        const columns: ColumnInfo[] = detailedValidation.columnStats?.map(col => ({
          name: col.name,
          type: col.type as 'numeric' | 'categorical' | 'date' | 'text',
          uniqueValues: col.uniqueValues,
          missing: col.missingCount,
        })) ?? []
        const compatibility = checkVariableCompatibility(currentAnalysis.variableMapping, columns)
        setReanalysisCompatibility(compatibility)
      }

      // 비동기 정규성 검정 (fire-and-forget)
      if (detailedValidation.columnStats?.length) {
        const capturedNonce = useAnalysisStore.getState().uploadNonce
        enrichWithNormality(detailedValidation.columnStats, data)
          .then(({ enrichedColumns, testedCount }) => {
            if (testedCount > 0) {
              const current = useAnalysisStore.getState()
              if (current.uploadNonce !== capturedNonce) return
              patchColumnNormality(enrichedColumns)
            }
          })
          .catch(() => { /* graceful degradation */ })
      }

      // 빠른 분석 모드: 업로드 후 Step 1에 머물러 데이터 탐색 확인
      // 사용자가 데이터를 확인하고 "다음" 버튼으로 진행
      if (currentMode.stepTrack === 'quick' && currentAnalysis.selectedMethod) {
        const detectedVars = extractDetectedVariables(
          currentAnalysis.selectedMethod.id,
          detailedValidation,
          null,
        )
        setDetectedVariables(detectedVars)
        toast.success(`${file.name} 업로드 완료 — 데이터를 확인해주세요`)
      }
    } catch (err) {
      setError(t.analysis.errors.uploadFailed((err as Error).message))
    }
  }, [setUploadedFile, setUploadedData, setValidationResults, patchColumnNormality, setDetectedVariables, setError, t])

  return {
    handleUploadComplete,
    reanalysisCompatibility,
  }
}
