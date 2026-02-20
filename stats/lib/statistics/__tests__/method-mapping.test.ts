import { describe, it, expect } from 'vitest'
import {
  STATISTICAL_METHODS,
  QUESTION_TYPES,
  getMethodsByQuestionType,
  recommendMethods,
  checkMethodRequirements
} from '../method-mapping'

describe('Method Mapping', () => {
  describe('STATISTICAL_METHODS', () => {
    it('should have exactly 29 statistical methods', () => {
      expect(STATISTICAL_METHODS).toHaveLength(29)
    })

    it('should have valid structure for all methods', () => {
      STATISTICAL_METHODS.forEach(method => {
        expect(method).toHaveProperty('id')
        expect(method).toHaveProperty('name')
        expect(method).toHaveProperty('description')
        expect(method).toHaveProperty('category')
        expect(typeof method.id).toBe('string')
        expect(typeof method.name).toBe('string')
        expect(typeof method.description).toBe('string')
        expect(typeof method.category).toBe('string')
      })
    })

    it('should have unique IDs for all methods', () => {
      const ids = STATISTICAL_METHODS.map(m => m.id)
      const uniqueIds = new Set(ids)
      expect(uniqueIds.size).toBe(ids.length)
    })
  })

  describe('QUESTION_TYPES', () => {
    it('should have exactly 4 question types', () => {
      expect(QUESTION_TYPES).toHaveLength(4)
    })

    it('should have required properties', () => {
      QUESTION_TYPES.forEach(type => {
        expect(type).toHaveProperty('id')
        expect(type).toHaveProperty('name')
        expect(type).toHaveProperty('icon')
        expect(type).toHaveProperty('description')
        expect(type).toHaveProperty('methods')
        expect(Array.isArray(type.methods)).toBe(true)
      })
    })
  })

  describe('getMethodsByQuestionType', () => {
    it('should return correct methods for comparison type', () => {
      const methods = getMethodsByQuestionType('comparison')
      const methodCategories = methods.map(m => m.category)

      expect(methodCategories).toContain('t-test')
      expect(methodCategories).toContain('anova')
      expect(methodCategories).toContain('nonparametric')
    })

    it('should return correct methods for relationship type', () => {
      const methods = getMethodsByQuestionType('relationship')
      const methodCategories = methods.map(m => m.category)

      expect(methodCategories).toContain('correlation')
      expect(methodCategories).toContain('regression')
    })

    it('should return empty array for invalid type', () => {
      const methods = getMethodsByQuestionType('invalid')
      expect(methods).toEqual([])
    })
  })

  describe('recommendMethods', () => {
    it('should always recommend descriptive statistics', () => {
      const profile = {
        numericVars: 1,
        categoricalVars: 0,
        totalRows: 100,
        hasTimeVar: false,
        hasGroupVar: false
      }

      const recommendations = recommendMethods(profile)
      const hasDescriptive = recommendations.some(m => m.id === 'descriptive-stats')
      expect(hasDescriptive).toBe(true)
    })

    it('should recommend correlation for multiple numeric variables', () => {
      const profile = {
        numericVars: 3,
        categoricalVars: 0,
        totalRows: 100,
        hasTimeVar: false,
        hasGroupVar: false
      }

      const recommendations = recommendMethods(profile)
      const hasCorrelation = recommendations.some(m => m.id === 'correlation')
      expect(hasCorrelation).toBe(true)
    })

    it('should recommend t-test for binary groups', () => {
      const profile = {
        numericVars: 1,
        categoricalVars: 1,
        totalRows: 100,
        hasTimeVar: false,
        hasGroupVar: true,
        groupLevels: 2
      }

      const recommendations = recommendMethods(profile)
      const hasTTest = recommendations.some(m => m.id === 'two-sample-t')
      expect(hasTTest).toBe(true)
    })

    it('should recommend ANOVA for multiple groups', () => {
      const profile = {
        numericVars: 1,
        categoricalVars: 1,
        totalRows: 100,
        hasTimeVar: false,
        hasGroupVar: true,
        groupLevels: 4
      }

      const recommendations = recommendMethods(profile)
      const hasANOVA = recommendations.some(m => m.id === 'one-way-anova')
      expect(hasANOVA).toBe(true)
    })

    it('should recommend time series for temporal data', () => {
      const profile = {
        numericVars: 2,
        categoricalVars: 0,
        totalRows: 100,
        hasTimeVar: true,
        hasGroupVar: false
      }

      const recommendations = recommendMethods(profile)
      const hasTimeSeries = recommendations.some(m => m.id === 'time-decomposition')
      expect(hasTimeSeries).toBe(true)
    })

    it('should recommend PCA for multiple numeric variables with enough data', () => {
      const profile = {
        numericVars: 5,
        categoricalVars: 0,
        totalRows: 50,
        hasTimeVar: false,
        hasGroupVar: false
      }

      const recommendations = recommendMethods(profile)
      const hasPCA = recommendations.some(m => m.id === 'pca')
      expect(hasPCA).toBe(true)
    })
  })

  describe('checkMethodRequirements', () => {
    const tTestMethod = STATISTICAL_METHODS.find(m => m.id === 'two-sample-t')!

    it('should pass requirements with sufficient data', () => {
      const profile = {
        numericVars: 1,
        categoricalVars: 1,
        totalRows: 20,
        normalityPassed: true,
        homogeneityPassed: true
      }

      const result = checkMethodRequirements(tTestMethod, profile)
      expect(result.canUse).toBe(true)
      expect(result.warnings).toHaveLength(0)
    })

    it('should fail with insufficient sample size', () => {
      const profile = {
        numericVars: 1,
        categoricalVars: 1,
        totalRows: 2,
        normalityPassed: true,
        homogeneityPassed: true
      }

      const result = checkMethodRequirements(tTestMethod, profile)
      expect(result.canUse).toBe(false)
      expect(result.warnings).toContain('최소 4개 데이터 필요 (현재: 2개)')
    })

    it('should warn about normality assumption violation', () => {
      const profile = {
        numericVars: 1,
        categoricalVars: 1,
        totalRows: 20,
        normalityPassed: false,
        homogeneityPassed: true
      }

      const result = checkMethodRequirements(tTestMethod, profile)
      expect(result.canUse).toBe(true) // Can still use but with warning
      expect(result.warnings).toContain('정규성 가정 위반 (비모수 검정 고려)')
    })

    it('should warn about homogeneity assumption violation', () => {
      const profile = {
        numericVars: 1,
        categoricalVars: 1,
        totalRows: 20,
        normalityPassed: true,
        homogeneityPassed: false
      }

      const result = checkMethodRequirements(tTestMethod, profile)
      expect(result.canUse).toBe(true) // Can still use but with warning
      expect(result.warnings).toContain('등분산성 가정 위반 (Welch 검정 고려)')
    })

    it('should fail if no numeric variables for numeric methods', () => {
      const profile = {
        numericVars: 0,
        categoricalVars: 2,
        totalRows: 100,
        normalityPassed: true,
        homogeneityPassed: true
      }

      const result = checkMethodRequirements(tTestMethod, profile)
      expect(result.canUse).toBe(false)
      expect(result.warnings).toContain('수치형 변수 필요')
    })
  })
})