/**
 * 스마트 플로우 통합 테스트
 * Pyodide 서비스 리팩토링 후 정상 작동 확인
 */

import { PyodideStatisticsService } from '@/lib/services/pyodide-statistics'
import { StatisticalCalculator } from '@/lib/statistics/statistical-calculator'

// Mock Pyodide 모듈
jest.mock('@/lib/services/pyodide/core/pyodide-core', () => {
  const mockRunPython = jest.fn().mockImplementation(async (code: string) => {
    // 간단한 Mock 응답 - JSON string 반환
    if (code.includes('stats.ttest_1samp')) {
      return JSON.stringify({
        statistic: 2.5,
        pvalue: 0.03,
        df: 9,
        mean: 105,
        ci_lower: 101.2,
        ci_upper: 108.8
      })
    }
    if (code.includes('mean') || code.includes('describe') || code.includes('np.array')) {
      return JSON.stringify({
        mean: 100,
        median: 99,
        std: 10,
        variance: 100,
        min: 80,
        max: 120,
        q1: 95,
        q3: 105,
        skewness: 0.1,
        kurtosis: -0.2,
        n: 10,
        cv: 0.1,
        sem: 3.16,
        ci_lower: 93.68,
        ci_upper: 106.32,
        iqr: 10,
        outliers: []
      })
    }
    return JSON.stringify({ error: 'Unknown command' })
  })

  return {
    BasePyodideService: class {
      protected pyodide: any
      protected initialized = false

      async initialize() {
        if (!this.initialized) {
          this.pyodide = {
            runPythonAsync: mockRunPython,
            globals: {
              set: jest.fn()
            },
            loadPackage: jest.fn().mockResolvedValue(undefined)
          }
          this.initialized = true
        }
      }

      setData(name: string, data: any) {
        // Mock implementation
      }

      async runPythonSafely(code: string) {
        if (!this.pyodide) {
          await this.initialize()
        }
        return await this.pyodide.runPythonAsync(code)
      }

      async _ensurePyodide() {
        if (!this.initialized) {
          await this.initialize()
        }
        return this.pyodide
      }

      async _loadPyodide() {
        await this.initialize()
        return this.pyodide
      }
    }
  }
})

describe('Smart Flow Integration Test', () => {
  let pyodideService: PyodideStatisticsService

  beforeAll(async () => {
    // Pyodide 서비스 초기화
    pyodideService = PyodideStatisticsService.getInstance()
  })

  describe('Pyodide Service', () => {
    test('서비스 인스턴스가 싱글톤으로 생성됨', () => {
      const instance1 = PyodideStatisticsService.getInstance()
      const instance2 = PyodideStatisticsService.getInstance()
      expect(instance1).toBe(instance2)
    })

    test('기술통계 메서드가 정상 작동함', async () => {
      const data = [95, 100, 102, 98, 105, 103, 97, 99, 101, 104]
      const result = await pyodideService.calculateDescriptiveStats(data)

      expect(result).toBeDefined()
      expect(result.mean).toBeDefined()
      expect(result.std).toBeDefined()
      expect(result.n).toBeDefined()
    })

    test('t-검정 메서드가 정상 작동함', async () => {
      const data = [95, 100, 102, 98, 105, 103, 97, 99, 101, 104]
      const result = await pyodideService.oneSampleTTest(data, 100)

      expect(result).toBeDefined()
      expect(result.statistic).toBeDefined()
      expect(result.pvalue).toBeDefined()
    })
  })

  describe('Statistical Calculator', () => {
    test('Calculator가 Pyodide 서비스와 연동됨', async () => {
      // StatisticalCalculator는 테이블 형식의 데이터를 기대함
      const data = [
        { value: 95 },
        { value: 100 },
        { value: 102 },
        { value: 98 },
        { value: 105 },
        { value: 103 },
        { value: 97 },
        { value: 99 },
        { value: 101 },
        { value: 104 }
      ]
      const result = await StatisticalCalculator.calculate(
        'calculateDescriptiveStats',
        data,
        { column: 'value' }  // 컬럼 지정
      )

      // 디버그 정보 출력
      if (!result.success) {
        console.error('Test failed with error:', result.error)
        console.error('Result:', JSON.stringify(result, null, 2))
      }

      expect(result.success).toBe(true)
      expect(result.data).toBeDefined()
      expect(result.data?.metrics).toBeDefined()
    })

    test('잘못된 메서드 ID 처리', async () => {
      const data = [1, 2, 3]
      const result = await StatisticalCalculator.calculate(
        'invalidMethod',
        data,
        {}
      )

      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
    })
  })

  describe('26개 통계 메서드 확인', () => {
    const methods = [
      // 기술통계 (4개)
      'calculateDescriptiveStats',
      'normalityTest',
      'homogeneityTest',
      'outlierDetection',

      // 가설검정 (5개)
      'oneSampleTTest',
      'twoSampleTTest',
      'pairedTTest',
      'correlation',
      'partialCorrelation',

      // ANOVA (6개)
      'oneWayANOVA',
      'twoWayANOVA',
      'repeatedMeasuresANOVA',
      'tukeyHSD',
      'gamesHowell',
      'bonferroni',

      // 회귀분석 (3개)
      'simpleRegression',
      'multipleRegression',
      'logisticRegression',

      // 비모수 (5개)
      'mannWhitneyU',
      'wilcoxonSignedRank',
      'kruskalWallis',
      'friedman',
      'chiSquareTest',

      // 고급분석 (3개)
      'pca',
      'clustering',
      'timeSeriesDecomposition'
    ]

    test.each(methods)('%s 메서드가 존재함', async (method) => {
      expect(typeof (pyodideService as any)[method]).toBe('function')
    })

    test('총 26개 메서드가 구현됨', () => {
      expect(methods.length).toBe(26)
    })
  })

  describe('Smart Flow 워크플로우', () => {
    test('데이터 업로드 → 검증 → 분석 플로우', async () => {
      // 1. 데이터 준비
      const testData = [95, 100, 102, 98, 105, 103, 97, 99, 101, 104]

      // 2. 기술통계로 데이터 검증
      const validation = await pyodideService.calculateDescriptiveStats(testData)
      expect(validation).toBeDefined()
      expect(validation.n).toBeGreaterThan(0)

      // 3. 통계 분석 실행 (t-검정)
      const analysis = await pyodideService.oneSampleTTest(testData, 100)
      expect(analysis).toBeDefined()
      expect(analysis.pvalue).toBeDefined()

      // 4. 결과 해석 (p-value 기반)
      const isSignificant = analysis.pvalue < 0.05
      expect(typeof isSignificant).toBe('boolean')
    })
  })
})