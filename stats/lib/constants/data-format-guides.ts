/**
 * 통계 분석별 데이터 형태 가이드
 *
 * 사용자에게 "엑셀을 어떻게 만들면 되는지" 안내하는 데이터.
 * SPSS 표준 데이터 형태를 기반으로 합니다.
 *
 * @see docs/SPSS_DATA_FORMAT_MATRIX.md
 */

export interface DataFormatExample {
  /** 컬럼 헤더 */
  headers: string[]
  /** 예시 행 데이터 (3~4행) */
  rows: (string | number)[][]
}

export interface DataFormatGuideInfo {
  /** 통계 방법 ID */
  methodId: string
  /** 데이터 형태 요약 (한국어, 비전문 용어) */
  summary: string
  /** 엑셀 정리 방법 설명 (한국어) */
  instructions: string[]
  /** 미리보기 테이블 데이터 */
  example: DataFormatExample
  /** 예시 CSV 파일명 (public/example-data/) */
  exampleFile?: string
  /** SPSS 메뉴 경로 (참고용) */
  spssMenu?: string
  /** 주의사항 */
  warnings?: string[]
}

// ============================================================================
// 범용 가이드 (방법을 모를 때 사용)
// ============================================================================

export const GENERIC_GUIDE: DataFormatGuideInfo = {
  methodId: 'generic',
  summary: '엑셀/CSV 파일을 아래 형태로 정리하면 대부분의 분석이 가능합니다',
  instructions: [
    '첫 행은 반드시 컬럼명(헤더)을 입력하세요 (예: "그룹", "점수", "성별")',
    '한 행에 하나의 관측값(대상)을 입력하세요',
    '숫자 데이터는 숫자만, 범주 데이터는 텍스트로 입력하세요',
    '빈 칸(결측값)은 비워두세요 — 자동으로 처리됩니다',
  ],
  example: {
    headers: ['ID', '그룹', '점수', '성별'],
    rows: [
      ['S001', '실험', 85, '남'],
      ['S002', '대조', 78, '여'],
      ['S003', '실험', 92, '여'],
      ['S004', '대조', 74, '남'],
    ],
  },
  warnings: [
    '분석 방법에 따라 필요한 열 형태가 다릅니다 — 방법 선택 후 상세 안내가 표시됩니다',
  ],
}

// ============================================================================
// t-검정 (T-Test)
// ============================================================================

const ONE_SAMPLE_T: DataFormatGuideInfo = {
  methodId: 'one-sample-t',
  summary: '하나의 측정값 열만 있으면 됩니다',
  instructions: [
    '한 열에 측정값을 입력하세요',
    '한 행에 하나의 관측값',
    '첫 행은 반드시 컬럼명 (예: "점수", "체중")',
  ],
  example: {
    headers: ['점수'],
    rows: [
      [85], [90], [78], [92], [88],
    ],
  },
  exampleFile: 'one-sample-t.csv',
  spssMenu: '분석 > 평균비교 > 일표본 T검정',
}

const INDEPENDENT_T: DataFormatGuideInfo = {
  methodId: 't-test',
  summary: '그룹 구분 열 + 측정값 열, 총 2열이 필요합니다',
  instructions: [
    '한 열에 그룹 이름 (예: "실험군", "대조군")',
    '다른 열에 측정값',
    '한 행에 하나의 관측값',
  ],
  example: {
    headers: ['그룹', '점수'],
    rows: [
      ['대조군', 85],
      ['대조군', 90],
      ['실험군', 102],
      ['실험군', 98],
    ],
  },
  exampleFile: 'independent-t-test.csv',
  spssMenu: '분석 > 평균비교 > 독립표본 T검정',
}

const PAIRED_T: DataFormatGuideInfo = {
  methodId: 'paired-t',
  summary: '같은 대상의 전/후 측정값을 각각 별도 열에 입력하세요',
  instructions: [
    '한 행에 한 사람 (또는 한 대상)',
    '전 측정값, 후 측정값을 각각 다른 열에',
    '피험자 ID 열은 선택사항',
  ],
  example: {
    headers: ['이름', '운동전', '운동후'],
    rows: [
      ['김민수', 120, 115],
      ['이영희', 135, 128],
      ['박철수', 140, 132],
      ['최수진', 125, 118],
    ],
  },
  exampleFile: 'paired-t-test.csv',
  spssMenu: '분석 > 평균비교 > 대응표본 T검정',
  warnings: ['두 열의 행 수가 동일해야 합니다 (짝이 맞아야 함)'],
}

const WELCH_T: DataFormatGuideInfo = {
  ...INDEPENDENT_T,
  methodId: 'welch-t',
  spssMenu: '분석 > 평균비교 > 독립표본 T검정 (등분산 가정 안 함)',
}

// ============================================================================
// 분산분석 (ANOVA)
// ============================================================================

const ONE_WAY_ANOVA: DataFormatGuideInfo = {
  methodId: 'anova',
  summary: '그룹 구분 열 + 측정값 열, 총 2열이 필요합니다',
  instructions: [
    '한 열에 그룹 이름 (3개 이상)',
    '다른 열에 측정값',
    '한 행에 하나의 관측값',
  ],
  example: {
    headers: ['사료종류', '체중증가량'],
    rows: [
      ['사료A', 12.5],
      ['사료A', 13.2],
      ['사료B', 15.8],
      ['사료B', 16.1],
      ['사료C', 10.3],
    ],
  },
  exampleFile: 'one-way-anova.csv',
  spssMenu: '분석 > 평균비교 > 일원배치 분산분석',
}

const TWO_WAY_ANOVA: DataFormatGuideInfo = {
  methodId: 'two-way-anova',
  summary: '요인 2개 열 + 측정값 열, 총 3열이 필요합니다',
  instructions: [
    '첫 번째 요인 열 (예: "성별")',
    '두 번째 요인 열 (예: "처리방법")',
    '측정값 열',
  ],
  example: {
    headers: ['성별', '처리방법', '점수'],
    rows: [
      ['남', '방법A', 85],
      ['남', '방법B', 92],
      ['여', '방법A', 88],
      ['여', '방법B', 95],
    ],
  },
  spssMenu: '분석 > 일반선형모형 > 일변량',
}

const REPEATED_MEASURES_ANOVA: DataFormatGuideInfo = {
  methodId: 'repeated-measures-anova',
  summary: '같은 대상을 여러 시점에 측정한 값을 각각 별도 열에 입력하세요',
  instructions: [
    '한 행에 한 사람 (또는 한 대상)',
    '각 시점의 측정값을 별도 열에 (예: 1주차, 2주차, 3주차)',
    '피험자 ID 열 필수',
  ],
  example: {
    headers: ['피험자', '1주차', '2주차', '3주차'],
    rows: [
      ['S001', 120, 125, 130],
      ['S002', 135, 140, 145],
      ['S003', 110, 118, 122],
      ['S004', 128, 132, 138],
    ],
  },
  exampleFile: 'repeated-measures-anova.csv',
  spssMenu: '분석 > 일반선형모형 > 반복측정',
  warnings: ['모든 시점의 데이터가 있어야 합니다 (빈 칸 불가)'],
}

const ANCOVA: DataFormatGuideInfo = {
  methodId: 'ancova',
  summary: '그룹 열 + 공변량 열 + 종속변수 열이 필요합니다',
  instructions: [
    '그룹 구분 열 (예: "처리군")',
    '공변량 열 (통제할 변수, 예: "사전점수")',
    '종속변수 열 (측정값)',
  ],
  example: {
    headers: ['그룹', '사전점수', '사후점수'],
    rows: [
      ['실험군', 70, 85],
      ['실험군', 65, 80],
      ['대조군', 72, 75],
      ['대조군', 68, 70],
    ],
  },
  spssMenu: '분석 > 일반선형모형 > 일변량 (공변량 지정)',
}

const MANOVA: DataFormatGuideInfo = {
  methodId: 'manova',
  summary: '그룹 열 + 종속변수 여러 열이 필요합니다',
  instructions: [
    '그룹 구분 열',
    '종속변수 2개 이상 (예: "국어점수", "수학점수")',
  ],
  example: {
    headers: ['반', '국어', '수학', '영어'],
    rows: [
      ['1반', 85, 90, 88],
      ['1반', 80, 85, 82],
      ['2반', 92, 88, 95],
      ['2반', 88, 82, 90],
    ],
  },
  spssMenu: '분석 > 일반선형모형 > 다변량',
}

// ============================================================================
// 비모수 검정 (Nonparametric)
// ============================================================================

const MANN_WHITNEY: DataFormatGuideInfo = {
  methodId: 'mann-whitney',
  summary: '그룹 구분 열 + 측정값 열, 총 2열이 필요합니다',
  instructions: [
    '한 열에 그룹 이름 (2개 그룹)',
    '다른 열에 측정값 (순위 기반 비교)',
    '정규분포를 따르지 않는 데이터에 적합',
  ],
  example: {
    headers: ['그룹', '만족도'],
    rows: [
      ['대조군', 3],
      ['대조군', 5],
      ['실험군', 7],
      ['실험군', 8],
    ],
  },
  exampleFile: 'mann-whitney.csv',
  spssMenu: '분석 > 비모수검정 > 독립 2표본',
}

const WILCOXON: DataFormatGuideInfo = {
  methodId: 'wilcoxon',
  summary: '같은 대상의 전/후 측정값을 각각 별도 열에 입력하세요',
  instructions: [
    '한 행에 한 사람',
    '전 측정값, 후 측정값을 각각 다른 열에',
    '대응표본 t-검정의 비모수 대안',
  ],
  example: {
    headers: ['이름', '치료전', '치료후'],
    rows: [
      ['환자1', 45, 52],
      ['환자2', 38, 42],
      ['환자3', 50, 55],
      ['환자4', 42, 48],
    ],
  },
  exampleFile: 'wilcoxon.csv',
  spssMenu: '분석 > 비모수검정 > 대응 2표본',
}

const KRUSKAL_WALLIS: DataFormatGuideInfo = {
  methodId: 'kruskal-wallis',
  summary: '그룹 구분 열 + 측정값 열이 필요합니다 (3개 이상 그룹)',
  instructions: [
    '한 열에 그룹 이름 (3개 이상)',
    '다른 열에 측정값',
    '일원분산분석의 비모수 대안',
  ],
  example: {
    headers: ['지역', '어획량'],
    rows: [
      ['동해', 120],
      ['서해', 95],
      ['남해', 110],
      ['동해', 135],
    ],
  },
  spssMenu: '분석 > 비모수검정 > 독립 K표본',
}

const FRIEDMAN: DataFormatGuideInfo = {
  methodId: 'friedman',
  summary: '같은 대상의 여러 조건 측정값을 각각 별도 열에 입력하세요',
  instructions: [
    '한 행에 한 사람',
    '각 조건의 측정값을 별도 열에',
    '반복측정 분산분석의 비모수 대안',
  ],
  example: {
    headers: ['심사위원', '요리A', '요리B', '요리C'],
    rows: [
      ['심사위원1', 8, 6, 9],
      ['심사위원2', 7, 8, 7],
      ['심사위원3', 9, 5, 8],
    ],
  },
  spssMenu: '분석 > 비모수검정 > 대응 K표본',
}

const SIGN_TEST: DataFormatGuideInfo = {
  ...WILCOXON,
  methodId: 'sign-test',
  summary: '같은 대상의 전/후 측정값을 각각 별도 열에 입력하세요',
  instructions: [
    '한 행에 한 사람',
    '전 측정값, 후 측정값을 각각 다른 열에',
    '가장 단순한 대응표본 비모수 검정',
  ],
  spssMenu: '분석 > 비모수검정 > 대응 2표본 > 부호검정',
}

const MCNEMAR: DataFormatGuideInfo = {
  methodId: 'mcnemar',
  summary: '같은 대상의 전/후 결과 (예/아니오)를 각각 별도 열에 입력하세요',
  instructions: [
    '한 행에 한 사람',
    '전/후 결과를 각각 다른 열에',
    '결과는 이진값 (예: 합격/불합격, 0/1)',
  ],
  example: {
    headers: ['학생', '사전검사', '사후검사'],
    rows: [
      ['학생1', '합격', '합격'],
      ['학생2', '불합격', '합격'],
      ['학생3', '합격', '불합격'],
      ['학생4', '불합격', '합격'],
    ],
  },
  spssMenu: '분석 > 비모수검정 > 대응 2표본 > McNemar',
}

const COCHRAN_Q: DataFormatGuideInfo = {
  methodId: 'cochran-q',
  summary: '같은 대상의 여러 조건 결과 (성공/실패)를 각각 별도 열에 입력하세요',
  instructions: [
    '한 행에 한 사람',
    '각 조건의 결과를 별도 열에 (0 또는 1)',
    'McNemar 검정의 3개 이상 조건 확장',
  ],
  example: {
    headers: ['환자', '약물A', '약물B', '약물C'],
    rows: [
      ['환자1', 1, 0, 1],
      ['환자2', 1, 1, 0],
      ['환자3', 0, 0, 1],
    ],
  },
  spssMenu: '분석 > 비모수검정 > 대응 K표본 > Cochran Q',
}

const BINOMIAL_TEST: DataFormatGuideInfo = {
  methodId: 'binomial-test',
  summary: '성공/실패 결과가 담긴 열 하나면 됩니다',
  instructions: [
    '한 열에 결과 입력 (예: 성공/실패, 0/1)',
    '한 행에 하나의 시행 결과',
  ],
  example: {
    headers: ['결과'],
    rows: [
      ['성공'], ['성공'], ['실패'], ['성공'], ['실패'],
    ],
  },
  spssMenu: '분석 > 비모수검정 > 이항검정',
}

const RUNS_TEST: DataFormatGuideInfo = {
  methodId: 'runs-test',
  summary: '측정값 열 하나면 됩니다',
  instructions: [
    '한 열에 측정값 입력',
    '데이터의 순서가 중요합니다 (시간순)',
    '무작위성을 검정합니다',
  ],
  example: {
    headers: ['측정값'],
    rows: [
      [12], [15], [11], [18], [14],
    ],
  },
  spssMenu: '분석 > 비모수검정 > 런 검정',
}

const KS_TEST: DataFormatGuideInfo = {
  methodId: 'ks-test',
  summary: '측정값 열 하나 또는 두 그룹 비교 시 2열이 필요합니다',
  instructions: [
    '1표본: 측정값 열 하나',
    '2표본: 그룹 구분 열 + 측정값 열',
    '분포의 형태를 검정합니다',
  ],
  example: {
    headers: ['점수'],
    rows: [
      [85], [90], [78], [92], [88],
    ],
  },
  spssMenu: '분석 > 비모수검정 > 1표본 K-S',
}

const MOOD_MEDIAN: DataFormatGuideInfo = {
  methodId: 'mood-median',
  summary: '그룹 구분 열 + 측정값 열이 필요합니다',
  instructions: [
    '한 열에 그룹 이름',
    '다른 열에 측정값',
    '그룹 간 중앙값 비교',
  ],
  example: {
    headers: ['품종', '수확량'],
    rows: [
      ['품종A', 120],
      ['품종B', 95],
      ['품종C', 110],
    ],
  },
  spssMenu: '분석 > 비모수검정 > 독립 K표본 > 중앙값',
}

// ============================================================================
// 상관분석 (Correlation)
// ============================================================================

const CORRELATION: DataFormatGuideInfo = {
  methodId: 'correlation',
  summary: '비교할 변수들을 각각 별도 열에 입력하세요',
  instructions: [
    '한 행에 하나의 관측값',
    '분석할 변수들을 각각 다른 열에',
    '수치형 데이터만 가능',
  ],
  example: {
    headers: ['키', '몸무게'],
    rows: [
      [160, 55],
      [165, 60],
      [170, 68],
      [175, 72],
    ],
  },
  exampleFile: 'correlation.csv',
  spssMenu: '분석 > 상관분석 > 이변량',
}

const PARTIAL_CORRELATION: DataFormatGuideInfo = {
  methodId: 'partial-correlation',
  summary: '분석 변수 + 통제 변수를 각각 별도 열에 입력하세요',
  instructions: [
    '관심 변수 2개 이상',
    '통제할 변수 1개 이상',
    '모두 수치형 데이터',
  ],
  example: {
    headers: ['수학점수', '과학점수', '공부시간'],
    rows: [
      [85, 90, 5],
      [70, 75, 3],
      [95, 92, 7],
      [60, 65, 2],
    ],
  },
  spssMenu: '분석 > 상관분석 > 편상관',
}

// ============================================================================
// 회귀분석 (Regression)
// ============================================================================

const REGRESSION: DataFormatGuideInfo = {
  methodId: 'regression',
  summary: '예측에 사용할 변수(X)와 예측할 변수(Y)를 각각 별도 열에 입력하세요',
  instructions: [
    '한 행에 하나의 관측값',
    '독립변수(X) 1개 이상',
    '종속변수(Y) 1개',
    '모두 수치형 데이터',
  ],
  example: {
    headers: ['공부시간', '시험점수'],
    rows: [
      [2, 65],
      [3, 70],
      [5, 85],
      [7, 92],
    ],
  },
  exampleFile: 'linear-regression.csv',
  spssMenu: '분석 > 회귀분석 > 선형',
}

const STEPWISE: DataFormatGuideInfo = {
  methodId: 'stepwise',
  summary: '후보 독립변수(X) 여러 개 + 종속변수(Y)를 입력하세요',
  instructions: [
    '후보 독립변수를 여러 열에 입력',
    '종속변수 1개',
    '유의한 변수만 자동으로 선택됩니다',
  ],
  example: {
    headers: ['공부시간', '수면시간', '운동횟수', '시험점수'],
    rows: [
      [5, 7, 3, 85],
      [3, 8, 1, 70],
      [7, 6, 5, 92],
      [4, 9, 2, 75],
    ],
  },
  spssMenu: '분석 > 회귀분석 > 선형 > 방법: 단계선택',
}

// ============================================================================
// 범주형 데이터 (Chi-Square)
// ============================================================================

const CHI_SQUARE: DataFormatGuideInfo = {
  methodId: 'chi-square',
  summary: '범주형 변수 2개를 각각 별도 열에 입력하세요',
  instructions: [
    '한 행에 하나의 관측값',
    '행 변수 (예: "성별")',
    '열 변수 (예: "선호도")',
    '범주형(문자) 데이터',
  ],
  example: {
    headers: ['성별', '선호도'],
    rows: [
      ['남', 'A제품'],
      ['남', 'B제품'],
      ['여', 'A제품'],
      ['여', 'A제품'],
      ['남', 'B제품'],
    ],
  },
  exampleFile: 'chi-square.csv',
  spssMenu: '분석 > 기술통계 > 교차분석 > 카이제곱',
}

const CHI_SQUARE_GOODNESS: DataFormatGuideInfo = {
  methodId: 'chi-square-goodness',
  summary: '범주 열 하나면 됩니다',
  instructions: [
    '한 열에 범주 이름',
    '관측된 빈도를 비교합니다',
    '기대 빈도는 분석 시 입력',
  ],
  example: {
    headers: ['혈액형'],
    rows: [
      ['A'], ['B'], ['O'], ['A'], ['AB'], ['O'], ['A'],
    ],
  },
  spssMenu: '분석 > 비모수검정 > 카이제곱',
}

// ============================================================================
// 기술통계 (Descriptive)
// ============================================================================

const DESCRIPTIVE: DataFormatGuideInfo = {
  methodId: 'descriptive',
  summary: '분석할 변수들을 각각 별도 열에 입력하세요',
  instructions: [
    '수치형 변수: 평균, 표준편차, 최소, 최대 등',
    '범주형 변수: 빈도, 비율 등',
    '여러 변수를 한 번에 분석 가능',
  ],
  example: {
    headers: ['이름', '키', '몸무게', '혈액형'],
    rows: [
      ['김민수', 175, 70, 'A'],
      ['이영희', 162, 55, 'B'],
      ['박철수', 180, 85, 'O'],
    ],
  },
  spssMenu: '분석 > 기술통계 > 기술통계량',
}

// ============================================================================
// 정규성 검정 (Normality)
// ============================================================================

const NORMALITY_TEST: DataFormatGuideInfo = {
  methodId: 'normality-test',
  summary: '검정할 수치형 변수 열 하나면 됩니다',
  instructions: [
    '한 열에 수치형 측정값',
    '정규분포를 따르는지 확인',
    'Shapiro-Wilk, Kolmogorov-Smirnov 등',
  ],
  example: {
    headers: ['체중'],
    rows: [
      [68], [72], [65], [70], [75], [69],
    ],
  },
  spssMenu: '분석 > 기술통계 > 데이터 탐색 > 정규성 도표',
}

// ============================================================================
// 시계열 (Time Series)
// ============================================================================

const ARIMA: DataFormatGuideInfo = {
  methodId: 'arima',
  summary: '날짜(시간) 열 + 측정값 열이 필요합니다',
  instructions: [
    '날짜/시간 열 (시간순 정렬)',
    '측정값 열',
    '일정한 간격의 시계열 데이터',
  ],
  example: {
    headers: ['날짜', '매출'],
    rows: [
      ['2024-01', 1200],
      ['2024-02', 1350],
      ['2024-03', 1100],
      ['2024-04', 1500],
    ],
  },
  spssMenu: '분석 > 시계열 > ARIMA',
}

const SEASONAL_DECOMPOSE: DataFormatGuideInfo = {
  methodId: 'seasonal-decompose',
  summary: '날짜(시간) 열 + 측정값 열이 필요합니다 (계절 패턴 분해)',
  instructions: [
    '날짜/시간 열 (시간순 정렬)',
    '측정값 열',
    '최소 2주기 이상의 데이터 필요 (예: 월별 → 24개월 이상)',
  ],
  example: {
    headers: ['연월', '판매량'],
    rows: [
      ['2023-01', 980],
      ['2023-02', 1050],
      ['2023-03', 1200],
      ['2023-04', 1350],
    ],
  },
  spssMenu: '분석 > 시계열 > 계절분해',
  warnings: ['계절 주기를 알아야 합니다 (월별=12, 분기별=4)'],
}

const MANN_KENDALL: DataFormatGuideInfo = {
  methodId: 'mann-kendall',
  summary: '날짜(시간) 열 + 측정값 열이 필요합니다 (추세 검정)',
  instructions: [
    '날짜/시간 열 (시간순 정렬)',
    '측정값 열',
    '시간에 따른 증가/감소 추세를 검정합니다',
  ],
  example: {
    headers: ['연도', '수온(℃)'],
    rows: [
      [2015, 14.2],
      [2016, 14.5],
      [2017, 14.8],
      [2018, 15.1],
    ],
  },
  spssMenu: '분석 > 비모수검정 (추세 검정)',
}

const STATIONARITY_TEST: DataFormatGuideInfo = {
  methodId: 'stationarity-test',
  summary: '날짜(시간) 열 + 측정값 열이 필요합니다 (정상성 검정)',
  instructions: [
    '날짜/시간 열 (시간순 정렬)',
    '측정값 열',
    '시계열의 정상성(평균/분산 일정)을 검정합니다',
  ],
  example: {
    headers: ['날짜', '주가'],
    rows: [
      ['2024-01-01', 52000],
      ['2024-01-02', 52300],
      ['2024-01-03', 51800],
      ['2024-01-04', 52100],
    ],
  },
  warnings: ['ADF/KPSS 검정을 포함합니다'],
}

// ============================================================================
// 생존분석 (Survival)
// ============================================================================

const KAPLAN_MEIER: DataFormatGuideInfo = {
  methodId: 'kaplan-meier',
  summary: '생존시간 열 + 사건발생 여부 열이 필요합니다',
  instructions: [
    '생존시간 열 (숫자)',
    '사건발생 여부 열 (0=중도절단, 1=사건발생)',
    '그룹 비교 시 그룹 열 추가',
  ],
  example: {
    headers: ['생존기간(월)', '사망여부', '그룹'],
    rows: [
      [12, 1, '약물A'],
      [24, 0, '약물A'],
      [8, 1, '약물B'],
      [36, 0, '약물B'],
    ],
  },
  spssMenu: '분석 > 생존분석 > Kaplan-Meier',
}

const COX_REGRESSION: DataFormatGuideInfo = {
  methodId: 'cox-regression',
  summary: '생존시간 열 + 사건발생 여부 열 + 예측변수 열이 필요합니다',
  instructions: [
    '생존시간 열 (숫자)',
    '사건발생 여부 열 (0=중도절단, 1=사건발생)',
    '예측변수(공변량) 1개 이상',
  ],
  example: {
    headers: ['생존기간(월)', '사망여부', '나이', '치료법'],
    rows: [
      [12, 1, 65, 'A'],
      [24, 0, 55, 'B'],
      [8, 1, 70, 'A'],
      [36, 0, 48, 'B'],
    ],
  },
  spssMenu: '분석 > 생존분석 > Cox 회귀',
  warnings: ['비례위험 가정을 확인해야 합니다'],
}

// ============================================================================
// 다변량 분석 (Multivariate)
// ============================================================================

const PCA: DataFormatGuideInfo = {
  methodId: 'pca',
  summary: '분석할 수치형 변수들을 각각 별도 열에 입력하세요',
  instructions: [
    '수치형 변수 3개 이상',
    '한 행에 하나의 관측값',
    '변수 간 상관관계가 있는 데이터에 적합',
  ],
  example: {
    headers: ['국어', '수학', '영어', '과학'],
    rows: [
      [85, 90, 88, 92],
      [70, 75, 72, 68],
      [95, 88, 92, 90],
    ],
  },
  spssMenu: '분석 > 차원축소 > 요인분석',
}

const FACTOR_ANALYSIS: DataFormatGuideInfo = {
  ...PCA,
  methodId: 'factor-analysis',
  summary: '설문 문항 등 관측 변수들을 각각 별도 열에 입력하세요',
  instructions: [
    '관측 변수(문항) 여러 개',
    '한 행에 한 응답자',
    '리커트 척도 등 수치형 데이터',
  ],
  spssMenu: '분석 > 차원축소 > 요인분석',
}

const CLUSTER: DataFormatGuideInfo = {
  methodId: 'cluster',
  summary: '군집화에 사용할 수치형 변수들을 각각 별도 열에 입력하세요',
  instructions: [
    '수치형 변수 2개 이상',
    '한 행에 하나의 관측 대상',
    '유사한 대상끼리 묶어줍니다',
  ],
  example: {
    headers: ['연소득', '지출액', '저축률'],
    rows: [
      [3000, 2500, 17],
      [5000, 3000, 40],
      [8000, 4500, 44],
    ],
  },
  spssMenu: '분석 > 분류분석 > K-평균 군집',
}

const DISCRIMINANT: DataFormatGuideInfo = {
  methodId: 'discriminant',
  summary: '그룹 열 + 예측 변수 여러 열이 필요합니다',
  instructions: [
    '그룹 구분 열 (분류 기준)',
    '예측 변수 2개 이상',
    '어떤 그룹에 속하는지 판별',
  ],
  example: {
    headers: ['종', '길이', '폭', '무게'],
    rows: [
      ['넙치', 30, 15, 500],
      ['넙치', 28, 14, 450],
      ['돔', 25, 12, 350],
      ['돔', 22, 11, 300],
    ],
  },
  spssMenu: '분석 > 분류분석 > 판별분석',
}

const RELIABILITY: DataFormatGuideInfo = {
  methodId: 'reliability',
  summary: '설문 문항들을 각각 별도 열에 입력하세요',
  instructions: [
    '한 행에 한 응답자',
    '각 문항을 별도 열에',
    'Cronbach α로 내적 일관성 평가',
  ],
  example: {
    headers: ['문항1', '문항2', '문항3', '문항4'],
    rows: [
      [4, 5, 4, 3],
      [3, 4, 3, 4],
      [5, 5, 4, 5],
    ],
  },
  spssMenu: '분석 > 척도 > 신뢰도분석',
}

// ============================================================================
// Export: 전체 가이드 맵
// ============================================================================

/**
 * 통계 방법 ID → 데이터 형태 가이드 매핑
 *
 * 각 통계 페이지에서 이 맵을 사용하여 데이터 형태 안내를 표시합니다.
 */
export const DATA_FORMAT_GUIDES: Record<string, DataFormatGuideInfo> = {
  // t-검정
  'one-sample-t': ONE_SAMPLE_T,
  't-test': INDEPENDENT_T,
  'paired-t': PAIRED_T,
  'welch-t': WELCH_T,

  // ANOVA
  'anova': ONE_WAY_ANOVA,
  'one-way-anova': ONE_WAY_ANOVA,
  'two-way-anova': TWO_WAY_ANOVA,
  'repeated-measures-anova': REPEATED_MEASURES_ANOVA,
  'ancova': ANCOVA,
  'manova': MANOVA,

  // 비모수
  'mann-whitney': MANN_WHITNEY,
  'wilcoxon': WILCOXON,
  'kruskal-wallis': KRUSKAL_WALLIS,
  'friedman': FRIEDMAN,
  'sign-test': SIGN_TEST,
  'mcnemar': MCNEMAR,
  'cochran-q': COCHRAN_Q,
  'binomial-test': BINOMIAL_TEST,
  'runs-test': RUNS_TEST,
  'ks-test': KS_TEST,
  'mood-median': MOOD_MEDIAN,

  // 상관
  'correlation': CORRELATION,
  'partial-correlation': PARTIAL_CORRELATION,

  // 회귀
  'regression': REGRESSION,
  'stepwise': STEPWISE,

  // 범주형
  'chi-square': CHI_SQUARE,
  'chi-square-goodness': CHI_SQUARE_GOODNESS,
  'chi-square-independence': CHI_SQUARE,

  // 기술통계
  'descriptive': DESCRIPTIVE,
  'normality-test': NORMALITY_TEST,

  // 시계열
  'arima': ARIMA,
  'seasonal-decompose': SEASONAL_DECOMPOSE,
  'mann-kendall': MANN_KENDALL,
  'stationarity-test': STATIONARITY_TEST,

  // 생존분석
  'kaplan-meier': KAPLAN_MEIER,
  'cox-regression': COX_REGRESSION,

  // 다변량
  'pca': PCA,
  'factor-analysis': FACTOR_ANALYSIS,
  'cluster': CLUSTER,
  'discriminant': DISCRIMINANT,
  'reliability': RELIABILITY,
}

/**
 * 통계 방법 ID로 데이터 형태 가이드 조회
 */
export function getDataFormatGuide(methodId: string): DataFormatGuideInfo | null {
  return DATA_FORMAT_GUIDES[methodId] ?? null
}

/**
 * 범용 데이터 형태 가이드 (방법을 모를 때 사용)
 */
export function getGenericGuide(): DataFormatGuideInfo {
  return GENERIC_GUIDE
}