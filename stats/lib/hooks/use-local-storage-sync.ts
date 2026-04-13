/**
 * useLocalStorageSync — localStorage 값을 읽고 커스텀 이벤트 + StorageEvent로 동기화하는 공용 훅
 *
 * 패턴:
 * - `lastRawRef`로 동일 raw 값 중복 파싱 방지
 * - 같은 탭 내 커스텀 이벤트(`changeEvent`) 수신
 * - 다른 탭 `StorageEvent` 수신 (cross-tab sync)
 * - `deps` 변경 시 같은 raw여도 재파싱 (예: 필터 조건 변경)
 *
 * 사용처: BioToolSidebar, GeneticsHistorySidebar 등
 */

import { useState, useEffect, useCallback, useRef, type MutableRefObject } from 'react'

export interface LocalStorageSyncResult<T> {
  /** 파싱된 현재 값 */
  value: T
  /** 마지막으로 읽은 raw JSON 문자열 — 낙관적 업데이트 후 동기화에 사용 */
  lastRawRef: MutableRefObject<string | null>
  /** true로 설정하면 다음 커스텀 이벤트 1회를 무시 (자기 이벤트 방지) */
  skipNextEventRef: MutableRefObject<boolean>
}

/**
 * localStorage 키를 구독하여 파싱된 값을 반환하는 훅.
 *
 * @param storageKey   - localStorage 키
 * @param changeEvent  - 같은 탭 내 변경 알림용 커스텀 이벤트 이름
 * @param parser       - raw 문자열 → 파싱된 값 변환 함수
 */
export function useLocalStorageSync<T>(
  storageKey: string,
  changeEvent: string,
  parser: (raw: string | null) => T,
): LocalStorageSyncResult<T> {
  const lastRawRef = useRef<string | null>(null)
  const skipNextEventRef = useRef(false)

  const [value, setValue] = useState<T>(() => {
    if (typeof window === 'undefined') {
      return parser(null)
    }
    const raw = window.localStorage.getItem(storageKey)
    lastRawRef.current = raw
    return parser(raw)
  })

  // parser가 바뀌면 refresh가 재생성 → useEffect가 재실행
  const parserRef = useRef(parser)
  const refresh = useCallback((): void => {
    if (typeof window === 'undefined') {
      return
    }
    const raw = window.localStorage.getItem(storageKey)
    const parserChanged = parserRef.current !== parser
    if (raw === lastRawRef.current && !parserChanged) return
    lastRawRef.current = raw
    parserRef.current = parser
    setValue(parser(raw))
  }, [storageKey, parser])

  // 초기 마운트 + deps/storageKey 변경 시 갱신
  useEffect(() => {
    refresh()
  }, [refresh])

  // 이벤트 리스너 등록
  useEffect(() => {
    const onCustomEvent = (): void => {
      if (skipNextEventRef.current) {
        skipNextEventRef.current = false
        return
      }
      refresh()
    }
    const onStorage = (e: StorageEvent): void => {
      if (e.key === storageKey) refresh()
    }
    window.addEventListener(changeEvent, onCustomEvent)
    window.addEventListener('storage', onStorage)
    return () => {
      window.removeEventListener(changeEvent, onCustomEvent)
      window.removeEventListener('storage', onStorage)
    }
  }, [changeEvent, storageKey, refresh])

  return { value, lastRawRef, skipNextEventRef }
}
