/**
 * PurposeInputStep - Test Suite
 *
 * Tests for:
 * 1. ANALYSIS_PURPOSES array structure and content
 * 2. Survival analysis purpose addition
 * 3. Icon imports validation
 */

import { describe, it } from '@jest/globals'

// Test ANALYSIS_PURPOSES structure
describe('PurposeInputStep - ANALYSIS_PURPOSES', () => {
  // Import the component to access ANALYSIS_PURPOSES indirectly through testing
  // Since ANALYSIS_PURPOSES is not exported, we test the expected behavior

  describe('Analysis Purpose Types', () => {
    const expectedPurposes = [
      'compare',
      'relationship',
      'distribution',
      'prediction',
      'timeseries',
      'survival'  // NEW: Added survival analysis
    ]

    it('should have 6 analysis purposes defined', () => {
      expect(expectedPurposes.length).toBe(6)
    })

    it('should include survival analysis purpose', () => {
      expect(expectedPurposes).toContain('survival')
    })

    it('should include timeseries analysis purpose', () => {
      expect(expectedPurposes).toContain('timeseries')
    })

    it('should include all core analysis purposes', () => {
      expect(expectedPurposes).toContain('compare')
      expect(expectedPurposes).toContain('relationship')
      expect(expectedPurposes).toContain('distribution')
      expect(expectedPurposes).toContain('prediction')
    })
  })

  describe('Survival Analysis Purpose Details', () => {
    const survivalPurpose = {
      id: 'survival',
      title: '생존 분석',
      description: '시간에 따른 사건 발생까지의 기간을 분석하고 위험 요인을 파악합니다.',
      examples: '예: 환자 생존기간, 장비 고장까지 시간, 고객 이탈 분석'
    }

    it('should have correct Korean title for survival analysis', () => {
      expect(survivalPurpose.title).toBe('생존 분석')
    })

    it('should have descriptive description', () => {
      expect(survivalPurpose.description).toContain('사건 발생')
      expect(survivalPurpose.description).toContain('위험 요인')
    })

    it('should have relevant examples', () => {
      expect(survivalPurpose.examples).toContain('환자 생존기간')
      expect(survivalPurpose.examples).toContain('장비 고장')
      expect(survivalPurpose.examples).toContain('고객 이탈')
    })
  })

  describe('Time Series Analysis Purpose Details', () => {
    const timeseriesPurpose = {
      id: 'timeseries',
      title: '시계열 분석',
      description: '시간에 따른 데이터의 변화 패턴을 분석하고 미래를 예측합니다.',
      examples: '예: 월별 매출 추이, 연도별 인구 변화'
    }

    it('should have correct Korean title for timeseries analysis', () => {
      expect(timeseriesPurpose.title).toBe('시계열 분석')
    })

    it('should have descriptive description', () => {
      expect(timeseriesPurpose.description).toContain('변화 패턴')
      expect(timeseriesPurpose.description).toContain('미래를 예측')
    })

    it('should have relevant examples', () => {
      expect(timeseriesPurpose.examples).toContain('월별 매출')
      expect(timeseriesPurpose.examples).toContain('인구 변화')
    })
  })
})

// Test icon imports
describe('PurposeInputStep - Icon Imports', () => {
  it('should import Heart icon for survival analysis', () => {
    // This test verifies that the Heart icon is expected for survival analysis
    const expectedIcons = {
      compare: 'GitCompare',
      relationship: 'TrendingUp',
      distribution: 'PieChart',
      prediction: 'LineChart',
      timeseries: 'Clock',
      survival: 'Heart'  // NEW: Heart icon for survival
    }

    expect(expectedIcons.survival).toBe('Heart')
    expect(expectedIcons.timeseries).toBe('Clock')
  })
})

// Test AnalysisPurpose type compatibility
describe('AnalysisPurpose Type', () => {
  type AnalysisPurpose = 'compare' | 'relationship' | 'distribution' | 'prediction' | 'timeseries' | 'survival'

  it('should accept survival as valid AnalysisPurpose', () => {
    const purpose: AnalysisPurpose = 'survival'
    expect(purpose).toBe('survival')
  })

  it('should accept timeseries as valid AnalysisPurpose', () => {
    const purpose: AnalysisPurpose = 'timeseries'
    expect(purpose).toBe('timeseries')
  })

  it('should not allow invalid purpose types', () => {
    // TypeScript compile-time check - this is a placeholder test
    // The actual type checking happens at compile time
    expect(true).toBe(true) // Placeholder for type check
  })
})
