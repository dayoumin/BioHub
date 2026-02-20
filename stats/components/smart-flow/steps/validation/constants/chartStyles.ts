export const VALIDATION_CHART_COLORS = {
  primary: '#3B82F6',
  secondary: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',
  muted: '#6B7280'
} as const

export const CORRELATION_HEATMAP_COLORS = [
  [0, '#2563EB'],    // Strong negative (blue)
  [0.5, '#FFFFFF'],  // Neutral (white)
  [1, '#DC2626']     // Strong positive (red)
] as const

export const CHART_MARGINS = {
  small: { l: 50, r: 30, t: 20, b: 50 },
  medium: { l: 60, r: 30, t: 20, b: 40 },
  large: { l: 80, r: 40, t: 40, b: 60 }
} as const

export const CHART_CONFIG = {
  displayModeBar: true,
  displaylogo: false,
  responsive: true,
  toImageButtonOptions: {
    format: 'png',
    filename: 'chart',
    height: 500,
    width: 700,
    scale: 1
  }
} as const