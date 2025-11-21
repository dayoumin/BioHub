/**
 * 키워드 기반 통계 방법 추천 시스템
 * LLM 없이 규칙 기반으로 작동
 */

import { StatisticalMethod } from '@/types/smart-flow'

interface KeywordPattern {
  keywords: string[]
  methods: string[]
  priority: number
}

const KEYWORD_PATTERNS: KeywordPattern[] = [
  // T-검정 관련
  {
    keywords: ['차이', '비교', '두 그룹', '남녀', '전후', 'A/B', '평균 차이'],
    methods: ['independent-t-test', 'paired-t-test'],
    priority: 10
  },
  {
    keywords: ['전후', '이전', '이후', '변화', '효과', '개선'],
    methods: ['paired-t-test'],
    priority: 15
  },
  
  // 상관/회귀 관련
  {
    keywords: ['관계', '상관', '연관', '관련', '연결'],
    methods: ['correlation'],
    priority: 10
  },
  {
    keywords: ['영향', '예측', '원인', '효과', '설명', '종속'],
    methods: ['regression'],
    priority: 10
  },
  {
    keywords: ['나이', '시간', '추세', '변화', '증가', '감소'],
    methods: ['regression', 'correlation'],
    priority: 8
  },
  
  // ANOVA 관련
  {
    keywords: ['여러', '세 개', '3개', '그룹', '집단', '다중', '분산'],
    methods: ['anova'],
    priority: 10
  },
  {
    keywords: ['지역', '부서', '학년', '등급', '유형', '카테고리'],
    methods: ['anova'],
    priority: 8
  },
  
  // 비모수 검정
  {
    keywords: ['순위', '서열', '등급', '만족도', '리커트'],
    methods: ['mann-whitney', 'kruskal-wallis'],
    priority: 12
  },
  
  // 카이제곱 검정
  {
    keywords: ['비율', '빈도', '선호', '선택', '분포', '독립성'],
    methods: ['chi-square'],
    priority: 10
  }
]

const ALL_METHODS: Record<string, StatisticalMethod> = {
  'independent-t-test': {
    id: 'independent-t-test',
    name: '독립표본 t-검정',
    description: '두 독립적인 그룹 간 평균 차이 검정',
    category: 't-test'
  },
  'paired-t-test': {
    id: 'paired-t-test',
    name: '대응표본 t-검정',
    description: '동일 대상의 전후 비교',
    category: 't-test'
  },
  'correlation': {
    id: 'correlation',
    name: '상관분석',
    description: '두 변수 간의 관계 강도와 방향 분석',
    category: 'regression'
  },
  'regression': {
    id: 'regression',
    name: '회귀분석',
    description: '한 변수가 다른 변수에 미치는 영향 분석',
    category: 'regression'
  },
  'anova': {
    id: 'anova',
    name: '일원분산분석 (ANOVA)',
    description: '세 개 이상 그룹의 평균 차이 검정',
    category: 'anova'
  },
  'mann-whitney': {
    id: 'mann-whitney',
    name: 'Mann-Whitney U 검정',
    description: '두 그룹의 순위 차이 검정 (비모수)',
    category: 'nonparametric'
  },
  'kruskal-wallis': {
    id: 'kruskal-wallis',
    name: 'Kruskal-Wallis 검정',
    description: '세 그룹 이상의 순위 차이 검정 (비모수)',
    category: 'nonparametric'
  },
  'chi-square': {
    id: 'chi-square',
    name: '카이제곱 검정',
    description: '범주형 변수 간의 독립성 검정',
    category: 'nonparametric'
  }
}

/**
 * 메서드별 예상 Reasoning 키워드 (Phase 4 검증용)
 * 추천 시 이 키워드들이 reasoning에 포함되어야 함
 */
const METHOD_REASONING_KEYWORDS: Record<string, string[]> = {
  'independent-t-test': ['2개 그룹', '독립', '정규성', '등분산성'],
  'paired-t-test': ['대응표본', 'paired', '전후', '동일 대상'],
  'pearson-correlation': ['상관', '선형', '정규성'],
  'spearman-correlation': ['상관', '순위', '비모수'],
  'correlation': ['상관', 'correlation', '선형', '관계'],
  'regression': ['회귀', 'regression', '예측', '영향'],
  'simple-regression': ['회귀', '예측', '선형'],
  'logistic-regression': ['로지스틱', '범주형', '예측'],
  'one-way-anova': ['3개 이상', 'ANOVA', '분산', '정규성', '등분산성'],
  'two-way-anova': ['요인', 'factor', 'ANOVA', '정규성', '등분산성'],
  'anova': ['3개 이상', 'ANOVA', '분산', '그룹'],
  'mann-whitney': ['비모수', '순위', '정규성 위배'],
  'welch-t': ['등분산', 'Welch', '정규성'],
  'wilcoxon-signed-rank': ['대응표본', '비모수', '순위'],
  'kruskal-wallis': ['비모수', '순위', '3개 이상', '정규성 위배'],
  'friedman': ['비모수', '요인', 'factor'],
  'chi-square': ['범주형', '독립성', '카이제곱', '빈도'],
  'descriptive-stats': ['기술통계', '분포', '빈도'],
  'time-series-analysis': ['시계열', '시간', '추세'],
}

export class KeywordBasedRecommender {
  /**
   * 사용자 입력 텍스트를 분석하여 적절한 통계 방법 추천
   */
  static recommendMethods(
    purposeText: string,
    dataInfo?: {
      columnCount?: number
      rowCount?: number
      hasNumeric?: boolean
      hasCategorical?: boolean
    }
  ): StatisticalMethod[] {
    if (!purposeText || purposeText.trim().length === 0) {
      return this.getDefaultRecommendations()
    }

    const normalizedText = purposeText.toLowerCase()
    const matches: { method: string; score: number }[] = []

    // 키워드 매칭으로 점수 계산
    for (const pattern of KEYWORD_PATTERNS) {
      const matchCount = pattern.keywords.filter(keyword => 
        normalizedText.includes(keyword)
      ).length

      if (matchCount > 0) {
        pattern.methods.forEach(methodId => {
          const existingMatch = matches.find(m => m.method === methodId)
          const score = matchCount * pattern.priority

          if (existingMatch) {
            existingMatch.score += score
          } else {
            matches.push({ method: methodId, score })
          }
        })
      }
    }

    // 데이터 특성 기반 추가 점수
    if (dataInfo) {
      this.adjustScoresBasedOnData(matches, dataInfo)
    }

    // 점수 순으로 정렬
    matches.sort((a, b) => b.score - a.score)

    // 상위 4개 추천
    const recommendations = matches
      .slice(0, 4)
      .map(m => ALL_METHODS[m.method])
      .filter(Boolean)

    // 추천이 없으면 기본 추천
    if (recommendations.length === 0) {
      return this.getDefaultRecommendations()
    }

    return recommendations
  }

  /**
   * 데이터 특성에 따른 점수 조정
   */
  private static adjustScoresBasedOnData(
    matches: { method: string; score: number }[],
    dataInfo: {
      columnCount?: number
      rowCount?: number
      hasNumeric?: boolean
      hasCategorical?: boolean
    }
  ): void {
    // 컬럼 수에 따른 조정
    if (dataInfo.columnCount) {
      if (dataInfo.columnCount === 2) {
        // 2개 컬럼: 상관/회귀 우선
        this.boostMethod(matches, 'correlation', 5)
        this.boostMethod(matches, 'regression', 5)
      } else if (dataInfo.columnCount > 3) {
        // 많은 컬럼: 다변량 분석 우선
        this.boostMethod(matches, 'regression', 3)
        this.boostMethod(matches, 'anova', 3)
      }
    }

    // 데이터 타입에 따른 조정
    if (dataInfo.hasCategorical && !dataInfo.hasNumeric) {
      // 범주형만: 카이제곱
      this.boostMethod(matches, 'chi-square', 10)
    }

    // 샘플 크기에 따른 조정
    if (dataInfo.rowCount && dataInfo.rowCount < 30) {
      // 작은 샘플: 비모수 검정 우선
      this.boostMethod(matches, 'mann-whitney', 5)
      this.boostMethod(matches, 'kruskal-wallis', 5)
    }
  }

  private static boostMethod(
    matches: { method: string; score: number }[],
    methodId: string,
    boost: number
  ): void {
    const match = matches.find(m => m.method === methodId)
    if (match) {
      match.score += boost
    } else {
      matches.push({ method: methodId, score: boost })
    }
  }

  /**
   * 기본 추천 (입력이 없을 때)
   */
  private static getDefaultRecommendations(): StatisticalMethod[] {
    return [
      ALL_METHODS['independent-t-test'],
      ALL_METHODS['correlation'],
      ALL_METHODS['regression'],
      ALL_METHODS['anova']
    ]
  }

  /**
   * 키워드 추출 (디버깅용)
   */
  static extractKeywords(text: string): string[] {
    const keywords: string[] = []
    const normalizedText = text.toLowerCase()

    for (const pattern of KEYWORD_PATTERNS) {
      pattern.keywords.forEach(keyword => {
        if (normalizedText.includes(keyword)) {
          keywords.push(keyword)
        }
      })
    }

    return [...new Set(keywords)]
  }

  /**
   * 메서드별 예상 Reasoning 키워드 반환 (Phase 4 검증용)
   */
  static getExpectedReasoningKeywords(methodId: string): string[] {
    return METHOD_REASONING_KEYWORDS[methodId] || []
  }
}