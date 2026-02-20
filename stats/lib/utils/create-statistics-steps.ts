/**
 * Statistics Page Steps Configuration Utility
 *
 * Provides standardized step configurations for statistics pages.
 * Ensures consistency across all 49 statistics pages.
 */

export interface StatisticsStep {
  id: number
  label: string
  completed?: boolean
}

export interface CreateStepsConfig {
  /**
   * Current step index (1-based)
   * Used to determine completed state
   */
  currentStep?: number

  /**
   * Whether the analysis has results
   * Affects final step completion status
   */
  hasResults?: boolean

  /**
   * Input mode for pages with multiple input types
   * 'raw' = data upload, 'summary' = summary statistics
   */
  inputMode?: 'raw' | 'summary'

  /**
   * Custom step labels (overrides defaults)
   * Useful for pages with unique workflows
   */
  customLabels?: Partial<{
    intro: string
    upload: string
    variables: string
    results: string
  }>

  /**
   * Include intro step (default: true for most pages)
   */
  includeIntro?: boolean

  /**
   * Include type selection step (for pages like t-test)
   */
  includeTypeSelection?: boolean
}

/**
 * Default step labels used across statistics pages
 */
const DEFAULT_LABELS = {
  intro: 'Introduction',
  typeSelection: 'Test Type',
  upload: 'Data Upload',
  summaryInput: 'Summary Input',
  variables: 'Variables',
  results: 'Results'
} as const

/**
 * Create standardized steps for statistics pages
 *
 * @example
 * // Basic usage
 * const steps = createStatisticsSteps({ currentStep: 2 })
 *
 * @example
 * // With type selection (like t-test)
 * const steps = createStatisticsSteps({
 *   currentStep: 2,
 *   includeTypeSelection: true
 * })
 *
 * @example
 * // Summary input mode
 * const steps = createStatisticsSteps({
 *   currentStep: 2,
 *   inputMode: 'summary'
 * })
 */
export function createStatisticsSteps(config: CreateStepsConfig = {}): StatisticsStep[] {
  const {
    currentStep = 1,
    hasResults = false,
    inputMode = 'raw',
    customLabels = {},
    includeIntro = true,
    includeTypeSelection = false
  } = config

  const labels = { ...DEFAULT_LABELS, ...customLabels }

  let baseSteps: Array<{ id: number; label: string }>

  if (inputMode === 'summary') {
    // Summary statistics input workflow (fewer steps)
    baseSteps = includeTypeSelection
      ? [
          { id: 1, label: labels.typeSelection },
          { id: 2, label: labels.summaryInput },
          { id: 3, label: labels.results }
        ]
      : [
          { id: 1, label: labels.intro },
          { id: 2, label: labels.summaryInput },
          { id: 3, label: labels.results }
        ]
  } else {
    // Standard data upload workflow
    if (includeTypeSelection) {
      baseSteps = [
        { id: 1, label: labels.typeSelection },
        { id: 2, label: labels.upload },
        { id: 3, label: labels.variables },
        { id: 4, label: labels.results }
      ]
    } else if (includeIntro) {
      baseSteps = [
        { id: 1, label: labels.intro },
        { id: 2, label: labels.upload },
        { id: 3, label: labels.variables },
        { id: 4, label: labels.results }
      ]
    } else {
      baseSteps = [
        { id: 1, label: labels.upload },
        { id: 2, label: labels.variables },
        { id: 3, label: labels.results }
      ]
    }
  }

  // Apply completed state based on currentStep
  return baseSteps.map((step, index) => {
    const isLastStep = index === baseSteps.length - 1
    const completed = isLastStep
      ? hasResults
      : currentStep > step.id

    return {
      ...step,
      completed
    }
  })
}

/**
 * Pre-configured step generators for common patterns
 */
export const statisticsStepPresets = {
  /**
   * Standard 4-step workflow with intro
   * Used by most statistics pages
   */
  standard: (currentStep: number, hasResults = false) =>
    createStatisticsSteps({ currentStep, hasResults, includeIntro: true }),

  /**
   * Type selection workflow (like t-test, ANOVA)
   * Step 1 is test type selection instead of intro
   */
  withTypeSelection: (currentStep: number, hasResults = false) =>
    createStatisticsSteps({ currentStep, hasResults, includeTypeSelection: true }),

  /**
   * Summary statistics input workflow
   * Fewer steps, no data upload
   */
  summaryInput: (currentStep: number, hasResults = false) =>
    createStatisticsSteps({ currentStep, hasResults, inputMode: 'summary' }),

  /**
   * Minimal workflow without intro
   * Used for simple analysis pages
   */
  minimal: (currentStep: number, hasResults = false) =>
    createStatisticsSteps({ currentStep, hasResults, includeIntro: false })
} as const
