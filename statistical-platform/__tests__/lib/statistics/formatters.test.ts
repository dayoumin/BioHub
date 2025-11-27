/**
 * formatters.ts 단위 테스트
 * - p-value, effect size, correlation 해석 함수 검증
 */

import {
  formatPValue,
  formatNumber,
  formatConfidenceInterval,
  interpretPValue,
  interpretPValueKo,
  interpretEffectSize,
  interpretCorrelation,
  interpretCorrelationStrength,
  interpretPValueEn,
  interpretEffectSizeEn,
  interpretCorrelationEn,
  interpretNormality,
  interpretHomogeneity,
  formatStatisticalResult
} from '@/lib/statistics/formatters'

describe('formatters.ts', () => {
  // ============================================================================
  // Formatting Functions
  // ============================================================================
  describe('formatPValue', () => {
    it('should return "< 0.001" for very small p-values', () => {
      expect(formatPValue(0.0001)).toBe('< 0.001')
      expect(formatPValue(0.0005)).toBe('< 0.001')
    })

    it('should format p-values with 4 decimal places', () => {
      expect(formatPValue(0.0234)).toBe('0.0234')
      expect(formatPValue(0.05)).toBe('0.0500')
    })

    it('should return "N/A" for null/undefined', () => {
      expect(formatPValue(null)).toBe('N/A')
      expect(formatPValue(undefined)).toBe('N/A')
    })
  })

  describe('formatNumber', () => {
    it('should format with default precision (4)', () => {
      expect(formatNumber(3.14159)).toBe('3.1416')
    })

    it('should format with custom precision', () => {
      expect(formatNumber(3.14159, 2)).toBe('3.14')
    })

    it('should return "N/A" for invalid values', () => {
      expect(formatNumber(null)).toBe('N/A')
      expect(formatNumber(NaN)).toBe('N/A')
    })
  })

  describe('formatConfidenceInterval', () => {
    it('should format CI with brackets', () => {
      expect(formatConfidenceInterval(1.23, 4.56)).toBe('[1.2300, 4.5600]')
    })

    it('should return "[N/A, N/A]" for null values', () => {
      expect(formatConfidenceInterval(null, 4.56)).toBe('[N/A, N/A]')
    })
  })

  describe('formatStatisticalResult', () => {
    it('should format t-test result', () => {
      const result = formatStatisticalResult('t', 2.5, 28, 0.018)
      expect(result).toBe('t(28) = 2.5000, p = 0.0180')
    })

    it('should format ANOVA result with array df', () => {
      const result = formatStatisticalResult('F', 4.2, [2, 45], 0.021)
      expect(result).toBe('F(2, 45) = 4.2000, p = 0.0210')
    })
  })

  // ============================================================================
  // Korean Interpretation Functions
  // ============================================================================
  describe('interpretPValue (boolean)', () => {
    it('should return true for p < 0.05 (default alpha)', () => {
      expect(interpretPValue(0.03)).toBe(true)
      expect(interpretPValue(0.049)).toBe(true)
    })

    it('should return false for p >= 0.05', () => {
      expect(interpretPValue(0.05)).toBe(false)
      expect(interpretPValue(0.08)).toBe(false)
    })

    it('should respect custom alpha', () => {
      expect(interpretPValue(0.08, 0.1)).toBe(true)
      expect(interpretPValue(0.008, 0.01)).toBe(true)
    })
  })

  describe('interpretPValueKo', () => {
    it('should return correct Korean strings for each threshold', () => {
      // p < 0.001: Very strong
      expect(interpretPValueKo(0.0001)).toContain('매우 강한')

      // p < 0.01: Strong
      expect(interpretPValueKo(0.005)).toContain('강한 통계적 유의성')

      // p < 0.05: Significant (standard threshold)
      expect(interpretPValueKo(0.03)).toContain('통계적으로 유의')

      // p < 0.1: Marginally significant (NOT "weak significance")
      expect(interpretPValueKo(0.08)).toBe('경계선 수준 (p < 0.1)')

      // p >= 0.1: Not significant
      expect(interpretPValueKo(0.15)).toContain('유의하지 않음')
    })

    it('should NOT call p < 0.1 "significant"', () => {
      const result = interpretPValueKo(0.08)
      expect(result).not.toContain('유의성')
      expect(result).toBe('경계선 수준 (p < 0.1)')
    })
  })

  describe('interpretEffectSize', () => {
    it('should interpret Cohen\'s d correctly', () => {
      expect(interpretEffectSize(0.1, 'cohen_d')).toBe('매우 작음')
      expect(interpretEffectSize(0.3, 'cohen_d')).toBe('작음')
      expect(interpretEffectSize(0.6, 'cohen_d')).toBe('중간')
      expect(interpretEffectSize(0.9, 'cohen_d')).toBe('큼')
      expect(interpretEffectSize(1.5, 'cohen_d')).toBe('매우 큼')
    })

    it('should interpret eta_squared correctly', () => {
      expect(interpretEffectSize(0.005, 'eta_squared')).toBe('매우 작음')
      expect(interpretEffectSize(0.03, 'eta_squared')).toBe('작음')
      expect(interpretEffectSize(0.10, 'eta_squared')).toBe('중간')
      expect(interpretEffectSize(0.20, 'eta_squared')).toBe('큼')
    })
  })

  describe('interpretCorrelation', () => {
    it('should include direction (positive/negative)', () => {
      expect(interpretCorrelation(0.75)).toContain('양')
      expect(interpretCorrelation(-0.75)).toContain('음')
    })

    it('should interpret strength correctly', () => {
      expect(interpretCorrelation(0.1)).toContain('매우 약한')
      expect(interpretCorrelation(0.3)).toContain('약한')
      expect(interpretCorrelation(0.5)).toContain('중간')
      expect(interpretCorrelation(0.7)).toContain('강한')
      expect(interpretCorrelation(0.85)).toContain('매우 강한')
      expect(interpretCorrelation(0.95)).toContain('거의 완벽한')
    })
  })

  describe('interpretCorrelationStrength', () => {
    it('should return strength only (no direction)', () => {
      // Using >= operator (boundary values included in upper category)
      expect(interpretCorrelationStrength(0.8)).toBe('강한')   // >= 0.8
      expect(interpretCorrelationStrength(0.79)).toBe('중간')  // < 0.8, >= 0.6
      expect(interpretCorrelationStrength(0.6)).toBe('중간')   // >= 0.6
      expect(interpretCorrelationStrength(0.59)).toBe('약간')  // < 0.6, >= 0.4
      expect(interpretCorrelationStrength(0.4)).toBe('약간')   // >= 0.4
      expect(interpretCorrelationStrength(0.39)).toBe('약한')  // < 0.4
    })

    it('should handle negative values', () => {
      expect(interpretCorrelationStrength(-0.85)).toBe('강한')  // |−0.85| >= 0.8
      expect(interpretCorrelationStrength(-0.5)).toBe('약간')   // |−0.5| >= 0.4, < 0.6
      expect(interpretCorrelationStrength(-0.65)).toBe('중간')  // |−0.65| >= 0.6
    })
  })

  // ============================================================================
  // English Interpretation Functions
  // ============================================================================
  describe('interpretPValueEn', () => {
    it('should return English strings', () => {
      expect(interpretPValueEn(0.0001)).toBe('highly significant (p < 0.001)')
      expect(interpretPValueEn(0.005)).toBe('very significant (p < 0.01)')
      expect(interpretPValueEn(0.03)).toBe('significant (p < 0.05)')
      expect(interpretPValueEn(0.08)).toBe('not significant (p >= 0.05)')
    })
  })

  describe('interpretEffectSizeEn', () => {
    it('should return English strings for cohens_d', () => {
      expect(interpretEffectSizeEn(0.1, 'cohens_d')).toBe('negligible')
      expect(interpretEffectSizeEn(0.3, 'cohens_d')).toBe('small')
      expect(interpretEffectSizeEn(0.6, 'cohens_d')).toBe('medium')
      expect(interpretEffectSizeEn(0.9, 'cohens_d')).toBe('large')
    })
  })

  describe('interpretCorrelationEn', () => {
    it('should return English strings', () => {
      expect(interpretCorrelationEn(0.05)).toBe('negligible')
      expect(interpretCorrelationEn(0.2)).toBe('weak')
      expect(interpretCorrelationEn(0.4)).toBe('moderate')
      expect(interpretCorrelationEn(0.6)).toBe('strong')
      expect(interpretCorrelationEn(0.8)).toBe('very strong')
    })
  })

  // ============================================================================
  // Assumption Test Interpretations
  // ============================================================================
  describe('interpretNormality', () => {
    it('should return isNormal: true when p >= alpha', () => {
      const result = interpretNormality(0.12)
      expect(result.isNormal).toBe(true)
      expect(result.interpretation).toContain('normally distributed')
    })

    it('should return isNormal: false when p < alpha', () => {
      const result = interpretNormality(0.02)
      expect(result.isNormal).toBe(false)
      expect(result.interpretation).toContain('deviates')
    })
  })

  describe('interpretHomogeneity', () => {
    it('should return isHomogeneous: true when p >= alpha', () => {
      const result = interpretHomogeneity(0.08)
      expect(result.isHomogeneous).toBe(true)
      expect(result.interpretation).toContain('equal')
    })

    it('should return isHomogeneous: false when p < alpha', () => {
      const result = interpretHomogeneity(0.02)
      expect(result.isHomogeneous).toBe(false)
      expect(result.interpretation).toContain('not equal')
    })
  })
})
