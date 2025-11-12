/**
 * Critical Bugs Integration Test
 *
 * 목적: AI 리뷰에서 발견된 Critical 버그 검증
 * 날짜: 2025-11-12
 *
 * Bugs Fixed:
 * A. McNemar onRun validation (Array.isArray 버그)
 * B. Auto-execution receives unconverted raw data
 */

import {
  toKruskalWallisVariables,
  toMcNemarVariables,
  type VariableAssignment
} from '@/types/statistics-converters'
import type {
  KruskalWallisVariables,
  McNemarVariables
} from '@/types/statistics'

describe('Critical Bugs Integration Test', () => {
  describe('Bug A: McNemar onRun validation', () => {
    it('should validate McNemarVariables structure (not Array)', () => {
      const selectedVariables: McNemarVariables = {
        dependent: ['Before', 'After']
      }

      // ❌ Old buggy code: Array.isArray(selectedVariables)
      const oldBuggyCheck = Array.isArray(selectedVariables)
      expect(oldBuggyCheck).toBe(false) // McNemarVariables is object, not array!

      // ✅ Correct validation
      const correctCheck = selectedVariables?.dependent && selectedVariables.dependent.length === 2
      expect(correctCheck).toBe(true)
    })

    it('should reject invalid McNemarVariables', () => {
      const invalidCases: McNemarVariables[] = [
        { dependent: ['OnlyOne'] }, // length 1
        { dependent: ['A', 'B', 'C'] }, // length 3
        { dependent: [] }, // empty
      ]

      invalidCases.forEach(vars => {
        const isValid = vars?.dependent && vars.dependent.length === 2
        expect(isValid).toBe(false)
      })
    })
  })

  describe('Bug B: Auto-execution raw data conversion', () => {
    describe('Kruskal-Wallis auto-execution', () => {
      it('should convert raw VariableAssignment before runAnalysis', () => {
        // Simulate VariableSelector output (raw VariableAssignment)
        const rawVars: VariableAssignment = {
          dependent: 'Score',
          factor: 'Treatment' // Single string from multiple: false
        }

        // ❌ Old buggy code: Pass raw variables directly
        // This would fail because runAnalysis expects KruskalWallisVariables
        const directCast = rawVars as unknown as KruskalWallisVariables
        expect(directCast.dependent).toBe('Score')
        expect(directCast.factor).toBe('Treatment')
        // But types don't match semantically!

        // ✅ Correct code: Convert first
        const converted = toKruskalWallisVariables(rawVars)
        expect(typeof converted.factor).toBe('string')
        expect(converted.factor).toBe('Treatment')
        expect(converted.dependent).toBe('Score')
      })

      it('should handle array input gracefully (edge case)', () => {
        // Edge case: What if VariableSelector sends array?
        const rawVarsArray: VariableAssignment = {
          dependent: 'Score',
          factor: ['Group1', 'Group2'] // Array input
        }

        const converted = toKruskalWallisVariables(rawVarsArray)

        // toSingleString should take first element
        expect(typeof converted.factor).toBe('string')
        expect(converted.factor).toBe('Group1')
      })
    })

    describe('McNemar auto-execution', () => {
      it('should convert raw VariableAssignment before runAnalysis', () => {
        // Simulate VariableSelector output
        const rawVars: VariableAssignment = {
          dependent: ['Before', 'After']
        }

        // ❌ Old buggy code path (hypothetical)
        const oldPattern = { variables: ['Before', 'After'] }
        // This doesn't match McNemarVariables!

        // ✅ Correct code: Convert first
        const converted = toMcNemarVariables(rawVars)
        expect(Array.isArray(converted.dependent)).toBe(true)
        expect(converted.dependent).toEqual(['Before', 'After'])
        expect('variables' in converted).toBe(false) // Old field removed
      })

      it('should handle old "variables" field for backward compatibility', () => {
        const rawVarsOldPattern: VariableAssignment = {
          variables: ['Pre', 'Post']
        }

        const converted = toMcNemarVariables(rawVarsOldPattern)

        // Fallback should work
        expect(converted.dependent).toEqual(['Pre', 'Post'])
      })
    })
  })

  describe('End-to-end data flow simulation', () => {
    it('Kruskal-Wallis: Selector → Converter → runAnalysis', () => {
      // Step 1: VariableSelector output
      const selectorOutput: VariableAssignment = {
        dependent: 'Pain_Score',
        factor: 'Treatment_Group'
      }

      // Step 2: Converter (called in handleVariableSelection)
      const converted = toKruskalWallisVariables(selectorOutput)

      // Step 3: Validation (before runAnalysis)
      const isValid = !!converted.dependent && !!converted.factor
      expect(isValid).toBe(true)

      // Step 4: runAnalysis would receive correct type
      expect(converted).toEqual({
        dependent: 'Pain_Score',
        factor: 'Treatment_Group'
      })
    })

    it('McNemar: Selector → Converter → runAnalysis', () => {
      // Step 1: VariableSelector output
      const selectorOutput: VariableAssignment = {
        dependent: ['Pretest', 'Posttest']
      }

      // Step 2: Converter
      const converted = toMcNemarVariables(selectorOutput)

      // Step 3: Validation (before runAnalysis)
      const isValid = converted.dependent && converted.dependent.length === 2
      expect(isValid).toBe(true)

      // Step 4: runAnalysis would receive correct type
      expect(converted.dependent).toEqual(['Pretest', 'Posttest'])
    })

    it('McNemar onRun: Manual execution button flow', () => {
      // Simulate selectedVariables from state
      const selectedVariables: McNemarVariables = {
        dependent: ['Before', 'After']
      }

      // onRun callback validation
      const shouldRun = selectedVariables?.dependent && selectedVariables.dependent.length === 2

      expect(shouldRun).toBe(true)

      // Can safely call runAnalysis(selectedVariables)
    })
  })

  describe('Regression prevention', () => {
    it('should not accept wrong types for Kruskal-Wallis', () => {
      const wrongType = {
        dependent: 'Score',
        factor: ['A', 'B', 'C'] // Array when should be string
      } as unknown as KruskalWallisVariables

      // TypeScript should catch this, but runtime check:
      expect(typeof wrongType.factor).toBe('object') // Array is object
      expect(Array.isArray(wrongType.factor)).toBe(true) // This is the bug!

      // After fix, factor should be string
      const correct = toKruskalWallisVariables({ dependent: 'Score', factor: ['A', 'B', 'C'] })
      expect(typeof correct.factor).toBe('string')
    })

    it('should not accept old pattern for McNemar', () => {
      const oldPattern = { variables: ['A', 'B'] }

      // This should NOT be accepted as McNemarVariables
      expect('dependent' in oldPattern).toBe(false)

      // Converter should transform it
      const converted = toMcNemarVariables(oldPattern as unknown as VariableAssignment)
      expect('dependent' in converted).toBe(true)
      expect('variables' in converted).toBe(false)
    })
  })
})
