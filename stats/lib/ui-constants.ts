/**
 * UI 일관성을 위한 상수 정의
 * 디자인 시스템의 핵심 요소들을 중앙 관리
 */

// 색상 시스템
export const UI_COLORS = {
  // 통계 분석 관련 색상
  statistics: {
    primary: 'blue-600',
    secondary: 'blue-100',
    border: 'blue-500',
    background: 'blue-50',
    foreground: 'blue-900'
  },
  
  // 상태별 색상
  status: {
    success: {
      primary: 'emerald-600',
      secondary: 'emerald-100', 
      border: 'emerald-500',
      background: 'emerald-50',
      foreground: 'emerald-900'
    },
    error: {
      primary: 'red-600',
      secondary: 'red-100',
      border: 'red-500', 
      background: 'red-50',
      foreground: 'red-900'
    },
    warning: {
      primary: 'orange-600',
      secondary: 'orange-100',
      border: 'orange-500',
      background: 'orange-50', 
      foreground: 'orange-900'
    },
    info: {
      primary: 'blue-600',
      secondary: 'blue-100',
      border: 'blue-500',
      background: 'blue-50',
      foreground: 'blue-900'
    }
  },

  // 분석 카테고리별 색상
  categories: {
    descriptive: {
      primary: 'indigo-600',
      border: 'indigo-500',
      background: 'indigo-50'
    },
    ttest: {
      primary: 'green-600', 
      border: 'green-500',
      background: 'green-50'
    },
    anova: {
      primary: 'purple-600',
      border: 'purple-500', 
      background: 'purple-50'
    },
    regression: {
      primary: 'pink-600',
      border: 'pink-500',
      background: 'pink-50'
    },
    nonparametric: {
      primary: 'yellow-600',
      border: 'yellow-500',
      background: 'yellow-50'
    },
    advanced: {
      primary: 'slate-600',
      border: 'slate-500',
      background: 'slate-50'
    }
  }
} as const

// 아이콘 매핑
export const UI_ICONS = {
  statistics: {
    descriptive: 'BarChart3',
    comparison: 'TrendingUp', 
    correlation: 'Scatter3D',
    regression: 'LineChart',
    distribution: 'BarChart2',
    time_series: 'Timeline'
  },
  
  status: {
    loading: 'Loader2',
    success: 'CheckCircle',
    error: 'AlertCircle',
    warning: 'AlertTriangle',
    info: 'Info'
  },
  
  actions: {
    run: 'Play',
    download: 'Download', 
    refresh: 'RefreshCw',
    settings: 'Settings',
    help: 'HelpCircle',
    close: 'X'
  }
} as const

// 크기 시스템
export const UI_SIZES = {
  icons: {
    xs: 'h-3 w-3',
    sm: 'h-4 w-4', 
    md: 'h-5 w-5',
    lg: 'h-6 w-6',
    xl: 'h-8 w-8'
  },
  
  spacing: {
    xs: 2,
    sm: 4, 
    md: 6,
    lg: 8,
    xl: 12
  },
  
  borderRadius: {
    sm: 'rounded',
    md: 'rounded-lg',
    lg: 'rounded-xl'
  }
} as const

// 애니메이션 클래스
export const UI_ANIMATIONS = {
  transitions: {
    fast: 'transition-all duration-150',
    normal: 'transition-all duration-300', 
    slow: 'transition-all duration-500'
  },
  
  effects: {
    fadeIn: 'animate-in fade-in duration-300',
    slideIn: 'animate-in slide-in-from-bottom-2 duration-300',
    scaleIn: 'animate-in zoom-in-95 duration-200',
    spin: 'animate-spin',
    pulse: 'animate-pulse',
    bounce: 'animate-bounce'
  }
} as const

// 통계 분석 타입 매핑
export const ANALYSIS_TYPE_CONFIG = {
  '기술통계량': {
    category: 'descriptive',
    icon: 'BarChart3',
    color: UI_COLORS.categories.descriptive,
    description: '데이터의 기본적인 통계적 특성 분석'
  },
  '일표본 t-검정': {
    category: 'ttest', 
    icon: 'TrendingUp',
    color: UI_COLORS.categories.ttest,
    description: '하나의 그룹과 모집단 평균 비교'
  },
  '독립표본 t-검정': {
    category: 'ttest',
    icon: 'TrendingUp', 
    color: UI_COLORS.categories.ttest,
    description: '두 독립 그룹의 평균 비교'
  },
  '대응표본 t-검정': {
    category: 'ttest',
    icon: 'TrendingUp',
    color: UI_COLORS.categories.ttest, 
    description: '동일 대상의 사전-사후 비교'
  },
  '일원분산분석': {
    category: 'anova',
    icon: 'BarChart2',
    color: UI_COLORS.categories.anova,
    description: '세 개 이상 그룹의 평균 비교'
  },
  '상관분석': {
    category: 'regression',
    icon: 'Scatter3D', 
    color: UI_COLORS.categories.regression,
    description: '두 변수 간의 선형 관계 분석'
  },
  '단순선형회귀': {
    category: 'regression',
    icon: 'LineChart',
    color: UI_COLORS.categories.regression,
    description: '한 변수로 다른 변수 예측'
  }
} as const

// 공통 스타일 클래스
export const UI_STYLES = {
  cards: {
    default: 'bg-background border border-border rounded-lg shadow-sm',
    elevated: 'bg-background border border-border rounded-lg shadow-md',
    interactive: 'bg-background border border-border rounded-lg shadow-sm hover:shadow-md transition-shadow'
  },
  
  buttons: {
    primary: 'bg-primary text-primary-foreground hover:bg-primary/90',
    secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80', 
    outline: 'border border-input bg-background hover:bg-accent hover:text-accent-foreground',
    ghost: 'hover:bg-accent hover:text-accent-foreground'
  },
  
  text: {
    title: 'text-lg font-semibold text-foreground',
    subtitle: 'text-sm text-muted-foreground',
    body: 'text-sm text-foreground',
    caption: 'text-xs text-muted-foreground',
    mono: 'font-mono text-sm'
  }
} as const

// 반응형 그리드 시스템
export const UI_GRID = {
  columns: {
    1: 'grid-cols-1',
    2: 'grid-cols-1 md:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-2 md:grid-cols-4'
  },
  
  gaps: {
    sm: 'gap-2',
    md: 'gap-4', 
    lg: 'gap-6',
    xl: 'gap-8'
  }
} as const