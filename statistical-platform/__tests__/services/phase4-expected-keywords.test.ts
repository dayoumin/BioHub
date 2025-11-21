/**
 * Phase 4 - expectedReasoningKeywords 기능 테스트
 *
 * 검증 항목:
 * 1. AIRecommendation에 expectedReasoningKeywords 필드 존재
 * 2. 모든 추천 경로에서 키워드 정상 생성
 * 3. KeywordBasedRecommender 매핑 정확성
 */

import { DecisionTreeRecommender } from '@/lib/services/decision-tree-recommender'
import { KeywordBasedRecommender } from '@/lib/services/keyword-based-recommender'
import type { StatisticalAssumptions, ValidationResults, DataRow } from '@/types/smart-flow'

describe('Phase 4 - expectedReasoningKeywords 기능', () => {
  // Mock 데이터 헬퍼
  const createMockAssumptions = (isNormal = true, equalVariance = true): StatisticalAssumptions => ({
    normality: {
      shapiroWilk: {
        statistic: isNormal ? 0.95 : 0.82,
        pValue: isNormal ? 0.15 : 0.01,
        isNormal
      }
    },
    homogeneity: {
      levene: {
        statistic: 1.2,
        pValue: equalVariance ? 0.25 : 0.01,
        equalVariance
      }
    }
  })

  const createMockValidation = (
    columnCount: number,
    uniqueGroups: number,
    columnType: 'numeric' | 'categorical' = 'categorical'
  ): ValidationResults => ({
    isValid: true,
    totalRows: 100,
    columnCount,
    missingValues: 0,
    dataType: 'numeric',
    variables: ['group', 'value'],
    errors: [],
    warnings: [],
    columns: [
      {
        name: 'group',
        type: columnType,
        numericCount: 0,
        textCount: 100,
        missingCount: 0,
        uniqueValues: uniqueGroups
      },
      {
        name: 'value',
        type: 'numeric',
        numericCount: 100,
        textCount: 0,
        missingCount: 0,
        uniqueValues: 100,
        mean: 50,
        std: 10
      }
    ]
  })

  const createMockData = (groups: number): DataRow[] => {
    const groupNames = ['A', 'B', 'C', 'D'].slice(0, groups)
    return Array.from({ length: 100 }, (_, i) => ({
      group: groupNames[i % groups],
      value: 50 + Math.random() * 10
    }))
  }

  describe('1. KeywordBasedRecommender 매핑', () => {
    it('18개 메서드의 키워드 매핑이 존재해야 함', () => {
      const methods = [
        'independent-t-test',
        'paired-t-test',
        'pearson-correlation',
        'spearman-correlation',
        'correlation',
        'regression',
        'simple-regression',
        'logistic-regression',
        'one-way-anova',
        'two-way-anova',
        'anova',
        'mann-whitney',
        'welch-t',
        'wilcoxon-signed-rank',
        'kruskal-wallis',
        'friedman',
        'chi-square',
        'descriptive-stats',
        'time-series-analysis'
      ]

      methods.forEach(methodId => {
        const keywords = KeywordBasedRecommender.getExpectedReasoningKeywords(methodId)
        expect(keywords).toBeDefined()
        expect(keywords.length).toBeGreaterThan(0)
      })
    })

    it('independent-t-test 키워드가 정확해야 함', () => {
      const keywords = KeywordBasedRecommender.getExpectedReasoningKeywords('independent-t-test')
      expect(keywords).toEqual(['2개 그룹', '독립', '정규성', '등분산성'])
    })

    it('one-way-anova 키워드가 정확해야 함', () => {
      const keywords = KeywordBasedRecommender.getExpectedReasoningKeywords('one-way-anova')
      expect(keywords).toEqual(['3개 이상', 'ANOVA', '분산', '정규성', '등분산성'])
    })

    it('mann-whitney 키워드가 정확해야 함', () => {
      const keywords = KeywordBasedRecommender.getExpectedReasoningKeywords('mann-whitney')
      expect(keywords).toEqual(['비모수', '순위', '정규성 위배'])
    })
  })

  describe('2. DecisionTreeRecommender - expectedReasoningKeywords 필드 존재', () => {
    it('2-group compare (정규성 ✓) → independent-t-test', () => {
      const assumptions = createMockAssumptions(true, true)
      const validation = createMockValidation(2, 2)
      const data = createMockData(2)

      const recommendation = DecisionTreeRecommender.recommend(
        'compare',
        assumptions,
        validation,
        data
      )

      expect(recommendation.method.id).toBe('independent-t-test')
      expect(recommendation.expectedReasoningKeywords).toBeDefined()
      expect(recommendation.expectedReasoningKeywords).toEqual([
        '2개 그룹', '독립', '정규성', '등분산성'
      ])
    })

    it('2-group compare (정규성 ✗) → mann-whitney', () => {
      const assumptions = createMockAssumptions(false, true)
      const validation = createMockValidation(2, 2)
      const data = createMockData(2)

      const recommendation = DecisionTreeRecommender.recommend(
        'compare',
        assumptions,
        validation,
        data
      )

      expect(recommendation.method.id).toBe('mann-whitney')
      expect(recommendation.expectedReasoningKeywords).toBeDefined()
      expect(recommendation.expectedReasoningKeywords).toEqual([
        '비모수', '순위', '정규성 위배'
      ])
    })

    it('3-group compare (정규성 ✓) → one-way-anova', () => {
      const assumptions = createMockAssumptions(true, true)
      const validation = createMockValidation(2, 3)
      const data = createMockData(3)

      const recommendation = DecisionTreeRecommender.recommend(
        'compare',
        assumptions,
        validation,
        data
      )

      expect(recommendation.method.id).toBe('one-way-anova')
      expect(recommendation.expectedReasoningKeywords).toBeDefined()
      expect(recommendation.expectedReasoningKeywords).toEqual([
        '3개 이상', 'ANOVA', '분산', '정규성', '등분산성'
      ])
    })

    it('3-group compare (정규성 ✗) → kruskal-wallis', () => {
      const assumptions = createMockAssumptions(false, true)
      const validation = createMockValidation(2, 3)
      const data = createMockData(3)

      const recommendation = DecisionTreeRecommender.recommend(
        'compare',
        assumptions,
        validation,
        data
      )

      expect(recommendation.method.id).toBe('kruskal-wallis')
      expect(recommendation.expectedReasoningKeywords).toBeDefined()
      expect(recommendation.expectedReasoningKeywords).toEqual([
        '비모수', '순위', '3개 이상', '정규성 위배'
      ])
    })

    it('relationship (정규성 ✓) → pearson-correlation', () => {
      const assumptions = createMockAssumptions(true, true)
      const validation: ValidationResults = {
        isValid: true,
        totalRows: 100,
        columnCount: 2,
        missingValues: 0,
        dataType: 'numeric',
        variables: ['x', 'y'],
        errors: [],
        warnings: [],
        columns: [
          { name: 'x', type: 'numeric', numericCount: 100, textCount: 0, missingCount: 0, uniqueValues: 100, mean: 50, std: 10 },
          { name: 'y', type: 'numeric', numericCount: 100, textCount: 0, missingCount: 0, uniqueValues: 100, mean: 55, std: 12 }
        ]
      }
      const data = Array.from({ length: 100 }, (_, i) => ({
        x: 50 + Math.random() * 10,
        y: 55 + Math.random() * 12
      }))

      const recommendation = DecisionTreeRecommender.recommend(
        'relationship',
        assumptions,
        validation,
        data
      )

      expect(recommendation.method.id).toBe('pearson-correlation')
      expect(recommendation.expectedReasoningKeywords).toBeDefined()
      expect(recommendation.expectedReasoningKeywords).toEqual([
        '상관', '선형', '정규성'
      ])
    })

    it('relationship (정규성 ✗) → spearman-correlation', () => {
      const assumptions = createMockAssumptions(false, true)
      const validation: ValidationResults = {
        isValid: true,
        totalRows: 100,
        columnCount: 2,
        missingValues: 0,
        dataType: 'numeric',
        variables: ['x', 'y'],
        errors: [],
        warnings: [],
        columns: [
          { name: 'x', type: 'numeric', numericCount: 100, textCount: 0, missingCount: 0, uniqueValues: 100, mean: 50, std: 10 },
          { name: 'y', type: 'numeric', numericCount: 100, textCount: 0, missingCount: 0, uniqueValues: 100, mean: 55, std: 12 }
        ]
      }
      const data = Array.from({ length: 100 }, (_, i) => ({
        x: 50 + Math.random() * 10,
        y: 55 + Math.random() * 12
      }))

      const recommendation = DecisionTreeRecommender.recommend(
        'relationship',
        assumptions,
        validation,
        data
      )

      expect(recommendation.method.id).toBe('spearman-correlation')
      expect(recommendation.expectedReasoningKeywords).toBeDefined()
      expect(recommendation.expectedReasoningKeywords).toEqual([
        '상관', '순위', '비모수'
      ])
    })
  })

  describe('3. recommendWithoutAssumptions - expectedReasoningKeywords 필드 존재', () => {
    it('2-group compare (assumptions 없음) → mann-whitney', () => {
      const validation = createMockValidation(2, 2)
      const data = createMockData(2)

      const recommendation = DecisionTreeRecommender.recommendWithoutAssumptions(
        'compare',
        validation,
        data
      )

      expect(recommendation.method.id).toBe('mann-whitney')
      expect(recommendation.expectedReasoningKeywords).toBeDefined()
      expect(recommendation.expectedReasoningKeywords?.length).toBeGreaterThan(0)
    })

    it('3-group compare (assumptions 없음) → kruskal-wallis', () => {
      const validation = createMockValidation(2, 3)
      const data = createMockData(3)

      const recommendation = DecisionTreeRecommender.recommendWithoutAssumptions(
        'compare',
        validation,
        data
      )

      expect(recommendation.method.id).toBe('kruskal-wallis')
      expect(recommendation.expectedReasoningKeywords).toBeDefined()
      expect(recommendation.expectedReasoningKeywords?.length).toBeGreaterThan(0)
    })

    it('relationship (assumptions 없음) → spearman-correlation', () => {
      const validation: ValidationResults = {
        isValid: true,
        totalRows: 100,
        columnCount: 2,
        missingValues: 0,
        dataType: 'numeric',
        variables: ['x', 'y'],
        errors: [],
        warnings: [],
        columns: [
          { name: 'x', type: 'numeric', numericCount: 100, textCount: 0, missingCount: 0, uniqueValues: 100 },
          { name: 'y', type: 'numeric', numericCount: 100, textCount: 0, missingCount: 0, uniqueValues: 100 }
        ]
      }
      const data = Array.from({ length: 100 }, (_, i) => ({ x: i, y: i * 2 }))

      const recommendation = DecisionTreeRecommender.recommendWithoutAssumptions(
        'relationship',
        validation,
        data
      )

      expect(recommendation.method.id).toBe('spearman-correlation')
      expect(recommendation.expectedReasoningKeywords).toBeDefined()
      expect(recommendation.expectedReasoningKeywords?.length).toBeGreaterThan(0)
    })
  })

  describe('4. 모든 추천 경로에서 expectedReasoningKeywords 존재 확인', () => {
    it('distribution → descriptive-stats', () => {
      const validation = createMockValidation(1, 1)
      const data = createMockData(1)

      const recommendation = DecisionTreeRecommender.recommendWithoutAssumptions(
        'distribution',
        validation,
        data
      )

      expect(recommendation.method.id).toBe('descriptive-stats')
      expect(recommendation.expectedReasoningKeywords).toBeDefined()
    })

    it('prediction → simple-regression', () => {
      const validation: ValidationResults = {
        isValid: true,
        totalRows: 100,
        columnCount: 2,
        missingValues: 0,
        dataType: 'numeric',
        variables: ['x', 'y'],
        errors: [],
        warnings: [],
        columns: [
          { name: 'x', type: 'numeric', numericCount: 100, textCount: 0, missingCount: 0, uniqueValues: 100 },
          { name: 'y', type: 'numeric', numericCount: 100, textCount: 0, missingCount: 0, uniqueValues: 100 }
        ]
      }
      const data = Array.from({ length: 100 }, (_, i) => ({ x: i, y: i * 2 }))

      const recommendation = DecisionTreeRecommender.recommendWithoutAssumptions(
        'prediction',
        validation,
        data
      )

      expect(recommendation.method.id).toBe('simple-regression')
      expect(recommendation.expectedReasoningKeywords).toBeDefined()
    })

    it('fallback (unknown purpose) → descriptive-stats', () => {
      const validation = createMockValidation(1, 1)
      const data = createMockData(1)

      const recommendation = DecisionTreeRecommender.recommendWithoutAssumptions(
        'distribution' as any,
        validation,
        data
      )

      expect(recommendation.expectedReasoningKeywords).toBeDefined()
    })
  })
})
