import {
  formatNumber,
  formatPValue,
  formatPercentage,
  formatCorrelation,
  formatConfidenceInterval,
  formatEffectSize,
  formatStatisticalResult,
  interpretPValue,
  interpretEffectSize,
  interpretCorrelation
} from '../formatters'

describe('formatters', () => {
  describe('formatNumber', () => {
    it('null/undefined 값을 N/A로 포맷해야 함', () => {
      expect(formatNumber(null)).toBe('N/A')
      expect(formatNumber(undefined)).toBe('N/A')
      expect(formatNumber(NaN)).toBe('N/A')
    })

    it('숫자를 올바른 정밀도로 포맷해야 함', () => {
      expect(formatNumber(1.23456, 2)).toBe('1.23')
      expect(formatNumber(1.23456, 4)).toBe('1.2346')
      expect(formatNumber(0, 2)).toBe('0.00')
    })
  })

  describe('formatPValue', () => {
    it('0.001 미만의 값을 < 0.001로 표시해야 함', () => {
      expect(formatPValue(0.0001)).toBe('< 0.001')
      expect(formatPValue(0.0009)).toBe('< 0.001')
    })

    it('일반 p-value를 올바르게 포맷해야 함', () => {
      expect(formatPValue(0.05)).toBe('0.0500')
      expect(formatPValue(0.123)).toBe('0.1230')
      expect(formatPValue(0.001)).toBe('0.0010')
    })

    it('null/undefined를 N/A로 처리해야 함', () => {
      expect(formatPValue(null)).toBe('N/A')
      expect(formatPValue(undefined)).toBe('N/A')
    })
  })

  describe('formatPercentage', () => {
    it('비율을 백분율로 변환해야 함', () => {
      expect(formatPercentage(0.5)).toBe('50.00%')
      expect(formatPercentage(0.123)).toBe('12.30%')
      expect(formatPercentage(1)).toBe('100.00%')
    })

    it('% 기호 없이도 포맷할 수 있어야 함', () => {
      expect(formatPercentage(0.5, false)).toBe('50.00')
    })
  })

  describe('formatConfidenceInterval', () => {
    it('신뢰구간을 올바르게 포맷해야 함', () => {
      expect(formatConfidenceInterval(1.23, 4.56)).toBe('[1.2300, 4.5600]')
      expect(formatConfidenceInterval(-1.5, 2.5, 2)).toBe('[-1.50, 2.50]')
    })

    it('null 값을 처리해야 함', () => {
      expect(formatConfidenceInterval(null, 1)).toBe('[N/A, N/A]')
      expect(formatConfidenceInterval(1, null)).toBe('[N/A, N/A]')
      expect(formatConfidenceInterval(null, null)).toBe('[N/A, N/A]')
    })
  })

  describe('formatStatisticalResult', () => {
    it('통계 결과를 올바른 형식으로 포맷해야 함', () => {
      expect(formatStatisticalResult('t', 2.345, 10, 0.025))
        .toBe('t(10) = 2.3450, p = 0.0250')
    })

    it('자유도 배열을 처리해야 함', () => {
      expect(formatStatisticalResult('F', 5.678, [2, 27], 0.0001))
        .toBe('F(2, 27) = 5.6780, p = < 0.001')
    })
  })

  describe('interpretPValue', () => {
    it('유의수준과 비교하여 유의성을 판단해야 함', () => {
      expect(interpretPValue(0.03, 0.05)).toBe(true)
      expect(interpretPValue(0.06, 0.05)).toBe(false)
      expect(interpretPValue(0.05, 0.05)).toBe(false)
    })

    it('기본 유의수준 0.05를 사용해야 함', () => {
      expect(interpretPValue(0.03)).toBe(true)
      expect(interpretPValue(0.06)).toBe(false)
    })
  })

  describe('interpretEffectSize', () => {
    it("Cohen's d를 올바르게 해석해야 함", () => {
      expect(interpretEffectSize(0.1, 'cohen_d')).toBe('매우 작음')
      expect(interpretEffectSize(0.3, 'cohen_d')).toBe('작음')
      expect(interpretEffectSize(0.6, 'cohen_d')).toBe('중간')
      expect(interpretEffectSize(0.9, 'cohen_d')).toBe('큼')
      expect(interpretEffectSize(1.5, 'cohen_d')).toBe('매우 큼')
    })

    it('eta squared를 올바르게 해석해야 함', () => {
      expect(interpretEffectSize(0.005, 'eta_squared')).toBe('매우 작음')
      expect(interpretEffectSize(0.03, 'eta_squared')).toBe('작음')
      expect(interpretEffectSize(0.10, 'eta_squared')).toBe('중간')
      expect(interpretEffectSize(0.20, 'eta_squared')).toBe('큼')
    })

    it('상관계수 효과크기를 해석해야 함', () => {
      expect(interpretEffectSize(0.05, 'r')).toBe('무시할 수준')
      expect(interpretEffectSize(0.2, 'r')).toBe('작음')
      expect(interpretEffectSize(0.4, 'r')).toBe('중간')
      expect(interpretEffectSize(0.6, 'r')).toBe('큼')
    })

    it('음수 값도 절댓값으로 처리해야 함', () => {
      expect(interpretEffectSize(-0.9, 'cohen_d')).toBe('큼')
      expect(interpretEffectSize(-0.3, 'cohen_d')).toBe('작음')
    })
  })

  describe('interpretCorrelation', () => {
    it('양의 상관관계를 해석해야 함', () => {
      expect(interpretCorrelation(0.1)).toBe('매우 약한 양의 상관관계')
      expect(interpretCorrelation(0.3)).toBe('약한 양의 상관관계')
      expect(interpretCorrelation(0.5)).toBe('중간 정도의 양의 상관관계')
      expect(interpretCorrelation(0.7)).toBe('강한 양의 상관관계')
      expect(interpretCorrelation(0.85)).toBe('매우 강한 양의 상관관계')
      expect(interpretCorrelation(0.95)).toBe('거의 완벽한 양의 상관관계')
    })

    it('음의 상관관계를 해석해야 함', () => {
      expect(interpretCorrelation(-0.1)).toBe('매우 약한 음의 상관관계')
      expect(interpretCorrelation(-0.3)).toBe('약한 음의 상관관계')
      expect(interpretCorrelation(-0.5)).toBe('중간 정도의 음의 상관관계')
      expect(interpretCorrelation(-0.7)).toBe('강한 음의 상관관계')
      expect(interpretCorrelation(-0.85)).toBe('매우 강한 음의 상관관계')
      expect(interpretCorrelation(-0.95)).toBe('거의 완벽한 음의 상관관계')
    })
  })

  describe('formatCorrelation', () => {
    it('상관계수를 포맷하고 강도를 표시해야 함', () => {
      expect(formatCorrelation(0.567, true)).toBe('0.5670 (보통)')
      expect(formatCorrelation(0.234, true)).toBe('0.2340 (약함)')
      expect(formatCorrelation(0.891, true)).toBe('0.8910 (매우 강함)')
    })

    it('강도 없이 값만 포맷해야 함', () => {
      expect(formatCorrelation(0.567, false)).toBe('0.5670')
      expect(formatCorrelation(0.234, false)).toBe('0.2340')
    })
  })

  describe('formatEffectSize', () => {
    it('효과크기를 포맷하고 해석을 표시해야 함', () => {
      expect(formatEffectSize(0.3, true)).toBe('0.3000 (작음)')
      expect(formatEffectSize(0.6, true)).toBe('0.6000 (중간)')
      expect(formatEffectSize(1.0, true)).toBe('1.0000 (큼)')
      expect(formatEffectSize(1.5, true)).toBe('1.5000 (매우 큼)')
    })

    it('해석 없이 값만 포맷해야 함', () => {
      expect(formatEffectSize(0.567, false)).toBe('0.5670')
    })
  })
})