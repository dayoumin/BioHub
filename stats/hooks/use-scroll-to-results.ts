import { useEffect, useRef } from 'react'

/**
 * 결과가 생기면 해당 영역으로 자동 스크롤하는 훅.
 * Bio-Tools 13개 페이지에서 공통 사용.
 */
export function useScrollToResults<T>(results: T | null): React.RefObject<HTMLDivElement | null> {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (results) {
      ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [results])

  return ref
}
