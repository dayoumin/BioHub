import { describe, it, expect } from 'vitest'
import { buildQuickAdvanceState, createDiagnosticUploadResetPatch } from '@/hooks/use-data-upload'

describe('buildQuickAdvanceState', () => {
  it('adds Step 1 and 2, then jumps to Step 3', () => {
    const result = buildQuickAdvanceState([])
    expect(result.completedSteps).toEqual([1, 2])
    expect(result.currentStep).toBe(3)
  })

  it('preserves existing steps without duplicates', () => {
    const result = buildQuickAdvanceState([1, 4])
    expect(result.completedSteps).toEqual([1, 4, 2])
    expect(result.currentStep).toBe(3)
  })
})

describe('createDiagnosticUploadResetPatch', () => {
  it('clears stale diagnostic selections after replacing uploaded data', () => {
    expect(createDiagnosticUploadResetPatch()).toEqual({
      selectedMethod: null,
      variableMapping: null,
      cachedAiRecommendation: null,
      detectedVariables: null,
      suggestedSettings: null,
      assumptionResults: null,
      diagnosticReport: null,
    })
  })
})
