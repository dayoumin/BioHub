import { LucideIcon } from 'lucide-react'
import {
  Users2,
  TrendingUp,
  BarChart3,
  Calculator,
} from 'lucide-react'

// 실험설계 타입 정의
export interface ExperimentDesign {
  id: string
  name: string
  description: string
  icon: LucideIcon
  sampleSize: string
  duration: string
  complexity: 'easy' | 'medium' | 'hard'
  statisticalTests: string[]
  examples: string[]
  assumptions: string[]
  category: string
}

// 실험설계 카테고리
export const EXPERIMENT_CATEGORIES = {
  basic: {
    name: '기본 실험설계',
    description: '기초적인 비교 연구 설계',
    designs: ['independent-ttest', 'paired-ttest']
  },
  advanced: {
    name: '고급 실험설계',
    description: '복합적인 다요인 분석 설계',
    designs: ['one-way-anova', 'factorial-2x2']
  },
  observational: {
    name: '관찰 연구',
    description: '변수 간 관계 분석 설계',
    designs: ['correlation-study']
  }
} as const

// 실험설계 구성 데이터
export const EXPERIMENTAL_DESIGNS_CONFIG: Record<string, ExperimentDesign> = {
  'independent-ttest': {
    id: 'independent-ttest',
    name: '독립표본 t-검정 설계',
    description: '두 독립 집단의 평균을 비교하는 실험 설계',
    icon: Users2,
    sampleSize: '각 그룹 최소 30명',
    duration: '단기 (1-2주)',
    complexity: 'easy',
    statisticalTests: ['독립표본 t-검정', 'Mann-Whitney U'],
    examples: ['신약 vs 위약 효과', '남녀 성적 차이', '브랜드별 선호도'],
    assumptions: ['정규성', '등분산성', '독립성'],
    category: 'basic'
  },
  'paired-ttest': {
    id: 'paired-ttest',
    name: '대응표본 t-검정 설계',
    description: '동일한 대상의 전후 변화를 비교하는 설계',
    icon: TrendingUp,
    sampleSize: '최소 30쌍',
    duration: '중기 (4-8주)',
    complexity: 'easy',
    statisticalTests: ['대응표본 t-검정', 'Wilcoxon 부호순위'],
    examples: ['교육 전후 점수', '다이어트 전후 체중', '치료 전후 증상'],
    assumptions: ['차이의 정규성', '대응성'],
    category: 'basic'
  },
  'one-way-anova': {
    id: 'one-way-anova',
    name: '일원분산분석 설계',
    description: '3개 이상 집단의 평균을 비교하는 설계',
    icon: BarChart3,
    sampleSize: '각 그룹 최소 20명',
    duration: '중기 (2-4주)',
    complexity: 'medium',
    statisticalTests: ['일원분산분석', 'Kruskal-Wallis', 'Tukey HSD'],
    examples: ['3개 교육방법 효과', '4개 약물 비교', '연령대별 만족도'],
    assumptions: ['정규성', '등분산성', '독립성'],
    category: 'advanced'
  },
  'factorial-2x2': {
    id: 'factorial-2x2',
    name: '2×2 요인설계',
    description: '두 요인의 주효과와 상호작용을 분석하는 설계',
    icon: Calculator,
    sampleSize: '각 조건 최소 15명',
    duration: '장기 (6-12주)',
    complexity: 'hard',
    statisticalTests: ['이원분산분석', '단순주효과 분석'],
    examples: ['성별×연령 효과', '방법×난이도 상호작용', '약물×용량 조합'],
    assumptions: ['정규성', '등분산성', '독립성', '상호작용 해석'],
    category: 'advanced'
  },
  'correlation-study': {
    id: 'correlation-study',
    name: '상관 연구 설계',
    description: '두 변수 간의 관계를 분석하는 설계',
    icon: TrendingUp,
    sampleSize: '최소 50명',
    duration: '단기 (1-2주)',
    complexity: 'easy',
    statisticalTests: ['Pearson 상관', 'Spearman 상관', '편상관'],
    examples: ['키와 몸무게 관계', '공부시간과 성적', '스트레스와 혈압'],
    assumptions: ['선형성', '정규성 (Pearson)', '등분산성'],
    category: 'observational'
  }
}

// 헬퍼 함수들
export const getDesignsByCategory = (categoryId: keyof typeof EXPERIMENT_CATEGORIES) => {
  const category = EXPERIMENT_CATEGORIES[categoryId]
  return category.designs.map(id => EXPERIMENTAL_DESIGNS_CONFIG[id])
}

export const getAllDesigns = () => {
  return Object.values(EXPERIMENTAL_DESIGNS_CONFIG)
}

export const getDesignById = (id: string) => {
  return EXPERIMENTAL_DESIGNS_CONFIG[id] || null
}

// 추천 로직을 위한 규칙 엔진
export interface ResearchCriteria {
  purpose?: 'compare' | 'relationship' | 'describe'
  groups?: number
  repeated?: boolean
  variables?: number
}

export class DesignRecommendationEngine {
  static recommend(criteria: ResearchCriteria): ExperimentDesign | null {
    try {
      if (criteria.purpose === 'compare') {
        if (criteria.groups === 2) {
          return criteria.repeated
            ? getDesignById('paired-ttest')
            : getDesignById('independent-ttest')
        } else if (typeof criteria.groups === 'number' && criteria.groups > 2) {
          return getDesignById('one-way-anova')
        }
      } else if (criteria.purpose === 'relationship') {
        return getDesignById('correlation-study')
      }

      // 기본값
      return getDesignById('independent-ttest')
    } catch (error) {
      console.error('Design recommendation error:', error)
      return null
    }
  }

  static validate(criteria: ResearchCriteria): boolean {
    if (!criteria.purpose) return false

    if (criteria.purpose === 'compare') {
      if (typeof criteria.groups !== 'number' || criteria.groups < 2) return false
      if (criteria.groups === 2 && typeof criteria.repeated !== 'boolean') return false
    }

    return true
  }
}