/**
 * 통계 분석 페이지 UI 텍스트 상수
 */

export const MANN_WHITNEY_TEXTS = {
  title: 'Mann-Whitney U 검정',
  subtitle: 'Wilcoxon Rank-Sum Test',
  description: '독립된 두 집단의 중위수 차이를 비모수적으로 검정',

  purpose: {
    title: '분석 목적',
    description: '두 독립집단의 분포가 동일한지 검정하며, 중위수 차이를 비교합니다.',
    features: [
      '정규분포 가정 불필요',
      '등분산성 가정 불필요',
      '이상치에 강건한 검정',
      '소표본에도 적용 가능'
    ]
  },

  comparison: {
    title: 'vs 독립표본 t-검정',
    mannWhitney: {
      title: 'Mann-Whitney U',
      description: '비모수 검정, 정규분포 불필요'
    },
    tTest: {
      title: '독립표본 t-검정',
      description: '모수 검정, 정규분포 가정 필요'
    }
  },

  usage: {
    title: '언제 사용하나요?',
    situations: [
      '데이터가 정규분포를 따르지 않을 때',
      '이상치가 많이 포함된 데이터',
      '서열척도(순위) 데이터 분석',
      '소표본 크기에서 두 집단 비교'
    ]
  },

  methodInfo: {
    formula: 'U = n₁ × n₂ + n₁(n₁+1)/2 - R₁',
    assumptions: [
      '두 표본은 독립적이어야 함',
      '연속형 또는 서열척도 데이터',
      '정규분포 가정 불필요'
    ],
    sampleSize: '각 집단에서 최소 5개 이상 권장',
    usage: '정규분포를 따르지 않는 두 집단 비교'
  },

  steps: {
    method: {
      title: '분석 방법',
      description: 'Mann-Whitney U 검정의 개념과 적용 조건'
    },
    upload: {
      title: '데이터 업로드',
      description: '분석할 데이터 파일 업로드'
    },
    variables: {
      title: '변수 선택',
      description: '종속변수와 그룹 변수 선택'
    },
    results: {
      title: '결과 해석',
      description: 'Mann-Whitney U 검정 결과 확인'
    }
  },

  errors: {
    pyodideInit: '통계 엔진을 초기화할 수 없습니다.',
    analysisExecution: '분석을 실행할 수 없습니다. 데이터와 변수를 확인해주세요.',
    analysisFailed: 'Mann-Whitney U 검정 중 오류가 발생했습니다.'
  },

  loading: {
    title: 'Mann-Whitney U 검정 분석 중...',
    subtitle: '잠시만 기다려주세요'
  }
} as const

export const WILCOXON_TEXTS = {
  title: 'Wilcoxon 부호순위 검정',
  subtitle: 'Wilcoxon Signed-Rank Test',
  description: '대응표본의 중위수 차이를 비모수적으로 검정',

  purpose: {
    title: '분석 목적',
    description: '동일한 개체에서 두 시점의 측정값 차이를 비모수적으로 검정합니다.',
    features: [
      '사전-사후 측정 비교',
      '중재/처치 효과 검정',
      '정규분포 가정 불필요',
      '소표본에서도 강건'
    ]
  },

  comparison: {
    title: 'vs 대응표본 t-검정',
    wilcoxon: {
      title: 'Wilcoxon 검정',
      description: '비모수, 순위 기반, 강건'
    },
    tTest: {
      title: '대응표본 t-검정',
      description: '모수, 차이의 정규분포 가정'
    }
  },

  usage: {
    title: '언제 사용하나요?',
    situations: [
      '차이값이 정규분포를 따르지 않을 때',
      '이상치가 포함된 대응표본 데이터',
      '서열척도 측정값의 변화 분석',
      '소표본 크기의 사전-사후 비교'
    ]
  },

  dataFormat: {
    title: '데이터 형식 안내',
    instructions: [
      '각 행은 하나의 개체(참가자)를 나타냅니다',
      '두 개의 열이 필요합니다: 사전 측정값, 사후 측정값',
      '예: before_score, after_score'
    ]
  },

  variableGuide: {
    title: '변수 선택 가이드',
    instructions: [
      '종속변수 1: 사전 측정값 (예: before_score)',
      '종속변수 2: 사후 측정값 (예: after_score)',
      '동일한 척도로 측정된 두 변수를 선택해주세요'
    ]
  },

  methodInfo: {
    formula: 'W = Σ(Ri × sign(di))',
    assumptions: [
      '대응표본 (동일한 개체의 사전-사후 측정)',
      '연속형 또는 서열척도 데이터',
      '차이값의 대칭분포 (정규분포 불필요)'
    ],
    sampleSize: '최소 6쌍 이상 권장',
    usage: '사전-사후 비교, 중재 효과 검정'
  },

  steps: {
    method: {
      title: '분석 방법',
      description: 'Wilcoxon 부호순위 검정의 개념과 적용'
    },
    upload: {
      title: '데이터 업로드',
      description: '대응표본 데이터 파일 업로드'
    },
    variables: {
      title: '변수 선택',
      description: '사전-사후 측정 변수 선택'
    },
    results: {
      title: '결과 해석',
      description: 'Wilcoxon 검정 결과 확인'
    }
  },

  errors: {
    pyodideInit: '통계 엔진을 초기화할 수 없습니다.',
    analysisExecution: '분석을 실행할 수 없습니다. 사전-사후 두 변수를 선택해주세요.',
    analysisFailed: 'Wilcoxon 부호순위 검정 중 오류가 발생했습니다.'
  },

  loading: {
    title: 'Wilcoxon 부호순위 검정 분석 중...',
    subtitle: '잠시만 기다려주세요'
  }
} as const