/**
 * StatisticalAssumptions 타입 테스트
 *
 * 이 테스트는 optional 필드가 undefined일 때도 안전하게 처리되는지 검증합니다.
 *
 * Related issue: Cannot read properties of undefined (reading 'toFixed')
 * Fixed in: DataExplorationStep.tsx:497
 */

import { StatisticalAssumptions } from '@/types/smart-flow';

describe('StatisticalAssumptions Type Safety', () => {
  describe('Nullish Coalescing Pattern', () => {
    it('should handle undefined statistic with nullish coalescing', () => {
      const assumptions: StatisticalAssumptions = {
        normality: {
          shapiroWilk: {
            isNormal: true
            // statistic and pValue are undefined
          }
        }
      };

      // This is the pattern used in DataExplorationStep.tsx
      const statistic = assumptions.normality?.shapiroWilk?.statistic ?? 0;
      const pValue = assumptions.normality?.shapiroWilk?.pValue ?? 0;

      expect(statistic).toBe(0);
      expect(pValue).toBe(0);
      expect(statistic.toFixed(4)).toBe('0.0000');
      expect(pValue.toFixed(4)).toBe('0.0000');
    });

    it('should handle defined statistic values', () => {
      const assumptions: StatisticalAssumptions = {
        normality: {
          shapiroWilk: {
            statistic: 0.9876,
            pValue: 0.1234,
            isNormal: true
          }
        }
      };

      const statistic = assumptions.normality?.shapiroWilk?.statistic ?? 0;
      const pValue = assumptions.normality?.shapiroWilk?.pValue ?? 0;

      expect(statistic).toBe(0.9876);
      expect(pValue).toBe(0.1234);
      expect(statistic.toFixed(4)).toBe('0.9876');
      expect(pValue.toFixed(4)).toBe('0.1234');
    });

    it('should handle undefined levene with nullish coalescing', () => {
      const assumptions: StatisticalAssumptions = {
        homogeneity: {
          levene: {
            equalVariance: true
            // statistic and pValue are undefined
          }
        }
      };

      const statistic = assumptions.homogeneity?.levene?.statistic ?? 0;
      const pValue = assumptions.homogeneity?.levene?.pValue ?? 0;

      expect(statistic).toBe(0);
      expect(pValue).toBe(0);
      expect(statistic.toFixed(4)).toBe('0.0000');
    });

    it('should handle defined levene values', () => {
      const assumptions: StatisticalAssumptions = {
        homogeneity: {
          levene: {
            statistic: 2.3456,
            pValue: 0.0567,
            equalVariance: false
          }
        }
      };

      const statistic = assumptions.homogeneity?.levene?.statistic ?? 0;
      const pValue = assumptions.homogeneity?.levene?.pValue ?? 0;

      expect(statistic).toBe(2.3456);
      expect(pValue).toBe(0.0567);
      expect(statistic.toFixed(4)).toBe('2.3456');
    });
  });

  describe('Complete StatisticalAssumptions object', () => {
    it('should handle fully populated assumptions', () => {
      const assumptions: StatisticalAssumptions = {
        normality: {
          group1: {
            statistic: 0.95,
            pValue: 0.25,
            isNormal: true,
            interpretation: 'Normal distribution'
          },
          group2: {
            statistic: 0.92,
            pValue: 0.15,
            isNormal: true
          },
          shapiroWilk: {
            statistic: 0.98,
            pValue: 0.45,
            isNormal: true
          },
          kolmogorovSmirnov: {
            statistic: 0.12,
            pValue: 0.35,
            isNormal: true
          }
        },
        homogeneity: {
          levene: {
            statistic: 1.23,
            pValue: 0.28,
            equalVariance: true
          },
          bartlett: {
            statistic: 2.34,
            pValue: 0.31,
            equalVariance: true
          }
        },
        independence: {
          durbin: {
            statistic: 1.89,
            pValue: 0.42,
            isIndependent: true
          }
        }
      };

      // All values should be accessible
      expect(assumptions.normality?.shapiroWilk?.statistic).toBe(0.98);
      expect(assumptions.homogeneity?.levene?.pValue).toBe(0.28);
      expect(assumptions.independence?.durbin?.isIndependent).toBe(true);
    });

    it('should handle partially populated assumptions', () => {
      const assumptions: StatisticalAssumptions = {
        normality: {
          shapiroWilk: {
            isNormal: false
            // statistic and pValue intentionally omitted
          }
        }
      };

      // Should not throw when accessing undefined values with nullish coalescing
      expect(assumptions.normality?.shapiroWilk?.isNormal).toBe(false);
      expect((assumptions.normality?.shapiroWilk?.statistic ?? 0).toFixed(4)).toBe('0.0000');
      expect((assumptions.normality?.shapiroWilk?.pValue ?? 0).toFixed(4)).toBe('0.0000');
    });

    it('should handle empty assumptions object', () => {
      const assumptions: StatisticalAssumptions = {};

      // All optional chaining should return undefined, nullish coalescing should provide defaults
      expect(assumptions.normality?.shapiroWilk?.statistic).toBeUndefined();
      expect((assumptions.normality?.shapiroWilk?.statistic ?? 0).toFixed(4)).toBe('0.0000');
    });
  });

  describe('Edge cases', () => {
    it('should handle zero values correctly (not confuse with undefined)', () => {
      const assumptions: StatisticalAssumptions = {
        normality: {
          shapiroWilk: {
            statistic: 0,
            pValue: 0,
            isNormal: false
          }
        }
      };

      // Zero is a valid value, should not be replaced by nullish coalescing
      const statistic = assumptions.normality?.shapiroWilk?.statistic ?? 999;
      expect(statistic).toBe(0); // Should be 0, not 999
    });

    it('should handle very small p-values', () => {
      const assumptions: StatisticalAssumptions = {
        normality: {
          shapiroWilk: {
            statistic: 0.7234,
            pValue: 0.00001,
            isNormal: false
          }
        }
      };

      const pValue = assumptions.normality?.shapiroWilk?.pValue ?? 0;
      expect(pValue.toFixed(4)).toBe('0.0000');
      expect(pValue.toFixed(5)).toBe('0.00001');
    });
  });
});
