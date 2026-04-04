/**
 * Preemptive Assumption Testing Service
 *
 * Step 3 완료 시점에 가정 검정을 선행 실행 → Step 4에서 결과를 await.
 * Module-level promise + nonce로 레이스 컨디션/stale 결과 방지.
 *
 * Store side-effect 없음: 결과 기록은 Step 4 (유일한 writer)가 담당.
 */

import type { StatisticalAssumptions, DataRow } from '@/types/analysis'
import type { VariableMapping } from '@/lib/statistics/variable-mapping'
import { logger } from '@/lib/utils/logger'

let pendingPromise: Promise<StatisticalAssumptions | null> | null = null
/** 새 start 발생 시 이전 await 결과를 무효화하기 위한 compare-and-swap용 */
let currentNonce = 0

/**
 * VariableMapping → 가정 검정 payload 추출.
 * 다요인 ANOVA (groupVar="A,B"): 정규성만 (등분산 스킵).
 * 상관분석 (variables만): 첫 번째 변수를 종속변수로 사용.
 */
function buildAssumptionPayload(
  mapping: VariableMapping | null,
  data: readonly DataRow[]
): { values?: number[]; groups?: number[][]; testedVariable?: string } {
  if (!mapping) return {}

  const depVar =
    (Array.isArray(mapping.dependentVar) ? mapping.dependentVar[0] : mapping.dependentVar) ??
    (Array.isArray(mapping.variables) ? mapping.variables[0] : mapping.variables?.[0])

  if (!depVar) return {}

  const values = data
    .map(r => parseFloat(String(r[depVar])))
    .filter(v => Number.isFinite(v))

  if (values.length < 3) return {}

  const result: { values: number[]; groups?: number[][]; testedVariable: string } = {
    values,
    testedVariable: depVar
  }

  if (mapping.groupVar && !mapping.groupVar.includes(',')) {
    const groupVar = mapping.groupVar
    const uniqueGroups = [...new Set(data.map(r => r[groupVar]))]
    const groups = uniqueGroups
      .map(g => data
        .filter(r => r[groupVar] === g)
        .map(r => parseFloat(String(r[depVar])))
        .filter(v => Number.isFinite(v))
      )
      .filter(g => g.length >= 3)

    if (groups.length >= 2) result.groups = groups
  }

  return result
}

/**
 * Step 3 완료 시점에 호출 (fire-and-forget).
 * Store에 직접 쓰지 않음 — Step 4가 awaitPreemptiveAssumptions()로 결과를 수신.
 */
export function startPreemptiveAssumptions(
  mapping: VariableMapping,
  data: readonly DataRow[]
): void {
  currentNonce++
  pendingPromise = executeAssumptionTests(mapping, data)
}

/**
 * Step 4에서 호출: 선행 검정이 진행 중이면 await, 아니면 null 반환.
 * null 반환 시 Step 4가 직접 executeAssumptionTests를 fallback 실행.
 */
export async function awaitPreemptiveAssumptions(): Promise<StatisticalAssumptions | null> {
  const captured = pendingPromise
  if (!captured) return null

  const nonceAtStart = currentNonce
  const result = await captured

  // 대기 중 새 start가 발생했으면 이전 결과 폐기
  if (currentNonce !== nonceAtStart) {
    return null
  }

  pendingPromise = null
  return result
}

/**
 * 세션 리셋 시 호출 — stale promise가 잔류하지 않도록 정리.
 */
export function resetPreemptiveState(): void {
  pendingPromise = null
  currentNonce++
}

/**
 * VariableMapping 기반 가정 검정 실행.
 * startPreemptiveAssumptions 내부 + Step 4 fallback에서 공용.
 */
export async function executeAssumptionTests(
  mapping: VariableMapping,
  data: readonly DataRow[]
): Promise<StatisticalAssumptions | null> {
  const { values, groups, testedVariable } = buildAssumptionPayload(mapping, data)

  if (!values || !testedVariable) {
    return null
  }

  try {
    const { pyodideStats } = await import('@/lib/services/pyodide/pyodide-statistics')

    const rawResult = await pyodideStats.checkAllAssumptions({ values, groups })

    return {
      ...rawResult,
      testedVariable,
      summary: rawResult.summary ? {
        ...rawResult.summary,
        meetsAssumptions: rawResult.summary.testError
          ? undefined
          : rawResult.summary.canUseParametric,
        recommendation: rawResult.summary.recommendations.at(-1) ?? ''
      } : undefined
    }
  } catch (error: unknown) {
    logger.error('가정 검정 실행 실패', { error })
    return null
  }
}
