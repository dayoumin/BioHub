import { describe, expect, it } from 'vitest'
import {
  buildQuickAdvanceState,
  createDiagnosticUploadReplacementPatch,
  createHistoryRestorePatch,
  createHistorySettingsRestorePatch,
  createManualMethodBrowsingPatch,
} from '@/lib/stores/analysis-transitions'

describe('analysis transition helpers', () => {
  it('buildQuickAdvanceState adds Step 1 and 2, then jumps to Step 3', () => {
    expect(buildQuickAdvanceState([])).toEqual({
      completedSteps: [1, 2],
      currentStep: 3,
    })
  })

  it('createDiagnosticUploadReplacementPatch clears stale diagnostic execution state', () => {
    expect(createDiagnosticUploadReplacementPatch()).toEqual({
      currentStep: 1,
      completedSteps: [],
      selectedMethod: null,
      variableMapping: null,
      cachedAiRecommendation: null,
      detectedVariables: null,
      suggestedSettings: null,
      analysisOptions: {
        alpha: 0.05,
        showAssumptions: true,
        showEffectSize: true,
        methodSettings: {},
      },
      assumptionResults: null,
      diagnosticReport: null,
      results: null,
    })
  })

  it('createManualMethodBrowsingPatch clears only stale diagnostic guidance state', () => {
    expect(createManualMethodBrowsingPatch()).toEqual({
      assumptionResults: null,
      suggestedSettings: null,
      diagnosticReport: null,
    })
  })

  it('createHistoryRestorePatch preserves history payload while clearing live session data', () => {
    expect(createHistoryRestorePatch({
      analysisPurpose: 'history purpose',
      selectedMethod: { id: 't-test', name: 't-test', category: 't-test', description: '' },
      variableMapping: { dependentVar: 'score' },
      analysisOptions: { alpha: 0.05, showAssumptions: true, showEffectSize: true, methodSettings: {} },
      results: null,
      uploadedFileName: 'history.csv',
      currentStep: 4,
      completedSteps: [1, 2, 3],
      loadedAiInterpretation: null,
      loadedInterpretationChat: null,
      loadedPaperDraft: null,
    })).toEqual(expect.objectContaining({
      analysisPurpose: 'history purpose',
      selectedMethod: { id: 't-test', name: 't-test', category: 't-test', description: '' },
      variableMapping: { dependentVar: 'score' },
      uploadedData: null,
      validationResults: null,
      cachedAiRecommendation: null,
      diagnosticReport: null,
      currentStep: 4,
      completedSteps: [1, 2, 3],
    }))
  })

  it('createHistorySettingsRestorePatch resets the live dataset and restarts from Step 1', () => {
    expect(createHistorySettingsRestorePatch({
      selectedMethod: { id: 'anova', name: 'anova', category: 'anova', description: '' },
      variableMapping: { groupVar: 'group' },
      analysisPurpose: 'settings only',
      analysisOptions: { alpha: 0.01, showAssumptions: false, showEffectSize: true, methodSettings: {} },
    })).toEqual(expect.objectContaining({
      uploadedData: null,
      uploadedFile: null,
      uploadedFileName: null,
      selectedMethod: { id: 'anova', name: 'anova', category: 'anova', description: '' },
      variableMapping: { groupVar: 'group' },
      analysisPurpose: 'settings only',
      currentStep: 1,
      completedSteps: [],
      suggestedSettings: null,
      diagnosticReport: null,
    }))
  })
})
