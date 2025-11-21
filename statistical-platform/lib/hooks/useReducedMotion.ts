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
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)

  useEffect(() => {
    // matchMedia 지원 여부 확인 (SSR/구형 브라우저)
    if (typeof window === 'undefined' || !window.matchMedia) {
      return
    }

    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')

    // 초기 값 설정
    setPrefersReducedMotion(mediaQuery.matches)

    // 실시간 변경 감지 (사용자가 OS 설정을 바꿀 때)
    const handleChange = (event: MediaQueryListEvent) => {
      setPrefersReducedMotion(event.matches)
    }

    // 이벤트 리스너 등록
    mediaQuery.addEventListener('change', handleChange)

    return () => {
      mediaQuery.removeEventListener('change', handleChange)
    }
  }, [])

  return prefersReducedMotion
}