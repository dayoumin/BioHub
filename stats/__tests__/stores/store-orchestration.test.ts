/**
 * store-orchestration 단위 테스트
 *
 * buildHistorySnapshot / startFreshAnalysisSession / loadAndRestoreHistory
 * 3개 cross-store 헬퍼의 조합 동작 검증.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { act } from '@testing-library/react'
import { useAnalysisStore } from '@/lib/stores/analysis-store'
import { useModeStore } from '@/lib/stores/mode-store'
import { useHistoryStore } from '@/lib/stores/history-store'
import {
  buildHistorySnapshot,
  startFreshAnalysisSession,
  loadAndRestoreHistory,
} from '@/lib/stores/store-orchestration'
import type { AnalysisResult } from '@/types/analysis'

function makeMinimalResult(overrides: Partial<AnalysisResult> = {}): AnalysisResult {
  return {
    method: 't-test',
    statistic: 2.3,
    pValue: 0.03,
    interpretation: '유의한 차이가 있습니다.',
    ...overrides,
  }
}

describe('store-orchestration', () => {
  beforeEach(() => {
    act(() => {
      useAnalysisStore.getState().reset()
      useModeStore.getState().resetMode()
    })
  })

  // ===== buildHistorySnapshot =====

  describe('buildHistorySnapshot()', () => {
    it('기본 상태에서 snapshot을 조립한다', () => {
      const snapshot = buildHistorySnapshot()

      expect(snapshot.results).toBeNull()
      expect(snapshot.analysisPurpose).toBe('')
      expect(snapshot.selectedMethod).toBeNull()
      expect(snapshot.uploadedFileName).toBeNull()
      expect(snapshot.uploadedDataLength).toBe(0)
      expect(snapshot.variableMapping).toBeNull()
      expect(snapshot.lastAiRecommendation).toBeNull()
    })

    it('analysis-store + mode-store 상태를 올바르게 조합한다', () => {
      act(() => {
        useAnalysisStore.getState().setResults(makeMinimalResult())
        useAnalysisStore.getState().setAnalysisPurpose('그룹 비교')
        useAnalysisStore.getState().setSelectedMethod({
          id: 't-test',
          name: 'Independent t-Test',
          description: '두 독립 그룹의 평균 비교',
          category: 't-test',
        })
        useAnalysisStore.getState().setUploadedFile(new File(['data'], 'test.csv'))
        useModeStore.getState().setLastAiRecommendation({
          userQuery: '평균 비교',
          confidence: 0.9,
          reasoning: ['수치형'],
          provider: 'openrouter',
          alternatives: [],
        })
      })

      const snapshot = buildHistorySnapshot()

      expect(snapshot.results).not.toBeNull()
      expect(snapshot.analysisPurpose).toBe('그룹 비교')
      expect(snapshot.selectedMethod?.id).toBe('t-test')
      expect(snapshot.uploadedFileName).toBe('test.csv')
      expect(snapshot.lastAiRecommendation?.confidence).toBe(0.9)
    })

    it('uploadedData가 null이면 uploadedDataLength는 0이다', () => {
      const snapshot = buildHistorySnapshot()
      expect(snapshot.uploadedDataLength).toBe(0)
    })
  })

  // ===== startFreshAnalysisSession =====

  describe('startFreshAnalysisSession()', () => {
    it('분석 상태를 초기화한다', () => {
      act(() => {
        useAnalysisStore.getState().setResults(makeMinimalResult())
        useAnalysisStore.getState().setAnalysisPurpose('test')
      })

      expect(useAnalysisStore.getState().results).not.toBeNull()

      act(() => { startFreshAnalysisSession() })

      expect(useAnalysisStore.getState().results).toBeNull()
      expect(useAnalysisStore.getState().analysisPurpose).toBe('')
    })

    it('mode-store도 리셋된다', () => {
      act(() => {
        useModeStore.getState().setStepTrack('quick')
        useModeStore.getState().setUserQuery('테스트 질문')
      })

      act(() => { startFreshAnalysisSession() })

      // resetSession → resetMode 호출 확인
      expect(useModeStore.getState().stepTrack).toBe('normal')
    })
  })

  // ===== loadAndRestoreHistory =====

  describe('loadAndRestoreHistory()', () => {
    it('존재하지 않는 historyId에 대해 null을 반환한다', async () => {
      const result = await loadAndRestoreHistory('non-existent-id')
      expect(result).toBeNull()
    })

    it('히스토리 로드 후 mode를 정규화한다', async () => {
      // mode를 변경해 놓고
      act(() => {
        useModeStore.getState().setStepTrack('quick')
        useModeStore.getState().setLastAiRecommendation({
          userQuery: 'test',
          confidence: 0.8,
          reasoning: [],
          provider: 'openrouter',
          alternatives: [],
        })
      })

      // loadFromHistory를 mock
      const mockResult = {
        analysisPurpose: '히스토리 분석',
        selectedMethod: { id: 't-test', name: 't-검정', description: '두 독립 그룹의 평균 비교', category: 't-test' as const },
        variableMapping: null,
        analysisOptions: { alpha: 0.05, showAssumptions: true, showEffectSize: true },
        results: makeMinimalResult(),
        uploadedFileName: 'data.csv',
        currentStep: 4,
        completedSteps: [1, 2, 3, 4],
        loadedAiInterpretation: null,
        loadedInterpretationChat: null,
      }

      vi.spyOn(useHistoryStore.getState(), 'loadFromHistory').mockResolvedValueOnce(mockResult)

      const result = await loadAndRestoreHistory('test-id')

      expect(result).not.toBeNull()
      // mode 정규화 확인
      expect(useModeStore.getState().stepTrack).toBe('normal')
      expect(useModeStore.getState().lastAiRecommendation).toBeNull()
    })

    it('loadFromHistory가 null이면 restoreFromHistory를 호출하지 않는다', async () => {
      const restoreSpy = vi.spyOn(useAnalysisStore.getState(), 'restoreFromHistory')
      vi.spyOn(useHistoryStore.getState(), 'loadFromHistory').mockResolvedValueOnce(null)

      await loadAndRestoreHistory('missing-id')

      expect(restoreSpy).not.toHaveBeenCalled()
    })
  })
})
