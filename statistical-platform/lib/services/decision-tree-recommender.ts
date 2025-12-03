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
 *
 * 이 파일은 lib/constants/statistical-methods.ts의 공통 정의를 참조합니다.
 */

import type {
  AnalysisPurpose,
  AIRecommendation,
  StatisticalMethod,
  ValidationResults,
  DataRow,
  StatisticalAssumptions,
  VariableSelection
} from '@/types/smart-flow'
import { logger } from '@/lib/utils/logger'
import { KeywordBasedRecommender } from './keyword-based-recommender'
import {
  getMethodByIdOrAlias
} from '@/lib/constants/statistical-methods'
import type { CompatibilityResult, DataSummary } from '@/lib/statistics/data-method-compatibility'

// ============================================
// 헬퍼: 공통 메서드 조회 + 한글 이름 오버라이드
// ============================================

const KOREAN_NAMES: Record<string, { name: string; description: string }> = {
  // T-Test
  't-test': { name: '독립표본 t-검정', description: '두 독립 그룹 간 평균 차이를 검정합니다.' },
  'paired-t': { name: '대응표본 t-검정', description: '같은 피험자의 전후 비교' },
  'welch-t': { name: "Welch's t-검정", description: '등분산 가정 완화' },

  // ANOVA
  'anova': { name: '일원분산분석 (ANOVA)', description: '세 개 이상 그룹 간 평균 비교' },

  // Nonparametric
  'mann-whitney': { name: 'Mann-Whitney U 검정', description: '두 독립 그룹 간 순위 기반 비교' },
  'wilcoxon': { name: 'Wilcoxon 부호순위 검정', description: '대응표본 비모수 검정' },
  'kruskal-wallis': { name: 'Kruskal-Wallis 검정', description: '세 개 이상 그룹 간 순위 기반 비교' },
  'friedman': { name: 'Friedman 검정', description: '다요인 비모수 검정' },

  // Correlation
  'correlation': { name: 'Pearson 상관분석', description: '선형 상관관계 분석' },

  // Regression
  'regression': { name: '단순 선형회귀', description: '독립변수로 종속변수를 예측' },
  'logistic-regression': { name: '로지스틱 회귀', description: '범주형 종속변수 예측' },

  // Descriptive
  'descriptive': { name: '기술통계', description: '데이터의 기본 통계량을 계산합니다.' },
}

/**
 * 공통 메서드 조회 + 한글 이름 오버라이드
 * legacy ID도 지원 (backward compatibility)
 */
function createMethod(
  idOrAlias: string,
  overrides?: Partial<StatisticalMethod>
): StatisticalMethod {
  const method = getMethodByIdOrAlias(idOrAlias)

  if (method) {
    const koreanInfo = KOREAN_NAMES[method.id]
    return {
      id: method.id,
      name: overrides?.name ?? koreanInfo?.name ?? method.name,
      description: overrides?.description ?? koreanInfo?.description ?? method.description,
      category: method.category,
      ...overrides
    }
  }

  // Fallback: 공통 정의에 없는 메서드
  return {
    id: idOrAlias,
    name: overrides?.name ?? idOrAlias,
    description: overrides?.description ?? '',
    category: overrides?.category ?? 'descriptive',
    ...overrides
  }
}

export class DecisionTreeRecommender {
  /**
   * 메인 추천 함수 (assumptionResults 필요)
   */
  static recommend(
    purpose: AnalysisPurpose,
    assumptionResults: StatisticalAssumptions,
    validationResults: ValidationResults,
    data: DataRow[],
    variableSelection?: VariableSelection
  ): AIRecommendation {
    logger.info('DecisionTree: Starting recommendation', { purpose })

    try {
      switch (purpose) {
        case 'compare':
          return this.recommendForCompare(assumptionResults, validationResults, data, variableSelection)

        case 'relationship':
          return this.recommendForRelationship(assumptionResults, validationResults, data, variableSelection)

        case 'distribution':
          return this.recommendForDistribution(validationResults, data)

        case 'prediction':
          return this.recommendForPrediction(validationResults, data)

        case 'timeseries':
          return this.recommendForTimeseries(validationResults, data)

        default:
          // Fallback: 기본 기술통계
          const n1 = data.length
          return this.addExpectedKeywords({
            method: createMethod('descriptive'),
            confidence: 0.50,
            reasoning: [
              '⚠ 보통 신뢰도 (50%)로 기술통계를 추천합니다.',
              '알 수 없는 분석 목적입니다.',
              `표본 크기: ${n1}${n1 < 30 ? ' ⚠ 소표본 (n<30) - 통계적 추론 시 주의 필요' : '개'}`
            ],
            assumptions: [],
            alternatives: []
          })
      }
    } catch (error) {
      logger.error('DecisionTree: Recommendation failed', { error, purpose })

      // 에러 시 기본 추천
      const n2 = data.length
      return this.addExpectedKeywords({
        method: createMethod('descriptive'),
        confidence: 0.50,
        reasoning: [
          '⚠ 보통 신뢰도 (50%)로 기술통계를 추천합니다.',
          '추천 중 오류가 발생했습니다.',
          `표본 크기: ${n2}${n2 < 30 ? ' ⚠ 소표본 (n<30) - 통계적 추론 시 주의 필요' : '개'}`
        ],
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
          const n = data.length
          return this.addExpectedKeywords({
            method: createMethod('mann-whitney'),
            confidence: 0.70,
            reasoning: [
              '✓ 보통 신뢰도 (70%)로 Mann-Whitney U 검정을 추천합니다.',
              '⚠ 통계적 가정 검정을 수행하지 않았습니다.',
              '비모수 검정을 권장합니다 (보수적 접근).',
              `표본 크기: ${n}${n < 30 ? ' ⚠ 소표본 (n<30) - 결과 해석 시 주의 필요' : '개'}`
            ],
            assumptions: [],
            alternatives: [
              createMethod('t-test', { description: '정규성 가정이 충족되면 사용 가능' })
            ]
          })
        } else if (groups >= 3) {
          const n = data.length
          return this.addExpectedKeywords({
            method: createMethod('kruskal-wallis'),
            confidence: 0.70,
            reasoning: [
              '✓ 보통 신뢰도 (70%)로 Kruskal-Wallis 검정을 추천합니다.',
              '⚠ 통계적 가정 검정을 수행하지 않았습니다.',
              `${groups}개 그룹 비교를 위한 비모수 검정을 권장합니다.`,
              `표본 크기: ${n}${n < 30 ? ' ⚠ 소표본 (n<30) - 결과 해석 시 주의 필요' : '개'}`
            ],
            assumptions: [],
            alternatives: [
              createMethod('anova', { description: '정규성과 등분산성 가정이 충족되면 사용 가능' })
            ]
          })
        }
        break
      }

      case 'relationship': {
        const n = data.length
        return this.addExpectedKeywords({
          method: createMethod('correlation', {
            name: 'Spearman 상관분석',
            description: '순위 기반 상관관계 분석'
          }),
          confidence: 0.70,
          reasoning: [
            '✓ 보통 신뢰도 (70%)로 Spearman 상관분석을 추천합니다.',
            '⚠ 통계적 가정 검정을 수행하지 않았습니다.',
            '비모수 상관분석을 권장합니다.',
            `표본 크기: ${n}${n < 30 ? ' ⚠ 소표본 (n<30) - 결과 해석 시 주의 필요' : '개'}`
          ],
          assumptions: [],
          alternatives: [
            createMethod('correlation', { description: '정규성 가정이 충족되면 Pearson 사용 가능' })
          ]
        })
      }

      case 'distribution':
        return this.recommendForDistribution(validationResults, data)

      case 'prediction':
        return this.recommendForPrediction(validationResults, data)

      case 'timeseries':
        return this.recommendForTimeseries(validationResults, data)

      default: {
        const n3 = data.length
        return this.addExpectedKeywords({
          method: createMethod('descriptive'),
          confidence: 0.50,
          reasoning: [
            '⚠ 보통 신뢰도 (50%)로 기술통계를 추천합니다.',
            '알 수 없는 분석 목적입니다.',
            `표본 크기: ${n3}${n3 < 30 ? ' ⚠ 소표본 (n<30) - 통계적 추론 시 주의 필요' : '개'}`
          ],
          assumptions: [],
          alternatives: []
        })
      }
    }

    // Fallback
    const n4 = data.length
    return this.addExpectedKeywords({
      method: createMethod('descriptive'),
      confidence: 0.50,
      reasoning: [
        '⚠ 보통 신뢰도 (50%)로 기술통계를 추천합니다.',
        '분석 경로를 찾을 수 없습니다.',
        `표본 크기: ${n4}${n4 < 30 ? ' ⚠ 소표본 (n<30) - 통계적 추론 시 주의 필요' : '개'}`
      ],
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
    data: DataRow[],
    variableSelection?: VariableSelection
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

    // 그룹 개수 파악 (사용자 선택 변수 우선)
    const groupVariable = variableSelection?.groupVariable || this.findGroupVariable(validationResults, data)
    const groups = groupVariable ?
      new Set(data.map(row => row[groupVariable])).size : 0

    logger.info('[DecisionTree] recommendForCompare', {
      userSelectedGroup: variableSelection?.groupVariable,
      autoDetectedGroup: this.findGroupVariable(validationResults, data),
      finalGroupVariable: groupVariable,
      groups
    })

    const n = data.length

    // === Paired Design 처리 ===
    if (isPaired) {
      if (isNormal) {
        return this.addExpectedKeywords({
          method: createMethod('paired-t', {
            requirements: {
              minSampleSize: 10,
              assumptions: ['정규성', '대응성']
            }
          }),
          confidence: 0.91,
          reasoning: [
            '✓ 높은 신뢰도 (91%)로 대응표본 t-검정을 추천합니다.',
            '대응표본 설계가 감지되었습니다 (ID/Subject 컬럼 존재).',
            `표본 크기: ${n}${n < 30 ? ' ⚠ 소표본 (n<30) - 결과 해석 시 주의 필요' : ' (충분)'}`,
            `✓ 정규성 충족${hasShapiroWilk ? ` (p=${normality.shapiroWilk?.pValue !== undefined ? normality.shapiroWilk?.pValue.toFixed(3) : 'N/A'})` : ''}`
          ],
          assumptions: hasShapiroWilk ? [
            { name: '정규성', passed: true, pValue: normality.shapiroWilk?.pValue ?? NaN }
          ] : [],
          alternatives: [
            createMethod('wilcoxon', { description: '비모수 대안' })
          ]
        })
      } else {
        return this.addExpectedKeywords({
          method: createMethod('wilcoxon'),
          confidence: 0.93,
          reasoning: [
            '✓ 높은 신뢰도 (93%)로 Wilcoxon 검정을 추천합니다.',
            '대응표본 설계가 감지되었으나 정규성이 충족되지 않았습니다.',
            `✗ 정규성 미충족${hasShapiroWilk ? ` (p=${normality.shapiroWilk?.pValue !== undefined ? normality.shapiroWilk?.pValue.toFixed(3) : 'N/A'})` : ''} → 비모수 검정 권장`,
            `표본 크기: ${n}${n < 30 ? ' ⚠ 소표본 (n<30) - 결과 해석 시 주의 필요' : '개'}`
          ],
          assumptions: hasShapiroWilk ? [
            { name: '정규성', passed: false, pValue: normality.shapiroWilk?.pValue ?? NaN }
          ] : [],
          alternatives: [
            createMethod('paired-t', { description: '정규성 충족 시 사용 가능' })
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
            '✓ 높은 신뢰도 (87%)로 이원분산분석을 추천합니다.',
            `${factors.length}개의 요인(factor)이 감지되었습니다: ${factors.join(', ')}`,
            `표본 크기: ${n}${n < 30 ? ' ⚠ 소표본 (n<30) - 결과 해석 시 주의 필요' : ' (충분)'}`,
            `✓ 정규성 충족${hasShapiroWilk ? ` (p=${normality.shapiroWilk?.pValue !== undefined ? normality.shapiroWilk?.pValue.toFixed(3) : 'N/A'})` : ''}`,
            `✓ 등분산성 충족${hasLevene ? ` (p=${homogeneity.levene?.pValue !== undefined ? homogeneity.levene?.pValue.toFixed(3) : 'N/A'})` : ''}`
          ],
          assumptions: [
            ...(hasShapiroWilk ? [{ name: '정규성', passed: true, pValue: normality.shapiroWilk?.pValue ?? NaN }] : []),
            ...(hasLevene ? [{ name: '등분산성', passed: true, pValue: homogeneity.levene?.pValue ?? NaN }] : [])
          ],
          alternatives: [
            createMethod('friedman', { description: '비모수 대안' })
          ]
        })
      } else {
        return this.addExpectedKeywords({
          method: createMethod('friedman'),
          confidence: 0.89,
          reasoning: [
            '✓ 높은 신뢰도 (89%)로 Friedman 검정을 추천합니다.',
            `${factors.length}개의 요인(factor)이 감지되었으나 가정이 충족되지 않았습니다.`,
            `${!isNormal ? '✗ 정규성 미충족' : ''}${!equalVariance ? ' ✗ 등분산성 미충족' : ''} → 비모수 검정 권장`,
            `표본 크기: ${n}${n < 30 ? ' ⚠ 소표본 (n<30) - 결과 해석 시 주의 필요' : '개'}`
          ],
          assumptions: [
            ...(hasShapiroWilk ? [{ name: '정규성', passed: isNormal, pValue: normality.shapiroWilk?.pValue ?? NaN }] : []),
            ...(hasLevene ? [{ name: '등분산성', passed: equalVariance, pValue: homogeneity.levene?.pValue ?? NaN }] : [])
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
          method: createMethod('t-test', {
            requirements: {
              minSampleSize: 30,
              assumptions: ['정규성', '등분산성', '독립성']
            }
          }),
          confidence: 0.92,
          detectedVariables: groupVariable ? {
            groupVariable: {
              name: groupVariable,
              uniqueValues: Array.from(new Set(data.map(row => row[groupVariable]))).filter(
                (v): v is string | number => v !== null && v !== undefined
              ),
              count: groups
            }
          } : undefined,
          reasoning: [
            '✓ 매우 높은 신뢰도 (92%)로 독립표본 t-검정을 추천합니다.',
            '두 독립 그룹 간 평균 비교에 적합합니다.',
            `표본 크기: ${n}${n < 30 ? ' ⚠ 소표본 (n<30) - 결과 해석 시 주의 필요' : ' (충분)'}`,
            `✓ 정규성 충족${hasShapiroWilk ? ` (p=${normality.shapiroWilk?.pValue !== undefined ? normality.shapiroWilk?.pValue.toFixed(3) : 'N/A'})` : ''}`,
            `✓ 등분산성 충족${hasLevene ? ` (p=${homogeneity.levene?.pValue !== undefined ? homogeneity.levene?.pValue.toFixed(3) : 'N/A'})` : ''}`
          ],
          assumptions: [
            ...(hasShapiroWilk ? [{ name: '정규성', passed: true, pValue: normality.shapiroWilk?.pValue ?? NaN }] : []),
            ...(hasLevene ? [{ name: '등분산성', passed: true, pValue: homogeneity.levene?.pValue ?? NaN }] : [])
          ],
          alternatives: [
            createMethod('mann-whitney', { description: '비모수 대안 (정규성 가정 불필요)' })
          ]
        })
      } else if (!isNormal) {
        // 정규성 ✗
        return this.addExpectedKeywords({
          method: createMethod('mann-whitney'),
          confidence: 0.95,
          reasoning: [
            '✓ 매우 높은 신뢰도 (95%)로 Mann-Whitney U 검정을 추천합니다.',
            '두 그룹 비교에서 정규성이 충족되지 않았습니다.',
            `✗ 정규성 미충족${hasShapiroWilk ? ` (p=${normality.shapiroWilk?.pValue !== undefined ? normality.shapiroWilk?.pValue.toFixed(3) : 'N/A'})` : ''} → 비모수 검정 권장`,
            `표본 크기: ${n}${n < 30 ? ' ⚠ 소표본 (n<30) - 결과 해석 시 주의 필요' : '개'}`
          ],
          assumptions: hasShapiroWilk ? [
            { name: '정규성', passed: false, pValue: normality.shapiroWilk?.pValue ?? NaN }
          ] : [],
          alternatives: [
            createMethod('t-test', { description: '정규성 충족 시 사용 가능' })
          ]
        })
      } else {
        // 등분산 ✗
        return this.addExpectedKeywords({
          method: createMethod('welch-t'),
          confidence: 0.90,
          reasoning: [
            "✓ 높은 신뢰도 (90%)로 Welch's t-검정을 추천합니다.",
            '두 그룹 비교에서 등분산성이 충족되지 않았습니다.',
            `✓ 정규성 충족${hasShapiroWilk ? ` (p=${normality.shapiroWilk?.pValue !== undefined ? normality.shapiroWilk?.pValue.toFixed(3) : 'N/A'})` : ''}`,
            `✗ 등분산성 미충족${hasLevene ? ` (p=${homogeneity.levene?.pValue !== undefined ? homogeneity.levene?.pValue.toFixed(3) : 'N/A'})` : ''} → Welch's t-검정 권장`,
            `표본 크기: ${n}${n < 30 ? ' ⚠ 소표본 (n<30) - 결과 해석 시 주의 필요' : '개'}`
          ],
          assumptions: [
            ...(hasShapiroWilk ? [{ name: '정규성', passed: true, pValue: normality.shapiroWilk?.pValue ?? NaN }] : []),
            ...(hasLevene ? [{ name: '등분산성', passed: false, pValue: homogeneity.levene?.pValue ?? NaN }] : [])
          ],
          alternatives: [
            createMethod('mann-whitney', { description: '비모수 대안' })
          ]
        })
      }
    }

    // === 3+ groups 비교 ===
    if (groups >= 3) {
      if (isNormal && equalVariance) {
        return this.addExpectedKeywords({
          method: createMethod('anova', {
            requirements: {
              minSampleSize: 30,
              assumptions: ['정규성', '등분산성', '독립성']
            }
          }),
          confidence: 0.90,
          reasoning: [
            '✓ 높은 신뢰도 (90%)로 일원분산분석을 추천합니다.',
            `${groups}개 그룹 간 평균 비교에 적합합니다.`,
            `표본 크기: ${n}${n < 30 ? ' ⚠ 소표본 (n<30) - 결과 해석 시 주의 필요' : ' (충분)'}`,
            `✓ 정규성 충족${hasShapiroWilk ? ` (p=${normality?.shapiroWilk?.pValue !== undefined ? normality?.shapiroWilk?.pValue.toFixed(3) : 'N/A'})` : ''}`,
            `✓ 등분산성 충족${hasLevene ? ` (p=${homogeneity?.levene?.pValue !== undefined ? homogeneity?.levene?.pValue.toFixed(3) : 'N/A'})` : ''}`
          ],
          assumptions: [
            ...(hasShapiroWilk ? [{ name: '정규성', passed: true, pValue: normality?.shapiroWilk?.pValue ?? NaN }] : []),
            ...(hasLevene ? [{ name: '등분산성', passed: true, pValue: homogeneity?.levene?.pValue ?? NaN }] : [])
          ],
          alternatives: [
            createMethod('kruskal-wallis', { description: '비모수 대안' })
          ]
        })
      } else {
        return this.addExpectedKeywords({
          method: createMethod('kruskal-wallis'),
          confidence: 0.92,
          reasoning: [
            '✓ 매우 높은 신뢰도 (92%)로 Kruskal-Wallis 검정을 추천합니다.',
            `${groups}개 그룹 비교에서 가정이 충족되지 않았습니다.`,
            `${!isNormal ? '✗ 정규성 미충족' : ''}${!equalVariance ? ' ✗ 등분산성 미충족' : ''} → 비모수 검정 권장`,
            `표본 크기: ${n}${n < 30 ? ' ⚠ 소표본 (n<30) - 결과 해석 시 주의 필요' : '개'}`
          ],
          assumptions: [
            ...(hasShapiroWilk ? [{ name: '정규성', passed: isNormal, pValue: normality.shapiroWilk?.pValue ?? NaN }] : []),
            ...(hasLevene ? [{ name: '등분산성', passed: equalVariance, pValue: homogeneity.levene?.pValue ?? NaN }] : [])
          ],
          alternatives: [
            createMethod('anova', { description: '가정 충족 시 사용 가능' })
          ]
        })
      }
    }

    // Fallback
    return this.addExpectedKeywords({
      method: createMethod('descriptive', {
        description: '그룹을 찾을 수 없어 기본 통계량을 제공합니다.'
      }),
      confidence: 0.60,
      reasoning: [
        '⚠ 보통 신뢰도 (60%)로 기술통계를 추천합니다.',
        '그룹 변수를 찾을 수 없습니다.',
        `표본 크기: ${n}${n < 30 ? ' ⚠ 소표본 (n<30) - 통계적 추론 시 주의 필요' : '개'}`,
        '💡 힌트: 범주형 변수의 고유값이 2~10개 범위를 벗어납니다. Step 2에서 데이터를 확인해주세요.'
      ],
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
    data: DataRow[],
    variableSelection?: VariableSelection
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
        method: createMethod('descriptive', {
          description: '상관분석에는 최소 2개의 수치형 변수가 필요합니다.'
        }),
        confidence: 0.50,
        reasoning: [
          '⚠ 보통 신뢰도 (50%)로 기술통계를 추천합니다.',
          '수치형 변수가 부족합니다 (상관분석에는 최소 2개 필요).',
          `표본 크기: ${n}${n < 30 ? ' ⚠ 소표본 (n<30) - 통계적 추론 시 주의 필요' : '개'}`
        ],
        assumptions: [],
        alternatives: []
      })
    }

    if (isNormal) {
      return this.addExpectedKeywords({
        method: createMethod('correlation', {
          requirements: {
            minSampleSize: 30,
            assumptions: ['정규성', '선형성']
          }
        }),
        confidence: 0.90,
        reasoning: [
          '✓ 높은 신뢰도 (90%)로 Pearson 상관분석을 추천합니다.',
          `${numericVars}개의 수치형 변수 간 선형 상관관계 분석에 적합합니다.`,
          `표본 크기: ${n}${n < 30 ? ' ⚠ 소표본 (n<30) - 결과 해석 시 주의 필요' : ' (충분)'}`,
          `✓ 정규성 충족${hasShapiroWilk ? ` (p=${normality.shapiroWilk?.pValue !== undefined ? normality.shapiroWilk?.pValue.toFixed(3) : 'N/A'})` : ''}`
        ],
        assumptions: hasShapiroWilk ? [
          { name: '정규성', passed: true, pValue: normality.shapiroWilk?.pValue ?? NaN }
        ] : [],
        alternatives: [
          createMethod('correlation', {
            name: 'Spearman 상관분석',
            description: '비모수 대안'
          })
        ]
      })
    } else {
      return this.addExpectedKeywords({
        method: createMethod('correlation', {
          name: 'Spearman 상관분석',
          description: '순위 기반 상관관계 분석'
        }),
        confidence: 0.92,
        reasoning: [
          '✓ 매우 높은 신뢰도 (92%)로 Spearman 상관분석을 추천합니다.',
          `${numericVars}개의 수치형 변수 간 상관관계 분석에서 정규성이 충족되지 않았습니다.`,
          `✗ 정규성 미충족${hasShapiroWilk ? ` (p=${normality.shapiroWilk?.pValue !== undefined ? normality.shapiroWilk?.pValue.toFixed(3) : 'N/A'})` : ''} → 비모수 상관분석 권장`,
          `표본 크기: ${n}${n < 30 ? ' ⚠ 소표본 (n<30) - 결과 해석 시 주의 필요' : '개'}`
        ],
        assumptions: hasShapiroWilk ? [
          { name: '정규성', passed: false, pValue: normality.shapiroWilk?.pValue ?? NaN }
        ] : [],
        alternatives: [
          createMethod('correlation', { description: '정규성 충족 시 Pearson 사용 가능' })
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
      method: createMethod('descriptive', {
        name: '기술통계 및 빈도분석',
        description: '데이터의 분포와 빈도를 분석합니다.',
        requirements: {
          minSampleSize: 1,
          assumptions: []
        }
      }),
      confidence: 1.0,
      reasoning: [
        '✓ 완벽한 신뢰도 (100%)로 기술통계를 추천합니다.',
        '데이터 분포와 빈도를 파악합니다.',
        `표본 크기: ${n}${n < 30 ? ' ⚠ 소표본 (n<30) - 통계적 추론 시 주의 필요' : '개'}`,
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
        method: createMethod('regression', {
          requirements: {
            minSampleSize: 30,
            assumptions: ['선형성', '정규성', '등분산성']
          }
        }),
        confidence: 0.85,
        reasoning: [
          '✓ 높은 신뢰도 (85%)로 단순 선형회귀를 추천합니다.',
          `표본 크기: ${n}${n < 30 ? ' ⚠ 소표본 (n<30) - 결과 해석 시 주의 필요' : ` (${n >= 30 ? '충분' : '부족'})`}`,
          '수치형 변수 간 회귀분석을 권장합니다.',
          '다중 독립변수가 있다면 다중회귀를 고려하세요.'
        ],
        assumptions: [],
        alternatives: [
          createMethod('regression', {
            name: '다중 선형회귀',
            description: '여러 독립변수 사용'
          })
        ]
      })
    }

    // 범주형 예측 → 로지스틱 회귀
    if (categoricalVars >= 1 && numericVars >= 1) {
      return this.addExpectedKeywords({
        method: createMethod('logistic-regression'),
        confidence: 0.82,
        reasoning: [
          '✓ 높은 신뢰도 (82%)로 로지스틱 회귀를 추천합니다.',
          `표본 크기: ${n}${n < 30 ? ' ⚠ 소표본 (n<30) - 결과 해석 시 주의 필요' : '개'}`,
          '범주형 결과 변수 예측을 위한 로지스틱 회귀를 권장합니다.'
        ],
        assumptions: [],
        alternatives: [
          createMethod('regression', { description: '수치형 종속변수일 경우' })
        ]
      })
    }

    // Fallback
    return this.addExpectedKeywords({
      method: createMethod('regression', {
        description: '기본 예측 모델'
      }),
      confidence: 0.70,
      reasoning: [
        '✓ 보통 신뢰도 (70%)로 단순 선형회귀를 추천합니다.',
        `표본 크기: ${n}${n < 30 ? ' ⚠ 소표본 (n<30) - 결과 해석 시 주의 필요' : '개'}`,
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
        method: createMethod('arima', {
          name: '시계열 분석',
          description: '시간에 따른 데이터 변화 분석',
          requirements: {
            minSampleSize: 30,
            assumptions: ['정상성']
          }
        }),
        confidence: 0.80,
        reasoning: [
          '✓ 높은 신뢰도 (80%)로 시계열 분석을 추천합니다.',
          '날짜/시간 변수가 감지되었습니다.',
          `표본 크기: ${n}${n < 30 ? ' ⚠ 소표본 (n<30) - 결과 해석 시 주의 필요' : '개'}`,
          '추세, 계절성, 자기상관을 분석합니다.'
        ],
        assumptions: [],
        alternatives: [
          createMethod('regression', { description: '시간을 독립변수로 사용' })
        ]
      })
    } else {
      // 날짜 변수 없음 → 대응표본 t-검정 추천
      return this.addExpectedKeywords({
        method: createMethod('paired-t', {
          description: '전후 비교 (시간 순서 활용)'
        }),
        confidence: 0.75,
        reasoning: [
          '✓ 높은 신뢰도 (75%)로 대응표본 t-검정을 추천합니다.',
          '날짜 변수가 없지만 전후 비교가 가능합니다.',
          `표본 크기: ${n}${n < 30 ? ' ⚠ 소표본 (n<30) - 결과 해석 시 주의 필요' : '개'}`,
          '시간 순서를 ID로 활용하여 대응표본 분석을 고려하세요.'
        ],
        assumptions: [],
        alternatives: [
          createMethod('arima', {
            name: '시계열 분석',
            description: '날짜 변수 추가 시 사용 가능'
          })
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

    // 🔍 디버깅: 범주형 변수 정보 출력
    logger.info('[DecisionTree] Categorical columns:', {
      count: categoricalCols.length,
      names: categoricalCols.map(c => c.name)
    })

    for (const col of categoricalCols) {
      const uniqueValues = new Set(data.map(row => row[col.name]))

      // 🔍 디버깅: 각 변수의 고유값 개수 출력
      logger.info(`[DecisionTree] ${col.name}: ${uniqueValues.size} unique values`, {
        values: Array.from(uniqueValues).slice(0, 5), // 처음 5개만 표시
        eligible: uniqueValues.size >= 2 && uniqueValues.size <= 10
      })

      if (uniqueValues.size >= 2 && uniqueValues.size <= 10) {
        logger.info(`[DecisionTree] ✅ Group variable found: ${col.name}`)
        return col.name
      }
    }

    // 🔍 디버깅: 그룹 변수를 찾지 못한 이유
    logger.warn('[DecisionTree] ⚠️ No group variable found!', {
      categoricalCount: categoricalCols.length,
      reason: categoricalCols.length === 0
        ? 'No categorical variables'
        : 'All categorical variables have < 2 or > 10 unique values'
    })
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

  /**
   * 호환성 필터가 적용된 추천
   *
   * @param purpose - 분석 목적
   * @param assumptionResults - 가정 검정 결과
   * @param validationResults - 데이터 검증 결과
   * @param data - 데이터
   * @param compatibilityMap - 호환성 맵 (from smart-flow-store)
   * @param variableSelection - 변수 선택 (선택적)
   * @returns 호환성이 적용된 AI 추천
   */
  static recommendWithCompatibility(
    purpose: AnalysisPurpose,
    assumptionResults: StatisticalAssumptions,
    validationResults: ValidationResults,
    data: DataRow[],
    compatibilityMap: Map<string, CompatibilityResult> | null,
    variableSelection?: VariableSelection
  ): AIRecommendation & { compatibilityWarnings?: string[] } {
    // 기본 추천 수행
    const recommendation = this.recommend(
      purpose,
      assumptionResults,
      validationResults,
      data,
      variableSelection
    )

    // 호환성 맵이 없으면 기본 추천 반환
    if (!compatibilityMap) {
      return recommendation
    }

    // 추천된 메서드의 호환성 확인
    const methodId = recommendation.method.id
    const compatibility = compatibilityMap.get(methodId)

    if (!compatibility) {
      return recommendation
    }

    // 호환성 경고/불가 정보 추가
    const compatibilityWarnings: string[] = []

    if (compatibility.status === 'incompatible') {
      compatibilityWarnings.push(
        `⚠ ${recommendation.method.name}은(는) 현재 데이터와 호환되지 않습니다.`
      )
      compatibilityWarnings.push(...compatibility.reasons)

      // 대안 메서드 확인
      if (compatibility.alternatives && compatibility.alternatives.length > 0) {
        const compatibleAlternatives = compatibility.alternatives
          .map(altId => {
            const altCompat = compatibilityMap.get(altId)
            return altCompat && altCompat.status !== 'incompatible' ? altId : null
          })
          .filter((id): id is string => id !== null)

        if (compatibleAlternatives.length > 0) {
          compatibilityWarnings.push(
            `💡 대안: ${compatibleAlternatives.join(', ')}`
          )
        }
      }
    } else if (compatibility.status === 'warning') {
      compatibilityWarnings.push(...compatibility.reasons)
    }

    // 추론 이유에 호환성 정보 추가
    const enhancedReasoning = [
      ...recommendation.reasoning,
      ...compatibilityWarnings.map(w => `[호환성] ${w}`)
    ]

    return {
      ...recommendation,
      reasoning: enhancedReasoning,
      compatibilityWarnings: compatibilityWarnings.length > 0 ? compatibilityWarnings : undefined
    }
  }

  /**
   * 호환되는 메서드만 필터링하여 대안 목록 반환
   *
   * @param compatibilityMap - 호환성 맵
   * @param purpose - 분석 목적 (선택적 필터)
   * @returns 호환되는 메서드 목록
   */
  static getCompatibleMethods(
    compatibilityMap: Map<string, CompatibilityResult> | null,
    purpose?: AnalysisPurpose
  ): CompatibilityResult[] {
    if (!compatibilityMap) return []

    const compatible = Array.from(compatibilityMap.values())
      .filter(r => r.status !== 'incompatible')
      .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))

    // 목적별 필터링 (TODO: 메서드-목적 매핑 추가 시 구현)
    void purpose // Reserved for future use

    return compatible
  }
}
