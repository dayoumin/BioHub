/**
 * pinned-history-storage — 분석 히스토리 고정(Pin) 상태 관리
 *
 * localStorage 기반. IndexedDB 스키마 변경 불필요.
 * QuickAccessBar + AnalysisHistoryPanel 양쪽에서 공유.
 *
 * usePinnedHistoryIds() hook으로 같은 탭 내 컴포넌트 간 즉시 동기화.
 */

import { useState, useCallback, useEffect, useRef } from 'react'

const PINNED_HISTORY_KEY = 'analysis-history-pinned'
const PINNED_CHANGE_EVENT = 'pinned-history-change'

/** 최대 고정 가능 개수 */
export const MAX_PINNED = 3

/** QuickAccessBar에 표시할 최대 pill 수 (pinned + recent) */
export const MAX_VISIBLE_PILLS = 5

export function loadPinnedHistoryIds(): string[] {
  if (typeof window === 'undefined') return []
  try {
    const saved = localStorage.getItem(PINNED_HISTORY_KEY)
    if (saved) {
      const parsed: unknown = JSON.parse(saved)
      if (Array.isArray(parsed)) {
        return parsed.filter((x): x is string => typeof x === 'string')
      }
    }
  } catch {
    // ignore
  }
  return []
}

export function savePinnedHistoryIds(ids: string[]): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(PINNED_HISTORY_KEY, JSON.stringify(ids))
  } catch {
    // ignore
  }
}

/**
 * Pin 상태를 관리하는 hook — 같은 탭 내 컴포넌트 간 자동 동기화
 *
 * 내부적으로 localStorage + CustomEvent를 사용하여
 * 한 컴포넌트에서 pin/unpin 시 다른 컴포넌트에 즉시 반영.
 */
export function usePinnedHistoryIds(): readonly [
  string[],
  (updater: string[] | ((prev: string[]) => string[])) => void,
] {
  const [pinnedIds, setRawPinnedIds] = useState<string[]>(() => loadPinnedHistoryIds())

  // ref로 현재 값을 동기적으로 추적 (React 배치 지연과 무관하게 최신 값 참조)
  const currentRef = useRef(pinnedIds)
  currentRef.current = pinnedIds

  // self-notification 방지 플래그 (자기 이벤트는 이미 state 반영 완료)
  const skipNextEvent = useRef(false)

  // 다른 컴포넌트의 변경 이벤트 수신
  useEffect(() => {
    const handler = (): void => {
      if (skipNextEvent.current) {
        skipNextEvent.current = false
        return
      }
      const latest = loadPinnedHistoryIds()
      currentRef.current = latest
      setRawPinnedIds(latest)
    }
    window.addEventListener(PINNED_CHANGE_EVENT, handler)
    return () => window.removeEventListener(PINNED_CHANGE_EVENT, handler)
  }, [])

  const setPinnedIds = useCallback(
    (updater: string[] | ((prev: string[]) => string[])) => {
      const prev = currentRef.current
      const next = typeof updater === 'function' ? updater(prev) : updater
      if (next === prev) return // 동일 참조면 no-op
      currentRef.current = next
      setRawPinnedIds(next)
      savePinnedHistoryIds(next)
      // 같은 탭 내 다른 인스턴스에 알림 (자기 자신은 skipNextEvent로 건너뜀)
      skipNextEvent.current = true
      window.dispatchEvent(new Event(PINNED_CHANGE_EVENT))
    },
    [],
  )

  return [pinnedIds, setPinnedIds] as const
}
