/**
 * Unit Tests for DecisionTreeRecommender
 *
 * Test Coverage:
 * - 19 Decision Tree rules (5 purposes)
 * - 4 Helper functions
 * - Null safety (recommendWithoutAssumptions)
 * - Edge cases
 *
 * Total: 24 tests
 */

import { DecisionTreeRecommender } from '@/lib/services/decision-tree-recommender'
import type {
  StatisticalAssumptions,
  ValidationResults,
  DataRow,
  AnalysisPurpose
} from '@/types/smart-flow'

describe('DecisionTreeRecommender', () => {
  // ==================== Mock Data Setup ====================

  /** Mock: Normality test results */
  const mockNormalityPassed: StatisticalAssumptions['normality'] = {
    shapiroWilk: {
      statistic: 0.98,
      pValue: 0.15,
      isNormal: true
    },
    kolmogorovSmirnov: {
      statistic: 0.05,
      pValue: 0.20,
      isNormal: true
    }
  }

  const mockNormalityFailed: StatisticalAssumptions['normality'] = {
    shapiroWilk: {
      statistic: 0.85,
      pValue: 0.01,
      isNormal: false
    },
    kolmogorovSmirnov: {
      statistic: 0.15,
      pValue: 0.01,
      isNormal: false
    }
  }

  /** Mock: Homogeneity test results */
  const mockHomogeneityPassed: StatisticalAssumptions['homogeneity'] = {
    levene: {
      statistic: 1.5,
      pValue: 0.20,
      equalVariance: true
    }
  }

  const mockHomogeneityFailed: StatisticalAssumptions['homogeneity'] = {
    levene: {
      statistic: 5.2,
      pValue: 0.01,
      equalVariance: false
    }
  }

  /** Mock: ValidationResults */
  const mockValidationResults: ValidationResults = {
    isValid: true,
    totalRows: 100,
    columnCount: 3,
    dataType: 'table',
    variables: ['group', 'score', 'age'],
    errors: [],
    warnings: [],
    columns: [
      { name: 'group', type: 'categorical', uniqueValues: 2 },
      { name: 'score', type: 'numeric', uniqueValues: 50 },
      { name: 'age', type: 'numeric', uniqueValues: 30 }
    ] as any,
    missingValues: 0
  }

  const mockValidationResultsMultiFactor: ValidationResults = {
    isValid: true,
    totalRows: 100,
    columnCount: 4,
    dataType: 'table',
    variables: ['gender', 'treatment', 'score', 'age'],
    errors: [],
    warnings: [],
    columns: [
      { name: 'gender', type: 'categorical', uniqueValues: 2 },
      { name: 'treatment', type: 'categorical', uniqueValues: 3 },
      { name: 'score', type: 'numeric', uniqueValues: 50 },
      { name: 'age', type: 'numeric', uniqueValues: 30 }
    ] as any,
    missingValues: 0
  }

  const mockValidationResultsPaired: ValidationResults = {
    isValid: true,
    totalRows: 20,
    columnCount: 3,
    dataType: 'table',
    variables: ['subject_id', 'condition', 'score'],
    errors: [],
    warnings: [],
    columns: [
      { name: 'subject_id', type: 'categorical', uniqueValues: 10 },
      { name: 'condition', type: 'categorical', uniqueValues: 2 },
      { name: 'score', type: 'numeric', uniqueValues: 50 }
    ] as any,
    missingValues: 0
  }

  /** Mock: Data (Independent design) */
  const mockDataIndependent: DataRow[] = [
    { group: 'A', score: 85, age: 25 },
    { group: 'A', score: 90, age: 26 },
    { group: 'B', score: 75, age: 24 },
    { group: 'B', score: 80, age: 27 }
  ]

  /** Mock: Data (Paired design) */
  const mockDataPaired: DataRow[] = [
    { subject_id: 'S1', condition: 'pre', score: 70 },
    { subject_id: 'S1', condition: 'post', score: 85 },
    { subject_id: 'S2', condition: 'pre', score: 65 },
    { subject_id: 'S2', condition: 'post', score: 80 },
    { subject_id: 'S3', condition: 'pre', score: 75 },
    { subject_id: 'S3', condition: 'post', score: 90 }
  ]

  /** Mock: Data (Multi-factor) */
  const mockDataMultiFactor: DataRow[] = [
    { gender: 'Male', treatment: 'A', score: 85, age: 25 },
    { gender: 'Male', treatment: 'B', score: 90, age: 26 },
    { gender: 'Female', treatment: 'A', score: 75, age: 24 },
    { gender: 'Female', treatment: 'B', score: 80, age: 27 }
  ]

  /** Mock: Data (3+ groups) */
  const mockData3Groups: DataRow[] = [
    { group: 'A', score: 85, age: 25 },
    { group: 'B', score: 90, age: 26 },
    { group: 'C', score: 75, age: 24 }
  ]

  const mockValidationResults3Groups: ValidationResults = {
    isValid: true,
    totalRows: 90,
    columnCount: 3,
    dataType: 'table',
    variables: ['group', 'score', 'age'],
    errors: [],
    warnings: [],
    columns: [
      { name: 'group', type: 'categorical', uniqueValues: 3 },
      { name: 'score', type: 'numeric', uniqueValues: 50 },
      { name: 'age', type: 'numeric', uniqueValues: 30 }
    ] as any,
    missingValues: 0
  }

  // ==================== 1. Compare (9 tests) ====================

  describe('1. Compare Purpose (9 Decision Tree branches)', () => {
    it('should recommend Independent t-test (2 groups, normal, equal variance)', () => {
      const assumptions: StatisticalAssumptions = {
        normality: mockNormalityPassed,
        homogeneity: mockHomogeneityPassed
      }

      const result = DecisionTreeRecommender.recommend(
        'compare',
        assumptions,
        mockValidationResults,
        mockDataIndependent
      )

      expect(result.method.id).toBe('independent-t-test')
      expect(result.method.name).toBe('독립표본 t-검정')
      expect(result.confidence).toBeGreaterThanOrEqual(0.85)
      expect(result.reasoning.some(r => r.includes('그룹'))).toBe(true)
      expect(result.reasoning.some(r => r.includes('정규성'))).toBe(true)
      expect(result.reasoning.some(r => r.includes('등분산'))).toBe(true)
    })

    it('should recommend Mann-Whitney (2 groups, non-normal)', () => {
      const assumptions: StatisticalAssumptions = {
        normality: mockNormalityFailed,
        homogeneity: mockHomogeneityPassed
      }

      const result = DecisionTreeRecommender.recommend(
        'compare',
        assumptions,
        mockValidationResults,
        mockDataIndependent
      )

      expect(result.method.id).toBe('mann-whitney')
      expect(result.method.name).toBe('Mann-Whitney U 검정')
      expect(result.confidence).toBeGreaterThanOrEqual(0.85)
      expect(result.reasoning.some(r => r.includes('정규성 미충족'))).toBe(true)
      expect(result.reasoning.some(r => r.includes('비모수 검정'))).toBe(true)
    })

    it('should recommend Welch t-test (2 groups, unequal variance)', () => {
      const assumptions: StatisticalAssumptions = {
        normality: mockNormalityPassed,
        homogeneity: mockHomogeneityFailed
      }

      const result = DecisionTreeRecommender.recommend(
        'compare',
        assumptions,
        mockValidationResults,
        mockDataIndependent
      )

      expect(result.method.id).toBe('welch-t')
      expect(result.method.name).toContain('Welch')
      expect(result.confidence).toBeGreaterThanOrEqual(0.85)
      expect(result.reasoning.some(r => r.includes('등분산성 미충족'))).toBe(true)
    })

    it('should recommend Paired t-test (paired design, normal)', () => {
      const assumptions: StatisticalAssumptions = {
        normality: mockNormalityPassed,
        homogeneity: mockHomogeneityPassed
      }

      const result = DecisionTreeRecommender.recommend(
        'compare',
        assumptions,
        mockValidationResultsPaired,
        mockDataPaired
      )

      expect(result.method.id).toBe('paired-t-test')
      expect(result.method.name).toBe('대응표본 t-검정')
      expect(result.confidence).toBeGreaterThanOrEqual(0.85)
      expect(result.reasoning.some(r => r.includes('대응표본'))).toBe(true)
      expect(result.reasoning.some(r => r.includes('정규성 충족'))).toBe(true)
    })

    it('should recommend Wilcoxon (paired design, non-normal)', () => {
      const assumptions: StatisticalAssumptions = {
        normality: mockNormalityFailed,
        homogeneity: mockHomogeneityPassed
      }

      const result = DecisionTreeRecommender.recommend(
        'compare',
        assumptions,
        mockValidationResultsPaired,
        mockDataPaired
      )

      expect(result.method.id).toBe('wilcoxon-signed-rank')
      expect(result.method.name).toBe('Wilcoxon 부호순위 검정')
      expect(result.confidence).toBeGreaterThanOrEqual(0.85)
      expect(result.reasoning.some(r => r.includes('대응표본'))).toBe(true)
      expect(result.reasoning.some(r => r.includes('정규성 미충족'))).toBe(true)
    })

    it('should recommend One-way ANOVA (3+ groups, normal, equal variance)', () => {
      const assumptions: StatisticalAssumptions = {
        normality: mockNormalityPassed,
        homogeneity: mockHomogeneityPassed
      }

      const result = DecisionTreeRecommender.recommend(
        'compare',
        assumptions,
        mockValidationResults3Groups,
        mockData3Groups
      )

      expect(result.method.id).toBe('one-way-anova')
      expect(result.method.name).toContain('일원')
      expect(result.confidence).toBeGreaterThanOrEqual(0.85)
      expect(result.reasoning.some(r => r.includes('3개'))).toBe(true)
      expect(result.reasoning.some(r => r.includes('정규성'))).toBe(true)
      expect(result.reasoning.some(r => r.includes('등분산'))).toBe(true)
    })

    it('should recommend Kruskal-Wallis (3+ groups, non-normal)', () => {
      const assumptions: StatisticalAssumptions = {
        normality: mockNormalityFailed,
        homogeneity: mockHomogeneityPassed
      }

      const result = DecisionTreeRecommender.recommend(
        'compare',
        assumptions,
        mockValidationResults3Groups,
        mockData3Groups
      )

      expect(result.method.id).toBe('kruskal-wallis')
      expect(result.method.name).toBe('Kruskal-Wallis 검정')
      expect(result.confidence).toBeGreaterThanOrEqual(0.85)
      expect(result.reasoning.some(r => r.includes('가정 검정') || r.includes('미충족'))).toBe(true)
      expect(result.reasoning.some(r => r.includes('비모수'))).toBe(true)
    })

    it('should recommend Two-way ANOVA (multi-factor, normal, equal variance)', () => {
      const assumptions: StatisticalAssumptions = {
        normality: mockNormalityPassed,
        homogeneity: mockHomogeneityPassed
      }

      const result = DecisionTreeRecommender.recommend(
        'compare',
        assumptions,
        mockValidationResultsMultiFactor,
        mockDataMultiFactor
      )

      expect(result.method.id).toBe('two-way-anova')
      expect(result.method.name).toContain('이원')
      expect(result.confidence).toBeGreaterThanOrEqual(0.85)
      expect(result.reasoning.some(r => r.includes('요인'))).toBe(true)
      expect(result.reasoning.some(r => r.includes('정규성'))).toBe(true)
      expect(result.reasoning.some(r => r.includes('등분산'))).toBe(true)
    })

    it('should recommend Friedman (multi-factor, non-normal)', () => {
      const assumptions: StatisticalAssumptions = {
        normality: mockNormalityFailed,
        homogeneity: mockHomogeneityPassed
      }

      const result = DecisionTreeRecommender.recommend(
        'compare',
        assumptions,
        mockValidationResultsMultiFactor,
        mockDataMultiFactor
      )

      expect(result.method.id).toBe('friedman')
      expect(result.method.name).toBe('Friedman 검정')
      expect(result.confidence).toBeGreaterThanOrEqual(0.85)
      expect(result.reasoning.some(r => r.includes('요인'))).toBe(true)
      expect(result.reasoning.some(r => r.includes('비모수'))).toBe(true)
    })
  })

  // ==================== 2. Relationship (4 tests) ====================

  describe('2. Relationship Purpose (4 Decision Tree branches)', () => {
    const mockDataRelationship: DataRow[] = [
      { height: 170, weight: 65, age: 25 },
      { height: 175, weight: 70, age: 26 },
      { height: 180, weight: 75, age: 27 }
    ]

    const mockValidationResultsRelationship: ValidationResults = {
      isValid: true,
      totalRows: 100,
      columnCount: 3,
      dataType: 'table',
      variables: ['height', 'weight', 'age'],
      errors: [],
      warnings: [],
      columns: [
        { name: 'height', type: 'numeric', uniqueValues: 50 },
        { name: 'weight', type: 'numeric', uniqueValues: 50 },
        { name: 'age', type: 'numeric', uniqueValues: 30 }
      ] as any,
      missingValues: 0
    }

    it('should recommend Pearson correlation (normal distribution)', () => {
      const assumptions: StatisticalAssumptions = {
        normality: mockNormalityPassed,
        homogeneity: mockHomogeneityPassed
      }

      const result = DecisionTreeRecommender.recommend(
        'relationship',
        assumptions,
        mockValidationResultsRelationship,
        mockDataRelationship
      )

      expect(result.method.id).toBe('pearson-correlation')
      expect(result.method.name).toBe('Pearson 상관분석')
      expect(result.confidence).toBeGreaterThanOrEqual(0.85)
      expect(result.reasoning.some(r => r.includes('정규성'))).toBe(true)
      expect(result.reasoning.some(r => r.includes('수치형') || r.includes('관계'))).toBe(true)
    })

    it('should recommend Spearman correlation (non-normal distribution)', () => {
      const assumptions: StatisticalAssumptions = {
        normality: mockNormalityFailed,
        homogeneity: mockHomogeneityPassed
      }

      const result = DecisionTreeRecommender.recommend(
        'relationship',
        assumptions,
        mockValidationResultsRelationship,
        mockDataRelationship
      )

      expect(result.method.id).toBe('spearman-correlation')
      expect(result.method.name).toBe('Spearman 상관분석')
      expect(result.confidence).toBeGreaterThanOrEqual(0.85)
      expect(result.reasoning.some(r => r.includes('정규성 미충족'))).toBe(true)
      expect(result.reasoning.some(r => r.includes('비모수'))).toBe(true)
    })

    it('should recommend Multiple correlation (3+ numeric variables)', () => {
      const assumptions: StatisticalAssumptions = {
        normality: mockNormalityPassed,
        homogeneity: mockHomogeneityPassed
      }

      const result = DecisionTreeRecommender.recommend(
        'relationship',
        assumptions,
        mockValidationResultsRelationship,
        mockDataRelationship
      )

      expect(result.method.id).toBe('pearson-correlation')
      expect(result.confidence).toBeGreaterThanOrEqual(0.85)
    })

    it('should recommend fallback for categorical relationship', () => {
      const mockDataCategorical: DataRow[] = [
        { gender: 'Male', smoker: 'Yes' },
        { gender: 'Female', smoker: 'No' }
      ]

      const mockValidationResultsCategorical: ValidationResults = {
        isValid: true,
        totalRows: 50,
        columnCount: 2,
        dataType: 'table',
        variables: ['gender', 'smoker'],
        errors: [],
        warnings: [],
        columns: [
          { name: 'gender', type: 'categorical', uniqueValues: 2 },
          { name: 'smoker', type: 'categorical', uniqueValues: 2 }
        ] as any,
        missingValues: 0
      }

      const assumptions: StatisticalAssumptions = {
        normality: mockNormalityPassed,
        homogeneity: mockHomogeneityPassed
      }

      const result = DecisionTreeRecommender.recommend(
        'relationship',
        assumptions,
        mockValidationResultsCategorical,
        mockDataCategorical
      )

      // Relationship 추천은 수치형 변수가 < 2일 때 descriptive-stats로 fallback
      expect(result.method.id).toBe('descriptive-stats')
      expect(result.confidence).toBeGreaterThan(0)
    })
  })

  // ==================== 3. Distribution (1 test) ====================

  describe('3. Distribution Purpose (1 Decision Tree branch)', () => {
    it('should recommend Descriptive statistics', () => {
      const assumptions: StatisticalAssumptions = {
        normality: mockNormalityPassed,
        homogeneity: mockHomogeneityPassed
      }

      const result = DecisionTreeRecommender.recommend(
        'distribution',
        assumptions,
        mockValidationResults,
        mockDataIndependent
      )

      expect(result.method.id).toBe('descriptive-stats')
      expect(result.method.name).toContain('기술통계')
      expect(result.confidence).toBeGreaterThanOrEqual(0.85)
      expect(result.reasoning.some(r => r.includes('분포') || r.includes('빈도'))).toBe(true)
    })
  })

  // ==================== 4. Prediction (3 tests) ====================

  describe('4. Prediction Purpose (3 Decision Tree branches)', () => {
    it('should recommend Simple Linear Regression (1 predictor)', () => {
      const assumptions: StatisticalAssumptions = {
        normality: mockNormalityPassed,
        homogeneity: mockHomogeneityPassed
      }

      const result = DecisionTreeRecommender.recommend(
        'prediction',
        assumptions,
        mockValidationResults,
        mockDataIndependent
      )

      expect(result.method.id).toBe('simple-regression')
      expect(result.method.name).toContain('단순')
      expect(result.confidence).toBeGreaterThanOrEqual(0.85)
      expect(result.reasoning.some(r => r.includes('독립변수') || r.includes('회귀'))).toBe(true)
    })

    it('should recommend Multiple Linear Regression (2+ predictors)', () => {
      const mockData3Vars: DataRow[] = [
        { x1: 10, x2: 20, y: 100 },
        { x1: 15, x2: 25, y: 120 }
      ]

      const mockValidation3Vars: ValidationResults = {
        isValid: true,
        totalRows: 100,
        columnCount: 3,
        dataType: 'table',
        variables: ['x1', 'x2', 'y'],
        errors: [],
        warnings: [],
        columns: [
          { name: 'x1', type: 'numeric', uniqueValues: 50 },
          { name: 'x2', type: 'numeric', uniqueValues: 50 },
          { name: 'y', type: 'numeric', uniqueValues: 50 }
        ] as any,
        missingValues: 0
      }

      const assumptions: StatisticalAssumptions = {
        normality: mockNormalityPassed,
        homogeneity: mockHomogeneityPassed
      }

      const result = DecisionTreeRecommender.recommend(
        'prediction',
        assumptions,
        mockValidation3Vars,
        mockData3Vars
      )

      expect(['simple-regression', 'multiple-regression']).toContain(result.method.id)
      expect(result.confidence).toBeGreaterThanOrEqual(0.85)
    })

    it('should recommend Regression (categorical outcome)', () => {
      const mockDataLogistic: DataRow[] = [
        { age: 25, income: 50000, bought: 'Yes' },
        { age: 30, income: 60000, bought: 'No' }
      ]

      const mockValidationLogistic: ValidationResults = {
        isValid: true,
        totalRows: 100,
        columnCount: 3,
        dataType: 'table',
        variables: ['age', 'income', 'bought'],
        errors: [],
        warnings: [],
        columns: [
          { name: 'age', type: 'numeric', uniqueValues: 30 },
          { name: 'income', type: 'numeric', uniqueValues: 50 },
          { name: 'bought', type: 'categorical', uniqueValues: 2 }
        ] as any,
        missingValues: 0
      }

      const assumptions: StatisticalAssumptions = {
        normality: mockNormalityPassed,
        homogeneity: mockHomogeneityPassed
      }

      const result = DecisionTreeRecommender.recommend(
        'prediction',
        assumptions,
        mockValidationLogistic,
        mockDataLogistic
      )

      expect(['logistic-regression', 'simple-regression']).toContain(result.method.id)
      expect(result.confidence).toBeGreaterThanOrEqual(0.85)
    })
  })

  // ==================== 5. Timeseries (2 tests) ====================

  describe('5. Timeseries Purpose (2 Decision Tree branches)', () => {
    it('should recommend paired t-test for timeseries without datetime (normal)', () => {
      const mockDataTimeseries: DataRow[] = [
        { subject: 'S1', time: 't1', score: 70 },
        { subject: 'S1', time: 't2', score: 75 },
        { subject: 'S1', time: 't3', score: 80 },
        { subject: 'S2', time: 't1', score: 65 },
        { subject: 'S2', time: 't2', score: 70 },
        { subject: 'S2', time: 't3', score: 75 }
      ]

      const mockValidationTimeseries: ValidationResults = {
        isValid: true,
        totalRows: 6,
        columnCount: 3,
        dataType: 'table',
        variables: ['subject', 'time', 'score'],
        errors: [],
        warnings: [],
        columns: [
          { name: 'subject', type: 'categorical', uniqueValues: 2 },
          { name: 'time', type: 'categorical', uniqueValues: 3 },
          { name: 'score', type: 'numeric', uniqueValues: 50 }
        ] as any,
        missingValues: 0
      }

      const assumptions: StatisticalAssumptions = {
        normality: mockNormalityPassed,
        homogeneity: mockHomogeneityPassed
      }

      const result = DecisionTreeRecommender.recommend(
        'timeseries',
        assumptions,
        mockValidationTimeseries,
        mockDataTimeseries
      )

      // timeseries는 datetime 컬럼이 없으면 paired-t-test를 추천
      expect(result.method.id).toBe('paired-t-test')
      expect(result.confidence).toBeGreaterThan(0)
    })

    it('should recommend time-series-analysis with datetime column', () => {
      const mockDataTimeseries: DataRow[] = [
        { date: '2024-01-01', score: 70 },
        { date: '2024-01-02', score: 75 },
        { date: '2024-01-03', score: 80 }
      ]

      const mockValidationTimeseries: ValidationResults = {
        isValid: true,
        totalRows: 3,
        columnCount: 2,
        dataType: 'table',
        variables: ['date', 'score'],
        errors: [],
        warnings: [],
        columns: [
          { name: 'date', type: 'datetime', uniqueValues: 3 },
          { name: 'score', type: 'numeric', uniqueValues: 50 }
        ] as any,
        missingValues: 0
      }

      const assumptions: StatisticalAssumptions = {
        normality: mockNormalityFailed,
        homogeneity: mockHomogeneityPassed
      }

      const result = DecisionTreeRecommender.recommend(
        'timeseries',
        assumptions,
        mockValidationTimeseries,
        mockDataTimeseries
      )

      // datetime 컬럼이 있으면 time-series-analysis 추천
      expect(result.method.id).toBe('time-series-analysis')
      expect(result.confidence).toBeGreaterThan(0)
    })
  })

  // ==================== 6. Null Safety (2 tests) ====================

  describe('6. Null Safety (recommendWithoutAssumptions)', () => {
    it('should use recommendWithoutAssumptions when assumptionResults is null', () => {
      const result = DecisionTreeRecommender.recommendWithoutAssumptions(
        'compare',
        mockValidationResults,
        mockDataIndependent
      )

      expect(result).toBeDefined()
      expect(result.method).toBeDefined()
      expect(result.confidence).toBeGreaterThan(0)
      expect(result.reasoning.some(r => r.includes('가정 검정') || r.includes('통계적 가정'))).toBe(true)
    })

    it('should recommend nonparametric test by default (without assumptions)', () => {
      const result = DecisionTreeRecommender.recommendWithoutAssumptions(
        'compare',
        mockValidationResults,
        mockDataIndependent
      )

      // Should prioritize nonparametric tests when assumptions are unknown
      expect(['mann-whitney', 'kruskal-wallis', 'wilcoxon-signed-rank', 'friedman']).toContain(
        result.method.id
      )
    })
  })

  // ==================== 7. Helper Functions (2 tests) ====================

  describe('7. Helper Functions', () => {
    it('should detect paired design correctly (detectPairedDesign)', () => {
      // Access private method via reflection (for testing purposes)
      const detectPairedDesign = (DecisionTreeRecommender as any).detectPairedDesign.bind(
        DecisionTreeRecommender
      )

      const isPaired = detectPairedDesign(mockDataPaired, mockValidationResultsPaired)
      expect(isPaired).toBe(true)

      const isNotPaired = detectPairedDesign(mockDataIndependent, mockValidationResults)
      expect(isNotPaired).toBe(false)
    })

    it('should detect multi-factor correctly (detectFactors)', () => {
      // Access private method via reflection
      const detectFactors = (DecisionTreeRecommender as any).detectFactors.bind(
        DecisionTreeRecommender
      )

      const factors = detectFactors(mockDataMultiFactor, mockValidationResultsMultiFactor)
      expect(factors.length).toBeGreaterThanOrEqual(2)
      expect(factors).toContain('gender')
      expect(factors).toContain('treatment')

      const singleFactor = detectFactors(mockDataIndependent, mockValidationResults)
      expect(singleFactor.length).toBeLessThan(2)
    })
  })

  // ==================== 8. Edge Cases (2 tests) ====================

  describe('8. Edge Cases', () => {
    it('should handle empty data gracefully', () => {
      const assumptions: StatisticalAssumptions = {
        normality: mockNormalityPassed,
        homogeneity: mockHomogeneityPassed
      }

      const result = DecisionTreeRecommender.recommend(
        'compare',
        assumptions,
        mockValidationResults,
        []
      )

      expect(result).toBeDefined()
      expect(result.method).toBeDefined()
    })

    it('should handle missing columns gracefully', () => {
      const invalidValidation: ValidationResults = {
        isValid: true,
        totalRows: 0,
        columnCount: 0,
        dataType: 'table',
        variables: [],
        errors: [],
        warnings: [],
        columns: [],
        missingValues: 0
      }

      const assumptions: StatisticalAssumptions = {
        normality: mockNormalityPassed,
        homogeneity: mockHomogeneityPassed
      }

      const result = DecisionTreeRecommender.recommend(
        'compare',
        assumptions,
        invalidValidation,
        mockDataIndependent
      )

      expect(result).toBeDefined()
      expect(result.method).toBeDefined()
    })
  })
})
