/**
 * data-format-validator 단위 테스트
 *
 * 방법별 데이터 형태 검증 로직 시뮬레이션
 */

import { validateDataFormat, type FormatValidationResult } from '@/lib/utils/data-format-validator'

// ================================================================
// 테스트 데이터 팩토리
// ================================================================

/** 독립표본 t-검정용 데이터 (그룹 + 측정값) */
function makeTTestData(n = 10) {
  return Array.from({ length: n }, (_, i) => ({
    group: i < n / 2 ? 'A' : 'B',
    score: 70 + Math.round(Math.random() * 30),
  }))
}

/** 대응표본 t-검정용 데이터 (전/후) */
function makePairedData(n = 10) {
  return Array.from({ length: n }, (_, i) => ({
    subject: `S${String(i + 1).padStart(3, '0')}`,
    before: 100 + Math.round(Math.random() * 50),
    after: 95 + Math.round(Math.random() * 50),
  }))
}

/** 일표본 t-검정용 데이터 (숫자 열 1개) */
function makeOneSampleData(n = 10) {
  return Array.from({ length: n }, () => ({
    score: 70 + Math.round(Math.random() * 30),
  }))
}

/** ANOVA용 데이터 (3그룹) */
function makeAnovaData(n = 15) {
  const groups = ['A', 'B', 'C']
  return Array.from({ length: n }, (_, i) => ({
    group: groups[i % 3],
    value: 50 + Math.round(Math.random() * 50),
  }))
}

/** 카이제곱용 데이터 (범주형 2열) */
function makeChiSquareData(n = 20) {
  const genders = ['남', '여']
  const preferences = ['찬성', '반대', '중립']
  return Array.from({ length: n }, (_, i) => ({
    gender: genders[i % 2],
    opinion: preferences[i % 3],
  }))
}

/** 회귀분석용 데이터 (숫자 3열) */
function makeRegressionData(n = 15) {
  return Array.from({ length: n }, () => ({
    x1: Math.round(Math.random() * 100),
    x2: Math.round(Math.random() * 100),
    y: Math.round(Math.random() * 100),
  }))
}

/** 부실 데이터 (열 1개, 행 2개) */
function makePoorData() {
  return [{ value: 1 }, { value: 2 }]
}

describe('validateDataFormat', () => {
  // ================================================================
  // 1. 기본 동작
  // ================================================================
  describe('기본 동작', () => {
    it('빈 데이터는 isCompatible=false', () => {
      const result = validateDataFormat('t-test', [])
      expect(result.isCompatible).toBe(false)
      expect(result.warnings.length).toBeGreaterThan(0)
    })

    it('미등록 methodId는 기본 통과', () => {
      const result = validateDataFormat('unknown-method', makeTTestData())
      expect(result.isCompatible).toBe(true)
      expect(result.warnings).toHaveLength(0)
    })

    it('detected에 열/행 정보가 포함된다', () => {
      const data = makeTTestData(8)
      const result = validateDataFormat('t-test', data)
      expect(result.detected.totalColumns).toBe(2) // group, score
      expect(result.detected.rowCount).toBe(8)
      expect(result.detected.numericColumns.length).toBeGreaterThanOrEqual(1)
    })
  })

  // ================================================================
  // 2. t-검정 시뮬레이션
  // ================================================================
  describe('t-검정', () => {
    it('독립표본 t-test: 적합한 데이터 → 통과', () => {
      const result = validateDataFormat('t-test', makeTTestData(10))
      expect(result.isCompatible).toBe(true)
    })

    it('독립표본 t-test: 범주형 열 없음 → 경고', () => {
      // 숫자만 2열
      const numericOnly = Array.from({ length: 10 }, () => ({
        x: Math.random() * 100,
        y: Math.random() * 100,
      }))
      const result = validateDataFormat('t-test', numericOnly)
      expect(result.isCompatible).toBe(false)
      expect(result.warnings.some(w => w.includes('범주형'))).toBe(true)
    })

    it('일표본 t-test: 숫자 열 1개면 통과', () => {
      const result = validateDataFormat('one-sample-t', makeOneSampleData(10))
      expect(result.isCompatible).toBe(true)
    })

    it('일표본 t-test: 행 부족 → 경고', () => {
      const result = validateDataFormat('one-sample-t', makeOneSampleData(2))
      expect(result.isCompatible).toBe(false)
      expect(result.warnings.some(w => w.includes('행'))).toBe(true)
    })

    it('대응표본 paired-t: 숫자 열 2개 이상이면 통과', () => {
      const result = validateDataFormat('paired-t', makePairedData(10))
      expect(result.isCompatible).toBe(true)
    })

    it('대응표본 paired-t: 숫자 열 1개면 경고', () => {
      const result = validateDataFormat('paired-t', makeOneSampleData(10))
      expect(result.isCompatible).toBe(false)
    })
  })

  // ================================================================
  // 3. ANOVA 시뮬레이션
  // ================================================================
  describe('ANOVA', () => {
    it('일원분산분석: 3그룹 데이터 → 통과', () => {
      const result = validateDataFormat('anova', makeAnovaData(15))
      expect(result.isCompatible).toBe(true)
    })

    it('일원분산분석: 2그룹만 있으면 → 경고', () => {
      const twoGroups = Array.from({ length: 10 }, (_, i) => ({
        group: i < 5 ? 'A' : 'B',
        value: Math.random() * 100,
      }))
      const result = validateDataFormat('anova', twoGroups)
      expect(result.isCompatible).toBe(false)
      expect(result.warnings.some(w => w.includes('3개 이상'))).toBe(true)
    })

    it('이원분산분석: 범주형 2열 + 숫자 1열 → 통과', () => {
      const data = Array.from({ length: 12 }, (_, i) => ({
        factor1: i % 2 === 0 ? 'A' : 'B',
        factor2: i % 3 === 0 ? 'X' : i % 3 === 1 ? 'Y' : 'Z',
        score: Math.random() * 100,
      }))
      const result = validateDataFormat('two-way-anova', data)
      expect(result.isCompatible).toBe(true)
    })

    it('반복측정 ANOVA: 숫자 열 3개 이상 필요', () => {
      const data = Array.from({ length: 10 }, () => ({
        t1: Math.random() * 100,
        t2: Math.random() * 100,
        t3: Math.random() * 100,
      }))
      const result = validateDataFormat('repeated-measures-anova', data)
      expect(result.isCompatible).toBe(true)
    })
  })

  // ================================================================
  // 4. 카이제곱 시뮬레이션
  // ================================================================
  describe('카이제곱', () => {
    it('범주형 2열 데이터 → 통과', () => {
      const result = validateDataFormat('chi-square', makeChiSquareData(20))
      expect(result.isCompatible).toBe(true)
    })

    it('숫자만 있는 데이터 → 범주형 열 부족 경고', () => {
      const result = validateDataFormat('chi-square', makeRegressionData(10))
      expect(result.isCompatible).toBe(false)
      expect(result.warnings.some(w => w.includes('범주형'))).toBe(true)
    })
  })

  // ================================================================
  // 5. 회귀분석 시뮬레이션
  // ================================================================
  describe('회귀분석', () => {
    it('숫자 열 2개 이상 → 통과', () => {
      const result = validateDataFormat('regression', makeRegressionData(15))
      expect(result.isCompatible).toBe(true)
    })

    it('열 부족 → 경고', () => {
      const result = validateDataFormat('regression', makeOneSampleData(10))
      expect(result.isCompatible).toBe(false)
    })

    it('단계적 회귀: 숫자 열 3개 이상 필요', () => {
      const result = validateDataFormat('stepwise', makeRegressionData(15))
      expect(result.isCompatible).toBe(true)
    })
  })

  // ================================================================
  // 6. 비모수 시뮬레이션
  // ================================================================
  describe('비모수 검정', () => {
    it('Mann-Whitney: 그룹 + 측정값 → 통과', () => {
      const result = validateDataFormat('mann-whitney', makeTTestData(10))
      expect(result.isCompatible).toBe(true)
    })

    it('Wilcoxon: 숫자 2열 → 통과', () => {
      const result = validateDataFormat('wilcoxon', makePairedData(10))
      expect(result.isCompatible).toBe(true)
    })

    it('Kruskal-Wallis: 3그룹 + 측정값 → 통과', () => {
      const result = validateDataFormat('kruskal-wallis', makeAnovaData(15))
      expect(result.isCompatible).toBe(true)
    })
  })

  // ================================================================
  // 7. 경계 조건
  // ================================================================
  describe('경계 조건', () => {
    it('행 수 부족만 있을 때 경고 1개', () => {
      const result = validateDataFormat('one-sample-t', makeOneSampleData(2))
      // 행 부족 경고만 (열은 충분)
      expect(result.warnings.some(w => w.includes('행'))).toBe(true)
    })

    it('모든 조건 미충족 시 복수 경고', () => {
      // chi-square에 숫자 1열, 행 2개
      const result = validateDataFormat('chi-square', makePoorData())
      expect(result.isCompatible).toBe(false)
      expect(result.warnings.length).toBeGreaterThanOrEqual(2)
    })

    it('null/undefined 셀이 있어도 크래시 없음', () => {
      const dataWithNulls = [
        { group: 'A', score: 85 },
        { group: 'B', score: null },
        { group: null, score: 90 },
        { group: 'A', score: undefined },
        { group: 'B', score: 75 },
        { group: 'A', score: 80 },
      ]
      expect(() => validateDataFormat('t-test', dataWithNulls)).not.toThrow()
    })
  })
})
