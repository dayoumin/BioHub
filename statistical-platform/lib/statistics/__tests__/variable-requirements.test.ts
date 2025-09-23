/**
 * variable-requirements.ts 테스트
 * 41개 통계 메서드의 변수 요구사항 정의를 검증
 */

import {
  STATISTICAL_METHOD_REQUIREMENTS,
  getMethodRequirements,
  getMethodsByCategory,
  recommendMethodsByVariableTypes,
  VariableType,
  VariableRole,
  StatisticalMethodRequirements
} from '../variable-requirements'

describe('Variable Requirements', () => {
  describe('STATISTICAL_METHOD_REQUIREMENTS', () => {
    it('43개의 통계 메서드가 정의되어야 함', () => {
      expect(STATISTICAL_METHOD_REQUIREMENTS).toHaveLength(43)
    })

    it('모든 메서드가 필수 속성을 가져야 함', () => {
      STATISTICAL_METHOD_REQUIREMENTS.forEach(method => {
        // 필수 속성 확인
        expect(method.id).toBeDefined()
        expect(method.name).toBeDefined()
        expect(method.category).toBeDefined()
        expect(method.description).toBeDefined()
        expect(method.minSampleSize).toBeGreaterThan(0)
        expect(method.assumptions).toBeDefined()
        expect(Array.isArray(method.assumptions)).toBe(true)
        expect(method.variables).toBeDefined()
        expect(Array.isArray(method.variables)).toBe(true)
        expect(method.variables.length).toBeGreaterThan(0)
      })
    })

    it('모든 변수 요구사항이 유효해야 함', () => {
      STATISTICAL_METHOD_REQUIREMENTS.forEach(method => {
        method.variables.forEach(variable => {
          // 필수 속성 확인
          expect(variable.role).toBeDefined()
          expect(variable.label).toBeDefined()
          expect(variable.types).toBeDefined()
          expect(Array.isArray(variable.types)).toBe(true)
          expect(variable.types.length).toBeGreaterThan(0)
          expect(typeof variable.required).toBe('boolean')
          expect(typeof variable.multiple).toBe('boolean')
          expect(variable.description).toBeDefined()

          // minCount와 maxCount 논리 확인
          if (variable.minCount !== undefined && variable.maxCount !== undefined) {
            expect(variable.minCount).toBeLessThanOrEqual(variable.maxCount)
          }
        })
      })
    })

    it('카테고리별 메서드 수가 올바라야 함', () => {
      const categoryCounts = new Map<string, number>()
      STATISTICAL_METHOD_REQUIREMENTS.forEach(method => {
        categoryCounts.set(method.category, (categoryCounts.get(method.category) || 0) + 1)
      })

      expect(categoryCounts.get('descriptive')).toBe(5)
      expect(categoryCounts.get('compare')).toBe(6)
      expect(categoryCounts.get('glm')).toBe(7)
      expect(categoryCounts.get('correlate')).toBe(4)
      expect(categoryCounts.get('regression')).toBe(6)
      expect(categoryCounts.get('nonparametric')).toBe(8)
      expect(categoryCounts.get('chi-square')).toBe(3)
      expect(categoryCounts.get('advanced')).toBe(4)
    })

    it('메서드 ID가 유니크해야 함', () => {
      const ids = STATISTICAL_METHOD_REQUIREMENTS.map(m => m.id)
      const uniqueIds = new Set(ids)
      expect(uniqueIds.size).toBe(ids.length)
    })
  })

  describe('getMethodRequirements', () => {
    it('올바른 메서드 ID로 요구사항을 반환해야 함', () => {
      const tTest = getMethodRequirements('two-sample-t')
      expect(tTest).toBeDefined()
      expect(tTest?.name).toBe('독립표본 t-검정')
      expect(tTest?.category).toBe('compare')
      expect(tTest?.variables).toHaveLength(2)
    })

    it('잘못된 메서드 ID는 undefined를 반환해야 함', () => {
      const result = getMethodRequirements('invalid-method')
      expect(result).toBeUndefined()
    })

    it('특정 메서드의 변수 요구사항이 정확해야 함', () => {
      // 다중회귀분석 테스트
      const multipleRegression = getMethodRequirements('multiple-regression')
      expect(multipleRegression).toBeDefined()

      const dependentVar = multipleRegression?.variables.find(v => v.role === 'dependent')
      expect(dependentVar?.types).toContain('continuous')
      expect(dependentVar?.required).toBe(true)
      expect(dependentVar?.multiple).toBe(false)

      const independentVars = multipleRegression?.variables.find(v => v.role === 'independent')
      expect(independentVars?.types).toContain('continuous')
      expect(independentVars?.types).toContain('categorical')
      expect(independentVars?.required).toBe(true)
      expect(independentVars?.multiple).toBe(true)
      expect(independentVars?.minCount).toBe(2)
    })
  })

  describe('getMethodsByCategory', () => {
    it('카테고리별로 올바른 메서드들을 반환해야 함', () => {
      const descriptiveMethods = getMethodsByCategory('descriptive')
      expect(descriptiveMethods).toHaveLength(5)
      expect(descriptiveMethods.map(m => m.id)).toContain('descriptive-stats')
      expect(descriptiveMethods.map(m => m.id)).toContain('frequency-table')

      const glmMethods = getMethodsByCategory('glm')
      expect(glmMethods).toHaveLength(7)
      expect(glmMethods.map(m => m.id)).toContain('one-way-anova')
      expect(glmMethods.map(m => m.id)).toContain('ancova')
    })

    it('존재하지 않는 카테고리는 빈 배열을 반환해야 함', () => {
      const result = getMethodsByCategory('non-existent')
      expect(result).toEqual([])
    })
  })

  describe('recommendMethodsByVariableTypes', () => {
    it('연속형 변수만 있을 때 적절한 메서드를 추천해야 함', () => {
      const recommendations = recommendMethodsByVariableTypes(3, 0, 0, 0)
      const recommendedIds = recommendations.map(r => r.id)

      expect(recommendedIds).toContain('pearson-correlation')
      expect(recommendedIds).toContain('simple-regression')
      expect(recommendedIds).toContain('pca')
    })

    it('연속형과 범주형 변수가 있을 때 적절한 메서드를 추천해야 함', () => {
      const recommendations = recommendMethodsByVariableTypes(1, 1, 0, 0)
      const recommendedIds = recommendations.map(r => r.id)

      expect(recommendedIds).toContain('two-sample-t')
      expect(recommendedIds).toContain('one-way-anova')
      expect(recommendedIds).toContain('mann-whitney')
    })

    it('범주형 변수만 있을 때 적절한 메서드를 추천해야 함', () => {
      const recommendations = recommendMethodsByVariableTypes(0, 2, 0, 0)
      const recommendedIds = recommendations.map(r => r.id)

      expect(recommendedIds).toContain('chi-square-independence')
      expect(recommendedIds).toContain('cross-tabulation')
    })

    it('서열형 변수가 있을 때 적절한 메서드를 추천해야 함', () => {
      const recommendations = recommendMethodsByVariableTypes(0, 0, 0, 2)
      const recommendedIds = recommendations.map(r => r.id)

      expect(recommendedIds).toContain('spearman-correlation')
      expect(recommendedIds).toContain('kendall-correlation')
    })

    it('변수가 없을 때 빈 배열을 반환해야 함', () => {
      const recommendations = recommendMethodsByVariableTypes(0, 0, 0, 0)
      expect(recommendations).toEqual([])
    })
  })

  describe('특정 통계 메서드 세부 검증', () => {
    it('일원분산분석의 요구사항이 정확해야 함', () => {
      const anova = getMethodRequirements('one-way-anova')
      expect(anova).toBeDefined()
      expect(anova?.minSampleSize).toBe(6)
      expect(anova?.assumptions).toContain('정규성')
      expect(anova?.assumptions).toContain('등분산성')
      expect(anova?.assumptions).toContain('독립성')

      const factor = anova?.variables.find(v => v.role === 'factor')
      expect(factor?.types).toContain('categorical')
      expect(factor?.description).toContain('3개 이상')
    })

    it('로지스틱 회귀의 요구사항이 정확해야 함', () => {
      const logistic = getMethodRequirements('logistic-regression')
      expect(logistic).toBeDefined()
      expect(logistic?.minSampleSize).toBe(50)

      const dependent = logistic?.variables.find(v => v.role === 'dependent')
      expect(dependent?.types).toContain('binary')
      expect(dependent?.multiple).toBe(false)

      const independent = logistic?.variables.find(v => v.role === 'independent')
      expect(independent?.types).toContain('continuous')
      expect(independent?.types).toContain('categorical')
      expect(independent?.minCount).toBe(1)
    })

    it('반복측정 분산분석의 요구사항이 정확해야 함', () => {
      const rmAnova = getMethodRequirements('repeated-measures-anova')
      expect(rmAnova).toBeDefined()
      expect(rmAnova?.assumptions).toContain('구형성')

      const within = rmAnova?.variables.find(v => v.role === 'within')
      expect(within?.required).toBe(true)
      expect(within?.multiple).toBe(true)
      expect(within?.minCount).toBe(2)

      const between = rmAnova?.variables.find(v => v.role === 'between')
      expect(between?.required).toBe(false)
    })
  })

  describe('변수 타입과 역할 검증', () => {
    it('모든 변수 타입이 유효한 값이어야 함', () => {
      const validTypes: VariableType[] = ['continuous', 'categorical', 'binary', 'ordinal', 'date', 'count']

      STATISTICAL_METHOD_REQUIREMENTS.forEach(method => {
        method.variables.forEach(variable => {
          variable.types.forEach(type => {
            expect(validTypes).toContain(type)
          })
        })
      })
    })

    it('모든 변수 역할이 유효한 값이어야 함', () => {
      const validRoles: VariableRole[] = [
        'dependent', 'independent', 'factor', 'covariate', 'blocking',
        'within', 'between', 'time', 'event', 'censoring', 'weight'
      ]

      STATISTICAL_METHOD_REQUIREMENTS.forEach(method => {
        method.variables.forEach(variable => {
          expect(validRoles).toContain(variable.role)
        })
      })
    })
  })

  describe('실용적 검증', () => {
    it('t-검정 계열이 올바른 그룹 수를 요구해야 함', () => {
      const twoSample = getMethodRequirements('two-sample-t')
      const factor = twoSample?.variables.find(v => v.role === 'factor')
      expect(factor?.description).toContain('두 그룹')

      const oneSample = getMethodRequirements('one-sample-t')
      expect(oneSample?.variables.filter(v => v.role === 'factor')).toHaveLength(0)
    })

    it('상관분석이 최소 2개 변수를 요구해야 함', () => {
      const correlation = getMethodRequirements('pearson-correlation')
      const vars = correlation?.variables.find(v => v.role === 'dependent')
      expect(vars?.minCount).toBe(2)
    })

    it('ANCOVA가 공변량을 필수로 요구해야 함', () => {
      const ancova = getMethodRequirements('ancova')
      const covariate = ancova?.variables.find(v => v.role === 'covariate')
      expect(covariate?.required).toBe(true)
      expect(covariate?.minCount).toBe(1)
    })
  })
})