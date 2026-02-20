import { useEffect, useState } from 'react'

/**
 * 값의 변경을 지연시키는 디바운스 훅
 * 빈번한 상태 업데이트를 제어하여 성능을 최적화합니다
 */
export function useDebounce<T>(value: T, delay: number = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    // 지정된 지연 시간 후에 값을 업데이트
    const timer = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    // 클린업 함수: 새로운 값이 들어오면 이전 타이머를 취소
    return () => {
      clearTimeout(timer)
    }
  }, [value, delay])

  return debouncedValue
}