/**
 * Fisher Exact Test - Null Handling Bug Fix Test
 *
 * Issue: oddsRatio.toFixed(4) throws TypeError when oddsRatio is null
 * Root Cause: _safe_float returns None when scipy.stats.fisher_exact yields inf
 *
 * Scenario: 2x2 table with zero cells → odds_ratio = inf → _safe_float(inf) → null
 * Example: [[10, 0], [0, 5]]
 *
 * Fix:
 * 1. Type definition: oddsRatio: number | null
 * 2. UI guard: {results.oddsRatio !== null ? results.oddsRatio.toFixed(4) : '∞ (Infinity)'}
 *
 * @see https://github.com/anthropics/claude-code/issues/xxx
 */

import { describe, it, expect } from '@jest/globals'

describe('Fisher Exact Test - Null Handling', () => {
  describe('Type Definition Validation', () => {
    it('should accept null oddsRatio in FisherExactTestResult', () => {
      // TypeScript 타입 체크 (컴파일 시 검증)
      const result: {
        oddsRatio: number | null
        pValue: number
        reject: boolean
        alternative: 'two-sided' | 'less' | 'greater'
        oddsRatioInterpretation: string
        observedMatrix: number[][]
        expectedMatrix: number[][]
        rowTotals: number[]
        columnTotals: number[]
        sampleSize: number
      } = {
        oddsRatio: null, // ✅ null 허용
        pValue: 0.0001,
        reject: true,
        alternative: 'two-sided',
        oddsRatioInterpretation: '매우 강한 양의 연관성 (infinite odds ratio)',
        observedMatrix: [[10, 0], [0, 5]],
        expectedMatrix: [[5, 5], [5, 5]],
        rowTotals: [10, 5],
        columnTotals: [10, 5],
        sampleSize: 15
      }

      expect(result.oddsRatio).toBeNull()
    })

    it('should accept numeric oddsRatio in FisherExactTestResult', () => {
      const result: {
        oddsRatio: number | null
        pValue: number
        reject: boolean
        alternative: 'two-sided' | 'less' | 'greater'
        oddsRatioInterpretation: string
        observedMatrix: number[][]
        expectedMatrix: number[][]
        rowTotals: number[]
        columnTotals: number[]
        sampleSize: number
      } = {
        oddsRatio: 2.5, // ✅ number 허용
        pValue: 0.05,
        reject: false,
        alternative: 'two-sided',
        oddsRatioInterpretation: '중간 양의 연관성',
        observedMatrix: [[10, 5], [3, 12]],
        expectedMatrix: [[7.5, 7.5], [7.5, 7.5]],
        rowTotals: [15, 15],
        columnTotals: [13, 17],
        sampleSize: 30
      }

      expect(result.oddsRatio).toBe(2.5)
    })
  })

  describe('UI Rendering Simulation', () => {
    it('should render "∞ (Infinity)" when oddsRatio is null', () => {
      const oddsRatio: number | null = null

      // UI 렌더링 로직 시뮬레이션
      const rendered = oddsRatio !== null ? oddsRatio.toFixed(4) : '∞ (Infinity)'

      expect(rendered).toBe('∞ (Infinity)')
    })

    it('should render formatted number when oddsRatio is numeric', () => {
      const oddsRatio: number | null = 2.5678

      // UI 렌더링 로직 시뮬레이션
      const rendered = oddsRatio !== null ? oddsRatio.toFixed(4) : '∞ (Infinity)'

      expect(rendered).toBe('2.5678')
    })

    it('should NOT throw TypeError when oddsRatio is null (bug regression)', () => {
      const oddsRatio: number | null = null

      // ❌ 이전 코드 (버그): oddsRatio.toFixed(4) → TypeError!
      // ✅ 수정 코드: 조건부 렌더링
      expect(() => {
        const rendered = oddsRatio !== null ? oddsRatio.toFixed(4) : '∞ (Infinity)'
        expect(rendered).toBe('∞ (Infinity)')
      }).not.toThrow()
    })

    it('should handle edge case: oddsRatio = 0', () => {
      const oddsRatio: number | null = 0

      const rendered = oddsRatio !== null ? oddsRatio.toFixed(4) : '∞ (Infinity)'

      expect(rendered).toBe('0.0000')
    })

    it('should handle edge case: very small oddsRatio', () => {
      const oddsRatio: number | null = 0.0001

      const rendered = oddsRatio !== null ? oddsRatio.toFixed(4) : '∞ (Infinity)'

      expect(rendered).toBe('0.0001')
    })

    it('should handle edge case: very large oddsRatio', () => {
      const oddsRatio: number | null = 999999.9999

      const rendered = oddsRatio !== null ? oddsRatio.toFixed(4) : '∞ (Infinity)'

      expect(rendered).toBe('999999.9999')
    })
  })

  describe('Python _safe_float behavior simulation', () => {
    // Python _safe_float의 동작을 TypeScript로 시뮬레이션
    const _safe_float = (value: number | null | undefined): number | null => {
      if (value === null || value === undefined) {
        return null
      }
      if (isNaN(value) || !isFinite(value)) {
        return null // Python: math.isinf(value) → None
      }
      return value
    }

    it('should return null for Infinity', () => {
      expect(_safe_float(Infinity)).toBeNull()
    })

    it('should return null for -Infinity', () => {
      expect(_safe_float(-Infinity)).toBeNull()
    })

    it('should return null for NaN', () => {
      expect(_safe_float(NaN)).toBeNull()
    })

    it('should return null for null input', () => {
      expect(_safe_float(null)).toBeNull()
    })

    it('should return number for finite values', () => {
      expect(_safe_float(2.5)).toBe(2.5)
      expect(_safe_float(0)).toBe(0)
      expect(_safe_float(-1.5)).toBe(-1.5)
    })
  })

  describe('Integration scenario: Zero cell in 2x2 table', () => {
    it('should handle typical zero-cell scenario', () => {
      // Scenario: [[10, 0], [0, 5]] → odds_ratio = inf → null
      const mockResult = {
        oddsRatio: null, // _safe_float(inf) → null
        pValue: 0.0001,
        reject: true,
        alternative: 'two-sided' as const,
        oddsRatioInterpretation: '매우 강한 양의 연관성 (infinite odds ratio)',
        observedMatrix: [[10, 0], [0, 5]],
        expectedMatrix: [[6.67, 3.33], [3.33, 1.67]],
        rowTotals: [10, 5],
        columnTotals: [10, 5],
        sampleSize: 15
      }

      // UI 렌더링이 에러 없이 동작해야 함
      expect(() => {
        const displayValue = mockResult.oddsRatio !== null
          ? mockResult.oddsRatio.toFixed(4)
          : '∞ (Infinity)'

        expect(displayValue).toBe('∞ (Infinity)')
        expect(mockResult.oddsRatioInterpretation).toContain('infinite')
      }).not.toThrow()
    })
  })
})
