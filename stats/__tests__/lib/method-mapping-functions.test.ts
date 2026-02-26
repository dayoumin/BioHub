/**
 * method-mapping.ts 함수 시뮬레이션 테스트
 *
 * 검증 항목:
 * 1. proportion-test 메타데이터 정확성 (일표본 검정)
 * 2. recommendMethods — non-null 안전성 (! 제거 후)
 * 3. checkMethodRequirements — DataProfile 타입 + date 검증
 * 4. 엣지 케이스 시뮬레이션
 */

import { describe, it, expect } from 'vitest'
import {
  STATISTICAL_METHODS,
  recommendMethods,
  checkMethodRequirements,
} from '@/lib/statistics/method-mapping'

// ────────────────────────────────────────────────────────────────
// 1. proportion-test 메타데이터
// ────────────────────────────────────────────────────────────────
describe('proportion-test 메타데이터', () => {
  const proportionTest = STATISTICAL_METHODS.find(m => m.id === 'proportion-test')

  it('proportion-test 항목이 존재해야 한다', () => {
    expect(proportionTest).toBeDefined()
  })

  it('description이 일표본 검정임을 나타내야 한다 ("두 비율" 아님)', () => {
    expect(proportionTest?.description).not.toContain('두 비율')
    // 귀무가설 비율(p₀)과 비교하는 일표본 검정임을 명시
    expect(proportionTest?.description).toContain('p₀')
  })

  it('minSampleSize가 10 이상이어야 한다 (np≥5 기준)', () => {
    expect(proportionTest?.requirements?.minSampleSize).toBeGreaterThanOrEqual(10)
  })

  it('category가 nonparametric이어야 한다', () => {
    expect(proportionTest?.category).toBe('nonparametric')
  })

  it('variableTypes에 categorical이 포함되어야 한다', () => {
    expect(proportionTest?.requirements?.variableTypes).toContain('categorical')
  })
})

// ────────────────────────────────────────────────────────────────
// 2. recommendMethods — 안전성 시뮬레이션
// ────────────────────────────────────────────────────────────────
describe('recommendMethods', () => {
  it('기본 프로파일에서 undefined 없이 결과를 반환해야 한다', () => {
    const result = recommendMethods({
      numericVars: 1,
      categoricalVars: 0,
      totalRows: 50,
      hasTimeVar: false,
      hasGroupVar: false,
    })
    // 모든 항목이 유효한 StatisticalMethod 객체여야 함 (! 제거 후 안전 확인)
    result.forEach(m => {
      expect(m).toBeDefined()
      expect(m.id).toBeDefined()
      expect(m.name).toBeDefined()
    })
    expect(result.some(m => m.id === 'descriptive-stats')).toBe(true)
  })

  it('numericVars >= 2이면 correlation 추천에 포함된다', () => {
    const result = recommendMethods({
      numericVars: 3,
      categoricalVars: 0,
      totalRows: 30,
      hasTimeVar: false,
      hasGroupVar: false,
    })
    expect(result.some(m => m.id === 'correlation')).toBe(true)
  })

  it('groupLevels=2이면 two-sample-t, mann-whitney 추천', () => {
    const result = recommendMethods({
      numericVars: 1,
      categoricalVars: 1,
      totalRows: 50,
      hasTimeVar: false,
      hasGroupVar: true,
      groupLevels: 2,
    })
    expect(result.some(m => m.id === 'two-sample-t')).toBe(true)
    expect(result.some(m => m.id === 'mann-whitney')).toBe(true)
    // ANOVA는 추천 안 됨
    expect(result.some(m => m.id === 'one-way-anova')).toBe(false)
  })

  it('groupLevels=3이면 one-way-anova, kruskal-wallis 추천', () => {
    const result = recommendMethods({
      numericVars: 1,
      categoricalVars: 1,
      totalRows: 50,
      hasTimeVar: false,
      hasGroupVar: true,
      groupLevels: 3,
    })
    expect(result.some(m => m.id === 'one-way-anova')).toBe(true)
    expect(result.some(m => m.id === 'kruskal-wallis')).toBe(true)
    // t-test는 추천 안 됨
    expect(result.some(m => m.id === 'two-sample-t')).toBe(false)
  })

  it('hasTimeVar=true, totalRows>=50이면 mann-kendall 추천', () => {
    const result = recommendMethods({
      numericVars: 1,
      categoricalVars: 0,
      totalRows: 60,
      hasTimeVar: true,
      hasGroupVar: false,
    })
    expect(result.some(m => m.id === 'mann-kendall')).toBe(true)
  })

  it('totalRows<50이면 mann-kendall 추천 안 됨', () => {
    const result = recommendMethods({
      numericVars: 1,
      categoricalVars: 0,
      totalRows: 30,
      hasTimeVar: true,
      hasGroupVar: false,
    })
    expect(result.some(m => m.id === 'mann-kendall')).toBe(false)
  })

  it('totalRows>=30, numericVars>=3이면 pca 추천', () => {
    const result = recommendMethods({
      numericVars: 4,
      categoricalVars: 0,
      totalRows: 30,
      hasTimeVar: false,
      hasGroupVar: false,
    })
    expect(result.some(m => m.id === 'pca')).toBe(true)
  })

  it('결과 배열에 undefined가 없어야 한다 (non-null 안전성)', () => {
    // 모든 id가 STATISTICAL_METHODS에 있으므로 undefined push 없음
    const result = recommendMethods({
      numericVars: 5,
      categoricalVars: 3,
      totalRows: 100,
      hasTimeVar: true,
      hasGroupVar: true,
      groupLevels: 4,
    })
    expect(result.every(m => m !== undefined && m !== null)).toBe(true)
  })
})

// ────────────────────────────────────────────────────────────────
// 3. checkMethodRequirements — 수정된 동작 시뮬레이션
// ────────────────────────────────────────────────────────────────
describe('checkMethodRequirements', () => {
  const mannKendallMethod = STATISTICAL_METHODS.find(m => m.id === 'mann-kendall')!
  const proportionTestMethod = STATISTICAL_METHODS.find(m => m.id === 'proportion-test')!
  const twoSampleT = STATISTICAL_METHODS.find(m => m.id === 'two-sample-t')!

  describe('[FIX] date 타입 검증', () => {
    it('mann-kendall에 hasTimeVar=false이면 경고 + canUse=false', () => {
      const result = checkMethodRequirements(mannKendallMethod, {
        totalRows: 30,
        numericVars: 1,
        categoricalVars: 0,
        hasTimeVar: false,
      })
      expect(result.canUse).toBe(false)
      expect(result.warnings).toContain('날짜/시간 변수 필요')
    })

    it('mann-kendall에 hasTimeVar=true이면 경고 없음', () => {
      const result = checkMethodRequirements(mannKendallMethod, {
        totalRows: 30,
        numericVars: 1,
        categoricalVars: 0,
        hasTimeVar: true,
      })
      expect(result.warnings).not.toContain('날짜/시간 변수 필요')
    })

    it('mann-kendall에 hasTimeVar 미제공(undefined)이면 canUse=false (date 필요)', () => {
      const result = checkMethodRequirements(mannKendallMethod, {
        totalRows: 30,
        numericVars: 1,
        categoricalVars: 0,
        // hasTimeVar 미제공 → undefined → falsy → 경고
      })
      expect(result.canUse).toBe(false)
      expect(result.warnings).toContain('날짜/시간 변수 필요')
    })
  })

  describe('proportion-test 요구사항', () => {
    it('categorical 변수 있고 totalRows>=10이면 canUse=true', () => {
      const result = checkMethodRequirements(proportionTestMethod, {
        totalRows: 15,
        numericVars: 0,
        categoricalVars: 1,
      })
      expect(result.canUse).toBe(true)
      expect(result.warnings).toHaveLength(0)
    })

    it('totalRows<10이면 canUse=false (minSampleSize=10)', () => {
      const result = checkMethodRequirements(proportionTestMethod, {
        totalRows: 5,
        numericVars: 0,
        categoricalVars: 1,
      })
      expect(result.canUse).toBe(false)
      expect(result.warnings).toContain('최소 10개 데이터 필요 (현재: 5개)')
    })

    it('categorical 변수 없으면 canUse=false', () => {
      const result = checkMethodRequirements(proportionTestMethod, {
        totalRows: 30,
        numericVars: 2,
        categoricalVars: 0,
      })
      expect(result.canUse).toBe(false)
      expect(result.warnings).toContain('범주형 변수 필요')
    })
  })

  describe('기존 동작 회귀 검증', () => {
    it('two-sample-t: 충분한 데이터 → canUse=true', () => {
      const result = checkMethodRequirements(twoSampleT, {
        totalRows: 20,
        numericVars: 1,
        categoricalVars: 1,
        normalityPassed: true,
        homogeneityPassed: true,
      })
      expect(result.canUse).toBe(true)
      expect(result.warnings).toHaveLength(0)
    })

    it('two-sample-t: normalityPassed=false → 경고 (canUse는 true)', () => {
      const result = checkMethodRequirements(twoSampleT, {
        totalRows: 20,
        numericVars: 1,
        categoricalVars: 1,
        normalityPassed: false,
      })
      expect(result.canUse).toBe(true)
      expect(result.warnings).toContain('정규성 가정 위반 (비모수 검정 고려)')
    })

    it('two-sample-t: homogeneityPassed=false → 경고 (canUse는 true)', () => {
      const result = checkMethodRequirements(twoSampleT, {
        totalRows: 20,
        numericVars: 1,
        categoricalVars: 1,
        homogeneityPassed: false,
      })
      expect(result.canUse).toBe(true)
      expect(result.warnings).toContain('등분산성 가정 위반 (Welch 검정 고려)')
    })

    it('two-sample-t: normalityPassed=undefined → 경고 없음 (미실행)', () => {
      const result = checkMethodRequirements(twoSampleT, {
        totalRows: 20,
        numericVars: 1,
        categoricalVars: 1,
      })
      expect(result.canUse).toBe(true)
      expect(result.warnings).not.toContain('정규성 가정 위반 (비모수 검정 고려)')
    })
  })
})
