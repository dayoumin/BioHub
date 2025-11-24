/**
 * Golden Snapshot Tests - Simplified Version
 *
 * Purpose: 기본 3개 통계 스냅샷 테스트 (ANOVA만)
 * - ANOVA: method 기반 해석 (purpose 불필요)
 * - t-test, Correlation: purpose 기반 테스트는 별도로 작성
 */

import { describe, it, expect } from '@jest/globals'
import { getInterpretation } from '@/lib/interpretation/engine'
import type { AnalysisResult } from '@/types/smart-flow'

describe('Golden Snapshot: ANOVA (Method-based)', () => {
  it('Scenario 1: significant + large effect', () => {
    const result = getInterpretation({
      method: 'One-way ANOVA',
      statistic: 15.3,
      pValue: 0.0001,
      df: [2, 87],
      effectSize: { value: 0.15, type: 'Eta-squared' },
      groupStats: [
        { name: 'Group A', mean: 45, std: 8, n: 30 },
        { name: 'Group B', mean: 52, std: 9, n: 30 },
        { name: 'Group C', mean: 58, std: 10, n: 30 }
      ]
    } as AnalysisResult)

    expect(result).not.toBeNull()
    expect(result!.title).toBe('다집단 비교 결과')
    expect(result!.summary).toBe('3개 그룹의 평균 범위는 45.00 ~ 58.00 (차이: 13.00)입니다.')
    expect(result!.statistical).toBe('적어도 하나의 그룹 평균이 통계적으로 다릅니다 (p=< 0.001).')
    expect(result!.practical).toBe('사후 검정을 수행하여 어느 그룹이 다른지 확인하세요.')
    expect(result).toMatchSnapshot()
  })

  it('Scenario 2: nonsignificant + small effect', () => {
    const result = getInterpretation({
      method: 'One-way ANOVA',
      statistic: 1.8,
      pValue: 0.172,
      df: [2, 87],
      effectSize: { value: 0.02, type: 'Eta-squared' },
      groupStats: [
        { name: 'Group A', mean: 50, std: 10, n: 30 },
        { name: 'Group B', mean: 52, std: 11, n: 30 },
        { name: 'Group C', mean: 51, std: 9, n: 30 }
      ]
    } as AnalysisResult)

    expect(result).not.toBeNull()
    expect(result!.title).toBe('다집단 비교 결과')
    expect(result!.summary).toBe('3개 그룹의 평균 범위는 50.00 ~ 52.00 (차이: 2.00)입니다.')
    expect(result!.statistical).toBe('모든 그룹 평균이 통계적으로 유사합니다 (p=0.172).')
    expect(result!.practical).toBeNull()
    expect(result).toMatchSnapshot()
  })

  it('Scenario 3: boundary case p ≈ 0.05', () => {
    const result = getInterpretation({
      method: 'One-way ANOVA',
      statistic: 3.15,
      pValue: 0.047,
      df: [2, 87],
      effectSize: { value: 0.07, type: 'Eta-squared' },
      groupStats: [
        { name: 'Group A', mean: 48, std: 10, n: 30 },
        { name: 'Group B', mean: 53, std: 11, n: 30 },
        { name: 'Group C', mean: 51, std: 9, n: 30 }
      ]
    } as AnalysisResult)

    expect(result).not.toBeNull()
    expect(result!.title).toBe('다집단 비교 결과')
    expect(result!.summary).toBe('3개 그룹의 평균 범위는 48.00 ~ 53.00 (차이: 5.00)입니다.')
    expect(result!.statistical).toBe('적어도 하나의 그룹 평균이 통계적으로 다릅니다 (p=0.047).')
    expect(result!.practical).toBe('사후 검정을 수행하여 어느 그룹이 다른지 확인하세요.')
    expect(result).toMatchSnapshot()
  })
})

describe('Golden Snapshot: t-test (Purpose-based)', () => {
  it('Scenario 1: significant + large effect (purpose="비교")', () => {
    const result = getInterpretation(
      {
        method: 'Independent t-test',
        statistic: 3.45,
        pValue: 0.001,
        df: 98,
        effectSize: { value: 0.8, type: "Cohen's d" },
        groupStats: [
          { name: 'Control', mean: 50, std: 10, n: 50 },
          { name: 'Treatment', mean: 58, std: 12, n: 50 }
        ]
      } as AnalysisResult,
      '비교'  // purpose
    )

    expect(result).not.toBeNull()
    expect(result!.title).toBe('그룹 비교 결과')
    expect(result!.summary).toBe('Control 평균(50.00)이 Treatment 평균(58.00)보다 8.00점 낮습니다.')
    expect(result!.statistical).toBe('통계적으로 유의한 차이가 있습니다 (p=0.001).')
    expect(result!.practical).toBe('실질적 효과 크기는 큰 효과입니다.')
    expect(result).toMatchSnapshot()
  })

  it('Scenario 2: nonsignificant + small effect (purpose="비교")', () => {
    const result = getInterpretation(
      {
        method: 'Independent t-test',
        statistic: 1.2,
        pValue: 0.234,
        df: 98,
        effectSize: { value: 0.2, type: "Cohen's d" },
        groupStats: [
          { name: 'Control', mean: 50, std: 10, n: 50 },
          { name: 'Treatment', mean: 52, std: 11, n: 50 }
        ]
      } as AnalysisResult,
      '비교'
    )

    expect(result).not.toBeNull()
    expect(result!.title).toBe('그룹 비교 결과')
    expect(result!.summary).toBe('Control 평균(50.00)이 Treatment 평균(52.00)보다 2.00점 낮습니다.')
    expect(result!.statistical).toBe('통계적으로 유의한 차이가 없습니다 (p=0.234).')
    expect(result!.practical).toBe('실질적 효과 크기는 작은 효과입니다.')
    expect(result).toMatchSnapshot()
  })

  it('Scenario 3: boundary case p ≈ 0.05 (purpose="비교")', () => {
    const result = getInterpretation(
      {
        method: 'Independent t-test',
        statistic: 1.96,
        pValue: 0.048,
        df: 98,
        effectSize: { value: 0.5, type: "Cohen's d" },
        groupStats: [
          { name: 'Control', mean: 50, std: 10, n: 50 },
          { name: 'Treatment', mean: 55, std: 11, n: 50 }
        ]
      } as AnalysisResult,
      '비교'
    )

    expect(result).not.toBeNull()
    expect(result!.title).toBe('그룹 비교 결과')
    expect(result!.summary).toBe('Control 평균(50.00)이 Treatment 평균(55.00)보다 5.00점 낮습니다.')
    expect(result!.statistical).toBe('통계적으로 유의한 차이가 있습니다 (p=0.048).')
    expect(result!.practical).toBe('실질적 효과 크기는 중간 효과입니다.')
    expect(result).toMatchSnapshot()
  })
})

describe('Golden Snapshot: Correlation (Purpose-based)', () => {
  it('Scenario 1: strong positive correlation (purpose="상관")', () => {
    const result = getInterpretation(
      {
        method: 'Pearson Correlation',
        statistic: 0.85,
        pValue: 0.0001,
        additional: { rSquared: 0.7225 }
      } as AnalysisResult,
      '상관'  // purpose
    )

    expect(result).not.toBeNull()
    expect(result!.title).toBe('변수 간 관계 분석')
    expect(result!.summary).toBe('X가 증가할 때 Y는 함께 증가하는 경향이 있습니다 (r=0.850).')
    expect(result!.statistical).toBe('강한 양의 상관관계가 통계적으로 유의합니다 (p=< 0.001).')
    expect(result!.practical).toBe('상관계수 r=0.850 → X 변동의 약 72.2%가 Y 변동과 관련됩니다.')
    expect(result).toMatchSnapshot()
  })

  it('Scenario 2: weak negative correlation (purpose="상관")', () => {
    const result = getInterpretation(
      {
        method: 'Pearson Correlation',
        statistic: -0.25,
        pValue: 0.089,
        additional: { rSquared: 0.0625 }
      } as AnalysisResult,
      '상관'
    )

    expect(result).not.toBeNull()
    expect(result!.title).toBe('변수 간 관계 분석')
    expect(result!.summary).toBe('X가 증가할 때 Y는 반대로 감소하는 경향이 있습니다 (r=-0.250).')
    expect(result!.statistical).toBe('상관관계가 통계적으로 유의하지 않습니다 (p=0.089).')
    expect(result!.practical).toBe('상관계수 r=-0.250 → X 변동의 약 6.3%가 Y 변동과 관련됩니다.')
    expect(result).toMatchSnapshot()
  })

  it('Scenario 3: moderate positive correlation (purpose="상관")', () => {
    const result = getInterpretation(
      {
        method: 'Pearson Correlation',
        statistic: 0.45,
        pValue: 0.048,
        additional: { rSquared: 0.2025 }
      } as AnalysisResult,
      '상관'
    )

    expect(result).not.toBeNull()
    expect(result!.title).toBe('변수 간 관계 분석')
    expect(result!.summary).toBe('X가 증가할 때 Y는 함께 증가하는 경향이 있습니다 (r=0.450).')
    expect(result!.statistical).toBe('중간 양의 상관관계가 통계적으로 유의합니다 (p=0.048).')
    expect(result!.practical).toBe('상관계수 r=0.450 → X 변동의 약 20.3%가 Y 변동과 관련됩니다.')
    expect(result).toMatchSnapshot()
  })
})
