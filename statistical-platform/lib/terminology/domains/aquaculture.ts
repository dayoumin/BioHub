/**
 * Aquaculture Domain Terminology
 *
 * 수산과학 연구 전문 용어 사전
 * - 양식, 수산 생물, 실험 설계에 특화된 용어
 */

import type { TerminologyDictionary } from '../terminology-types'

export const aquaculture: TerminologyDictionary = {
  domain: 'aquaculture',
  displayName: '수산과학',

  variables: {
    group: {
      title: '실험구 변수',
      description: '비교할 실험구를 정의하는 범주형 변수 (예: 양식장, 처리구, 사료 종류)',
      shortLabel: '실험구'
    },
    dependent: {
      title: '측정값 (Y)',
      description: '실험구 간 비교할 측정값 (예: 어체 중량, 성장률, 생존율)',
      shortLabel: '측정값'
    },
    independent: {
      title: '요인 변수 (X)',
      description: '예측 요인 변수 (예: 수온, 염분도, 용존산소)',
      shortLabel: '요인 변수'
    },
    factor: {
      title: '처리 조건',
      description: '실험 처리 조건 (예: 사료 종류, 수온 수준, 밀도)',
      shortLabel: '처리 조건'
    },
    covariate: {
      title: '공변량',
      description: '통제 변수 (예: 초기 체중, 초기 전장)',
      shortLabel: '공변량'
    },
    time: {
      title: '시간 변수',
      description: '시간 경과 변수 (예: 사육일수, 측정 주차)',
      shortLabel: '시간'
    },
    event: {
      title: '사건 변수',
      description: '발생 사건 (예: 폐사 여부, 성숙 도달)',
      shortLabel: '사건'
    },
    pairedFirst: {
      title: '처리 전 / 시점 1',
      description: '첫 번째 측정값 (예: 처리 전 체중)',
      shortLabel: '처리 전'
    },
    pairedSecond: {
      title: '처리 후 / 시점 2',
      description: '두 번째 측정값 (예: 처리 후 체중)',
      shortLabel: '처리 후'
    },
    correlation: {
      title: '연속형 변수',
      description: '상관분석할 연속형 변수 (예: 체중, 전장, 수온)',
      shortLabel: '변수'
    }
  },

  validation: {
    groupRequired: '실험구 변수를 선택해야 합니다',
    dependentRequired: '측정값을 선택해야 합니다',
    independentRequired: '요인 변수를 선택해야 합니다',
    factorRequired: '처리 조건을 선택해야 합니다',
    twoGroupsRequired: (current: number) =>
      `t-검정은 정확히 2개 그룹이 필요합니다 (현재 ${current}개)`,
    minVariablesRequired: (min: number) =>
      `최소 ${min}개의 변수가 필요합니다`,
    maxVariablesExceeded: (max: number) =>
      `최대 ${max}개까지만 선택할 수 있습니다`,
    differentVariablesRequired: '서로 다른 변수를 선택하세요',
    noNumericVariables: '연속형 변수가 없습니다',
    noCategoricalVariables: '범주형 변수가 없습니다'
  },

  success: {
    allVariablesSelected: '모든 변수가 선택되었습니다. 분석을 시작할 수 있습니다.',
    readyForAnalysis: '분석 준비 완료',
    variablesSelected: (count: number) =>
      `${count}개 변수 선택됨. 상관분석을 시작할 수 있습니다.`,
    correlationPairsCount: (count: number) =>
      `${count}개 상관계수 쌍이 계산됩니다`,
    modelReady: (type: 'simple' | 'multiple', predictors: number) =>
      `${type === 'simple' ? '단순' : '다중'}회귀 모델 준비 완료. ${predictors}개 예측변수 선택됨.`
  },

  selectorUI: {
    titles: {
      groupComparison: '실험구 비교 변수 선택',
      oneSample: '일표본 t-검정 변수 선택',
      paired: '대응 표본 변수 선택',
      correlation: '상관분석 변수 선택',
      multipleRegression: '다중회귀 변수 선택',
      twoWayAnova: '이원 ANOVA 변수 선택'
    },
    descriptions: {
      groupComparison: '실험구 변수와 측정값을 선택하세요 (예: 양식장별 어체 중량 비교)',
      oneSample: '검정할 측정값과 기준값을 입력하세요 (예: 평균 어체 중량 100g와 비교)',
      paired: '동일 개체의 두 측정값을 선택하세요 (예: 처리 전/후 어체 중량)',
      correlation: '상관관계를 분석할 2개 이상의 연속형 변수를 선택하세요 (예: 체중, 전장, 수온)',
      multipleRegression: '측정값(Y)과 요인 변수(X)를 선택하세요 (예: 성장률을 수온과 염분도로 예측)',
      twoWayAnova: '2개의 처리 조건과 1개의 측정값을 선택하세요'
    },
    buttons: {
      back: '이전',
      runAnalysis: '분석 시작',
      selectAll: '전체 선택',
      clear: '선택 해제',
      swap: '순서 바꾸기'
    },
    labels: {
      selected: '선택됨',
      compare: '비교:',
      across: '실험구별',
      model: '모델:',
      levels: '수준',
      groups: 'groups',
      numeric: 'numeric',
      range: 'Range',
      mean: 'Mean'
    }
  },

  smartFlow: {
    stepTitles: {
      dataUpload: '데이터 업로드',
      dataExploration: '데이터 탐색',
      purposeInput: '분석 방법 선택',
      variableSelection: '변수 선택',
      analysisExecution: '분석 실행',
      results: '결과 확인'
    },
    statusMessages: {
      analyzing: '데이터 분석 중...',
      analysisComplete: '분석이 완료되었습니다',
      uploadingData: '데이터 업로드 중...',
      validatingData: '데이터 검증 중...'
    },
    buttons: {
      runAnalysis: '분석 시작',
      reanalyze: '다른 데이터로 재분석',
      downloadResults: '결과 다운로드',
      backToHub: '처음으로'
    }
  }
}
