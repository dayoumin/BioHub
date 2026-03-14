/**
 * Cross-store 오케스트레이션 헬퍼
 *
 * 여러 store를 조합하는 패턴의 중복을 제거.
 * 순환 의존 방지를 위해 별도 모듈로 분리.
 */

import { useAnalysisStore } from './analysis-store'
import { useModeStore } from './mode-store'
import { useHistoryStore } from './history-store'
import type { HistorySnapshot, HistoryLoadResult } from './history-store'

/** analysis-store + mode-store에서 HistorySnapshot을 조립 */
export function buildHistorySnapshot(): HistorySnapshot {
  const state = useAnalysisStore.getState()
  const modeState = useModeStore.getState()
  return {
    results: state.results,
    analysisPurpose: state.analysisPurpose,
    selectedMethod: state.selectedMethod,
    uploadedFileName: state.uploadedFileName ?? null,
    uploadedDataLength: state.uploadedData?.length ?? 0,
    variableMapping: state.variableMapping,
    lastAiRecommendation: modeState.lastAiRecommendation,
  }
}

/** 히스토리 로드 → analysis-store 복원 → mode 리셋 (3-step 패턴 통합) */
export async function loadAndRestoreHistory(historyId: string): Promise<HistoryLoadResult | null> {
  const result = await useHistoryStore.getState().loadFromHistory(historyId)
  if (result) {
    useAnalysisStore.getState().restoreFromHistory(result)
    useModeStore.getState().setLastAiRecommendation(null)
  }
  return result
}
