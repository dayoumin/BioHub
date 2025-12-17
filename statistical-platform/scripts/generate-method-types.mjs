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
  else if (name === 'data' || name === 'x' || name === 'y' || name === 'residuals') {
    type = 'number[]'
  }
  else if (name === 'group1' || name === 'group2' || name === 'values1' || name === 'values2') {
    type = 'number[]'
  }
  else if (name === 'before' || name === 'after' || name === 'sequence') {
    type = 'number[]'
  }
  else if (name === 'times' || name === 'events' || name === 'covariates') {
    type = 'number[]'
  }
  else if (name === 'pValues' || name === 'observed' || name === 'expected') {
    type = 'number[]'
  }
  else if (name === 'initialGuess') {
    type = 'number[] | null'
  }
  // 숫자 스칼라
  else if (name === 'alpha' || name === 'probability' || name === 'popmean' || name === 'popstd') {
    type = 'number'
  }
  else if (name === 'nComponents' || name === 'nFactors' || name === 'numClusters') {
    type = 'number'
  }
  else if (name === 'successCount' || name === 'totalCount' || name === 'xIdx' || name === 'yIdx') {
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
 * 반환값 키를 TypeScript 타입으로 변환
 */
function returnsToInterface(methodName, returns) {
  const interfaceName = `${toPascalCase(methodName)}Result`
  const fields = returns.map(key => {
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
    // 자유도
    else if (key === 'df' || key === 'dfBetween' || key === 'dfWithin' || key === 'degreesOfFreedom') {
      type = 'number'
    }
    // 효과 크기
    else if (key === 'cohensD' || key === 'etaSquared' || key === 'omegaSquared' || key === 'cramersV') {
      type = 'number'
    } else if (key === 'effectSize' || key === 'oddsRatio' || key === 'inertia') {
      type = 'number'
    }
    // 회귀
    else if (key === 'rSquared' || key === 'adjRSquared' || key === 'slope' || key === 'intercept') {
      type = 'number'
    } else if (key === 'accuracy' || key === 'auc' || key === 'dispersion') {
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
    else if (key === 'coefficients' || key === 'loadings' || key === 'eigenvalues') {
      type = 'number[]'
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
    } else if (key === 'explainedVarianceRatio' || key === 'totalVariance') {
      type = 'number[]'
    } else if (key === 'hazardRatios' || key === 'oddsRatios' || key === 'incidenceRateRatios') {
      type = 'number[]'
    } else if (key === 'survivalProbabilities' || key === 'thresholds') {
      type = 'number[]'
    } else if (key === 'adjustedMeans') {
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
    else if (key === 'confidenceInterval' || key === 'confidenceIntervals') {
      type = '{ lower: number; upper: number }[]'
    } else if (key === 'comparisons' || key === 'significantResults') {
      type = 'Array<{ group1: string; group2: string; pValue: number; significant: boolean }>'
    } else if (key === 'anovaTable' || key === 'descriptives') {
      type = 'Record<string, unknown>'
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
 * 메서드 래퍼 함수 생성
 */
function generateMethodWrapper(workerNum, methodName, definition) {
  const funcName = toCamelCase(methodName)
  const resultType = `${toPascalCase(methodName)}Result`

  const params = definition.params.map(p => {
    const { name, optional, type } = paramToType(p)
    return `${name}${optional ? '?' : ''}: ${type}`
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
