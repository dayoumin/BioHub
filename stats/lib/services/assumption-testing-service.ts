/**
 * Assumption Testing Service
 *
 * AI가 추천한 변수 배정(variableAssignments)을 기반으로
 * 실제 데이터에서 그룹을 추출하고 가정 검정(정규성+등분산)을 실행한다.
 *
 * - 그룹 변수 있음: Worker 3 test_assumptions (Shapiro-Wilk + Levene)
 * - 그룹 변수 없음: Worker 1 normality_test (Shapiro-Wilk만)
 * - Pyodide 미초기화/에러: null 반환 (graceful degradation)
 */

import type {
  AIRecommendation,
  DataRow,
  ValidationResults,
  StatisticalAssumptions,
} from '@/types/analysis'
import type { PyodideCoreService } from '@/lib/services/pyodide/core/pyodide-core.service'
import { ensurePyodideReady } from '@/lib/services/pyodide/ensure-pyodide-ready'
import { logger } from '@/lib/utils/logger'
import { raceWithTimeout } from '@/lib/utils/promise-utils'
import { extractGroupedNumericData } from '@/lib/utils/grouped-data'
import { MIN_GROUP_SIZE, resolveGroupVariable } from '@/lib/constants/statistical-constants'
import type { TestAssumptionsWorkerResult, NormalityWorkerResult } from '@/lib/services/pyodide/worker-result-types'

// ===== Constants =====

const TIMEOUT_MS = 10_000

// ===== Main Function =====

/**
 * AI 추천의 variableAssignments를 기반으로 가정 검정을 실행한다.
 *
 * @param variableAssignments - AI가 추천한 변수 역할 배정
 * @param data - 업로드된 원본 데이터
 * @param validationResults - 데이터 검증 결과 (컬럼 타입 확인용)
 * @returns StatisticalAssumptions 또는 null (실패 시)
 */
export async function runAssumptionTests(
  variableAssignments: AIRecommendation['variableAssignments'],
  data: readonly DataRow[],
  validationResults: ValidationResults
): Promise<StatisticalAssumptions | null> {
  if (!variableAssignments || data.length < MIN_GROUP_SIZE) {
    return null
  }

  try {
    const pyodide = await ensurePyodideReady('Assumption testing')
    if (!pyodide) return null

    // 그룹 변수 결정: factor > independent > between
    const groupVarName = resolveGroupVariable(variableAssignments)

    // 종속 변수 결정: dependent > first numeric not in group
    const dependentVarName = variableAssignments.dependent?.[0]

    if (!dependentVarName) {
      logger.warn('Assumption testing: No dependent variable found')
      return null
    }

    // 종속 변수가 실제로 존재하는지 확인
    const depColumn = validationResults.columns?.find(c => c.name === dependentVarName)
    if (!depColumn || depColumn.type !== 'numeric') {
      logger.warn('Assumption testing: Dependent variable not found or not numeric', { dependentVarName })
      return null
    }

    if (groupVarName) {
      // 그룹 변수가 실제로 존재하는지 확인
      const groupColumn = validationResults.columns?.find(c => c.name === groupVarName)
      if (!groupColumn) {
        logger.warn('Assumption testing: Group variable not found in data', { groupVarName })
        return await runNormalityOnly(pyodide, data, dependentVarName)
      }

      // 그룹별 데이터 추출 → Worker 3 test_assumptions
      return await runGroupedAssumptionTests(pyodide, data, dependentVarName, groupVarName)
    } else {
      // 그룹 변수 없으면: 종속 변수에 대해 normality만 실행
      return await runNormalityOnly(pyodide, data, dependentVarName)
    }
  } catch (error) {
    logger.error('Assumption testing failed', { error })
    return null
  }
}

// ===== Internal Functions =====

/**
 * 그룹별 가정 검정 (Shapiro-Wilk + Levene)
 */
async function runGroupedAssumptionTests(
  pyodide: PyodideCoreService,
  data: readonly DataRow[],
  dependentVar: string,
  groupVar: string
): Promise<StatisticalAssumptions | null> {
  // 그룹별 데이터 추출
  const groupMap = extractGroupedNumericData(data, dependentVar, groupVar)

  // 유효 그룹만 필터링하되 라벨도 함께 유지
  const entries = [...groupMap.entries()]
  const validEntries = entries.filter(([, values]) => values.length >= MIN_GROUP_SIZE)

  if (validEntries.length < 2) {
    logger.warn('Assumption testing: Not enough valid groups', {
      groupVar,
      totalGroups: entries.length,
      validGroups: validEntries.length,
      sizes: entries.map(([k, v]) => `${k}:${v.length}`),
    })
    return null
  }

  const validGroups = validEntries.map(([, values]) => values)
  const validKeys = validEntries.map(([key]) => key)

  const result = await raceWithTimeout(
    pyodide.callWorkerMethod<TestAssumptionsWorkerResult>(3, 'test_assumptions', { groups: validGroups }),
    TIMEOUT_MS,
    'Assumption test timeout'
  )

  // Worker 3 응답 → StatisticalAssumptions 변환 (validKeys와 1:1 대응)
  // 대표 p값: 가장 작은 값(가장 비정규인 그룹)을 사용 — 보수적 접근
  // 모든 그룹이 정규여야 모수 검정을 권장하므로, min이 합리적
  const pValues = result.normality.shapiroWilk
    .filter(g => g.pValue != null)
    .map(g => g.pValue!)
  const minPValue = pValues.length > 0 ? Math.min(...pValues) : undefined

  return {
    normality: {
      shapiroWilk: {
        statistic: result.normality.shapiroWilk[0]?.statistic ?? undefined,
        pValue: minPValue,
        isNormal: result.normality.passed,
      },
      // 현재 StatisticalAssumptions 타입은 group1/group2만 지원.
      // 3+ 그룹(ANOVA 등)에서는 첫 2그룹만 개별 표시, 전체 passed는 shapiroWilk.isNormal로 판단.
      ...(result.normality.shapiroWilk[0] && {
        group1: {
          statistic: result.normality.shapiroWilk[0].statistic ?? undefined,
          pValue: result.normality.shapiroWilk[0].pValue ?? undefined,
          isNormal: result.normality.shapiroWilk[0].passed ?? false,
          interpretation: validKeys[0] ?? 'Group 1',
        },
      }),
      ...(result.normality.shapiroWilk[1] && {
        group2: {
          statistic: result.normality.shapiroWilk[1].statistic ?? undefined,
          pValue: result.normality.shapiroWilk[1].pValue ?? undefined,
          isNormal: result.normality.shapiroWilk[1].passed ?? false,
          interpretation: validKeys[1] ?? 'Group 2',
        },
      }),
    },
    homogeneity: {
      levene: {
        statistic: result.homogeneity.levene.statistic,
        pValue: result.homogeneity.levene.pValue,
        equalVariance: result.homogeneity.passed,
      },
    },
    testedVariable: dependentVar,
  }
}

/**
 * 단일 변수 정규성 검정 (그룹 없는 분석: 상관, 회귀 등)
 */
async function runNormalityOnly(
  pyodide: PyodideCoreService,
  data: readonly DataRow[],
  dependentVar: string
): Promise<StatisticalAssumptions | null> {
  const values: number[] = []
  for (const row of data) {
    const val = row[dependentVar]
    if (val === null || val === undefined || val === '') continue
    const num = typeof val === 'number' ? val : Number(val)
    if (!Number.isNaN(num) && Number.isFinite(num)) values.push(num)
  }

  if (values.length < MIN_GROUP_SIZE) return null

  const result = await raceWithTimeout(
    pyodide.callWorkerMethod<NormalityWorkerResult>(1, 'normality_test', { data: values, alpha: 0.05 }),
    TIMEOUT_MS,
    'Normality test timeout'
  )

  return {
    normality: {
      shapiroWilk: {
        statistic: result.statistic,
        pValue: result.pValue,
        isNormal: result.isNormal,
      },
    },
    testedVariable: dependentVar,
  }
}
