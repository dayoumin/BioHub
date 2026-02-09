/**
 * 익명화 vs 비익명화 비교 테스트 프레임워크
 *
 * 목적: 변수명 익명화가 LLM 추천 결과에 미치는 영향 분석
 */

import type { ValidationResults, AIRecommendation } from '@/types/smart-flow'
import { AnonymizationService } from '@/lib/services/anonymization'

/**
 * 비교 테스트 결과
 */
export interface ComparisonResult {
  scenario: string
  description: string

  // Case A: 원본 변수명
  withoutAnonymization: {
    prompt: string
    recommendation: AIRecommendation | null
    responseText: string
    variableNames: string[]
  }

  // Case B: 익명화된 변수명
  withAnonymization: {
    prompt: string
    recommendation: AIRecommendation | null
    responseText: string
    variableNames: string[]
    restoredRecommendation: AIRecommendation | null
  }

  // 비교 분석
  analysis: {
    methodDifference: boolean // 추천 방법이 다른가?
    methodIdA: string | null
    methodIdB: string | null
    reasoningDifference: string[] // 추론 이유 차이
    biasDetected: {
      hasVariableNameBias: boolean // 변수명 편향 감지
      biasDescription: string
    }
  }
}

/**
 * 프롬프트 생성기 (LLM 호출 시뮬레이션용)
 */
export class PromptGenerator {
  /**
   * ValidationResults를 프롬프트로 변환 (익명화 여부 선택)
   */
  static generatePrompt(
    validationResults: ValidationResults,
    anonymize: boolean
  ): { prompt: string; mapping?: ReturnType<typeof AnonymizationService.anonymize> } {
    if (!anonymize) {
      // Case A: 원본 변수명
      const columns = validationResults.columns || []
      const numericCols = columns.filter(c => c.type === 'numeric')
      const categoricalCols = columns.filter(c => c.type === 'categorical')

      let prompt = `## 데이터 요약\n`
      prompt += `- 전체: ${validationResults.totalRows}행 × ${columns.length}열\n`
      prompt += `- 수치형 변수 (${numericCols.length}개): ${numericCols.map(c => c.name).join(', ')}\n`
      prompt += `- 범주형 변수 (${categoricalCols.length}개): ${categoricalCols.map(c => c.name).join(', ')}\n\n`

      prompt += `## 변수 상세 통계\n`
      for (const col of columns) {
        if (col.type === 'numeric') {
          prompt += `- ${col.name}: 평균=${col.mean?.toFixed(2)}, 표준편차=${col.std?.toFixed(2)}\n`
        } else {
          const topCat = col.topCategories?.slice(0, 3).map(c => c.value).join(', ')
          prompt += `- ${col.name}: 범주형 (${topCat})\n`
        }
      }

      return { prompt }
    } else {
      // Case B: 익명화된 변수명
      const anonymized = AnonymizationService.anonymize(validationResults, 20)
      if (!anonymized) {
        return { prompt: '' }
      }

      const columns = anonymized.anonymized.columns || []
      const numericCols = columns.filter(c => c.type === 'numeric')
      const categoricalCols = columns.filter(c => c.type === 'categorical')

      let prompt = `## 데이터 요약\n`
      prompt += `- 전체: ${anonymized.anonymized.totalRows}행 × ${columns.length}열\n`
      prompt += `- 수치형 변수 (${numericCols.length}개): ${numericCols.map(c => c.name).join(', ')}\n`
      prompt += `- 범주형 변수 (${categoricalCols.length}개): ${categoricalCols.map(c => c.name).join(', ')}\n\n`

      prompt += `## 변수 상세 통계\n`
      for (const col of columns) {
        if (col.type === 'numeric') {
          prompt += `- ${col.name}: 평균=${col.mean?.toFixed(2)}, 표준편차=${col.std?.toFixed(2)}\n`
        } else {
          const topCat = col.topCategories?.slice(0, 3).map(c => c.value).join(', ')
          prompt += `- ${col.name}: 범주형 (${topCat})\n`
        }
      }

      return { prompt, mapping: anonymized }
    }
  }
}

/**
 * 비교 분석기
 */
export class ComparisonAnalyzer {
  /**
   * 두 추천 결과 비교
   */
  static compare(
    resultA: AIRecommendation | null,
    resultB: AIRecommendation | null,
    variableNamesA: string[],
    variableNamesB: string[]
  ): ComparisonResult['analysis'] {
    const methodDifference = resultA?.method.id !== resultB?.method.id

    // 변수명 편향 감지
    const biasDetected = this.detectVariableNameBias(
      resultA,
      resultB,
      variableNamesA,
      variableNamesB
    )

    // 추론 이유 차이 분석
    const reasoningDifference = this.analyzeReasoningDifference(
      resultA?.reasoning || [],
      resultB?.reasoning || []
    )

    return {
      methodDifference,
      methodIdA: resultA?.method.id || null,
      methodIdB: resultB?.method.id || null,
      reasoningDifference,
      biasDetected
    }
  }

  /**
   * 변수명 편향 감지
   */
  private static detectVariableNameBias(
    resultA: AIRecommendation | null,
    resultB: AIRecommendation | null,
    variableNamesA: string[],
    variableNamesB: string[]
  ): { hasVariableNameBias: boolean; biasDescription: string } {
    if (!resultA || !resultB) {
      return { hasVariableNameBias: false, biasDescription: 'N/A' }
    }

    // 추론에서 변수명 언급 빈도
    const mentionsA = this.countVariableMentions(resultA.reasoning, variableNamesA)
    const mentionsB = this.countVariableMentions(resultB.reasoning, variableNamesB)

    // 변수명이 추론의 주요 근거가 되었는지 확인
    const hasVariableNameBias = mentionsA > mentionsB * 1.5 // 1.5배 이상 차이

    let biasDescription = ''
    if (hasVariableNameBias) {
      biasDescription = `원본 변수명에서 ${mentionsA}회 언급 vs 익명화에서 ${mentionsB}회 언급. 변수명이 추론에 과도하게 영향을 미침.`
    } else if (resultA.method.id !== resultB.method.id) {
      biasDescription = `추천 방법이 다름 (${resultA.method.id} vs ${resultB.method.id}). 변수명이 방법 선택에 영향을 미쳤을 가능성.`
    } else {
      biasDescription = '변수명 편향 없음. 통계적 특성만으로 판단.'
    }

    return { hasVariableNameBias, biasDescription }
  }

  /**
   * 변수명 언급 횟수 계산
   */
  private static countVariableMentions(reasoning: string[], variableNames: string[]): number {
    let count = 0
    for (const reason of reasoning) {
      for (const varName of variableNames) {
        if (reason.includes(varName)) {
          count++
        }
      }
    }
    return count
  }

  /**
   * 추론 이유 차이 분석
   */
  private static analyzeReasoningDifference(
    reasoningA: string[],
    reasoningB: string[]
  ): string[] {
    const differences: string[] = []

    // 추론 개수 차이
    if (reasoningA.length !== reasoningB.length) {
      differences.push(`추론 개수 차이: ${reasoningA.length} vs ${reasoningB.length}`)
    }

    // 키워드 차이 분석
    const keywordsA = this.extractKeywords(reasoningA)
    const keywordsB = this.extractKeywords(reasoningB)

    const uniqueToA = keywordsA.filter(k => !keywordsB.includes(k))
    const uniqueToB = keywordsB.filter(k => !keywordsA.includes(k))

    if (uniqueToA.length > 0) {
      differences.push(`원본만 언급: ${uniqueToA.join(', ')}`)
    }
    if (uniqueToB.length > 0) {
      differences.push(`익명화만 언급: ${uniqueToB.join(', ')}`)
    }

    return differences
  }

  /**
   * 키워드 추출
   */
  private static extractKeywords(reasoning: string[]): string[] {
    const keywords: string[] = []
    const patterns = [
      /정규분포/g,
      /등분산/g,
      /독립/g,
      /종속/g,
      /상관/g,
      /회귀/g,
      /그룹/g,
      /비교/g
    ]

    for (const reason of reasoning) {
      for (const pattern of patterns) {
        if (pattern.test(reason)) {
          const match = pattern.source.replace(/\//g, '')
          if (!keywords.includes(match)) {
            keywords.push(match)
          }
        }
      }
    }

    return keywords
  }
}

/**
 * 리포트 생성기
 */
export class ComparisonReportGenerator {
  /**
   * Markdown 리포트 생성
   */
  static generateMarkdown(results: ComparisonResult[]): string {
    let report = '# 익명화 vs 비익명화 비교 테스트 리포트\n\n'
    report += `**테스트 일시**: ${new Date().toLocaleString('ko-KR')}\n\n`
    report += `**테스트 시나리오 수**: ${results.length}개\n\n`

    report += '## 📊 요약\n\n'
    const totalScenarios = results.length
    const biasDetected = results.filter(r => r.analysis.biasDetected.hasVariableNameBias).length
    const methodDifference = results.filter(r => r.analysis.methodDifference).length

    report += `- 전체 시나리오: ${totalScenarios}개\n`
    report += `- 변수명 편향 감지: ${biasDetected}개 (${(biasDetected / totalScenarios * 100).toFixed(1)}%)\n`
    report += `- 추천 방법 차이: ${methodDifference}개 (${(methodDifference / totalScenarios * 100).toFixed(1)}%)\n\n`

    report += '## 🔬 시나리오별 상세 결과\n\n'

    for (const result of results) {
      report += `### ${result.scenario}\n\n`
      report += `**설명**: ${result.description}\n\n`

      report += `#### Case A: 원본 변수명\n`
      report += `- 변수명: ${result.withoutAnonymization.variableNames.join(', ')}\n`
      report += `- 추천 방법: ${result.withoutAnonymization.recommendation?.method.id || 'N/A'}\n`
      report += `- 추론 이유:\n`
      for (const reason of result.withoutAnonymization.recommendation?.reasoning || []) {
        report += `  - ${reason}\n`
      }
      report += `\n`

      report += `#### Case B: 익명화된 변수명\n`
      report += `- 변수명: ${result.withAnonymization.variableNames.join(', ')}\n`
      report += `- 추천 방법: ${result.withAnonymization.recommendation?.method.id || 'N/A'}\n`
      report += `- 추론 이유:\n`
      for (const reason of result.withAnonymization.recommendation?.reasoning || []) {
        report += `  - ${reason}\n`
      }
      report += `\n`

      report += `#### 분석 결과\n`
      report += `- 추천 방법 차이: ${result.analysis.methodDifference ? '❌ 다름' : '✅ 동일'}\n`
      report += `- 변수명 편향: ${result.analysis.biasDetected.hasVariableNameBias ? '❌ 감지됨' : '✅ 없음'}\n`
      report += `- 설명: ${result.analysis.biasDetected.biasDescription}\n\n`

      if (result.analysis.reasoningDifference.length > 0) {
        report += `**추론 차이**:\n`
        for (const diff of result.analysis.reasoningDifference) {
          report += `- ${diff}\n`
        }
        report += `\n`
      }

      report += '---\n\n'
    }

    return report
  }
}
