/**
 * usePinnedHistoryIds hook 테스트
 *
 * 검증 항목:
 * 1. 같은 탭 내 컴포넌트 간 pin 동기화 (CustomEvent 기반)
 * 2. functional updater로 stale closure 방지
 * 3. localStorage 저장/복원 정합성
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

// ── 기본 유틸 함수 테스트 ──

describe('loadPinnedHistoryIds', () => {
  it('localStorage가 비었으면 빈 배열 반환', () => {
    expect(loadPinnedHistoryIds()).toEqual([])
  })

  it('저장된 ID 배열을 복원', () => {
    localStorage.setItem('analysis-history-pinned', JSON.stringify(['a', 'b']))
    expect(loadPinnedHistoryIds()).toEqual(['a', 'b'])
  })

  it('잘못된 JSON이면 빈 배열 반환', () => {
    localStorage.setItem('analysis-history-pinned', '{invalid}')
    expect(loadPinnedHistoryIds()).toEqual([])
  })

  it('string이 아닌 요소는 필터링', () => {
    localStorage.setItem('analysis-history-pinned', JSON.stringify(['a', 123, null, 'b']))
    expect(loadPinnedHistoryIds()).toEqual(['a', 'b'])
  })
})

describe('savePinnedHistoryIds', () => {
  it('localStorage에 JSON 직렬화하여 저장', () => {
    savePinnedHistoryIds(['x', 'y'])
    expect(JSON.parse(localStorage.getItem('analysis-history-pinned')!)).toEqual(['x', 'y'])
  })
})

describe('constants', () => {
  it('MAX_PINNED = 3', () => expect(MAX_PINNED).toBe(3))
  it('MAX_VISIBLE_PILLS = 5', () => expect(MAX_VISIBLE_PILLS).toBe(5))
})

// ── usePinnedHistoryIds hook 테스트 ──

describe('usePinnedHistoryIds', () => {
  it('초기 상태를 localStorage에서 로드', () => {
    savePinnedHistoryIds(['init-1', 'init-2'])
    const { result } = renderHook(() => usePinnedHistoryIds())
    expect(result.current[0]).toEqual(['init-1', 'init-2'])
  })

  it('setPinnedIds(배열)로 직접 설정', () => {
    const { result } = renderHook(() => usePinnedHistoryIds())

    act(() => {
      result.current[1](['a', 'b'])
    })

    expect(result.current[0]).toEqual(['a', 'b'])
    expect(loadPinnedHistoryIds()).toEqual(['a', 'b'])
  })

  it('setPinnedIds(함수)로 functional update', () => {
    savePinnedHistoryIds(['a'])
    const { result } = renderHook(() => usePinnedHistoryIds())

    act(() => {
      result.current[1](prev => [...prev, 'b'])
    })

    expect(result.current[0]).toEqual(['a', 'b'])
    expect(loadPinnedHistoryIds()).toEqual(['a', 'b'])
  })

  // ── 핵심: 컴포넌트 간 동기화 ──

  it('두 hook 인스턴스 간 pin 변경 즉시 동기화', () => {
    const { result: hookA } = renderHook(() => usePinnedHistoryIds())
    const { result: hookB } = renderHook(() => usePinnedHistoryIds())

    // hookA에서 pin 추가
    act(() => {
      hookA.current[1](['sync-1'])
    })

    // hookA는 즉시 반영
    expect(hookA.current[0]).toEqual(['sync-1'])
    // hookB도 CustomEvent를 통해 동기화
    expect(hookB.current[0]).toEqual(['sync-1'])
    // localStorage도 일치
    expect(loadPinnedHistoryIds()).toEqual(['sync-1'])
  })

  it('양방향 동기화: B→A도 동작', () => {
    const { result: hookA } = renderHook(() => usePinnedHistoryIds())
    const { result: hookB } = renderHook(() => usePinnedHistoryIds())

    act(() => {
      hookB.current[1](['from-b'])
    })

    expect(hookA.current[0]).toEqual(['from-b'])
    expect(hookB.current[0]).toEqual(['from-b'])
  })

  it('연속 업데이트 시 두 인스턴스 모두 최종 상태 일치', () => {
    const { result: hookA } = renderHook(() => usePinnedHistoryIds())
    const { result: hookB } = renderHook(() => usePinnedHistoryIds())

    act(() => {
      hookA.current[1](['step-1'])
    })
    act(() => {
      hookB.current[1](prev => [...prev, 'step-2'])
    })
    act(() => {
      hookA.current[1](prev => [...prev, 'step-3'])
    })

    const expected = ['step-1', 'step-2', 'step-3']
    expect(hookA.current[0]).toEqual(expected)
    expect(hookB.current[0]).toEqual(expected)
    expect(loadPinnedHistoryIds()).toEqual(expected)
  })

  // ── stale closure 방지 시뮬레이션 ──

  it('functional updater는 최신 prev를 참조 (stale closure 방지)', () => {
    savePinnedHistoryIds(['x'])
    const { result } = renderHook(() => usePinnedHistoryIds())

    // 두 번의 functional update를 연속 호출 — 각각 최신 prev 기반
    act(() => {
      result.current[1](prev => [...prev, 'y'])
      result.current[1](prev => [...prev, 'z'])
    })

    expect(result.current[0]).toEqual(['x', 'y', 'z'])
  })

  it('삭제 시 functional updater로 안전하게 제거', () => {
    savePinnedHistoryIds(['a', 'b', 'c'])
    const { result } = renderHook(() => usePinnedHistoryIds())

    const deleteId = 'b'
    act(() => {
      result.current[1](prev => {
        if (!prev.includes(deleteId)) return prev
        return prev.filter(id => id !== deleteId)
      })
    })

    expect(result.current[0]).toEqual(['a', 'c'])
    expect(loadPinnedHistoryIds()).toEqual(['a', 'c'])
  })

  it('동일 값 반환 시 불필요한 업데이트 방지', () => {
    savePinnedHistoryIds(['keep'])
    const { result } = renderHook(() => usePinnedHistoryIds())

    const before = result.current[0]
    act(() => {
      // prev를 그대로 반환 — 변경 없음
      result.current[1](prev => prev)
    })

    // 참조 동일성 유지 (React가 re-render skip)
    expect(result.current[0]).toBe(before)
  })

  // ── cleanup 시뮬레이션 ──

  it('unmount 후 이벤트 리스너 정리 (메모리 누수 방지)', () => {
    const addSpy = vi.spyOn(window, 'addEventListener')
    const removeSpy = vi.spyOn(window, 'removeEventListener')

    const { unmount } = renderHook(() => usePinnedHistoryIds())

    expect(addSpy).toHaveBeenCalledWith('pinned-history-change', expect.any(Function))

    unmount()

    expect(removeSpy).toHaveBeenCalledWith('pinned-history-change', expect.any(Function))

    addSpy.mockRestore()
    removeSpy.mockRestore()
  })
})
