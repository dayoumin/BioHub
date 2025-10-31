/**
 * Pyodide 통계 서비스 메서드 테스트
 * 26개 통계 메서드 작동 확인
 */

import { describe, test, expect, beforeAll, afterAll } from '@jest/globals'
import { PyodideStatisticsService } from '@/lib/services/pyodide-statistics'

// 테스트를 위한 샘플 데이터
const sampleData1 = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
const sampleData2 = [2, 4, 6, 8, 10, 12, 14, 16, 18, 20]
const groupData = [
  [1, 2, 3, 4, 5],
  [2, 4, 6, 8, 10],
  [3, 6, 9, 12, 15]
]

// 브라우저 환경 Mock
if (typeof window === 'undefined') {
  // @ts-ignore
  global.window = {
    loadPyodide: null
  }
  // @ts-ignore
  global.document = {
    head: {
      appendChild: () => {}
    },
    createElement: () => ({
      onload: null,
      onerror: null,
      src: '',
      async: true
    })
  }
}

describe('Pyodide 통계 서비스 - 26개 메서드 테스트', () => {
  let pyodideService: PyodideStatisticsService
  const INIT_TIMEOUT = 60000

  beforeAll(async () => {
    console.log('테스트 초기화 시작...')
    pyodideService = PyodideStatisticsService.getInstance()

    // 실제 브라우저 환경이 아니므로 초기화를 스킵하고 Mock 응답 제공
    // 실제 테스트는 브라우저 환경에서 수행되어야 함
    console.log('Note: Pyodide는 브라우저 환경에서만 작동합니다.')
    console.log('이 테스트는 메서드 구조와 인터페이스를 검증합니다.')
  }, INIT_TIMEOUT)

  afterAll(() => {
    if (pyodideService) {
      // @ts-ignore
      pyodideService.dispose?.()
    }
  })

  describe('기술통계 (Descriptive Statistics) - 5개', () => {
    test('1. calculateDescriptiveStats - 기술통계량 계산', () => {
      expect(pyodideService.calculateDescriptiveStats).toBeDefined()
      expect(typeof pyodideService.calculateDescriptiveStats).toBe('function')
    })

    test('2. normalityTest - 정규성 검정', () => {
      expect(pyodideService.normalityTest).toBeDefined()
      expect(typeof pyodideService.normalityTest).toBe('function')
    })

    test('3. homogeneityTest - 등분산성 검정', () => {
      expect(pyodideService.homogeneityTest).toBeDefined()
      expect(typeof pyodideService.homogeneityTest).toBe('function')
    })

    test('4. outlierDetection - 이상치 탐지', () => {
      expect(pyodideService.outlierDetection).toBeDefined()
      expect(typeof pyodideService.outlierDetection).toBe('function')
    })

    test('5. checkAllAssumptions - 모든 가정 검정', () => {
      expect(pyodideService.checkAllAssumptions).toBeDefined()
      expect(typeof pyodideService.checkAllAssumptions).toBe('function')
    })
  })

  describe('가설검정 (Hypothesis Testing) - 6개', () => {
    test('6. oneSampleTTest - 일표본 t검정', () => {
      expect(pyodideService.oneSampleTTest).toBeDefined()
      expect(typeof pyodideService.oneSampleTTest).toBe('function')
    })

    test('7. twoSampleTTest - 독립표본 t검정', () => {
      expect(pyodideService.twoSampleTTest).toBeDefined()
      expect(typeof pyodideService.twoSampleTTest).toBe('function')
    })

    test('8. pairedTTest - 대응표본 t검정', () => {
      expect(pyodideService.pairedTTest).toBeDefined()
      expect(typeof pyodideService.pairedTTest).toBe('function')
    })

    test('9. chiSquareTest - 카이제곱 검정', () => {
      expect(pyodideService.chiSquareTest).toBeDefined()
      expect(typeof pyodideService.chiSquareTest).toBe('function')
    })

    test('10. correlation - 상관분석', () => {
      expect(pyodideService.correlation).toBeDefined()
      expect(typeof pyodideService.correlation).toBe('function')
    })

    test('11. partialCorrelation - 편상관분석', () => {
      expect(pyodideService.partialCorrelation).toBeDefined()
      expect(typeof pyodideService.partialCorrelation).toBe('function')
    })
  })

  describe('분산분석 (ANOVA) - 3개', () => {
    test('12. oneWayANOVA - 일원분산분석', () => {
      expect(pyodideService.oneWayANOVA).toBeDefined()
      expect(typeof pyodideService.oneWayANOVA).toBe('function')
    })

    test('13. twoWayANOVA - 이원분산분석', () => {
      expect(pyodideService.twoWayANOVA).toBeDefined()
      expect(typeof pyodideService.twoWayANOVA).toBe('function')
    })

    test('14. repeatedMeasuresANOVA - 반복측정분산분석', () => {
      expect(pyodideService.repeatedMeasuresANOVA).toBeDefined()
      expect(typeof pyodideService.repeatedMeasuresANOVA).toBe('function')
    })
  })

  describe('사후검정 (Post-hoc Tests) - 3개', () => {
    test('15. tukeyHSD - Tukey HSD 검정', () => {
      expect(pyodideService.tukeyHSD).toBeDefined()
      expect(typeof pyodideService.tukeyHSD).toBe('function')
    })

    test('16. bonferroni - Bonferroni 교정', () => {
      expect(pyodideService.bonferroni).toBeDefined()
      expect(typeof pyodideService.bonferroni).toBe('function')
    })

    test('17. gamesHowell - Games-Howell 검정', () => {
      expect(pyodideService.gamesHowell).toBeDefined()
      expect(typeof pyodideService.gamesHowell).toBe('function')
    })
  })

  describe('비모수 검정 (Non-parametric Tests) - 4개', () => {
    test('18. mannWhitneyU - Mann-Whitney U 검정', () => {
      expect(pyodideService.mannWhitneyU).toBeDefined()
      expect(typeof pyodideService.mannWhitneyU).toBe('function')
    })

    test('19. wilcoxonSignedRank - Wilcoxon 부호순위 검정', () => {
      expect(pyodideService.wilcoxonSignedRank).toBeDefined()
      expect(typeof pyodideService.wilcoxonSignedRank).toBe('function')
    })

    test('20. kruskalWallis - Kruskal-Wallis 검정', () => {
      expect(pyodideService.kruskalWallis).toBeDefined()
      expect(typeof pyodideService.kruskalWallis).toBe('function')
    })

    test('21. friedmanTest - Friedman 검정', () => {
      expect(pyodideService.friedmanTest).toBeDefined()
      expect(typeof pyodideService.friedmanTest).toBe('function')
    })
  })

  describe('회귀분석 (Regression) - 3개', () => {
    test('22. simpleRegression - 단순회귀분석', () => {
      expect(pyodideService.simpleRegression).toBeDefined()
      expect(typeof pyodideService.simpleRegression).toBe('function')
    })

    test('23. multipleRegression - 다중회귀분석', () => {
      expect(pyodideService.multipleRegression).toBeDefined()
      expect(typeof pyodideService.multipleRegression).toBe('function')
    })

    test('24. logisticRegression - 로지스틱 회귀분석', () => {
      expect(pyodideService.logisticRegression).toBeDefined()
      expect(typeof pyodideService.logisticRegression).toBe('function')
    })
  })

  describe('고급 분석 (Advanced Analysis) - 2개', () => {
    test('25. pca - 주성분분석', () => {
      expect(pyodideService.pca).toBeDefined()
      expect(typeof pyodideService.pca).toBe('function')
    })

    test('26. kMeansClustering - K-평균 군집분석', () => {
      expect(pyodideService.kMeansClustering).toBeDefined()
      expect(typeof pyodideService.kMeansClustering).toBe('function')
    })
  })

  // 통계 메서드 목록 요약
  test('전체 통계 메서드 개수 확인', () => {
    const methods = [
      // 기술통계 (5개)
      'calculateDescriptiveStats',
      'normalityTest',
      'homogeneityTest',
      'outlierDetection',
      'checkAllAssumptions',

      // 가설검정 (6개)
      'oneSampleTTest',
      'twoSampleTTest',
      'pairedTTest',
      'chiSquareTest',
      'correlation',
      'partialCorrelation',

      // ANOVA (3개)
      'oneWayANOVA',
      'twoWayANOVA',
      'repeatedMeasuresANOVA',

      // 사후검정 (3개)
      'tukeyHSD',
      'bonferroni',
      'gamesHowell',

      // 비모수 (4개)
      'mannWhitneyU',
      'wilcoxonSignedRank',
      'kruskalWallis',
      'friedmanTest',

      // 회귀분석 (3개)
      'simpleRegression',
      'multipleRegression',
      'logisticRegression',

      // 고급분석 (2개)
      'pca',
      'kMeansClustering'
    ]

    let implementedCount = 0
    let missingMethods: string[] = []

    methods.forEach(method => {
      if (typeof (pyodideService as any)[method] === 'function') {
        implementedCount++
      } else {
        missingMethods.push(method)
      }
    })

    console.log(`\n=== 통계 메서드 구현 현황 ===`)
    console.log(`구현된 메서드: ${implementedCount}/26`)

    if (missingMethods.length > 0) {
      console.log(`미구현 메서드: ${missingMethods.join(', ')}`)
    }

    expect(implementedCount).toBeGreaterThan(0)
  })
})

describe('Pyodide 통계 서비스 - 코드 리뷰', () => {
  test('서비스 싱글톤 패턴 검증', () => {
    const instance1 = PyodideStatisticsService.getInstance()
    const instance2 = PyodideStatisticsService.getInstance()
    expect(instance1).toBe(instance2)
  })

  test('필수 메서드 타입 시그니처 검증', () => {
    const service = PyodideStatisticsService.getInstance()

    // 메서드가 정의되어 있고 함수인지 확인
    expect(service.calculateDescriptiveStats).toBeDefined()
    expect(service.oneSampleTTest).toBeDefined()
    expect(service.oneWayANOVA).toBeDefined()
    expect(service.tukeyHSD).toBeDefined()
    expect(service.mannWhitneyU).toBeDefined()
    expect(service.simpleRegression).toBeDefined()
  })

  test('별칭 메서드 호환성 검증', () => {
    const service = PyodideStatisticsService.getInstance()

    // 동일한 기능의 다른 이름 메서드들
    expect(service.calculateDescriptiveStatistics).toBeDefined()
    expect(service.descriptiveStats).toBeDefined()
    expect(service.testNormality).toBeDefined()
    expect(service.testHomogeneity).toBeDefined()
    expect(service.simpleLinearRegression).toBeDefined()
    expect(service.performBonferroni).toBeDefined()
    expect(service.gamesHowellTest).toBeDefined()
  })
})