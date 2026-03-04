/**
 * Pin + History 통합 시뮬레이션 테스트
 *
 * QuickAccessBar / AnalysisHistoryPanel의 핵심 로직을 hook 레벨에서 시뮬레이션.
 * 검증 항목:
 * 1. handleTogglePin: pin/unpin 토글 + MAX_PINNED 제한
 * 2. visibleHistory: pinned 우선 정렬 + MAX_VISIBLE_PILLS 제한
 * 3. handleDeleteConfirm: 삭제 시 pinnedIds 동기 정리
 * 4. handleClearAll: 전체 삭제 시 pinnedIds 리셋
 * 5. cleanup useEffect: 존재하지 않는 히스토리 ID 자동 정리
 * 6. 크로스 컴포넌트 동기화: 한쪽 pin → 다른쪽 즉시 반영
 */

import { renderHook, act } from '@testing-library/react'
import {
  usePinnedHistoryIds,
  loadPinnedHistoryIds,
  savePinnedHistoryIds,
  MAX_PINNED,
  MAX_VISIBLE_PILLS,
} from '@/lib/utils/pinned-history-storage'

// ── localStorage mock ──

const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value },
    removeItem: (key: string) => { delete store[key] },
    clear: () => { store = {} },
  }
})()

Object.defineProperty(window, 'localStorage', { value: localStorageMock })

beforeEach(() => {
  localStorage.clear()
})

// ── Mock 히스토리 데이터 ──

interface MockHistory {
  id: string
  method: { id: string; name: string; category: string } | null
  timestamp: Date
}

function createMockHistory(count: number): MockHistory[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `history-${i + 1}`,
    method: { id: `method-${i + 1}`, name: `Method ${i + 1}`, category: 'basic' },
    timestamp: new Date(Date.now() - i * 60_000), // 최신순: history-1이 가장 최신
  }))
}

// ── visibleHistory 계산 로직 (QuickAccessBar에서 추출) ──

function computeVisibleHistory(
  analysisHistory: MockHistory[],
  pinnedIds: string[],
): Array<MockHistory & { isPinned: boolean }> {
  const pinnedSet = new Set(pinnedIds)

  const pinned = analysisHistory
    .filter(h => pinnedSet.has(h.id))
    .map(h => ({ ...h, isPinned: true as const }))

  const unpinned = analysisHistory
    .filter(h => !pinnedSet.has(h.id))
    .map(h => ({ ...h, isPinned: false as const }))

  const remaining = Math.max(0, MAX_VISIBLE_PILLS - pinned.length)
  return [...pinned, ...unpinned.slice(0, remaining)]
}

// ── handleTogglePin 시뮬레이션 ──

describe('handleTogglePin 시뮬레이션', () => {
  it('빈 상태에서 pin 추가', () => {
    const { result } = renderHook(() => usePinnedHistoryIds())

    act(() => {
      result.current[1](prev => {
        if (prev.includes('h1')) return prev.filter(id => id !== 'h1')
        if (prev.length >= MAX_PINNED) return prev
        return [...prev, 'h1']
      })
    })

    expect(result.current[0]).toEqual(['h1'])
  })

  it('pin된 항목 unpin', () => {
    savePinnedHistoryIds(['h1', 'h2'])
    const { result } = renderHook(() => usePinnedHistoryIds())

    act(() => {
      result.current[1](prev => {
        if (prev.includes('h1')) return prev.filter(id => id !== 'h1')
        if (prev.length >= MAX_PINNED) return prev
        return [...prev, 'h1']
      })
    })

    expect(result.current[0]).toEqual(['h2'])
  })

  it('MAX_PINNED 초과 시 추가 거부', () => {
    savePinnedHistoryIds(['h1', 'h2', 'h3']) // MAX_PINNED=3, 이미 가득 참
    const { result } = renderHook(() => usePinnedHistoryIds())

    let didReachLimit = false
    act(() => {
      result.current[1](prev => {
        if (prev.includes('h4')) return prev.filter(id => id !== 'h4')
        if (prev.length >= MAX_PINNED) {
          didReachLimit = true
          return prev
        }
        return [...prev, 'h4']
      })
    })

    expect(didReachLimit).toBe(true)
    expect(result.current[0]).toEqual(['h1', 'h2', 'h3']) // 변경 없음
  })

  it('MAX_PINNED 미만이면 추가 허용', () => {
    savePinnedHistoryIds(['h1', 'h2']) // 2개 — 여유 있음
    const { result } = renderHook(() => usePinnedHistoryIds())

    act(() => {
      result.current[1](prev => {
        if (prev.includes('h3')) return prev.filter(id => id !== 'h3')
        if (prev.length >= MAX_PINNED) return prev
        return [...prev, 'h3']
      })
    })

    expect(result.current[0]).toEqual(['h1', 'h2', 'h3'])
  })

  it('pin → unpin 토글 반복이 정확하게 동작', () => {
    const { result } = renderHook(() => usePinnedHistoryIds())

    const toggle = (historyId: string): void => {
      result.current[1](prev => {
        if (prev.includes(historyId)) return prev.filter(id => id !== historyId)
        if (prev.length >= MAX_PINNED) return prev
        return [...prev, historyId]
      })
    }

    act(() => toggle('h1'))
    expect(result.current[0]).toEqual(['h1'])

    act(() => toggle('h1'))
    expect(result.current[0]).toEqual([])

    act(() => toggle('h1'))
    expect(result.current[0]).toEqual(['h1'])
  })
})

// ── visibleHistory 정렬 로직 ──

describe('visibleHistory 계산', () => {
  it('pinned 항목이 상단에 표시', () => {
    const history = createMockHistory(5)
    const pinnedIds = ['history-3']

    const visible = computeVisibleHistory(history, pinnedIds)

    expect(visible[0].id).toBe('history-3')
    expect(visible[0].isPinned).toBe(true)
    expect(visible.length).toBe(MAX_VISIBLE_PILLS)
  })

  it('pinned 여러 개가 먼저 → 나머지 최신순', () => {
    const history = createMockHistory(7)
    const pinnedIds = ['history-5', 'history-2']

    const visible = computeVisibleHistory(history, pinnedIds)

    // pinned 2개 먼저 (analysisHistory 원본 순서 유지: history-2가 history-5보다 앞)
    expect(visible[0].id).toBe('history-2')
    expect(visible[1].id).toBe('history-5')
    expect(visible[0].isPinned).toBe(true)
    expect(visible[1].isPinned).toBe(true)

    // unpinned 3개 (MAX_VISIBLE_PILLS - 2 = 3) — 최신순(history-1이 가장 최신)
    expect(visible[2].id).toBe('history-1')
    expect(visible[2].isPinned).toBe(false)
    expect(visible.length).toBe(MAX_VISIBLE_PILLS)
  })

  it('MAX_VISIBLE_PILLS 제한 적용', () => {
    const history = createMockHistory(10)
    const pinnedIds: string[] = []

    const visible = computeVisibleHistory(history, pinnedIds)

    expect(visible.length).toBe(MAX_VISIBLE_PILLS)
    expect(visible.every(h => !h.isPinned)).toBe(true)
  })

  it('pinned가 MAX_VISIBLE_PILLS보다 많으면 pinned만 표시', () => {
    const history = createMockHistory(10)
    // 실제로는 MAX_PINNED=3이라 5개 이상 pin은 불가하지만, 로직 검증용
    const pinnedIds = history.slice(0, 6).map(h => h.id)

    const visible = computeVisibleHistory(history, pinnedIds)

    // pinned 6개 + remaining = max(0, 5-6) = 0
    expect(visible.length).toBe(6)
    expect(visible.every(h => h.isPinned)).toBe(true)
  })

  it('히스토리 0개일 때 빈 배열', () => {
    const visible = computeVisibleHistory([], [])
    expect(visible).toEqual([])
  })

  it('pinned ID가 히스토리에 없으면 무시', () => {
    const history = createMockHistory(3)
    const pinnedIds = ['nonexistent-id']

    const visible = computeVisibleHistory(history, pinnedIds)

    // nonexistent는 히스토리에 없으므로 pinned 0개, unpinned 3개
    expect(visible.length).toBe(3)
    expect(visible.every(h => !h.isPinned)).toBe(true)
  })
})

// ── 삭제 시 pinnedIds 정리 시뮬레이션 ──

describe('handleDelete 시 pinnedIds 정리', () => {
  it('삭제된 항목이 pinnedIds에서도 제거', () => {
    savePinnedHistoryIds(['h1', 'h2', 'h3'])
    const { result } = renderHook(() => usePinnedHistoryIds())

    const deleteId = 'h2'
    act(() => {
      // handleDelete 시뮬레이션: deleteFromHistory 후 pinnedIds 정리
      result.current[1](prev => {
        if (!prev.includes(deleteId)) return prev
        return prev.filter(id => id !== deleteId)
      })
    })

    expect(result.current[0]).toEqual(['h1', 'h3'])
    expect(loadPinnedHistoryIds()).toEqual(['h1', 'h3'])
  })

  it('삭제 항목이 pinnedIds에 없으면 변경 없음', () => {
    savePinnedHistoryIds(['h1', 'h2'])
    const { result } = renderHook(() => usePinnedHistoryIds())

    const before = result.current[0]
    act(() => {
      const deleteId = 'h99'
      result.current[1](prev => {
        if (!prev.includes(deleteId)) return prev
        return prev.filter(id => id !== deleteId)
      })
    })

    // prev 그대로 반환 → 참조 동일
    expect(result.current[0]).toBe(before)
  })
})

// ── handleClearAll 시뮬레이션 ──

describe('handleClearAll 시 pinnedIds 리셋', () => {
  it('전체 삭제 시 pinnedIds를 빈 배열로 리셋', () => {
    savePinnedHistoryIds(['h1', 'h2', 'h3'])
    const { result } = renderHook(() => usePinnedHistoryIds())

    expect(result.current[0]).toEqual(['h1', 'h2', 'h3'])

    act(() => {
      result.current[1]([])
    })

    expect(result.current[0]).toEqual([])
    expect(loadPinnedHistoryIds()).toEqual([])
  })
})

// ── cleanup useEffect 시뮬레이션 ──

describe('cleanup: 존재하지 않는 히스토리 ID 자동 정리', () => {
  it('유효하지 않은 pinnedId가 제거됨', () => {
    savePinnedHistoryIds(['valid-1', 'deleted-2', 'valid-3'])
    const { result } = renderHook(() => usePinnedHistoryIds())

    const validHistoryIds = new Set(['valid-1', 'valid-3', 'other-4'])

    act(() => {
      result.current[1](prev => {
        const cleaned = prev.filter(id => validHistoryIds.has(id))
        return cleaned.length !== prev.length ? cleaned : prev
      })
    })

    expect(result.current[0]).toEqual(['valid-1', 'valid-3'])
  })

  it('모든 pinnedId가 유효하면 변경 없음 (참조 동일성 유지)', () => {
    savePinnedHistoryIds(['a', 'b'])
    const { result } = renderHook(() => usePinnedHistoryIds())

    const validHistoryIds = new Set(['a', 'b', 'c'])
    const before = result.current[0]

    act(() => {
      result.current[1](prev => {
        const cleaned = prev.filter(id => validHistoryIds.has(id))
        return cleaned.length !== prev.length ? cleaned : prev
      })
    })

    // 변경 없으므로 참조 동일
    expect(result.current[0]).toBe(before)
  })
})

// ── 크로스 컴포넌트 동기화 시뮬레이션 ──

describe('QuickAccessBar ↔ AnalysisHistoryPanel 동기화', () => {
  it('Panel에서 pin → QuickAccessBar에서 즉시 반영', () => {
    const { result: panel } = renderHook(() => usePinnedHistoryIds())
    const { result: quickBar } = renderHook(() => usePinnedHistoryIds())

    // Panel에서 pin 토글
    act(() => {
      panel.current[1](prev => [...prev, 'from-panel'])
    })

    // QuickAccessBar에서 즉시 확인
    expect(quickBar.current[0]).toEqual(['from-panel'])
    expect(panel.current[0]).toEqual(['from-panel'])
  })

  it('QuickAccessBar에서 pin toggle → Panel에서 즉시 반영', () => {
    savePinnedHistoryIds(['shared-1'])
    const { result: panel } = renderHook(() => usePinnedHistoryIds())
    const { result: quickBar } = renderHook(() => usePinnedHistoryIds())

    // QuickAccessBar에서 pin 해제
    act(() => {
      quickBar.current[1](prev => prev.filter(id => id !== 'shared-1'))
    })

    expect(panel.current[0]).toEqual([])
    expect(quickBar.current[0]).toEqual([])
  })

  it('QuickAccessBar에서 삭제 → Panel pinnedIds에서도 제거', () => {
    savePinnedHistoryIds(['pinned-1', 'pinned-2'])
    const { result: panel } = renderHook(() => usePinnedHistoryIds())
    const { result: quickBar } = renderHook(() => usePinnedHistoryIds())

    // QuickAccessBar handleDeleteConfirm 시뮬레이션
    act(() => {
      quickBar.current[1](prev => {
        if (!prev.includes('pinned-1')) return prev
        return prev.filter(id => id !== 'pinned-1')
      })
    })

    expect(panel.current[0]).toEqual(['pinned-2'])
    expect(quickBar.current[0]).toEqual(['pinned-2'])
    expect(loadPinnedHistoryIds()).toEqual(['pinned-2'])
  })

  it('양쪽에서 교대로 pin 추가해도 상태 일관성 유지', () => {
    const { result: panel } = renderHook(() => usePinnedHistoryIds())
    const { result: quickBar } = renderHook(() => usePinnedHistoryIds())

    act(() => { panel.current[1](prev => [...prev, 'a']) })
    act(() => { quickBar.current[1](prev => [...prev, 'b']) })
    act(() => { panel.current[1](prev => [...prev, 'c']) })

    const expected = ['a', 'b', 'c']
    expect(panel.current[0]).toEqual(expected)
    expect(quickBar.current[0]).toEqual(expected)
    expect(loadPinnedHistoryIds()).toEqual(expected)
  })
})
