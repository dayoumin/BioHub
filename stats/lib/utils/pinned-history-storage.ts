/**
 * pinned-history-storage — 분석 히스토리 고정(Pin) 상태 관리
 *
 * localStorage 기반. IndexedDB 스키마 변경 불필요.
 * QuickAccessBar + AnalysisHistoryPanel 양쪽에서 공유.
 *
 * usePinnedHistoryIds() hook으로 같은 탭 내 컴포넌트 간 즉시 동기화.
 */

import { useState, useCallback, useEffect, useRef } from 'react'
import { createLocalStorageIO } from '@/lib/utils/local-storage-factory'

import { STORAGE_KEYS } from '@/lib/constants/storage-keys'

const PINNED_HISTORY_KEY = STORAGE_KEYS.analysis.pinnedHistory
const PINNED_CHANGE_EVENT = 'pinned-history-change'

const { readJson, writeJson } = createLocalStorageIO('[pinned-history-storage]')

/** 최대 고정 가능 개수 */
export const MAX_PINNED = 3

/** QuickAccessBar에 표시할 최대 pill 수 (pinned + recent) */
export const MAX_VISIBLE_PILLS = 5

/**
 * Pin 토글 순수 함수 — 이미 고정이면 해제, 아니면 추가.
 * max 초과 시 null 반환 (호출부에서 toast 등 처리).
 */
export function togglePinId(prev: string[], id: string, max: number): string[] | null {
  if (prev.includes(id)) {
    return prev.filter(pid => pid !== id)
  }
  if (prev.length >= max) {
    return null
  }
  return [...prev, id]
}

export function loadPinnedHistoryIds(): string[] {
  const parsed = readJson<unknown[]>(PINNED_HISTORY_KEY, [])
  return parsed.filter((x): x is string => typeof x === 'string')
}

export function savePinnedHistoryIds(ids: string[]): void {
  try {
    writeJson(PINNED_HISTORY_KEY, ids)
  } catch {
    // ignore — SSR 또는 quota 초과
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
