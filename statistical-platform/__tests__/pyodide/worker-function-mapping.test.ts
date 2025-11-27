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
})
