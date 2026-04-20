'use client'

import { useMemo } from 'react'
import { normalizeSelectedMethod } from '@/lib/stores/analysis-transitions'
import type { StatisticalMethod } from '@/types/analysis'

export function useCanonicalSelectedMethod(
  method: StatisticalMethod | null | undefined
): StatisticalMethod | null {
  return useMemo(() => normalizeSelectedMethod(method), [method])
}
