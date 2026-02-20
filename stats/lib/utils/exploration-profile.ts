import type { StatisticalMethod } from '@/types/smart-flow'

/**
 * Exploration Profile System
 *
 * Controls section visibility and priority in DataExplorationStep
 * based on the pre-selected analysis method (quick analysis mode).
 *
 * - 'primary'   : Rendered normally (expanded, full opacity)
 * - 'secondary' : Rendered with reduced emphasis (opacity-60, "참고" badge)
 * - 'hidden'    : Not rendered at all
 */

export type SectionVisibility = 'primary' | 'secondary' | 'hidden'

export interface ExplorationProfile {
  /** Section: descriptive statistics table */
  descriptiveStats: SectionVisibility
  /** Section: data preview table */
  dataPreview: SectionVisibility
  /** Section: assumption tests (Shapiro-Wilk normality, Levene homogeneity) */
  assumptionTests: SectionVisibility
  /** Section: distribution visualization (histogram / boxplot) */
  distribution: SectionVisibility
  /** Default chart type for distribution section */
  defaultChartType: 'histogram' | 'boxplot'
  /** Section: scatterplots */
  scatterplots: SectionVisibility
  /** Section: correlation heatmap */
  correlationHeatmap: SectionVisibility
  /** Focus hint message shown to user (Korean) */
  focusHint: string
}

type MethodCategory = StatisticalMethod['category']

const PROFILES: Partial<Record<MethodCategory, ExplorationProfile>> = {
  't-test': {
    descriptiveStats: 'primary',
    dataPreview: 'secondary',
    assumptionTests: 'primary',
    distribution: 'primary',
    defaultChartType: 'boxplot',
    scatterplots: 'secondary',
    correlationHeatmap: 'secondary',
    focusHint: '\uC815\uADDC\uC131\uACFC \uB4F1\uBD84\uC0B0\uC131 \uAC80\uC815 \uACB0\uACFC\uB97C \uD655\uC778\uD558\uC138\uC694.',
  },
  'anova': {
    descriptiveStats: 'primary',
    dataPreview: 'secondary',
    assumptionTests: 'primary',
    distribution: 'primary',
    defaultChartType: 'boxplot',
    scatterplots: 'secondary',
    correlationHeatmap: 'secondary',
    focusHint: '\uADF8\uB8F9\uBCC4 \uBD84\uD3EC\uC640 \uB4F1\uBD84\uC0B0\uC131\uC744 \uD655\uC778\uD558\uC138\uC694.',
  },
  'correlation': {
    descriptiveStats: 'primary',
    dataPreview: 'secondary',
    assumptionTests: 'secondary',
    distribution: 'secondary',
    defaultChartType: 'histogram',
    scatterplots: 'primary',
    correlationHeatmap: 'primary',
    focusHint: '\uBCC0\uC218 \uAC04 \uC0B0\uC810\uB3C4\uC640 \uC0C1\uAD00\uACC4\uC218\uB97C \uD655\uC778\uD558\uC138\uC694.',
  },
  'regression': {
    descriptiveStats: 'primary',
    dataPreview: 'secondary',
    assumptionTests: 'secondary',
    distribution: 'primary',
    defaultChartType: 'histogram',
    scatterplots: 'primary',
    correlationHeatmap: 'primary',
    focusHint: '\uBCC0\uC218 \uAC04 \uC120\uD615 \uAD00\uACC4\uC640 \uC774\uC0C1\uCE58\uB97C \uD655\uC778\uD558\uC138\uC694.',
  },
  'chi-square': {
    descriptiveStats: 'primary',
    dataPreview: 'primary',
    assumptionTests: 'hidden',
    distribution: 'hidden',
    defaultChartType: 'histogram',
    scatterplots: 'hidden',
    correlationHeatmap: 'hidden',
    focusHint: '\uBC94\uC8FC\uD615 \uBCC0\uC218\uC758 \uBE48\uB3C4 \uBD84\uD3EC\uB97C \uD655\uC778\uD558\uC138\uC694.',
  },
  'nonparametric': {
    descriptiveStats: 'primary',
    dataPreview: 'secondary',
    assumptionTests: 'secondary',
    distribution: 'primary',
    defaultChartType: 'boxplot',
    scatterplots: 'secondary',
    correlationHeatmap: 'secondary',
    focusHint: '\uBD84\uD3EC \uD615\uD0DC\uC640 \uC774\uC0C1\uCE58\uB97C \uD655\uC778\uD558\uC138\uC694.',
  },
  'descriptive': {
    descriptiveStats: 'primary',
    dataPreview: 'primary',
    assumptionTests: 'primary',
    distribution: 'primary',
    defaultChartType: 'histogram',
    scatterplots: 'primary',
    correlationHeatmap: 'secondary',
    focusHint: '\uAE30\uCD08 \uD1B5\uACC4\uB7C9\uACFC \uBD84\uD3EC\uB97C \uD655\uC778\uD558\uC138\uC694.',
  },
  'timeseries': {
    descriptiveStats: 'primary',
    dataPreview: 'primary',
    assumptionTests: 'hidden',
    distribution: 'secondary',
    defaultChartType: 'histogram',
    scatterplots: 'secondary',
    correlationHeatmap: 'hidden',
    focusHint: '\uB370\uC774\uD130 \uAD6C\uC870\uC640 \uC2DC\uACC4\uC5F4 \uBCC0\uC218\uB97C \uD655\uC778\uD558\uC138\uC694.',
  },
}

/** Default profile: all sections visible (current behavior preserved) */
const DEFAULT_PROFILE: ExplorationProfile = {
  descriptiveStats: 'primary',
  dataPreview: 'primary',
  assumptionTests: 'primary',
  distribution: 'primary',
  defaultChartType: 'histogram',
  scatterplots: 'primary',
  correlationHeatmap: 'primary',
  focusHint: '',
}

/**
 * Get the exploration profile for a given method.
 * Returns default (show everything) when method is null or category has no specific profile.
 */
export function getExplorationProfile(
  method: StatisticalMethod | null
): ExplorationProfile {
  if (!method) return DEFAULT_PROFILE
  return PROFILES[method.category] ?? DEFAULT_PROFILE
}
