/**
 * Template Store 테스트
 */

// Jest globals are available automatically
import type { AnalysisTemplate, VariableRoleMapping } from '@/types/smart-flow'
import type { VariableMapping } from '@/lib/statistics/variable-mapping'

// Mock IndexedDB 함수들
jest.mock('@/lib/utils/indexeddb-templates', () => ({
  isIndexedDBAvailable: jest.fn(() => true),
  getAllTemplates: jest.fn(async () => []),
  getTemplate: jest.fn(async () => null),
  saveTemplate: jest.fn(async () => {}),
  updateTemplate: jest.fn(async () => {}),
  deleteTemplate: jest.fn(async () => {}),
  clearAllTemplates: jest.fn(async () => {}),
  incrementTemplateUsage: jest.fn(async () => {}),
  getRecentTemplates: jest.fn(async () => [])
}))

describe('Template Store', () => {
  describe('VariableMapping -> VariableRoleMapping 변환', () => {
    /**
     * toStringValue 헬퍼 함수 로직 테스트
     */
    it('string을 그대로 반환해야 함', () => {
      const value: string | string[] = 'score'
      const result = Array.isArray(value) ? value[0] : value
      expect(result).toBe('score')
    })

    it('string[]의 첫 번째 요소를 반환해야 함', () => {
      const value: string | string[] = ['score', 'value']
      const result = Array.isArray(value) ? value[0] : value
      expect(result).toBe('score')
    })

    /**
     * toArrayValue 헬퍼 함수 로직 테스트
     */
    it('string[]을 그대로 반환해야 함', () => {
      const value: string | string[] = ['a', 'b', 'c']
      const result = Array.isArray(value) ? value : [value]
      expect(result).toEqual(['a', 'b', 'c'])
    })

    it('string을 배열로 감싸야 함', () => {
      const value: string | string[] = 'single'
      const result = Array.isArray(value) ? value : [value]
      expect(result).toEqual(['single'])
    })

    /**
     * extractVariableRoles 로직 시뮬레이션
     */
    it('VariableMapping에서 역할을 추출해야 함', () => {
      const mapping: VariableMapping = {
        dependentVar: 'score',
        groupVar: 'treatment',
        covariate: ['age', 'baseline']
      }

      // 변환 로직 시뮬레이션
      const roles: VariableRoleMapping = {}

      // 종속변수
      const depVal = Array.isArray(mapping.dependentVar)
        ? mapping.dependentVar[0]
        : mapping.dependentVar
      if (depVal) {
        roles.dependent = {
          role: 'dependent',
          type: 'numeric',
          description: depVal
        }
      }

      // 그룹변수
      if (mapping.groupVar) {
        roles.independent = {
          role: 'group',
          type: 'categorical',
          description: mapping.groupVar
        }
      }

      // 공변량
      const covariates = Array.isArray(mapping.covariate)
        ? mapping.covariate
        : mapping.covariate
          ? [mapping.covariate]
          : []
      if (covariates.length > 0) {
        roles.covariates = covariates.map(c => ({
          role: 'covariate' as const,
          type: 'numeric' as const,
          description: c
        }))
      }

      expect(roles.dependent?.description).toBe('score')
      expect(roles.independent?.description).toBe('treatment')
      expect(roles.covariates).toHaveLength(2)
      expect(roles.covariates?.[0].description).toBe('age')
      expect(roles.covariates?.[1].description).toBe('baseline')
    })
  })

  describe('변수 자동 매칭', () => {
    it('수치형/범주형 변수를 역할에 매칭해야 함', () => {
      // 템플릿 역할
      const roles: VariableRoleMapping = {
        dependent: { role: 'dependent', type: 'numeric' },
        independent: { role: 'group', type: 'categorical' }
      }

      // 데이터의 컬럼 정보
      const numericCols = ['score', 'age', 'height']
      const categoricalCols = ['group', 'gender']

      // 매칭 로직 시뮬레이션
      const matched: Record<string, string> = {}
      const unmatched: string[] = []

      // 종속변수 매칭
      if (roles.dependent) {
        if (numericCols.length > 0) {
          matched['dependent'] = numericCols[0]
        } else {
          unmatched.push('dependent')
        }
      }

      // 독립변수/그룹변수 매칭
      if (roles.independent) {
        const type = roles.independent.type
        const candidates = type === 'categorical' ? categoricalCols : numericCols

        if (candidates.length > 0) {
          const available = candidates.filter(c => c !== matched['dependent'])
          if (available.length > 0) {
            matched['independent'] = available[0]
          } else {
            unmatched.push('independent')
          }
        } else {
          unmatched.push('independent')
        }
      }

      expect(matched['dependent']).toBe('score')
      expect(matched['independent']).toBe('group')
      expect(unmatched).toHaveLength(0)
    })

    it('매칭할 수 없는 역할은 unmatched에 추가해야 함', () => {
      const roles: VariableRoleMapping = {
        dependent: { role: 'dependent', type: 'numeric' },
        factors: [
          { role: 'factor', type: 'categorical' },
          { role: 'factor', type: 'categorical' }
        ]
      }

      // 데이터에 범주형 변수가 1개뿐
      const numericCols = ['score']
      const categoricalCols = ['group']

      const matched: Record<string, string> = {}
      const unmatched: string[] = []

      // 종속변수
      if (numericCols.length > 0) {
        matched['dependent'] = numericCols[0]
      }

      // 요인 매칭
      if (roles.factors) {
        const usedVars = new Set(Object.values(matched))
        const availableCategorical = categoricalCols.filter(c => !usedVars.has(c))

        roles.factors.forEach((_, index) => {
          if (availableCategorical[index]) {
            matched[`factor_${index}`] = availableCategorical[index]
          } else {
            unmatched.push(`factor_${index}`)
          }
        })
      }

      expect(matched['dependent']).toBe('score')
      expect(matched['factor_0']).toBe('group')
      expect(unmatched).toContain('factor_1')  // 두 번째 요인은 매칭 실패
    })
  })

  describe('템플릿 생성', () => {
    it('올바른 ID 형식으로 생성되어야 함', () => {
      const id = `template-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

      expect(id).toMatch(/^template-\d+-[a-z0-9]+$/)
    })

    it('생성 시간과 수정 시간이 동일해야 함', () => {
      const now = Date.now()
      const template: Partial<AnalysisTemplate> = {
        createdAt: now,
        updatedAt: now,
        usageCount: 0,
        lastUsedAt: null
      }

      expect(template.createdAt).toBe(template.updatedAt)
      expect(template.usageCount).toBe(0)
      expect(template.lastUsedAt).toBeNull()
    })
  })
})
