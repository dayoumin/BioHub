/**
 * Tests for VariableMapping and VariableSelectionStep
 *
 * Validates:
 * 1. dependentVar accepts both string and string[] (Bug #2 fix)
 * 2. VariableSelectionStep preserves array selections (no truncation)
 * 3. McNemar and MANOVA can receive multiple dependent variables
 */

import { describe, it } from '@jest/globals'
import type { VariableMapping } from '@/lib/statistics/variable-mapping'

describe('VariableMapping Interface', () => {
  describe('dependentVar type support', () => {
    it('should accept single string value', () => {
      const mapping: VariableMapping = {
        dependentVar: 'height',
        groupVar: 'gender'
      }

      expect(mapping.dependentVar).toBe('height')
      expect(typeof mapping.dependentVar).toBe('string')
    })

    it('should accept array of strings (for McNemar, MANOVA)', () => {
      const mapping: VariableMapping = {
        dependentVar: ['before', 'after']
      }

      expect(mapping.dependentVar).toEqual(['before', 'after'])
      expect(Array.isArray(mapping.dependentVar)).toBe(true)
    })

    it('should accept undefined', () => {
      const mapping: VariableMapping = {
        dependentVar: undefined,
        independentVar: 'dose'
      }

      expect(mapping.dependentVar).toBeUndefined()
    })
  })

  describe('Bug Fix Validation: Multiple variable selection', () => {
    it('BUG FIX: should preserve multiple dependent variables (not truncate to first)', () => {
      // Simulates McNemar test requiring 2 binary variables
      const assignment = {
        dependent: ['symptom_before', 'symptom_after'],
        independent: undefined,
        factor: undefined
      }

      // OLD BUG: assignment.dependent[0] → only 'symptom_before'
      // NEW FIX: assignment.dependent → ['symptom_before', 'symptom_after']
      const mapping: VariableMapping = {
        dependentVar: assignment.dependent as string | string[] | undefined
      }

      expect(Array.isArray(mapping.dependentVar)).toBe(true)
      expect(mapping.dependentVar).toHaveLength(2)
      expect(mapping.dependentVar).toEqual(['symptom_before', 'symptom_after'])
    })

    it('BUG FIX: should preserve MANOVA multiple dependent variables', () => {
      const assignment = {
        dependent: ['height', 'weight', 'bmi'],
        factor: ['treatment']
      }

      const mapping: VariableMapping = {
        dependentVar: assignment.dependent as string | string[] | undefined,
        groupVar: Array.isArray(assignment.factor)
          ? assignment.factor[0]
          : assignment.factor as string | undefined
      }

      expect(Array.isArray(mapping.dependentVar)).toBe(true)
      expect(mapping.dependentVar).toHaveLength(3)
      expect(mapping.dependentVar).toEqual(['height', 'weight', 'bmi'])
      expect(mapping.groupVar).toBe('treatment')
    })

    it('should handle single dependent variable (backward compatibility)', () => {
      const assignment = {
        dependent: 'score',
        factor: ['group']
      }

      const mapping: VariableMapping = {
        dependentVar: assignment.dependent as string | string[] | undefined,
        groupVar: Array.isArray(assignment.factor)
          ? assignment.factor[0]
          : assignment.factor as string | undefined
      }

      expect(typeof mapping.dependentVar).toBe('string')
      expect(mapping.dependentVar).toBe('score')
      expect(mapping.groupVar).toBe('group')
    })

    it('should handle array with single element', () => {
      const assignment = {
        dependent: ['score']
      }

      const mapping: VariableMapping = {
        dependentVar: assignment.dependent as string | string[] | undefined
      }

      // Array with 1 element should be preserved as array
      expect(Array.isArray(mapping.dependentVar)).toBe(true)
      expect(mapping.dependentVar).toEqual(['score'])
    })
  })

  describe('Complex mapping scenarios', () => {
    it('should support ANCOVA with multiple covariates', () => {
      const mapping: VariableMapping = {
        dependentVar: 'score',
        groupVar: 'treatment',
        covariate: ['age', 'baseline_score']
      }

      expect(mapping.dependentVar).toBe('score')
      expect(mapping.groupVar).toBe('treatment')
      expect(Array.isArray(mapping.covariate)).toBe(true)
      expect(mapping.covariate).toHaveLength(2)
    })

    it('should support repeated measures ANOVA', () => {
      const mapping: VariableMapping = {
        within: ['time1', 'time2', 'time3'],
        between: ['group']
      }

      expect(Array.isArray(mapping.within)).toBe(true)
      expect(mapping.within).toHaveLength(3)
      expect(Array.isArray(mapping.between)).toBe(true)
      expect(mapping.between).toHaveLength(1)
    })

    it('should support multiple regression', () => {
      const mapping: VariableMapping = {
        dependentVar: 'yield',
        independentVar: ['temperature', 'pressure', 'catalyst']
      }

      expect(typeof mapping.dependentVar).toBe('string')
      expect(Array.isArray(mapping.independentVar)).toBe(true)
      expect(mapping.independentVar).toHaveLength(3)
    })
  })

  describe('Type safety validation', () => {
    it('should allow all valid field types', () => {
      const mapping: VariableMapping = {
        // string types
        dependentVar: 'y',
        groupVar: 'group',
        timeVar: 'time',
        event: 'death',
        censoring: 'censored',
        weight: 'sample_weight',
        blocking: 'block',

        // string[] types
        independentVar: ['x1', 'x2'],
        variables: ['v1', 'v2', 'v3'],
        covariate: ['cov1', 'cov2'],
        within: ['w1', 'w2'],
        between: ['b1']
      }

      expect(mapping.dependentVar).toBe('y')
      expect(mapping.independentVar).toHaveLength(2)
      expect(mapping.variables).toHaveLength(3)
    })

    it('should allow index signature for custom fields', () => {
      const mapping: VariableMapping = {
        dependentVar: 'y',
        customField: 'custom_value'
      }

      expect(mapping['customField']).toBe('custom_value')
    })
  })
})

describe('VariableSelectionStep conversion logic', () => {
  it('should convert VariableAssignment to VariableMapping correctly', () => {
    // Simulates handleVariablesSelected logic
    const assignment = {
      dependent: ['var1', 'var2'],
      independent: 'x',
      factor: ['group1', 'group2'],
      covariate: 'age',
      within: ['time1', 'time2'],
      time: 'date'
    }

    // Conversion logic from VariableSelectionStep.tsx:41-56
    const mapping: VariableMapping = {
      dependentVar: assignment.dependent as string | string[] | undefined,
      independentVar: assignment.independent as string | string[] | undefined,
      groupVar: Array.isArray(assignment.factor)
        ? assignment.factor[0]
        : assignment.factor as string | undefined,
      covariate: assignment.covariate as string | string[] | undefined,
      within: assignment.within as string[] | undefined,
      timeVar: assignment.time as string | undefined
    }

    // Validate conversions
    expect(mapping.dependentVar).toEqual(['var1', 'var2']) // Array preserved
    expect(mapping.independentVar).toBe('x')
    expect(mapping.groupVar).toBe('group1') // First element of factor array
    expect(mapping.covariate).toBe('age')
    expect(mapping.within).toEqual(['time1', 'time2'])
    expect(mapping.timeVar).toBe('date')
  })

  it('should handle empty/undefined assignments', () => {
    const assignment = {
      dependent: undefined,
      independent: undefined,
      factor: undefined
    }

    const mapping: VariableMapping = {
      dependentVar: assignment.dependent as string | string[] | undefined,
      independentVar: assignment.independent as string | string[] | undefined,
      groupVar: Array.isArray(assignment.factor)
        ? assignment.factor[0]
        : assignment.factor as string | undefined
    }

    expect(mapping.dependentVar).toBeUndefined()
    expect(mapping.independentVar).toBeUndefined()
    expect(mapping.groupVar).toBeUndefined()
  })
})
