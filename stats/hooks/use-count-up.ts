'use client'

import { useState, useEffect, useRef } from 'react'

interface UseCountUpOptions {
  duration?: number
  decimals?: number
  started?: boolean
}

/**
 * 숫자를 0에서 target까지 부드럽게 카운트업하는 훅.
 * - requestAnimationFrame + easeOut 커브
 * - started=false이면 "0.00" 반환 (Phase 진입 전)
 * - target null/undefined → "-"
 * - prefers-reduced-motion 환경에서는 즉시 target 반환
 */
export function useCountUp(
  target: number | null | undefined,
  options: UseCountUpOptions = {}
): string {
  const { duration = 600, decimals = 2, started = true } = options

  // lazy initialization: 첫 렌더링부터 reduced-motion 반영 (애니메이션 flash 방지)
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(() => {
    if (typeof window === 'undefined' || !window.matchMedia) {
      return false
    }
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
  })

  const [displayValue, setDisplayValue] = useState<string>(() => {
    if (target == null) return '-'
    // reduced-motion: 첫 렌더링부터 최종값 (0 → target flash 방지)
    if (prefersReducedMotion && started) return target.toFixed(decimals)
    return (0).toFixed(decimals)
  })
  const rafRef = useRef<number | null>(null)
  const startTimeRef = useRef<number | null>(null)

  // 실시간 변경 감지 (사용자가 OS 설정을 바꿀 때)
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  useEffect(() => {
    if (target == null) {
      setDisplayValue('-')
      return
    }

    if (!started) {
      setDisplayValue((0).toFixed(decimals))
      return
    }

    // reduced motion: 즉시 최종값
    if (prefersReducedMotion) {
      setDisplayValue(target.toFixed(decimals))
      return
    }

    const startValue = 0
    const endValue = target
    startTimeRef.current = null

    const animate = (timestamp: number) => {
      if (startTimeRef.current === null) {
        startTimeRef.current = timestamp
      }

      const elapsed = timestamp - startTimeRef.current
      const progress = Math.min(elapsed / duration, 1)

      // easeOut cubic
      const eased = 1 - Math.pow(1 - progress, 3)
      const current = startValue + (endValue - startValue) * eased

      setDisplayValue(current.toFixed(decimals))

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate)
      }
    }

    rafRef.current = requestAnimationFrame(animate)

    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current)
      }
    }
  }, [target, started, duration, decimals, prefersReducedMotion])

  return displayValue
}
