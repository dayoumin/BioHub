import type { Layout, Config, Font } from 'plotly.js'
import { getResponsiveChartLayout } from '@/lib/hooks/useResponsive'

/**
 * Plotly 중앙화 설정
 * 모든 차트에서 일관된 스타일을 사용하기 위한 설정
 */

// 기본 폰트 설정 (볼드 제거, 크기 통일)
export const DEFAULT_FONT: Partial<Font> = {
  family: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
  size: 12,
  color: 'hsl(var(--foreground))',
  // weight 속성 제거 (볼드 사용 안함)
}

// 타이틀 폰트 설정
export const TITLE_FONT: Partial<Font> = {
  ...DEFAULT_FONT,
  size: 14
}

// 축 레이블 폰트 설정
export const AXIS_FONT: Partial<Font> = {
  ...DEFAULT_FONT,
  size: 11
}

// 기본 마진 설정 (레이블 잘림 방지)
export const DEFAULT_MARGINS = {
  l: 70, // 왼쪽 마진 증가 (레이블 공간)
  r: 50,
  t: 50,
  b: 60,
  pad: 4
}

// 컴팩트 마진 (작은 차트용)
export const COMPACT_MARGINS = {
  l: 60,
  r: 40,
  t: 40,
  b: 50,
  pad: 2
}

// 흑백 기본 레이아웃 설정
export const getDefaultLayout = (customLayout?: Partial<Layout>): Partial<Layout> => {
  return {
    autosize: true,
    margin: DEFAULT_MARGINS,
    paper_bgcolor: '#FFFFFF',
    plot_bgcolor: '#FAFAFA',
    font: DEFAULT_FONT,
    title: {
      font: TITLE_FONT,
      x: 0.5,
      xanchor: 'center'
    },
    xaxis: {
      gridcolor: '#E0E0E0',
      zerolinecolor: '#808080',
      linecolor: '#000000',
      tickfont: AXIS_FONT,
      titlefont: AXIS_FONT,
      automargin: true,
      showgrid: true,
      gridwidth: 1,
      griddash: 'dot'
    } as any,
    yaxis: {
      gridcolor: '#E0E0E0',
      zerolinecolor: '#808080',
      linecolor: '#000000',
      tickfont: AXIS_FONT,
      titlefont: AXIS_FONT,
      automargin: true,
      showgrid: true,
      gridwidth: 1,
      griddash: 'dot'
    } as any,
    hoverlabel: {
      font: { ...DEFAULT_FONT, color: '#FFFFFF' },
      bgcolor: 'rgba(0, 0, 0, 0.8)',
      bordercolor: '#FFFFFF',
      namelength: -1
    },
    hovermode: 'closest' as const,
    showlegend: true,
    legend: {
      font: AXIS_FONT,
      bgcolor: 'rgba(255, 255, 255, 0.9)',
      bordercolor: '#000000',
      borderwidth: 1
    },
    ...customLayout
  }
}

// 히트맵 전용 레이아웃 (반응형 지원)
export const getHeatmapLayout = (customLayout?: Partial<Layout>, isMobile = false, isTablet = false): Partial<Layout> => {
  const responsiveLayout = getResponsiveChartLayout(isMobile, isTablet)
  return getDefaultLayout({
    ...responsiveLayout,
    margin: {
      ...responsiveLayout.margin,
      l: isMobile ? 50 : 90, // 모바일에서는 왼쪽 마진 축소
      b: isMobile ? 60 : 80
    },
    ...customLayout
  })
}

// 모달/다이얼로그용 레이아웃 (반응형 지원)
export const getModalLayout = (customLayout?: Partial<Layout>, isMobile = false, isTablet = false): Partial<Layout> => {
  const responsiveLayout = getResponsiveChartLayout(isMobile, isTablet)
  return getDefaultLayout({
    height: isMobile ? 300 : isTablet ? 400 : 500,
    width: undefined, // 자동 너비
    margin: responsiveLayout.margin || DEFAULT_MARGINS,
    ...customLayout
  })
}

// 기본 설정
export const DEFAULT_CONFIG: Partial<Config> = {
  responsive: true,
  displayModeBar: true,
  displaylogo: false,
  modeBarButtonsToRemove: ['pan2d', 'lasso2d', 'select2d', 'autoScale2d'] as any,
  modeBarButtonsToAdd: [] as any,
  toImageButtonOptions: {
    format: 'png',
    filename: 'statistical-chart',
    height: 600,
    width: 800,
    scale: 2
  },
  locale: 'ko',
  doubleClick: 'reset'
}

// 인터랙티브 설정 (호버 활성화)
export const INTERACTIVE_CONFIG: Partial<Config> = {
  ...DEFAULT_CONFIG,
  staticPlot: false,
  scrollZoom: true
}

// 정적 설정 (상호작용 최소화)
export const STATIC_CONFIG: Partial<Config> = {
  ...DEFAULT_CONFIG,
  staticPlot: true,
  displayModeBar: false
}

// 흑백 색상 팔레트
export const COLOR_PALETTE = {
  primary: '#000000',      // 검정
  secondary: '#666666',    // 중간 회색
  accent: '#333333',       // 진한 회색
  muted: '#999999',        // 연한 회색
  destructive: '#444444',  // 어두운 회색
  chart: [
    '#000000',  // 검정
    '#2D2D2D',  // 매우 진한 회색
    '#4A4A4A',  // 진한 회색
    '#666666',  // 중간 회색
    '#808080',  // 표준 회색
    '#999999',  // 연한 회색
    '#B3B3B3',  // 밝은 회색
    '#CCCCCC'   // 매우 밝은 회색
  ],
  // 패턴을 사용한 구분 (차트 타입별)
  patterns: [
    '',           // 솔리드
    '/',          // 대각선
    '\\',        // 역대각선
    '|',          // 수직선
    '-',          // 수평선
    '+',          // 크로스
    '.',          // 점
    'x'           // X 패턴
  ]
}

// 흑백 차트 스타일
export const CHART_STYLES = {
  histogram: {
    marker: {
      color: '#666666',
      opacity: 0.8,
      line: {
        color: '#000000',
        width: 2
      }
    }
  },
  box: {
    marker: {
      color: '#808080',
      opacity: 0.7
    },
    line: {
      color: '#000000',
      width: 2
    },
    fillcolor: 'rgba(128, 128, 128, 0.5)'
  },
  bar: {
    marker: {
      color: '#404040',
      opacity: 0.9,
      line: {
        color: '#000000',
        width: 1
      }
    }
  },
  scatter: {
    marker: {
      color: '#333333',
      size: 8,
      symbol: 'circle',
      line: {
        color: '#000000',
        width: 1
      }
    }
  },
  heatmap: {
    colorscale: [
      [0, '#FFFFFF'],     // 흰색
      [0.25, '#CCCCCC'],  // 매우 연한 회색
      [0.5, '#808080'],   // 중간 회색
      [0.75, '#404040'],  // 진한 회색
      [1, '#000000']      // 검정
    ],
    reversescale: false,
    showscale: true,
    colorbar: {
      thickness: 15,
      len: 0.7,
      tickfont: AXIS_FONT,
      outlinecolor: '#000000',
      outlinewidth: 1
    }
  }
}

// 다크 모드용 흑백 레이아웃
export const getDarkLayout = (customLayout?: Partial<Layout>): Partial<Layout> => {
  return {
    autosize: true,
    margin: DEFAULT_MARGINS,
    paper_bgcolor: '#1A1A1A',
    plot_bgcolor: '#0F0F0F',
    font: { ...DEFAULT_FONT, color: '#E0E0E0' },
    title: {
      font: { ...TITLE_FONT, color: '#E0E0E0' },
      x: 0.5,
      xanchor: 'center'
    },
    xaxis: {
      gridcolor: '#333333',
      zerolinecolor: '#666666',
      linecolor: '#E0E0E0',
      tickfont: { ...AXIS_FONT, color: '#E0E0E0' },
      title: { font: { ...AXIS_FONT, color: '#E0E0E0' } },
      automargin: true,
      showgrid: true,
      gridwidth: 1,
      griddash: 'dot'
    },
    yaxis: {
      gridcolor: '#333333',
      zerolinecolor: '#666666',
      linecolor: '#E0E0E0',
      tickfont: { ...AXIS_FONT, color: '#E0E0E0' },
      title: { font: { ...AXIS_FONT, color: '#E0E0E0' } },
      automargin: true,
      showgrid: true,
      gridwidth: 1,
      griddash: 'dot'
    },
    hoverlabel: {
      font: { ...DEFAULT_FONT, color: '#000000' },
      bgcolor: '#FFFFFF',
      bordercolor: '#FFFFFF'
    },
    showlegend: true,
    legend: {
      font: { ...AXIS_FONT, color: '#E0E0E0' },
      bgcolor: 'rgba(26, 26, 26, 0.9)',
      bordercolor: '#E0E0E0',
      borderwidth: 1
    },
    ...customLayout
  }
}

// 반응형 브레이크포인트
export const BREAKPOINTS = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280
}

// 화면 크기에 따른 레이아웃 조정
export const getResponsiveLayout = (width: number, baseLayout?: Partial<Layout>): Partial<Layout> => {
  const layout = baseLayout || getDefaultLayout()

  if (width < BREAKPOINTS.sm) {
    // 모바일
    return {
      ...layout,
      margin: COMPACT_MARGINS,
      font: { ...DEFAULT_FONT, size: 10 }
    }
  } else if (width < BREAKPOINTS.md) {
    // 태블릿
    return {
      ...layout,
      margin: COMPACT_MARGINS
    }
  }

  // 데스크톱
  return layout
}