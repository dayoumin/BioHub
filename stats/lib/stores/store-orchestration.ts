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
import { extractDetectedVariables } from '@/lib/services/variable-detection-service'
import { toStatisticalAssumptions } from '@/lib/services/diagnostic-pipeline'
import type { HistorySnapshot, HistoryLoadResult } from './history-store'
import type { DataPackage, ColumnMeta } from '@/types/graph-studio'
import type { AIRecommendation, DiagnosticReport } from '@/types/analysis'
import type { AiRecommendationContext } from '@/lib/utils/storage-types'

/** AIRecommendation → 히스토리 저장용 AiRecommendationContext 변환 */
function buildAiRecContext(rec: AIRecommendation | null): AiRecommendationContext | null {
  if (!rec?.method) return null
  return {
    userQuery: rec.reasoning?.[0] ?? '',
    confidence: rec.confidence ?? 0.8,
    reasoning: rec.reasoning ?? [],
    warnings: rec.warnings,
    alternatives: rec.alternatives?.map(a => ({ id: a.id, name: a.name, description: a.description ?? '' })),
    provider: 'openrouter' as const,
  }
}

/** analysis-store + mode-store + hub-chat에서 HistorySnapshot을 조립 */
export function buildHistorySnapshot(): HistorySnapshot {
  const state = useAnalysisStore.getState()
  const modeState = useModeStore.getState()

  // analysisPurpose 결정: 명시적 설정 > AI 추천 reasoning > 메서드명
  let purpose = state.analysisPurpose
  if (!purpose) {
    const recCtx = buildAiRecContext(state.cachedAiRecommendation)
    if (recCtx?.reasoning?.length) {
      purpose = recCtx.reasoning.join('. ')
    } else if (state.selectedMethod) {
      purpose = state.selectedMethod.name
    }
  }

  return {
    results: state.results,
    analysisPurpose: purpose,
    selectedMethod: state.selectedMethod,
    uploadedFileName: state.uploadedFileName ?? null,
    uploadedDataLength: state.uploadedData?.length ?? 0,
    variableMapping: state.variableMapping,
    analysisOptions: state.analysisOptions,
    lastAiRecommendation: modeState.lastAiRecommendation ?? buildAiRecContext(state.cachedAiRecommendation),
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

/**
 * Hub Diagnostic Pipeline 결과를 SmartFlow 스토어에 브리지.
 *
 * 초기화 순서: 스냅샷 → reset → 복원 (resetSession이 모든 상태를 지우므로).
 */
export function bridgeDiagnosticToSmartFlow(
  report: DiagnosticReport,
  recommendation: AIRecommendation,
): void {
  // ── 0. Hub 데이터 스냅샷 (초기화 전에 캡처) ──
  const hubData = useHubChatStore.getState().dataContext
  const rawData = useAnalysisStore.getState().uploadedData
  const rawFile = useAnalysisStore.getState().uploadedFile

  // ── 1. 세션 초기화 ──
  startFreshAnalysisSession()

  const analysisStore = useAnalysisStore.getState()
  const modeStore = useModeStore.getState()

  // ── 2. 데이터 복원 ──
  if (rawData) analysisStore.setUploadedData(rawData)
  if (rawFile) analysisStore.setUploadedFile(rawFile)
  if (hubData) {
    analysisStore.setUploadedFileName(hubData.fileName)
    analysisStore.setValidationResults(hubData.validationResults)
    useHubChatStore.getState().setDataContext(hubData)
  }

  // ── 3. 메서드 설정 + 추천 컨텍스트 보존 ──
  if (recommendation.method) {
    analysisStore.setSelectedMethod(recommendation.method)
  }
  analysisStore.setCachedAiRecommendation(recommendation)

  // ── 4. 변수 탐지 결과 → detectedVariables (Step 3 프리필) ──
  if (report.variableAssignments && recommendation.method) {
    const detected = extractDetectedVariables(
      recommendation.method.id,
      hubData?.validationResults ?? null,
      { ...recommendation, variableAssignments: report.variableAssignments },
    )
    analysisStore.setDetectedVariables(detected)
  }

  // ── 5. 설정 전달 ──
  if (recommendation.suggestedSettings) {
    analysisStore.setSuggestedSettings(recommendation.suggestedSettings)
  }

  // ── 6. 진단 리포트 + 가정 검정 보존 ──
  analysisStore.setDiagnosticReport(report)
  if (report.assumptions) {
    analysisStore.setAssumptionResults(toStatisticalAssumptions(report.assumptions))
  }

  // ── 7. 트랙 설정 ──
  modeStore.setStepTrack('diagnostic')
  modeStore.setShowHub(false)
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
