/**
 * Worker-Function 매핑 검증 테스트
 *
 * TypeScript에서 호출하는 함수가 실제 Python Worker 파일에 존재하는지 검증합니다.
 * 이 테스트는 잘못된 Worker 매핑 실수를 CI/CD 단계에서 사전에 발견합니다.
 */
import { readFileSync } from 'fs'
import { join } from 'path'

// Python Worker 파일 경로
const WORKER_DIR = join(__dirname, '../../public/workers/python')
const SERVICE_PATH = join(__dirname, '../../lib/services/pyodide/core/pyodide-core.service.ts')

// Worker별 패키지 의존성 (scikit-learn이 필요한 Worker는 로딩이 느림)
const WORKER_PACKAGES = {
  1: ['scipy'],  // 가벼움 - 기본 통계
  2: ['scipy', 'statsmodels'],  // 중간 - 가설검정
  3: ['scipy', 'statsmodels', 'scikit-learn'],  // 무거움 - 비모수/ANOVA
  4: ['scipy', 'statsmodels', 'scikit-learn'],  // 무거움 - 회귀/고급
} as const

/**
 * Worker 파일에서 정의된 함수 목록 추출
 */
function extractFunctionsFromWorker(workerNum: number): string[] {
  const workerFiles: Record<number, string> = {
    1: 'worker1-descriptive.py',
    2: 'worker2-hypothesis.py',
    3: 'worker3-nonparametric-anova.py',
    4: 'worker4-regression-advanced.py',
  }

  const filePath = join(WORKER_DIR, workerFiles[workerNum])
  const content = readFileSync(filePath, 'utf8')

  // "def function_name(" 패턴 매칭 (private 함수 _로 시작하는 것 제외)
  const functionPattern = /^def ([a-z][a-z0-9_]*)\(/gm
  const functions: string[] = []
  let match

  while ((match = functionPattern.exec(content)) !== null) {
    functions.push(match[1])
  }

  return functions
}

/**
 * pyodide-core.service.ts에서 callWorkerMethod를 호출하는 모든 public 메서드 추출
 */
function extractServiceMethods(): Array<{ tsMethod: string; worker: number; pyFunc: string }> {
  const content = readFileSync(SERVICE_PATH, 'utf8')

  // "async methodName(...): ... callWorkerMethod<T>(N, 'python_func'" 패턴 매칭
  const pattern = /async\s+(\w+)\s*\([^)]*\)[^{]*\{[^}]*callWorkerMethod[^(]*\(\s*(\d)\s*,\s*['"]([\w_]+)['"]/g
  const methods: Array<{ tsMethod: string; worker: number; pyFunc: string }> = []
  let match

  while ((match = pattern.exec(content)) !== null) {
    const [, tsMethod, worker, pyFunc] = match
    // private 메서드 및 내부 메서드 제외
    if (!tsMethod.startsWith('_') && tsMethod !== 'callWorkerMethod' && tsMethod !== 'callWorkerMethodViaWebWorker') {
      methods.push({ tsMethod, worker: parseInt(worker, 10), pyFunc })
    }
  }

  return methods
}


/**
 * Python Worker 파일에서 함수의 파라미터 목록 추출
 *
 * 개선된 파서:
 * - 여러 줄에 걸친 함수 정의 지원
 * - List[Union[int, float]], Optional[List[int]] 등 복잡한 타입 힌트 처리
 * - 괄호 균형을 고려한 안전한 파싱
 */
function extractPythonFunctionParams(workerNum: number, funcName: string): string[] {
  const workerFiles: Record<number, string> = {
    1: 'worker1-descriptive.py',
    2: 'worker2-hypothesis.py',
    3: 'worker3-nonparametric-anova.py',
    4: 'worker4-regression-advanced.py',
  }

  const filePath = join(WORKER_DIR, workerFiles[workerNum])
  const content = readFileSync(filePath, 'utf8')

  // 여러 줄에 걸친 함수 정의 지원 (def funcname(...):)
  const pattern = new RegExp(`def ${funcName}\\s*\\(([\\s\\S]*?)\\)\\s*(?:->\\s*[^:]+)?:`, 'm')
  const match = content.match(pattern)

  if (!match) return []

  // 파라미터 문자열에서 줄바꿈과 공백 정리
  const paramStr = match[1].replace(/\s+/g, ' ').trim()
  if (!paramStr) return []

  // 괄호 균형을 고려한 파라미터 분리
  const params: string[] = []
  let current = ''
  let bracketDepth = 0

  for (let i = 0; i < paramStr.length; i++) {
    const char = paramStr[i]
    if (char === '[' || char === '(') {
      bracketDepth++
      current += char
    } else if (char === ']' || char === ')') {
      bracketDepth--
      current += char
    } else if (char === ',' && bracketDepth === 0) {
      if (current.trim()) {
        params.push(current.trim())
      }
      current = ''
    } else {
      current += char
    }
  }
  if (current.trim()) {
    params.push(current.trim())
  }

  // 파라미터 이름만 추출 (타입 힌트와 기본값 제거)
  return params
    .map(p => {
      // "param: Type = default" -> "param"
      const colonIdx = p.indexOf(':')
      const eqIdx = p.indexOf('=')

      if (colonIdx !== -1) {
        return p.substring(0, colonIdx).trim()
      } else if (eqIdx !== -1) {
        return p.substring(0, eqIdx).trim()
      }
      return p.trim()
    })
    .filter(p => p.length > 0 && !p.includes('[') && !p.includes(']'))
}

/**
 * TypeScript 서비스에서 callWorkerMethod로 전달하는 파라미터 키 추출
 */
function extractServiceCallParams(tsMethod: string): string[] {
  const content = readFileSync(SERVICE_PATH, 'utf8')

  // 메서드 정의와 callWorkerMethod 호출을 함께 찾음
  // 패턴: async methodName(...) { ... callWorkerMethod<T>(N, 'func', { param1, param2: value, ... })
  const methodPattern = new RegExp(
    `async\\s+${tsMethod}\\s*\\([^)]*\\)[^{]*\\{[\\s\\S]*?callWorkerMethod[^(]*\\([^,]+,\\s*['"][\\w_]+['"],\\s*\\{([^}]*)\\}`,
    'm'
  )
  const match = content.match(methodPattern)

  if (!match) return []

  const paramsStr = match[1]
  if (!paramsStr.trim()) return []

  // { key1: value1, key2, key3: value3 } 형태에서 키만 추출
  const params: string[] = []
  const paramMatches = paramsStr.matchAll(/([\w_]+)\s*(?::|,|$)/g)

  for (const m of paramMatches) {
    const key = m[1].trim()
    if (key && !['true', 'false', 'null', 'undefined'].includes(key)) {
      params.push(key)
    }
  }

  return params
}

/**
 * 파라미터 시그니처 매핑 정의
 * TypeScript에서 보내는 키 → Python 함수가 기대하는 파라미터
 */
const EXPECTED_PARAM_SIGNATURES: Array<{
  tsMethod: string
  worker: number
  pyFunc: string
  tsParams: string[]      // TypeScript에서 callWorkerMethod로 전달하는 키
  pyParams: string[]      // Python 함수가 기대하는 파라미터
}> = [
  // Worker 1
  { tsMethod: 'shapiroWilkTest', worker: 1, pyFunc: 'normality_test',
    tsParams: ['data'], pyParams: ['data', 'alpha'] },
  { tsMethod: 'descriptiveStats', worker: 1, pyFunc: 'descriptive_stats',
    tsParams: ['data'], pyParams: ['data'] },
  { tsMethod: 'outlierDetection', worker: 1, pyFunc: 'outlier_detection',
    tsParams: ['data', 'method'], pyParams: ['data', 'method', 'threshold'] },
  { tsMethod: 'cronbachAlpha', worker: 1, pyFunc: 'cronbach_alpha',
    tsParams: ['items_matrix'], pyParams: ['items_matrix'] },
  { tsMethod: 'oneSampleProportionTest', worker: 1, pyFunc: 'one_sample_proportion_test',
    tsParams: ['success_count', 'total_count', 'null_proportion'], pyParams: ['success_count', 'total_count', 'null_proportion', 'alternative'] },
  { tsMethod: 'performBonferroni', worker: 1, pyFunc: 'bonferroni_correction',
    tsParams: ['p_values', 'alpha'], pyParams: ['p_values', 'alpha'] },

  // Worker 2
  { tsMethod: 'twoSampleTTest', worker: 2, pyFunc: 't_test_two_sample',
    tsParams: ['group1', 'group2', 'equalVar'], pyParams: ['group1', 'group2', 'equalVar', 'alternative'] },
  { tsMethod: 'pairedTTest', worker: 2, pyFunc: 't_test_paired',
    tsParams: ['group1', 'group2'], pyParams: ['group1', 'group2', 'alternative'] },
  { tsMethod: 'oneSampleTTest', worker: 2, pyFunc: 't_test_one_sample',
    tsParams: ['data', 'popmean'], pyParams: ['data', 'popmean'] },
  { tsMethod: 'zTestWorker', worker: 2, pyFunc: 'z_test',
    tsParams: ['data', 'popmean', 'popstd'], pyParams: ['data', 'popmean', 'popstd'] },
  { tsMethod: 'partialCorrelationWorker', worker: 2, pyFunc: 'partial_correlation',
    tsParams: ['data_matrix', 'x_idx', 'y_idx', 'control_indices'], pyParams: ['data_matrix', 'x_idx', 'y_idx', 'control_indices'] },
  { tsMethod: 'leveneTest', worker: 2, pyFunc: 'levene_test',
    tsParams: ['groups'], pyParams: ['groups'] },

  // Worker 3 - ANOVA
  { tsMethod: 'oneWayANOVA', worker: 3, pyFunc: 'one_way_anova',
    tsParams: ['groups'], pyParams: ['groups'] },
  { tsMethod: 'twoWayAnova', worker: 3, pyFunc: 'two_way_anova',
    tsParams: ['data_values', 'factor1_values', 'factor2_values'], pyParams: ['data_values', 'factor1_values', 'factor2_values'] },
  { tsMethod: 'repeatedMeasuresAnovaWorker', worker: 3, pyFunc: 'repeated_measures_anova',
    tsParams: ['data_matrix', 'subject_ids', 'time_labels'], pyParams: ['data_matrix', 'subject_ids', 'time_labels'] },
  { tsMethod: 'ancovaWorker', worker: 3, pyFunc: 'ancova',
    tsParams: ['y_values', 'group_values', 'covariates'], pyParams: ['y_values', 'group_values', 'covariates'] },
  { tsMethod: 'manovaWorker', worker: 3, pyFunc: 'manova',
    tsParams: ['data_matrix', 'group_values', 'var_names'], pyParams: ['data_matrix', 'group_values', 'var_names'] },

  // Worker 3 - Nonparametric
  { tsMethod: 'mcnemarTestWorker', worker: 3, pyFunc: 'mcnemar_test',
    tsParams: ['contingency_table'], pyParams: ['contingency_table'] },

  // Worker 3 - Post-hoc
  { tsMethod: 'tukeyHSD', worker: 3, pyFunc: 'tukey_hsd',
    tsParams: ['groups'], pyParams: ['groups'] },
  { tsMethod: 'scheffeTestWorker', worker: 3, pyFunc: 'scheffe_test',
    tsParams: ['groups'], pyParams: ['groups'] },
  { tsMethod: 'gamesHowellTest', worker: 3, pyFunc: 'games_howell_test',
    tsParams: ['groups'], pyParams: ['groups'] },

  // Worker 4
  { tsMethod: 'simpleLinearRegression', worker: 4, pyFunc: 'linear_regression',
    tsParams: ['x', 'y'], pyParams: ['x', 'y'] },
  { tsMethod: 'multipleRegression', worker: 4, pyFunc: 'multiple_regression',
    tsParams: ['X', 'y'], pyParams: ['X', 'y'] },
  { tsMethod: 'logisticRegression', worker: 4, pyFunc: 'logistic_regression',
    tsParams: ['X', 'y'], pyParams: ['X', 'y'] },
  { tsMethod: 'pca', worker: 4, pyFunc: 'pca_analysis',
    tsParams: ['data', 'n_components'], pyParams: ['data', 'n_components'] },
  { tsMethod: 'factorAnalysis', worker: 4, pyFunc: 'factor_analysis',
    tsParams: ['data', 'n_factors'], pyParams: ['data_matrix', 'n_factors', 'rotation'] },
  { tsMethod: 'clusterAnalysis', worker: 4, pyFunc: 'cluster_analysis',
    tsParams: ['data', 'num_clusters'], pyParams: ['data', 'method', 'num_clusters', 'linkage', 'distance'] },
]

/**
 * 현재 pyodide-core.service.ts에서 사용하는 Worker-함수 매핑
 * 새 함수 추가 시 이 목록도 업데이트해야 함
 */
const EXPECTED_MAPPINGS: Array<{ worker: number; function: string; tsMethod: string }> = [
  // Worker 1 (scipy only - lightweight)
  { worker: 1, function: 'normality_test', tsMethod: 'shapiroWilkTest' },
  { worker: 1, function: 'descriptive_stats', tsMethod: 'descriptiveStats' },
  { worker: 1, function: 'outlier_detection', tsMethod: 'outlierDetection' },
  { worker: 1, function: 'cronbach_alpha', tsMethod: 'cronbachAlpha' },
  { worker: 1, function: 'one_sample_proportion_test', tsMethod: 'oneSampleProportionTest' },
  { worker: 1, function: 'bonferroni_correction', tsMethod: 'performBonferroni' },

  // Worker 2 (scipy + statsmodels)
  { worker: 2, function: 't_test_two_sample', tsMethod: 'twoSampleTTest' },
  { worker: 2, function: 't_test_paired', tsMethod: 'pairedTTest' },
  { worker: 2, function: 't_test_one_sample', tsMethod: 'oneSampleTTest' },
  { worker: 2, function: 'z_test', tsMethod: 'zTestWorker' },
  { worker: 2, function: 'chi_square_test', tsMethod: 'chiSquareTest' },
  { worker: 2, function: 'binomial_test', tsMethod: 'binomialTestWorker' },
  { worker: 2, function: 'correlation_test', tsMethod: 'correlationTest' },
  { worker: 2, function: 'partial_correlation', tsMethod: 'partialCorrelationWorker' },
  { worker: 2, function: 'levene_test', tsMethod: 'leveneTest' },

  // Worker 3 (scikit-learn needed - heavy, nonparametric + ANOVA)
  { worker: 3, function: 'mann_whitney_test', tsMethod: 'mannWhitneyTestWorker' },
  { worker: 3, function: 'wilcoxon_test', tsMethod: 'wilcoxonTestWorker' },
  { worker: 3, function: 'kruskal_wallis_test', tsMethod: 'kruskalWallisTestWorker' },
  { worker: 3, function: 'friedman_test', tsMethod: 'friedmanTestWorker' },
  { worker: 3, function: 'sign_test', tsMethod: 'signTestWorker' },
  { worker: 3, function: 'runs_test', tsMethod: 'runsTestWorker' },
  { worker: 3, function: 'mcnemar_test', tsMethod: 'mcnemarTestWorker' },
  { worker: 3, function: 'cochran_q_test', tsMethod: 'cochranQTestWorker' },
  { worker: 3, function: 'mood_median_test', tsMethod: 'moodMedianTestWorker' },
  { worker: 3, function: 'one_way_anova', tsMethod: 'oneWayANOVA' },
  { worker: 3, function: 'two_way_anova', tsMethod: 'twoWayAnova' },
  { worker: 3, function: 'repeated_measures_anova', tsMethod: 'repeatedMeasuresAnovaWorker' },
  { worker: 3, function: 'ancova', tsMethod: 'ancovaWorker' },
  { worker: 3, function: 'manova', tsMethod: 'manovaWorker' },
  { worker: 3, function: 'tukey_hsd', tsMethod: 'tukeyHSD' },
  { worker: 3, function: 'scheffe_test', tsMethod: 'scheffeTestWorker' },
  { worker: 3, function: 'games_howell_test', tsMethod: 'gamesHowellTest' },

  // Worker 4 (scikit-learn needed - heavy, regression + advanced)
  { worker: 4, function: 'linear_regression', tsMethod: 'simpleLinearRegression' },
  { worker: 4, function: 'multiple_regression', tsMethod: 'multipleRegression' },
  { worker: 4, function: 'logistic_regression', tsMethod: 'logisticRegression' },
  { worker: 4, function: 'pca_analysis', tsMethod: 'pca' },
  { worker: 4, function: 'factor_analysis', tsMethod: 'factorAnalysis' },
  { worker: 4, function: 'cluster_analysis', tsMethod: 'clusterAnalysis' },
]

describe('Worker-Function Mapping Verification', () => {
  // 각 Worker 파일에서 함수 목록 추출
  const worker1Functions = extractFunctionsFromWorker(1)
  const worker2Functions = extractFunctionsFromWorker(2)
  const worker3Functions = extractFunctionsFromWorker(3)
  const worker4Functions = extractFunctionsFromWorker(4)

  const workerFunctions: Record<number, string[]> = {
    1: worker1Functions,
    2: worker2Functions,
    3: worker3Functions,
    4: worker4Functions,
  }

  describe('함수 존재 여부 검증', () => {
    EXPECTED_MAPPINGS.forEach(({ worker, function: pyFunc, tsMethod }) => {
      it(`${tsMethod}() → Worker ${worker}의 ${pyFunc}() 함수가 존재해야 함`, () => {
        const functions = workerFunctions[worker]
        expect(functions).toContain(pyFunc)
      })
    })
  })

  describe('Worker 선택 최적화 검증', () => {
    // scikit-learn이 필요 없는 함수가 Worker 3/4를 사용하면 경고
    const lightweightFunctions = [
      'normality_test',
      'descriptive_stats',
      'outlier_detection',
      'frequency_analysis',
    ]

    lightweightFunctions.forEach(func => {
      it(`${func}()는 Worker 3/4 대신 Worker 1/2를 사용해야 함 (scikit-learn 불필요)`, () => {
        const mapping = EXPECTED_MAPPINGS.find(m => m.function === func)
        if (mapping) {
          // scikit-learn이 필요한 Worker 3/4를 사용하면 실패
          expect(mapping.worker).toBeLessThanOrEqual(2)
        }
      })
    })
  })

  describe('Worker 파일 함수 목록 스냅샷', () => {
    it('Worker 1에 normality_test 함수가 있어야 함', () => {
      expect(worker1Functions).toContain('normality_test')
    })

    it('Worker 2에 levene_test 함수가 있어야 함', () => {
      expect(worker2Functions).toContain('levene_test')
    })

    it('Worker 3에 one_way_anova 함수가 있어야 함', () => {
      expect(worker3Functions).toContain('one_way_anova')
    })

    it('Worker 4에 linear_regression 함수가 있어야 함', () => {
      expect(worker4Functions).toContain('linear_regression')
    })
  })

  describe('양방향 동기화 검증 (Bidirectional Sync)', () => {
    /**
     * 양방향 검증:
     * 1. EXPECTED_MAPPINGS → Worker 파일: 테스트 목록의 함수가 실제 존재하는지
     * 2. Service → EXPECTED_MAPPINGS: 서비스의 모든 메서드가 테스트에 등록되어 있는지
     *
     * 이를 통해:
     * - 함수 추가 시 테스트 누락 방지
     * - 함수 삭제 시 테스트에서도 제거 강제
     */
    const serviceMethods = extractServiceMethods()
    const testedMethods = EXPECTED_MAPPINGS.map(m => m.tsMethod)

    it('pyodide-core.service.ts의 모든 Worker 메서드가 EXPECTED_MAPPINGS에 등록되어 있어야 함', () => {
      const untestedMethods = serviceMethods.filter(m => !testedMethods.includes(m.tsMethod))

      if (untestedMethods.length > 0) {
        const missingList = untestedMethods
          .map(m => `  { worker: ${m.worker}, function: '${m.pyFunc}', tsMethod: '${m.tsMethod}' }`)
          .join('\n')
        throw new Error(`EXPECTED_MAPPINGS에 다음 메서드를 추가하세요:\n${missingList}`)
      }
    })

    it('EXPECTED_MAPPINGS의 모든 메서드가 pyodide-core.service.ts에 존재해야 함', () => {
      const serviceMethodNames = serviceMethods.map(m => m.tsMethod)
      const removedMethods = testedMethods.filter(m => !serviceMethodNames.includes(m))

      if (removedMethods.length > 0) {
        throw new Error(`다음 메서드가 삭제되었습니다. EXPECTED_MAPPINGS에서도 제거하세요:\n  ${removedMethods.join(', ')}`)
      }
    })
  })

  describe('파라미터 시그니처 검증 (Parameter Signature Verification)', () => {
    /**
     * TypeScript에서 보내는 파라미터 키가 Python 함수의 파라미터와 일치하는지 검증
     *
     * 검증 대상:
     * - 필수 파라미터가 모두 전달되는지
     * - 파라미터 이름이 일치하는지 (snake_case)
     */

    // 핵심 ANOVA 메서드 파라미터 검증
    describe('ANOVA 메서드 파라미터', () => {
      it('twoWayAnova: dataValues, factor1Values, factor2Values 파라미터가 일치해야 함', () => {
        const pyParams = extractPythonFunctionParams(3, 'two_way_anova')
        expect(pyParams).toContain('dataValues')
        expect(pyParams).toContain('factor1Values')
        expect(pyParams).toContain('factor2Values')
      })

      it('repeatedMeasuresAnovaWorker: dataMatrix, subjectIds, timeLabels 파라미터가 일치해야 함', () => {
        const pyParams = extractPythonFunctionParams(3, 'repeated_measures_anova')
        expect(pyParams).toContain('dataMatrix')
        expect(pyParams).toContain('subjectIds')
        expect(pyParams).toContain('timeLabels')
      })

      it('ancovaWorker: yValues, groupValues, covariates 파라미터가 일치해야 함', () => {
        const pyParams = extractPythonFunctionParams(3, 'ancova')
        expect(pyParams).toContain('yValues')
        expect(pyParams).toContain('groupValues')
        expect(pyParams).toContain('covariates')
      })

      it('manovaWorker: dataMatrix, groupValues, varNames 파라미터가 일치해야 함', () => {
        const pyParams = extractPythonFunctionParams(3, 'manova')
        expect(pyParams).toContain('dataMatrix')
        expect(pyParams).toContain('groupValues')
        expect(pyParams).toContain('varNames')
      })
    })

    // 서비스에서 실제로 보내는 파라미터 키 검증
    describe('서비스 callWorkerMethod 파라미터 키 검증', () => {
      const criticalMethods = [
        { tsMethod: 'twoWayAnova', expectedKeys: ['dataValues', 'factor1Values', 'factor2Values'] },
        { tsMethod: 'repeatedMeasuresAnovaWorker', expectedKeys: ['dataMatrix', 'subjectIds', 'timeLabels'] },
        { tsMethod: 'ancovaWorker', expectedKeys: ['yValues', 'groupValues', 'covariates'] },
        { tsMethod: 'manovaWorker', expectedKeys: ['dataMatrix', 'groupValues', 'varNames'] },
      ]

      criticalMethods.forEach(({ tsMethod, expectedKeys }) => {
        it(`${tsMethod}()가 올바른 파라미터 키를 전달해야 함: ${expectedKeys.join(', ')}`, () => {
          const actualKeys = extractServiceCallParams(tsMethod)
          expectedKeys.forEach(key => {
            expect(actualKeys).toContain(key)
          })
        })
      })
    })

    // Python 함수 파라미터 개수 검증
    describe('Python 함수 필수 파라미터 개수 검증', () => {
      const paramCounts: Array<{ func: string; worker: number; minParams: number }> = [
        { func: 'two_way_anova', worker: 3, minParams: 3 },
        { func: 'repeated_measures_anova', worker: 3, minParams: 3 },
        { func: 'ancova', worker: 3, minParams: 3 },
        { func: 'manova', worker: 3, minParams: 3 },
        { func: 'bonferroni_correction', worker: 1, minParams: 1 },
      ]

      paramCounts.forEach(({ func, worker, minParams }) => {
        it(`${func}()는 최소 ${minParams}개의 파라미터가 필요해야 함`, () => {
          const params = extractPythonFunctionParams(worker, func)
          expect(params.length).toBeGreaterThanOrEqual(minParams)
        })
      })
    })
  })

  describe('Methods Registry ↔ Python Worker 자동 동기화 검증', () => {
    /**
     * methods-registry.json의 파라미터가 실제 Python Worker 파일과 일치하는지 자동 검증
     *
     * 취약점 설명:
     * - 현재 Python 파라미터 파싱은 단순 split(',')을 사용
     * - Dict[str, Any], Literal['a', 'b'] 같은 복잡한 타입 힌트는 파싱 불가
     * - 현재 프로젝트는 simple types만 사용하므로 문제없음
     * - 향후 복잡한 타입 사용 시 proper Python parser 필요
     */

    // Registry import
    const registryPath = join(__dirname, '../../lib/constants/methods-registry.json')
    const registry = JSON.parse(readFileSync(registryPath, 'utf8'))

    const workerConfigs = [
      { num: 1, key: 'worker1' },
      { num: 2, key: 'worker2' },
      { num: 3, key: 'worker3' },
      { num: 4, key: 'worker4' },
    ] as const

    describe('레지스트리 메서드가 Python Worker에 존재해야 함', () => {
      workerConfigs.forEach(({ num, key }) => {
        const workerMethods = Object.keys(registry[key].methods)
        const workerFunctions = extractFunctionsFromWorker(num)

        workerMethods.forEach(methodName => {
          it(`Worker ${num}: ${methodName}() 함수가 Python에 존재해야 함`, () => {
            expect(workerFunctions).toContain(methodName)
          })
        })
      })
    })

    describe('레지스트리 파라미터가 Python 함수 파라미터와 일치해야 함', () => {
      workerConfigs.forEach(({ num, key }) => {
        const workerMethods = registry[key].methods as Record<string, { params: string[] }>

        Object.entries(workerMethods).forEach(([methodName, definition]) => {
          it(`Worker ${num}: ${methodName}() 파라미터 일치 검증`, () => {
            const pyParams = extractPythonFunctionParams(num, methodName)
            const registryParams = definition.params.map(p =>
              p.endsWith('?') ? p.slice(0, -1) : p
            )

            // 레지스트리의 모든 필수 파라미터가 Python에 있어야 함
            const requiredParams = definition.params.filter(p => !p.endsWith('?'))
            requiredParams.forEach(param => {
              expect(pyParams).toContain(param)
            })

            // 레지스트리의 모든 파라미터가 Python에 있어야 함 (optional 포함)
            registryParams.forEach(param => {
              expect(pyParams).toContain(param)
            })
          })
        })
      })
    })

    describe('Python 함수 파라미터가 레지스트리에 등록되어 있어야 함', () => {
      workerConfigs.forEach(({ num, key }) => {
        const workerMethods = registry[key].methods as Record<string, { params: string[] }>

        Object.entries(workerMethods).forEach(([methodName, definition]) => {
          it(`Worker ${num}: ${methodName}() - Python 파라미터가 레지스트리에 누락되지 않아야 함`, () => {
            const pyParams = extractPythonFunctionParams(num, methodName)
            const registryParams = definition.params.map(p =>
              p.endsWith('?') ? p.slice(0, -1) : p
            )

            // Python의 모든 파라미터가 레지스트리에 있어야 함
            pyParams.forEach(pyParam => {
              const found = registryParams.includes(pyParam) ||
                           registryParams.includes(`${pyParam}?`)
              if (!found) {
                throw new Error(
                  `Python 함수 ${methodName}()의 파라미터 '${pyParam}'가 methods-registry.json에 누락됨`
                )
              }
            })
          })
        })
      })
    })

    describe('파라미터 명명 규칙 검증 (camelCase)', () => {
      workerConfigs.forEach(({ num, key }) => {
        const workerMethods = registry[key].methods as Record<string, { params: string[] }>

        Object.entries(workerMethods).forEach(([methodName, definition]) => {
          it(`Worker ${num}: ${methodName}() - 모든 파라미터가 camelCase여야 함`, () => {
            definition.params.forEach(param => {
              const cleanParam = param.endsWith('?') ? param.slice(0, -1) : param
              // snake_case 패턴 검사 (언더스코어가 있으면 안됨)
              const hasSnakeCase = cleanParam.includes('_')
              if (hasSnakeCase) {
                throw new Error(
                  `파라미터 '${cleanParam}'가 snake_case입니다. camelCase로 변경하세요. ` +
                  `(${methodName} in Worker ${num})`
                )
              }
            })
          })
        })
      })
    })
  })

})