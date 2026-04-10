import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useDataUpload } from '@/hooks/use-data-upload'
import { useAnalysisStore } from '@/lib/stores/analysis-store'
import { useHubChatStore } from '@/lib/stores/hub-chat-store'
import { useModeStore } from '@/lib/stores/mode-store'
import { DataValidationService } from '@/lib/services/data-validation-service'
import { enrichWithNormality } from '@/lib/services/normality-enrichment-service'
import { extractDetectedVariables } from '@/lib/services/variable-detection-service'
import { toast } from 'sonner'
import type { StatisticalMethod, ValidationResults } from '@/types/analysis'

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
    info: vi.fn(),
  },
}))

vi.mock('@/hooks/use-terminology', () => ({
  useTerminology: () => ({
    analysis: {
      errors: {
        uploadFailed: (message: string) => `upload failed: ${message}`,
      },
    },
  }),
}))

vi.mock('@/lib/services/data-validation-service', () => ({
  DataValidationService: {
    performValidation: vi.fn(),
  },
}))

vi.mock('@/lib/services/normality-enrichment-service', () => ({
  enrichWithNormality: vi.fn(),
}))

vi.mock('@/lib/services/variable-detection-service', () => ({
  extractDetectedVariables: vi.fn(),
}))

const VALIDATION_RESULT: ValidationResults = {
  isValid: true,
  totalRows: 2,
  columnCount: 2,
  missingValues: 0,
  dataType: 'tabular' as const,
  variables: ['weight', 'group'],
  errors: [],
  warnings: [],
  columns: [
    { name: 'weight', type: 'numeric', numericCount: 2, textCount: 0, missingCount: 0, uniqueValues: 2 },
    { name: 'group', type: 'categorical', numericCount: 0, textCount: 2, missingCount: 0, uniqueValues: 2 },
  ],
  columnStats: [
    { name: 'weight', type: 'numeric', numericCount: 2, textCount: 0, missingCount: 0, uniqueValues: 2 },
    { name: 'group', type: 'categorical', numericCount: 0, textCount: 2, missingCount: 0, uniqueValues: 2 },
  ],
}

const QUICK_METHOD = {
  id: 't-test',
  name: '독립표본 t-검정',
  category: 't-test',
  description: '두 그룹 평균 비교',
} as StatisticalMethod

function makeFile(name: string) {
  return new File(['weight,group\n70,A\n65,B'], name, { type: 'text/csv' })
}

function makeRows() {
  return [
    { weight: '70', group: 'A' },
    { weight: '65', group: 'B' },
  ]
}

beforeEach(() => {
  act(() => {
    useAnalysisStore.getState().reset()
    useModeStore.getState().resetMode()
    useHubChatStore.getState().clearAll()
  })

  vi.clearAllMocks()
  vi.mocked(DataValidationService.performValidation).mockReturnValue(VALIDATION_RESULT)
  vi.mocked(enrichWithNormality).mockReturnValue(new Promise(() => {}))
  vi.mocked(extractDetectedVariables).mockReturnValue({
    dependentCandidate: 'weight',
    groupVariable: 'group',
  })
})

describe('useDataUpload scenarios', () => {
  it('diagnostic state is cleared when a replacement file is uploaded', async () => {
    act(() => {
      useModeStore.getState().setStepTrack('diagnostic')
      useAnalysisStore.setState({
        currentStep: 4,
        completedSteps: [1, 2, 3],
        selectedMethod: QUICK_METHOD,
        variableMapping: { dependent: 'old_weight', group: 'old_group' } as never,
        cachedAiRecommendation: { method: QUICK_METHOD } as never,
        detectedVariables: { dependentCandidate: 'old_weight' },
        suggestedSettings: { confidenceLevel: 0.9 } as never,
        assumptionResults: { normality: [] } as never,
        diagnosticReport: { summary: 'stale report' } as never,
        results: { summary: 'stale result' } as never,
      })
    })

    const { result } = renderHook(() => useDataUpload())

    await act(async () => {
      await result.current.handleUploadComplete(makeFile('replacement.csv'), makeRows())
    })

    const analysisState = useAnalysisStore.getState()
    const hubState = useHubChatStore.getState()

    expect(useModeStore.getState().stepTrack).toBe('normal')
    expect(analysisState.currentStep).toBe(1)
    expect(analysisState.completedSteps).toEqual([])
    expect(analysisState.selectedMethod).toBeNull()
    expect(analysisState.variableMapping).toBeNull()
    expect(analysisState.cachedAiRecommendation).toBeNull()
    expect(analysisState.detectedVariables).toBeNull()
    expect(analysisState.suggestedSettings).toBeNull()
    expect(analysisState.assumptionResults).toBeNull()
    expect(analysisState.diagnosticReport).toBeNull()
    expect(analysisState.results).toBeNull()
    expect(analysisState.uploadedFileName).toBe('replacement.csv')
    expect(hubState.dataContext?.fileName).toBe('replacement.csv')
    expect(hubState.dataContext?.numericColumns).toEqual(['weight'])
    expect(hubState.dataContext?.categoricalColumns).toEqual(['group'])
  })

  it('quick track upload advances straight to Step 3 and keeps hub data context in sync', async () => {
    act(() => {
      useModeStore.getState().setStepTrack('quick')
      useAnalysisStore.getState().setSelectedMethod(QUICK_METHOD)
    })

    const { result } = renderHook(() => useDataUpload())

    await act(async () => {
      await result.current.handleUploadComplete(makeFile('quick.csv'), makeRows())
    })

    const analysisState = useAnalysisStore.getState()
    const hubState = useHubChatStore.getState()

    expect(vi.mocked(extractDetectedVariables)).toHaveBeenCalledWith(
      't-test',
      VALIDATION_RESULT,
      null,
    )
    expect(analysisState.currentStep).toBe(3)
    expect(analysisState.completedSteps).toEqual(expect.arrayContaining([1, 2]))
    expect(analysisState.detectedVariables).toEqual({
      dependentCandidate: 'weight',
      groupVariable: 'group',
    })
    expect(hubState.dataContext?.fileName).toBe('quick.csv')
    expect(hubState.dataContext?.validationResults.totalRows).toBe(2)
    expect(vi.mocked(toast.success)).toHaveBeenCalledTimes(1)
  })
})
