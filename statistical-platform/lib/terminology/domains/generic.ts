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
    }
  }
}
