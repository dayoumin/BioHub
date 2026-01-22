/**
 * statistics-formatters.ts 테스트
 *
 * P-값, 유의성, 통계량 포맷팅 함수 검증
 */

import {
  formatPValue,
  formatPValueNumeric,
  isSignificant,
  getSignificanceLevel,
  getSignificanceLabelKo,
  getSignificanceText,
  formatStatistic,
  formatPercent,
  formatCorrelation,
  formatEffectSize,
  formatDF,
  formatCI,
  formatTTestResult,
  formatFTestResult,
  formatChiSquareResult,
  formatCorrelationResult,
  ALPHA,
  CONFIDENCE_LEVEL
} from '@/lib/utils/statistics-formatters'

describe('statistics-formatters', () => {
  // ============================================================================
  // P-값 포맷팅
  // ============================================================================
  describe('formatPValue', () => {
    it('should return "< 0.001" for very small p-values', () => {
      expect(formatPValue(0.0001)).toBe('< 0.001')
      expect(formatPValue(0.00001)).toBe('< 0.001')
      expect(formatPValue(0.0009)).toBe('< 0.001')
    })

    it('should return 3 decimal places for normal p-values', () => {
      expect(formatPValue(0.001)).toBe('0.001')
      expect(formatPValue(0.05)).toBe('0.050')
      expect(formatPValue(0.123)).toBe('0.123')
      expect(formatPValue(0.9999)).toBe('1.000')
    })

    it('should return "-" for null/undefined/NaN', () => {
      expect(formatPValue(null)).toBe('-')
      expect(formatPValue(undefined)).toBe('-')
      expect(formatPValue(NaN)).toBe('-')
    })
  })

  describe('formatPValueNumeric', () => {
    it('should return numeric value without "< 0.001" replacement', () => {
      expect(formatPValueNumeric(0.0001)).toBe('0.000')
      expect(formatPValueNumeric(0.0001, 4)).toBe('0.0001')
    })

    it('should respect decimal places parameter', () => {
      expect(formatPValueNumeric(0.12345, 2)).toBe('0.12')
      expect(formatPValueNumeric(0.12345, 4)).toBe('0.1235')
    })
  })

  // ============================================================================
  // 유의성 판정
  // ============================================================================
  describe('isSignificant', () => {
    it('should return true when p < alpha', () => {
      expect(isSignificant(0.03, 0.05)).toBe(true)
      expect(isSignificant(0.001, 0.05)).toBe(true)
    })

    it('should return false when p >= alpha', () => {
      expect(isSignificant(0.05, 0.05)).toBe(false)
      expect(isSignificant(0.10, 0.05)).toBe(false)
    })

    it('should use default alpha of 0.05', () => {
      expect(isSignificant(0.04)).toBe(true)
      expect(isSignificant(0.06)).toBe(false)
    })

    it('should return false for null/undefined/NaN', () => {
      expect(isSignificant(null)).toBe(false)
      expect(isSignificant(undefined)).toBe(false)
      expect(isSignificant(NaN)).toBe(false)
    })
  })

  describe('getSignificanceLevel', () => {
    it('should return correct significance levels', () => {
      expect(getSignificanceLevel(0.0001)).toBe('highly-significant')
      expect(getSignificanceLevel(0.005)).toBe('very-significant')
      expect(getSignificanceLevel(0.03)).toBe('significant')
      expect(getSignificanceLevel(0.07)).toBe('marginally')
      expect(getSignificanceLevel(0.15)).toBe('not-significant')
    })

    it('should handle boundary values correctly', () => {
      expect(getSignificanceLevel(0.001)).toBe('very-significant') // exactly 0.001
      expect(getSignificanceLevel(0.01)).toBe('significant')       // exactly 0.01
      expect(getSignificanceLevel(0.05)).toBe('marginally')        // exactly 0.05
      expect(getSignificanceLevel(0.10)).toBe('not-significant')   // exactly 0.10
    })

    it('should return not-significant for null/undefined/NaN', () => {
      expect(getSignificanceLevel(null)).toBe('not-significant')
      expect(getSignificanceLevel(undefined)).toBe('not-significant')
      expect(getSignificanceLevel(NaN)).toBe('not-significant')
    })
  })

  describe('getSignificanceLabelKo', () => {
    it('should return Korean labels', () => {
      expect(getSignificanceLabelKo(0.0001)).toContain('매우 유의함')
      expect(getSignificanceLabelKo(0.005)).toContain('유의함')
      expect(getSignificanceLabelKo(0.03)).toContain('유의함')
      expect(getSignificanceLabelKo(0.07)).toContain('경계선')
      expect(getSignificanceLabelKo(0.15)).toBe('유의하지 않음')
    })
  })

  describe('getSignificanceText', () => {
    it('should return significance text with p-value', () => {
      const result = getSignificanceText(0.03, 0.05)
      expect(result).toContain('통계적으로 유의합니다')
      expect(result).toContain('0.030')
    })

    it('should return non-significance text', () => {
      const result = getSignificanceText(0.12, 0.05)
      expect(result).toContain('통계적으로 유의하지 않습니다')
      expect(result).toContain('0.120')
    })

    it('should handle very small p-values', () => {
      const result = getSignificanceText(0.0001, 0.05)
      expect(result).toContain('< 0.001')
    })
  })

  // ============================================================================
  // 통계량 포맷팅
  // ============================================================================
  describe('formatStatistic', () => {
    it('should format with 2 decimal places by default', () => {
      expect(formatStatistic(2.345)).toBe('2.35')
      expect(formatStatistic(10.999)).toBe('11.00')
    })

    it('should respect decimals parameter', () => {
      expect(formatStatistic(2.345, 3)).toBe('2.345')
      expect(formatStatistic(2.345, 1)).toBe('2.3')
    })

    it('should return "-" for null/undefined/NaN', () => {
      expect(formatStatistic(null)).toBe('-')
      expect(formatStatistic(undefined)).toBe('-')
      expect(formatStatistic(NaN)).toBe('-')
    })
  })

  describe('formatPercent', () => {
    it('should convert to percentage with symbol', () => {
      expect(formatPercent(0.1234)).toBe('12.3%')
      expect(formatPercent(0.5)).toBe('50.0%')
      expect(formatPercent(1)).toBe('100.0%')
    })

    it('should work without symbol', () => {
      expect(formatPercent(0.1234, 1, false)).toBe('12.3')
    })

    it('should respect decimals parameter', () => {
      expect(formatPercent(0.1234, 2)).toBe('12.34%')
    })
  })

  describe('formatCorrelation', () => {
    it('should format correlation coefficients', () => {
      expect(formatCorrelation(0.7834)).toBe('0.783')
      expect(formatCorrelation(-0.456)).toBe('-0.456')
      expect(formatCorrelation(1)).toBe('1.000')
    })
  })

  describe('formatEffectSize', () => {
    it('should format effect sizes', () => {
      expect(formatEffectSize(0.8)).toBe('0.800')
      expect(formatEffectSize(0.2)).toBe('0.200')
    })
  })

  describe('formatDF', () => {
    it('should return integer for whole numbers', () => {
      expect(formatDF(10)).toBe('10')
      expect(formatDF(100)).toBe('100')
    })

    it('should return 2 decimal places for non-integers', () => {
      expect(formatDF(10.5)).toBe('10.50')
      expect(formatDF(23.456)).toBe('23.46')
    })
  })

  // ============================================================================
  // 신뢰구간 포맷팅
  // ============================================================================
  describe('formatCI', () => {
    it('should format confidence interval', () => {
      expect(formatCI(1.23, 4.56)).toBe('[1.23, 4.56]')
      expect(formatCI(-2.5, 3.5)).toBe('[-2.50, 3.50]')
    })

    it('should respect decimals parameter', () => {
      expect(formatCI(1.234, 4.567, 3)).toBe('[1.234, 4.567]')
    })

    it('should return "-" for null/undefined values', () => {
      expect(formatCI(null, 4.56)).toBe('-')
      expect(formatCI(1.23, null)).toBe('-')
      expect(formatCI(null, null)).toBe('-')
    })
  })

  // ============================================================================
  // 복합 포맷팅
  // ============================================================================
  describe('formatTTestResult', () => {
    it('should format t-test result', () => {
      const result = formatTTestResult(2.34, 28, 0.026)
      expect(result).toBe('t(28) = 2.34, p = 0.026')
    })

    it('should handle small p-values', () => {
      const result = formatTTestResult(5.67, 50, 0.0001)
      expect(result).toContain('< 0.001')
    })
  })

  describe('formatFTestResult', () => {
    it('should format ANOVA F-test result', () => {
      const result = formatFTestResult(4.56, 2, 45, 0.016)
      expect(result).toBe('F(2, 45) = 4.56, p = 0.016')
    })
  })

  describe('formatChiSquareResult', () => {
    it('should format chi-square result with χ² symbol', () => {
      const result = formatChiSquareResult(12.34, 3, 0.006)
      expect(result).toBe('χ²(3) = 12.34, p = 0.006')
    })
  })

  describe('formatCorrelationResult', () => {
    it('should use r for Pearson correlation', () => {
      const result = formatCorrelationResult(0.78, 0.001, 'pearson')
      expect(result).toContain('r =')
    })

    it('should use ρ for Spearman correlation', () => {
      const result = formatCorrelationResult(0.65, 0.01, 'spearman')
      expect(result).toContain('ρ =')
    })

    it('should use τ for Kendall correlation', () => {
      const result = formatCorrelationResult(0.55, 0.02, 'kendall')
      expect(result).toContain('τ =')
    })
  })

  // ============================================================================
  // 상수 검증
  // ============================================================================
  describe('ALPHA constant', () => {
    it('should have correct values', () => {
      expect(ALPHA.VERY_STRICT).toBe(0.001)
      expect(ALPHA.STRICT).toBe(0.01)
      expect(ALPHA.STANDARD).toBe(0.05)
      expect(ALPHA.LENIENT).toBe(0.10)
    })
  })

  describe('CONFIDENCE_LEVEL constant', () => {
    it('should have correct values', () => {
      expect(CONFIDENCE_LEVEL.VERY_HIGH).toBe(0.999)
      expect(CONFIDENCE_LEVEL.HIGH).toBe(0.99)
      expect(CONFIDENCE_LEVEL.STANDARD).toBe(0.95)
      expect(CONFIDENCE_LEVEL.LOW).toBe(0.90)
    })
  })
})
