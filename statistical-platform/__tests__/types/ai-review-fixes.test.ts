/**
 * AI 리뷰 피드백 수정 검증 테스트
 *
 * 목적: AI가 지적한 3가지 이슈가 올바르게 수정되었는지 검증
 * 날짜: 2025-11-12
 *
 * Issues:
 * 1. Kruskal-Wallis: factor type (string[] → string)
 * 2. Proportion Test: variable role alignment (factor → dependent)
 * 3. McNemar: 구 패턴 제거 (variables → dependent)
 */

import {
  toKruskalWallisVariables,
  toProportionTestVariables,
  toMcNemarVariables,
  type VariableAssignment
} from '@/types/statistics-converters'
import type {
  KruskalWallisVariables,
  ProportionTestVariables,
  McNemarVariables
} from '@/types/statistics'

describe('AI Review Fix Validation', () => {
  describe('Issue 1: Kruskal-Wallis factor standardization', () => {
    it('should convert single factor to string (not array)', () => {
      const input: VariableAssignment = {
        dependent: 'Score',
        factor: 'Treatment'
      }

      const result: KruskalWallisVariables = toKruskalWallisVariables(input)

      // Type assertion: factor는 string이어야 함
      expect(typeof result.factor).toBe('string')
      expect(result.factor).toBe('Treatment')
      expect(result.dependent).toBe('Score')
    })

    it('should handle fallback to groups', () => {
      const input: VariableAssignment = {
        dependent: 'Score',
        groups: 'Group'
      }

      const result = toKruskalWallisVariables(input)

      expect(result.factor).toBe('Group')
    })

    it('should convert array to single string', () => {
      const input: VariableAssignment = {
        dependent: 'Score',
        factor: ['Treatment'] // Selector가 실수로 배열로 보낸 경우
      }

      const result = toKruskalWallisVariables(input)

      // toSingleString()이 배열의 첫 요소를 추출해야 함
      expect(result.factor).toBe('Treatment')
    })
  })

  describe('Issue 2: Proportion Test variable role alignment', () => {
    it('should use dependent field (not factor)', () => {
      const input: VariableAssignment = {
        dependent: 'Success'
      }

      const result: ProportionTestVariables = toProportionTestVariables(input)

      // Type assertion: dependent는 string이어야 함
      expect(typeof result.dependent).toBe('string')
      expect(result.dependent).toBe('Success')
    })

    it('should handle fallback to variable', () => {
      const input: VariableAssignment = {
        variable: 'PassFail'
      }

      const result = toProportionTestVariables(input)

      expect(result.dependent).toBe('PassFail')
    })

    it('should NOT have factor field', () => {
      const input: VariableAssignment = {
        dependent: 'Success'
      }

      const result = toProportionTestVariables(input) as Record<string, unknown>

      // factor 필드가 없어야 함
      expect('factor' in result).toBe(false)
      expect(result.dependent).toBe('Success')
    })
  })

  describe('Issue 3: McNemar variables type usage', () => {
    it('should use McNemarVariables (dependent: string[])', () => {
      const input: VariableAssignment = {
        dependent: ['Before', 'After']
      }

      const result: McNemarVariables = toMcNemarVariables(input)

      // Type assertion: dependent는 string[]이어야 함
      expect(Array.isArray(result.dependent)).toBe(true)
      expect(result.dependent).toEqual(['Before', 'After'])
    })

    it('should handle fallback to variables', () => {
      const input: VariableAssignment = {
        variables: ['Pre', 'Post']
      }

      const result = toMcNemarVariables(input)

      expect(result.dependent).toEqual(['Pre', 'Post'])
    })

    it('should convert single string to array', () => {
      const input: VariableAssignment = {
        dependent: 'SingleVar'
      }

      const result = toMcNemarVariables(input)

      // toStringArray()가 단일 문자열을 배열로 변환해야 함
      expect(Array.isArray(result.dependent)).toBe(true)
      expect(result.dependent).toEqual(['SingleVar'])
    })

    it('should NOT have variables field (old pattern)', () => {
      const input: VariableAssignment = {
        dependent: ['Var1', 'Var2']
      }

      const result = toMcNemarVariables(input) as Record<string, unknown>

      // variables 필드가 없어야 함 (구 패턴 제거)
      expect('variables' in result).toBe(false)
      expect(result.dependent).toEqual(['Var1', 'Var2'])
    })
  })

  describe('Cross-validation: Type consistency', () => {
    it('KruskalWallisVariables.factor should match variable-requirements.ts', () => {
      // variable-requirements.ts: role: 'factor', multiple: false
      // → types/statistics.ts: factor: string
      const input: VariableAssignment = { dependent: 'Y', factor: 'X' }
      const result = toKruskalWallisVariables(input)

      // factor가 string이어야 함 (multiple: false)
      expect(typeof result.factor).toBe('string')
    })

    it('ProportionTestVariables.dependent should match variable-requirements.ts', () => {
      // variable-requirements.ts: role: 'dependent', multiple: false
      // → types/statistics.ts: dependent: string
      const input: VariableAssignment = { dependent: 'BinaryVar' }
      const result = toProportionTestVariables(input)

      // dependent가 string이어야 함
      expect(typeof result.dependent).toBe('string')
    })

    it('McNemarVariables.dependent should match variable-requirements.ts', () => {
      // variable-requirements.ts: role: 'dependent', multiple: true, minCount: 2
      // → types/statistics.ts: dependent: string[]
      const input: VariableAssignment = { dependent: ['V1', 'V2'] }
      const result = toMcNemarVariables(input)

      // dependent가 string[]이어야 함 (multiple: true)
      expect(Array.isArray(result.dependent)).toBe(true)
      expect(result.dependent.length).toBeGreaterThanOrEqual(1)
    })
  })

  describe('Edge cases', () => {
    it('should handle empty/undefined gracefully - Kruskal-Wallis', () => {
      const input: VariableAssignment = {
        dependent: 'Score'
        // factor 없음
      }

      const result = toKruskalWallisVariables(input)

      expect(result.factor).toBe('')
    })

    it('should handle empty/undefined gracefully - Proportion Test', () => {
      const input: VariableAssignment = {}

      const result = toProportionTestVariables(input)

      expect(result.dependent).toBe('')
    })

    it('should handle empty/undefined gracefully - McNemar', () => {
      const input: VariableAssignment = {}

      const result = toMcNemarVariables(input)

      expect(result.dependent).toEqual([])
    })
  })
})
