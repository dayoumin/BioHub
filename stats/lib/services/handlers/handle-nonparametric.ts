import { pyodideStats } from '../pyodide/pyodide-statistics'
import type { StatisticalMethod } from '@/types/analysis'
import type { PreparedData, StatisticalExecutorResult } from '../statistical-executor'

export async function handleNonparametric(method: StatisticalMethod, data: PreparedData): Promise<StatisticalExecutorResult> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let result: any
  // proportion-test 전용 메타 (additionalInfo + visualizationData 빌드에 사용)
  let proportionTestMeta: {
    nullProportion: number
    successCount: number
    totalCount: number
    freqCounts: Record<string, number>
  } | undefined

  switch (method.id) {
    case 'mann-whitney': {
      const byGroup = data.arrays.byGroup || {}
      const mwGroupNames = Object.keys(byGroup)
      const mwGroups = Object.values(byGroup) as number[][]

      // 데이터 검증
      if (mwGroups.length !== 2) {
        const groupsLabel = mwGroupNames.length > 0 ? mwGroupNames.map(name => `"${name}"`).join(', ') : '(없음)'
        throw new Error(
          `Mann-Whitney U 검정을 위해 정확히 2개 그룹이 필요합니다. 현재: ${mwGroups.length}개 (${groupsLabel}). ` +
          '그룹 변수 선택이 올바른지 확인하세요.'
        )
      }
      if (mwGroups[0].length < 2 || mwGroups[1].length < 2) {
        const details = mwGroupNames.length >= 2
          ? `그룹 "${mwGroupNames[0]}": ${mwGroups[0]?.length || 0}개, 그룹 "${mwGroupNames[1]}": ${mwGroups[1]?.length || 0}개`
          : `그룹 1: ${mwGroups[0]?.length || 0}개, 그룹 2: ${mwGroups[1]?.length || 0}개`
        throw new Error(
          `각 그룹에 최소 2개 이상의 관측치가 필요합니다. 현재: ${details}. ` +
          '그룹 변수와 종속 변수가 올바르게 선택되었는지 확인하세요.'
        )
      }

      const mwResult = await pyodideStats.mannWhitneyTestWorker(mwGroups[0], mwGroups[1])
      result = { statistic: mwResult.statistic, pvalue: mwResult.pValue }
      break
    }
    case 'wilcoxon': {
      const wilcoxonGroup1 = data.arrays.dependent || []
      const wilcoxonGroup2 = data.arrays.independent?.[0]
      if (!wilcoxonGroup2 || wilcoxonGroup2.length === 0) {
        throw new Error('Wilcoxon 부호순위 검정에는 대응된 두 그룹이 필요합니다. 종속변수와 독립변수를 모두 선택하세요.')
      }
      if (wilcoxonGroup1.length !== wilcoxonGroup2.length) {
        throw new Error(`Wilcoxon 검정: 두 그룹의 크기가 같아야 합니다 (${wilcoxonGroup1.length} vs ${wilcoxonGroup2.length})`)
      }
      const wilcoxonResult = await pyodideStats.wilcoxonTestWorker(wilcoxonGroup1, wilcoxonGroup2)
      result = { statistic: wilcoxonResult.statistic, pvalue: wilcoxonResult.pValue }
      break
    }
    case 'kruskal-wallis': {
      const kwByGroup = data.arrays.byGroup || {}
      const kwGroupNames = Object.keys(kwByGroup)
      const kwGroups = Object.values(kwByGroup) as number[][]

      // 데이터 검증
      if (kwGroups.length < 2) {
        throw new Error('Kruskal-Wallis 검정을 위해 최소 2개 그룹이 필요합니다')
      }
      const insufficientKwGroups = kwGroupNames.filter((_, i) => kwGroups[i].length < 2)
      if (insufficientKwGroups.length > 0) {
        const details = kwGroupNames.map((name, i) => `"${name}": ${kwGroups[i].length}개`).join(', ')
        throw new Error(
          `각 그룹에 최소 2개 이상의 관측치가 필요합니다. 현재: ${details}. ` +
          '그룹 변수와 종속 변수가 올바르게 선택되었는지 확인하세요.'
        )
      }

      const kwResult = await pyodideStats.kruskalWallisTestWorker(kwGroups)
      result = { statistic: kwResult.statistic, pvalue: kwResult.pValue, df: kwResult.df }
      break
    }
    case 'friedman': {
      const frResult = await pyodideStats.friedmanTestWorker(data.arrays.independent || [])
      result = { statistic: frResult.statistic, pvalue: frResult.pValue, df: frResult.df }
      break
    }
    case 'sign-test': {
      const signResult = await pyodideStats.signTestWorker(
        data.arrays.dependent || [],
        data.arrays.independent?.[0] || []
      )
      result = {
        statistic: signResult.statistic,
        pvalue: signResult.pValue,
        nPositive: signResult.nPositive,
        nNegative: signResult.nNegative
      }
      break
    }
    case 'mcnemar': {
      // 2x2 분할표: 미리 구성된 값 또는 independentVar/dependentVar에서 자동 구성
      let contingencyTable = data.arrays.contingencyTable
      if (!contingencyTable) {
        // ChiSquareSelector가 보내는 independentVar/dependentVar로 교차표 구성
        const rowCol = data.variables.independentVar ?? data.variables.independent
        const colCol = data.variables.dependentVar ?? data.variables.dependent
        if (rowCol && colCol && data.data.length > 0) {
          const rowName = Array.isArray(rowCol) ? String(rowCol[0]) : String(rowCol)
          const colName = Array.isArray(colCol) ? String(colCol[0]) : String(colCol)
          // 고유값 추출 (이진이어야 하므로 최대 2개)
          const rowVals = [...new Set(data.data.map(r => String(r[rowName])))]
          const colVals = [...new Set(data.data.map(r => String(r[colName])))]
          if (rowVals.length === 2 && colVals.length === 2) {
            const ct = [[0, 0], [0, 0]]
            for (const row of data.data) {
              const ri = rowVals.indexOf(String(row[rowName]))
              const ci = colVals.indexOf(String(row[colName]))
              if (ri >= 0 && ci >= 0) ct[ri][ci]++
            }
            contingencyTable = ct
          }
        }
      }
      if (!contingencyTable || contingencyTable.length !== 2 || contingencyTable[0]?.length !== 2) {
        throw new Error('McNemar 검정에는 2×2 교차표가 필요합니다. 두 개의 이진 변수를 선택하세요.')
      }
      const mcnemarResult = await pyodideStats.mcnemarTestWorker(contingencyTable)
      result = {
        statistic: mcnemarResult.statistic,
        pvalue: mcnemarResult.pValue
      }
      break
    }
    case 'cochran-q': {
      // 이진 데이터 행렬 필요
      const dataMatrix = data.arrays.independent || []
      const cochranResult = await pyodideStats.cochranQTestWorker(dataMatrix)
      result = {
        statistic: cochranResult.qStatistic,
        pvalue: cochranResult.pValue,
        df: cochranResult.df
      }
      break
    }
    case 'binomial-test': {
      const successCount = Number(data.variables?.successCount) || 0
      const totalCount = data.totalN || 1
      const probability = Number(data.variables?.probability) || 0.5
      const binomialResult = await pyodideStats.binomialTestWorker(
        successCount,
        totalCount,
        probability
      )
      result = {
        statistic: binomialResult.successCount,
        pvalue: binomialResult.pValue,
        proportion: binomialResult.successCount / binomialResult.totalCount
      }
      break
    }
    case 'runs-test': {
      const sequence = data.arrays.dependent || []
      const runsResult = await pyodideStats.runsTestWorker(sequence)
      result = {
        statistic: runsResult.zStatistic,
        pvalue: runsResult.pValue,
        nRuns: runsResult.nRuns,
        expectedRuns: runsResult.expectedRuns
      }
      break
    }
    case 'ks-test': {
      // pyodideStats 래퍼 사용
      const values1 = data.arrays.dependent || []
      const values2 = data.arrays.independent?.[0]

      if (values2 && values2.length > 0) {
        // 이표본 K-S 검정
        const ksResult = await pyodideStats.ksTestTwoSample(values1, values2)
        result = { statistic: ksResult.statistic, pvalue: ksResult.pValue }
      } else {
        // 일표본 K-S 검정 (정규성)
        const ksResult = await pyodideStats.ksTestOneSample(values1)
        result = { statistic: ksResult.statistic, pvalue: ksResult.pValue }
      }
      break
    }
    case 'mood-median': {
      const moodByGroup = data.arrays.byGroup || {}
      const moodGroupNames = Object.keys(moodByGroup)
      const moodGroups = Object.values(moodByGroup) as number[][]

      // 데이터 검증
      if (moodGroups.length < 2) {
        throw new Error('Mood Median 검정을 위해 최소 2개 그룹이 필요합니다')
      }
      const insufficientMoodGroups = moodGroupNames.filter((_, i) => moodGroups[i].length < 2)
      if (insufficientMoodGroups.length > 0) {
        const details = moodGroupNames.map((name, i) => `"${name}": ${moodGroups[i].length}개`).join(', ')
        throw new Error(
          `각 그룹에 최소 2개 이상의 관측치가 필요합니다. 현재: ${details}. ` +
          '그룹 변수와 종속 변수가 올바르게 선택되었는지 확인하세요.'
        )
      }

      const moodResult = await pyodideStats.moodMedianTestWorker(moodGroups)
      result = {
        statistic: moodResult.statistic,
        pvalue: moodResult.pValue,
        grandMedian: moodResult.grandMedian
      }
      break
    }
    case 'proportion-test': {
      // successCount: 명시적 숫자 값 우선, 없으면 dependentVar에서 자동 계산
      const parsedSuccessCount = Number(data.variables?.successCount)
      let successCount = Number.isFinite(parsedSuccessCount) ? parsedSuccessCount : undefined
      const rawSuccessLabel = data.variables?.successLabel
      let successLabel = typeof rawSuccessLabel === 'string' ? rawSuccessLabel : undefined
      const totalCount = data.totalN || 1
      // nullProportion: variableMapping에 string으로 저장 → float 파싱 (기본 0.5)
      const nullProportion = parseFloat(String(data.variables?.nullProportion ?? '')) || 0.5
      let freqCounts: Record<string, number> = {}

      if (successCount === undefined) {
        // dependentVar에서 success 기준값 자동 결정: positive 키워드 우선, 없으면 사전순 후순위 (1/yes/true 계열)
        const POSITIVE_KEYWORDS = new Set(['1', 'yes', 'y', 'true', 't', 'success', 'positive', '성공', '예', '참', '양성'])
        const depCol = data.variables.dependentVar ?? data.variables.dependent
        if (depCol && data.data.length > 0) {
          const colName = Array.isArray(depCol) ? String(depCol[0]) : String(depCol)
          const values = data.data.map(r => String(r[colName]))
          // 시각화용 빈도 테이블
          for (const v of values) {
            freqCounts[v] = (freqCounts[v] ?? 0) + 1
          }
          const uniqueVals = [...new Set(values)].sort()
          if (uniqueVals.length >= 1) {
            // positive 키워드 먼저, 없으면 사전순 마지막 값 ("yes" > "no", "1" > "0" 등)
            const successVal =
              uniqueVals.find(v => POSITIVE_KEYWORDS.has(v.toLowerCase())) ??
              uniqueVals[uniqueVals.length - 1]
            successCount = values.filter(v => v === successVal).length
            successLabel = successVal
          }
        }
      } else {
        // 명시적 successCount 제공 시: 이진 빈도 테이블 (success / 기타)
        const label = successLabel ?? '성공'
        freqCounts = {
          [label]: successCount,
          '기타': totalCount - successCount
        }
      }

      const propResult = await pyodideStats.oneSampleProportionTest(
        successCount ?? 0,
        totalCount,
        nullProportion
      )
      result = {
        statistic: propResult.zStatistic,
        pvalue: propResult.pValueExact,
        proportion: propResult.sampleProportion,
        ...(successLabel !== undefined && { successLabel })
      }
      proportionTestMeta = { nullProportion, successCount: successCount ?? 0, totalCount, freqCounts }
      break
    }
    default:
      throw new Error(`지원되지 않는 비모수 검정: ${method.id}`)
  }

  return {
    metadata: {
      method: method.id,
      methodName: method.name,
      timestamp: '',
      duration: 0,
      dataInfo: {
        totalN: data.totalN,
        missingRemoved: 0
      }
    },
    mainResults: {
      statistic: result.statistic,
      pvalue: result.pvalue,
      df: result.df,
      significant: result.pvalue < 0.05,
      interpretation: (() => {
        if (method.id === 'proportion-test') {
          const suffix = result.successLabel ? ` (성공 기준: ${result.successLabel})` : ''
          return result.pvalue < 0.05
            ? `표본 비율이 귀무가설 비율과 유의하게 다릅니다${suffix}`
            : `표본 비율이 귀무가설 비율과 유의하게 다르지 않습니다${suffix}`
        }
        return result.pvalue < 0.05
          ? '그룹 간 유의한 차이가 있습니다 (비모수)'
          : '그룹 간 유의한 차이가 없습니다'
      })()
    },
    additionalInfo: proportionTestMeta
      ? {
          sampleProportion: result.proportion,
          nullProportion: proportionTestMeta.nullProportion,
          successCount: proportionTestMeta.successCount,
          totalN: proportionTestMeta.totalCount
        }
      : {},
    visualizationData: {
      type: proportionTestMeta ? 'bar' : 'boxplot',
      data: proportionTestMeta ? proportionTestMeta.freqCounts : data.arrays.byGroup
    },
    rawResults: result
  }
}
