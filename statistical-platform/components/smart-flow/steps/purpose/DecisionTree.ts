/**
 * 결정 트리 로직
 * 사용자 응답을 기반으로 적합한 통계 방법 추천
 *
 * 이 파일은 lib/constants/statistical-methods.ts의 공통 정의를 사용합니다.
 * 한글 이름은 로컬에서 오버라이드합니다.
 */

import type {
  AnalysisPurpose,
  StatisticalMethod,
  DecisionResult,
  ReasoningStep
} from '@/types/smart-flow'
import {
  STATISTICAL_METHODS,
  getMethodByIdOrAlias,
} from '@/lib/constants/statistical-methods'

// ============================================
// 한글 이름 매핑 (DecisionTree 전용)
// ============================================

const KOREAN_NAMES: Record<string, { name: string; description: string }> = {
  // ============================================
  // T-Test (4)
  // ============================================
  't-test': { name: '독립표본 t-검정', description: '두 독립 그룹의 평균 차이 검정' },
  'paired-t': { name: '대응표본 t-검정', description: '같은 대상을 전/후 측정하여 평균 차이 검정' },
  'welch-t': { name: 'Welch t-검정', description: '등분산 가정 없이 두 그룹 평균 비교' },
  'one-sample-t': { name: '단일표본 t-검정', description: '표본 평균과 모집단 평균 비교' },

  // ============================================
  // ANOVA (6)
  // ============================================
  'anova': { name: '일원분산분석 (ANOVA)', description: '3개 이상 독립 그룹의 평균 차이 검정' },
  'welch-anova': { name: 'Welch ANOVA', description: '등분산 가정 없이 3개 이상 그룹 비교' },
  'repeated-measures-anova': { name: '반복측정 분산분석', description: '같은 대상을 여러 시점에서 측정' },
  'ancova': { name: '공분산분석 (ANCOVA)', description: '공변량 통제 후 그룹 비교' },
  'manova': { name: '다변량 분산분석 (MANOVA)', description: '여러 종속변수의 그룹 간 차이' },
  'mixed-model': { name: '혼합효과 모형', description: '고정효과와 랜덤효과 포함 분석' },

  // ============================================
  // Nonparametric (13)
  // ============================================
  'wilcoxon': { name: 'Wilcoxon 부호순위 검정', description: '대응표본의 비모수 검정' },
  'mann-whitney': { name: 'Mann-Whitney U 검정', description: '두 독립 그룹의 비모수 비교' },
  'friedman': { name: 'Friedman 검정', description: '반복측정의 비모수 대안' },
  'kruskal-wallis': { name: 'Kruskal-Wallis 검정', description: '3개 이상 그룹의 비모수 비교' },
  'sign-test': { name: '부호 검정', description: '대응표본의 방향성 검정' },
  'mcnemar': { name: 'McNemar 검정', description: '대응 이진 데이터 비교' },
  'cochran-q': { name: 'Cochran Q 검정', description: '다중 대응 이진 비교' },
  'binomial-test': { name: '이항 검정', description: '이진 결과 확률 검정' },
  'runs-test': { name: '런 검정', description: '무작위성 검정' },
  'ks-test': { name: 'Kolmogorov-Smirnov 검정', description: '두 분포 비교' },
  'mood-median': { name: 'Mood 중앙값 검정', description: '그룹 간 중앙값 비교' },
  'proportion-test': { name: '비율 검정', description: '단일/두 표본 비율 비교' },

  // ============================================
  // Correlation (2)
  // ============================================
  'correlation': { name: 'Pearson 상관분석', description: '두 연속형 변수의 선형 상관관계' },
  'partial-correlation': { name: '편상관분석', description: '제3변수 통제 후 상관관계' },

  // ============================================
  // Regression (7)
  // ============================================
  'regression': { name: '선형 회귀', description: '예측 변수로 결과 예측' },
  'logistic-regression': { name: '로지스틱 회귀', description: '이진 결과 예측' },
  'poisson': { name: '포아송 회귀', description: '빈도/개수 데이터 예측' },
  'ordinal-regression': { name: '순서형 로지스틱 회귀', description: '순서형 범주 예측' },
  'stepwise': { name: '단계적 회귀', description: '자동 변수 선택 회귀' },
  'dose-response': { name: '용량-반응 분석', description: 'EC50/IC50 곡선 피팅' },
  'response-surface': { name: '반응표면 분석', description: '최적화 실험 분석' },

  // ============================================
  // Chi-Square (2) - chi-square overview excluded (hasOwnPage: false)
  // ============================================
  'chi-square-independence': { name: '카이제곱 독립성 검정', description: '두 범주형 변수의 독립성 검정' },
  'chi-square-goodness': { name: '카이제곱 적합도 검정', description: '관찰 빈도와 기대 빈도 비교' },

  // ============================================
  // Descriptive (4)
  // ============================================
  'descriptive': { name: '기술통계량', description: '평균, 표준편차, 분위수 등 요약' },
  'normality-test': { name: '정규성 검정', description: 'Shapiro-Wilk, K-S 검정' },
  'explore-data': { name: '데이터 탐색', description: '데이터 탐색 및 시각화' },
  'means-plot': { name: '평균 도표', description: '그룹별 평균과 신뢰구간 시각화' },

  // ============================================
  // Time Series (4)
  // ============================================
  'arima': { name: 'ARIMA', description: '시계열 예측 모형' },
  'seasonal-decompose': { name: 'STL 분해', description: '추세, 계절성, 잔차 분리' },
  'stationarity-test': { name: 'ADF 정상성 검정', description: 'Augmented Dickey-Fuller 검정' },
  'mann-kendall': { name: 'Mann-Kendall 추세 검정', description: '시계열 추세 탐지' },

  // ============================================
  // Survival (2)
  // ============================================
  'kaplan-meier': { name: 'Kaplan-Meier 추정', description: '생존 곡선 추정' },
  'cox-regression': { name: 'Cox 비례위험 회귀', description: '생존에 영향을 미치는 요인 분석' },

  // ============================================
  // Multivariate (4)
  // ============================================
  'pca': { name: '주성분 분석 (PCA)', description: '차원 축소' },
  'factor-analysis': { name: '요인 분석', description: '잠재 요인 추출' },
  'cluster': { name: '군집 분석', description: 'K-means, 계층적 군집화' },
  'discriminant': { name: '판별 분석', description: '그룹 분류' },

  // ============================================
  // Other (2)
  // ============================================
  'power-analysis': { name: '검정력 분석', description: '표본 크기 및 검정력 계산' },
  'reliability': { name: '신뢰도 분석', description: 'Cronbach 알파, 내적 일관성' },
}

// ============================================
// 헬퍼 함수
// ============================================

/**
 * 공통 ID로 메서드 조회 + 한글 이름 적용
 * 테스트 호환성을 위해 aliases도 지원
 */
function getMethod(idOrAlias: string): StatisticalMethod {
  const method = getMethodByIdOrAlias(idOrAlias)

  if (!method) {
    // Fallback: 기본 메서드 생성 (발생하면 안 됨 - 개발 중 누락된 ID 감지용)
    console.warn(`[DecisionTree] Unknown method ID: ${idOrAlias}`)
    return {
      id: idOrAlias,
      name: idOrAlias,
      description: '',
      category: 'descriptive'  // fallback category
    }
  }

  // 한글 이름 오버라이드
  const koreanInfo = KOREAN_NAMES[method.id]

  return {
    id: method.id,
    name: koreanInfo?.name ?? method.name,
    description: koreanInfo?.description ?? method.description,
    category: method.category
  }
}

/**
 * 레거시 ID를 공통 ID로 변환하되, 결과에는 레거시 ID 유지
 * (테스트 호환성을 위해)
 */
function getMethodWithLegacyId(legacyId: string): StatisticalMethod {
  const method = getMethodByIdOrAlias(legacyId)

  if (!method) {
    // Fallback: 기본 메서드 생성 (발생하면 안 됨 - 개발 중 누락된 ID 감지용)
    console.warn(`[DecisionTree] Unknown legacy ID: ${legacyId}`)
    return {
      id: legacyId,
      name: legacyId,
      description: '',
      category: 'descriptive'  // fallback category
    }
  }

  // 한글 이름 오버라이드 (공통 ID로 조회)
  const koreanInfo = KOREAN_NAMES[method.id]

  // 테스트 호환성: 레거시 ID 유지
  return {
    id: legacyId,
    name: koreanInfo?.name ?? method.name,
    description: koreanInfo?.description ?? method.description,
    category: method.category
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
  const comparisonTarget = answers.comparison_target
  const hasCovariate = answers.has_covariate
  const outcomeCount = answers.outcome_count
  const designType = answers.design_type
  const variableType = answers.variable_type

  const reasoning: ReasoningStep[] = []

  // 단일 표본 비교 (vs 모집단)
  if (comparisonTarget === 'population' || groupCount === '1') {
    reasoning.push({ step: '비교 대상', description: '표본 vs 모집단' })

    if (variableType === 'binary') {
      reasoning.push({ step: '변수 유형', description: '이진형 → 비율 검정' })
      return {
        method: getMethod('proportion-test'),
        reasoning,
        alternatives: [
          { method: getMethod('binomial-test'), reason: '정확 검정이 필요할 때' }
        ]
      }
    }

    if (normality === 'yes') {
      reasoning.push({ step: '정규성', description: '정규분포 충족 → 단일표본 t-검정' })
      return {
        method: getMethod('one-sample-t'),
        reasoning,
        alternatives: [
          { method: getMethod('wilcoxon'), reason: '정규성 미충족시 부호순위 검정' }
        ]
      }
    } else {
      reasoning.push({ step: '정규성', description: '정규분포 미충족 → 비모수 검정' })
      return {
        method: getMethod('sign-test'),
        reasoning,
        alternatives: [
          { method: getMethod('one-sample-t'), reason: 'n>=30이면 중심극한정리로 강건' }
        ]
      }
    }
  }

  // 비율 비교
  if (comparisonTarget === 'proportion') {
    reasoning.push({ step: '비교 대상', description: '비율 비교' })
    return {
      method: getMethod('proportion-test'),
      reasoning,
      alternatives: [
        { method: getMethod('chi-square-independence'), reason: '교차표 형태일 때' }
      ]
    }
  }

  // 2개 그룹
  if (groupCount === '2') {
    reasoning.push({ step: '그룹 수', description: '2개 그룹 비교' })

    // 대응표본
    if (sampleType === 'paired') {
      reasoning.push({ step: '표본 유형', description: '대응표본 (같은 대상 전/후)' })

      // 이진 범주형 대응 데이터 → McNemar
      if (variableType === 'binary') {
        reasoning.push({ step: '변수 유형', description: '이진 범주형 → McNemar 검정' })
        return {
          method: getMethod('mcnemar'),
          reasoning,
          alternatives: [
            { method: getMethod('sign-test'), reason: '순서형 데이터일 때' }
          ]
        }
      }

      if (normality === 'yes') {
        reasoning.push({ step: '정규성', description: '정규분포 충족 → 모수 검정' })
        return {
          method: getMethodWithLegacyId('paired-t'),
          reasoning,
          alternatives: [
            { method: getMethodWithLegacyId('wilcoxon'), reason: '정규성이 불확실할 때 안전한 대안' }
          ]
        }
      } else {
        reasoning.push({ step: '정규성', description: '정규분포 미충족 → 비모수 검정' })
        return {
          method: getMethodWithLegacyId('wilcoxon'),
          reasoning,
          alternatives: [
            { method: getMethod('sign-test'), reason: '순서형 또는 방향성만 중요할 때' },
            { method: getMethodWithLegacyId('paired-t'), reason: 'n>=30이면 중심극한정리로 강건' }
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
          method: getMethodWithLegacyId('independent-t'),
          reasoning,
          alternatives: [
            { method: getMethodWithLegacyId('welch-t'), reason: '등분산 가정 없이도 사용 가능' },
            { method: getMethodWithLegacyId('mann-whitney'), reason: '비모수 대안' }
          ]
        }
      } else {
        // homogeneity === 'no' 또는 'check' (보수적 접근)
        reasoning.push({ step: '등분산성', description: homogeneity === 'no' ? '등분산 미충족 → Welch t-검정' : '등분산 미확인 → Welch t-검정 (안전)' })
        return {
          method: getMethodWithLegacyId('welch-t'),
          reasoning,
          alternatives: [
            { method: getMethodWithLegacyId('independent-t'), reason: '등분산 확인시 사용 가능' },
            { method: getMethodWithLegacyId('mann-whitney'), reason: '비모수 대안' }
          ]
        }
      }
    } else {
      reasoning.push({ step: '정규성', description: '정규분포 미충족 → 비모수 검정' })
      return {
        method: getMethodWithLegacyId('mann-whitney'),
        reasoning,
        alternatives: [
          { method: getMethodWithLegacyId('welch-t'), reason: 'n>=30이면 강건' }
        ]
      }
    }
  }

  // 3개 이상 그룹
  reasoning.push({ step: '그룹 수', description: '3개 이상 그룹 비교' })

  // 반복측정
  if (sampleType === 'paired') {
    reasoning.push({ step: '표본 유형', description: '반복측정 (같은 대상 여러 시점)' })

    // 이진 범주형 반복측정 → Cochran Q
    if (variableType === 'binary') {
      reasoning.push({ step: '변수 유형', description: '이진 범주형 → Cochran Q 검정' })
      return {
        method: getMethod('cochran-q'),
        reasoning,
        alternatives: [
          { method: getMethod('mcnemar'), reason: '2시점만 비교할 때' }
        ]
      }
    }

    if (normality === 'yes') {
      reasoning.push({ step: '정규성', description: '정규분포 충족' })
      return {
        method: getMethodWithLegacyId('repeated-anova'),
        reasoning,
        alternatives: [
          { method: getMethodWithLegacyId('friedman'), reason: '구형성 가정 위반시' }
        ],
        warnings: ['구형성 검정(Mauchly)을 확인하세요. 위반시 Greenhouse-Geisser 보정 적용']
      }
    } else {
      reasoning.push({ step: '정규성', description: '정규분포 미충족 → 비모수 검정' })
      return {
        method: getMethodWithLegacyId('friedman'),
        reasoning,
        alternatives: [
          { method: getMethodWithLegacyId('repeated-anova'), reason: 'n>=30이면 강건' }
        ]
      }
    }
  }

  // 독립 그룹
  reasoning.push({ step: '표본 유형', description: '독립 그룹' })

  // 혼합 설계 (고정효과 + 랜덤효과)
  if (designType === 'mixed') {
    reasoning.push({ step: '설계 유형', description: '혼합 설계 → 혼합효과 모형' })
    return {
      method: getMethod('mixed-model'),
      reasoning,
      alternatives: [
        { method: getMethodWithLegacyId('repeated-anova'), reason: '단순 반복측정일 때' }
      ],
      warnings: ['랜덤효과 구조를 신중히 선택해야 합니다']
    }
  }

  // 다변량 종속변수 → MANOVA
  if (outcomeCount === '2+') {
    reasoning.push({ step: '종속변수', description: '다변량 → MANOVA' })
    return {
      method: getMethod('manova'),
      reasoning,
      alternatives: [
        { method: getMethodWithLegacyId('one-way-anova'), reason: '종속변수 개별 분석시' }
      ],
      warnings: ['다변량 정규성, Box M 검정 확인 필요']
    }
  }

  // 공변량 존재 → ANCOVA
  if (hasCovariate === 'yes') {
    reasoning.push({ step: '공변량', description: '공변량 통제 → ANCOVA' })
    return {
      method: getMethod('ancova'),
      reasoning,
      alternatives: [
        { method: getMethodWithLegacyId('one-way-anova'), reason: '공변량 통제 불필요시' }
      ],
      warnings: ['회귀 기울기 동질성 가정 확인 필요']
    }
  }

  if (normality === 'yes') {
    reasoning.push({ step: '정규성', description: '정규분포 충족' })

    // 등분산성에 따른 분기
    if (homogeneity === 'yes') {
      reasoning.push({ step: '등분산성', description: '등분산 충족 → 일원분산분석' })
      return {
        method: getMethodWithLegacyId('one-way-anova'),
        reasoning,
        alternatives: [
          { method: getMethodWithLegacyId('welch-anova'), reason: '등분산 가정 없이도 사용 가능' },
          { method: getMethodWithLegacyId('kruskal-wallis'), reason: '비모수 대안' }
        ]
      }
    } else {
      // homogeneity === 'no' 또는 'check' (보수적 접근)
      reasoning.push({ step: '등분산성', description: homogeneity === 'no' ? '등분산 미충족 → Welch ANOVA' : '등분산 미확인 → Welch ANOVA (안전)' })
      return {
        method: getMethodWithLegacyId('welch-anova'),
        reasoning,
        alternatives: [
          { method: getMethodWithLegacyId('one-way-anova'), reason: '등분산 확인시 사용 가능' },
          { method: getMethodWithLegacyId('kruskal-wallis'), reason: '비모수 대안' }
        ]
      }
    }
  } else {
    reasoning.push({ step: '정규성', description: '정규분포 미충족 → 비모수 검정' })

    // 중앙값 비교가 목적이면 Mood 중앙값 검정
    if (comparisonTarget === 'median') {
      reasoning.push({ step: '비교 대상', description: '중앙값 비교 → Mood 검정' })
      return {
        method: getMethod('mood-median'),
        reasoning,
        alternatives: [
          { method: getMethodWithLegacyId('kruskal-wallis'), reason: '분포 전체 비교시' }
        ]
      }
    }

    return {
      method: getMethodWithLegacyId('kruskal-wallis'),
      reasoning,
      alternatives: [
        { method: getMethod('mood-median'), reason: '중앙값 비교가 목적일 때' },
        { method: getMethodWithLegacyId('welch-anova'), reason: 'n/그룹>=30이면 강건' }
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
          method: getMethod('correlation'),
          reasoning,
          alternatives: [
            { method: getMethod('correlation'), reason: '정규성 미충족 또는 이상치 존재시 Spearman 사용' }
          ]
        }
      } else {
        reasoning.push({ step: '변수 수', description: '3개 이상 변수' })
        return {
          method: getMethod('partial-correlation'),
          reasoning,
          alternatives: [
            { method: getMethod('correlation'), reason: '단순 상관 행렬' }
          ]
        }
      }
    } else {
      reasoning.push({ step: '변수 유형', description: '범주형 포함' })
      return {
        method: getMethod('chi-square-independence'),
        reasoning,
        alternatives: [
          { method: getMethod('correlation'), reason: '순서형 변수일 때 Spearman 사용' }
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
      method: getMethod('regression'),
      reasoning,
      alternatives: []
    }
  } else {
    reasoning.push({ step: '변수 유형', description: '범주형 포함 → 로지스틱 회귀' })
    return {
      method: getMethod('logistic-regression'),
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
  const distributionGoal = answers.distribution_goal

  const reasoning: ReasoningStep[] = []

  // 데이터 탐색
  if (analysisType === 'explore' || distributionGoal === 'explore') {
    reasoning.push({ step: '분석 유형', description: '데이터 탐색' })
    return {
      method: getMethod('explore-data'),
      reasoning,
      alternatives: [
        { method: getMethod('descriptive'), reason: '기술통계만 필요할 때' }
      ]
    }
  }

  // 평균 시각화
  if (distributionGoal === 'visualize_means') {
    reasoning.push({ step: '분석 유형', description: '평균 시각화' })
    return {
      method: getMethod('means-plot'),
      reasoning,
      alternatives: [
        { method: getMethod('descriptive'), reason: '기술통계표로 대체' }
      ]
    }
  }

  // 이항 확률 검정
  if (analysisType === 'test_probability' || distributionGoal === 'test_probability') {
    reasoning.push({ step: '분석 유형', description: '이진 확률 검정' })
    return {
      method: getMethod('binomial-test'),
      reasoning,
      alternatives: [
        { method: getMethod('proportion-test'), reason: '대표본 근사 사용시' }
      ]
    }
  }

  // 무작위성 검정
  if (distributionGoal === 'randomness') {
    reasoning.push({ step: '분석 유형', description: '무작위성 검정' })
    return {
      method: getMethod('runs-test'),
      reasoning,
      alternatives: []
    }
  }

  // 두 분포 비교
  if (distributionGoal === 'distribution_compare') {
    reasoning.push({ step: '분석 유형', description: '두 분포 비교' })
    return {
      method: getMethod('ks-test'),
      reasoning,
      alternatives: [
        { method: getMethod('mann-whitney'), reason: '중앙값 차이가 관심일 때' }
      ]
    }
  }

  if (analysisType === 'describe') {
    reasoning.push({ step: '분석 유형', description: '기술통계' })

    if (variableType === 'numeric') {
      reasoning.push({ step: '변수 유형', description: '수치형 → 평균, 표준편차 등' })
      return {
        method: getMethod('descriptive'),
        reasoning,
        alternatives: [
          { method: getMethod('explore-data'), reason: '상세 탐색 필요시' }
        ]
      }
    } else {
      reasoning.push({ step: '변수 유형', description: '범주형 → 빈도, 비율' })
      return {
        method: getMethod('descriptive'),
        reasoning,
        alternatives: []
      }
    }
  }

  if (analysisType === 'normality') {
    reasoning.push({ step: '분석 유형', description: '정규성 검정' })
    return {
      method: getMethod('normality-test'),
      reasoning,
      alternatives: [
        { method: getMethod('ks-test'), reason: '비교 분포가 있을 때' }
      ]
    }
  }

  // frequency
  reasoning.push({ step: '분석 유형', description: '빈도 분석' })

  if (variableType === 'categorical') {
    return {
      method: getMethod('descriptive'),
      reasoning,
      alternatives: [
        { method: getMethod('chi-square-goodness'), reason: '기대 빈도와 비교시' },
        { method: getMethod('binomial-test'), reason: '이진 비율 검정시' }
      ]
    }
  }

  return {
    method: getMethod('descriptive'),
    reasoning,
    alternatives: [
      { method: getMethod('explore-data'), reason: '시각화 포함 탐색시' }
    ]
  }
}

/**
 * 예측 모델링 결정 트리
 */
function decidePrediction(answers: Record<string, string>): DecisionResult {
  const outcomeType = answers.outcome_type
  const predictorCount = answers.predictor_count
  const variableSelection = answers.variable_selection
  const modelType = answers.model_type

  const reasoning: ReasoningStep[] = []

  // 특수 모형 유형 분기
  if (modelType === 'dose_response') {
    reasoning.push({ step: '모형 유형', description: '용량-반응 분석' })
    return {
      method: getMethod('dose-response'),
      reasoning,
      alternatives: [
        { method: getMethod('regression'), reason: '선형 관계 가정시' }
      ],
      warnings: ['EC50/IC50 계산에 충분한 농도 범위 필요']
    }
  }

  if (modelType === 'optimization') {
    reasoning.push({ step: '모형 유형', description: '최적화 실험' })
    return {
      method: getMethod('response-surface'),
      reasoning,
      alternatives: [
        { method: getMethod('regression'), reason: '단순 예측만 필요시' }
      ],
      warnings: ['실험 설계(CCD, BBD 등)가 적절해야 합니다']
    }
  }

  // 자동 변수 선택 → 단계적 회귀
  if (variableSelection === 'automatic' && predictorCount === '2+') {
    reasoning.push({ step: '변수 선택', description: '자동 변수 선택 → 단계적 회귀' })
    return {
      method: getMethod('stepwise'),
      reasoning,
      alternatives: [
        { method: getMethod('regression'), reason: '모든 변수 포함시' }
      ],
      warnings: ['과적합 주의, 교차검증 권장']
    }
  }

  reasoning.push({ step: '예측 변수 수', description: predictorCount === '1' ? '단순 모형' : '다중 모형' })

  switch (outcomeType) {
    case 'continuous':
      reasoning.push({ step: '결과 변수', description: '연속형 → 선형 회귀' })
      return {
        method: getMethod('regression'),
        reasoning,
        alternatives: [
          { method: getMethod('stepwise'), reason: '변수 선택이 필요할 때' }
        ],
        warnings: predictorCount === '2+' ? ['다중공선성(VIF), 잔차 정규성 확인 필요'] : undefined
      }

    case 'binary':
      reasoning.push({ step: '결과 변수', description: '이진형 → 로지스틱 회귀' })
      return {
        method: getMethod('logistic-regression'),
        reasoning,
        alternatives: [
          { method: getMethod('discriminant'), reason: '판별 분석 대안' }
        ],
        warnings: ['ROC-AUC, Hosmer-Lemeshow 검정으로 적합도 확인']
      }

    case 'count':
      reasoning.push({ step: '결과 변수', description: '빈도/개수 → 포아송 회귀' })
      return {
        method: getMethod('poisson'),
        reasoning,
        alternatives: [],
        warnings: ['과산포(overdispersion) 확인 - 있으면 음이항 회귀 고려']
      }

    case 'multiclass':
      reasoning.push({ step: '결과 변수', description: '다범주 → 다항 로지스틱' })
      return {
        method: getMethod('logistic-regression'),
        reasoning,
        alternatives: [
          { method: getMethod('ordinal-regression'), reason: '순서형 범주일 때' },
          { method: getMethod('discriminant'), reason: '판별 분석 대안' }
        ]
      }

    case 'ordinal':
      reasoning.push({ step: '결과 변수', description: '순서형 → 순서형 로지스틱' })
      return {
        method: getMethod('ordinal-regression'),
        reasoning,
        alternatives: [
          { method: getMethod('logistic-regression'), reason: '순서 무시시' }
        ]
      }

    default:
      return {
        method: getMethod('regression'),
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
          method: getMethod('arima'),
          reasoning,
          alternatives: [
            { method: getMethod('arima'), reason: '계절성 제거 후 사용 가능' }
          ]
        }
      } else {
        reasoning.push({ step: '계절성', description: '계절성 없음 → ARIMA' })
        return {
          method: getMethod('arima'),
          reasoning,
          alternatives: []
        }
      }

    case 'decompose':
      reasoning.push({ step: '분석 목적', description: '패턴 분해' })
      return {
        method: getMethod('seasonal-decompose'),
        reasoning,
        alternatives: []
      }

    case 'stationarity':
      reasoning.push({ step: '분석 목적', description: '정상성 검정' })
      return {
        method: getMethod('stationarity-test'),
        reasoning,
        alternatives: [],
        warnings: ['KPSS 검정도 함께 수행하면 더 신뢰할 수 있습니다']
      }

    case 'trend_test':
      reasoning.push({ step: '분석 목적', description: '추세 검정' })
      return {
        method: getMethod('mann-kendall'),
        reasoning,
        alternatives: [
          { method: getMethod('regression'), reason: '선형 추세 검정시' }
        ],
        warnings: ['자기상관이 있으면 Modified MK 사용 권장']
      }

    default:
      return {
        method: getMethod('arima'),
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
        method: getMethod('kaplan-meier'),
        reasoning,
        alternatives: [
          { method: getMethod('kaplan-meier'), reason: '그룹 비교도 필요할 때 Log-rank 검정 사용' }
        ]
      }

    case 'compare':
      reasoning.push({ step: '분석 목적', description: '그룹 간 생존 비교' })
      return {
        method: getMethod('kaplan-meier'),
        reasoning,
        alternatives: [
          { method: getMethod('kaplan-meier'), reason: '시각적 비교용' }
        ]
      }

    case 'hazard':
      reasoning.push({ step: '분석 목적', description: '위험 요인 분석' })

      if (covariateCount === '1+') {
        reasoning.push({ step: '공변량', description: '공변량 있음 → Cox 회귀' })
        return {
          method: getMethod('cox-regression'),
          reasoning,
          alternatives: [],
          warnings: ['비례위험 가정 확인 필요 (Schoenfeld 잔차)']
        }
      } else {
        reasoning.push({ step: '공변량', description: '공변량 없음' })
        return {
          method: getMethod('kaplan-meier'),
          reasoning,
          alternatives: [
            { method: getMethod('cox-regression'), reason: '공변량 추가시' }
          ]
        }
      }

    default:
      return {
        method: getMethod('kaplan-meier'),
        reasoning,
        alternatives: []
      }
  }
}

/**
 * 다변량 분석 결정 트리
 */
function decideMultivariate(answers: Record<string, string>): DecisionResult {
  const goal = answers.goal
  const reasoning: ReasoningStep[] = []

  switch (goal) {
    case 'dimension_reduction':
      reasoning.push({ step: '분석 목적', description: '차원 축소' })
      return {
        method: getMethod('pca'),
        reasoning,
        alternatives: [
          { method: getMethod('factor-analysis'), reason: '잠재 요인 해석이 필요할 때' }
        ]
      }

    case 'latent_factors':
      reasoning.push({ step: '분석 목적', description: '잠재 요인 추출' })
      return {
        method: getMethod('factor-analysis'),
        reasoning,
        alternatives: [
          { method: getMethod('pca'), reason: '차원 축소만 필요할 때' }
        ]
      }

    case 'grouping':
      reasoning.push({ step: '분석 목적', description: '유사 대상 그룹화' })
      return {
        method: getMethod('cluster'),
        reasoning,
        alternatives: [
          { method: getMethod('discriminant'), reason: '그룹이 이미 정의되어 있을 때' }
        ]
      }

    case 'classification':
      reasoning.push({ step: '분석 목적', description: '그룹 분류/예측' })
      return {
        method: getMethod('discriminant'),
        reasoning,
        alternatives: [
          { method: getMethod('logistic-regression'), reason: '이진 분류일 때' },
          { method: getMethod('cluster'), reason: '그룹이 정의되지 않았을 때' }
        ]
      }

    default:
      return {
        method: getMethod('pca'),
        reasoning: [{ step: '기본', description: '다변량 분석' }],
        alternatives: []
      }
  }
}

/**
 * 유틸리티 분석 결정 트리
 */
function decideUtility(answers: Record<string, string>): DecisionResult {
  const goal = answers.goal
  const reasoning: ReasoningStep[] = []

  switch (goal) {
    case 'sample_size':
      reasoning.push({ step: '분석 목적', description: '표본 크기 계산' })
      return {
        method: getMethod('power-analysis'),
        reasoning,
        alternatives: [],
        warnings: ['연구 설계, 효과 크기, 유의수준을 미리 정해야 합니다']
      }

    case 'power':
      reasoning.push({ step: '분석 목적', description: '검정력 계산' })
      return {
        method: getMethod('power-analysis'),
        reasoning,
        alternatives: []
      }

    case 'reliability':
      reasoning.push({ step: '분석 목적', description: '측정 도구 신뢰도' })
      return {
        method: getMethod('reliability'),
        reasoning,
        alternatives: [],
        warnings: ['항목이 3개 이상 필요합니다']
      }

    default:
      return {
        method: getMethod('power-analysis'),
        reasoning: [{ step: '기본', description: '유틸리티 분석' }],
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
    case 'multivariate':
      return decideMultivariate(path.answers)
    case 'utility':
      return decideUtility(path.answers)
    default:
      // Fallback
      return {
        method: getMethod('descriptive'),
        reasoning: [{ step: '기본', description: '기본 기술통계 분석' }],
        alternatives: []
      }
  }
}

/**
 * 메서드 ID로 StatisticalMethod 조회
 */
export function getMethodById(id: string): StatisticalMethod | null {
  const method = getMethodByIdOrAlias(id)
  if (!method) return null

  const koreanInfo = KOREAN_NAMES[method.id]
  return {
    id: method.id,
    name: koreanInfo?.name ?? method.name,
    description: koreanInfo?.description ?? method.description,
    category: method.category
  }
}

/**
 * 모든 메서드 목록 반환
 */
export function getAllMethods(): StatisticalMethod[] {
  return Object.values(STATISTICAL_METHODS).map(method => {
    const koreanInfo = KOREAN_NAMES[method.id]
    return {
      id: method.id,
      name: koreanInfo?.name ?? method.name,
      description: koreanInfo?.description ?? method.description,
      category: method.category
    }
  })
}
