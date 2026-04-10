import { act } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { SESSION_STORAGE_KEYS } from '@/lib/constants/storage-keys'
import { useAnalysisStore } from '@/lib/stores/analysis-store'

describe('analysis-store persistence and explicit override tracking', () => {
  beforeEach(() => {
    sessionStorage.clear()
    act(() => {
      useAnalysisStore.getState().reset()
    })
  })

  it('persists and rehydrates detectedVariables and suggestedSettings with the rest of the session', async () => {
    act(() => {
      const store = useAnalysisStore.getState()
      store.setCurrentStep(3)
      store.setDetectedVariables({
        dependentCandidate: 'weight',
        groupVariable: 'treatment',
      })
      store.setSuggestedSettings({
        alternative: 'greater',
        postHoc: 'games-howell',
      })
    })

    const persisted = sessionStorage.getItem(SESSION_STORAGE_KEYS.analysis.store)
    expect(persisted).not.toBeNull()

    const savedPayload = JSON.parse(persisted ?? '{}') as {
      state?: {
        detectedVariables?: unknown
        suggestedSettings?: unknown
      }
    }
    expect(savedPayload.state?.detectedVariables).toEqual({
      dependentCandidate: 'weight',
      groupVariable: 'treatment',
    })
    expect(savedPayload.state?.suggestedSettings).toEqual({
      alternative: 'greater',
      postHoc: 'games-howell',
    })

    act(() => {
      useAnalysisStore.getState().reset()
    })
    sessionStorage.setItem(SESSION_STORAGE_KEYS.analysis.store, persisted ?? '')

    await act(async () => {
      await useAnalysisStore.persist.rehydrate()
    })

    const restored = useAnalysisStore.getState()
    expect(restored.detectedVariables).toEqual({
      dependentCandidate: 'weight',
      groupVariable: 'treatment',
    })
    expect(restored.suggestedSettings).toEqual({
      alternative: 'greater',
      postHoc: 'games-howell',
    })
  })

  it('tracks explicit re-selection of a managed default value', () => {
    act(() => {
      useAnalysisStore.getState().setAnalysisOptions({
        alternative: 'two-sided',
      })
    })

    act(() => {
      useAnalysisStore.getState().setAnalysisOptions({
        alternative: 'two-sided',
      })
    })

    expect(
      useAnalysisStore.getState().analysisOptions.methodSettings?.__managedAnalysisOptionOverrides
    ).toBe('alternative')
  })

  it('tracks explicit method setting overrides after default materialization', () => {
    act(() => {
      useAnalysisStore.getState().setAnalysisOptions({
        methodSettings: {
          equalVar: 'false',
        },
      })
    })

    act(() => {
      useAnalysisStore.getState().setAnalysisOptions({
        methodSettings: {
          equalVar: 'false',
        },
      })
    })

    expect(
      useAnalysisStore.getState().analysisOptions.methodSettings?.__explicitMethodSettingKeys
    ).toBe('equalVar')
  })
})
