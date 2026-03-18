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
import { useHubChatStore } from '@/lib/stores/hub-chat-store'
import { useGraphStudioStore } from '@/lib/stores/graph-studio-store'
import {
  buildHistorySnapshot,
  startFreshAnalysisSession,
  loadAndRestoreHistory,
  bridgeHubDataToGraphStudio,
} from '@/lib/stores/store-orchestration'
import type { AnalysisResult, ValidationResults, ColumnStatistics } from '@/types/analysis'

// ===== 공통 픽스처 =====

function makeColStat(overrides: Partial<ColumnStatistics> = {}): ColumnStatistics {
  return {
    name: 'weight',
    type: 'numeric',
    numericCount: 50,
    textCount: 0,
    missingCount: 0,
    uniqueValues: 40,
    ...overrides,
  }
}

function makeValidation(cols: ColumnStatistics[]): ValidationResults {
  return {
    isValid: true,
    totalRows: 50,
    columnCount: cols.length,
    missingValues: 0,
    dataType: 'tabular',
    variables: cols.map((c) => c.name),
    errors: [],
    warnings: [],
    columnStats: cols,
    columns: cols,
  }
}

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
      useHubChatStore.getState().clearAll()
      useGraphStudioStore.getState().resetAll()
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
        useModeStore.getState().setLastAiRecommendation({
          userQuery: 'test', confidence: 0.8, reasoning: [], provider: 'openrouter', alternatives: [],
        })
      })

      act(() => { startFreshAnalysisSession() })

      // resetSession() → useModeStore.resetMode() 연쇄 호출 확인
      expect(useModeStore.getState().stepTrack).toBe('normal')
      expect(useModeStore.getState().userQuery).toBeNull()
      expect(useModeStore.getState().lastAiRecommendation).toBeNull()
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

  // ===== bridgeHubDataToGraphStudio =====

  describe('bridgeHubDataToGraphStudio()', () => {
    /** 허브 데이터가 있는 상태를 세팅하는 헬퍼 */
    function setupHubData(cols: ColumnStatistics[], rows: Record<string, unknown>[]) {
      act(() => {
        useAnalysisStore.getState().setUploadedData(rows as never)
        useHubChatStore.getState().setDataContext({
          fileName: 'test.csv',
          totalRows: rows.length,
          columnCount: cols.length,
          numericColumns: cols.filter((c) => c.type === 'numeric').map((c) => c.name),
          categoricalColumns: cols.filter((c) => c.type === 'categorical').map((c) => c.name),
          validationResults: makeValidation(cols),
        })
      })
    }

    it('dataContext가 없으면 false를 반환하고 graph-studio-store는 빈 상태다', () => {
      // dataContext 없음 (uploadedData도 없음)
      const result = bridgeHubDataToGraphStudio()

      expect(result).toBe(false)
      expect(useGraphStudioStore.getState().isDataLoaded).toBe(false)
    })

    it('uploadedData가 비어 있으면 false를 반환한다', () => {
      act(() => {
        useHubChatStore.getState().setDataContext({
          fileName: 'empty.csv',
          totalRows: 0,
          columnCount: 0,
          numericColumns: [],
          categoricalColumns: [],
          validationResults: makeValidation([]),
        })
        // uploadedData는 null 상태 유지
      })

      const result = bridgeHubDataToGraphStudio()

      expect(result).toBe(false)
    })

    it('데이터가 있으면 true를 반환하고 graph-studio-store에 DataPackage가 로드된다', () => {
      const cols = [
        makeColStat({ name: 'weight', type: 'numeric' }),
        makeColStat({ name: 'group', type: 'categorical', numericCount: 0, textCount: 50 }),
      ]
      const rows = [
        { weight: 72, group: 'A' },
        { weight: 68, group: 'B' },
      ]
      setupHubData(cols, rows)

      const result = bridgeHubDataToGraphStudio()

      expect(result).toBe(true)
      const { dataPackage, isDataLoaded } = useGraphStudioStore.getState()
      expect(isDataLoaded).toBe(true)
      expect(dataPackage).not.toBeNull()
      expect(dataPackage?.label).toBe('test.csv')
      expect(dataPackage?.source).toBe('upload')
    })

    it('numeric 컬럼은 quantitative, categorical은 nominal로 매핑된다', () => {
      const cols = [
        makeColStat({ name: 'score', type: 'numeric' }),
        makeColStat({ name: 'category', type: 'categorical', numericCount: 0, textCount: 50 }),
        makeColStat({ name: 'mixed_col', type: 'mixed', numericCount: 25, textCount: 25 }),
      ]
      const rows = [{ score: 1, category: 'X', mixed_col: 'A' }]
      setupHubData(cols, rows)

      bridgeHubDataToGraphStudio()

      const { dataPackage } = useGraphStudioStore.getState()
      const colMap = Object.fromEntries(dataPackage!.columns.map((c) => [c.name, c.type]))

      // 핵심 검증: DataValidationService 타입 → ColumnMeta 타입 매핑
      expect(colMap['score']).toBe('quantitative')
      expect(colMap['category']).toBe('nominal')
      expect(colMap['mixed_col']).toBe('nominal')    // mixed → nominal (numeric 아님)
    })

    it('data 배열에 각 컬럼의 값 배열이 올바르게 채워진다', () => {
      const cols = [
        makeColStat({ name: 'weight', type: 'numeric' }),
        makeColStat({ name: 'group', type: 'categorical', numericCount: 0, textCount: 50 }),
      ]
      const rows = [
        { weight: 70, group: 'A' },
        { weight: 65, group: 'B' },
        { weight: 80, group: 'A' },
      ]
      setupHubData(cols, rows)

      bridgeHubDataToGraphStudio()

      const { dataPackage } = useGraphStudioStore.getState()
      expect(dataPackage?.data['weight']).toEqual([70, 65, 80])
      expect(dataPackage?.data['group']).toEqual(['A', 'B', 'A'])
    })

    it('bridgeHubDataToGraphStudio()는 내부적으로 disconnectProject()를 호출하지만 데이터는 보존된다', () => {
      // bridgeHubDataToGraphStudio()는 loadDataOnly() 후 disconnectProject()를 호출함.
      // disconnectProject는 currentProject만 null로 설정 — data/isDataLoaded 영향 없음.
      const cols = [makeColStat({ name: 'x', type: 'numeric' })]
      setupHubData(cols, [{ x: 1 }, { x: 2 }])

      bridgeHubDataToGraphStudio()

      const state = useGraphStudioStore.getState()
      expect(state.isDataLoaded).toBe(true)
      expect(state.dataPackage).not.toBeNull()
      expect(state.currentProject).toBeNull()    // disconnectProject() 내부 호출 확인
    })

    it('columnStats가 없으면 inferColumnMeta fallback으로 동작한다', () => {
      // columnStats가 없는 validationResults
      const rows = [{ val: 1 }, { val: 2 }]
      act(() => {
        useAnalysisStore.getState().setUploadedData(rows as never)
        useHubChatStore.getState().setDataContext({
          fileName: 'no-stats.csv',
          totalRows: 2,
          columnCount: 1,
          numericColumns: ['val'],
          categoricalColumns: [],
          validationResults: {
            isValid: true, totalRows: 2, columnCount: 1, missingValues: 0,
            dataType: 'tabular', variables: ['val'], errors: [], warnings: [],
            // columnStats 의도적으로 생략
          },
        })
      })

      const result = bridgeHubDataToGraphStudio()

      expect(result).toBe(true)
      const { dataPackage } = useGraphStudioStore.getState()
      expect(dataPackage?.columns).toHaveLength(1)
      expect(dataPackage?.columns[0].name).toBe('val')
      // inferColumnMeta가 숫자 값에서 quantitative으로 추론하는지 검증
      expect(dataPackage?.columns[0].type).toBe('quantitative')
    })
  })
})
