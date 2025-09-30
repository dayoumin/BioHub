import { LucideIcon } from 'lucide-react'
import {
  Users2,
  TrendingUp,
  BarChart3,
  Calculator,
  Activity,
  Droplet,
  Beaker
} from 'lucide-react'

// 실험설계 타입 정의
export interface ExperimentDesign {
  id: string
  name: string
  description: string
  icon: LucideIcon
  sampleSize: string
  duration: string
  complexity: 'easy' | 'medium' | 'hard'
  statisticalTests: string[]
  examples: string[]
  assumptions: string[]
  category: string
  analysisPath?: string
  // 새로 추가되는 세부 정보
  dataRequirements?: {
    variableTypes: string[]
    preprocessing: string[]
    missingDataHandling: string[]
    minSampleSize: string
  }
  analysisSteps?: {
    sequence: string[]
    postHocTests?: string[]
    diagnostics: string[]
  }
  reportingFormat?: {
    tables: string[]
    charts: string[]
    keyMetrics: string[]
  }
}

// 실험설계 카테고리
export const EXPERIMENT_CATEGORIES = {
  basic: {
    name: '기본 실험설계',
    description: '기초적인 비교 연구 설계',
    designs: ['independent-ttest', 'paired-ttest', 'chi-square-design', 'nonparametric-design']
  },
  advanced: {
    name: '고급 실험설계',
    description: '복합적인 다요인 분석 설계',
    designs: ['one-way-anova', 'factorial-2x2', 'mixed-design', 'multiple-regression', 'repeated-measures-anova', 'quasi-experimental', 'survival-analysis', 'dose-response', 'response-surface', 'bioassay-design', 'growth-curve-design', 'water-quality-design']
  },
  observational: {
    name: '관찰 연구',
    description: '변수 간 관계 분석 설계',
    designs: ['correlation-study', 'single-case-design', 'time-series-design']
  }
} as const

// 실험설계 구성 데이터
export const EXPERIMENTAL_DESIGNS_CONFIG: Record<string, ExperimentDesign> = {
  'independent-ttest': {
    id: 'independent-ttest',
    name: '독립표본 t-검정 설계',
    description: '두 독립 집단의 평균을 비교하는 실험 설계',
    icon: Users2,
    sampleSize: '각 그룹 최소 30명',
    duration: '단기 (1-2주)',
    complexity: 'easy',
    statisticalTests: ['독립표본 t-검정', 'Mann-Whitney U'],
    examples: ['신약 vs 위약 효과', '남녀 성적 차이', '브랜드별 선호도'],
    assumptions: ['정규성', '등분산성', '독립성'],
    category: 'basic',
    analysisPath: '/statistics/t-test',
    dataRequirements: {
      variableTypes: ['독립변수: 범주형 (2개 그룹)', '종속변수: 연속형 (정량적)'],
      preprocessing: ['극단값(outlier) 확인 및 처리', '데이터 정규화 필요시 변환'],
      missingDataHandling: ['완전 사례 분석 (complete case analysis)', '그룹별 결측률 5% 이하 권장'],
      minSampleSize: '그룹별 최소 30명 (중심극한정리), 효과크기 고려시 검정력 분석 권장'
    },
    analysisSteps: {
      sequence: [
        '1. 기술통계량 산출 (평균, 표준편차, 신뢰구간)',
        '2. 정규성 검정 (Shapiro-Wilk test)',
        '3. 등분산성 검정 (Levene test)',
        '4. 독립표본 t-검정 실행',
        '5. 효과크기 산출 (Cohen\'s d)',
        '6. 결과 해석 및 보고서 작성'
      ],
      postHocTests: ['정규성/등분산성 위반 시 Mann-Whitney U 검정'],
      diagnostics: ['Q-Q plot으로 정규성 시각 확인', 'Box plot으로 분포 비교']
    },
    reportingFormat: {
      tables: ['기술통계량 표 (평균±표준편차)', 't-검정 결과표 (t값, 자유도, p값, 95% 신뢰구간)'],
      charts: ['그룹별 Box Plot', 'Error Bar Chart (평균±표준오차)', 'Q-Q Plot (정규성 확인)'],
      keyMetrics: ['t통계량', 'p값 (양측검정)', 'Cohen\'s d (효과크기)', '95% 신뢰구간', '자유도(df)']
    }
  },
  'paired-ttest': {
    id: 'paired-ttest',
    name: '대응표본 t-검정 설계',
    description: '동일한 대상의 전후 변화를 비교하는 설계',
    icon: TrendingUp,
    sampleSize: '최소 30쌍',
    duration: '중기 (4-8주)',
    complexity: 'easy',
    statisticalTests: ['대응표본 t-검정', 'Wilcoxon 부호순위'],
    examples: ['교육 전후 점수', '다이어트 전후 체중', '치료 전후 증상'],
    assumptions: ['차이의 정규성', '대응성'],
    category: 'basic',
    analysisPath: '/statistics/t-test'
  },
  'one-way-anova': {
    id: 'one-way-anova',
    name: '일원분산분석 설계',
    description: '3개 이상 집단의 평균을 비교하는 설계',
    icon: BarChart3,
    sampleSize: '각 그룹 최소 20명',
    duration: '중기 (2-4주)',
    complexity: 'medium',
    statisticalTests: ['일원분산분석', 'Kruskal-Wallis', 'Tukey HSD'],
    examples: ['3개 교육방법 효과', '4개 약물 비교', '연령대별 만족도'],
    assumptions: ['정규성', '등분산성', '독립성'],
    category: 'advanced',
    analysisPath: '/statistics/anova'
  },
  'factorial-2x2': {
    id: 'factorial-2x2',
    name: '2×2 요인설계',
    description: '두 요인의 주효과와 상호작용을 분석하는 설계',
    icon: Calculator,
    sampleSize: '각 조건 최소 15명',
    duration: '장기 (6-12주)',
    complexity: 'hard',
    statisticalTests: ['이원분산분석', '단순주효과 분석'],
    examples: ['성별×연령 효과', '방법×난이도 상호작용', '약물×용량 조합'],
    assumptions: ['정규성', '등분산성', '독립성', '상호작용 해석'],
    category: 'advanced',
    analysisPath: '/statistics/two-way-anova'
  },
  'correlation-study': {
    id: 'correlation-study',
    name: '상관 연구 설계',
    description: '두 변수 간의 관계를 분석하는 설계',
    icon: TrendingUp,
    sampleSize: '최소 50명',
    duration: '단기 (1-2주)',
    complexity: 'easy',
    statisticalTests: ['Pearson 상관', 'Spearman 상관', '편상관'],
    examples: ['키와 몸무게 관계', '공부시간과 성적', '스트레스와 혈압'],
    assumptions: ['선형성', '이변량 정규성 (Pearson)', '표본 독립성'],
    category: 'observational',
    analysisPath: '/statistics/correlation'
  },
  'mixed-design': {
    id: 'mixed-design',
    name: '혼합설계',
    description: '집단간 요인과 집단내 요인을 동시에 고려하는 설계',
    icon: Calculator,
    sampleSize: '각 그룹 최소 20명',
    duration: '장기 (8-16주)',
    complexity: 'hard',
    statisticalTests: ['혼합 ANOVA', '단순주효과 분석', '구형성 검정'],
    examples: ['치료그룹별 시간경과 효과', '성별×측정시점 변화', '약물×용량×시간 효과'],
    assumptions: ['정규성', '등분산성', '구형성', '독립성'],
    category: 'advanced',
    analysisPath: '/statistics/mixed-model'
  },
  'multiple-regression': {
    id: 'multiple-regression',
    name: '다중회귀 설계',
    description: '여러 예측변수로 결과변수를 예측하는 설계',
    icon: TrendingUp,
    sampleSize: '예측변수 수 × 15-20명',
    duration: '중기 (4-8주)',
    complexity: 'medium',
    statisticalTests: ['다중회귀분석', '단계적 회귀', '위계적 회귀'],
    examples: ['성적 예측 모델', '매출액 예측', '만족도 영향 요인'],
    assumptions: ['선형성', '독립성', '등분산성', '다중공선성 없음'],
    category: 'advanced',
    analysisPath: '/statistics/regression',
    dataRequirements: {
      variableTypes: ['독립변수: 연속형/범주형 (더미 변환)', '종속변수: 연속형'],
      preprocessing: ['결측치 및 이상값 처리', '범주형 변수 더미화', '스케일링 필요성 검토'],
      missingDataHandling: ['다중 대체법 권장', '삭제 시 MCAR 가정 확인'],
      minSampleSize: '예측변수 수 × 15-20 (최소 100 케이스 권장)'
    },
    analysisSteps: {
      sequence: [
        '1. 변수 탐색 및 다중공선성 점검',
        '2. 기본 모델 적합 (다중회귀)',
        '3. 단계적/위계적 모델 비교',
        '4. 예측력 및 유의성 평가 (R², Adj-R², F-test)',
        '5. 결과 해석 및 보고'
      ],
      diagnostics: [
        '잔차 분석으로 정규성·등분산성 확인',
        '다중공선성 지표 확인 (VIF, Tolerance)',
        '독립성 검정 (Durbin-Watson)'
      ]
    },
    reportingFormat: {
      tables: ['회귀계수표 (표준화/비표준화)', '모델 비교표 (R², AIC)', '가설 검정 요약'],
      charts: ['잔차 플롯', '예측값-실측값 산점도', '부분 회귀 플롯'],
      keyMetrics: ['회귀계수(β)', 'R²/Adj-R²', 'F값', 'p값', 'VIF']
    }
  },
  'chi-square-design': {
    id: 'chi-square-design',
    name: '카이제곱 설계',
    description: '범주형 변수들 간의 관계를 분석하는 설계',
    icon: BarChart3,
    sampleSize: '각 셀 최소 5명',
    duration: '단기 (1-3주)',
    complexity: 'easy',
    statisticalTests: ['카이제곱 독립성 검정', 'Fisher 정확검정', 'Cramer\'s V'],
    examples: ['성별과 선호도 관계', '교육수준과 직업 관계', '치료법과 완치율'],
    assumptions: ['독립성', '기대빈도 5이상', '무작위 표집'],
    category: 'basic',
    analysisPath: '/statistics/chi-square'
  },
  'nonparametric-design': {
    id: 'nonparametric-design',
    name: '비모수 설계',
    description: '정규성 가정을 위반한 경우의 대안 설계',
    icon: Users2,
    sampleSize: '각 그룹 최소 15명',
    duration: '중기 (2-4주)',
    complexity: 'medium',
    statisticalTests: ['Mann-Whitney U', 'Wilcoxon 부호순위', 'Kruskal-Wallis'],
    examples: ['만족도 순위 비교', '점수 분포가 편향된 경우', '소표본 그룹 비교'],
    assumptions: ['독립성', '연속성 (순서형)'],
    category: 'basic',
    analysisPath: '/statistics/non-parametric'
  },
  'repeated-measures-anova': {
    id: 'repeated-measures-anova',
    name: '반복측정 분산분석 설계',
    description: '동일한 대상을 여러 시점에서 반복 측정하는 설계',
    icon: TrendingUp,
    sampleSize: '최소 20명',
    duration: '장기 (8-24주)',
    complexity: 'hard',
    statisticalTests: ['반복측정 ANOVA', '혼합효과 모형'],
    examples: ['약물 효과의 시간별 변화', '학습 효과 추이', '생장 곡선 분석'],
    assumptions: ['정규성', '구형성', '독립성', '복합대칭성'],
    category: 'advanced',
    analysisPath: '/statistics/repeated-measures',
    analysisSteps: {
      sequence: [
        '1. 데이터 구조 확인 (장기/광형식 변환)',
        '2. 구형성 검정 및 가정 점검',
        '3. 반복측정 ANOVA 또는 혼합효과 모형 적합',
        '4. 효과 해석 및 시점별 비교',
        '5. 결과 보고 및 시각화'
      ],
      postHocTests: ['Bonferroni 보정 사후비교', '단순 주효과 분석'],
      diagnostics: [
        '구형성 검정 (Mauchly)',
        '구형성 위반 시 Greenhouse-Geisser/Huynh-Feldt 보정',
        '잔차 및 시계열 자기상관 확인'
      ]
    },
    reportingFormat: {
      tables: ['반복측정 ANOVA 요약표', '사후비교 결과표', '효과크기 요약'],
      charts: ['시점별 평균 추이 그래프', '개체별 변화 궤적', '잔차 시리즈 플롯'],
      keyMetrics: ['F값', 'p값', '부분 η²', 'ε (구형성 보정계수)']
    }
  },
  'quasi-experimental': {
    id: 'quasi-experimental',
    name: '준실험 설계',
    description: '무작위 배정이 어려운 상황에서의 인과관계 추론 설계',
    icon: Users2,
    sampleSize: '각 그룹 최소 30명',
    duration: '중장기 (4-16주)',
    complexity: 'medium',
    statisticalTests: ['차분의 차분', '회귀불연속', '성향점수 매칭'],
    examples: ['교육 프로그램 효과', '정책 효과 평가', '자연실험'],
    assumptions: ['평행 가정', '외생성', '선택편향 통제'],
    category: 'advanced'
  },
  'single-case-design': {
    id: 'single-case-design',
    name: '단일사례 설계',
    description: '소수의 개체나 사례를 집중적으로 연구하는 설계',
    icon: Calculator,
    sampleSize: '1-10개 사례',
    duration: '장기 (12-52주)',
    complexity: 'medium',
    statisticalTests: ['시각적 분석', '경향 분석', 'Tau-U'],
    examples: ['임상 케이스 연구', '개별화 교육', '행동 중재'],
    assumptions: ['기저선 안정성', '중재 효과 지속성'],
    category: 'observational'
  },
  'time-series-design': {
    id: 'time-series-design',
    name: '시계열 설계',
    description: '시간 순서를 고려하여 변화 패턴을 분석하는 설계',
    icon: BarChart3,
    sampleSize: '최소 50개 시점',
    duration: '매우 장기 (1-5년)',
    complexity: 'hard',
    statisticalTests: ['ARIMA', '계절성 분해', 'VAR 모델'],
    examples: ['생태계 모니터링', '경제 지표 분석', '기후 변화 연구'],
    assumptions: ['정상성', '자기상관 고려', '계절성 처리'],
    category: 'observational'
  },
  'survival-analysis': {
    id: 'survival-analysis',
    name: '생존분석 설계',
    description: '사건 발생 시간과 생존율을 분석하는 설계',
    icon: TrendingUp,
    sampleSize: '최소 100개체',
    duration: '장기 (24-104주)',
    complexity: 'hard',
    statisticalTests: ['Kaplan-Meier', 'Cox 회귀', 'Log-rank 검정'],
    examples: ['어류 폐사율 분석', '사료별 생존률', '치료 효과 지속성'],
    assumptions: ['비례위험', '중도절단 무작위성', '독립성'],
    category: 'advanced'
  },
  'dose-response': {
    id: 'dose-response',
    name: '용량-반응 설계',
    description: '농도별/용량별 반응을 분석하여 EC50, LC50 등을 산정하는 설계',
    icon: Calculator,
    sampleSize: '농도당 최소 15개체',
    duration: '단기 (1-4주)',
    complexity: 'medium',
    statisticalTests: ['4-parameter logistic', 'Hill equation', 'Probit 분석'],
    examples: ['독성 농도 산정', '사료 첨가제 효과', '약물 용량별 반응'],
    assumptions: ['단조성', '농도-반응 관계', '독립성'],
    category: 'advanced',
    analysisPath: '/statistics/dose-response',
    dataRequirements: {
      variableTypes: ['독립변수: 농도/용량 (로그 변환 권장)', '종속변수: 반응률 또는 이진 반응'],
      preprocessing: ['범위 탐색 시험으로 농도 설정', '농도 로그 변환', '대조군 및 용매 대조 설정', '노출 조건 표준화'],
      missingDataHandling: ['자연폐사 보정 (Abbott 공식)', '개체 손실 및 중도폐사 기록', '결측 발생 시 추가 실험 고려'],
      minSampleSize: '농도 수준당 15개체 이상, 최소 5개 농도 수준 + 대조군'
    },
    analysisSteps: {
      sequence: [
        '1. 농도 범위 설정 및 실험 설계 확정',
        '2. 본 실험 실행 및 반응률 수집',
        '3. 자연폐사 보정 및 데이터 정리',
        '4. 용량-반응 모델 적합 (Logistic/Hill/Probit)',
        '5. EC50/LC50, NOEC/LOEC 산출',
        '6. 모델 적합도 및 민감도 검토'
      ],
      postHocTests: ['Dunnett 검정으로 농도별 비교', '경향성 검정을 위한 Williams test'],
      diagnostics: [
        '모델 적합도 지표 확인 (R², AIC)',
        '잔차 및 이상점 검토',
        '병렬성·기울기 가정 점검',
        '독성단위(TU) 계산 및 비교'
      ]
    },
    reportingFormat: {
      tables: ['농도별 반응률 요약표', '모델 적합도 비교표', 'EC50/LC50 및 95% 신뢰구간', 'NOEC/LOEC 결과표'],
      charts: ['용량-반응 곡선', '로그 농도-반응 산점도', '잔차 플롯', '신뢰구간 밴드'],
      keyMetrics: ['EC50/LC50', '기울기(slope)', '95% 신뢰구간', 'R²/AIC', 'NOEC/LOEC']
    }
  },
  'response-surface': {
    id: 'response-surface',
    name: '반응표면 설계',
    description: '여러 요인의 동시 최적화를 통해 최적 조건을 찾는 설계',
    icon: BarChart3,
    sampleSize: '요인별 5수준, 총 25-50개 실험점',
    duration: '중장기 (4-12주)',
    complexity: 'hard',
    statisticalTests: ['중심합성설계(CCD)', 'Box-Behnken 설계', '2차 회귀모델'],
    examples: ['양식 최적 조건', '사료 배합비 최적화', '수질 관리 조건'],
    assumptions: ['연속성', '2차 곡면 적합', '요인 독립성'],
    category: 'advanced',
    dataRequirements: {
      variableTypes: ['독립변수: 연속형 (2-5개 요인)', '종속변수: 연속형 (최적화 목표)'],
      preprocessing: ['요인 간 상관관계 확인', '실험영역 설정', '중심점 반복실험'],
      missingDataHandling: ['실험점 누락 시 추가 실험 필요', '대체법 사용 금지'],
      minSampleSize: '요인수 기준 2^k + 2k + 6 (k=요인수), 중심점 3-5회 반복'
    },
    analysisSteps: {
      sequence: [
        '1. 실험계획 수립 (CCD, Box-Behnken)',
        '2. 실험 실행 및 데이터 수집',
        '3. 2차 회귀모델 적합',
        '4. 모델 적합도 검정 (R², RMSE)',
        '5. 반응표면 시각화',
        '6. 최적화 조건 도출'
      ],
      diagnostics: ['잔차 분석', '예측 정확도 검정', '모델 타당성 확인', '다중공선성 발생 시 Ridge 또는 주성분 회귀 검토']
    },
    reportingFormat: {
      tables: ['실험설계표', '분산분석표', '회귀계수표', '최적조건 결과표'],
      charts: ['반응표면도(3D)', '등고선도', '잔차도', '예측값-실측값도'],
      keyMetrics: ['R²', 'Adj-R²', 'RMSE', '최적값', '95% 예측구간']
    }
  },
  'bioassay-design': {
    id: 'bioassay-design',
    name: '생물검정법 설계',
    description: '독성물질의 농도-반응 관계를 분석하여 LC50, EC50을 산정하는 설계',
    icon: Beaker,
    sampleSize: '농도당 최소 20개체',
    duration: '단기 (3-10일)',
    complexity: 'medium',
    statisticalTests: ['Probit 분석', '4-parameter logistic', 'Trimmed Spearman-Karber', 'Weibull 모델'],
    examples: ['급성독성시험 (LC50)', '만성독성평가 (NOEC)', '내분비교란물질 검정 (EC50)', '어류배아독성시험'],
    assumptions: ['농도-반응 단조성', '개체 독립성', '로그정규분포', '임계효과 존재'],
    category: 'advanced',
    dataRequirements: {
      variableTypes: ['독립변수: 농도 (연속형, 로그변환)', '종속변수: 반응률/폐사율 (비율형)'],
      preprocessing: ['농도 로그변환', '대조군 설정', '용매대조군 포함', '농도구간 설정 (기하급수적)'],
      missingDataHandling: ['개체 손실 기록', '자연폐사 보정 (Abbott 공식)', '데이터 결측 시 실험 재실행'],
      minSampleSize: '농도당 20개체, 최소 5개 농도구간, 대조군 2개 (음성/용매)'
    },
    analysisSteps: {
      sequence: [
        '1. 실험설계 (농도설정, 개체수 결정)',
        '2. 범위검색시험으로 농도범위 설정',
        '3. 본시험 실행 (48-96시간 노출)',
        '4. 자연폐사 보정 (Abbott 공식)',
        '5. 용량-반응 곡선 적합',
        '6. LC50/EC50 및 신뢰구간 산출'
      ],
      diagnostics: ['적합도 검정 (Chi-square)', 'Probit vs Logit 모델 비교', '이상점 탐지'],
      postHocTests: ['NOEC 산정 (Dunnett test)', 'LOEC 결정', 'TU (독성단위) 계산']
    },
    reportingFormat: {
      tables: ['농도별 반응률표', '모델 적합도표', 'LC50/EC50 결과표 (95% 신뢰구간)', 'NOEC/LOEC 결과'],
      charts: ['용량-반응 곡선', 'Probit 회귀선', '잔차도', '신뢰구간 밴드'],
      keyMetrics: ['LC50/EC50', '95% 신뢰구간', 'NOEC/LOEC', '기울기 (slope)', 'Chi-square p값']
    }
  },
  'growth-curve-design': {
    id: 'growth-curve-design',
    name: '성장곡선 분석 설계',
    description: '시간에 따른 성장 패턴을 모델링하고 성장매개변수를 추정하는 설계',
    icon: Activity,
    sampleSize: '개체당 최소 8-10개 측정점',
    duration: '중장기 (4-24주)',
    complexity: 'medium',
    statisticalTests: ['비선형 회귀', 'Gompertz 모델', 'Logistic 모델', 'von Bertalanffy', '혼합효과 모델'],
    examples: ['어류 체중-체장 성장', '미생물 증식 곡선', '양식어류 사료효율', '개체별 성장률 비교'],
    assumptions: ['성장 연속성', '개체 독립성', '오차 정규성', '시간 순서성'],
    category: 'advanced',
    dataRequirements: {
      variableTypes: ['독립변수: 시간 (일, 주, 월)', '종속변수: 성장지표 (체중, 체장, 밀도)'],
      preprocessing: ['측정시점 표준화', '개체식별 태그', '초기값 보정', '이상치 제거'],
      missingDataHandling: ['개체 추적 손실시 제외', '측정점 누락시 보간법', '최소 5개 이상 측정점 필요'],
      minSampleSize: '그룹별 15개체 이상, 개체당 8-10개 측정점, 전체 기간 80% 이상 추적'
    },
    analysisSteps: {
      sequence: [
        '1. 성장 모델 선택 (Gompertz, Logistic 등)',
        '2. 초기 매개변수 추정',
        '3. 비선형 회귀 적합',
        '4. 모델 적합도 평가 (AIC, BIC)',
        '5. 성장 매개변수 해석',
        '6. 그룹간 성장 비교'
      ],
      diagnostics: ['잔차 분석', '정규성 검정', '자기상관 검정', '모델 선택 기준'],
      postHocTests: ['그룹간 매개변수 비교', '성장율 차이 검정', '최대성장점 비교']
    },
    reportingFormat: {
      tables: ['성장매개변수 추정값', '모델 적합도 비교표', '그룹별 성장률 비교', '예측 정확도 평가'],
      charts: ['성장곡선 (실측vs예측)', '개체별 성장 추이', '잔차 시계열도', '성장률 비교차트'],
      keyMetrics: ['최대 성장률', '변곡점', '최대 크기(K)', 'R²', 'RMSE', 'AIC/BIC']
    }
  },
  'water-quality-design': {
    id: 'water-quality-design',
    name: '수질 모니터링 설계',
    description: '수질 변화가 수산생물에 미치는 영향을 체계적으로 분석하는 설계',
    icon: Droplet,
    sampleSize: '처리구별 최소 3개 수조, 수조별 15개체',
    duration: '중장기 (2-12주)',
    complexity: 'medium',
    statisticalTests: ['다변량 ANOVA', '주성분 분석', '판별분석', '시계열 분석', '생존분석'],
    examples: ['온도 변화 영향', 'pH 스트레스 평가', '용존산소 임계점', '염분도 내성한계', '복합 스트레스 분석'],
    assumptions: ['수질 안정성', '개체 독립성', '측정 정확성', '환경 통제'],
    category: 'advanced',
    dataRequirements: {
      variableTypes: ['독립변수: 수질인자 (온도, pH, DO, 염분도)', '종속변수: 생물반응 (생존, 성장, 행동)'],
      preprocessing: ['수질 센서 보정', '일일 모니터링', '기준값 설정', '이상값 탐지시스템'],
      missingDataHandling: ['센서 오류시 수동측정', '단기 누락시 보간법', '장기 누락시 실험 중단'],
      minSampleSize: '처리구별 3개 수조, 수조별 15-20개체, 대조구 필수 설정'
    },
    analysisSteps: {
      sequence: [
        '1. 수질인자 기준범위 설정',
        '2. 실험구 설정 및 순화기간',
        '3. 처리구별 수질 조성',
        '4. 생물반응 모니터링',
        '5. 다변량 통계분석',
        '6. 임계점 및 안전범위 도출'
      ],
      diagnostics: ['다중공선성 진단', '이상점 탐지', '분산 동질성', '시계열 안정성'],
      postHocTests: ['Tukey HSD (그룹별 차이)', 'Dunnett (대조군 비교)', '임계점 신뢰구간']
    },
    reportingFormat: {
      tables: ['수질인자별 임계값', '생물반응 요약통계', '다변량분석 결과', '안전기준 권고안'],
      charts: ['수질-반응 관계도', '주성분 분산도', '시계열 변화도', '생존곡선'],
      keyMetrics: ['LC50/EC50', 'NOEC/LOEC', '95% 안전농도', '주성분 기여율', '판별정확도']
    }
  }
}

// 헬퍼 함수들
export const getDesignsByCategory = (categoryId: keyof typeof EXPERIMENT_CATEGORIES) => {
  const category = EXPERIMENT_CATEGORIES[categoryId]
  return category.designs.map(id => EXPERIMENTAL_DESIGNS_CONFIG[id])
}

export const getAllDesigns = () => {
  return Object.values(EXPERIMENTAL_DESIGNS_CONFIG)
}

export const getDesignById = (id: string) => {
  return EXPERIMENTAL_DESIGNS_CONFIG[id] || null
}

// 추천 로직을 위한 규칙 엔진
export interface ResearchCriteria {
  purpose?: 'compare' | 'relationship' | 'categorical' | 'causal' | 'case-study' | 'time-analysis' | 'survival' | 'dose-response' | 'optimization'
  groups?: number | '2x2' | 'mixed'
  repeated?: boolean | 'nonparametric' | 'time-series'
  variables?: number
  relationshipType?: 'correlation' | 'regression'
}

export class DesignRecommendationEngine {
  static recommend(criteria: ResearchCriteria): ExperimentDesign | null {
    try {
      if (criteria.purpose === 'compare') {
        if (criteria.groups === 2) {
          if (criteria.repeated === 'time-series') {
            return getDesignById('repeated-measures-anova')
          }
          return criteria.repeated
            ? getDesignById('paired-ttest')
            : getDesignById('independent-ttest')
        } else if (typeof criteria.groups === 'number' && criteria.groups > 2) {
          return getDesignById('one-way-anova')
        } else if (criteria.groups === 'mixed') {
          return getDesignById('mixed-design')
        }
      } else if (criteria.purpose === 'relationship') {
        return getDesignById('correlation-study')
      } else if (criteria.purpose === 'causal') {
        return getDesignById('quasi-experimental')
      } else if (criteria.purpose === 'case-study') {
        return getDesignById('single-case-design')
      } else if (criteria.purpose === 'time-analysis') {
        return getDesignById('time-series-design')
      } else if (criteria.purpose === 'survival') {
        return getDesignById('survival-analysis')
      } else if (criteria.purpose === 'dose-response') {
        return getDesignById('dose-response')
      } else if (criteria.purpose === 'optimization') {
        return getDesignById('response-surface')
      }

      // 기본값
      return getDesignById('independent-ttest')
    } catch (error) {
      console.error('Design recommendation error:', error)
      return null
    }
  }

  static validate(criteria: ResearchCriteria): boolean {
    if (!criteria.purpose) return false

    if (criteria.purpose === 'compare') {
      if (typeof criteria.groups !== 'number' || criteria.groups < 2) return false
      if (criteria.groups === 2 && typeof criteria.repeated !== 'boolean') return false
    }

    return true
  }
}