/**
 * Generic Statistical Terminology
 *
 * 범용 통계 용어 사전
 * - 도메인에 구애받지 않는 일반적인 통계 용어
 */

import type { TerminologyDictionary } from '../terminology-types'

export const generic: TerminologyDictionary = {
  domain: 'generic',
  displayName: '범용 통계',

  variables: {
    group: {
      title: 'Group Variable',
      description: 'Categorical variable defining groups to compare',
      shortLabel: 'Group'
    },
    dependent: {
      title: 'Dependent Variable (Y)',
      description: 'Numeric variable to compare across groups',
      shortLabel: 'Dependent'
    },
    independent: {
      title: 'Independent Variable (X)',
      description: 'Predictor variables',
      shortLabel: 'Independent'
    },
    factor: {
      title: 'Factor',
      description: 'Categorical factor variable',
      shortLabel: 'Factor'
    },
    covariate: {
      title: 'Covariate',
      description: 'Continuous control variable',
      shortLabel: 'Covariate'
    },
    time: {
      title: 'Time Variable',
      description: 'Time or sequence variable',
      shortLabel: 'Time'
    },
    event: {
      title: 'Event Variable',
      description: 'Binary outcome variable',
      shortLabel: 'Event'
    },
    pairedFirst: {
      title: 'Time 1 / Before',
      description: 'First measurement',
      shortLabel: 'Before'
    },
    pairedSecond: {
      title: 'Time 2 / After',
      description: 'Second measurement',
      shortLabel: 'After'
    },
    correlation: {
      title: 'Numeric Variables',
      description: 'Select 2 or more numeric variables to analyze correlations',
      shortLabel: 'Variables'
    }
  },

  validation: {
    groupRequired: 'Group variable is required',
    dependentRequired: 'Dependent variable is required',
    independentRequired: 'Independent variable is required',
    factorRequired: 'Factor is required',
    twoGroupsRequired: (current: number) =>
      `t-test requires exactly 2 groups (found ${current})`,
    minVariablesRequired: (min: number) =>
      `At least ${min} variable(s) required`,
    maxVariablesExceeded: (max: number) =>
      `Maximum ${max} variables allowed`,
    differentVariablesRequired: 'Please select two different variables',
    noNumericVariables: 'No numeric variables found',
    noCategoricalVariables: 'No categorical variables found'
  },

  success: {
    allVariablesSelected: 'All variables selected. Ready for analysis.',
    readyForAnalysis: 'Ready for analysis',
    variablesSelected: (count: number) =>
      `${count} variables selected. Ready for correlation analysis.`,
    correlationPairsCount: (count: number) =>
      `Will generate ${count} correlation pairs`,
    modelReady: (type: 'simple' | 'multiple', predictors: number) =>
      `${type === 'simple' ? 'Simple' : 'Multiple'} regression model ready. ${predictors} predictor(s) selected.`
  },

  selectorUI: {
    titles: {
      groupComparison: 'Group Comparison Variable Selection',
      oneSample: 'One-Sample Test Variable Selection',
      paired: 'Paired Samples Variable Selection',
      correlation: 'Correlation Variable Selection',
      multipleRegression: 'Multiple Regression Variable Selection',
      twoWayAnova: 'Two-way ANOVA Variable Selection'
    },
    descriptions: {
      groupComparison: 'Select a group variable and a dependent variable to compare',
      oneSample: 'Select a test variable and reference value',
      paired: 'Select two related measurements to compare (e.g., before/after)',
      correlation: 'Select 2 or more numeric variables to analyze correlations',
      multipleRegression: 'Select dependent (Y) and independent (X) variables',
      twoWayAnova: 'Select 2 categorical factors and 1 dependent variable'
    },
    buttons: {
      back: 'Back',
      runAnalysis: 'Run Analysis',
      selectAll: 'Select All',
      clear: 'Clear',
      swap: 'Swap'
    },
    labels: {
      selected: 'Selected',
      compare: 'Compare:',
      across: 'across',
      model: 'Model:',
      levels: 'levels',
      groups: 'groups',
      numeric: 'numeric',
      range: 'Range',
      mean: 'Mean'
    }
  },

  smartFlow: {
    stepTitles: {
      dataUpload: 'Data Upload',
      dataExploration: 'Data Exploration',
      purposeInput: 'Method Selection',
      variableSelection: 'Variable Selection',
      analysisExecution: 'Run Analysis',
      results: 'Results'
    },
    stepShortLabels: {
      exploration: 'Explore',
      method: 'Method',
      variable: 'Variables',
      analysis: 'Analyze'
    },
    statusMessages: {
      analyzing: 'Analyzing data...',
      analysisComplete: 'Analysis complete',
      uploadingData: 'Uploading data...',
      validatingData: 'Validating data...'
    },
    buttons: {
      runAnalysis: 'Run Analysis',
      reanalyze: 'Reanalyze with Different Data',
      downloadResults: 'Download Results',
      backToHub: 'Back to Hub'
    },
    resultSections: {
      effectSizeDetail: 'Effect Size Details'
    },
    executionStages: {
      prepare: { label: 'Preparing environment', message: 'Preparing analysis environment...' },
      preprocess: { label: 'Data preprocessing', message: 'Preprocessing data...' },
      assumptions: { label: 'Assumption testing', message: 'Testing statistical assumptions...' },
      analysis: { label: 'Statistical analysis', message: 'Running statistical analysis...' },
      additional: { label: 'Additional statistics', message: 'Computing additional statistics...' },
      finalize: { label: 'Finalizing results', message: 'Finalizing results...' }
    },
    layout: {
      appTitle: 'NIFS Statistics',
      historyTitle: 'Analysis History',
      historyClose: 'Close history',
      historyCount: (n: number) => `History (${n})`,
      aiChatbot: 'AI Chatbot',
      helpLabel: 'Help',
      settingsLabel: 'Settings',
      nextStep: 'Next Step',
      analyzingDefault: 'Analyzing...',
      dataSizeGuide: 'Data Size Guide',
      currentLimits: 'Current Limits',
      memoryRecommendation: 'Recommended by Memory',
      detectedMemory: (gb: number) => `→ Detected memory: ${gb}GB`,
      limitFileSize: 'Max file: 50MB',
      limitDataSize: 'Max data: 100,000 rows × 1,000 columns',
      limitRecommended: 'Recommended: under 10,000 rows',
      memoryTier4GB: '4GB RAM: ~10,000 rows',
      memoryTier8GB: '8GB RAM: ~30,000 rows',
      memoryTier16GB: '16GB RAM: ~60,000 rows',
    },
    execution: {
      runningTitle: 'Running Analysis',
      resumeButton: 'Resume',
      pauseButton: 'Pause',
      cancelButton: 'Cancel',
      pauseDisabledTooltip: 'Cannot pause after 75%',
      cancelConfirm: 'Are you sure you want to cancel?\nResults computed so far will not be saved.',
      logSectionLabel: (n: number) => `Execution log (${n} entries)`,
      noLogs: 'No logs available',
      dataRequired: 'Required data or method has not been selected.',
      unknownError: 'An unknown error occurred',
      estimatedTimeRemaining: (seconds: number) => `Estimated time remaining: ${seconds}s`,
    }
  },

  purposeInput: {
    purposes: {
      compare: {
        title: 'Group Comparison',
        description: 'Compare means or proportions across two or more groups.',
        examples: 'e.g., Compare growth rates across farms, weight gain by feed type, temperature by region'
      },
      relationship: {
        title: 'Variable Relationships',
        description: 'Analyze correlations and associations between two or more variables.',
        examples: 'e.g., Relationship between temperature and growth, correlation between height and weight'
      },
      distribution: {
        title: 'Distribution & Frequency',
        description: 'Examine data distributions and analyze categorical frequencies.',
        examples: 'e.g., Distribution of body length, proportion by category, density distribution by area'
      },
      prediction: {
        title: 'Predictive Modeling',
        description: 'Build models to predict outcomes using independent variables.',
        examples: 'e.g., Predict yield from temperature, predict growth from feed amount'
      },
      timeseries: {
        title: 'Time Series Analysis',
        description: 'Analyze temporal patterns and forecast future values.',
        examples: 'e.g., Monthly yield trends, yearly production changes, seasonal temperature patterns'
      },
      survival: {
        title: 'Survival Analysis',
        description: 'Analyze time-to-event data and identify risk factors.',
        examples: 'e.g., Survival duration, facility lifespan, time from disease onset to outcome'
      },
      multivariate: {
        title: 'Multivariate Analysis',
        description: 'Analyze multiple variables simultaneously for dimension reduction, factor extraction, or clustering.',
        examples: 'e.g., PCA for indicators, cluster analysis for grouping, discriminant analysis for classification'
      },
      utility: {
        title: 'Research Design Tools',
        description: 'Calculate sample sizes, power analysis, and reliability assessment.',
        examples: 'e.g., Required sample size, Cronbach α reliability, power analysis'
      }
    },
    inputModes: {
      aiRecommend: 'AI Recommend',
      directSelect: 'Browse All',
      modeAriaLabel: 'Analysis method selection mode'
    },
    buttons: {
      back: 'Back',
      allMethods: 'All Methods',
      useThisMethod: 'Use This Method'
    },
    labels: {
      selectionPrefix: 'Selected:',
      directBadge: 'Manual',
      purposeHeading: 'What analysis would you like to perform?'
    },
    messages: {
      purposeHelp: 'Select one of the 8 analysis purposes. Guided questions will help recommend the best statistical method.',
      guidanceAlert: 'Select an analysis purpose above to get step-by-step guidance for choosing the optimal statistical method.',
      aiRecommendError: 'Failed to generate recommendation. Please try again.',
      genericError: 'An error occurred. Please try again.',
    },
    aiLabels: {
      recommendTitle: 'AI Recommended Analysis',
    },
  },

  fitScore: {
    levels: {
      excellent: { label: 'Excellent Fit', shortLabel: 'Optimal', description: 'Highly suitable for your data' },
      good: { label: 'Good Fit', shortLabel: 'Good', description: 'Works well with your data' },
      caution: { label: 'Use with Caution', shortLabel: 'Caution', description: 'Some conditions are not met' },
      poor: { label: 'Poor Fit', shortLabel: 'Poor', description: 'Consider alternative methods' },
      unknown: { label: 'Cannot Evaluate', shortLabel: 'Unknown', description: 'Insufficient data information' },
    },
  },

  analysisInfo: {
    cardTitle: 'Analysis Info',
    labels: {
      fileName: 'File Name',
      dataSize: 'Data Size',
      method: 'Method',
      analysisTime: 'Analysis Time',
      dataQuality: 'Data Quality',
      assumptions: 'Assumption Tests',
      variables: 'Variable Configuration',
    },
    variableRoles: {
      dependent: 'Dependent',
      independent: 'Independent',
      group: 'Group',
      factor: 'Factor',
      paired: 'Paired',
    },
    dataQuality: {
      missingValues: (count: number, percent: string) => `${count} missing values (${percent}%)`,
      duplicateRows: (count: number) => `${count} duplicate rows`,
      warnings: (count: number) => `${count} warning(s)`,
    },
    assumptions: {
      normality: 'Normality',
      homogeneity: 'Homogeneity',
      independence: 'Independence',
      met: 'Met',
      partialViolation: 'Partial Violation',
      allGroupsNormal: 'All groups normal',
      someGroupsNonNormal: 'Some groups non-normal',
    },
    units: {
      rows: 'rows',
      nVariables: (count: number) => `${count} variables`,
    },
  },

  history: {
    empty: {
      title: 'No analysis history',
      description: 'Completed analyses are automatically saved',
    },
    recordCount: (n: number) => `${n} records`,
    buttons: {
      saveCurrent: 'Save Current Analysis',
      clearAll: 'Clear All',
      cancel: 'Cancel',
      save: 'Save',
      delete: 'Delete',
    },
    labels: {
      filterByMethod: 'Filter by Method',
      showAll: 'Show All',
      searchPlaceholder: 'Search history...',
      noMethod: 'No method',
      noPurpose: 'No purpose',
      current: 'Current',
      rows: 'rows',
      pValue: 'p-value:',
      effectSize: 'Effect size:',
    },
    tooltips: {
      viewResults: 'View saved results',
      reanalyze: 'Analyze new data with this method',
      delete: 'Delete',
    },
    dialogs: {
      deleteTitle: 'Delete Analysis History',
      deleteDescription: 'Are you sure you want to delete this analysis history? This action cannot be undone.',
      clearTitle: 'Clear All History',
      clearDescription: (count: number) => `Delete all ${count} analysis history records?\nThis action cannot be undone.`,
      saveTitle: 'Save Current Analysis',
      saveDescription: 'Name and save the current analysis.',
      analysisName: 'Analysis Name',
      savePlaceholder: 'e.g., 2024 Experiment Data T-test',
    },
  },
}
