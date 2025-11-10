/**
 * ANOVA Role Mapping Fix 검증 테스트
 *
 * 버그: variable-requirements.ts의 role이 'independent'였지만
 *       types/statistics.ts와 anova/page.tsx는 'factor'를 기대
 *
 * 수정: role: 'independent' → 'factor'
 *
 * 테스트 시나리오:
 * 1. One-Way ANOVA의 role이 'factor'인지 확인
 * 2. Two-Way, Three-Way ANOVA도 'factor' 사용 확인
 * 3. 표준 role 매핑 규칙 준수 확인
 */

import { STATISTICAL_METHOD_REQUIREMENTS } from '../variable-requirements'

describe('ANOVA Role Mapping Fix', () => {
  describe('One-Way ANOVA', () => {
    const oneWayAnova = STATISTICAL_METHOD_REQUIREMENTS.find(m => m.id === 'one-way-anova')

    it('should exist in requirements', () => {
      expect(oneWayAnova).toBeDefined()
    })

    it('should have factor variable with correct role', () => {
      expect(oneWayAnova).toBeDefined()
      const factorVariable = oneWayAnova!.variables.find(v => v.role === 'factor')

      expect(factorVariable).toBeDefined()
      expect(factorVariable!.label).toContain('요인')
      expect(factorVariable!.types).toContain('categorical')
    })

    it('should NOT have independent variable role (old bug)', () => {
      expect(oneWayAnova).toBeDefined()
      const independentVariable = oneWayAnova!.variables.find(v => v.role === 'independent')

      expect(independentVariable).toBeUndefined()
    })

    it('should have dependent variable', () => {
      expect(oneWayAnova).toBeDefined()
      const dependentVariable = oneWayAnova!.variables.find(v => v.role === 'dependent')

      expect(dependentVariable).toBeDefined()
      expect(dependentVariable!.types).toContain('continuous')
    })

    it('should match types/statistics.ts ANOVAVariables interface', () => {
      expect(oneWayAnova).toBeDefined()

      // ANOVAVariables 인터페이스 기대값
      const expectedRoles = ['dependent', 'factor']

      const actualRoles = oneWayAnova!.variables.map(v => v.role)

      // dependent와 factor가 포함되어야 함
      expect(actualRoles).toContain('dependent')
      expect(actualRoles).toContain('factor')
    })
  })

  describe('Two-Way ANOVA', () => {
    const twoWayAnova = STATISTICAL_METHOD_REQUIREMENTS.find(m => m.id === 'two-way-anova')

    it('should have factor role (not independent)', () => {
      expect(twoWayAnova).toBeDefined()
      const factorVariable = twoWayAnova!.variables.find(v => v.role === 'factor')

      expect(factorVariable).toBeDefined()
      expect(factorVariable!.multiple).toBe(true)
      expect(factorVariable!.minCount).toBe(2)
      expect(factorVariable!.maxCount).toBe(2)
    })
  })

  describe('Three-Way ANOVA', () => {
    const threeWayAnova = STATISTICAL_METHOD_REQUIREMENTS.find(m => m.id === 'three-way-anova')

    it('should have factor role (not independent)', () => {
      expect(threeWayAnova).toBeDefined()
      const factorVariable = threeWayAnova!.variables.find(v => v.role === 'factor')

      expect(factorVariable).toBeDefined()
      expect(factorVariable!.multiple).toBe(true)
      expect(factorVariable!.minCount).toBe(3)
      expect(factorVariable!.maxCount).toBe(3)
    })
  })

  describe('Standard Role Mapping Compliance', () => {
    it('all ANOVA variants should use "factor" role for categorical variables', () => {
      const anovaVariants = STATISTICAL_METHOD_REQUIREMENTS.filter(m =>
        m.id.includes('anova') && m.category === 'glm'
      )

      anovaVariants.forEach(anova => {
        const categoricalVariables = anova.variables.filter(v =>
          v.types.includes('categorical') && v.role !== 'dependent'
        )

        categoricalVariables.forEach(v => {
          // 범주형 독립변수는 'factor' 또는 'within', 'between' role 사용
          const validRoles = ['factor', 'within', 'between']
          expect(validRoles).toContain(v.role)

          // 'independent' role은 사용하지 않음
          expect(v.role).not.toBe('independent')
        })
      })
    })

    it('MANOVA should also use "factor" role', () => {
      const manova = STATISTICAL_METHOD_REQUIREMENTS.find(m => m.id === 'manova')

      expect(manova).toBeDefined()
      const factorVariable = manova!.variables.find(v => v.role === 'factor')

      expect(factorVariable).toBeDefined()
      expect(factorVariable!.multiple).toBe(true)
    })

    it('Mixed Model should use "factor" role for fixed effects', () => {
      const mixedModel = STATISTICAL_METHOD_REQUIREMENTS.find(m => m.id === 'mixed-model')

      expect(mixedModel).toBeDefined()
      const factorVariable = mixedModel!.variables.find(v => v.role === 'factor')

      expect(factorVariable).toBeDefined()
      expect(factorVariable!.label).toContain('고정 효과')
    })
  })

  describe('Nonparametric Tests', () => {
    it('Mann-Whitney should use "factor" role for grouping variable', () => {
      const mannWhitney = STATISTICAL_METHOD_REQUIREMENTS.find(m => m.id === 'mann-whitney')

      expect(mannWhitney).toBeDefined()
      const factorVariable = mannWhitney!.variables.find(v => v.role === 'factor')

      expect(factorVariable).toBeDefined()
      expect(factorVariable!.label).toContain('그룹')
    })

    it('Kruskal-Wallis should use "factor" role for grouping variable', () => {
      const kruskalWallis = STATISTICAL_METHOD_REQUIREMENTS.find(m => m.id === 'kruskal-wallis')

      expect(kruskalWallis).toBeDefined()
      const factorVariable = kruskalWallis!.variables.find(v => v.role === 'factor')

      expect(factorVariable).toBeDefined()
      expect(factorVariable!.label).toContain('그룹')
    })

    it('Friedman should use "within" role for repeated measures', () => {
      const friedman = STATISTICAL_METHOD_REQUIREMENTS.find(m => m.id === 'friedman')

      expect(friedman).toBeDefined()
      const withinVariable = friedman!.variables.find(v => v.role === 'within')

      expect(withinVariable).toBeDefined()
      expect(withinVariable!.multiple).toBe(true)
      expect(withinVariable!.minCount).toBe(3)
    })
  })

  describe('Bug Prevention', () => {
    it('should not allow "independent" role in any ANOVA-related tests', () => {
      const anovaRelated = STATISTICAL_METHOD_REQUIREMENTS.filter(m =>
        m.id.includes('anova') || m.id === 'manova' || m.id === 'mixed-model'
      )

      anovaRelated.forEach(test => {
        const hasIndependentRole = test.variables.some(v => v.role === 'independent')

        expect(hasIndependentRole).toBe(false)
      })
    })

    it('all categorical grouping variables should use standard roles', () => {
      // 표준 role 목록 (SPSS/R/SAS 호환)
      const standardRoles = [
        'dependent',
        'factor',      // 요인 (고정효과) - ANOVA 계열
        'within',      // 개체내 요인 - Repeated Measures
        'between',     // 개체간 요인
        'covariate',   // 공변량 - ANCOVA
        'blocking',    // 블록 요인
        'weight',      // 가중치 - Poisson
        'stratum',     // 층
        'independent'  // 독립변수 - Regression, Cross-tabulation, Chi-square
      ]

      STATISTICAL_METHOD_REQUIREMENTS.forEach(method => {
        method.variables.forEach(variable => {
          // 모든 변수 role은 표준 role 목록에 있어야 함
          expect(standardRoles).toContain(variable.role)
        })
      })
    })
  })
})
