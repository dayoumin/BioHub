import {
  Calculator,
  TrendingUp,
  GitBranch,
  BarChart3,
  Activity,
  PieChart,
  Shuffle,
  FileText,
  Zap,
  Microscope,
  CheckCircle2,
  Grid3X3,
  Target
} from 'lucide-react'

export interface StatisticsMenuItem {
  id: string
  href: string
  title: string
  subtitle?: string
  category: string
  icon: any
  implemented: boolean
  comingSoon?: boolean
  badge?: string
}

export interface StatisticsCategory {
  id: string
  title: string
  description: string
  icon: any
  items: StatisticsMenuItem[]
}

/**
 * 통계 메뉴 구성 원칙:
 *
 * 1. 통합 페이지: 유사한 메서드를 1개 페이지에서 선택 (예: ANOVA)
 * 2. 개별 페이지: 독립적인 메서드는 개별 페이지 제공
 * 3. 혼합 패턴: 통합 + 개별 모두 제공 (사용자 선택권)
 *    - 비모수 검정: 통합 페이지 + 8개 개별 페이지
 *    - 회귀분석: 기본 회귀 + 5개 고급 회귀
 *
 * 주의사항:
 * - ID 중복: 카테고리 ID와 메뉴 항목 ID가 같을 수 있음 (의도된 설계)
 * - href 중복: 피해야 함 (각 항목은 고유한 경로)
 */
export const STATISTICS_MENU: StatisticsCategory[] = [
  {
    id: 'descriptive',
    title: '기초 분석',
    description: '데이터 탐색 및 기술통계',
    icon: FileText,
    items: [
      {
        id: 'explore-data',
        href: '/statistics/explore-data',
        title: '데이터 탐색',
        subtitle: '데이터 개요 및 시각화',
        category: 'descriptive',
        icon: FileText,
        implemented: true
      },
      {
        id: 'descriptive',
        href: '/statistics/descriptive',
        title: '기술통계',
        subtitle: '평균, 표준편차, 분포',
        category: 'descriptive',
        icon: Calculator,
        implemented: true
      },
      {
        id: 'frequency-table',
        href: '/statistics/frequency-table',
        title: '빈도표',
        subtitle: '범주형 데이터 빈도 분석',
        category: 'descriptive',
        icon: Grid3X3,
        implemented: true
      },
      {
        id: 'cross-tabulation',
        href: '/statistics/cross-tabulation',
        title: '교차표',
        subtitle: '두 범주형 변수 교차 분석',
        category: 'descriptive',
        icon: Grid3X3,
        implemented: true
      },
      {
        id: 'reliability',
        href: '/statistics/reliability',
        title: '신뢰도 분석',
        subtitle: 'Cronbach Alpha 등',
        category: 'descriptive',
        icon: CheckCircle2,
        implemented: true
      }
    ]
  },
  {
    id: 'compare',
    title: '평균 비교',
    description: '집단 간 평균 차이 검정',
    icon: TrendingUp,
    items: [
      {
        id: 't-test',
        href: '/statistics/t-test',
        title: 'T-검정',
        subtitle: '일표본, 독립표본, 대응표본',
        category: 'compare',
        icon: TrendingUp,
        implemented: true
      },
      {
        id: 'one-sample-t',
        href: '/statistics/one-sample-t',
        title: '일표본 t-검정',
        subtitle: '한 집단과 특정값 비교',
        category: 'compare',
        icon: Calculator,
        implemented: true
      },
      {
        id: 'welch-t',
        href: '/statistics/welch-t',
        title: 'Welch t-검정',
        subtitle: '등분산 가정하지 않음',
        category: 'compare',
        icon: Calculator,
        implemented: true
      },
      {
        id: 'one-sample-proportion',
        href: '/statistics/proportion-test',
        title: '일표본 비율 검정',
        subtitle: '비율과 특정값 비교',
        category: 'compare',
        icon: PieChart,
        implemented: true
      },
      {
        id: 'means-plot',
        href: '/statistics/means-plot',
        title: '평균 도표',
        subtitle: '그룹별 평균 시각화',
        category: 'compare',
        icon: BarChart3,
        implemented: true
      }
    ]
  },
  {
    id: 'glm',
    title: '일반선형모델',
    description: '분산분석 및 공분산분석',
    icon: GitBranch,
    items: [
      {
        id: 'anova',
        href: '/statistics/anova',
        title: 'ANOVA',
        subtitle: '일원, 이원, 삼원, 반복측정',
        category: 'glm',
        icon: GitBranch,
        implemented: true
      },
      {
        id: 'ancova',
        href: '/statistics/ancova',
        title: '공분산분석',
        subtitle: '공변량 통제한 집단 비교',
        category: 'glm',
        icon: Activity,
        implemented: true
      },
      {
        id: 'manova',
        href: '/statistics/manova',
        title: '다변량 분산분석',
        subtitle: '여러 종속변수 동시 분석',
        category: 'glm',
        icon: GitBranch,
        implemented: true
      },
      {
        id: 'mixed-model',
        href: '/statistics/mixed-model',
        title: '선형 혼합 모형',
        subtitle: '고정효과와 무선효과',
        category: 'glm',
        icon: Activity,
        implemented: true
      }
    ]
  },
  {
    id: 'correlate',
    title: '상관분석',
    description: '변수 간 관계 분석',
    icon: Activity,
    items: [
      {
        id: 'correlation',
        href: '/statistics/correlation',
        title: '상관분석',
        subtitle: 'Pearson, Spearman, Kendall',
        category: 'correlate',
        icon: Activity,
        implemented: true
      },
      {
        id: 'partial-correlation',
        href: '/statistics/partial-correlation',
        title: '편상관분석',
        subtitle: '제3변수 통제한 상관',
        category: 'correlate',
        icon: Activity,
        implemented: true
      }
    ]
  },
  {
    id: 'regression',
    title: '회귀분석',
    description: '예측 및 인과관계 분석',
    icon: TrendingUp,
    items: [
      {
        id: 'regression',
        href: '/statistics/regression',
        title: '회귀분석',
        subtitle: '단순, 다중, 로지스틱',
        category: 'regression',
        icon: TrendingUp,
        implemented: true
      },
      {
        id: 'stepwise-regression',
        href: '/statistics/stepwise',
        title: '단계적 회귀',
        subtitle: '변수 선택 자동화',
        category: 'regression',
        icon: TrendingUp,
        implemented: true
      },
      {
        id: 'ordinal-regression',
        href: '/statistics/ordinal-regression',
        title: '서열 회귀분석',
        subtitle: '순서형 결과 예측',
        category: 'regression',
        icon: TrendingUp,
        implemented: true
      },
      {
        id: 'poisson-regression',
        href: '/statistics/poisson',
        title: '포아송 회귀',
        subtitle: '카운트 데이터 예측',
        category: 'regression',
        icon: Calculator,
        implemented: true
      },
      {
        id: 'dose-response',
        href: '/statistics/dose-response',
        title: '용량-반응 분석',
        subtitle: '용량과 반응의 관계 모델링',
        category: 'regression',
        icon: TrendingUp,
        implemented: true
      },
      {
        id: 'response-surface',
        href: '/statistics/response-surface',
        title: '반응표면 분석',
        subtitle: '다변수 최적화 및 표면 모델링',
        category: 'regression',
        icon: Activity,
        implemented: true
      }
    ]
  },
  {
    id: 'nonparametric',
    title: '비모수 검정',
    description: '정규성 가정 없는 검정',
    icon: Shuffle,
    items: [
      {
        id: 'non-parametric',
        href: '/statistics/non-parametric',
        title: '비모수 검정',
        subtitle: 'Mann-Whitney, Wilcoxon, Kruskal-Wallis',
        category: 'nonparametric',
        icon: Shuffle,
        implemented: true,
        badge: '통합'
      },
      {
        id: 'mann-whitney',
        href: '/statistics/mann-whitney',
        title: 'Mann-Whitney U 검정',
        subtitle: '독립 2집단 비모수 검정',
        category: 'nonparametric',
        icon: Shuffle,
        implemented: true
      },
      {
        id: 'wilcoxon',
        href: '/statistics/wilcoxon',
        title: 'Wilcoxon 검정',
        subtitle: '대응 표본 비모수 검정',
        category: 'nonparametric',
        icon: Shuffle,
        implemented: true
      },
      {
        id: 'kruskal-wallis',
        href: '/statistics/kruskal-wallis',
        title: 'Kruskal-Wallis 검정',
        subtitle: '3개 이상 집단 비모수 검정',
        category: 'nonparametric',
        icon: Shuffle,
        implemented: true
      },
      {
        id: 'friedman',
        href: '/statistics/friedman',
        title: 'Friedman 검정',
        subtitle: '반복측정 비모수 검정',
        category: 'nonparametric',
        icon: Shuffle,
        implemented: true
      },
      {
        id: 'sign-test',
        href: '/statistics/sign-test',
        title: '부호 검정',
        subtitle: '대응 표본 방향 비교',
        category: 'nonparametric',
        icon: Shuffle,
        implemented: true
      },
      {
        id: 'runs-test',
        href: '/statistics/runs-test',
        title: '런 검정',
        subtitle: '자료의 무작위성',
        category: 'nonparametric',
        icon: Shuffle,
        implemented: true
      },
      {
        id: 'kolmogorov-smirnov',
        href: '/statistics/ks-test',
        title: 'K-S 검정',
        subtitle: '분포 동일성 검정',
        category: 'nonparametric',
        icon: Activity,
        implemented: true
      },
      {
        id: 'mcnemar',
        href: '/statistics/mcnemar',
        title: 'McNemar 검정',
        subtitle: '대응 이진 자료',
        category: 'nonparametric',
        icon: Calculator,
        implemented: true
      },
      {
        id: 'cochran-q',
        href: '/statistics/cochran-q',
        title: 'Cochran Q 검정',
        subtitle: '반복측정 이진 자료',
        category: 'nonparametric',
        icon: Calculator,
        implemented: true
      },
      {
        id: 'mood-median',
        href: '/statistics/mood-median',
        title: 'Mood Median Test',
        subtitle: '중앙값 기반 검정',
        category: 'nonparametric',
        icon: Target,
        implemented: true
      },
      {
        id: 'binomial-test',
        href: '/statistics/binomial-test',
        title: '이항 검정',
        subtitle: '이진 결과 확률 검정',
        category: 'nonparametric',
        icon: Calculator,
        implemented: true
      }
    ]
  },
  {
    id: 'chi-square',
    title: '카이제곱 검정',
    description: '범주형 자료 분석',
    icon: PieChart,
    items: [
      {
        id: 'chi-square-independence',
        href: '/statistics/chi-square-independence',
        title: '독립성 검정',
        subtitle: '두 범주형 변수 간 연관성',
        category: 'chi-square',
        icon: Grid3X3,
        implemented: true
      },
      {
        id: 'chi-square-goodness',
        href: '/statistics/chi-square-goodness',
        title: '적합도 검정',
        subtitle: '관측 빈도와 기대 분포 비교',
        category: 'chi-square',
        icon: BarChart3,
        implemented: true
      },
      {
        id: 'chi-square',
        href: '/statistics/chi-square',
        title: 'Fisher 정확 검정',
        subtitle: '소표본 2×2 분할표',
        category: 'chi-square',
        icon: CheckCircle2,
        implemented: true
      }
    ]
  },
  {
    id: 'advanced',
    title: '고급 분석',
    description: '다변량 및 차원축소',
    icon: Zap,
    items: [
      {
        id: 'factor-analysis',
        href: '/statistics/factor-analysis',
        title: '요인분석',
        subtitle: '잠재 요인 추출',
        category: 'advanced',
        icon: Zap,
        implemented: true
      },
      {
        id: 'pca',
        href: '/statistics/pca',
        title: '주성분분석',
        subtitle: '차원 축소',
        category: 'advanced',
        icon: Zap,
        implemented: true
      },
      {
        id: 'cluster-analysis',
        href: '/statistics/cluster',
        title: '군집분석',
        subtitle: '유사 개체 그룹화',
        category: 'advanced',
        icon: GitBranch,
        implemented: true
      },
      {
        id: 'discriminant',
        href: '/statistics/discriminant',
        title: '판별분석',
        subtitle: '그룹 예측',
        category: 'advanced',
        icon: Activity,
        implemented: true
      }
    ]
  },
  {
    id: 'diagnostic',
    title: '진단 및 검정',
    description: '가정 검정 및 진단',
    icon: Microscope,
    items: [
      {
        id: 'normality-test',
        href: '/statistics/normality-test',
        title: '정규성 검정',
        subtitle: 'Shapiro-Wilk, Anderson-Darling',
        category: 'diagnostic',
        icon: Activity,
        implemented: true
      },
      {
        id: 'mann-kendall',
        href: '/statistics/mann-kendall',
        title: 'Mann-Kendall 추세 검정',
        subtitle: '시계열 단조 추세 검정',
        category: 'diagnostic',
        icon: TrendingUp,
        implemented: true
      },
      {
        id: 'power-analysis',
        href: '/statistics/power-analysis',
        title: '검정력 분석',
        subtitle: '표본크기, 효과크기 계산',
        category: 'diagnostic',
        icon: Zap,
        implemented: true
      }
    ]
  }
]

// 모든 메뉴 아이템을 플랫 리스트로 반환
export function getAllMenuItems(): StatisticsMenuItem[] {
  return STATISTICS_MENU.flatMap(category => category.items)
}

// 구현된 메뉴 아이템만 반환
export function getImplementedMenuItems(): StatisticsMenuItem[] {
  return getAllMenuItems().filter(item => item.implemented)
}

// 특정 카테고리의 메뉴 아이템 반환
export function getMenuItemsByCategory(categoryId: string): StatisticsMenuItem[] {
  const category = STATISTICS_MENU.find(cat => cat.id === categoryId)
  return category?.items || []
}

// 경로로 메뉴 아이템 찾기
export function getMenuItemByPath(path: string): StatisticsMenuItem | undefined {
  return getAllMenuItems().find(item => item.href === path)
}

// 통계 정보 요약
export const STATISTICS_SUMMARY = {
  totalMethods: getAllMenuItems().length,  // 동적 계산 (하드코딩 제거)
  implementedMethods: getImplementedMenuItems().length,
  categories: STATISTICS_MENU.length,
  completionRate: Math.round((getImplementedMenuItems().length / getAllMenuItems().length) * 100)
}

// 고급 방식으로 구현된 페이지들
export const ADVANCED_PAGES = [
  'frequency-table'
  // 향후 추가될 고급 페이지들
]