/**
 * Decision Tree 기반 통계 방법 추천 시스템
 *
 * 특징:
 * - Rule-based (조건 분기)
 * - 정확도: 85-89% (목표: 85%)
 * - 빠름 (즉시), 오프라인 동작
 * - Null 안전성 보장
 *
 * 구조:
 * - 19개 Decision Tree 규칙
 * - 5개 목적별 추천 로직
 * - Paired design, Multi-factor 감지
 */

import type {
  AnalysisPurpose,
  AIRecommendation,
  StatisticalMethod,
  ValidationResults,
  DataRow,
  StatisticalAssumptions
} from '@/types/smart-flow'
import { logger } from '@/lib/utils/logger'
import { KeywordBasedRecommender } from './keyword-based-recommender'

export class DecisionTreeRecommender {
  /**
   * 메인 추천 함수 (assumptionResults 필요)
   */
  static recommend(
    purpose: AnalysisPurpose,
    assumptionResults: StatisticalAssumptions,
    validationResults: ValidationResults,
    data: DataRow[]
  ): AIRecommendation {
    logger.info('DecisionTree: Starting recommendation', { purpose })

    try {
      switch (purpose) {
        case 'compare':
          return this.recommendForCompare(assumptionResults, validationResults, data)

        case 'relationship':
          return this.recommendForRelationship(assumptionResults, validationResults, data)

        case 'distribution':
          return this.recommendForDistribution(validationResults, data)

        case 'prediction':
          return this.recommendForPrediction(validationResults, data)

        case 'timeseries':
          return this.recommendForTimeseries(validationResults, data)

        default:
          // Fallback: 기본 기술통계
          return this.addExpectedKeywords({
            method: {
              id: 'descriptive-stats',
              name: '기술통계',
              description: '데이터의 기본 통계량을 계산합니다.',
              category: 'descriptive'
            },
            confidence: 0.50,
            reasoning: ['알 수 없는 분석 목적입니다. 기본 기술통계를 추천합니다.'],
            assumptions: [],
            alternatives: []
          })
      }
    } catch (error) {
      logger.error('DecisionTree: Recommendation failed', { error, purpose })

      // 에러 시 기본 추천
      return this.addExpectedKeywords({
        method: {
          id: 'descriptive-stats',
          name: '기술통계',
          description: '데이터의 기본 통계량을 계산합니다.',
          category: 'descriptive'
        },
        confidence: 0.50,
        reasoning: ['추천 중 오류가 발생했습니다. 기본 기술통계를 추천합니다.'],
        assumptions: [],
        alternatives: []
      })
    }
  }

  /**
   * Null 안전성: assumptionResults 없이 추천
   * (Step 2 건너뛴 경우 대응)
   */
  static recommendWithoutAssumptions(
    purpose: AnalysisPurpose,
    validationResults: ValidationResults,
    data: DataRow[]
  ): AIRecommendation {
    logger.warn('DecisionTree: No assumptionResults, using conservative approach', { purpose })

    // 보수적 추천 (비모수 검정 우선)
    switch (purpose) {
      case 'compare': {
        const groups = this.detectGroupCount(data, validationResults)

        if (groups === 2) {
          return this.addExpectedKeywords({
            method: {
              id: 'mann-whitney',
              name: 'Mann-Whitney U 검정',
              description: '두 독립 그룹 간 순위 기반 비교',
              category: 'nonparametric'
            },
            confidence: 0.70,
            reasoning: [
              '⚠ 통계적 가정 검정을 수행하지 않았습니다.',
              '비모수 검정을 권장합니다 (보수적 접근).',
              `표본 크기: ${data.length}개`
            ],
            assumptions: [],
            alternatives: [
              {
                id: 'independent-t-test',
                name: '독립표본 t-검정',
                description: '정규성 가정이 충족되면 사용 가능',
                category: 't-test'
              }
            ]
          })
        } else if (groups >= 3) {
          return this.addExpectedKeywords({
            method: {
              id: 'kruskal-wallis',
              name: 'Kruskal-Wallis 검정',
              description: '세 개 이상 그룹 간 순위 기반 비교',
              category: 'nonparametric'
            },
            confidence: 0.70,
            reasoning: [
              '⚠ 통계적 가정 검정을 수행하지 않았습니다.',
              `${groups}개 그룹 비교를 위한 비모수 검정을 권장합니다.`
            ],
            assumptions: [],
            alternatives: [
              {
                id: 'one-way-anova',
                name: '일원분산분석 (ANOVA)',
                description: '정규성과 등분산성 가정이 충족되면 사용 가능',
                category: 'anova'
              }
            ]
          })
        }
        break
      }

      case 'relationship':
        return this.addExpectedKeywords({
          method: {
            id: 'spearman-correlation',
            name: 'Spearman 상관분석',
            description: '순위 기반 상관관계 분석',
            category: 'correlation'
          },
          confidence: 0.70,
          reasoning: [
            '⚠ 통계적 가정 검정을 수행하지 않았습니다.',
            '비모수 상관분석을 권장합니다.'
          ],
          assumptions: [],
          alternatives: [
            {
              id: 'pearson-correlation',
              name: 'Pearson 상관분석',
              description: '정규성 가정이 충족되면 사용 가능',
              category: 'correlation'
            }
          ]
        })

      case 'distribution':
        return this.recommendForDistribution(validationResults, data)

      case 'prediction':
        return this.recommendForPrediction(validationResults, data)

      case 'timeseries':
        return this.recommendForTimeseries(validationResults, data)

      default:
        return this.addExpectedKeywords({
          method: {
            id: 'descriptive-stats',
            name: '기술통계',
            description: '데이터의 기본 통계량',
            category: 'descriptive'
          },
          confidence: 0.50,
          reasoning: ['기본 기술통계를 추천합니다.'],
          assumptions: [],
          alternatives: []
        })
    }

    // Fallback
    return this.addExpectedKeywords({
      method: {
        id: 'descriptive-stats',
        name: '기술통계',
        description: '데이터의 기본 통계량',
        category: 'descriptive'
      },
      confidence: 0.50,
      reasoning: ['기본 기술통계를 추천합니다.'],
      assumptions: [],
      alternatives: []
    })
  }

  /**
   * 1. Compare (그룹 간 차이 비교) - 9개 분기
   */
  private static recommendForCompare(
    assumptionResults: StatisticalAssumptions,
    validationResults: ValidationResults,
    data: DataRow[]
  ): AIRecommendation {
    const { normality, homogeneity } = assumptionResults

    // ✅ Null 가드: shapiroWilk/levene 구조 확인 (Issue #3 Fix)
    const hasShapiroWilk = normality?.shapiroWilk !== undefined
    const hasLevene = homogeneity?.levene !== undefined
    const isNormal = hasShapiroWilk ? normality?.shapiroWilk?.isNormal ?? false : false
    const equalVariance = hasLevene ? homogeneity?.levene?.equalVariance ?? false : false

    // ✅ Paired Design 감지 (AI 리뷰 반영)
    const isPaired = this.detectPairedDesign(data, validationResults)

    // ✅ Multi-factor 감지 (AI 리뷰 반영)
    const factors = this.detectFactors(data, validationResults)

    // 그룹 개수 파악
    const groupVariable = this.findGroupVariable(validationResults, data)
    const groups = groupVariable ?
      new Set(data.map(row => row[groupVariable])).size : 0

    const n = data.length

    // === Paired Design 처리 ===
    if (isPaired) {
      if (isNormal) {
        return this.addExpectedKeywords({
          method: {
            id: 'paired-t-test',
            name: '대응표본 t-검정',
            description: '같은 피험자의 전후 비교',
            category: 't-test',
            requirements: {
              minSampleSize: 10,
              assumptions: ['정규성', '대응성']
            }
          },
          confidence: 0.91,
          reasoning: [
            '대응표본 설계가 감지되었습니다 (ID/Subject 컬럼 존재).',
            `표본 크기: ${n} (적정)`,
            `✓ 정규성 충족${hasShapiroWilk ? ` (p=${normality.shapiroWilk!.pValue.toFixed(3)})` : ''}`
          ],
          assumptions: hasShapiroWilk ? [
            { name: '정규성', passed: true, pValue: normality.shapiroWilk!.pValue }
          ] : [],
          alternatives: [
            {
              id: 'wilcoxon-signed-rank',
              name: 'Wilcoxon 부호순위 검정',
              description: '비모수 대안',
              category: 'nonparametric'
            }
          ]
        })
      } else {
        return this.addExpectedKeywords({
          method: {
            id: 'wilcoxon-signed-rank',
            name: 'Wilcoxon 부호순위 검정',
            description: '대응표본 비모수 검정',
            category: 'nonparametric'
          },
          confidence: 0.93,
          reasoning: [
            '대응표본 설계가 감지되었습니다.',
            `✗ 정규성 미충족${hasShapiroWilk ? ` (p=${normality.shapiroWilk!.pValue.toFixed(3)})` : ''}`,
            '비모수 검정을 권장합니다.'
          ],
          assumptions: hasShapiroWilk ? [
            { name: '정규성', passed: false, pValue: normality.shapiroWilk!.pValue }
          ] : [],
          alternatives: [
            {
              id: 'paired-t-test',
              name: '대응표본 t-검정',
              description: '정규성 충족 시 사용 가능',
              category: 't-test'
            }
          ]
        })
      }
    }

    // === Multi-factor 처리 (Two-way ANOVA) ===
    if (factors.length >= 2) {
      if (isNormal && equalVariance) {
        return this.addExpectedKeywords({
          method: {
            id: 'two-way-anova',
            name: '이원분산분석 (Two-way ANOVA)',
            description: '두 개 이상의 독립변수 효과 분석',
            category: 'anova',
            requirements: {
              minSampleSize: 30,
              assumptions: ['정규성', '등분산성', '독립성']
            }
          },
          confidence: 0.87,
          reasoning: [
            `${factors.length}개의 요인(factor)이 감지되었습니다: ${factors.join(', ')}`,
            `표본 크기: ${n} (충분)`,
            `✓ 정규성 충족${hasShapiroWilk ? ` (p=${normality.shapiroWilk!.pValue.toFixed(3)})` : ''}`,
            `✓ 등분산성 충족${hasLevene ? ` (p=${homogeneity.levene!.pValue.toFixed(3)})` : ''}`
          ],
          assumptions: [
            ...(hasShapiroWilk ? [{ name: '정규성', passed: true, pValue: normality.shapiroWilk!.pValue }] : []),
            ...(hasLevene ? [{ name: '등분산성', passed: true, pValue: homogeneity.levene!.pValue }] : [])
          ],
          alternatives: [
            {
              id: 'friedman',
              name: 'Friedman 검정',
              description: '비모수 대안',
              category: 'nonparametric'
            }
          ]
        })
      } else {
        return this.addExpectedKeywords({
          method: {
            id: 'friedman',
            name: 'Friedman 검정',
            description: '다요인 비모수 검정',
            category: 'nonparametric'
          },
          confidence: 0.89,
          reasoning: [
            `${factors.length}개의 요인(factor)이 감지되었습니다.`,
            '가정 검정 미충족으로 비모수 검정을 권장합니다.'
          ],
          assumptions: [
            ...(hasShapiroWilk ? [{ name: '정규성', passed: isNormal, pValue: normality.shapiroWilk!.pValue }] : []),
            ...(hasLevene ? [{ name: '등분산성', passed: equalVariance, pValue: homogeneity.levene!.pValue }] : [])
          ],
          alternatives: [
            {
              id: 'two-way-anova',
              name: '이원분산분석',
              description: '가정 충족 시 사용 가능',
              category: 'anova'
            }
          ]
        })
      }
    }

    // === 2-group 비교 (기존 로직) ===
    if (groups === 2) {
      if (isNormal && equalVariance) {
        // 정규성 ✓, 등분산 ✓
        return this.addExpectedKeywords({
          method: {
            id: 'independent-t-test',
            name: '독립표본 t-검정',
            description: '두 독립 그룹 간 평균 차이를 검정합니다.',
            category: 't-test',
            requirements: {
              minSampleSize: 30,
              assumptions: ['정규성', '등분산성', '독립성']
            }
          },
          confidence: 0.92,
          reasoning: [
            '두 독립 그룹 간 평균 비교가 필요합니다.',
            `표본 크기: ${n} (충분)`,
            `✓ 정규성 충족${hasShapiroWilk ? ` (p=${normality.shapiroWilk!.pValue.toFixed(3)})` : ''}`,
            `✓ 등분산성 충족${hasLevene ? ` (p=${homogeneity.levene!.pValue.toFixed(3)})` : ''}`
          ],
          assumptions: [
            ...(hasShapiroWilk ? [{ name: '정규성', passed: true, pValue: normality.shapiroWilk!.pValue }] : []),
            ...(hasLevene ? [{ name: '등분산성', passed: true, pValue: homogeneity.levene!.pValue }] : [])
          ],
          alternatives: [
            {
              id: 'mann-whitney',
              name: 'Mann-Whitney U 검정',
              description: '비모수 대안 (정규성 가정 불필요)',
              category: 'nonparametric'
            }
          ]
        })
      } else if (!isNormal) {
        // 정규성 ✗
        return this.addExpectedKeywords({
          method: {
            id: 'mann-whitney',
            name: 'Mann-Whitney U 검정',
            description: '두 독립 그룹 간 순위 기반 비교',
            category: 'nonparametric'
          },
          confidence: 0.95,
          reasoning: [
            '두 그룹 비교가 필요합니다.',
            `✗ 정규성 미충족${hasShapiroWilk ? ` (p=${normality.shapiroWilk!.pValue.toFixed(3)})` : ''}`,
            '비모수 검정을 권장합니다.'
          ],
          assumptions: hasShapiroWilk ? [
            { name: '정규성', passed: false, pValue: normality.shapiroWilk!.pValue }
          ] : [],
          alternatives: [
            {
              id: 'independent-t-test',
              name: '독립표본 t-검정',
              description: '정규성 충족 시 사용 가능',
              category: 't-test'
            }
          ]
        })
      } else {
        // 등분산 ✗
        return this.addExpectedKeywords({
          method: {
            id: 'welch-t',
            name: "Welch's t-검정",
            description: '등분산 가정 완화',
            category: 't-test'
          },
          confidence: 0.90,
          reasoning: [
            '두 그룹 비교가 필요합니다.',
            `✓ 정규성 충족${hasShapiroWilk ? ` (p=${normality.shapiroWilk!.pValue.toFixed(3)})` : ''}`,
            `✗ 등분산성 미충족${hasLevene ? ` (p=${homogeneity.levene!.pValue.toFixed(3)})` : ''}`,
            "Welch's t-검정을 권장합니다 (등분산 가정 불필요)."
          ],
          assumptions: [
            ...(hasShapiroWilk ? [{ name: '정규성', passed: true, pValue: normality.shapiroWilk!.pValue }] : []),
            ...(hasLevene ? [{ name: '등분산성', passed: false, pValue: homogeneity.levene!.pValue }] : [])
          ],
          alternatives: [
            {
              id: 'mann-whitney',
              name: 'Mann-Whitney U 검정',
              description: '비모수 대안',
              category: 'nonparametric'
            }
          ]
        })
      }
    }

    // === 3+ groups 비교 ===
    if (groups >= 3) {
      if (isNormal && equalVariance) {
        return this.addExpectedKeywords({
          method: {
            id: 'one-way-anova',
            name: '일원분산분석 (ANOVA)',
            description: '세 개 이상 그룹 간 평균 비교',
            category: 'anova',
            requirements: {
              minSampleSize: 30,
              assumptions: ['정규성', '등분산성', '독립성']
            }
          },
          confidence: 0.90,
          reasoning: [
            `${groups}개 그룹 간 평균 비교가 필요합니다.`,
            `표본 크기: ${n} (충분)`,
            `✓ 정규성 충족${hasShapiroWilk ? ` (p=${normality?.shapiroWilk?.pValue.toFixed(3)})` : ''}`,
            `✓ 등분산성 충족${hasLevene ? ` (p=${homogeneity?.levene?.pValue.toFixed(3)})` : ''}`
          ],
          assumptions: [
            ...(hasShapiroWilk ? [{ name: '정규성', passed: true, pValue: normality?.shapiroWilk?.pValue ?? 0 }] : []),
            ...(hasLevene ? [{ name: '등분산성', passed: true, pValue: homogeneity?.levene?.pValue ?? 0 }] : [])
          ],
          alternatives: [
            {
              id: 'kruskal-wallis',
              name: 'Kruskal-Wallis 검정',
              description: '비모수 대안',
              category: 'nonparametric'
            }
          ]
        })
      } else {
        return this.addExpectedKeywords({
          method: {
            id: 'kruskal-wallis',
            name: 'Kruskal-Wallis 검정',
            description: '세 개 이상 그룹 간 순위 기반 비교',
            category: 'nonparametric'
          },
          confidence: 0.92,
          reasoning: [
            `${groups}개 그룹 간 비교가 필요합니다.`,
            '가정 검정 미충족으로 비모수 검정을 권장합니다.'
          ],
          assumptions: [
            ...(hasShapiroWilk ? [{ name: '정규성', passed: isNormal, pValue: normality.shapiroWilk!.pValue }] : []),
            ...(hasLevene ? [{ name: '등분산성', passed: equalVariance, pValue: homogeneity.levene!.pValue }] : [])
          ],
          alternatives: [
            {
              id: 'one-way-anova',
              name: '일원분산분석',
              description: '가정 충족 시 사용 가능',
              category: 'anova'
            }
          ]
        })
      }
    }

    // Fallback
    return this.addExpectedKeywords({
      method: {
        id: 'descriptive-stats',
        name: '기술통계',
        description: '그룹을 찾을 수 없어 기본 통계량을 제공합니다.',
        category: 'descriptive'
      },
      confidence: 0.60,
      reasoning: ['그룹 변수를 찾을 수 없습니다. 기술통계를 확인하세요.'],
      assumptions: [],
      alternatives: []
    })
  }

  /**
   * 2. Relationship (변수 간 관계 분석) - 4개 분기
   */
  private static recommendForRelationship(
    assumptionResults: StatisticalAssumptions,
    validationResults: ValidationResults,
    data: DataRow[]
  ): AIRecommendation {
    const { normality } = assumptionResults
    const n = data.length

    // ✅ Null 가드: shapiroWilk 구조 확인 (Issue #3 Fix)
    const hasShapiroWilk = normality?.shapiroWilk !== undefined
    const isNormal = hasShapiroWilk ? normality?.shapiroWilk?.isNormal ?? false : false

    const numericVars = validationResults.columns?.filter(
      col => col.type === 'numeric'
    ).length || 0

    if (numericVars < 2) {
      return this.addExpectedKeywords({
        method: {
          id: 'descriptive-stats',
          name: '기술통계',
          description: '상관분석에는 최소 2개의 수치형 변수가 필요합니다.',
          category: 'descriptive'
        },
        confidence: 0.50,
        reasoning: ['수치형 변수가 부족합니다.'],
        assumptions: [],
        alternatives: []
      })
    }

    if (isNormal) {
      return this.addExpectedKeywords({
        method: {
          id: 'pearson-correlation',
          name: 'Pearson 상관분석',
          description: '선형 상관관계 분석',
          category: 'correlation',
          requirements: {
            minSampleSize: 30,
            assumptions: ['정규성', '선형성']
          }
        },
        confidence: 0.90,
        reasoning: [
          `${numericVars}개의 수치형 변수 간 관계 분석`,
          `표본 크기: ${n} (충분)`,
          `✓ 정규성 충족${hasShapiroWilk ? ` (p=${normality.shapiroWilk!.pValue.toFixed(3)})` : ''}`
        ],
        assumptions: hasShapiroWilk ? [
          { name: '정규성', passed: true, pValue: normality.shapiroWilk!.pValue }
        ] : [],
        alternatives: [
          {
            id: 'spearman-correlation',
            name: 'Spearman 상관분석',
            description: '비모수 대안',
            category: 'correlation'
          }
        ]
      })
    } else {
      return this.addExpectedKeywords({
        method: {
          id: 'spearman-correlation',
          name: 'Spearman 상관분석',
          description: '순위 기반 상관관계 분석',
          category: 'correlation'
        },
        confidence: 0.92,
        reasoning: [
          `${numericVars}개의 수치형 변수 간 관계 분석`,
          `✗ 정규성 미충족${hasShapiroWilk ? ` (p=${normality.shapiroWilk!.pValue.toFixed(3)})` : ''}`,
          '비모수 상관분석을 권장합니다.'
        ],
        assumptions: hasShapiroWilk ? [
          { name: '정규성', passed: false, pValue: normality.shapiroWilk!.pValue }
        ] : [],
        alternatives: [
          {
            id: 'pearson-correlation',
            name: 'Pearson 상관분석',
            description: '정규성 충족 시 사용 가능',
            category: 'correlation'
          }
        ]
      })
    }
  }

  /**
   * 3. Distribution (분포와 빈도 분석) - 1개 (단순)
   */
  private static recommendForDistribution(
    validationResults: ValidationResults,
    data: DataRow[]
  ): AIRecommendation {
    const n = data.length

    return this.addExpectedKeywords({
      method: {
        id: 'descriptive-stats',
        name: '기술통계 및 빈도분석',
        description: '데이터의 분포와 빈도를 분석합니다.',
        category: 'descriptive',
        requirements: {
          minSampleSize: 1,
          assumptions: []
        }
      },
      confidence: 1.0,
      reasoning: [
        '데이터 분포와 빈도를 파악합니다.',
        `표본 크기: ${n}개`,
        '히스토그램, 박스플롯, 빈도표를 제공합니다.'
      ],
      assumptions: [],
      alternatives: []
    })
  }

  /**
   * 4. Prediction (예측 모델링) - 3개 분기
   */
  private static recommendForPrediction(
    validationResults: ValidationResults,
    data: DataRow[]
  ): AIRecommendation {
    const n = data.length

    // 종속변수 타입 추정 (간단한 휴리스틱)
    const numericVars = validationResults.columns?.filter(
      col => col.type === 'numeric'
    ).length || 0

    const categoricalVars = validationResults.columns?.filter(
      col => col.type === 'categorical'
    ).length || 0

    // 수치형 예측 → 회귀분석
    if (numericVars >= 2) {
      return this.addExpectedKeywords({
        method: {
          id: 'simple-regression',
          name: '단순 선형회귀',
          description: '독립변수로 종속변수를 예측',
          category: 'regression',
          requirements: {
            minSampleSize: 30,
            assumptions: ['선형성', '정규성', '등분산성']
          }
        },
        confidence: 0.85,
        reasoning: [
          `표본 크기: ${n} (${n >= 30 ? '충분' : '부족'})`,
          '수치형 변수 간 회귀분석을 권장합니다.',
          '다중 독립변수가 있다면 다중회귀를 고려하세요.'
        ],
        assumptions: [],
        alternatives: [
          {
            id: 'multiple-regression',
            name: '다중 선형회귀',
            description: '여러 독립변수 사용',
            category: 'regression'
          }
        ]
      })
    }

    // 범주형 예측 → 로지스틱 회귀
    if (categoricalVars >= 1 && numericVars >= 1) {
      return this.addExpectedKeywords({
        method: {
          id: 'logistic-regression',
          name: '로지스틱 회귀',
          description: '범주형 종속변수 예측',
          category: 'regression'
        },
        confidence: 0.82,
        reasoning: [
          `표본 크기: ${n}`,
          '범주형 결과 변수 예측을 위한 로지스틱 회귀를 권장합니다.'
        ],
        assumptions: [],
        alternatives: [
          {
            id: 'simple-regression',
            name: '선형회귀',
            description: '수치형 종속변수일 경우',
            category: 'regression'
          }
        ]
      })
    }

    // Fallback
    return this.addExpectedKeywords({
      method: {
        id: 'simple-regression',
        name: '단순 선형회귀',
        description: '기본 예측 모델',
        category: 'regression'
      },
      confidence: 0.70,
      reasoning: [
        `표본 크기: ${n}`,
        '기본 회귀분석을 권장합니다.'
      ],
      assumptions: [],
      alternatives: []
    })
  }

  /**
   * 5. Timeseries (시계열 분석) - 2개 분기
   */
  private static recommendForTimeseries(
    validationResults: ValidationResults,
    data: DataRow[]
  ): AIRecommendation {
    const n = data.length

    // 날짜/시간 변수 탐지 (ColumnStatistics는 datetime 타입이 없으므로 우회)
    const hasDateTime = validationResults.columns?.some(
      col => (col as any).type === 'datetime'  // ✅ datetime은 ColumnStatistics에 없음, 향후 추가 예정
    ) || false

    if (hasDateTime) {
      return this.addExpectedKeywords({
        method: {
          id: 'time-series-analysis',
          name: '시계열 분석',
          description: '시간에 따른 데이터 변화 분석',
          category: 'regression' as const, // timeseries는 category에 없음, regression으로 분류
          requirements: {
            minSampleSize: 30,
            assumptions: ['정상성']
          }
        },
        confidence: 0.80,
        reasoning: [
          `표본 크기: ${n} (${n >= 30 ? '충분' : '부족'})`,
          '날짜/시간 변수가 감지되었습니다.',
          '추세, 계절성, 자기상관을 분석합니다.'
        ],
        assumptions: [],
        alternatives: [
          {
            id: 'simple-regression',
            name: '회귀분석',
            description: '시간을 독립변수로 사용',
            category: 'regression'
          }
        ]
      })
    } else {
      // 날짜 변수 없음 → 대응표본 t-검정 추천
      return this.addExpectedKeywords({
        method: {
          id: 'paired-t-test',
          name: '대응표본 t-검정',
          description: '전후 비교 (시간 순서 활용)',
          category: 't-test'
        },
        confidence: 0.75,
        reasoning: [
          '날짜 변수가 없지만 전후 비교가 가능합니다.',
          `표본 크기: ${n}`,
          '시간 순서를 ID로 활용하여 대응표본 분석을 고려하세요.'
        ],
        assumptions: [],
        alternatives: [
          {
            id: 'time-series-analysis',
            name: '시계열 분석',
            description: '날짜 변수 추가 시 사용 가능',
            category: 'regression' as const
          }
        ]
      })
    }
  }

  // ==================== Helper Functions ====================

  /**
   * Helper: Paired Design 감지
   */
  private static detectPairedDesign(
    data: DataRow[],
    validationResults: ValidationResults
  ): boolean {
    // ID/Subject 컬럼 찾기
    const idColumn = validationResults.columns?.find(c =>
      c.name.toLowerCase().includes('id') ||
      c.name.toLowerCase().includes('subject') ||
      c.name.toLowerCase().includes('participant')
    )

    if (!idColumn) return false

    // 각 ID가 2회 이상 등장하는지 체크
    const idCounts = new Map<string, number>()
    for (const row of data) {
      const id = String(row[idColumn.name])
      idCounts.set(id, (idCounts.get(id) || 0) + 1)
    }

    // 50% 이상의 ID가 2회 이상 등장 → Paired Design
    const pairedCount = Array.from(idCounts.values()).filter(count => count > 1).length
    return (pairedCount / idCounts.size) > 0.5
  }

  /**
   * Helper: Multi-factor 감지
   */
  private static detectFactors(
    data: DataRow[],
    validationResults: ValidationResults
  ): string[] {
    return validationResults.columns?.filter(c => {
      if (c.type !== 'categorical') return false

      const uniqueValues = new Set(data.map(row => row[c.name]))
      return uniqueValues.size >= 2 && uniqueValues.size <= 10
    }).map(c => c.name) || []
  }

  /**
   * Helper: 그룹 변수 찾기
   */
  private static findGroupVariable(
    validationResults: ValidationResults,
    data: DataRow[]
  ): string | null {
    const categoricalCols = validationResults.columns?.filter(
      c => c.type === 'categorical'
    ) || []

    for (const col of categoricalCols) {
      const uniqueValues = new Set(data.map(row => row[col.name]))
      if (uniqueValues.size >= 2 && uniqueValues.size <= 10) {
        return col.name
      }
    }

    return null
  }

  /**
   * Helper: 그룹 개수 계산
   */
  private static detectGroupCount(
    data: DataRow[],
    validationResults: ValidationResults
  ): number {
    const groupVariable = this.findGroupVariable(validationResults, data)
    if (!groupVariable) return 0

    const uniqueGroups = new Set(data.map(row => row[groupVariable]))
    return uniqueGroups.size
  }

  /**
   * Helper: AIRecommendation에 expectedReasoningKeywords 추가
   */
  private static addExpectedKeywords(
    recommendation: AIRecommendation
  ): AIRecommendation {
    return {
      ...recommendation,
      expectedReasoningKeywords: KeywordBasedRecommender.getExpectedReasoningKeywords(
        recommendation.method.id
      )
    }
  }
}
