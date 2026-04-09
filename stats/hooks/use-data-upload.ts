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
import { TOAST } from '@/lib/constants/toast-messages'
import { enrichWithNormality } from '@/lib/services/normality-enrichment-service'
import { useHubChatStore } from '@/lib/stores/hub-chat-store'
import { buildHubDataContext } from '@/lib/utils/hub-data-context'
import { useTerminology } from '@/hooks/use-terminology'
import type { ColumnInfo } from '@/lib/statistics/variable-mapping'
import type { DataRow } from '@/types/analysis'

interface UseDataUploadReturn {
  handleUploadComplete: (file: File, data: DataRow[]) => Promise<void>
  reanalysisCompatibility: CompatibilityResult | null
}

export function buildQuickAdvanceState(completedSteps: number[]): {
  completedSteps: number[]
  currentStep: number
} {
  return {
    completedSteps: [...new Set([...completedSteps, 1, 2])],
    currentStep: 3,
  }
}

export function createDiagnosticUploadResetPatch() {
  return {
    selectedMethod: null,
    variableMapping: null,
    cachedAiRecommendation: null,
    detectedVariables: null,
    suggestedSettings: null,
    assumptionResults: null,
    diagnosticReport: null,
  }
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
      useHubChatStore.getState().setDataContext(buildHubDataContext(file.name, detailedValidation))

      const currentAnalysis = useAnalysisStore.getState()
      const currentMode = useModeStore.getState()

      const newColumns = new Set(Object.keys(data[0] ?? {}))
      if (currentAnalysis.variableMapping) {
        const allVars = Object.values(currentAnalysis.variableMapping)
          .filter(Boolean)
          .flatMap(v => Array.isArray(v) ? v : String(v).split(','))
          .map(v => String(v).trim())
        const hasInvalid = allVars.some(v => !newColumns.has(v))
        if (hasInvalid) {
          useAnalysisStore.getState().setVariableMapping(null)
        }
      }

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

      if (currentMode.stepTrack === 'diagnostic') {
        useAnalysisStore.setState(createDiagnosticUploadResetPatch())
        useModeStore.getState().setStepTrack('normal')
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
              const updatedValidation = useAnalysisStore.getState().validationResults
              if (updatedValidation) {
                useHubChatStore.getState().setDataContext(buildHubDataContext(file.name, updatedValidation))
              }
            }
          })
          .catch(() => { /* graceful degradation */ })
      }

      // 빠른 분석 모드: 업로드 후 자동으로 변수 선택(Step 3)으로 전진
      if (currentMode.stepTrack === 'quick' && currentAnalysis.selectedMethod) {
        const detectedVars = extractDetectedVariables(
          currentAnalysis.selectedMethod.id,
          detailedValidation,
          null,
        )
        setDetectedVariables(detectedVars)
        toast.success(TOAST.data.uploadSuccess(file.name))

        // Step 1,2 완료 처리 + Step 3 이동을 단일 set으로 배치 (리렌더 1회)
        useAnalysisStore.setState((state) => buildQuickAdvanceState(state.completedSteps))
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
