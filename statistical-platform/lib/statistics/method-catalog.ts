/**
 * Purpose-based Method Catalog
 *
 * Maps analysis purposes to available statistical methods
 * Used by PurposeInputStep to show all available methods after purpose selection
 */

import { STATISTICAL_METHODS } from './method-mapping'
import type { StatisticalMethod } from '@/types/smart-flow'

// Cast STATISTICAL_METHODS to the smart-flow type
const METHODS = STATISTICAL_METHODS as unknown as StatisticalMethod[]

export type AnalysisPurpose = 'compare' | 'relationship' | 'distribution' | 'prediction' | 'timeseries'

/**
 * Purpose -> Category mapping
 */
export const PURPOSE_CATEGORY_MAP: Record<AnalysisPurpose, string[]> = {
  compare: ['t-test', 'anova', 'nonparametric'],
  relationship: ['correlation', 'chi-square'],
  distribution: ['descriptive', 'chi-square'],
  prediction: ['regression', 'advanced'],
  timeseries: ['timeseries', 'regression']
}

/**
 * Get all methods for a given purpose
 */
export function getMethodsByPurpose(purpose: AnalysisPurpose): StatisticalMethod[] {
  const categories = PURPOSE_CATEGORY_MAP[purpose] || []
  return METHODS.filter(m =>
    categories.includes(m.category) ||
    categories.includes(m.subcategory || '')
  )
}

/**
 * Get methods grouped by category for a purpose
 */
export interface MethodGroup {
  category: string
  categoryLabel: string
  methods: StatisticalMethod[]
}

const CATEGORY_LABELS: Record<string, string> = {
  't-test': 'T-검정',
  'anova': '분산분석 (ANOVA)',
  'nonparametric': '비모수 검정',
  'correlation': '상관분석',
  'chi-square': '카이제곱 / 빈도분석',
  'descriptive': '기술통계',
  'regression': '회귀분석',
  'advanced': '고급 분석',
  'timeseries': '시계열 분석',
  'pca': '차원축소',
  'clustering': '군집분석',
  'psychometrics': '심리측정',
  'design': '실험설계',
  'survival': '생존분석'
}

export function getMethodsGroupedByCategory(purpose: AnalysisPurpose): MethodGroup[] {
  const methods = getMethodsByPurpose(purpose)
  const categories = PURPOSE_CATEGORY_MAP[purpose] || []

  // Group methods by category
  const grouped = new Map<string, StatisticalMethod[]>()

  for (const method of methods) {
    const cat = method.category as string
    if (!grouped.has(cat)) {
      grouped.set(cat, [])
    }
    grouped.get(cat)!.push(method)
  }

  // Convert to array, maintaining category order
  return categories
    .filter(cat => grouped.has(cat))
    .map(cat => ({
      category: cat,
      categoryLabel: CATEGORY_LABELS[cat] || cat,
      methods: grouped.get(cat) || []
    }))
}

/**
 * Get all methods (for "Browse All" mode)
 */
export function getAllMethodsGrouped(): MethodGroup[] {
  const grouped = new Map<string, StatisticalMethod[]>()

  for (const method of METHODS) {
    const cat = method.category as string
    if (!grouped.has(cat)) {
      grouped.set(cat, [])
    }
    grouped.get(cat)!.push(method)
  }

  // Return in logical order (survival 카테고리 포함)
  const categoryOrder = [
    'descriptive',
    't-test',
    'anova',
    'nonparametric',
    'correlation',
    'chi-square',
    'regression',
    'pca',
    'clustering',
    'timeseries',
    'survival',
    'advanced',
    'psychometrics',
    'design'
  ]

  return categoryOrder
    .filter(cat => grouped.has(cat))
    .map(cat => ({
      category: cat,
      categoryLabel: CATEGORY_LABELS[cat] || cat,
      methods: grouped.get(cat) || []
    }))
}

/**
 * Search methods by name or description
 */
export function searchMethods(query: string): StatisticalMethod[] {
  if (!query.trim()) return []

  const q = query.toLowerCase()
  return METHODS.filter(m =>
    m.name.toLowerCase().includes(q) ||
    m.description.toLowerCase().includes(q) ||
    m.id.toLowerCase().includes(q)
  )
}

/**
 * Get popular/common methods for quick access
 */
export function getPopularMethods(): StatisticalMethod[] {
  const popularIds = [
    'descriptive-stats',
    'two-sample-t',
    'one-way-anova',
    'mann-whitney',
    'correlation',
    'simple-regression',
    'chi-square'
  ]

  return popularIds
    .map(id => METHODS.find(m => m.id === id))
    .filter((m): m is StatisticalMethod => m !== undefined)
}