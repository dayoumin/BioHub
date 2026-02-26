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

  const [displayValue, setDisplayValue] = useState<string>(
    target == null ? '-' : (0).toFixed(decimals)
  )
  const rafRef = useRef<number | null>(null)
  const startTimeRef = useRef<number | null>(null)

  // prefers-reduced-motion 감지 (SSR 안전)
  const prefersReducedMotion =
    typeof window !== 'undefined' && window.matchMedia
      ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
      : false

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
