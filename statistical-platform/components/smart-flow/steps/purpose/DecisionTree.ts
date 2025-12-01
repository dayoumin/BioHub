/**
 * 결정 트리 로직
 * 사용자 응답을 기반으로 적합한 통계 방법 추천
 */

import type {
  AnalysisPurpose,
  StatisticalMethod,
  DecisionResult,
  ReasoningStep
} from '@/types/smart-flow'

// ============================================
// 통계 방법 정의
// ============================================

const METHODS: Record<string, StatisticalMethod> = {
  // 평균 비교
  'paired-t': {
    id: 'paired-t',
    name: '대응표본 t-검정',
    description: '같은 대상을 전/후 측정하여 평균 차이 검정',
    category: 't-test'
  },
  'independent-t': {
    id: 'independent-t',
    name: '독립표본 t-검정',
    description: '두 독립 그룹의 평균 차이 검정',
    category: 't-test'
  },
  'welch-t': {
    id: 'welch-t',
    name: 'Welch t-검정',
    description: '등분산 가정 없이 두 그룹 평균 비교',
    category: 't-test'
  },
  'wilcoxon': {
    id: 'wilcoxon',
    name: 'Wilcoxon 부호순위 검정',
    description: '대응표본의 비모수 검정',
    category: 'nonparametric'
  },
  'mann-whitney': {
    id: 'mann-whitney',
    name: 'Mann-Whitney U 검정',
    description: '두 독립 그룹의 비모수 비교',
    category: 'nonparametric'
  },
  'one-way-anova': {
    id: 'one-way-anova',
    name: '일원분산분석 (ANOVA)',
    description: '3개 이상 독립 그룹의 평균 차이 검정',
    category: 'anova'
  },
  'welch-anova': {
    id: 'welch-anova',
    name: 'Welch ANOVA',
    description: '등분산 가정 없이 3개 이상 그룹 비교',
    category: 'anova'
  },
  'repeated-anova': {
    id: 'repeated-anova',
    name: '반복측정 분산분석',
    description: '같은 대상을 여러 시점에서 측정',
    category: 'anova'
  },
  'friedman': {
    id: 'friedman',
    name: 'Friedman 검정',
    description: '반복측정의 비모수 대안',
    category: 'nonparametric'
  },
  'kruskal-wallis': {
    id: 'kruskal-wallis',
    name: 'Kruskal-Wallis 검정',
    description: '3개 이상 그룹의 비모수 비교',
    category: 'nonparametric'
  },

  // 상관분석
  'pearson': {
    id: 'pearson',
    name: 'Pearson 상관분석',
    description: '두 연속형 변수의 선형 상관관계',
    category: 'correlation'
  },
  'spearman': {
    id: 'spearman',
    name: 'Spearman 순위상관',
    description: '순위 기반 비모수 상관분석',
    category: 'correlation'
  },
  'partial-correlation': {
    id: 'partial-correlation',
    name: '편상관분석',
    description: '제3변수 통제 후 상관관계',
    category: 'correlation'
  },

  // 회귀분석
  'simple-regression': {
    id: 'simple-regression',
    name: '단순 선형 회귀',
    description: '하나의 예측 변수로 결과 예측',
    category: 'regression'
  },
  'multiple-regression': {
    id: 'multiple-regression',
    name: '다중 선형 회귀',
    description: '여러 예측 변수로 결과 예측',
    category: 'regression'
  },
  'logistic-regression': {
    id: 'logistic-regression',
    name: '로지스틱 회귀',
    description: '이진 결과 예측',
    category: 'regression'
  },
  'poisson-regression': {
    id: 'poisson-regression',
    name: '포아송 회귀',
    description: '빈도/개수 데이터 예측',
    category: 'regression'
  },
  'ordinal-regression': {
    id: 'ordinal-regression',
    name: '순서형 로지스틱 회귀',
    description: '순서형 범주 예측',
    category: 'regression'
  },
  'multinomial-regression': {
    id: 'multinomial-regression',
    name: '다항 로지스틱 회귀',
    description: '다범주 결과 예측',
    category: 'regression'
  },

  // 카이제곱
  'chi-square-independence': {
    id: 'chi-square-independence',
    name: '카이제곱 독립성 검정',
    description: '두 범주형 변수의 독립성 검정',
    category: 'chi-square'
  },
  'chi-square-goodness': {
    id: 'chi-square-goodness',
    name: '카이제곱 적합도 검정',
    description: '관찰 빈도와 기대 빈도 비교',
    category: 'chi-square'
  },

  // 기술통계
  'descriptive': {
    id: 'descriptive',
    name: '기술통계량',
    description: '평균, 표준편차, 분위수 등 요약',
    category: 'descriptive'
  },
  'frequency': {
    id: 'frequency',
    name: '빈도분석',
    description: '범주별 빈도와 비율',
    category: 'descriptive'
  },
  'normality-test': {
    id: 'normality-test',
    name: '정규성 검정',
    description: 'Shapiro-Wilk, K-S 검정',
    category: 'descriptive'
  },

  // 시계열
  'arima': {
    id: 'arima',
    name: 'ARIMA',
    description: '시계열 예측 모형',
    category: 'timeseries'
  },
  'sarima': {
    id: 'sarima',
    name: '계절성 ARIMA (SARIMA)',
    description: '계절성이 있는 시계열 예측',
    category: 'timeseries'
  },
  'stl-decomposition': {
    id: 'stl-decomposition',
    name: 'STL 분해',
    description: '추세, 계절성, 잔차 분리',
    category: 'timeseries'
  },
  'adf-test': {
    id: 'adf-test',
    name: 'ADF 정상성 검정',
    description: 'Augmented Dickey-Fuller 검정',
    category: 'timeseries'
  },

  // 생존분석
  'kaplan-meier': {
    id: 'kaplan-meier',
    name: 'Kaplan-Meier 추정',
    description: '생존 곡선 추정',
    category: 'survival'
  },
  'log-rank': {
    id: 'log-rank',
    name: 'Log-rank 검정',
    description: '그룹 간 생존 비교',
    category: 'survival'
  },
  'cox-regression': {
    id: 'cox-regression',
    name: 'Cox 비례위험 회귀',
    description: '생존에 영향을 미치는 요인 분석',
    category: 'survival'
  }
}

// ============================================
// 결정 함수들
// ============================================

/**
 * 그룹 간 차이 비교 결정 트리
 */
function decideCompare(answers: Record<string, string>): DecisionResult {
  const groupCount = answers.group_count
  const sampleType = answers.sample_type
  const normality = answers.normality
  const homogeneity = answers.homogeneity

  const reasoning: ReasoningStep[] = []

  // 2개 그룹
  if (groupCount === '2') {
    reasoning.push({ step: '그룹 수', description: '2개 그룹 비교' })

    // 대응표본
    if (sampleType === 'paired') {
      reasoning.push({ step: '표본 유형', description: '대응표본 (같은 대상 전/후)' })

      if (normality === 'yes') {
        reasoning.push({ step: '정규성', description: '정규분포 충족 → 모수 검정' })
        return {
          method: METHODS['paired-t'],
          reasoning,
          alternatives: [
            { method: METHODS['wilcoxon'], reason: '정규성이 불확실할 때 안전한 대안' }
          ]
        }
      } else {
        reasoning.push({ step: '정규성', description: '정규분포 미충족 → 비모수 검정' })
        return {
          method: METHODS['wilcoxon'],
          reasoning,
          alternatives: [
            { method: METHODS['paired-t'], reason: 'n>=30이면 중심극한정리로 강건' }
          ]
        }
      }
    }

    // 독립표본
    reasoning.push({ step: '표본 유형', description: '독립표본 (서로 다른 대상)' })

    if (normality === 'yes') {
      reasoning.push({ step: '정규성', description: '정규분포 충족' })

      // 등분산성에 따른 분기
      if (homogeneity === 'yes') {
        reasoning.push({ step: '등분산성', description: '등분산 충족 → Student t-검정' })
        return {
          method: METHODS['independent-t'],
          reasoning,
          alternatives: [
            { method: METHODS['welch-t'], reason: '등분산 가정 없이도 사용 가능' },
            { method: METHODS['mann-whitney'], reason: '비모수 대안' }
          ]
        }
      } else {
        // homogeneity === 'no' 또는 'check' (보수적 접근)
        reasoning.push({ step: '등분산성', description: homogeneity === 'no' ? '등분산 미충족 → Welch t-검정' : '등분산 미확인 → Welch t-검정 (안전)' })
        return {
          method: METHODS['welch-t'],
          reasoning,
          alternatives: [
            { method: METHODS['independent-t'], reason: '등분산 확인시 사용 가능' },
            { method: METHODS['mann-whitney'], reason: '비모수 대안' }
          ]
        }
      }
    } else {
      reasoning.push({ step: '정규성', description: '정규분포 미충족 → 비모수 검정' })
      return {
        method: METHODS['mann-whitney'],
        reasoning,
        alternatives: [
          { method: METHODS['welch-t'], reason: 'n>=30이면 강건' }
        ]
      }
    }
  }

  // 3개 이상 그룹
  reasoning.push({ step: '그룹 수', description: '3개 이상 그룹 비교' })

  // 반복측정
  if (sampleType === 'paired') {
    reasoning.push({ step: '표본 유형', description: '반복측정 (같은 대상 여러 시점)' })

    if (normality === 'yes') {
      reasoning.push({ step: '정규성', description: '정규분포 충족' })
      return {
        method: METHODS['repeated-anova'],
        reasoning,
        alternatives: [
          { method: METHODS['friedman'], reason: '구형성 가정 위반시' }
        ],
        warnings: ['구형성 검정(Mauchly)을 확인하세요. 위반시 Greenhouse-Geisser 보정 적용']
      }
    } else {
      reasoning.push({ step: '정규성', description: '정규분포 미충족 → 비모수 검정' })
      return {
        method: METHODS['friedman'],
        reasoning,
        alternatives: [
          { method: METHODS['repeated-anova'], reason: 'n>=30이면 강건' }
        ]
      }
    }
  }

  // 독립 그룹
  reasoning.push({ step: '표본 유형', description: '독립 그룹' })

  if (normality === 'yes') {
    reasoning.push({ step: '정규성', description: '정규분포 충족' })

    // 등분산성에 따른 분기
    if (homogeneity === 'yes') {
      reasoning.push({ step: '등분산성', description: '등분산 충족 → 일원분산분석' })
      return {
        method: METHODS['one-way-anova'],
        reasoning,
        alternatives: [
          { method: METHODS['welch-anova'], reason: '등분산 가정 없이도 사용 가능' },
          { method: METHODS['kruskal-wallis'], reason: '비모수 대안' }
        ]
      }
    } else {
      // homogeneity === 'no' 또는 'check' (보수적 접근)
      reasoning.push({ step: '등분산성', description: homogeneity === 'no' ? '등분산 미충족 → Welch ANOVA' : '등분산 미확인 → Welch ANOVA (안전)' })
      return {
        method: METHODS['welch-anova'],
        reasoning,
        alternatives: [
          { method: METHODS['one-way-anova'], reason: '등분산 확인시 사용 가능' },
          { method: METHODS['kruskal-wallis'], reason: '비모수 대안' }
        ]
      }
    }
  } else {
    reasoning.push({ step: '정규성', description: '정규분포 미충족 → 비모수 검정' })
    return {
      method: METHODS['kruskal-wallis'],
      reasoning,
      alternatives: [
        { method: METHODS['welch-anova'], reason: 'n/그룹>=30이면 강건' }
      ]
    }
  }
}

/**
 * 변수 간 관계 분석 결정 트리
 */
function decideRelationship(answers: Record<string, string>): DecisionResult {
  const relationType = answers.relationship_type
  const variableCount = answers.variable_count
  const variableType = answers.variable_type

  const reasoning: ReasoningStep[] = []

  // 상관분석
  if (relationType === 'correlation') {
    reasoning.push({ step: '분석 유형', description: '상관관계 분석' })

    if (variableType === 'numeric') {
      reasoning.push({ step: '변수 유형', description: '모두 수치형' })

      if (variableCount === '2') {
        reasoning.push({ step: '변수 수', description: '2개 변수' })
        return {
          method: METHODS['pearson'],
          reasoning,
          alternatives: [
            { method: METHODS['spearman'], reason: '정규성 미충족 또는 이상치 존재시' }
          ]
        }
      } else {
        reasoning.push({ step: '변수 수', description: '3개 이상 변수' })
        return {
          method: METHODS['partial-correlation'],
          reasoning,
          alternatives: [
            { method: METHODS['pearson'], reason: '단순 상관 행렬' }
          ]
        }
      }
    } else {
      reasoning.push({ step: '변수 유형', description: '범주형 포함' })
      return {
        method: METHODS['chi-square-independence'],
        reasoning,
        alternatives: [
          { method: METHODS['spearman'], reason: '순서형 변수일 때' }
        ]
      }
    }
  }

  // 예측/회귀
  reasoning.push({ step: '분석 유형', description: '예측/회귀 분석' })
  reasoning.push({ step: '변수 수', description: variableCount === '2' ? '단순 회귀' : '다중 회귀' })

  if (variableType === 'numeric') {
    reasoning.push({ step: '변수 유형', description: '모두 수치형' })
    return {
      method: variableCount === '2' ? METHODS['simple-regression'] : METHODS['multiple-regression'],
      reasoning,
      alternatives: []
    }
  } else {
    reasoning.push({ step: '변수 유형', description: '범주형 포함 → 로지스틱 회귀' })
    return {
      method: METHODS['logistic-regression'],
      reasoning,
      alternatives: []
    }
  }
}

/**
 * 분포와 빈도 분석 결정 트리
 */
function decideDistribution(answers: Record<string, string>): DecisionResult {
  const analysisType = answers.analysis_type
  const variableType = answers.variable_type

  const reasoning: ReasoningStep[] = []

  if (analysisType === 'describe') {
    reasoning.push({ step: '분석 유형', description: '기술통계' })

    if (variableType === 'numeric') {
      reasoning.push({ step: '변수 유형', description: '수치형 → 평균, 표준편차 등' })
      return {
        method: METHODS['descriptive'],
        reasoning,
        alternatives: []
      }
    } else {
      reasoning.push({ step: '변수 유형', description: '범주형 → 빈도, 비율' })
      return {
        method: METHODS['frequency'],
        reasoning,
        alternatives: []
      }
    }
  }

  if (analysisType === 'normality') {
    reasoning.push({ step: '분석 유형', description: '정규성 검정' })
    return {
      method: METHODS['normality-test'],
      reasoning,
      alternatives: []
    }
  }

  // frequency
  reasoning.push({ step: '분석 유형', description: '빈도 분석' })

  if (variableType === 'categorical') {
    return {
      method: METHODS['frequency'],
      reasoning,
      alternatives: [
        { method: METHODS['chi-square-goodness'], reason: '기대 빈도와 비교시' }
      ]
    }
  }

  return {
    method: METHODS['descriptive'],
    reasoning,
    alternatives: []
  }
}

/**
 * 예측 모델링 결정 트리
 */
function decidePrediction(answers: Record<string, string>): DecisionResult {
  const outcomeType = answers.outcome_type
  const predictorCount = answers.predictor_count

  const reasoning: ReasoningStep[] = []
  reasoning.push({ step: '예측 변수 수', description: predictorCount === '1' ? '단순 모형' : '다중 모형' })

  switch (outcomeType) {
    case 'continuous':
      reasoning.push({ step: '결과 변수', description: '연속형 → 선형 회귀' })
      return {
        method: predictorCount === '1' ? METHODS['simple-regression'] : METHODS['multiple-regression'],
        reasoning,
        alternatives: [],
        warnings: predictorCount === '2+' ? ['다중공선성(VIF), 잔차 정규성 확인 필요'] : undefined
      }

    case 'binary':
      reasoning.push({ step: '결과 변수', description: '이진형 → 로지스틱 회귀' })
      return {
        method: METHODS['logistic-regression'],
        reasoning,
        alternatives: [],
        warnings: ['ROC-AUC, Hosmer-Lemeshow 검정으로 적합도 확인']
      }

    case 'count':
      reasoning.push({ step: '결과 변수', description: '빈도/개수 → 포아송 회귀' })
      return {
        method: METHODS['poisson-regression'],
        reasoning,
        alternatives: [],
        warnings: ['과산포(overdispersion) 확인 - 있으면 음이항 회귀 고려']
      }

    case 'multiclass':
      reasoning.push({ step: '결과 변수', description: '다범주 → 다항 로지스틱' })
      return {
        method: METHODS['multinomial-regression'],
        reasoning,
        alternatives: [
          { method: METHODS['ordinal-regression'], reason: '순서형 범주일 때' }
        ]
      }

    default:
      return {
        method: METHODS['multiple-regression'],
        reasoning,
        alternatives: []
      }
  }
}

/**
 * 시계열 분석 결정 트리
 */
function decideTimeseries(answers: Record<string, string>): DecisionResult {
  const goal = answers.goal
  const seasonality = answers.seasonality

  const reasoning: ReasoningStep[] = []

  switch (goal) {
    case 'forecast':
      reasoning.push({ step: '분석 목적', description: '미래 예측' })

      if (seasonality === 'yes') {
        reasoning.push({ step: '계절성', description: '계절성 있음 → SARIMA' })
        return {
          method: METHODS['sarima'],
          reasoning,
          alternatives: [
            { method: METHODS['arima'], reason: '계절성 제거 후 사용 가능' }
          ]
        }
      } else {
        reasoning.push({ step: '계절성', description: '계절성 없음 → ARIMA' })
        return {
          method: METHODS['arima'],
          reasoning,
          alternatives: []
        }
      }

    case 'decompose':
      reasoning.push({ step: '분석 목적', description: '패턴 분해' })
      return {
        method: METHODS['stl-decomposition'],
        reasoning,
        alternatives: []
      }

    case 'stationarity':
      reasoning.push({ step: '분석 목적', description: '정상성 검정' })
      return {
        method: METHODS['adf-test'],
        reasoning,
        alternatives: [],
        warnings: ['KPSS 검정도 함께 수행하면 더 신뢰할 수 있습니다']
      }

    default:
      return {
        method: METHODS['arima'],
        reasoning,
        alternatives: []
      }
  }
}

/**
 * 생존 분석 결정 트리
 */
function decideSurvival(answers: Record<string, string>): DecisionResult {
  const goal = answers.goal
  const covariateCount = answers.covariate_count

  const reasoning: ReasoningStep[] = []

  switch (goal) {
    case 'curve':
      reasoning.push({ step: '분석 목적', description: '생존 곡선 추정' })
      return {
        method: METHODS['kaplan-meier'],
        reasoning,
        alternatives: [
          { method: METHODS['log-rank'], reason: '그룹 비교도 필요할 때' }
        ]
      }

    case 'compare':
      reasoning.push({ step: '분석 목적', description: '그룹 간 생존 비교' })
      return {
        method: METHODS['log-rank'],
        reasoning,
        alternatives: [
          { method: METHODS['kaplan-meier'], reason: '시각적 비교용' }
        ]
      }

    case 'hazard':
      reasoning.push({ step: '분석 목적', description: '위험 요인 분석' })

      if (covariateCount === '1+') {
        reasoning.push({ step: '공변량', description: '공변량 있음 → Cox 회귀' })
        return {
          method: METHODS['cox-regression'],
          reasoning,
          alternatives: [],
          warnings: ['비례위험 가정 확인 필요 (Schoenfeld 잔차)']
        }
      } else {
        reasoning.push({ step: '공변량', description: '공변량 없음' })
        return {
          method: METHODS['kaplan-meier'],
          reasoning,
          alternatives: [
            { method: METHODS['cox-regression'], reason: '공변량 추가시' }
          ]
        }
      }

    default:
      return {
        method: METHODS['kaplan-meier'],
        reasoning,
        alternatives: []
      }
  }
}

// ============================================
// 메인 결정 함수
// ============================================

export interface DecisionPath {
  purpose: AnalysisPurpose
  answers: Record<string, string>
}

/**
 * 사용자 응답을 기반으로 통계 방법 결정
 */
export function decide(path: DecisionPath): DecisionResult {
  switch (path.purpose) {
    case 'compare':
      return decideCompare(path.answers)
    case 'relationship':
      return decideRelationship(path.answers)
    case 'distribution':
      return decideDistribution(path.answers)
    case 'prediction':
      return decidePrediction(path.answers)
    case 'timeseries':
      return decideTimeseries(path.answers)
    case 'survival':
      return decideSurvival(path.answers)
    default:
      // Fallback
      return {
        method: METHODS['descriptive'],
        reasoning: [{ step: '기본', description: '기본 기술통계 분석' }],
        alternatives: []
      }
  }
}

/**
 * 메서드 ID로 StatisticalMethod 조회
 */
export function getMethodById(id: string): StatisticalMethod | null {
  return METHODS[id] || null
}

/**
 * 모든 메서드 목록 반환
 */
export function getAllMethods(): StatisticalMethod[] {
  return Object.values(METHODS)
}
