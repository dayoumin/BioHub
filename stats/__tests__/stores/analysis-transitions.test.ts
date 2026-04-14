import { describe, expect, it } from 'vitest'
import {
  buildQuickAdvanceState,
  createDiagnosticUploadReplacementPatch,
  createHistoryRestorePatch,
  createHistorySettingsRestorePatch,
  createManualMethodBrowsingPatch,
  normalizeSelectedMethod,
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
      selectedMethod: expect.objectContaining({
        id: 'two-sample-t',
        name: 't-test',
        category: 't-test',
      }),
      variableMapping: { dependentVar: 'score' },
      uploadedData: null,
      validationResults: null,
      cachedAiRecommendation: null,
      diagnosticReport: null,
      currentStep: 4,
      completedSteps: [1, 2, 3],
    }))
  })

  describe('normalizeSelectedMethod — category union guard', () => {
    it('unknown id + 비-union category는 null로 드롭한다', () => {
      const result = normalizeSelectedMethod({
        id: 'unknown-method-xyz',
        name: 'Custom',
        description: '',
        category: 'not-a-real-category',
      })
      expect(result).toBeNull()
    })

    it('unknown id + 유효한 union category는 그대로 보존한다', () => {
      const result = normalizeSelectedMethod({
        id: 'unknown-method-xyz',
        name: 'Custom',
        description: '',
        category: 't-test',
      })
      expect(result).toEqual({
        id: 'unknown-method-xyz',
        name: 'Custom',
        description: '',
        category: 't-test',
      })
    })

    it('alias id는 category가 비-union이어도 canonical category로 복원한다', () => {
      // 의도: alias 승격 경로는 canonical category로 덮어쓰므로, 사용자의 잘못된 category는 자연 치유된다.
      const result = normalizeSelectedMethod({
        id: 't-test',
        name: '독립표본 t-검정',
        description: '',
        category: 'garbage-category',
      })
      expect(result?.id).toBe('two-sample-t')
      expect(result?.category).toBe('t-test')
    })
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
      selectedMethod: expect.objectContaining({
        id: 'one-way-anova',
        name: 'anova',
        category: 'anova',
      }),
      variableMapping: { groupVar: 'group' },
      analysisPurpose: 'settings only',
      currentStep: 1,
      completedSteps: [],
      suggestedSettings: null,
      diagnosticReport: null,
    }))
  })
})
