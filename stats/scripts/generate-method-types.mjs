/**
 * Methods Registry Code Generator (Phase 2)
 *
 * methods-registry.json에서 TypeScript 타입을 자동 생성합니다.
 *
 * 사용법:
 *   node scripts/generate-method-types.mjs
 *
 * 생성 파일:
 *   - lib/generated/method-types.generated.ts
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Registry 로드
const registryPath = join(__dirname, '../lib/constants/methods-registry.json')
const registry = JSON.parse(readFileSync(registryPath, 'utf8'))

// 출력 경로
const outputDir = join(__dirname, '../lib/generated')
const outputPath = join(outputDir, 'method-types.generated.ts')

/**
 * 파라미터 이름을 TypeScript 타입으로 변환
 */
function paramToType(param) {
  const optional = param.endsWith('?')
  const name = optional ? param.slice(0, -1) : param

  // 파라미터 이름으로 타입 추론
  // 주의: 구체적 규칙이 일반적 규칙보다 먼저 와야 함!
  let type = 'unknown'

  // ========================================
  // 1. 구체적 명시 매핑 (우선순위 높음)
  // ========================================

  // 2D 행렬 (number[][])
  if (name === 'observedMatrix' || name === 'contingencyTable' ||
    name === 'itemsMatrix' || name === 'table' || name === 'covariateData' ||
    name === 'X') {
    type = 'number[][]'
  }
  // 그룹/요인 값 (string | number 혼합 가능)
  else if (name === 'groupValues' || name === 'factor1Values' || name === 'factor2Values') {
    type = '(string | number)[]'
  }
  // 교차분석 행/열 값
  else if (name === 'rowValues' || name === 'colValues') {
    type = '(string | number)[]'
  }
  // 그룹 배열 (Levene, Bartlett 등에서 사용)
  else if (name === 'groups') {
    type = 'number[][] | number[]'
  }
  // 식별자/레이블 배열
  else if (name === 'controlIndices' || name === 'subjectIds' || name === 'timeLabels') {
    type = '(string | number)[]'
  }
  // 문자열 배열
  else if (name === 'groupLabels' || name === 'varNames' || name === 'variableNames' || name === 'covariateNames') {
    type = 'string[]'
  }
  // 숫자 배열 (1D)
  else if (name === 'data') {
    type = 'number[] | number[][]'
  }
  else if (name === 'x' || name === 'y' || name === 'residuals') {
    type = 'number[]'
  }
  else if (name === 'group1' || name === 'group2' || name === 'values1' || name === 'values2') {
    type = 'number[]'
  }
  else if (name === 'before' || name === 'after' || name === 'sequence') {
    type = 'number[]'
  }
  else if (name === 'times' || name === 'events') {
    type = 'number[]'
  } else if (name === 'covariates') {
    type = 'number[] | number[][]'
  }
  else if (name === 'pValues' || name === 'observed' || name === 'expected') {
    type = 'number[]'
  }
  else if (name === 'initialGuess') {
    type = 'number[] | null'
  }
  // 숫자 스칼라
  else if (
    name === 'alpha' ||
    name === 'probability' ||
    name === 'popmean' ||
    name === 'popstd' ||
    name === 'mean' ||
    name === 'std' ||
    name === 'mean1' ||
    name === 'mean2' ||
    name === 'std1' ||
    name === 'std2' ||
    name === 'meanDiff' ||
    name === 'stdDiff'
  ) {
    type = 'number'
  }
  else if (name === 'nComponents' || name === 'nFactors' || name === 'numClusters' || name === 'nClusters') {
    type = 'number'
  }
  else if (
    name === 'successCount' ||
    name === 'totalCount' ||
    name === 'xIdx' ||
    name === 'yIdx' ||
    name === 'n' ||
    name === 'n1' ||
    name === 'n2' ||
    name === 'nPairs'
  ) {
    type = 'number'
  }
  else if (name === 'entryThreshold' || name === 'stayThreshold' || name === 'nullProportion') {
    type = 'number'
  }
  else if (name === 'seasonalPeriods' || name === 'forecastPeriods') {
    type = 'number'
  }
  else if (name === 'power' || name === 'effectSize' || name === 'sampleSize' || name === 'sides') {
    type = 'number'
  }
  else if (name === 'confidenceLevel') {
    type = 'number'
  }
  // 불린
  else if (name === 'equalVar' || name === 'yatesCorrection') {
    type = 'boolean'
  }
  // 문자열
  else if (name === 'method' || name === 'alternative' || name === 'rotation' ||
    name === 'linkage' || name === 'distance') {
    type = 'string'
  }
  else if (name === 'modelType' || name === 'testType' || name === 'analysisType' || name === 'pAdjust') {
    type = 'string'
  }
  else if (name === 'dependentVar' || name === 'factorVar') {
    type = 'string'
  }

  // ========================================
  // 2. 일반적 패턴 매칭 (우선순위 낮음)
  // ========================================

  // Matrix로 끝나는 것은 2D 배열
  else if (name.endsWith('Matrix') || name.endsWith('matrix')) {
    type = 'number[][]'
  }
  // Values로 끝나는 것은 유연한 배열 (1D 또는 2D)
  else if (name.endsWith('Values') || name.endsWith('values')) {
    type = 'number[] | number[][]'
  }

  return { name, optional, type }
}

/**
 * 메서드별 타입 오버라이드 (key-name 추론이 부정확한 경우)
 * 동일 key가 메서드마다 다른 타입을 갖는 경우 사용
 */
const METHOD_TYPE_OVERRIDES = {
  'time_series_analysis': {
    'trend': 'number[]',         // decomposed trend component (not string)
    'adfStatistic': 'number',
    'adfPValue': 'number',
    'isStationary': 'boolean',
  },
  'cluster_analysis': {
    'nClusters': 'number',
    'clusterAssignments': 'number[]',
    'centroids': 'number[][]',
    'clusterSizes': 'number[]',
  },
  'two_way_anova': {
    'residual': '{ df: number; sumSq: number; meanSq: number; fStatistic: number; pValue: number }',
  },
  'logistic_regression': {
    'confusionMatrix': '{ tp: number; fp: number; tn: number; fn: number; precision: number; recall: number; f1Score: number }',
  },
  'mcnemar_test': {
    'discordantPairs': '{ b: number; c: number }',
  },
  'runs_test': {
    'zStatistic': 'number',
    'n1': 'number',
    'n2': 'number',
  },
  'linear_regression': {
    'stdErr': 'number',
    'slopeCi': '{ lower: number; upper: number }',
    'interceptCi': '{ lower: number; upper: number }',
    'slopeTValue': 'number',
    'interceptTValue': 'number',
    'confidenceInterval': '{ lower: number[]; upper: number[] }',
    'isSignificant': 'boolean',
  },
  // ========================================
  // Phase 5-2: unknown 타입 해소 오버라이드
  // ========================================
  'one_way_anova': {
    'ssBetween': 'number',
    'ssWithin': 'number',
    'ssTotal': 'number',
  },
  'wilcoxon_test': {
    'nobs': 'number',
    'zScore': 'number',
    'medianDiff': 'number',
  },
  't_test_paired_summary': {
    'stdDiff': 'number',
  },
  'partial_correlation': {
    'confidenceInterval': '{ lower: number; upper: number }',
  },
  'pca_analysis': {
    'components': 'Array<{ componentNumber: number; eigenvalue: number; varianceExplained: number; cumulativeVariance: number; loadings: Record<string, number> }>',
    'rotationMatrix': 'number[][]',
    'transformedData': 'Array<Record<string, number>>',
    'variableContributions': 'Record<string, number[]>',
    'qualityMetrics': '{ kmo: number | null; bartlett: { statistic: number | null; pValue: number | null; significant: boolean | null; error?: string } }',
    'screeData': 'Array<{ component: number; eigenvalue: number; varianceExplained: number }>',
  },
  'curve_estimation': {
    'parameters': 'number[]',
  },
  'nonlinear_regression': {
    'parameters': 'number[]',
  },
  'stepwise_regression': {
    'steps': 'Array<{ step: number; variable: string; action: string; rSquared: number }> | undefined',
  },
  'probit_regression': {
    'marginalEffects': 'number[] | undefined',
  },
  'discriminant_analysis': {
    'functions': 'Array<{ functionNumber: number; eigenvalue: number; varianceExplained: number; cumulativeVariance: number; canonicalCorrelation: number; coefficients: Record<string, number> }>',
    'groupCentroids': 'Array<{ group: string; centroids: Record<string, number> }>',
    'classificationResults': 'Array<{ originalGroup: string; predictedGroup: string; probability: number; correct: boolean }>',
    'confusionMatrix': 'Record<string, Record<string, number>>',
    'equalityTests': '{ boxM: { statistic: number; pValue: number; significant: boolean }; wilksLambda: { statistic: number; pValue: number; significant: boolean } }',
  },
  'repeated_measures_anova': {
    'df': '{ numerator: number; denominator: number }',
    'sphericity': 'Record<string, unknown>',
  },
}

/**
 * 반환값 키를 TypeScript 타입으로 변환
 */
function returnsToInterface(methodName, returns) {
  const interfaceName = `${toPascalCase(methodName)}Result`
  const overrides = METHOD_TYPE_OVERRIDES[methodName] || {}
  const fields = returns.map(key => {
    // 메서드별 오버라이드 우선 적용
    if (overrides[key]) {
      return `  ${key}: ${overrides[key]}`
    }
    let type = 'unknown'

    // ========================================
    // 1. 숫자 스칼라 (number)
    // ========================================

    // 통계량/검정
    if (key === 'pValue' || key === 'statistic' || key === 'correlation' || key === 'criticalValue') {
      type = 'number'
    } else if (key === 'pValueExact' || key === 'pValueApprox' || key === 'qStatistic') {
      type = 'number'
    }
    // 기술통계
    else if (key === 'mean' || key === 'median' || key === 'std' || key === 'variance') {
      type = 'number'
    } else if (key === 'mode' || key === 'min' || key === 'max' || key === 'q1' || key === 'q3' || key === 'iqr') {
      type = 'number'
    } else if (key === 'skewness' || key === 'kurtosis') {
      type = 'number'
    } else if (key === 'mean1' || key === 'mean2' || key === 'std1' || key === 'std2' || key === 'meanDiff') {
      type = 'number'
    } else if (key === 'sampleMean' || key === 'sampleStd' || key === 'standardError') {
      type = 'number'
    }
    // F/Chi/Z 통계량
    else if (key === 'fStatistic' || key === 'chiSquare' || key === 'zStatistic') {
      type = 'number'
    }
    // ANCOVA 그룹별 F/p 통계량, 반복측정 구형성 epsilon
    else if (key === 'fStatisticGroup' || key === 'pValueGroup' || key === 'sphericityEpsilon') {
      type = 'number'
    }
    // 자유도
    else if (key === 'df' || key === 'dfBetween' || key === 'dfWithin' || key === 'degreesOfFreedom') {
      type = 'number'
    }
    // 분석 메타
    else if (key === 'nFactors' || key === 'selectedFunctions' || key === 'selectedComponents') {
      type = 'number'
    } else if (key === 'totalVarianceExplained') {
      type = 'number'
    }
    // 효과 크기
    else if (key === 'cohensD' || key === 'etaSquared' || key === 'omegaSquared' || key === 'cramersV') {
      type = 'number'
    } else if (key === 'effectSize' || key === 'oddsRatio' || key === 'inertia') {
      type = 'number'
    }
    // 회귀 (스칼라)
    else if (key === 'rSquared' || key === 'adjRSquared' || key === 'adjustedRSquared' || key === 'slope' || key === 'intercept') {
      type = 'number'
    } else if (key === 'accuracy' || key === 'auc' || key === 'dispersion') {
      type = 'number'
    } else if (key === 'fPValue' || key === 'llrPValue' || key === 'residualStdError') {
      type = 'number'
    } else if (key === 'sensitivity' || key === 'specificity' || key === 'pseudoRSquared') {
      type = 'number'
    } else if (key === 'aic' || key === 'bic' || key === 'nObservations' || key === 'nPredictors') {
      type = 'number'
    }
    // 표본 크기
    else if (key === 'n' || key === 'n1' || key === 'n2' || key === 'nPairs' || key === 'total') {
      type = 'number'
    } else if (key === 'nItems' || key === 'nRespondents' || key === 'uniqueCount') {
      type = 'number'
    } else if (key === 'grandTotal' || key === 'grandMedian') {
      type = 'number'
    }
    // 비율/검정
    else if (key === 'proportion' || key === 'sampleProportion' || key === 'nullProportion' || key === 'expectedProportion') {
      type = 'number'
    } else if (key === 'successCount' || key === 'totalCount') {
      type = 'number'
    }
    // Runs test
    else if (key === 'nRuns' || key === 'expectedRuns' || key === 'nPositive' || key === 'nNegative' || key === 'nTies') {
      type = 'number'
    }
    // Cronbach Alpha
    else if (key === 'alpha' || key === 'correctedAlpha') {
      type = 'number'
    }
    // Kendall's Tau
    else if (key === 'tau' || key === 'concordance' || key === 'discordantPairs') {
      type = 'number'
    }
    // Power analysis
    else if (key === 'achievedPower' || key === 'requiredSampleSize') {
      type = 'number'
    }
    // Cluster
    else if (key === 'silhouetteScore') {
      type = 'number'
    }
    // Survival
    else if (key === 'medianSurvival') {
      type = 'number'
    }
    // MANOVA/Discriminant
    else if (key === 'wilksLambda') {
      type = 'number'
    }
    // Bounds
    else if (key === 'lowerBound' || key === 'upperBound') {
      type = 'number'
    }

    // ========================================
    // 2. 불린 (boolean)
    // ========================================
    else if (key === 'isNormal' || key === 'homogeneous' || key === 'significant' || key === 'reject') {
      type = 'boolean'
    } else if (key === 'equalVariance' || key === 'continuityCorrection') {
      type = 'boolean'
    }

    // ========================================
    // 3. 문자열 (string)
    // ========================================
    else if (key === 'interpretation' || key === 'method' || key === 'trend' || key === 'equation') {
      type = 'string'
    }

    // ========================================
    // 4. 숫자 배열 (number[])
    // ========================================
    else if (key === 'coefficients' || key === 'eigenvalues') {
      type = 'number[]'
    }
    // 회귀 배열
    else if (key === 'stdErrors' || key === 'tValues' || key === 'zValues') {
      type = 'number[]'
    } else if (key === 'ciLower' || key === 'ciUpper') {
      type = 'number[]'
    } else if (key === 'residuals' || key === 'fittedValues' || key === 'vif') {
      type = 'number[]'
    } else if (key === 'predictedClass') {
      type = 'number[]'
    }
    // 2D 숫자 배열 (명시적)
    else if (key === 'loadings') {
      type = 'number[][]'
    } else if (key === 'clusters' || key === 'predictions' || key === 'scores') {
      type = 'number[]'
    } else if (key.includes('forecast') || key === 'acf' || key === 'pacf' || key === 'seasonal' || key === 'residual') {
      type = 'number[]'
    } else if (key === 'frequencies' || key === 'percentages' || key === 'cumulativePercentages') {
      type = 'number[]'
    } else if (key === 'rowTotals' || key === 'colTotals') {
      type = 'number[]'
    } else if (key === 'adjustedPValues' || key === 'pValues') {
      type = 'number[]'
    } else if (key === 'observed' || key === 'expected') {
      type = 'number[]'
    } else if (key === 'outlierIndices' || key === 'outlierValues') {
      type = 'number[]'
    } else if (key === 'communalities' || key === 'explainedVariance' || key === 'cumulativeVariance') {
      type = 'number[]'
    } else if (key === 'explainedVarianceRatio') {
      type = 'number[]'
    } else if (key === 'totalVariance') {
      type = 'number'
    } else if (key === 'hazardRatios' || key === 'oddsRatios' || key === 'incidenceRateRatios') {
      type = 'number[]'
    } else if (key === 'survivalProbabilities' || key === 'survivalFunction' || key === 'thresholds') {
      type = 'number[]'
    } else if (key === 'nRisk' || key === 'events' || key === 'times') {
      type = 'number[]'
    } else if (key === 'adjustedMeans') {
      type = 'Array<{ group: string | number; mean: number }>'
    } else if (key === 'fStatisticCovariate' || key === 'pValueCovariate') {
      type = 'number[]'
    }

    // ========================================
    // 5. 2D 배열 (number[][])
    // ========================================
    else if (key === 'expectedMatrix' || key === 'observedMatrix' || key === 'confusionMatrix') {
      type = 'number[][]'
    } else if (key === 'centers' || key === 'components') {
      type = 'number[][]'
    }

    // ========================================
    // 6. 문자열 배열 (string[])
    // ========================================
    else if (key === 'categories' || key === 'rowCategories' || key === 'colCategories') {
      type = 'string[]'
    } else if (key === 'selectedVariables') {
      type = 'string[]'
    }

    // ========================================
    // 7. 객체/복합 타입
    // ========================================
    else if (key === 'confidenceIntervals') {
      type = '{ lower: number; upper: number }[]'
    } else if (key === 'confidenceInterval') {
      type = 'unknown' // Can be number[] or Record<string, number[]>
    } else if (key === 'comparisons' || key === 'significantResults') {
      type = 'Array<{ group1: string; group2: string; meanDiff?: number; pValue: number; significant: boolean }>'
    } else if (key === 'anovaTable' || key === 'descriptives' || key === 'equalityTests' || key === 'assumptions') {
      type = 'Record<string, unknown>'
    } else if (key === 'groupCentroids' || key === 'classificationResults') {
      type = 'unknown[]'
    } else if (key === 'rocCurve') {
      type = 'Array<{ fpr: number; tpr: number }>'
    } else if (key === 'factor1' || key === 'factor2' || key === 'interaction') {
      type = '{ fStatistic: number; pValue: number; df: number }'
    } else if (key === 'plotData') {
      type = '{ x: number[]; y: number[]; labels?: string[] }'
    } else if (key === 'steps' || key === 'functions' || key === 'marginalEffects' || key === 'parameters') {
      type = 'unknown[]'
    }

    return `  ${key}: ${type}`
  }).join('\n')

  return `export interface ${interfaceName} {\n${fields}\n}`
}

/**
 * snake_case를 PascalCase로 변환
 */
function toPascalCase(str) {
  return str
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join('')
}

/**
 * snake_case를 camelCase로 변환
 */
function toCamelCase(str) {
  const pascal = toPascalCase(str)
  return pascal.charAt(0).toLowerCase() + pascal.slice(1)
}

/**
 * 메서드별 파라미터 타입 오버라이드
 * key-name 추론이 부정확한 경우 사용
 */
const METHOD_PARAM_OVERRIDES = {
  'frequency_analysis': {
    'values': '(string | number)[]',
  },
  'runs_test': {
    'sequence': '(string | number)[]',
  },
  'discriminant_analysis': {
    'groups': '(string | number)[]',
  },
  'partial_correlation': {
    'controlIndices': 'number[]',
  },
}

/**
 * 메서드 래퍼 함수 생성
 */
function generateMethodWrapper(workerNum, methodName, definition) {
  const funcName = toCamelCase(methodName)
  const resultType = `${toPascalCase(methodName)}Result`
  const paramOverrides = METHOD_PARAM_OVERRIDES[methodName] || {}

  const params = definition.params.map(p => {
    const { name, optional, type } = paramToType(p)
    const finalType = paramOverrides[name] || type
    return `${name}${optional ? '?' : ''}: ${finalType}`
  }).join(', ')

  const paramNames = definition.params.map(p => {
    const { name } = paramToType(p)
    return name
  }).join(', ')

  return `
/**
 * ${definition.description}
 * @worker Worker ${workerNum}
 */
export async function ${funcName}(${params}): Promise<${resultType}> {
  return callWorkerMethod<${resultType}>(${workerNum}, '${methodName}', { ${paramNames} })
}`
}

// 메인 생성 로직
function generate() {
  const lines = []

  // 헤더
  lines.push(`/**
 * Auto-generated from methods-registry.json
 * DO NOT EDIT MANUALLY
 *
 * Generated: ${new Date().toISOString()}
 */

/* eslint-disable @typescript-eslint/no-unused-vars */

import { PyodideCoreService, type WorkerMethodParam } from '@/lib/services/pyodide/core/pyodide-core.service'

// ========================================
// Worker 번호 상수
// ========================================

export const WORKER = {
  DESCRIPTIVE: 1,
  HYPOTHESIS: 2,
  NONPARAMETRIC_ANOVA: 3,
  REGRESSION_ADVANCED: 4
} as const

export type WorkerNumber = typeof WORKER[keyof typeof WORKER]

/**
 * undefined 값을 제거한 파라미터 객체 생성
 */
function filterParams(params: Record<string, WorkerMethodParam | undefined>): Record<string, WorkerMethodParam> {
  const result: Record<string, WorkerMethodParam> = {}
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) {
      result[key] = value
    }
  }
  return result
}

/**
 * PyodideCore 싱글톤 인스턴스를 통해 Worker 메서드 호출
 */
async function callWorkerMethod<T>(
  workerNum: WorkerNumber,
  methodName: string,
  params: Record<string, WorkerMethodParam | undefined>
): Promise<T> {
  const core = PyodideCoreService.getInstance()
  return core.callWorkerMethod<T>(workerNum, methodName, filterParams(params))
}
`)

  // 각 Worker별 타입과 함수 생성
  for (const workerNum of [1, 2, 3, 4]) {
    const workerKey = `worker${workerNum}`
    const worker = registry[workerKey]

    lines.push(`
// ========================================
// Worker ${workerNum}: ${worker.name}
// ${worker.description}
// ========================================
`)

    // 결과 타입 인터페이스 생성
    for (const [methodName, definition] of Object.entries(worker.methods)) {
      lines.push(returnsToInterface(methodName, definition.returns))
      lines.push('')
    }

    // 래퍼 함수 생성
    for (const [methodName, definition] of Object.entries(worker.methods)) {
      lines.push(generateMethodWrapper(workerNum, methodName, definition))
    }
  }

  // 메서드 이름 유니온 타입
  lines.push(`
// ========================================
// 메서드 이름 유니온 타입
// ========================================
`)

  for (const workerNum of [1, 2, 3, 4]) {
    const workerKey = `worker${workerNum}`
    const worker = registry[workerKey]
    const methodNames = Object.keys(worker.methods).map(m => `'${m}'`).join(' | ')
    lines.push(`export type Worker${workerNum}Method = ${methodNames}`)
  }

  lines.push(`
export type AllMethodName = Worker1Method | Worker2Method | Worker3Method | Worker4Method
`)

  // 출력 디렉토리 생성
  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true })
  }

  // 파일 쓰기
  writeFileSync(outputPath, lines.join('\n'), 'utf8')

  // 통계 출력
  let totalMethods = 0
  for (const workerNum of [1, 2, 3, 4]) {
    const workerKey = `worker${workerNum}`
    totalMethods += Object.keys(registry[workerKey].methods).length
  }

  console.log(`Generated: ${outputPath}`)
  console.log(`  - Workers: 4`)
  console.log(`  - Methods: ${totalMethods}`)
}

// 실행
generate()
