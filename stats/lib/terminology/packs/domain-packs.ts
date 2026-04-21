import type { AppTerminologyDomain } from '@/lib/preferences'
import type {
  SelectorUIText,
  SuccessMessages,
  ValidationMessages,
  VariableSelectorTerminology,
} from '../terminology-types'
import type { DomainPack } from './pack-types'
import { aquaculture } from '../domains/aquaculture'
import { generic } from '../domains/generic'
import { extractDomainOwnedSections } from './extract-pack-sections'
import {
  AQUACULTURE_EN_HUB,
  AQUACULTURE_EN_PURPOSE_INPUT,
  GENERIC_KO_HUB,
  GENERIC_KO_PURPOSE_INPUT,
} from './mixed-section-overrides'

const GENERIC_KO_VARIABLES: VariableSelectorTerminology = {
  group: {
    title: '그룹 변수',
    description: '비교할 집단을 정의하는 범주형 변수',
    shortLabel: '그룹',
  },
  dependent: {
    title: '종속 변수 (Y)',
    description: '집단 간 차이를 비교하거나 설명할 수치형 결과 변수',
    shortLabel: '종속',
  },
  independent: {
    title: '독립 변수 (X)',
    description: '결과를 예측하거나 설명하는 변수',
    shortLabel: '독립',
  },
  factor: {
    title: '요인',
    description: '범주형 요인 변수',
    shortLabel: '요인',
  },
  covariate: {
    title: '공변량',
    description: '모형에서 함께 보정하는 연속형 통제 변수',
    shortLabel: '공변량',
  },
  time: {
    title: '시간 변수',
    description: '시간 또는 순서를 나타내는 변수',
    shortLabel: '시간',
  },
  event: {
    title: '사건 변수',
    description: '이진 사건 결과를 나타내는 변수',
    shortLabel: '사건',
  },
  pairedFirst: {
    title: '시점 1 / 이전',
    description: '첫 번째 측정값',
    shortLabel: '이전',
  },
  pairedSecond: {
    title: '시점 2 / 이후',
    description: '두 번째 측정값',
    shortLabel: '이후',
  },
  correlation: {
    title: '연속형 변수',
    description: '상관관계를 분석할 2개 이상의 연속형 변수',
    shortLabel: '변수',
  },
}

const GENERIC_KO_VALIDATION: ValidationMessages = {
  groupRequired: '그룹 변수가 필요합니다',
  dependentRequired: '종속 변수가 필요합니다',
  independentRequired: '독립 변수가 필요합니다',
  factorRequired: '요인이 필요합니다',
  twoGroupsRequired: (current: number) => `t-검정에는 정확히 2개 그룹이 필요합니다 (현재 ${current}개)`,
  minVariablesRequired: (min: number) => `최소 ${min}개 변수 필요`,
  maxVariablesExceeded: (max: number) => `최대 ${max}개 변수까지 선택할 수 있습니다`,
  differentVariablesRequired: '서로 다른 두 변수를 선택하세요',
  noNumericVariables: '연속형 변수를 찾을 수 없습니다',
  noCategoricalVariables: '범주형 변수를 찾을 수 없습니다',
}

const GENERIC_KO_SUCCESS: SuccessMessages = {
  allVariablesSelected: '모든 변수를 선택했습니다. 분석할 준비가 되었습니다.',
  readyForAnalysis: '분석 준비 완료',
  variablesSelected: (count: number) => `${count}개 변수를 선택했습니다. 상관분석을 시작할 수 있습니다.`,
  correlationPairsCount: (count: number) => `${count}개 상관 쌍이 생성됩니다`,
  modelReady: (type: 'simple' | 'multiple', predictors: number) =>
    `${type === 'simple' ? '단순' : '다중'} 회귀 모델 준비 완료. 예측변수 ${predictors}개 선택됨.`,
}

const GENERIC_KO_SELECTOR_UI: SelectorUIText = {
  ...aquaculture.selectorUI,
  titles: {
    groupComparison: '집단 비교 변수 선택',
    oneSample: '일표본 검정 변수 선택',
    paired: '대응 표본 변수 선택',
    correlation: '상관분석 변수 선택',
    multipleRegression: '다중회귀 변수 선택',
    twoWayAnova: '이원 ANOVA 변수 선택',
  },
  descriptions: {
    groupComparison: '비교할 그룹 변수와 종속 변수를 선택하세요',
    oneSample: '검정 변수와 기준값을 선택하세요',
    paired: '대응되는 두 측정값을 선택하세요 (예: 전/후)',
    correlation: '상관관계를 분석할 2개 이상의 연속형 변수를 선택하세요',
    multipleRegression: '종속변수(Y)와 독립변수(X)를 선택하세요',
    twoWayAnova: '2개의 범주형 요인과 1개의 종속 변수를 선택하세요',
  },
}

const AQUACULTURE_EN_VARIABLES: VariableSelectorTerminology = {
  group: {
    title: 'Experimental Group',
    description: 'Categorical variable defining the treatment or cohort to compare.',
    shortLabel: 'Group',
  },
  dependent: {
    title: 'Measurement Variable (Y)',
    description: 'Numeric measurement compared across experimental groups.',
    shortLabel: 'Measurement',
  },
  independent: {
    title: 'Factor Variable (X)',
    description: 'Predictor factor such as water temperature, salinity, or dissolved oxygen.',
    shortLabel: 'Factor',
  },
  factor: {
    title: 'Treatment Condition',
    description: 'Experimental treatment condition such as feed type, temperature level, or density.',
    shortLabel: 'Treatment',
  },
  covariate: {
    title: 'Covariate',
    description: 'Control variable such as baseline weight or baseline length.',
    shortLabel: 'Covariate',
  },
  time: {
    title: 'Time Variable',
    description: 'Elapsed time variable such as culture days or sampling week.',
    shortLabel: 'Time',
  },
  event: {
    title: 'Event Variable',
    description: 'Observed event such as mortality or maturation.',
    shortLabel: 'Event',
  },
  pairedFirst: {
    title: 'Before Treatment / Time 1',
    description: 'First measurement, such as pre-treatment body weight.',
    shortLabel: 'Before',
  },
  pairedSecond: {
    title: 'After Treatment / Time 2',
    description: 'Second measurement, such as post-treatment body weight.',
    shortLabel: 'After',
  },
  correlation: {
    title: 'Continuous Variables',
    description: 'Continuous variables used for correlation analysis, such as weight, length, and temperature.',
    shortLabel: 'Variables',
  },
}

const AQUACULTURE_EN_VALIDATION: ValidationMessages = {
  groupRequired: 'An experimental group variable is required',
  dependentRequired: 'A measurement variable is required',
  independentRequired: 'A factor variable is required',
  factorRequired: 'A treatment condition is required',
  twoGroupsRequired: (current: number) => `The t-test requires exactly 2 groups (found ${current})`,
  minVariablesRequired: (min: number) => `At least ${min} variable(s) are required`,
  maxVariablesExceeded: (max: number) => `You can select up to ${max} variables`,
  differentVariablesRequired: 'Please choose different variables',
  noNumericVariables: 'No continuous variables found',
  noCategoricalVariables: 'No categorical variables found',
}

const AQUACULTURE_EN_SUCCESS: SuccessMessages = {
  allVariablesSelected: 'All variables are assigned. Ready to run the aquaculture analysis.',
  readyForAnalysis: 'Ready for analysis',
  variablesSelected: (count: number) => `${count} variables selected. Ready to start the correlation analysis.`,
  correlationPairsCount: (count: number) => `${count} correlation pairs will be computed`,
  modelReady: (type: 'simple' | 'multiple', predictors: number) =>
    `${type === 'simple' ? 'Simple' : 'Multiple'} regression model ready. ${predictors} predictor(s) selected.`,
}

const AQUACULTURE_EN_SELECTOR_UI: SelectorUIText = {
  ...generic.selectorUI,
  titles: {
    groupComparison: 'Experimental Group Comparison Setup',
    oneSample: 'One-Sample Aquaculture Test Setup',
    paired: 'Before/After Measurement Setup',
    correlation: 'Aquaculture Correlation Setup',
    multipleRegression: 'Aquaculture Regression Setup',
    twoWayAnova: 'Two-way ANOVA Setup',
  },
  descriptions: {
    groupComparison: 'Select the experimental group and measurement variable to compare, such as fish weight by farm or feed type.',
    oneSample: 'Select the measurement variable and benchmark value, such as average body weight against 100 g.',
    paired: 'Select two matched measurements from the same individuals, such as pre/post-treatment weight.',
    correlation: 'Select 2 or more continuous variables, such as body weight, total length, and water temperature.',
    multipleRegression: 'Select the measurement outcome (Y) and factor variables (X), such as growth rate predicted by temperature and salinity.',
    twoWayAnova: 'Select 2 treatment conditions and 1 measurement variable.',
  },
}

export const DOMAIN_PACKS: Record<AppTerminologyDomain, DomainPack> = {
  aquaculture: {
    domain: 'aquaculture',
    displayNames: {
      ko: '수산과학',
      en: 'Aquaculture',
    },
    sectionsByLanguage: {
      ko: extractDomainOwnedSections(aquaculture),
    },
    exactDictionaries: {
      ko: aquaculture,
    },
    overrides: {
      en: {
        displayName: 'Aquaculture',
        purposeInput: AQUACULTURE_EN_PURPOSE_INPUT,
        hub: AQUACULTURE_EN_HUB,
        variables: AQUACULTURE_EN_VARIABLES,
        validation: AQUACULTURE_EN_VALIDATION,
        success: AQUACULTURE_EN_SUCCESS,
        selectorUI: AQUACULTURE_EN_SELECTOR_UI,
      },
    },
  },
  generic: {
    domain: 'generic',
    displayNames: {
      ko: '범용 통계',
      en: 'General Statistics',
    },
    sectionsByLanguage: {
      en: extractDomainOwnedSections(generic),
    },
    exactDictionaries: {
      en: generic,
    },
    overrides: {
      ko: {
        displayName: '범용 통계',
        purposeInput: GENERIC_KO_PURPOSE_INPUT,
        hub: GENERIC_KO_HUB,
        variables: GENERIC_KO_VARIABLES,
        validation: GENERIC_KO_VALIDATION,
        success: GENERIC_KO_SUCCESS,
        selectorUI: GENERIC_KO_SELECTOR_UI,
      },
    },
  },
  medical: {
    domain: 'medical',
    displayNames: {
      ko: '의학 연구',
      en: 'Medical Research',
    },
  },
}
