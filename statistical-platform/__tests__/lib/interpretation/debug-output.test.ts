/**
 * Debug: 실제 해석 엔진 출력 확인용 테스트
 */

import { describe, it } from '@jest/globals'
import { getInterpretation } from '@/lib/interpretation/engine'
import type { AnalysisResult } from '@/types/smart-flow'

describe('Debug: 실제 출력 확인', () => {
  it('ANOVA 실제 출력', () => {
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

    console.log('=== ANOVA 실제 출력 ===')
    console.log(JSON.stringify(result, null, 2))
  })

  it('Correlation 실제 출력 (purpose 없음)', () => {
    const result = getInterpretation({
      method: 'Pearson Correlation',
      statistic: 0.85,
      pValue: 0.0001,
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
      pValue: 0.008
    } as AnalysisResult)

    console.log('=== Wilcoxon Scenario 1 (significant) ===')
    console.log(JSON.stringify(result, null, 2))
  })

  it('Wilcoxon 실제 출력 - Scenario 2 (nonsignificant)', () => {
    const result = getInterpretation({
      method: 'Wilcoxon Signed-Rank Test',
      statistic: 180,
      pValue: 0.421
    } as AnalysisResult)

    console.log('=== Wilcoxon Scenario 2 (nonsignificant) ===')
    console.log(JSON.stringify(result, null, 2))
  })

  it('Wilcoxon 실제 출력 - Scenario 3 (boundary)', () => {
    const result = getInterpretation({
      method: 'Wilcoxon Signed-Rank Test',
      statistic: 145,
      pValue: 0.049
    } as AnalysisResult)

    console.log('=== Wilcoxon Scenario 3 (boundary) ===')
    console.log(JSON.stringify(result, null, 2))
  })
})
