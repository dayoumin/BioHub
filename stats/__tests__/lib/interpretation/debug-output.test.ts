/**
 * Debug: 실제 해석 엔진 출력 확인용 테스트
 */

import { describe, it } from 'vitest'
import { getInterpretation } from '@/lib/interpretation/engine'
import type { AnalysisResult } from '@/types/smart-flow'

describe('Debug: 실제 출력 확인', () => {
  it('ANOVA 실제 출력', () => {
    const result = getInterpretation({
      method: 'One-way ANOVA',
      statistic: 15.3,
      pValue: 0.0001,
      interpretation: 'Test interpretation',
      df: 2,
      effectSize: { value: 0.15, type: 'Eta-squared' },
      groupStats: [
        { name: 'Group A', mean: 45, std: 8, n: 30 },
        { name: 'Group B', mean: 52, std: 9, n: 30 },
        { name: 'Group C', mean: 58, std: 10, n: 30 }
      ]
    } as AnalysisResult)

    console.log('=== ANOVA 실제 출력 ===')
    console.log(JSON.stringify(result, null, 2))
  })

  it('Correlation 실제 출력 (purpose 없음)', () => {
    const result = getInterpretation({
      method: 'Pearson Correlation',
      statistic: 0.85,
      pValue: 0.0001,
      interpretation: 'Test interpretation',
      additional: { rSquared: 0.7225 }
    } as AnalysisResult)

    console.log('=== Correlation 실제 출력 (purpose 없음) ===')
    console.log(JSON.stringify(result, null, 2))
  })

  it('t-test 실제 출력 (purpose 없음)', () => {
    const result = getInterpretation({
      method: 'Independent t-test',
      statistic: 3.45,
      pValue: 0.001,
      interpretation: 'Test interpretation',
      df: 98,
      effectSize: { value: 0.8, type: "Cohen's d" },
      groupStats: [
        { name: 'Control', mean: 50, std: 10, n: 50 },
        { name: 'Treatment', mean: 58, std: 12, n: 50 }
      ]
    } as AnalysisResult)

    console.log('=== t-test 실제 출력 (purpose 없음) ===')
    console.log(JSON.stringify(result, null, 2))
  })

  it('Mann-Whitney 실제 출력 - Scenario 1 (significant)', () => {
    const result = getInterpretation({
      method: 'Mann-Whitney U Test',
      statistic: 350,
      pValue: 0.012,
      interpretation: 'Test interpretation',
      groupStats: [
        { name: 'Group A', mean: 50, std: 10, n: 30 },
        { name: 'Group B', mean: 58, std: 12, n: 30 }
      ]
    } as AnalysisResult)

    console.log('=== Mann-Whitney Scenario 1 (significant) ===')
    console.log(JSON.stringify(result, null, 2))
  })

  it('Mann-Whitney 실제 출력 - Scenario 2 (nonsignificant)', () => {
    const result = getInterpretation({
      method: 'Mann-Whitney U Test',
      statistic: 420,
      pValue: 0.234,
      interpretation: 'Test interpretation',
      groupStats: [
        { name: 'Group A', mean: 50, std: 10, n: 30 },
        { name: 'Group B', mean: 52, std: 11, n: 30 }
      ]
    } as AnalysisResult)

    console.log('=== Mann-Whitney Scenario 2 (nonsignificant) ===')
    console.log(JSON.stringify(result, null, 2))
  })

  it('Mann-Whitney 실제 출력 - Scenario 3 (boundary)', () => {
    const result = getInterpretation({
      method: 'Mann-Whitney U Test',
      statistic: 380,
      pValue: 0.048,
      interpretation: 'Test interpretation',
      groupStats: [
        { name: 'Group A', mean: 50, std: 10, n: 30 },
        { name: 'Group B', mean: 55, std: 11, n: 30 }
      ]
    } as AnalysisResult)

    console.log('=== Mann-Whitney Scenario 3 (boundary) ===')
    console.log(JSON.stringify(result, null, 2))
  })

  // Wilcoxon Signed-Rank Test
  it('Wilcoxon 실제 출력 - Scenario 1 (significant)', () => {
    const result = getInterpretation({
      method: 'Wilcoxon Signed-Rank Test',
      statistic: 120,
      pValue: 0.008,
      interpretation: 'Test interpretation'} as AnalysisResult)

    console.log('=== Wilcoxon Scenario 1 (significant) ===')
    console.log(JSON.stringify(result, null, 2))
  })

  it('Wilcoxon 실제 출력 - Scenario 2 (nonsignificant)', () => {
    const result = getInterpretation({
      method: 'Wilcoxon Signed-Rank Test',
      statistic: 180,
      pValue: 0.421,
      interpretation: 'Test interpretation'} as AnalysisResult)

    console.log('=== Wilcoxon Scenario 2 (nonsignificant) ===')
    console.log(JSON.stringify(result, null, 2))
  })

  it('Wilcoxon 실제 출력 - Scenario 3 (boundary)', () => {
    const result = getInterpretation({
      method: 'Wilcoxon Signed-Rank Test',
      statistic: 145,
      pValue: 0.049,
      interpretation: 'Test interpretation'} as AnalysisResult)

    console.log('=== Wilcoxon Scenario 3 (boundary) ===')
    console.log(JSON.stringify(result, null, 2))
  })

  it('Kruskal-Wallis 실제 출력 - Scenario 1 (significant)', () => {
    const result = getInterpretation({
      method: 'Kruskal-Wallis Test',
      statistic: 10.5,
      pValue: 0.003,
      interpretation: 'Test interpretation'} as AnalysisResult)

    console.log('=== Kruskal-Wallis Scenario 1 (significant) ===')
    console.log(JSON.stringify(result, null, 2))
  })

  it('Linear Regression 실제 출력 - Scenario 1 (significant)', () => {
    const result = getInterpretation({
      method: 'Linear Regression',
      statistic: 10.5,
      pValue: 0.001,
      interpretation: 'Test interpretation',
      additional: { rSquared: 0.75 }
    } as AnalysisResult)

    console.log('=== Linear Regression Scenario 1 (significant) ===')
    console.log(JSON.stringify(result, null, 2))
  })

  it('Logistic Regression 실제 출력 - Scenario 1 (significant)', () => {
    const result = getInterpretation({
      method: 'Logistic Regression',
      statistic: 8.5,
      pValue: 0.002,
      interpretation: 'Test interpretation',
      additional: { pseudoRSquared: 0.42 }
    } as AnalysisResult)

    console.log('=== Logistic Regression Scenario 1 (significant) ===')
    console.log(JSON.stringify(result, null, 2))
  })

  it('Chi-Square 실제 출력 - Scenario 1 (significant)', () => {
    const result = getInterpretation({
      method: 'Chi-Square Test',
      statistic: 25.3,
      pValue: 0.0001,
      interpretation: 'Test interpretation',
      df: 4,
      effectSize: { value: 0.35, type: "Cramer's V" }
    } as AnalysisResult)

    console.log('=== Chi-Square Scenario 1 (significant) ===')
    console.log(JSON.stringify(result, null, 2))
  })

  it('Friedman 실제 출력 - Scenario 1 (significant)', () => {
    const result = getInterpretation({
      method: 'Friedman Test',
      statistic: 12.8,
      pValue: 0.002,
      interpretation: 'Test interpretation'} as AnalysisResult)

    console.log('=== Friedman Scenario 1 (significant) ===')
    console.log(JSON.stringify(result, null, 2))
  })

  it('ANOVA 실제 출력 - Scenario 2 (nonsignificant)', () => {
    const result = getInterpretation({
      method: 'One-way ANOVA',
      statistic: 1.8,
      pValue: 0.172,
      interpretation: 'Test interpretation',
      df: 2,
      effectSize: { value: 0.02, type: 'Eta-squared' },
      groupStats: [
        { name: 'Group A', mean: 50, std: 10, n: 30 },
        { name: 'Group B', mean: 52, std: 11, n: 30 },
        { name: 'Group C', mean: 51, std: 9, n: 30 }
      ]
    } as AnalysisResult)

    console.log('=== ANOVA Scenario 2 (nonsignificant) ===')
    console.log(JSON.stringify(result, null, 2))
  })

  it('Linear Regression 실제 출력 (purpose="예측")', () => {
    const result = getInterpretation({
      method: 'Linear Regression',
      statistic: 10.5,
      pValue: 0.001,
      interpretation: 'Test interpretation',
      additional: { rSquared: 0.75 },
      coefficients: [
        { name: 'Intercept', value: 10.0, stdError: 1.0, tValue: 10, pvalue: 0.001 },
        { name: 'X', value: 2.5, stdError: 0.5, tValue: 5, pvalue: 0.001 }
      ]
    } as AnalysisResult, '예측')

    console.log('=== Linear Regression (purpose="예측") ===')
    console.log(JSON.stringify(result, null, 2))
  })

  it('McNemar 실제 출력 - Scenario 1', () => {
    const result = getInterpretation({
      method: 'McNemar Test',
      statistic: 8.5,
      pValue: 0.005,
      interpretation: 'Test interpretation',
      df: 1
    } as AnalysisResult)

    console.log('=== McNemar Scenario 1 ===')
    console.log(JSON.stringify(result, null, 2))
  })

  it('Shapiro-Wilk 실제 출력 - Scenario 1', () => {
    const result = getInterpretation({
      method: 'Shapiro-Wilk Test',
      statistic: 0.92,
      pValue: 0.003,
      interpretation: 'Test interpretation'} as AnalysisResult)

    console.log('=== Shapiro-Wilk Scenario 1 ===')
    console.log(JSON.stringify(result, null, 2))
  })

  it('t-test 실제 출력 (purpose="비교") - Scenario 1', () => {
    const result = getInterpretation({
      method: 'Independent t-test',
      statistic: 3.45,
      pValue: 0.001,
      interpretation: 'Test interpretation',
      df: 98,
      effectSize: { value: 0.8, type: "Cohen's d" },
      groupStats: [
        { name: 'Control', mean: 50, std: 10, n: 50 },
        { name: 'Treatment', mean: 58, std: 12, n: 50 }
      ]
    } as AnalysisResult, '비교')

    console.log('=== t-test (purpose="비교") Scenario 1 ===')
    console.log(JSON.stringify(result, null, 2))
  })
})
