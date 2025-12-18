/**
 * Progressive Questions - 점진적 질문형 UI 데이터 구조
 *
 * 4개 대분류 → 중분류 → 기존 AnalysisPurpose 매핑
 * AI 모델 없이 Rule-based 추천 지원
 */

import type {
  AnalysisCategory,
  AnalysisPurpose,
  CategoryDefinition,
  SubcategoryDefinition,
} from '@/types/smart-flow'

// ============================================
// 대분류 정의 (4개)
// ============================================

export const CATEGORIES: CategoryDefinition[] = [
  {
    id: 'compare',
    title: '차이/비교 분석',
    description: '그룹 간 차이를 검정하거나 전후 변화를 비교합니다',
    icon: 'GitCompare',
    subcategories: [
      {
        id: 'group-mean',
        title: '그룹 간 평균 비교',
        description: '두 개 이상 그룹의 평균 차이를 검정합니다',
        mapsToPurpose: 'compare',
        presetAnswers: {
          comparison_target: 'mean',
        },
        // 추가 질문 필요 (group_count, normality 등)
      },
      {
        id: 'pre-post',
        title: '전/후 변화 비교',
        description: '같은 대상의 시점 간 변화를 분석합니다',
        mapsToPurpose: 'compare',
        presetAnswers: {
          comparison_target: 'mean',
          sample_type: 'paired',
          group_count: '2',
        },
      },
      {
        id: 'proportion',
        title: '비율 비교',
        description: '그룹 간 비율이나 빈도의 차이를 검정합니다',
        mapsToPurpose: 'compare',
        presetAnswers: {
          comparison_target: 'proportion',
          variable_type: 'binary',
        },
      },
      {
        id: 'distribution',
        title: '분포/빈도 분석',
        description: '데이터의 분포 형태나 범주별 빈도를 분석합니다',
        mapsToPurpose: 'distribution',
      },
    ],
  },
  {
    id: 'relationship',
    title: '관계 분석',
    description: '변수 간의 상관관계나 연관성을 분석합니다',
    icon: 'TrendingUp',
    subcategories: [
      {
        id: 'correlation',
        title: '상관관계 분석',
        description: '두 개 이상 수치형 변수 간의 관계를 분석합니다',
        mapsToPurpose: 'relationship',
        presetAnswers: {
          relationship_type: 'correlation',
        },
      },
      {
        id: 'categorical-association',
        title: '범주형 연관 분석',
        description: '범주형 변수 간의 연관성을 분석합니다 (카이제곱 등)',
        mapsToPurpose: 'relationship',
        presetAnswers: {
          variable_type: 'categorical',
        },
      },
    ],
  },
  {
    id: 'prediction',
    title: '예측 분석',
    description: '독립변수로 종속변수를 예측하는 모델을 만듭니다',
    icon: 'LineChart',
    subcategories: [
      {
        id: 'regression',
        title: '수치 예측 (회귀)',
        description: '연속형 종속변수를 예측합니다',
        mapsToPurpose: 'prediction',
        presetAnswers: {
          outcome_type: 'continuous',
        },
      },
      {
        id: 'classification',
        title: '분류 예측',
        description: '범주형 종속변수를 예측합니다 (로지스틱 회귀 등)',
        mapsToPurpose: 'prediction',
        presetAnswers: {
          outcome_type: 'binary',
        },
      },
    ],
  },
  {
    id: 'advanced',
    title: '고급 분석',
    description: '시계열, 생존분석, 다변량 분석 등 전문 분석을 수행합니다',
    icon: 'Layers',
    subcategories: [
      {
        id: 'timeseries',
        title: '시계열 분석',
        description: '시간에 따른 데이터 패턴을 분석하고 예측합니다',
        mapsToPurpose: 'timeseries',
      },
      {
        id: 'survival',
        title: '생존 분석',
        description: '사건 발생까지의 시간을 분석합니다',
        mapsToPurpose: 'survival',
      },
      {
        id: 'multivariate',
        title: '다변량 분석',
        description: 'PCA, 요인분석, 군집분석 등을 수행합니다',
        mapsToPurpose: 'multivariate',
      },
      {
        id: 'utility',
        title: '연구 설계 도구',
        description: '표본 크기 계산, 검정력 분석, 신뢰도 분석 등',
        mapsToPurpose: 'utility',
      },
    ],
  },
]

// ============================================
// Helper Functions
// ============================================

/**
 * 대분류 ID로 CategoryDefinition 찾기
 */
export function getCategoryById(categoryId: AnalysisCategory): CategoryDefinition | undefined {
  return CATEGORIES.find((cat) => cat.id === categoryId)
}

/**
 * 중분류 ID로 SubcategoryDefinition 찾기
 */
export function getSubcategoryById(subcategoryId: string): SubcategoryDefinition | undefined {
  for (const category of CATEGORIES) {
    const subcategory = category.subcategories.find((sub) => sub.id === subcategoryId)
    if (subcategory) {
      return subcategory
    }
  }
  return undefined
}

/**
 * 중분류 ID로 해당 대분류 찾기
 */
export function getCategoryBySubcategoryId(subcategoryId: string): CategoryDefinition | undefined {
  return CATEGORIES.find((cat) =>
    cat.subcategories.some((sub) => sub.id === subcategoryId)
  )
}

/**
 * AnalysisPurpose로 관련 중분류들 찾기
 */
export function getSubcategoriesByPurpose(purpose: AnalysisPurpose): SubcategoryDefinition[] {
  const result: SubcategoryDefinition[] = []
  for (const category of CATEGORIES) {
    for (const subcategory of category.subcategories) {
      if (subcategory.mapsToPurpose === purpose) {
        result.push(subcategory)
      }
    }
  }
  return result
}

/**
 * 대분류별 아이콘 이름 → Lucide 아이콘 매핑
 * (실제 아이콘은 컴포넌트에서 동적 import)
 */
export const CATEGORY_ICONS: Record<AnalysisCategory, string> = {
  compare: 'GitCompare',
  relationship: 'TrendingUp',
  prediction: 'LineChart',
  advanced: 'Layers',
}

/**
 * 대분류별 색상 테마
 */
export const CATEGORY_COLORS: Record<AnalysisCategory, string> = {
  compare: 'blue',
  relationship: 'green',
  prediction: 'purple',
  advanced: 'orange',
}
