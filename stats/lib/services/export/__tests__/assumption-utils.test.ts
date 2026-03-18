import { describe, it, expect } from 'vitest'
import { flattenAssumptions } from '../assumption-utils'
import type { StatisticalAssumptions } from '@/types/analysis'

describe('flattenAssumptions', () => {
  // ─── 기본 동작 ──────────────────────────────────────────────────────────────

  it('undefined 입력 시 빈 배열 반환', () => {
    expect(flattenAssumptions(undefined)).toEqual([])
  })

  it('null 입력 시 빈 배열 반환', () => {
    expect(flattenAssumptions(null)).toEqual([])
  })

  it('빈 객체 입력 시 빈 배열 반환', () => {
    expect(flattenAssumptions({})).toEqual([])
  })

  // ─── 정규성 (normality) ───────────────────────────────────────────────────

  it('normality.group1/group2 다중 그룹 처리', () => {
    const assumptions: StatisticalAssumptions = {
      normality: {
        group1: { statistic: 0.96, pValue: 0.712, isNormal: true },
        group2: { statistic: 0.94, pValue: 0.534, isNormal: true },
      },
    }
    const result = flattenAssumptions(assumptions)

    expect(result).toHaveLength(2)
    expect(result[0]).toMatchObject({
      category: 'normality',
      testName: 'Shapiro-Wilk',
      statistic: 0.96,
      pValue: 0.712,
      passed: true,
      group: 'group1',
    })
    expect(result[1]).toMatchObject({
      category: 'normality',
      passed: true,
      group: 'group2',
    })
  })

  it('normality.shapiroWilk 단일 처리 (그룹 없을 때)', () => {
    const assumptions: StatisticalAssumptions = {
      normality: {
        shapiroWilk: { statistic: 0.95, pValue: 0.3, isNormal: true },
      },
    }
    const result = flattenAssumptions(assumptions)

    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({
      category: 'normality',
      testName: 'Shapiro-Wilk',
      passed: true,
    })
    expect(result[0].group).toBeUndefined()
  })

  it('빈 normality 객체 처리 (키 없음)', () => {
    const assumptions: StatisticalAssumptions = { normality: {} }
    expect(flattenAssumptions(assumptions)).toEqual([])
  })

  // ─── 등분산성 (homogeneity) ──────────────────────────────────────────────

  it('homogeneity만 있는 케이스', () => {
    const assumptions: StatisticalAssumptions = {
      homogeneity: {
        levene: { statistic: 1.23, pValue: 0.277, equalVariance: true },
      },
    }
    const result = flattenAssumptions(assumptions)

    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({
      category: 'homogeneity',
      testName: 'Levene',
      statistic: 1.23,
      pValue: 0.277,
      passed: true,
    })
  })

  // ─── 복합 케이스 ────────────────────────────────────────────────────────

  it('normality + homogeneity 복합', () => {
    const assumptions: StatisticalAssumptions = {
      normality: {
        group1: { statistic: 0.96, pValue: 0.712, isNormal: true },
        group2: { statistic: 0.94, pValue: 0.534, isNormal: false },
      },
      homogeneity: {
        levene: { statistic: 1.23, pValue: 0.277, equalVariance: true },
      },
    }
    const result = flattenAssumptions(assumptions)

    expect(result).toHaveLength(3)

    const normality = result.filter(r => r.category === 'normality')
    const homogeneity = result.filter(r => r.category === 'homogeneity')
    expect(normality).toHaveLength(2)
    expect(homogeneity).toHaveLength(1)

    // 실패한 가정 확인
    const failedGroup = normality.find(r => r.group === 'group2')
    expect(failedGroup?.passed).toBe(false)
  })

  it('구형성(sphericity) Mauchly 처리', () => {
    const assumptions: StatisticalAssumptions = {
      sphericity: {
        mauchly: { statistic: 0.83, pValue: 0.04, passed: false },
      },
    }
    const result = flattenAssumptions(assumptions)

    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({
      category: 'sphericity',
      testName: "Mauchly's W",
      passed: false,
    })
  })

  it('시계열 정상성(stationarity) ADF + KPSS 처리', () => {
    const assumptions: StatisticalAssumptions = {
      stationarity: {
        adf: { statistic: -3.5, pValue: 0.01, isStationary: true },
        kpss: { statistic: 0.12, pValue: 0.1, isStationary: true },
      },
    }
    const result = flattenAssumptions(assumptions)

    expect(result).toHaveLength(2)
    expect(result.map(r => r.testName)).toEqual(['ADF', 'KPSS'])
  })

  it('statistic/pValue 없는 항목도 처리 (optional 필드)', () => {
    const assumptions: StatisticalAssumptions = {
      linearity: { passed: true },
    }
    const result = flattenAssumptions(assumptions)

    expect(result).toHaveLength(1)
    expect(result[0].statistic).toBeUndefined()
    expect(result[0].pValue).toBeUndefined()
    expect(result[0].passed).toBe(true)
  })
})
