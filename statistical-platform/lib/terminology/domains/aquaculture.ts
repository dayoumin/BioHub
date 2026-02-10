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
    stepShortLabels: {
      exploration: '탐색',
      method: '방법',
      variable: '변수',
      analysis: '분석'
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
    },
    resultSections: {
      effectSizeDetail: '효과크기 상세'
    },
    executionStages: {
      prepare: { label: '분석 환경 준비', message: '분석 환경 준비 중...' },
      preprocess: { label: '데이터 전처리', message: '데이터 전처리 중...' },
      assumptions: { label: '통계적 가정 검증', message: '통계적 가정 검증 중...' },
      analysis: { label: '통계 분석 실행', message: '통계 분석 실행 중...' },
      additional: { label: '추가 통계량 계산', message: '추가 통계량 계산 중...' },
      finalize: { label: '결과 정리', message: '결과 정리 중...' }
    },
    layout: {
      appTitle: 'NIFS 통계 분석',
      historyTitle: '분석 히스토리',
      historyClose: '히스토리 닫기',
      historyCount: (n: number) => `히스토리 (${n}개)`,
      aiChatbot: 'AI 챗봇',
      helpLabel: '도움말',
      settingsLabel: '설정',
      nextStep: '다음 단계로',
      analyzingDefault: '분석 중...',
      dataSizeGuide: '데이터 크기 가이드',
      currentLimits: '현재 제한사항',
      memoryRecommendation: '메모리별 권장 크기',
      detectedMemory: (gb: number) => `→ 감지된 메모리: ${gb}GB`,
      limitFileSize: '최대 파일: 50MB',
      limitDataSize: '최대 데이터: 100,000행 × 1,000열',
      limitRecommended: '권장: 10,000행 이하',
      memoryTier4GB: '4GB RAM: ~10,000행',
      memoryTier8GB: '8GB RAM: ~30,000행',
      memoryTier16GB: '16GB RAM: ~60,000행',
    },
    execution: {
      runningTitle: '분석 수행 중',
      resumeButton: '계속',
      pauseButton: '일시정지',
      cancelButton: '취소',
      pauseDisabledTooltip: '75% 이후에는 일시정지할 수 없습니다',
      cancelConfirm: '정말 취소하시겠습니까?\n현재까지 계산된 결과는 저장되지 않습니다.',
      logSectionLabel: (n: number) => `상세 실행 로그 (${n}개)`,
      noLogs: '로그가 없습니다',
      dataRequired: '분석에 필요한 데이터나 방법이 선택되지 않았습니다.',
      unknownError: '알 수 없는 오류가 발생했습니다',
      estimatedTimeRemaining: (seconds: number) => `예상 남은 시간: ${seconds}초`,
    }
  },

  purposeInput: {
    purposes: {
      compare: {
        title: '그룹 간 차이 비교',
        description: '두 개 이상의 그룹을 비교하여 평균이나 비율의 차이를 검정합니다.',
        examples: '예: 양식장별 어류 성장률 비교, 사료 종류에 따른 체중 증가 비교, 해역별 수온 차이'
      },
      relationship: {
        title: '변수 간 관계 분석',
        description: '두 개 이상의 변수 사이의 상관관계나 연관성을 분석합니다.',
        examples: '예: 수온과 어류 성장률의 관계, 염분과 생존율의 관계, 체장과 체중의 관계'
      },
      distribution: {
        title: '분포와 빈도 분석',
        description: '데이터의 분포 형태를 파악하고 각 범주의 빈도를 분석합니다.',
        examples: '예: 어류 체장 분포, 어종별 어획량 비율, 해역별 플랑크톤 밀도 분포'
      },
      prediction: {
        title: '예측 모델링',
        description: '독립변수를 사용하여 종속변수를 예측하는 모델을 만듭니다.',
        examples: '예: 수온으로 어획량 예측, 사료량으로 성장률 예측, 환경요인으로 폐사율 예측'
      },
      timeseries: {
        title: '시계열 분석',
        description: '시간에 따른 데이터의 변화 패턴을 분석하고 미래를 예측합니다.',
        examples: '예: 월별 어획량 추이, 연도별 양식 생산량 변화, 계절별 수온 패턴'
      },
      survival: {
        title: '생존 분석',
        description: '시간에 따른 사건 발생까지의 기간을 분석하고 위험 요인을 파악합니다.',
        examples: '예: 치어 생존기간, 양식 시설 내구연수, 질병 발생 후 폐사까지 시간'
      },
      multivariate: {
        title: '다변량 분석',
        description: '여러 변수를 동시에 분석하여 차원 축소, 요인 추출, 군집화를 수행합니다.',
        examples: '예: 수질 지표 차원 축소(PCA), 양식장 유형화(군집), 어종 분류(판별분석)'
      },
      utility: {
        title: '연구 설계 도구',
        description: '표본 크기 계산, 검정력 분석, 측정 도구 신뢰도 평가를 수행합니다.',
        examples: '예: 실험 설계 시 필요 표본수, 설문지 신뢰도(Cronbach α), 검정력 계산'
      }
    },
    inputModes: {
      aiRecommend: 'AI가 추천',
      directSelect: '직접 선택',
      modeAriaLabel: '분석 방법 선택 모드'
    },
    buttons: {
      back: '뒤로',
      allMethods: '전체 분석 방법',
      useThisMethod: '이 방법으로 분석하기'
    },
    labels: {
      selectionPrefix: '선택:',
      directBadge: '직접 선택',
      purposeHeading: '어떤 분석을 하고 싶으신가요?'
    },
    messages: {
      purposeHelp: '8개 중 하나의 분석 목적을 선택하세요. 선택하면 단계별 질문을 통해 최적의 통계 방법을 추천합니다.',
      guidanceAlert: '위에서 분석 목적을 선택하면 단계별 질문을 통해 최적의 통계 방법을 추천합니다.',
      aiRecommendError: '추천 결과를 생성하지 못했습니다. 다시 시도해주세요.',
      genericError: '오류가 발생했습니다. 다시 시도해주세요.',
    },
    aiLabels: {
      recommendTitle: 'AI 추천 분석',
    },
  },

  fitScore: {
    levels: {
      excellent: { label: '매우 적합', shortLabel: '최적', description: '데이터에 매우 적합합니다' },
      good: { label: '적합', shortLabel: '적합', description: '데이터와 잘 맞습니다' },
      caution: { label: '주의 필요', shortLabel: '주의', description: '일부 조건이 충족되지 않습니다' },
      poor: { label: '부적합', shortLabel: '부적합', description: '다른 방법을 고려하세요' },
      unknown: { label: '평가 불가', shortLabel: '평가 불가', description: '데이터 정보가 부족합니다' },
    },
  },

  analysisInfo: {
    cardTitle: '분석 정보',
    labels: {
      fileName: '파일명',
      dataSize: '데이터 크기',
      method: '분석 방법',
      analysisTime: '분석 시간',
      dataQuality: '데이터 품질',
      assumptions: '가정 검정',
      variables: '변수 구성',
    },
    variableRoles: {
      dependent: '종속변수',
      independent: '독립변수',
      group: '그룹변수',
      factor: 'Factor 변수',
      paired: 'Paired 변수',
    },
    dataQuality: {
      missingValues: (count: number, percent: string) => `결측값 ${count}개 (${percent}%)`,
      duplicateRows: (count: number) => `중복 행 ${count}개`,
      warnings: (count: number) => `${count}개 경고`,
    },
    assumptions: {
      normality: '정규성',
      homogeneity: '등분산성',
      independence: '독립성',
      met: '충족',
      partialViolation: '일부 위반',
      allGroupsNormal: '모든 그룹 정규',
      someGroupsNonNormal: '일부 그룹 비정규',
    },
    units: {
      rows: '행',
      nVariables: (count: number) => `${count}개 변수`,
    },
  },

  history: {
    empty: {
      title: '분석 히스토리가 없습니다',
      description: '완료된 분석이 자동으로 저장됩니다',
    },
    recordCount: (n: number) => `${n}개 기록`,
    buttons: {
      saveCurrent: '현재 분석 저장',
      clearAll: '전체 삭제',
      cancel: '취소',
      save: '저장',
      delete: '삭제',
    },
    labels: {
      filterByMethod: '분석 방법 필터',
      showAll: '전체 보기',
      searchPlaceholder: '히스토리 검색...',
      noMethod: '분석 방법 없음',
      noPurpose: '분석 목적 없음',
      current: '현재',
      rows: '행',
      pValue: 'p-value:',
      effectSize: '효과크기:',
    },
    tooltips: {
      viewResults: '저장된 결과 보기',
      reanalyze: '이 방법으로 새 데이터 분석',
      delete: '삭제',
    },
    dialogs: {
      deleteTitle: '분석 히스토리 삭제',
      deleteDescription: '이 분석 히스토리를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.',
      clearTitle: '전체 히스토리 삭제',
      clearDescription: (count: number) => `모든 분석 히스토리(${count}개)를 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.`,
      saveTitle: '현재 분석 저장',
      saveDescription: '현재 분석에 이름을 지정하여 저장합니다.',
      analysisName: '분석 이름',
      savePlaceholder: '예: 2024년 실험 데이터 t-검정',
    },
  },
}
