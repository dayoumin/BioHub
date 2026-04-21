import type { HubText, PurposeInputText } from '../terminology-types'
import { aquaculture } from '../domains/aquaculture'
import { generic } from '../domains/generic'

const GENERIC_KO_PURPOSES: PurposeInputText['purposes'] = {
  compare: {
    title: '그룹 비교',
    description: '두 개 이상의 그룹 간 평균이나 비율 차이를 비교합니다.',
    examples: '예: 반별 시험 점수 비교, 치료군별 회복률 비교, 지역별 온도 차이',
  },
  relationship: {
    title: '변수 간 관계',
    description: '두 개 이상의 변수 간 상관관계나 연관성을 분석합니다.',
    examples: '예: 키와 몸무게의 관계, 온도와 판매량의 관계',
  },
  distribution: {
    title: '분포와 빈도',
    description: '데이터 분포를 확인하고 범주형 빈도를 분석합니다.',
    examples: '예: 점수 분포, 범주별 비율, 지역별 밀도 분포',
  },
  prediction: {
    title: '예측 모델링',
    description: '독립변수로 결과값을 예측하는 모델을 만듭니다.',
    examples: '예: 온도로 수요 예측, 투입량으로 성과 예측',
  },
  timeseries: {
    title: '시계열 분석',
    description: '시간 흐름에 따른 패턴을 분석하고 미래 값을 예측합니다.',
    examples: '예: 월별 판매 추이, 연도별 생산량 변화, 계절별 기온 패턴',
  },
  survival: {
    title: '생존 분석',
    description: '사건 발생까지의 시간을 분석하고 위험 요인을 파악합니다.',
    examples: '예: 회복까지 걸린 시간, 장비 수명, 질병 발생 후 결과까지의 시간',
  },
  multivariate: {
    title: '다변량 분석',
    description: '여러 변수를 동시에 분석해 차원 축소, 요인 추출, 군집화를 수행합니다.',
    examples: '예: 지표 차원 축소(PCA), 군집 분석, 판별 분석',
  },
  utility: {
    title: '연구 설계 도구',
    description: '표본 크기, 검정력, 신뢰도를 계산합니다.',
    examples: '예: 필요 표본 수, Cronbach α 신뢰도, 검정력 분석',
  },
}

const AQUACULTURE_EN_PURPOSES: PurposeInputText['purposes'] = {
  compare: {
    title: 'Compare Groups',
    description: 'Compare means or proportions across two or more aquaculture groups.',
    examples: 'e.g., Compare fish growth rates across farms, weight gain by feed type, or water temperature by region',
  },
  relationship: {
    title: 'Variable Relationships',
    description: 'Analyze correlations or associations among aquaculture variables.',
    examples: 'e.g., Relationship between water temperature and growth, salinity and survival, or body length and weight',
  },
  distribution: {
    title: 'Distribution & Frequency',
    description: 'Inspect data distributions and categorical frequencies in aquaculture datasets.',
    examples: 'e.g., Fish body-length distribution, catch share by species, plankton density by region',
  },
  prediction: {
    title: 'Predictive Modeling',
    description: 'Build models that predict outcomes using aquaculture predictors.',
    examples: 'e.g., Predict catch from temperature, growth from feed amount, or mortality from environmental factors',
  },
  timeseries: {
    title: 'Time Series Analysis',
    description: 'Analyze temporal patterns and forecast future values in aquaculture data.',
    examples: 'e.g., Monthly catch trends, annual production changes, or seasonal water-temperature patterns',
  },
  survival: {
    title: 'Survival Analysis',
    description: 'Analyze time-to-event outcomes and identify aquaculture risk factors.',
    examples: 'e.g., Fry survival duration, facility lifespan, or time from disease onset to mortality',
  },
  multivariate: {
    title: 'Multivariate Analysis',
    description: 'Analyze multiple aquaculture variables together for reduction, grouping, or classification.',
    examples: 'e.g., PCA for water-quality indicators, clustering fish farms, or discriminant analysis for species groups',
  },
  utility: {
    title: 'Research Design Tools',
    description: 'Estimate sample sizes, statistical power, and reliability for aquaculture studies.',
    examples: 'e.g., Required sample size for feeding trials, Cronbach alpha reliability, or power analysis',
  },
}

export const GENERIC_KO_PURPOSE_INPUT: PurposeInputText = {
  ...aquaculture.purposeInput,
  purposes: GENERIC_KO_PURPOSES,
}

export const AQUACULTURE_EN_PURPOSE_INPUT: PurposeInputText = {
  ...generic.purposeInput,
  purposes: AQUACULTURE_EN_PURPOSES,
}

export const GENERIC_KO_HUB: HubText = {
  ...aquaculture.hub,
  chatInput: {
    ...aquaculture.hub.chatInput,
    placeholder: '예: "두 그룹의 평균을 비교하고 싶어", "변수 A와 B의 관계를 알고 싶어"',
  },
  tracks: {
    directAnalysis: {
      title: '직접 분석',
      description: '분석 방법을 알고 있다면 바로 시작하세요',
      example: 't-test를 실행하고 싶어',
    },
    dataConsultation: {
      title: '데이터 상담',
      description: '데이터를 업로드하고 AI와 함께 적절한 분석을 찾으세요',
      example: '데이터를 넣고 어떤 분석이 적절한지 알려줘',
    },
    experimentDesign: {
      title: '실험 설계',
      description: '실험 계획, 표본 크기, 검정력을 설계하세요',
      example: '적절한 표본 수는 얼마야?',
    },
  },
  aiSearch: {
    ...aquaculture.hub.aiSearch,
    description: '연구 목적이나 가설을 설명하면 적절한 통계 방법을 추천합니다.',
    placeholder: '예: "두 그룹의 평균 차이를 비교하고 싶어" 또는 "A와 B의 관계를 알고 싶어"',
  },
}

export const AQUACULTURE_EN_HUB: HubText = {
  ...generic.hub,
  hero: {
    ...generic.hub.hero,
    description: 'Upload CSV or Excel files and AI will analyze aquaculture data characteristics and recommend the best statistical method for your study.',
  },
  chatInput: {
    ...generic.hub.chatInput,
    placeholder: 'e.g., "Compare growth rates between farms", "Analyze survival by feed type"',
  },
  tracks: {
    directAnalysis: {
      title: 'Direct Analysis',
      description: 'Start immediately if you already know the method',
      example: 'I want to run a t-test on fish weight',
    },
    dataConsultation: {
      title: 'Data Consultation',
      description: 'Upload aquaculture data and ask AI which analysis fits best',
      example: 'Help me choose an analysis for growth and survival data',
    },
    experimentDesign: {
      title: 'Experiment Design',
      description: 'Plan aquaculture experiments, sample size, and power analysis',
      example: 'What sample size do I need for a feeding trial?',
    },
  },
  aiSearch: {
    ...generic.hub.aiSearch,
    description: 'Describe your aquaculture study or dataset and get statistical method recommendations.',
    placeholder: 'e.g., "Compare flounder growth by feed type" or "Find the relationship between temperature and dissolved oxygen"',
  },
}
