/**
 * 익명화 vs 비익명화 비교 테스트
 *
 * 다양한 시나리오에서 변수명이 LLM 추천에 미치는 영향 분석
 */

import { describe, it, expect } from 'vitest'
import type { ValidationResults, ColumnStatistics, AIRecommendation } from '@/types/smart-flow'
import { PromptGenerator, ComparisonAnalyzer, ComparisonReportGenerator, type ComparisonResult } from './comparison-framework'

describe('익명화 vs 비익명화 비교 테스트', () => {
  const comparisonResults: ComparisonResult[] = []

  /**
   * 시뮬레이션된 LLM 응답 생성 (실제 호출 없이 테스트)
   */
  function simulateLLMResponse(prompt: string, variableNames: string[]): {
    recommendation: AIRecommendation
    responseText: string
  } {
    // 변수명에서 편향 감지
    const hasIncome = variableNames.some(v => v.toLowerCase().includes('income') || v.toLowerCase().includes('salary'))
    const hasBeforeAfter = variableNames.includes('before') && variableNames.includes('after')
    const hasAge = variableNames.some(v => v.toLowerCase().includes('age') || v.includes('나이'))

    let methodId = 't-test'
    let reasoning: string[] = []

    // 편향된 추론 (변수명 기반)
    if (hasIncome && !variableNames[0].startsWith('Var')) {
      methodId = 'linear-regression'
      reasoning = [
        `${variableNames.find(v => v.toLowerCase().includes('income') || v.toLowerCase().includes('salary'))} 변수명으로 보아 회귀분석이 적합합니다.`,
        '수입/급여는 일반적으로 종속변수로 사용됩니다.',
        '예측 모델링이 목적으로 추정됩니다.'
      ]
    } else if (hasBeforeAfter && !variableNames[0].startsWith('Var')) {
      methodId = 'paired-t-test'
      reasoning = [
        'before와 after 변수명으로 보아 대응표본입니다.',
        '동일 대상의 사전-사후 측정으로 판단됩니다.',
        '대응표본 t-test가 적합합니다.'
      ]
    } else if (hasAge && !variableNames[0].startsWith('Var')) {
      methodId = 'correlation'
      reasoning = [
        `${variableNames.find(v => v.toLowerCase().includes('age') || v.includes('나이'))} 변수는 연속형 공변량으로 적합합니다.`,
        '나이와 다른 변수 간 상관분석을 권장합니다.'
      ]
    } else {
      // 객관적 추론 (통계적 특성 기반)
      methodId = 't-test'
      reasoning = [
        '두 변수의 통계적 특성을 분석했습니다.',
        '변수 1은 정규분포를 따르는 것으로 보입니다.',
        '변수 2는 2개 그룹으로 구성되어 있습니다.',
        '독립표본 t-test가 적합합니다.'
      ]
    }

    const recommendation: AIRecommendation = {
      method: {
        id: methodId,
        name: methodId === 'linear-regression' ? '선형회귀분석' :
              methodId === 'paired-t-test' ? '대응표본 t-검정' :
              methodId === 'correlation' ? '상관분석' : '독립표본 t-검정',
        description: reasoning[0],
        category: methodId.includes('regression') ? 'regression' :
                  methodId.includes('t-test') ? 't-test' :
                  methodId.includes('correlation') ? 'correlation' : 't-test'
      },
      confidence: 0.85,
      reasoning,
      assumptions: [],
      alternatives: []
    }

    return {
      recommendation,
      responseText: reasoning.join(' ')
    }
  }

  it('[시나리오 A] 편향 유도 변수명: income vs Var1', () => {
    const scenario = 'Scenario A: 편향 유도 변수명'
    const description = 'income, salary 같은 변수명이 LLM 추천에 미치는 영향'

    // 원본 데이터
    const originalData: Partial<ValidationResults> & { columns: ColumnStatistics[] } = {
      isValid: true,
      totalRows: 100,
      columns: [
        {
          name: 'income',
          type: 'numeric',
          mean: 55000,
          std: 15000,
          min: 20000,
          max: 120000,
          skewness: 0.5,
          uniqueValues: 87,
          missingCount: 0
        },
        {
          name: 'education',
          type: 'categorical',
          uniqueValues: 4,
          missingCount: 0,
          topCategories: [
            { value: 'High School', count: 30 },
            { value: 'Bachelor', count: 40 },
            { value: 'Master', count: 20 },
            { value: 'PhD', count: 10 }
          ]
        }
      ] as ColumnStatistics[]
    }

    // Case A: 원본 변수명
    const promptA = PromptGenerator.generatePrompt(originalData as ValidationResults, false)
    const responseA = simulateLLMResponse(promptA.prompt, ['income', 'education'])

    // Case B: 익명화
    const promptB = PromptGenerator.generatePrompt(originalData as ValidationResults, true)
    const responseB = simulateLLMResponse(promptB.prompt, ['Var1', 'Var2'])

    // 분석
    const analysis = ComparisonAnalyzer.compare(
      responseA.recommendation,
      responseB.recommendation,
      ['income', 'education'],
      ['Var1', 'Var2']
    )

    const result: ComparisonResult = {
      scenario,
      description,
      withoutAnonymization: {
        prompt: promptA.prompt,
        recommendation: responseA.recommendation,
        responseText: responseA.responseText,
        variableNames: ['income', 'education']
      },
      withAnonymization: {
        prompt: promptB.prompt,
        recommendation: responseB.recommendation,
        responseText: responseB.responseText,
        variableNames: ['Var1', 'Var2'],
        restoredRecommendation: responseB.recommendation
      },
      analysis
    }

    comparisonResults.push(result)

    // 검증: 추천 방법이 다를 것으로 예상
    expect(analysis.methodDifference).toBe(true)
    expect(analysis.methodIdA).toBe('linear-regression') // 변수명 편향
    expect(analysis.methodIdB).toBe('t-test') // 객관적 판단
    expect(analysis.biasDetected.hasVariableNameBias).toBe(true)
  })

  it('[시나리오 B] 대응표본 힌트: before/after vs Var1/Var2', () => {
    const scenario = 'Scenario B: 대응표본 힌트'
    const description = 'before, after 변수명이 대응표본 추론에 미치는 영향'

    const originalData: Partial<ValidationResults> & { columns: ColumnStatistics[] } = {
      isValid: true,
      totalRows: 50,
      columns: [
        {
          name: 'before',
          type: 'numeric',
          mean: 72.3,
          std: 8.5,
          min: 55,
          max: 90,
          skewness: 0.2,
          uniqueValues: 45,
          missingCount: 0
        },
        {
          name: 'after',
          type: 'numeric',
          mean: 78.5,
          std: 7.2,
          min: 62,
          max: 95,
          skewness: -0.1,
          uniqueValues: 43,
          missingCount: 0
        }
      ] as ColumnStatistics[]
    }

    const promptA = PromptGenerator.generatePrompt(originalData as ValidationResults, false)
    const responseA = simulateLLMResponse(promptA.prompt, ['before', 'after'])

    const promptB = PromptGenerator.generatePrompt(originalData as ValidationResults, true)
    const responseB = simulateLLMResponse(promptB.prompt, ['Var1', 'Var2'])

    const analysis = ComparisonAnalyzer.compare(
      responseA.recommendation,
      responseB.recommendation,
      ['before', 'after'],
      ['Var1', 'Var2']
    )

    const result: ComparisonResult = {
      scenario,
      description,
      withoutAnonymization: {
        prompt: promptA.prompt,
        recommendation: responseA.recommendation,
        responseText: responseA.responseText,
        variableNames: ['before', 'after']
      },
      withAnonymization: {
        prompt: promptB.prompt,
        recommendation: responseB.recommendation,
        responseText: responseB.responseText,
        variableNames: ['Var1', 'Var2'],
        restoredRecommendation: responseB.recommendation
      },
      analysis
    }

    comparisonResults.push(result)

    // 검증: 원본은 대응표본, 익명화는 독립표본으로 추천할 가능성
    expect(analysis.methodDifference).toBe(true)
    expect(analysis.methodIdA).toBe('paired-t-test')
    expect(analysis.methodIdB).toBe('t-test')
  })

  it('[시나리오 C] 한글 변수명: 나이 vs Var1', () => {
    const scenario = 'Scenario C: 한글 변수명'
    const description = '한글 변수명이 추론에 미치는 영향'

    const originalData: Partial<ValidationResults> & { columns: ColumnStatistics[] } = {
      isValid: true,
      totalRows: 80,
      columns: [
        {
          name: '나이',
          type: 'numeric',
          mean: 45.5,
          std: 12.3,
          min: 20,
          max: 80,
          skewness: 0.1,
          uniqueValues: 60,
          missingCount: 0
        },
        {
          name: '혈압',
          type: 'numeric',
          mean: 125.3,
          std: 18.5,
          min: 90,
          max: 170,
          skewness: 0.5,
          uniqueValues: 65,
          missingCount: 2
        }
      ] as ColumnStatistics[]
    }

    const promptA = PromptGenerator.generatePrompt(originalData as ValidationResults, false)
    const responseA = simulateLLMResponse(promptA.prompt, ['나이', '혈압'])

    const promptB = PromptGenerator.generatePrompt(originalData as ValidationResults, true)
    const responseB = simulateLLMResponse(promptB.prompt, ['Var1', 'Var2'])

    const analysis = ComparisonAnalyzer.compare(
      responseA.recommendation,
      responseB.recommendation,
      ['나이', '혈압'],
      ['Var1', 'Var2']
    )

    const result: ComparisonResult = {
      scenario,
      description,
      withoutAnonymization: {
        prompt: promptA.prompt,
        recommendation: responseA.recommendation,
        responseText: responseA.responseText,
        variableNames: ['나이', '혈압']
      },
      withAnonymization: {
        prompt: promptB.prompt,
        recommendation: responseB.recommendation,
        responseText: responseB.responseText,
        variableNames: ['Var1', 'Var2'],
        restoredRecommendation: responseB.recommendation
      },
      analysis
    }

    comparisonResults.push(result)

    // 한글 변수명도 편향을 유발할 수 있음
    expect(analysis.methodIdA).toBe('correlation') // 나이 → 상관분석
    expect(analysis.methodIdB).toBe('t-test') // 객관적 판단
  })

  it('[시나리오 D] 중립적 변수명: x1/x2 vs Var1/Var2', () => {
    const scenario = 'Scenario D: 중립적 변수명'
    const description = '중립적 변수명은 익명화와 유사한 효과'

    const originalData: Partial<ValidationResults> & { columns: ColumnStatistics[] } = {
      isValid: true,
      totalRows: 100,
      columns: [
        {
          name: 'x1',
          type: 'numeric',
          mean: 50,
          std: 10,
          min: 20,
          max: 80,
          skewness: 0,
          uniqueValues: 60,
          missingCount: 0
        },
        {
          name: 'x2',
          type: 'numeric',
          mean: 55,
          std: 12,
          min: 25,
          max: 85,
          skewness: 0.1,
          uniqueValues: 65,
          missingCount: 0
        }
      ] as ColumnStatistics[]
    }

    const promptA = PromptGenerator.generatePrompt(originalData as ValidationResults, false)
    const responseA = simulateLLMResponse(promptA.prompt, ['x1', 'x2'])

    const promptB = PromptGenerator.generatePrompt(originalData as ValidationResults, true)
    const responseB = simulateLLMResponse(promptB.prompt, ['Var1', 'Var2'])

    const analysis = ComparisonAnalyzer.compare(
      responseA.recommendation,
      responseB.recommendation,
      ['x1', 'x2'],
      ['Var1', 'Var2']
    )

    const result: ComparisonResult = {
      scenario,
      description,
      withoutAnonymization: {
        prompt: promptA.prompt,
        recommendation: responseA.recommendation,
        responseText: responseA.responseText,
        variableNames: ['x1', 'x2']
      },
      withAnonymization: {
        prompt: promptB.prompt,
        recommendation: responseB.recommendation,
        responseText: responseB.responseText,
        variableNames: ['Var1', 'Var2'],
        restoredRecommendation: responseB.recommendation
      },
      analysis
    }

    comparisonResults.push(result)

    // 검증: 중립적 변수명은 추천이 동일할 것으로 예상
    expect(analysis.methodDifference).toBe(false)
    expect(analysis.biasDetected.hasVariableNameBias).toBe(false)
  })

  it('비교 리포트 생성', () => {
    const report = ComparisonReportGenerator.generateMarkdown(comparisonResults)

    // 리포트 파일로 저장
    console.log('\n' + '='.repeat(80))
    console.log('📊 익명화 vs 비익명화 비교 리포트')
    console.log('='.repeat(80))
    console.log(report)
    console.log('='.repeat(80))

    // 검증
    expect(report).toContain('익명화 vs 비익명화 비교 테스트 리포트')
    expect(report).toContain('Scenario A')
    expect(report).toContain('Scenario B')
    expect(report).toContain('Scenario C')
    expect(report).toContain('Scenario D')
    expect(comparisonResults).toHaveLength(4)
  })
})
