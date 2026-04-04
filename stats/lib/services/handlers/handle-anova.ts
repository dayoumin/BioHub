/**
 * ANOVA handler — extracted from statistical-executor.ts (lines 904-1495).
 * Behavior-preserving. Only change: tukeyHSD → tukeyHSDWorker (Amendment),
 * this.normalizePostHocComparisons → normalizePostHocComparisons (shared-helpers),
 * this.interpretEtaSquared → interpretEtaSquared (shared-helpers).
 */

import { pyodideStats } from '../pyodide/pyodide-statistics'
import type { StatisticalMethod } from '../../statistics/method-mapping'
import type { PreparedData, StatisticalExecutorResult } from '../statistical-executor'
import { interpretEtaSquared, normalizePostHocComparisons } from './shared-helpers'
import { logger } from '../../utils/logger'

export async function handleANOVA(
  method: StatisticalMethod,
  data: PreparedData
): Promise<StatisticalExecutorResult> {
  // Two-way ANOVA는 별도 처리
  if (method.id === 'two-way-anova') {
    const groupVar = data.variables.group as string | undefined
    const dependentVar = (data.variables.dependent as string[] | undefined)?.[0]
    const rawData = data.data as Array<Record<string, unknown>>

    logger.info('[two-way-anova] Debug variables:', {
      groupVar,
      dependentVar,
      rawDataLength: rawData?.length,
      allVariables: JSON.stringify(data.variables)
    })

    if (!groupVar || !dependentVar || !rawData) {
      logger.error('[two-way-anova] Missing variables:', {
        hasGroupVar: !!groupVar,
        hasDependentVar: !!dependentVar,
        hasRawData: !!rawData,
        rawDataLength: rawData?.length
      })
      throw new Error(`이원 ANOVA 변수 누락: groupVar=${!!groupVar}, dependent=${!!dependentVar}, rawData=${!!rawData && rawData.length > 0}`)
    }

    // groupVar format: "factor1,factor2"
    const factors = groupVar.split(',').map(f => f.trim())
    logger.info('[two-way-anova] Parsed factors:', { factors, factorCount: factors.length })

    if (factors.length !== 2) {
      throw new Error(`이원 ANOVA를 위해 정확히 2개의 요인이 필요합니다 (현재: ${factors.length}개, groupVar="${groupVar}")`)
    }

    const [factor1Name, factor2Name] = factors

    // 데이터 포맷팅: { factor1, factor2, value }[]
    const formattedData = rawData
      .map(row => {
        const factor1Value = row[factor1Name]
        const factor2Value = row[factor2Name]
        const depValue = row[dependentVar]

        if (factor1Value == null || factor2Value == null || depValue == null) return null

        const numValue = typeof depValue === 'number' ? depValue : Number(depValue)
        if (!Number.isFinite(numValue)) return null

        return {
          factor1: String(factor1Value),
          factor2: String(factor2Value),
          value: numValue
        }
      })
      .filter((item): item is { factor1: string; factor2: string; value: number } => item !== null)

    if (formattedData.length === 0) {
      throw new Error('유효한 데이터가 없습니다. 모든 행이 null 또는 유효하지 않은 값입니다.')
    }

    type TwoWayAnovaResult = {
      factor1: { fStatistic: number; pValue: number; df: number }
      factor2: { fStatistic: number; pValue: number; df: number }
      interaction: { fStatistic: number; pValue: number; df: number }
      residual: { df: number }
      anovaTable: Record<string, unknown>
    }

    let rawResult: unknown = await pyodideStats.twoWayAnova(formattedData)

    logger.info('[two-way-anova] Raw Python worker result:', {
      hasResult: !!rawResult,
      resultType: typeof rawResult,
      rawResultPreview: String(rawResult).slice(0, 300)
    })

    // Worker may return JSON string instead of object
    if (typeof rawResult === 'string') {
      logger.info('[two-way-anova] Result is string, parsing JSON')
      try {
        rawResult = JSON.parse(rawResult)
      } catch (e) {
        throw new Error(`이원 ANOVA 결과 JSON 파싱 실패: ${e instanceof Error ? e.message : String(e)}`)
      }
    }

    // Type guard
    if (!rawResult || typeof rawResult !== 'object') {
      throw new Error(`이원 ANOVA 결과가 올바르지 않습니다 (type=${typeof rawResult})`)
    }

    const parsed = rawResult as Record<string, unknown>
    if (!parsed.factor1 || !parsed.factor2 || !parsed.interaction) {
      throw new Error(
        `이원 ANOVA 결과 구조 오류 (factor1=${!!parsed.factor1}, ` +
        `factor2=${!!parsed.factor2}, interaction=${!!parsed.interaction})`
      )
    }

    const result = rawResult as TwoWayAnovaResult

    return {
      metadata: {
        method: method.id,
        methodName: method.name,
        timestamp: '',
        duration: 0,
        dataInfo: {
          totalN: formattedData.length,
          missingRemoved: rawData.length - formattedData.length,
          groups: 0
        }
      },
      mainResults: {
        statistic: result.factor1.fStatistic,
        pvalue: result.factor1.pValue,
        df: result.factor1.df,
        significant: result.factor1.pValue < 0.05,
        interpretation: result.factor1.pValue < 0.05 ?
          '주 효과 또는 상호작용 효과가 유의합니다' :
          '주 효과 및 상호작용 효과가 유의하지 않습니다'
      },
      additionalInfo: {
        factor1: {
          name: factor1Name,
          fStatistic: result.factor1.fStatistic,
          pvalue: result.factor1.pValue,
          df: result.factor1.df
        },
        factor2: {
          name: factor2Name,
          fStatistic: result.factor2.fStatistic,
          pvalue: result.factor2.pValue,
          df: result.factor2.df
        },
        interaction: {
          fStatistic: result.interaction.fStatistic,
          pvalue: result.interaction.pValue,
          df: result.interaction.df
        }
      },
      visualizationData: {
        type: 'interaction-plot',
        data: formattedData
      },
      rawResults: result
    }
  }

  const byGroup = data.arrays.byGroup || {}
  const groupNames = Object.keys(byGroup)
  const groups = Object.values(byGroup) as number[][]

  if (groups.length < 2) {
    throw new Error('ANOVA를 위해 최소 2개 그룹이 필요합니다')
  }

  // 각 그룹에 최소 2개 이상의 관측치 필요
  const insufficientGroups = groupNames.filter((name, i) => groups[i].length < 2)
  if (insufficientGroups.length > 0) {
    const details = groupNames.map((name, i) => `"${name}": ${groups[i].length}개`).join(', ')
    throw new Error(
      `각 그룹에 최소 2개 이상의 관측치가 필요합니다. 현재: ${details}. ` +
      '그룹 변수와 종속 변수가 올바르게 선택되었는지 확인하세요.'
    )
  }

  // Games-Howell 직접 호출 (사후검정만)
  if (method.id === 'games-howell') {
    const ghResult = await pyodideStats.gamesHowellTest(groups, groupNames)
    const significantCount = ghResult.significant_count || 0
    const postHoc = normalizePostHocComparisons(ghResult.comparisons)

    return {
      metadata: {
        method: method.id,
        methodName: method.name,
        timestamp: '',
        duration: 0,
        dataInfo: {
          totalN: groups.reduce((sum, g) => sum + g.length, 0),
          missingRemoved: 0,
          groups: groups.length
        }
      },
      mainResults: {
        statistic: significantCount,
        pvalue: ghResult.comparisons?.[0]?.pValue || 1,
        df: 0,
        significant: significantCount > 0,
        interpretation: significantCount > 0 ?
          `${significantCount}개의 유의한 차이가 발견되었습니다` :
          '유의한 차이가 없습니다'
      },
      additionalInfo: {
        postHoc,
        postHocMethod: 'games-howell',
      },
      visualizationData: {
        type: 'boxplot-multiple',
        data: groups.map((g, i) => ({
          values: g,
          label: groupNames[i] || `Group ${i + 1}`
        }))
      },
      rawResults: ghResult
    }
  }

  // ANCOVA: 공변량이 있는 경우 — Worker2 ancova_analysis() 사용 (postHoc 포함)
  if (method.id === 'ancova' && data.arrays.covariate && data.arrays.covariate.length > 0) {
    // VariableMapping 호환: dependentVar/dependent, groupVar/group 모두 지원
    const rawDep = data.variables.dependent || data.variables.dependentVar
    const dependentVar = rawDep
      ? (Array.isArray(rawDep) ? (rawDep as string[])[0] : rawDep as string)
      : ''
    const groupVar = (data.variables.group || data.variables.groupVar) as string
    const rawCov = data.variables.covariate
    const covariateVars = Array.isArray(rawCov)
      ? (rawCov as string[])
      : [rawCov as string]

    // Worker2는 행 단위 딕셔너리 배열을 받음 — 유효한 행만 필터 + 숫자 필드 정제
    const numericFields = [dependentVar, ...covariateVars]
    const validRows: Array<Record<string, unknown>> = []
    for (const row of data.data as Record<string, unknown>[]) {
      const yVal = Number(row[dependentVar])
      const gVal = row[groupVar]
      const covVals = covariateVars.map((col: string) => Number(row[col]))

      if (!isNaN(yVal) && gVal != null && covVals.every((v: number) => !isNaN(v))) {
        // 숫자형 필드를 명시적 Number로 변환 (문자열 "3" → 3, object dtype 방지)
        const cleanRow: Record<string, unknown> = { ...row }
        for (const field of numericFields) {
          cleanRow[field] = Number(row[field])
        }
        validRows.push(cleanRow)
      }
    }

    if (validRows.length === 0) {
      throw new Error('ANCOVA: 모든 변수에 유효한 값이 있는 행이 없습니다')
    }

    // validRows 기준 그룹 재검증 (공변량 필터링으로 그룹이 사라질 수 있음)
    const validByGroup: Record<string, number> = {}
    for (const row of validRows) {
      const g = String(row[groupVar])
      validByGroup[g] = (validByGroup[g] || 0) + 1
    }
    const validGroupNames = Object.keys(validByGroup)
    if (validGroupNames.length < 2) {
      throw new Error(
        `ANCOVA: 유효한 데이터 기준 그룹이 ${validGroupNames.length}개뿐입니다 (최소 2개 필요). ` +
        `공변량에 결측값이 많은 그룹이 있는지 확인하세요.`
      )
    }
    const tooSmallGroups = validGroupNames.filter(g => validByGroup[g] < 2)
    if (tooSmallGroups.length > 0) {
      const details = validGroupNames.map(g => `"${g}": ${validByGroup[g]}개`).join(', ')
      throw new Error(
        `ANCOVA: 유효한 데이터 기준 일부 그룹의 관측치가 2개 미만입니다. 현재: ${details}. ` +
        `공변량에 결측값이 많은 그룹이 있는지 확인하세요.`
      )
    }

    const ancovaResult = await pyodideStats.ancovaAnalysisWorker(
      dependentVar, [groupVar], covariateVars, validRows
    )

    const mainEffect = ancovaResult.mainEffects?.[0]
    const postHoc = normalizePostHocComparisons(ancovaResult.postHoc ?? [])

    return {
      metadata: {
        method: method.id,
        methodName: method.name,
        timestamp: '',
        duration: 0,
        dataInfo: {
          totalN: validRows.length,
          missingRemoved: (data.data as unknown[]).length - validRows.length,
          groups: validGroupNames.length
        }
      },
      mainResults: {
        statistic: mainEffect?.statistic ?? 0,
        pvalue: mainEffect?.pValue ?? 1,
        df: mainEffect?.degreesOfFreedom as [number, number] | undefined,
        significant: (mainEffect?.pValue ?? 1) < 0.05,
        interpretation: (mainEffect?.pValue ?? 1) < 0.05 ?
          `공변량 통제 후 그룹 간 유의한 차이가 있습니다 (F=${(mainEffect?.statistic ?? 0).toFixed(2)})` :
          '공변량 통제 후 그룹 간 유의한 차이가 없습니다'
      },
      additionalInfo: {
        postHoc,
        postHocMethod: 'bonferroni',
        effectSize: mainEffect ? {
          type: 'partial-eta-squared',
          value: mainEffect.partialEtaSquared,
          interpretation: interpretEtaSquared(mainEffect.partialEtaSquared)
        } : undefined,
        adjustedMeans: ancovaResult.adjustedMeans,
        modelFit: ancovaResult.modelFit,
        // result-transformer 호환: top-level로 평탄화
        rSquared: ancovaResult.modelFit?.rSquared,
        adjustedRSquared: ancovaResult.modelFit?.adjustedRSquared,
        rmse: ancovaResult.modelFit?.rmse,
      },
      visualizationData: {
        type: 'boxplot-multiple',
        // validRows 기준으로 시각화 데이터 생성 (분석 대상과 일치)
        data: validGroupNames.map(gName => ({
          values: validRows
            .filter(r => String(r[groupVar]) === gName)
            .map(r => Number(r[dependentVar])),
          label: gName
        }))
      },
      rawResults: {
        ...ancovaResult,
        covariatesCount: covariateVars.length
      }
    }
  }

  // 반복측정 ANOVA: within 요인이 있는 경우
  if (method.id === 'repeated-measures-anova' && data.arrays.within && data.arrays.within.length > 0) {
    // 행 단위로 모든 시점에 유효한 값이 있는 피험자만 포함
    const withinVars = data.variables.within as string[]
    const nTimePoints = withinVars.length
    const rawData = data.data as Record<string, unknown>[]

    // 모든 시점에 유효한 값이 있는 행만 수집
    const validMatrix: number[][] = []
    for (const row of rawData) {
      const values = withinVars.map(col => Number(row[col]))
      if (values.every(v => !isNaN(v))) {
        validMatrix.push(values)
      }
    }

    if (validMatrix.length === 0) {
      throw new Error('반복측정 ANOVA: 모든 시점에 유효한 값이 있는 피험자가 없습니다')
    }

    // validMatrix는 이미 [subject][timepoint] 형태
    const dataMatrix = validMatrix
    const nSubjects = dataMatrix.length

    const subjectIds = Array.from({ length: nSubjects }, (_, i) => `S${i + 1}`)
    const timeLabels = data.withinFactors || Array.from({ length: nTimePoints }, (_, i) => `T${i + 1}`)

    // Worker 실제 반환 타입으로 캐스팅 (pyodide-statistics.ts 선언과 다름)
    const rmResult = await pyodideStats.repeatedMeasuresAnovaWorker(
      dataMatrix,
      subjectIds,
      timeLabels
    )

    const dfValue = rmResult.df.numerator

    return {
      metadata: {
        method: method.id,
        methodName: method.name,
        timestamp: '',
        duration: 0,
        dataInfo: {
          totalN: nSubjects * nTimePoints,
          missingRemoved: 0,
          groups: nTimePoints
        }
      },
      mainResults: {
        statistic: rmResult.fStatistic,
        pvalue: rmResult.pValue,
        df: dfValue,
        significant: rmResult.pValue < 0.05,
        interpretation: rmResult.pValue < 0.05 ?
          `시간에 따른 유의한 변화가 있습니다 (F=${rmResult.fStatistic.toFixed(2)})` :
          '시간에 따른 유의한 변화가 없습니다'
      },
      additionalInfo: {},
      visualizationData: {
        type: 'line',
        data: {
          labels: timeLabels,
          // dataMatrix는 [subject][timepoint] 형태이므로 각 시점별 평균 계산
          means: Array.from({ length: nTimePoints }, (_, t) => {
            const values = dataMatrix.map(subject => subject[t])
            return values.reduce((a, b) => a + b, 0) / values.length
          })
        }
      },
      rawResults: {
        ...rmResult,
        subjects: nSubjects,
        timePoints: nTimePoints
      }
    }
  }

  // MANOVA: 다변량 분산분석
  if (method.id === 'manova') {
    const depVarNames = (data.variables.dependent as string[]) ?? []
    const groupVarName = (data.variables.group as string) ?? (data.variables.independent as string)
    const rawRows = data.data as Array<Record<string, unknown>>

    if (depVarNames.length < 2) {
      throw new Error('MANOVA를 위해 최소 2개의 종속변수가 필요합니다')
    }
    if (!groupVarName) {
      throw new Error('MANOVA를 위해 그룹(독립) 변수가 필요합니다')
    }

    const dataMatrix = depVarNames.map(varName =>
      rawRows.map(row => Number(row[varName]) || 0)
    )
    const groupValues = rawRows.map(row => row[groupVarName] as string | number)

    const manovaResult = await pyodideStats.manovaWorker(dataMatrix, groupValues, depVarNames)

    return {
      metadata: {
        method: method.id,
        methodName: method.name,
        timestamp: '',
        duration: 0,
        dataInfo: {
          totalN: rawRows.length,
          missingRemoved: 0,
          groups: new Set(groupValues).size
        }
      },
      mainResults: {
        statistic: manovaResult.fStatistic,
        pvalue: manovaResult.pValue,
        df: 0,
        significant: manovaResult.pValue < 0.05,
        interpretation: manovaResult.pValue < 0.05
          ? `그룹 간 다변량 차이가 유의합니다 (Wilks' λ=${manovaResult.wilksLambda.toFixed(4)}, F=${manovaResult.fStatistic.toFixed(2)})`
          : '그룹 간 다변량 차이가 유의하지 않습니다'
      },
      additionalInfo: {
        wilksLambda: manovaResult.wilksLambda,
        dependentVariables: depVarNames,
      },
      visualizationData: {
        type: 'boxplot-multiple',
        data: depVarNames.map(varName => ({
          values: rawRows.map(row => Number(row[varName]) || 0),
          label: varName
        }))
      },
      rawResults: manovaResult
    }
  }

  // Mixed Model: 혼합 모형
  if (method.id === 'mixed-model') {
    const depVarName = ((data.variables.dependent as string[]) ?? [])[0] ?? ''
    const fixedFactors = Array.isArray(data.variables.independent)
      ? (data.variables.independent as string[])
      : [(data.variables.group as string) ?? '']
    const randomFactors = (data.variables.blocking as string[] | undefined) ?? []
    const rawRows = data.data as Array<Record<string, unknown>>

    if (!depVarName) {
      throw new Error('혼합 모형을 위해 종속변수가 필요합니다')
    }
    if (fixedFactors.length === 0 || !fixedFactors[0]) {
      throw new Error('혼합 모형을 위해 최소 1개의 고정 효과 변수가 필요합니다')
    }

    const mixedResult = await pyodideStats.mixedModelAnalysis(
      depVarName, fixedFactors, randomFactors, rawRows
    )

    const mixedPValue = typeof mixedResult.pValue === 'number' ? mixedResult.pValue : 1
    const mixedFStat = typeof mixedResult.fStatistic === 'number' ? mixedResult.fStatistic : 0

    return {
      metadata: {
        method: method.id,
        methodName: method.name,
        timestamp: '',
        duration: 0,
        dataInfo: {
          totalN: data.totalN,
          missingRemoved: 0,
        }
      },
      mainResults: {
        statistic: mixedFStat,
        pvalue: mixedPValue,
        df: 0,
        significant: mixedPValue < 0.05,
        interpretation: mixedPValue < 0.05
          ? `고정 효과가 유의합니다 (F=${mixedFStat.toFixed(2)})`
          : '고정 효과가 유의하지 않습니다'
      },
      additionalInfo: {
        fixedEffects: fixedFactors,
        randomEffects: randomFactors,
        ...mixedResult,
      },
      visualizationData: {
        type: 'boxplot-multiple',
        data: rawRows
      },
      rawResults: mixedResult
    }
  }

  const result = await pyodideStats.anova(groups, {
    type: method.id === 'two-way-anova' ? 'two-way' : 'one-way'
  })

  // 유의한 경우 사후검정
  // Games-Howell: 이분산 가정 (등분산 가정 불필요) - 더 robust
  // Tukey HSD: 등분산 가정 (fallback)
  let postHoc: ReturnType<typeof normalizePostHocComparisons> | undefined
  let postHocMethod: string | undefined
  if (result.pValue < 0.05 && groups.length > 2) {
    try {
      // Games-Howell 사용 (이분산에 robust)
      const ghResult = await pyodideStats.gamesHowellTest(groups, groupNames)
      postHoc = normalizePostHocComparisons(ghResult?.comparisons)
      postHocMethod = 'games-howell'
    } catch (ghError) {
      logger.warn('Games-Howell 사후검정 실패, Tukey HSD로 시도합니다', ghError)
      try {
        const tukeyResult = await pyodideStats.tukeyHSDWorker(groups)
        postHoc = normalizePostHocComparisons(tukeyResult?.comparisons)
        postHocMethod = 'tukey'
      } catch (tukeyError) {
        logger.warn('Tukey HSD 사후검정 실패, Bonferroni로 시도합니다', tukeyError)
        try {
          const bonferroniResult = await pyodideStats.performBonferroni(groups, groupNames)
          postHoc = normalizePostHocComparisons(bonferroniResult.comparisons)
          postHocMethod = 'bonferroni'
        } catch (bonferroniError) {
          logger.warn('Bonferroni 사후검정도 실패, 사후검정 없이 진행합니다', bonferroniError)
          postHoc = undefined
          postHocMethod = undefined
        }
      }
    }
  }

  return {
    metadata: {
      method: method.id,
      methodName: method.name,
      timestamp: '',
      duration: 0,
      dataInfo: {
        totalN: groups.reduce((sum, g) => sum + g.length, 0),
        missingRemoved: 0,
        groups: groups.length
      }
    },
    mainResults: {
      statistic: result.fStatistic,
      pvalue: result.pValue,
      df: Array.isArray(result.df) ? result.df as [number, number] : result.df,
      significant: result.pValue < 0.05,
      interpretation: result.pValue < 0.05 ?
        `그룹 간 유의한 차이가 있습니다 (F=${result.fStatistic.toFixed(2)})` :
        '그룹 간 유의한 차이가 없습니다'
    },
    additionalInfo: {
      effectSize: {
        type: 'eta-squared',
        value: result.etaSquared || 0,
        interpretation: interpretEtaSquared(result.etaSquared || 0)
      },
      postHoc: postHoc,
      postHocMethod,
    },
    visualizationData: {
      type: 'boxplot-multiple',
      data: groups.map((g, i) => ({
        values: g,
        label: groupNames[i] || `Group ${i + 1}`
      }))
    },
    rawResults: result
  }
}
