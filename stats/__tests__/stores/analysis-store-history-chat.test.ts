/**
 * Smart Flow Store — 히스토리 로드 시 interpretationChat 복원 테스트
 *
 * 시나리오:
 * 1. loadFromHistory 호출 시 interpretationChat이 store에 복원되는가
 * 2. 빈 채팅 / undefined 시 null 유지
 * 3. resetMode가 loadedInterpretationChat을 초기화하는가 (history-store 직접)
 * 4. reset이 loadedInterpretationChat을 초기화하는가
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { act } from '@testing-library/react'
import { useAnalysisStore } from '@/lib/stores/analysis-store'
import { useHistoryStore } from '@/lib/stores/history-store'
import type { HistoryRecord } from '@/lib/utils/storage-types'
import type { ChatMessage } from '@/lib/types/chat'

// IndexedDB mock
vi.mock('@/lib/utils/storage', () => ({
  saveHistory: vi.fn(),
  getAllHistory: vi.fn().mockResolvedValue([]),
  getHistory: vi.fn(),
  deleteHistory: vi.fn(),
  clearAllHistory: vi.fn(),
  initStorage: vi.fn(),
}))

vi.mock('@/lib/utils/adapters/indexeddb-adapter', () => ({
  isIndexedDBAvailable: vi.fn().mockReturnValue(true),
}))

const { getHistory } = await import('@/lib/utils/storage')
const mockGetHistory = vi.mocked(getHistory)

const sampleChatMessages: ChatMessage[] = [
  {
    id: 'q1',
    role: 'user',
    content: '이 결과가 유의미한가요?',
    timestamp: Date.now() - 5000,
  },
  {
    id: 'a1',
    role: 'assistant',
    content: 'p < .05이므로 통계적으로 유의합니다.',
    timestamp: Date.now() - 4000,
  },
  {
    id: 'q2',
    role: 'user',
    content: '효과크기는 어떤가요?',
    timestamp: Date.now() - 3000,
  },
  {
    id: 'a2',
    role: 'assistant',
    content: 'Cohen\'s d = 0.85로 큰 효과입니다.',
    timestamp: Date.now() - 2000,
  },
]

function makeHistoryRecord(chat?: ChatMessage[]): HistoryRecord {
  return {
    id: 'test-history-1',
    timestamp: Date.now(),
    name: '테스트 분석',
    purpose: '집단 간 차이 비교',
    method: { id: 'independent-t-test', name: '독립표본 t-검정', category: 'parametric' },
    dataFileName: 'test.csv',
    dataRowCount: 50,
    results: { method: 'independent-t-test', pValue: 0.023 },
    aiInterpretation: 'AI 해석 텍스트',
    interpretationChat: chat,
  }
}

describe('Smart Flow Store — interpretationChat 복원', () => {
  beforeEach(() => {
    act(() => {
      useAnalysisStore.getState().reset()
      useHistoryStore.setState({
        analysisHistory: [],
        currentHistoryId: null,
        loadedAiInterpretation: null,
        loadedInterpretationChat: null,
      })
    })
    vi.clearAllMocks()
  })

  it('초기 상태에서 loadedInterpretationChat은 null이다', () => {
    expect(useHistoryStore.getState().loadedInterpretationChat).toBeNull()
  })

  it('loadFromHistory 시 interpretationChat이 있으면 loadedInterpretationChat에 복원된다', async () => {
    mockGetHistory.mockResolvedValueOnce(makeHistoryRecord(sampleChatMessages))

    await act(async () => {
      await useHistoryStore.getState().loadFromHistory('test-history-1')
    })

    const state = useHistoryStore.getState()
    expect(state.loadedInterpretationChat).toHaveLength(4)
    expect(state.loadedInterpretationChat?.[0].content).toBe('이 결과가 유의미한가요?')
    expect(state.loadedInterpretationChat?.[1].role).toBe('assistant')
    expect(state.loadedInterpretationChat?.[3].content).toContain('Cohen')
  })

  it('loadFromHistory 시 interpretationChat이 undefined면 loadedInterpretationChat은 null이다', async () => {
    mockGetHistory.mockResolvedValueOnce(makeHistoryRecord(undefined))

    await act(async () => {
      await useHistoryStore.getState().loadFromHistory('test-history-1')
    })

    expect(useHistoryStore.getState().loadedInterpretationChat).toBeNull()
  })

  it('loadFromHistory 시 interpretationChat이 빈 배열이면 loadedInterpretationChat은 null이다', async () => {
    mockGetHistory.mockResolvedValueOnce(makeHistoryRecord([]))

    await act(async () => {
      await useHistoryStore.getState().loadFromHistory('test-history-1')
    })

    expect(useHistoryStore.getState().loadedInterpretationChat).toBeNull()
  })

  it('history-store 직접 리셋 시 loadedInterpretationChat이 null이 된다', async () => {
    // 먼저 채팅 복원
    mockGetHistory.mockResolvedValueOnce(makeHistoryRecord(sampleChatMessages))
    await act(async () => {
      await useHistoryStore.getState().loadFromHistory('test-history-1')
    })
    expect(useHistoryStore.getState().loadedInterpretationChat).not.toBeNull()

    // 직접 리셋
    act(() => {
      useHistoryStore.setState({
        loadedInterpretationChat: null,
        loadedAiInterpretation: null,
        currentHistoryId: null,
      })
    })

    expect(useHistoryStore.getState().loadedInterpretationChat).toBeNull()
  })

  it('history-store setState로 loadedInterpretationChat을 null로 초기화할 수 있다', async () => {
    mockGetHistory.mockResolvedValueOnce(makeHistoryRecord(sampleChatMessages))
    await act(async () => {
      await useHistoryStore.getState().loadFromHistory('test-history-1')
    })

    act(() => {
      useHistoryStore.setState({ loadedInterpretationChat: null })
    })

    expect(useHistoryStore.getState().loadedInterpretationChat).toBeNull()
  })

  it('loadFromHistory 후 결과에 currentStep이 결과 단계(4)로 설정된다', async () => {
    mockGetHistory.mockResolvedValueOnce(makeHistoryRecord(sampleChatMessages))

    let result: unknown = null
    await act(async () => {
      result = await useHistoryStore.getState().loadFromHistory('test-history-1')
    })

    expect(result).not.toBeNull()
    const loadResult = result as { currentStep: number }
    expect(loadResult.currentStep).toBe(4)
  })

  it('채팅 메시지의 role과 content가 원본과 동일하다', async () => {
    mockGetHistory.mockResolvedValueOnce(makeHistoryRecord(sampleChatMessages))

    await act(async () => {
      await useHistoryStore.getState().loadFromHistory('test-history-1')
    })

    const chat = useHistoryStore.getState().loadedInterpretationChat
    expect(chat).not.toBeNull()

    // 원본 메시지와 1:1 대응
    sampleChatMessages.forEach((original, i) => {
      expect(chat?.[i].id).toBe(original.id)
      expect(chat?.[i].role).toBe(original.role)
      expect(chat?.[i].content).toBe(original.content)
    })
  })
})

describe('Smart Flow Store — 히스토리 A→B 전환', () => {
  const chatA: ChatMessage[] = [
    { id: 'a1', role: 'user', content: 'A 질문', timestamp: 1000 },
    { id: 'a2', role: 'assistant', content: 'A 답변', timestamp: 2000 },
  ]
  const chatB: ChatMessage[] = [
    { id: 'b1', role: 'user', content: 'B 질문', timestamp: 3000 },
    { id: 'b2', role: 'assistant', content: 'B 답변', timestamp: 4000 },
    { id: 'b3', role: 'user', content: 'B 후속', timestamp: 5000 },
    { id: 'b4', role: 'assistant', content: 'B 후속 답변', timestamp: 6000 },
  ]

  function makeRecord(id: string, chat?: ChatMessage[]): HistoryRecord {
    return {
      id,
      timestamp: Date.now(),
      name: `분석 ${id}`,
      purpose: '비교',
      method: { id: 'independent-t-test', name: '독립표본 t-검정', category: 'parametric' },
      dataFileName: `${id}.csv`,
      dataRowCount: 30,
      results: { method: 'independent-t-test', pValue: id === 'A' ? 0.01 : 0.99 },
      aiInterpretation: `${id} 해석`,
      interpretationChat: chat,
    }
  }

  beforeEach(() => {
    act(() => {
      useAnalysisStore.getState().reset()
      useHistoryStore.setState({
        analysisHistory: [],
        currentHistoryId: null,
        loadedAiInterpretation: null,
        loadedInterpretationChat: null,
      })
    })
    vi.clearAllMocks()
  })

  it('A 로드 후 B 로드 시 loadedInterpretationChat이 B 대화로 교체된다', async () => {
    // A 로드
    mockGetHistory.mockResolvedValueOnce(makeRecord('A', chatA))
    await act(async () => {
      const result = await useHistoryStore.getState().loadFromHistory('A')
      if (result) useAnalysisStore.getState().restoreFromHistory(result)
    })
    expect(useHistoryStore.getState().loadedInterpretationChat).toHaveLength(2)
    expect(useHistoryStore.getState().currentHistoryId).toBe('A')

    // B 로드
    mockGetHistory.mockResolvedValueOnce(makeRecord('B', chatB))
    await act(async () => {
      const result = await useHistoryStore.getState().loadFromHistory('B')
      if (result) useAnalysisStore.getState().restoreFromHistory(result)
    })
    expect(useHistoryStore.getState().loadedInterpretationChat).toHaveLength(4)
    expect(useHistoryStore.getState().loadedInterpretationChat?.[0].content).toBe('B 질문')
    expect(useHistoryStore.getState().currentHistoryId).toBe('B')
  })

  it('A(채팅 있음) → B(채팅 없음) 전환 시 loadedInterpretationChat이 null이 된다', async () => {
    // A 로드 (채팅 있음)
    mockGetHistory.mockResolvedValueOnce(makeRecord('A', chatA))
    await act(async () => {
      const result = await useHistoryStore.getState().loadFromHistory('A')
      if (result) useAnalysisStore.getState().restoreFromHistory(result)
    })
    expect(useHistoryStore.getState().loadedInterpretationChat).toHaveLength(2)

    // B 로드 (채팅 없음)
    mockGetHistory.mockResolvedValueOnce(makeRecord('B', undefined))
    await act(async () => {
      const result = await useHistoryStore.getState().loadFromHistory('B')
      if (result) useAnalysisStore.getState().restoreFromHistory(result)
    })
    expect(useHistoryStore.getState().loadedInterpretationChat).toBeNull()
  })

  it('A→B 전환 시 currentHistoryId가 변경되어 UI 초기화 트리거가 된다', async () => {
    mockGetHistory.mockResolvedValueOnce(makeRecord('A', chatA))
    await act(async () => {
      const result = await useHistoryStore.getState().loadFromHistory('A')
      if (result) useAnalysisStore.getState().restoreFromHistory(result)
    })
    const idA = useHistoryStore.getState().currentHistoryId

    mockGetHistory.mockResolvedValueOnce(makeRecord('B', chatB))
    await act(async () => {
      const result = await useHistoryStore.getState().loadFromHistory('B')
      if (result) useAnalysisStore.getState().restoreFromHistory(result)
    })
    const idB = useHistoryStore.getState().currentHistoryId

    expect(idA).toBe('A')
    expect(idB).toBe('B')
    expect(idA).not.toBe(idB)
  })
})
