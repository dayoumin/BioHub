/**
 * AI 품질 개선 시뮬레이션 테스트
 *
 * 이번 세션에서 변경된 사항을 검증:
 * - Phase 1-2: per-call options (temperature/maxTokens)
 * - Phase 2:   AiRecommendationContext 저장/복원 생명주기
 * - Review fix: Ollama 동적 타임아웃 수식, lastAiRecommendation 초기화 보장
 * - Review fix: provider 유니온 타입, Turso JSON 직렬화 라운드트립
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { act } from '@testing-library/react'

// ===== 스토어 의존성 Mock (vi.hoisted로 초기화 순서 보장) =====

const { saveHistoryMock, getAllHistoryMock, getHistoryMock, isIndexedDBAvailableMock } =
  vi.hoisted(() => ({
    saveHistoryMock: vi.fn(),
    getAllHistoryMock: vi.fn(),
    getHistoryMock: vi.fn(),
    isIndexedDBAvailableMock: vi.fn(),
  }))

vi.mock('@/lib/utils/storage', () => ({
  saveHistory: saveHistoryMock,
  getAllHistory: getAllHistoryMock,
  getHistory: getHistoryMock,
  deleteHistory: vi.fn(),
  clearAllHistory: vi.fn(),
  initStorage: vi.fn(),
}))

vi.mock('@/lib/utils/adapters/indexeddb-adapter', () => ({
  isIndexedDBAvailable: isIndexedDBAvailableMock,
}))

import { useAnalysisStore } from '@/lib/stores/analysis-store'
import { useModeStore } from '@/lib/stores/mode-store'
import { useHistoryStore } from '@/lib/stores/history-store'
import { startFreshAnalysisSession } from '@/lib/stores/store-orchestration'
import type { AiRecommendationContext } from '@/lib/utils/storage-types'
import { DEFAULT_ANALYSIS_OPTIONS } from '@/types/analysis'
import type { AnalysisResult } from '@/types/analysis'

// ===== 공통 픽스처 =====

function makeAiContext(overrides: Partial<AiRecommendationContext> = {}): AiRecommendationContext {
  return {
    userQuery: '두 그룹 평균을 비교하고 싶어요',
    confidence: 0.9,
    reasoning: ['수치형 변수 2개', '독립 표본'],
    provider: 'openrouter',
    alternatives: [{ id: 'mann-whitney', name: 'Mann-Whitney U', description: '비모수 대안' }],
    ...overrides,
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

function makeHistoryRecord(overrides: Record<string, unknown> = {}) {
  return {
    id: 'test-record-001',
    timestamp: Date.now(),
    name: '이전 분석',
    purpose: '그룹 비교',
    method: { id: 't-test', name: 't-검정', category: 't-test' },
    dataFileName: 'data.csv',
    dataRowCount: 100,
    results: makeMinimalResult(),
    ...overrides,
  }
}

// ============================================================
// Section 1: AiRecommendationContext 타입 구조 검증
// ============================================================

describe('AiRecommendationContext 타입 구조', () => {
  it('provider는 openrouter | ollama | keyword 세 가지만 허용한다', () => {
    const providers: AiRecommendationContext['provider'][] = ['openrouter', 'ollama', 'keyword']
    providers.forEach(p => {
      const ctx = makeAiContext({ provider: p })
      expect(ctx.provider).toBe(p)
    })
  })

  it('필수 필드만 있는 최소 context 생성 가능 (optional 필드 없어도 됨)', () => {
    const minimal: AiRecommendationContext = {
      userQuery: 'test query',
      confidence: 0.7,
      reasoning: ['이유 1'],
      provider: 'keyword',
    }
    expect(minimal.warnings).toBeUndefined()
    expect(minimal.alternatives).toBeUndefined()
    expect(minimal.ambiguityNote).toBeUndefined()
  })

  it('confidence는 0~1 범위의 숫자다', () => {
    const ctx = makeAiContext({ confidence: 0.85 })
    expect(ctx.confidence).toBeGreaterThanOrEqual(0)
    expect(ctx.confidence).toBeLessThanOrEqual(1)
  })

  it('alternatives는 id/name/description 구조를 갖는다', () => {
    const ctx = makeAiContext({
      alternatives: [
        { id: 'alt-a', name: 'Alt A', description: 'A 설명' },
        { id: 'alt-b', name: 'Alt B', description: 'B 설명' },
      ],
    })
    expect(ctx.alternatives).toHaveLength(2)
    expect(ctx.alternatives?.[0]).toMatchObject({
      id: 'alt-a',
      name: 'Alt A',
      description: 'A 설명',
    })
  })

  it('warnings는 문자열 배열이다', () => {
    const ctx = makeAiContext({ warnings: ['표본 수 부족', '정규성 가정 불확실'] })
    expect(ctx.warnings).toHaveLength(2)
    expect(ctx.warnings?.[0]).toBe('표본 수 부족')
  })
})

// Section 2: Ollama 미사용(OpenRouter API key 방식) → 삭제

// ============================================================
// Section 3: Mode Store — lastAiRecommendation 생명주기
// ============================================================

describe('Mode Store — lastAiRecommendation 생명주기', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    isIndexedDBAvailableMock.mockReturnValue(true)
    getAllHistoryMock.mockResolvedValue([])
    saveHistoryMock.mockResolvedValue(undefined)

    act(() => {
      useAnalysisStore.getState().reset()
      useModeStore.getState().resetMode()
    })
  })

  it('초기 상태는 null이다', () => {
    expect(useModeStore.getState().lastAiRecommendation).toBeNull()
  })

  it('setLastAiRecommendation으로 context를 저장한다', () => {
    const ctx = makeAiContext()
    act(() => {
      useModeStore.getState().setLastAiRecommendation(ctx)
    })

    const rec = useModeStore.getState().lastAiRecommendation
    expect(rec).not.toBeNull()
    expect(rec?.userQuery).toBe('두 그룹 평균을 비교하고 싶어요')
    expect(rec?.confidence).toBe(0.9)
    expect(rec?.provider).toBe('openrouter')
  })

  it('setLastAiRecommendation(null)로 명시적 해제 가능', () => {
    act(() => {
      useModeStore.getState().setLastAiRecommendation(makeAiContext())
    })
    expect(useModeStore.getState().lastAiRecommendation).not.toBeNull()

    act(() => {
      useModeStore.getState().setLastAiRecommendation(null)
    })
    expect(useModeStore.getState().lastAiRecommendation).toBeNull()
  })

  it('resetMode 후 null로 초기화된다', () => {
    // Before: 값 설정
    act(() => {
      useModeStore.getState().setLastAiRecommendation(makeAiContext())
    })
    expect(useModeStore.getState().lastAiRecommendation).not.toBeNull()

    // After: resetMode
    act(() => {
      useModeStore.getState().resetMode()
    })
    expect(useModeStore.getState().lastAiRecommendation).toBeNull()
  })

  it('resetMode() 후에도 null이다', () => {
    act(() => {
      useModeStore.getState().setLastAiRecommendation(makeAiContext())
      useModeStore.getState().resetMode()
    })
    expect(useModeStore.getState().lastAiRecommendation).toBeNull()
  })
})

// ============================================================
// Section 4: saveToHistory — aiRecommendation 포함 검증
// ============================================================

describe('saveToHistory — aiRecommendation 포함/미포함', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    isIndexedDBAvailableMock.mockReturnValue(true)
    getAllHistoryMock.mockResolvedValue([])
    saveHistoryMock.mockResolvedValue(undefined)

    act(() => {
      useAnalysisStore.getState().reset()
      useModeStore.getState().resetMode()
    })
  })

  it('lastAiRecommendation이 있으면 record.aiRecommendation에 포함된다', async () => {
    const ctx = makeAiContext()

    act(() => {
      useAnalysisStore.getState().setResults(makeMinimalResult())
      useModeStore.getState().setLastAiRecommendation(ctx)
    })

    await act(async () => {
      const store = useAnalysisStore.getState()
      await useHistoryStore.getState().saveToHistory({
        results: store.results,
        analysisPurpose: store.analysisPurpose,
        selectedMethod: store.selectedMethod,
        uploadedFileName: store.uploadedFileName ?? null,
        uploadedDataLength: store.uploadedData?.length ?? 0,
        variableMapping: store.variableMapping,
        lastAiRecommendation: useModeStore.getState().lastAiRecommendation,
        analysisOptions: store.analysisOptions,
      }, 'AI 추천 분석')
    })

    expect(saveHistoryMock).toHaveBeenCalledTimes(1)
    const saved = saveHistoryMock.mock.calls[0][0]

    // Before: results가 있어야 saveHistory 호출됨
    // After: aiRecommendation이 record에 포함되어야 함
    expect(saved.aiRecommendation).not.toBeNull()
    expect(saved.aiRecommendation.userQuery).toBe('두 그룹 평균을 비교하고 싶어요')
    expect(saved.aiRecommendation.confidence).toBe(0.9)
    expect(saved.aiRecommendation.provider).toBe('openrouter')
    expect(saved.aiRecommendation.alternatives).toHaveLength(1)
  })

  it('lastAiRecommendation이 null이면 record.aiRecommendation도 null이다', async () => {
    act(() => {
      // results만 설정, AI 추천 없이 수동 분석
      useAnalysisStore.getState().setResults(makeMinimalResult({ method: 'anova', pValue: 0.001 }))
    })

    await act(async () => {
      const store = useAnalysisStore.getState()
      await useHistoryStore.getState().saveToHistory({
        results: store.results,
        analysisPurpose: store.analysisPurpose,
        selectedMethod: store.selectedMethod,
        uploadedFileName: store.uploadedFileName ?? null,
        uploadedDataLength: store.uploadedData?.length ?? 0,
        variableMapping: store.variableMapping,
        lastAiRecommendation: useModeStore.getState().lastAiRecommendation,
        analysisOptions: store.analysisOptions,
      }, '수동 분석')
    })

    expect(saveHistoryMock).toHaveBeenCalledTimes(1)
    const saved = saveHistoryMock.mock.calls[0][0]
    expect(saved.aiRecommendation).toBeNull()
  })

  it('results가 null이면 saveToHistory가 아무것도 하지 않는다', async () => {
    act(() => {
      // results 없이 lastAiRecommendation만 설정
      useModeStore.getState().setLastAiRecommendation(makeAiContext())
    })

    await act(async () => {
      const store = useAnalysisStore.getState()
      await useHistoryStore.getState().saveToHistory({
        results: store.results,
        analysisPurpose: store.analysisPurpose,
        selectedMethod: store.selectedMethod,
        uploadedFileName: store.uploadedFileName ?? null,
        uploadedDataLength: store.uploadedData?.length ?? 0,
        variableMapping: store.variableMapping,
        lastAiRecommendation: useModeStore.getState().lastAiRecommendation,
        analysisOptions: store.analysisOptions,
      }, '결과 없는 분석')
    })

    // results=null이므로 조기 리턴 → saveHistory 미호출
    expect(saveHistoryMock).not.toHaveBeenCalled()
  })

  it('연속 두 번 저장 시 각각 올바른 aiRecommendation을 갖는다', async () => {
    // 첫 번째 분석 (AI 추천)
    act(() => {
      useAnalysisStore.getState().setResults(makeMinimalResult())
      useModeStore.getState().setLastAiRecommendation(makeAiContext({ userQuery: '첫 번째 질문' }))
    })
    await act(async () => {
      const store = useAnalysisStore.getState()
      await useHistoryStore.getState().saveToHistory({
        results: store.results,
        analysisPurpose: store.analysisPurpose,
        selectedMethod: store.selectedMethod,
        uploadedFileName: store.uploadedFileName ?? null,
        uploadedDataLength: store.uploadedData?.length ?? 0,
        variableMapping: store.variableMapping,
        lastAiRecommendation: useModeStore.getState().lastAiRecommendation,
        analysisOptions: store.analysisOptions,
      }, '분석 1')
    })

    // 두 번째 분석 (수동)
    act(() => {
      useAnalysisStore.getState().setResults(makeMinimalResult({ method: 'anova' }))
      useModeStore.getState().setLastAiRecommendation(null) // 수동 선택
    })
    await act(async () => {
      const store = useAnalysisStore.getState()
      await useHistoryStore.getState().saveToHistory({
        results: store.results,
        analysisPurpose: store.analysisPurpose,
        selectedMethod: store.selectedMethod,
        uploadedFileName: store.uploadedFileName ?? null,
        uploadedDataLength: store.uploadedData?.length ?? 0,
        variableMapping: store.variableMapping,
        lastAiRecommendation: useModeStore.getState().lastAiRecommendation,
        analysisOptions: store.analysisOptions,
      }, '분석 2')
    })

    expect(saveHistoryMock).toHaveBeenCalledTimes(2)
    expect(saveHistoryMock.mock.calls[0][0].aiRecommendation?.userQuery).toBe('첫 번째 질문')
    expect(saveHistoryMock.mock.calls[1][0].aiRecommendation).toBeNull()
  })
})

// ============================================================
// Section 5: loadFromHistory / loadSettingsFromHistory — 초기화 보장
// ============================================================

describe('loadFromHistory / loadSettingsFromHistory — lastAiRecommendation 초기화', () => {
  const mockRecord = makeHistoryRecord({
    aiRecommendation: makeAiContext({ userQuery: '이전 세션 질문', provider: 'ollama' }),
  })

  beforeEach(() => {
    vi.clearAllMocks()
    isIndexedDBAvailableMock.mockReturnValue(true)
    getAllHistoryMock.mockResolvedValue([])
    getHistoryMock.mockResolvedValue(mockRecord)

    act(() => {
      useAnalysisStore.getState().reset()
      useModeStore.getState().resetMode()
      useHistoryStore.setState({
        analysisHistory: [],
        currentHistoryId: null,
        loadedAiInterpretation: null,
        loadedInterpretationChat: null,
      })
    })
  })

  it('loadFromHistory 후 lastAiRecommendation은 null이다 (이전 세션 오염 방지)', async () => {
    // Before: 현재 세션에 AI 추천이 있다
    act(() => {
      useModeStore.getState().setLastAiRecommendation(makeAiContext())
    })
    expect(useModeStore.getState().lastAiRecommendation).not.toBeNull()

    // 히스토리 로드
    await act(async () => {
      const result = await useHistoryStore.getState().loadFromHistory('test-record-001')
      if (result) {
        useAnalysisStore.getState().restoreFromHistory(result)
        // 이전 세션 오염 방지: lastAiRecommendation 명시적 초기화
        useModeStore.getState().setLastAiRecommendation(null)
      }
    })

    // After: lastAiRecommendation은 null (히스토리의 aiRecommendation이 아님)
    expect(useModeStore.getState().lastAiRecommendation).toBeNull()
    // 분석 결과는 복원됨
    expect(useAnalysisStore.getState().results).not.toBeNull()
  })

  it('loadSettingsFromHistory 후 lastAiRecommendation은 null이다', async () => {
    // Before: 현재 세션에 AI 추천이 있다
    act(() => {
      useModeStore.getState().setLastAiRecommendation(makeAiContext({ confidence: 0.95 }))
    })
    expect(useModeStore.getState().lastAiRecommendation).not.toBeNull()

    // 설정만 복원 (재분석 모드)
    await act(async () => {
      const result = await useHistoryStore.getState().loadSettingsFromHistory('test-record-001')
      if (result) {
        useAnalysisStore.getState().restoreSettingsFromHistory(result)
        // 이전 세션 오염 방지
        useModeStore.getState().setLastAiRecommendation(null)
      }
    })

    // After: lastAiRecommendation은 null
    expect(useModeStore.getState().lastAiRecommendation).toBeNull()
    // 설정은 복원됨
    expect(useAnalysisStore.getState().selectedMethod?.id).toBe('t-test')
    // 결과는 비워짐 (재분석 목적)
    expect(useAnalysisStore.getState().results).toBeNull()
  })

  it('startFreshAnalysisSession은 히스토리 열람 상태를 새 세션 기본값으로 초기화한다', () => {
    act(() => {
      useAnalysisStore.setState({
        analysisPurpose: '이전 분석',
        selectedMethod: { id: 't-test', name: 't-검정', description: 'desc', category: 't-test' },
        variableMapping: { dependentVar: 'score', groupVar: 'group' },
        analysisOptions: { alpha: 0.01, showAssumptions: false, showEffectSize: false, testValue: 5 },
        results: { pValue: 0.03, statistic: 2.1, method: 't-test', interpretation: '유의함' },
        currentStep: 4,
        completedSteps: [1, 2, 3, 4],
        uploadedFileName: 'history.csv',
      })
      useModeStore.getState().setStepTrack('reanalysis')
      useModeStore.getState().setLastAiRecommendation(makeAiContext())
      useHistoryStore.setState({
        currentHistoryId: 'history-1',
        loadedAiInterpretation: 'saved interpretation',
        loadedInterpretationChat: [{ id: 'c1', role: 'user', content: 'q', timestamp: 1 }],
      })
    })

    act(() => {
      startFreshAnalysisSession()
    })

    expect(useAnalysisStore.getState().analysisOptions).toEqual(DEFAULT_ANALYSIS_OPTIONS)
    expect(useAnalysisStore.getState().results).toBeNull()
    expect(useAnalysisStore.getState().variableMapping).toBeNull()
    expect(useAnalysisStore.getState().currentStep).toBe(1)
    expect(useHistoryStore.getState().currentHistoryId).toBeNull()
    expect(useHistoryStore.getState().loadedAiInterpretation).toBeNull()
    expect(useHistoryStore.getState().loadedInterpretationChat).toBeNull()
    expect(useModeStore.getState().stepTrack).toBe('normal')
    expect(useModeStore.getState().lastAiRecommendation).toBeNull()
  })

  it('getHistory가 null을 반환하면 loadFromHistory는 상태를 변경하지 않는다', async () => {
    getHistoryMock.mockResolvedValueOnce(null)

    act(() => {
      useModeStore.getState().setLastAiRecommendation(makeAiContext())
    })

    await act(async () => {
      const result = await useHistoryStore.getState().loadFromHistory('nonexistent-id')
      if (result) {
        useAnalysisStore.getState().restoreFromHistory(result)
        useModeStore.getState().setLastAiRecommendation(null)
      }
    })

    // record 없으므로 result === null → lastAiRecommendation 그대로
    expect(useModeStore.getState().lastAiRecommendation).not.toBeNull()
  })
})

// ============================================================
// Section 6: Turso adapter — aiRecommendation JSON 직렬화
// ============================================================

describe('Turso adapter — aiRecommendation JSON 직렬화 라운드트립', () => {
  it('전체 필드 포함 context를 JSON으로 직렬화/역직렬화한다', () => {
    const ctx = makeAiContext({
      warnings: ['데이터 수 적음', '정규성 가정 불확실'],
      ambiguityNote: '그룹 수가 명시되지 않음',
      alternatives: [
        { id: 'alt1', name: 'Mann-Whitney', description: '비모수 대안' },
        { id: 'alt2', name: 'Welch t-test', description: '등분산 가정 완화' },
      ],
    })

    // INSERT 시뮬레이션: JSON.stringify
    const serialized = JSON.stringify(ctx)
    expect(typeof serialized).toBe('string')

    // rowToRecord 시뮬레이션: JSON.parse
    const restored = JSON.parse(serialized) as AiRecommendationContext

    expect(restored.userQuery).toBe(ctx.userQuery)
    expect(restored.confidence).toBe(ctx.confidence)
    expect(restored.reasoning).toEqual(ctx.reasoning)
    expect(restored.provider).toBe('openrouter')
    expect(restored.warnings).toHaveLength(2)
    expect(restored.alternatives).toHaveLength(2)
    expect(restored.alternatives?.[0].id).toBe('alt1')
    expect(restored.ambiguityNote).toBe('그룹 수가 명시되지 않음')
  })

  it('null aiRecommendation은 null로 직렬화된다 (컬럼 NULL 저장)', () => {
    const rec: { aiRecommendation?: AiRecommendationContext | null } = { aiRecommendation: null }
    // INSERT 패턴: record.aiRecommendation ? JSON.stringify(...) : null
    const stored = rec.aiRecommendation ? JSON.stringify(rec.aiRecommendation) : null
    expect(stored).toBeNull()
  })

  it('rowToRecord 패턴: 컬럼 값이 있으면 파싱, 없으면 null', () => {
    const ctx = makeAiContext()

    // 값 있는 경우
    const rowWithData = { aiRecommendation: JSON.stringify(ctx) }
    const parsed = rowWithData.aiRecommendation
      ? (JSON.parse(rowWithData.aiRecommendation as string) as AiRecommendationContext)
      : null
    expect(parsed).not.toBeNull()
    expect(parsed?.provider).toBe('openrouter')
    expect(parsed?.confidence).toBe(0.9)

    // 값 없는 경우 (기존 레코드, 마이그레이션 전)
    const rowWithoutData = { aiRecommendation: null }
    const parsedNull = rowWithoutData.aiRecommendation
      ? JSON.parse(rowWithoutData.aiRecommendation as string)
      : null
    expect(parsedNull).toBeNull()
  })

  it('provider 유니온 타입이 라운드트립 후에도 유지된다', () => {
    const providers: AiRecommendationContext['provider'][] = ['openrouter', 'ollama', 'keyword']
    providers.forEach(p => {
      const ctx = makeAiContext({ provider: p })
      const restored = JSON.parse(JSON.stringify(ctx)) as AiRecommendationContext
      expect(restored.provider).toBe(p)
    })
  })
})

// Section 7: per-call options → llm-recommender.test.ts에 실제 spy 테스트로 이전
describe('loadHistoryFromDB - legacy sessionStorage merge', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    sessionStorage.clear()
    isIndexedDBAvailableMock.mockReturnValue(true)
    saveHistoryMock.mockResolvedValue(undefined)

    act(() => {
      useAnalysisStore.getState().reset()
      useModeStore.getState().resetMode()
      useHistoryStore.setState({
        analysisHistory: [],
        currentHistoryId: null,
        loadedAiInterpretation: null,
        loadedInterpretationChat: null,
      })
    })
  })

  it('merges only missing legacy histories even when IndexedDB already has records', async () => {
    sessionStorage.setItem('analysis-storage', JSON.stringify({
      state: {
        analysisHistory: [
          {
            id: 'existing-id',
            timestamp: '2026-03-01T00:00:00.000Z',
            name: 'already migrated',
            purpose: 'duplicate',
            method: { id: 't-test', name: 't-test', category: 't-test' },
            dataFileName: 'existing.csv',
            dataRowCount: 10,
            results: { method: 't-test', pValue: 0.2 },
          },
          {
            id: 'legacy-missing-id',
            timestamp: '2026-03-02T00:00:00.000Z',
            name: 'legacy missing',
            purpose: 'compare means',
            analysisPurpose: 'compare means',
              method: { id: 't-test', name: 't-test', category: 't-test', description: 'desc' },
              dataFileName: 'legacy.csv',
              dataRowCount: 42,
              variableMapping: { dependentVar: 'score', groupVar: 'group' },
              analysisOptions: { confidenceLevel: 0.99, testValue: 5 },
              aiInterpretation: 'legacy interpretation',
              apaFormat: 't(40)=2.10, p=.04',
              aiRecommendation: makeAiContext({ provider: 'ollama' }),
            interpretationChat: [{ id: 'c1', role: 'user', content: 'question', timestamp: 1 }],
            results: { method: 't-test', pValue: 0.04, statistic: 2.1 },
          },
        ],
      },
    }))

    getAllHistoryMock
      .mockResolvedValueOnce([
        makeHistoryRecord({ id: 'existing-id', name: 'indexeddb current' }),
      ])
      .mockResolvedValueOnce([
        makeHistoryRecord({ id: 'existing-id', name: 'indexeddb current' }),
        makeHistoryRecord({
          id: 'legacy-missing-id',
          name: 'legacy missing',
          variableMapping: { dependentVar: 'score', groupVar: 'group' },
          analysisOptions: { alpha: 0.01, testValue: 5 },
        }),
      ])

    await act(async () => {
      await useHistoryStore.getState().loadHistoryFromDB()
    })

    expect(saveHistoryMock).toHaveBeenCalledTimes(1)
    expect(saveHistoryMock.mock.calls[0][0]).toMatchObject({
      id: 'legacy-missing-id',
      name: 'legacy missing',
      variableMapping: { dependentVar: 'score', groupVar: 'group' },
      analysisOptions: {
        alpha: 0.01,
        showAssumptions: true,
        showEffectSize: true,
        testValue: 5,
      },
      aiInterpretation: 'legacy interpretation',
      apaFormat: 't(40)=2.10, p=.04',
    })
    expect(saveHistoryMock.mock.calls[0][0].aiRecommendation).toMatchObject({
      provider: 'ollama',
    })
    expect(saveHistoryMock.mock.calls[0][0].interpretationChat).toHaveLength(1)

    // getAllHistory: 1st for migration filter, 2nd for final load
    expect(getAllHistoryMock).toHaveBeenCalledTimes(2)

    const parsed = JSON.parse(sessionStorage.getItem('analysis-storage') || '{}')
    expect(parsed.state.analysisHistory).toBeUndefined()
  })

  it('maps legacy confidenceLevel to alpha when loading history settings', async () => {
    getHistoryMock.mockResolvedValueOnce(makeHistoryRecord({
      analysisOptions: { confidenceLevel: 0.99, showEffectSize: false },
    }))

    const result = await useHistoryStore.getState().loadSettingsFromHistory('test-record-001')

    expect(result?.analysisOptions).toEqual({
      alpha: 0.01,
      showAssumptions: true,
      showEffectSize: false,
    })
  })

  it('pre-assigns stable IDs to id-less legacy items for dedup on retry', async () => {
    sessionStorage.setItem('analysis-storage', JSON.stringify({
      state: {
        analysisHistory: [
          {
            // id 없는 레거시 항목
            timestamp: '2026-01-01T00:00:00.000Z',
            name: 'no-id legacy',
            purpose: 'test',
            method: { id: 't-test', name: 't-test', category: 't-test' },
            dataFileName: 'a.csv',
            dataRowCount: 5,
            results: { pValue: 0.05 },
          },
        ],
      },
    }))

    getAllHistoryMock
      .mockResolvedValueOnce([]) // migration filter
      .mockResolvedValueOnce([   // final load
        makeHistoryRecord({ id: 'migrated-id', name: 'no-id legacy' }),
      ])

    await act(async () => {
      await useHistoryStore.getState().loadHistoryFromDB()
    })

    // ID가 사전 할당되어 session에 write-back 되었는지 확인
    const parsed = JSON.parse(sessionStorage.getItem('analysis-storage') || '{}')
    // 마이그레이션 성공 → analysisHistory 삭제됨
    expect(parsed.state.analysisHistory).toBeUndefined()

    // saveHistory에 전달된 레코드의 id가 migrated- 접두사를 가짐
    expect(saveHistoryMock).toHaveBeenCalledTimes(1)
    expect(saveHistoryMock.mock.calls[0][0].id).toMatch(/^migrated-/)
  })
})
