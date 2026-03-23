/**
 * Cross-store 오케스트레이션 헬퍼
 *
 * 여러 store를 조합하는 패턴의 중복을 제거.
 * 순환 의존 방지를 위해 별도 모듈로 분리.
 */

import { useAnalysisStore } from './analysis-store'
import { useModeStore } from './mode-store'
import { useHistoryStore } from './history-store'
import { useHubChatStore } from './hub-chat-store'
import { useGraphStudioStore } from './graph-studio-store'
import { inferColumnMeta } from '@/lib/graph-studio/chart-spec-utils'
import type { HistorySnapshot, HistoryLoadResult } from './history-store'
import type { DataPackage, ColumnMeta } from '@/types/graph-studio'

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
    analysisOptions: state.analysisOptions,
    lastAiRecommendation: modeState.lastAiRecommendation,
  }
}

/** 새 분석 시작 전 세션 상태를 초기화 (히스토리는 유지) */
export function startFreshAnalysisSession(): void {
  useAnalysisStore.getState().resetSession()
  // 데이터 컨텍스트만 클리어 — 대화 히스토리는 세션 내에 유지
  useHubChatStore.getState().setDataContext(null)
}

/**
 * 허브 업로드 데이터 → Graph Studio DataPackage 브리지
 *
 * ResultsActionStep의 브리지 패턴과 동일하게, hub-chat-store + analysis-store의 데이터를
 * graph-studio-store에 loadDataOnly()로 등록한 뒤 라우팅.
 *
 * @returns 데이터가 있어 브리지 성공 시 true, 데이터 없어 빈 상태로 이동 시 false
 */
export function bridgeHubDataToGraphStudio(): boolean {
  const dataContext = useHubChatStore.getState().dataContext
  const uploadedData = useAnalysisStore.getState().uploadedData
  if (!dataContext || !uploadedData?.length) return false

  const rows = uploadedData as Record<string, unknown>[]

  // validationResults.columnStats가 있으면 이미 계산된 타입 정보를 재사용해
  // DataValidationService와 일관성을 유지한다. 없으면 raw data에서 재추론(fallback).
  const colStats = dataContext.validationResults.columnStats ?? dataContext.validationResults.columns
  const columns: ColumnMeta[] = colStats?.length
    ? colStats.map((col) => ({
        name: col.name,
        type: col.type === 'numeric' ? 'quantitative' as const : 'nominal' as const,
        uniqueCount: col.uniqueValues,
        sampleValues: [] as string[],  // populated below in single pass
        hasNull: col.missingCount > 0,
      }))
    : inferColumnMeta(rows)

  // Single-pass: build column arrays + sample values simultaneously
  const data: Record<string, unknown[]> = {}
  const sampleSets = new Map<string, Set<string>>()
  for (const col of columns) {
    data[col.name] = []
    sampleSets.set(col.name, new Set())
  }
  for (const row of rows) {
    for (const col of columns) {
      const v = row[col.name]
      ;(data[col.name] as unknown[]).push(v)
      const samples = sampleSets.get(col.name)
      if (v !== null && v !== undefined && v !== '' && samples && samples.size < 5) {
        samples.add(String(v))
      }
    }
  }
  // Backfill sampleValues for colStats-derived columns
  if (colStats?.length) {
    for (const col of columns) {
      col.sampleValues = Array.from(sampleSets.get(col.name) ?? [])
    }
  }

  const pkg: DataPackage = {
    id: `hub_${Date.now()}`,
    source: 'upload',
    label: dataContext.fileName,
    columns,
    data,
    createdAt: new Date().toISOString(),
  }

  useGraphStudioStore.getState().loadDataOnly(pkg)
  useGraphStudioStore.getState().disconnectProject()
  return true
}

/** 히스토리 로드 → analysis-store 복원 → mode 정규화 (3-step 패턴 통합) */
export async function loadAndRestoreHistory(historyId: string): Promise<HistoryLoadResult | null> {
  const result = await useHistoryStore.getState().loadFromHistory(historyId)
  if (result) {
    useAnalysisStore.getState().restoreFromHistory(result)
    // 모드 플래그 전부 정규화 — 히스토리 열람은 "결과 보기"이므로 모든 모드 해제
    const modeStore = useModeStore.getState()
    modeStore.setLastAiRecommendation(null)
    modeStore.setStepTrack('normal')
  }
  return result
}
