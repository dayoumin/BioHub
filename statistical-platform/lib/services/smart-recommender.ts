/**
 * 스마트 통계 방법 추천 시스템
 * 키워드 + 데이터 특성 + 신뢰도 점수 기반
 */

import { StatisticalMethod } from '@/types/smart-flow'

interface RecommendationResult {
  methods: StatisticalMethod[]
  confidence: 'high' | 'medium' | 'low'
  warnings: string[]
  alternativeSuggestion?: string
}

interface AnalysisContext {
  purposeText: string
  dataShape: {
    rows: number
    columns: number
    columnTypes: ('numeric' | 'categorical' | 'datetime' | 'text')[]
    columnNames: string[]
  }
  dataQuality: {
    missingRatio: number
    outlierRatio: number
    isNormallyDistributed?: boolean
    isHomoscedastic?: boolean
  }
}

export class SmartRecommender {
  /**
   * 메인 추천 함수 - 다층 분석 수행
   */
  static recommend(context: AnalysisContext): RecommendationResult {
    const result: RecommendationResult = {
      methods: [],
      confidence: 'low',
      warnings: [],
      alternativeSuggestion: undefined
    }

    // 1단계: 텍스트 명확성 검사
    const clarity = this.assessTextClarity(context.purposeText)
    
    if (clarity.score < 0.3) {
      result.warnings.push('입력하신 분석 목적이 모호합니다. 더 구체적으로 작성해주세요.')
      result.alternativeSuggestion = this.suggestClarification(context)
      result.confidence = 'low'
    }

    // 2단계: 모순 검사
    const contradictions = this.detectContradictions(context)
    if (contradictions.length > 0) {
      result.warnings.push(...contradictions)
    }

    // 3단계: 데이터-목적 일치성 검사
    const compatibility = this.checkDataPurposeCompatibility(context)
    if (!compatibility.isCompatible) {
      result.warnings.push(compatibility.reason)
      result.confidence = 'low'
    }

    // 4단계: 실제 추천
    const recommendations = this.generateRecommendations(context)
    result.methods = recommendations.methods
    
    // 5단계: 신뢰도 계산
    result.confidence = this.calculateConfidence(
      clarity.score,
      contradictions.length,
      compatibility.score,
      recommendations.matchScore
    )

    // 6단계: 대안 제시
    if (result.confidence === 'low') {
      result.alternativeSuggestion = this.generateAlternative(context)
    }

    return result
  }

  /**
   * 텍스트 명확성 평가
   */
  private static assessTextClarity(text: string): { score: number; issues: string[] } {
    const issues: string[] = []
    let score = 1.0

    // 너무 짧은 텍스트
    if (text.length < 10) {
      issues.push('텍스트가 너무 짧습니다')
      score -= 0.5
    }

    // 모호한 표현들
    const vagueTerms = ['이거', '그거', '저거', '뭔가', '좀', '대충', '그냥']
    const foundVague = vagueTerms.filter(term => text.includes(term))
    if (foundVague.length > 0) {
      issues.push(`모호한 표현 발견: ${foundVague.join(', ')}`)
      score -= 0.2 * foundVague.length
    }

    // 질문 형식이 아닌 경우
    const hasQuestionWords = ['차이', '관계', '영향', '비교', '변화', '효과'].some(
      word => text.includes(word)
    )
    if (!hasQuestionWords) {
      issues.push('분석 목적이 불명확합니다')
      score -= 0.3
    }

    return { score: Math.max(0, score), issues }
  }

  /**
   * 모순 검출
   */
  private static detectContradictions(context: AnalysisContext): string[] {
    const contradictions: string[] = []
    const text = context.purposeText.toLowerCase()

    // 예시: 두 그룹 비교인데 데이터가 하나뿐
    if (text.includes('두') || text.includes('비교') || text.includes('그룹') || text.includes('집단')) {
      const categoricalCols = context.dataShape.columnTypes.filter(t => t === 'categorical')
      if (categoricalCols.length === 0) {
        contradictions.push('그룹 비교를 원하시나 범주형 변수가 없습니다.')
      }
    }

    // 예시: 상관분석인데 변수가 하나
    if (text.includes('상관') || text.includes('관계')) {
      const numericCols = context.dataShape.columnTypes.filter(t => t === 'numeric')
      if (numericCols.length < 2) {
        contradictions.push('상관분석에는 최소 2개의 수치형 변수가 필요합니다.')
      }
    }

    // 예시: 시계열 분석인데 시간 변수 없음
    if (text.includes('시간') || text.includes('추세') || text.includes('변화')) {
      const hasDateTime = context.dataShape.columnTypes.includes('datetime')
      if (!hasDateTime && !text.includes('전후')) {
        contradictions.push('시간 분석을 원하시나 날짜/시간 변수가 없습니다.')
      }
    }

    return contradictions
  }

  /**
   * 데이터-목적 호환성 검사
   */
  private static checkDataPurposeCompatibility(
    context: AnalysisContext
  ): { isCompatible: boolean; score: number; reason: string } {
    const { dataShape, dataQuality } = context
    
    // 샘플 크기 검사
    if (dataShape.rows < 5) {
      return {
        isCompatible: false,
        score: 0,
        reason: '데이터가 너무 적습니다 (최소 5개 이상 필요)'
      }
    }

    // 결측값 비율 검사
    if (dataQuality.missingRatio > 0.5) {
      return {
        isCompatible: false,
        score: 0.3,
        reason: '결측값이 50% 이상입니다. 데이터 정제가 필요합니다.'
      }
    }

    // 정규성 검사 (t-test 관련)
    if (context.purposeText.includes('t검정') || context.purposeText.includes('평균')) {
      if (dataShape.rows < 30 && !dataQuality.isNormallyDistributed) {
        return {
          isCompatible: true,
          score: 0.7,
          reason: '샘플이 작고 정규분포가 아닙니다. 비모수 검정을 고려하세요.'
        }
      }
    }

    return { isCompatible: true, score: 1.0, reason: '' }
  }

  /**
   * 실제 추천 생성
   */
  private static generateRecommendations(
    context: AnalysisContext
  ): { methods: StatisticalMethod[]; matchScore: number } {
    const methods: StatisticalMethod[] = []
    let matchScore = 0

    // 키워드 매칭 로직
    const text = context.purposeText.toLowerCase()

    // 기술통계 키워드
    if (text.includes('기술') || text.includes('요약') || text.includes('분포')) {
      methods.push({ id: 'descriptive-stats', name: '기술통계', description: '데이터 요약 통계', category: 'descriptive' })
      matchScore += 0.3
    }

    // 상관분석 키워드
    if (text.includes('상관') || text.includes('관계') || text.includes('연관')) {
      methods.push({ id: 'pearson-correlation', name: '상관분석', description: '변수 간 상관관계', category: 'regression' })
      matchScore += 0.3
    }

    // 회귀분석 키워드
    if (text.includes('회귀') || text.includes('예측') || text.includes('영향')) {
      methods.push({ id: 'simple-regression', name: '회귀분석', description: '변수 간 인과관계', category: 'regression' })
      matchScore += 0.3
    }

    // t-검정 키워드
    if (text.includes('t검정') || text.includes('두 그룹') || text.includes('평균 비교')) {
      methods.push({ id: 'two-sample-t', name: 't-검정', description: '두 그룹 평균 비교', category: 't-test' })
      matchScore += 0.3
    }

    // ANOVA 키워드
    if (text.includes('분산분석') || text.includes('anova') || text.includes('세 그룹') || text.includes('여러 그룹')) {
      methods.push({ id: 'one-way-anova', name: 'ANOVA', description: '다중 그룹 비교', category: 'anova' })
      matchScore += 0.3
    }

    // 카이제곱 키워드
    if (text.includes('카이') || text.includes('빈도') || text.includes('독립성')) {
      methods.push({ id: 'chi-square-independence', name: '카이제곱 검정', description: '범주형 변수 독립성', category: 'nonparametric' })
      matchScore += 0.3
    }

    // 데이터 기반 보정 및 가정 위반 대체 추천
    const smallSample = context.dataShape.rows < 30
    const nonNormal = context.dataQuality.isNormallyDistributed === false
    const heteroscedastic = context.dataQuality.isHomoscedastic === false

    if (smallSample || nonNormal) {
      methods.unshift({ id: 'mann-whitney', name: 'Mann-Whitney U', description: '정규성 가정 불필요', category: 'nonparametric' })
      matchScore += 0.2
    }
    if (heteroscedastic) {
      methods.unshift({ id: 'welch-t', name: "Welch's t-검정", description: '등분산 가정 완화', category: 't-test' })
      methods.unshift({ id: 'games-howell', name: 'Games-Howell', description: '사후검정(이분산)', category: 'anova' })
      matchScore += 0.2
    }
    if (smallSample) {
      methods.unshift({ id: 'wilcoxon', name: 'Wilcoxon 부호순위', description: '소표본 비모수 검정', category: 'nonparametric' })
      matchScore += 0.1
    }

    return { methods, matchScore }
  }

  /**
   * 신뢰도 계산
   */
  private static calculateConfidence(
    clarityScore: number,
    contradictionCount: number,
    compatibilityScore: number,
    matchScore: number
  ): 'high' | 'medium' | 'low' {
    // 가중 평균 (clarity 0.2, compatibility 0.3, match 0.5)
    const base = (clarityScore * 0.2) + (compatibilityScore * 0.3) + (matchScore * 0.5)
    const penalty = Math.min(0.4, contradictionCount * 0.15)
    const totalScore = Math.max(0, Math.min(1, base - penalty))

    if (totalScore > 0.7) return 'high'
    if (totalScore > 0.4) return 'medium'
    return 'low'
  }

  /**
   * 명확한 입력 제안
   */
  private static suggestClarification(context: AnalysisContext): string {
    const suggestions: string[] = []
    const numericCols = context.dataShape.columnNames.filter((_, i) => 
      context.dataShape.columnTypes[i] === 'numeric'
    )
    const categoricalCols = context.dataShape.columnNames.filter((_, i) => 
      context.dataShape.columnTypes[i] === 'categorical'
    )

    if (numericCols.length >= 2) {
      suggestions.push(`"${numericCols[0]}와 ${numericCols[1]}의 관계를 알고 싶어요"`)
    }
    
    if (categoricalCols.length > 0 && numericCols.length > 0) {
      suggestions.push(`"${categoricalCols[0]}별 ${numericCols[0]} 차이를 비교하고 싶어요"`)
    }

    if (suggestions.length === 0) {
      suggestions.push("데이터의 전반적인 특성을 파악하고 싶어요")
    }

    return `예시: ${suggestions.join(' 또는 ')}`
  }

  /**
   * 대안 생성
   */
  private static generateAlternative(context: AnalysisContext): string {
    const alternatives: string[] = []

    // 탐색적 데이터 분석 제안
    alternatives.push('먼저 기술통계로 데이터를 탐색해보세요')

    // 데이터 품질 개선 제안
    if (context.dataQuality.missingRatio > 0.2) {
      alternatives.push('결측값 처리 후 분석을 진행하세요')
    }

    // 시각화 제안
    alternatives.push('산점도나 박스플롯으로 데이터를 시각화해보세요')

    return alternatives.join('. ')
  }
}