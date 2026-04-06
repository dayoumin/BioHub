/**
 * 용도별 통계 분석 카테고리
 *
 * 사용자의 "목적" 기반으로 분류 (통계적 기법이 아닌 연구 질문 기반)
 * - CategoryBrowser 컴포넌트에서 사용
 * - consultant-service에서 키워드 → 카테고리 매핑에 사용
 *
 * methodIds는 statistical-methods.ts의 키를 참조
 */

import type { LucideIcon } from 'lucide-react'
import {
  GitCompare,
  Link,
  TrendingUp,
  BarChart3,
  Clock,
  Activity,
  Layers,
  Ruler,
  Dna,
} from 'lucide-react'

export interface PurposeCategory {
  id: string
  label: string
  description: string
  icon: LucideIcon
  methodIds: string[]
  /** 비활성 카테고리 (예: Bio-Tools 미구현) */
  disabled?: boolean
  /** 비활성 시 표시할 뱃지 */
  badge?: string
  /** 키워드 매칭용 (consultant-service에서 사용) */
  keywords: string[]
}

export const PURPOSE_CATEGORIES: PurposeCategory[] = [
  {
    id: 'compare',
    label: '그룹 비교',
    description: '두 그룹 이상의 평균·중앙값 차이를 검정',
    icon: GitCompare,
    keywords: ['비교', '차이', '평균', '그룹', 'compare', 'difference', 'mean', 'group'],
    methodIds: [
      'two-sample-t',
      'welch-t',
      'one-sample-t',
      'paired-t',
      'one-way-anova',
      'repeated-measures-anova',
      'ancova',
      'manova',
      'mixed-model',
      'mann-whitney',
      'wilcoxon-signed-rank',
      'kruskal-wallis',
      'friedman',
      'sign-test',
      'mood-median',
    ],
  },
  {
    id: 'relationship',
    label: '관계/연관성 분석',
    description: '변수 간 상관관계 및 연관성 탐색',
    icon: Link,
    keywords: ['관계', '상관', '연관', '관련', 'correlation', 'association', 'relationship'],
    methodIds: [
      'pearson-correlation',
      'partial-correlation',
      'chi-square-independence',
      'mcnemar',
      'cochran-q',
    ],
  },
  {
    id: 'prediction',
    label: '예측 모델링',
    description: '종속 변수를 독립 변수로 예측하는 모델 구축',
    icon: TrendingUp,
    keywords: ['예측', '회귀', '모델', '영향', 'predict', 'regression', 'model', 'effect'],
    methodIds: [
      'simple-regression',
      'logistic-regression',
      'poisson-regression',
      'ordinal-regression',
      'stepwise-regression',
      'dose-response',
      'response-surface',
    ],
  },
  {
    id: 'descriptive',
    label: '분포/기술통계',
    description: '데이터의 기본 특성 파악 및 분포 검정',
    icon: BarChart3,
    keywords: ['분포', '기술', '기초', '정규', '탐색', 'distribution', 'descriptive', 'normality', 'explore'],
    methodIds: [
      'descriptive-stats',
      'normality-test',
      'explore-data',
      'means-plot',
      'binomial-test',
      'runs-test',
      'kolmogorov-smirnov',
      'chi-square-goodness',
      'one-sample-proportion',
    ],
  },
  {
    id: 'timeseries',
    label: '시계열 분석',
    description: '시간에 따른 데이터 패턴 및 추세 분석',
    icon: Clock,
    keywords: ['시계열', '추세', '시간', '변화', '계절', 'time', 'series', 'trend', 'seasonal'],
    methodIds: [
      'arima',
      'seasonal-decompose',
      'stationarity-test',
      'mann-kendall-test',
    ],
  },
  {
    id: 'survival',
    label: '생존 분석',
    description: '시간-이벤트 데이터의 생존 함수 및 위험 요인 분석',
    icon: Activity,
    keywords: ['생존', '사건', '위험', 'survival', 'hazard', 'event', 'kaplan', 'cox', 'roc'],
    methodIds: [
      'kaplan-meier',
      'cox-regression',
      'roc-curve',
    ],
  },
  {
    id: 'multivariate',
    label: '다변량 분석',
    description: '다수의 변수를 동시에 분석하여 구조 파악',
    icon: Layers,
    keywords: ['다변량', '차원', '요인', '군집', '주성분', 'multivariate', 'factor', 'cluster', 'pca', 'dimension'],
    methodIds: [
      'pca',
      'factor-analysis',
      'cluster',
      'discriminant-analysis',
    ],
  },
  {
    id: 'tools',
    label: '측정/설계 도구',
    description: '표본 크기 계산, 측정 신뢰도 검증 등',
    icon: Ruler,
    keywords: ['표본', '검정력', '신뢰도', '측정', '설계', 'sample', 'power', 'reliability', 'design'],
    methodIds: [
      'power-analysis',
      'reliability-analysis',
    ],
  },
  {
    id: 'biology',
    label: '생물학 전용',
    description: '생태 다양성, 성장 모델, 메타분석 등 12개 도구',
    icon: Dna,
    disabled: true,
    badge: '예정',
    keywords: ['생물', '생태', '다양성', '성장', 'biology', 'ecology', 'diversity', 'growth'],
    methodIds: [],
  },
]

/** 카테고리 ID로 조회 */
export function getCategoryById(id: string): PurposeCategory | undefined {
  return PURPOSE_CATEGORIES.find(c => c.id === id)
}

/** 메서드 ID가 속한 카테고리 목록 조회 (중복 포함) */
export function getCategoriesForMethod(methodId: string): PurposeCategory[] {
  return PURPOSE_CATEGORIES.filter(c => c.methodIds.includes(methodId))
}
