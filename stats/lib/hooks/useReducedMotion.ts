import { useState, useEffect } from 'react'

/**
 * WCAG 2.3.3 준수: prefers-reduced-motion 감지
 *
 * 사용자 OS 설정에서 "애니메이션 줄이기"를 활성화했는지 감지합니다.
 * 전정 장애(vestibular disorder) 환자 등 애니메이션으로 인한 불편을 겪는 사용자를 위한 접근성 기능입니다.
 *
 * @returns {boolean} true: 애니메이션 줄여야 함, false: 정상 애니메이션 허용
 *
 * @example
 * ```tsx
 * const prefersReducedMotion = useReducedMotion()
 *
 * <div className={prefersReducedMotion ? '' : 'animate-in fade-in'}>
 *   Content
 * </div>
 * ```
 */
export function useReducedMotion(): boolean {
  // ✅ Issue #2 Fix: SSR-safe 초기값 lazy initialization
  // prefers-reduced-motion 설정을 첫 렌더링부터 반영하여 애니메이션 플래시 방지
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(() => {
    if (typeof window === 'undefined' || !window.matchMedia) {
      return false
    }
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
  })

  useEffect(() => {
    // matchMedia 지원 여부 확인 (SSR/구형 브라우저)
    if (typeof window === 'undefined' || !window.matchMedia) {
      return
    }

    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')

    // 초기 값 설정 (lazy initializer와 동기화 보장)
    setPrefersReducedMotion(mediaQuery.matches)

    // 실시간 변경 감지 (사용자가 OS 설정을 바꿀 때)
    const handleChange = (event: MediaQueryListEvent) => {
      setPrefersReducedMotion(event.matches)
    }

    // ✅ Issue #1 Fix: Safari ≤13 및 구형 브라우저 대응
    // addEventListener가 없으면 addListener (deprecated API) 사용
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange)
    } else {
      // Legacy API (Safari ≤13, Android WebView 구형) — deprecated but needed
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(mediaQuery as any).addListener(handleChange)
    }

    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', handleChange)
      } else {
        // Legacy API cleanup — deprecated but needed
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ;(mediaQuery as any).removeListener(handleChange)
      }
    }
  }, [])

  return prefersReducedMotion
}