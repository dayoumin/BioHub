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
 * 현재 pyodide-core.service.ts에서 사용하는 Worker-함수 매핑
 * 새 함수 추가 시 이 목록도 업데이트해야 함
 */
const EXPECTED_MAPPINGS: Array<{ worker: number; function: string; tsMethod: string }> = [
  // Worker 1 (scipy만 필요 - 가벼움)
  { worker: 1, function: 'descriptive_stats', tsMethod: 'descriptiveStats' },
  { worker: 1, function: 'normality_test', tsMethod: 'shapiroWilkTest' },
  { worker: 1, function: 'outlier_detection', tsMethod: 'outlierDetection' },
  { worker: 1, function: 'frequency_analysis', tsMethod: 'frequencyAnalysis' },
  { worker: 1, function: 'crosstab_analysis', tsMethod: 'crosstabAnalysis' },
  { worker: 1, function: 'ks_test_one_sample', tsMethod: 'ksTestOneSample' },
  { worker: 1, function: 'ks_test_two_sample', tsMethod: 'ksTestTwoSample' },
  { worker: 1, function: 'mann_kendall_test', tsMethod: 'mannKendallTest' },
  { worker: 1, function: 'cronbach_alpha', tsMethod: 'cronbachAlpha' },

  // Worker 2 (scipy + statsmodels)
  { worker: 2, function: 't_test_one_sample', tsMethod: 'tTestOneSample' },
  { worker: 2, function: 't_test_two_sample', tsMethod: 'tTestTwoSample' },
  { worker: 2, function: 't_test_paired', tsMethod: 'tTestPaired' },
  { worker: 2, function: 'chi_square_test', tsMethod: 'chiSquareTest' },
  { worker: 2, function: 'correlation_test', tsMethod: 'correlationTest' },
  { worker: 2, function: 'levene_test', tsMethod: 'leveneTest' },
  { worker: 2, function: 'binomial_test', tsMethod: 'binomialTest' },
  { worker: 2, function: 'power_analysis', tsMethod: 'powerAnalysis' },

  // Worker 3 (scikit-learn 필요 - 무거움)
  { worker: 3, function: 'mann_whitney_test', tsMethod: 'mannWhitneyTest' },
  { worker: 3, function: 'wilcoxon_test', tsMethod: 'wilcoxonTest' },
  { worker: 3, function: 'kruskal_wallis_test', tsMethod: 'kruskalWallisTest' },
  { worker: 3, function: 'friedman_test', tsMethod: 'friedmanTest' },
  { worker: 3, function: 'one_way_anova', tsMethod: 'oneWayAnova' },
  { worker: 3, function: 'tukey_hsd', tsMethod: 'tukeyHSD' },

  // Worker 4 (scikit-learn 필요 - 무거움)
  { worker: 4, function: 'linear_regression', tsMethod: 'linearRegression' },
  { worker: 4, function: 'multiple_regression', tsMethod: 'multipleRegression' },
  { worker: 4, function: 'pca_analysis', tsMethod: 'pcaAnalysis' },
  { worker: 4, function: 'cluster_analysis', tsMethod: 'clusterAnalysis' },
  { worker: 4, function: 'time_series_decomposition', tsMethod: 'timeSeriesDecomposition' },
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
})
