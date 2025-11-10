/**
 * 스마트 분석 엔진
 * 통계 지식이 없어도 쉽게 분석할 수 있도록 도와주는 지능형 시스템
 */

export interface DataColumn {
  name: string
  type: 'numeric' | 'categorical' | 'text'
  sampleValues: any[]
  missingCount: number
  uniqueCount: number
}

export interface AnalysisRecommendation {
  id: string
  title: string
  description: string
  easyDescription: string
  method: string
  confidence: 'high' | 'medium' | 'low'
  requiredColumns: string[]
  assumptions: string[]
  nextSteps: string[]
}

export interface PlainLanguageResult {
  summary: string
  conclusion: string
  confidence: string
  effectSize: string
  practical_meaning: string
  next_steps: string[]
  warnings: string[]
}

/**
 * 데이터를 분석해서 적절한 통계 방법을 추천
 */
export class SmartAnalysisEngine {

  /**
   * 샘플 데이터로 정규성 간이 체크 (왜도 기반)
   */
  private static quickNormalityCheck(values: unknown[]): boolean {
    const numericValues = values.filter(v => typeof v === 'number') as number[]
    if (numericValues.length < 3) return true // 샘플 부족 시 정규분포 가정

    const n = numericValues.length
    const mean = numericValues.reduce((sum, val) => sum + val, 0) / n
    const variance = numericValues.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / n
    const std = Math.sqrt(variance)

    if (std === 0) return false // 분산 0이면 비정규

    // 왜도 계산 (skewness)
    const skewness = numericValues.reduce((sum, val) => sum + Math.pow((val - mean) / std, 3), 0) / n

    // |skewness| > 2 → 비정규로 간주
    return Math.abs(skewness) < 2
  }

  /**
   * 데이터 품질 체크 (결측치, 이상치)
   */
  private static checkDataQuality(column: DataColumn): {
    missingRate: number
    hasOutliers: boolean
    warnings: string[]
  } {
    const warnings: string[] = []

    // 1. 결측치 비율 계산
    const totalCount = column.sampleValues.length + column.missingCount
    const missingRate = column.missingCount / totalCount

    if (missingRate > 0.2) {
      warnings.push(`⚠️ ${column.name}: 결측치가 ${(missingRate * 100).toFixed(0)}%로 높습니다. 데이터 수집을 재검토하세요.`)
    }

    // 2. 이상치 탐지 (IQR 방법)
    let hasOutliers = false
    if (column.type === 'numeric') {
      const numericValues = column.sampleValues.filter(v => typeof v === 'number') as number[]
      if (numericValues.length >= 4) {
        // 정렬
        const sorted = [...numericValues].sort((a, b) => a - b)
        const n = sorted.length

        // Q1, Q3 계산
        const q1Index = Math.floor(n * 0.25)
        const q3Index = Math.floor(n * 0.75)
        const q1 = sorted[q1Index]
        const q3 = sorted[q3Index]
        const iqr = q3 - q1

        // 이상치 범위
        const lowerBound = q1 - 1.5 * iqr
        const upperBound = q3 + 1.5 * iqr

        // 이상치 개수
        const outlierCount = numericValues.filter(v => v < lowerBound || v > upperBound).length
        hasOutliers = outlierCount > 0

        if (hasOutliers) {
          warnings.push(`⚠️ ${column.name}: 이상치가 ${outlierCount}개 발견되었습니다. 데이터를 확인하세요.`)
        }
      }
    }

    return { missingRate, hasOutliers, warnings }
  }

  /**
   * 데이터 구조를 분석해서 가능한 분석 방법들을 추천
   */
  static recommendAnalyses(columns: DataColumn[], researchQuestion?: string): AnalysisRecommendation[] {
    const recommendations: AnalysisRecommendation[] = []
    const dataQualityWarnings: string[] = []

    const numericCols = columns.filter(col => col.type === 'numeric')
    const categoricalCols = columns.filter(col => col.type === 'categorical')

    // 데이터 품질 체크 (모든 컬럼)
    columns.forEach(col => {
      const quality = this.checkDataQuality(col)
      dataQualityWarnings.push(...quality.warnings)
    })

    // 1. 기술통계는 항상 가능
    if (numericCols.length > 0) {
      const nextSteps = ['데이터 분포 확인', '이상값 탐지', '그룹 비교 고려']

      // 품질 경고가 있으면 nextSteps에 추가
      if (dataQualityWarnings.length > 0) {
        nextSteps.unshift('데이터 품질 확인 (결측치/이상치)')
      }

      recommendations.push({
        id: 'descriptive',
        title: '기술통계 분석',
        description: '데이터의 기본적인 특성을 파악합니다',
        easyDescription: '📊 내 데이터가 어떤 특징을 가지고 있는지 알아보세요 (평균, 분포, 최대/최소값 등)',
        method: '기술통계량',
        confidence: 'high',
        requiredColumns: numericCols.slice(0, 1).map(col => col.name),
        assumptions: dataQualityWarnings.length > 0
          ? ['숫자 데이터여야 함', ...dataQualityWarnings]
          : ['숫자 데이터여야 함'],
        nextSteps
      })
    }
    
    // 2. 두 그룹 비교 (t-검정 또는 Mann-Whitney)
    if (numericCols.length >= 1 && categoricalCols.length >= 1) {
      const binaryCategories = categoricalCols.filter(col => col.uniqueCount === 2)

      if (binaryCategories.length > 0) {
        // 정규성 체크
        const isNormal = this.quickNormalityCheck(numericCols[0].sampleValues)

        if (isNormal) {
          // 모수 검정: t-test
          recommendations.push({
            id: 'ttest_independent',
            title: '두 그룹 비교 (t-검정)',
            description: '두 그룹 간의 평균 차이를 검정합니다',
            easyDescription: '🔍 두 그룹 사이에 진짜 차이가 있는지 알아보세요 (예: 남녀 차이, 치료 전후 비교)',
            method: '독립표본 t-검정',
            confidence: 'high',
            requiredColumns: [numericCols[0].name, binaryCategories[0].name],
            assumptions: ['정규분포', '등분산성', '독립성'],
            nextSteps: ['가정 검정', '효과크기 확인', '시각화']
          })
        } else {
          // 비모수 검정: Mann-Whitney U
          recommendations.push({
            id: 'mannwhitney',
            title: '두 그룹 비교 (비모수 검정)',
            description: '두 그룹 간의 중앙값 차이를 검정합니다 (정규분포 가정 불필요)',
            easyDescription: '🔍 두 그룹 사이에 차이가 있는지 알아보세요 (데이터가 정규분포가 아닐 때)',
            method: 'Mann-Whitney U test',
            confidence: 'high',
            requiredColumns: [numericCols[0].name, binaryCategories[0].name],
            assumptions: ['독립성'],
            nextSteps: ['중앙값 비교', '효과크기 확인', '시각화']
          })
        }
      }
    }

    // 3. 여러 그룹 비교 (ANOVA 또는 Kruskal-Wallis)
    if (numericCols.length >= 1 && categoricalCols.length >= 1) {
      const multiCategories = categoricalCols.filter(col => col.uniqueCount >= 3 && col.uniqueCount <= 10)

      if (multiCategories.length > 0) {
        // 정규성 체크
        const isNormal = this.quickNormalityCheck(numericCols[0].sampleValues)

        if (isNormal) {
          // 모수 검정: ANOVA
          recommendations.push({
            id: 'anova_oneway',
            title: '여러 그룹 비교 (분산분석)',
            description: '3개 이상 그룹 간의 평균 차이를 검정합니다',
            easyDescription: '📈 여러 그룹을 한 번에 비교해보세요 (예: A반, B반, C반 성적 비교)',
            method: '일원분산분석',
            confidence: 'high',
            requiredColumns: [numericCols[0].name, multiCategories[0].name],
            assumptions: ['정규분포', '등분산성', '독립성'],
            nextSteps: ['사후검정', '그룹별 평균 비교', '시각화']
          })
        } else {
          // 비모수 검정: Kruskal-Wallis
          recommendations.push({
            id: 'kruskal_wallis',
            title: '여러 그룹 비교 (비모수 검정)',
            description: '3개 이상 그룹 간의 중앙값 차이를 검정합니다 (정규분포 가정 불필요)',
            easyDescription: '📈 여러 그룹을 한 번에 비교해보세요 (데이터가 정규분포가 아닐 때)',
            method: 'Kruskal-Wallis test',
            confidence: 'high',
            requiredColumns: [numericCols[0].name, multiCategories[0].name],
            assumptions: ['독립성'],
            nextSteps: ['사후검정', '그룹별 중앙값 비교', '시각화']
          })
        }
      }
    }
    
    // 4. 상관분석
    if (numericCols.length >= 2) {
      recommendations.push({
        id: 'correlation',
        title: '상관분석',
        description: '두 변수 간의 선형 관계를 분석합니다',
        easyDescription: '🔗 두 가지 수치가 어떤 관계인지 알아보세요 (예: 키와 몸무게, 공부시간과 성적)',
        method: '상관분석',
        confidence: 'high',
        requiredColumns: numericCols.slice(0, 2).map(col => col.name),
        assumptions: ['선형관계', '정규분포(선택적)'],
        nextSteps: ['산점도 확인', '회귀분석 고려', '인과관계 주의']
      })
    }
    
    // 5. 회귀분석 (연구질문에 '예측' 키워드 있으면 신뢰도 상승)
    if (numericCols.length >= 2) {
      const isPredictionTask = researchQuestion?.toLowerCase().includes('예측') ||
                               researchQuestion?.toLowerCase().includes('predict')

      recommendations.push({
        id: 'regression',
        title: '회귀분석',
        description: '한 변수가 다른 변수를 얼마나 예측하는지 분석합니다',
        easyDescription: '🎯 한 가지를 알면 다른 것을 예측할 수 있는지 알아보세요 (예: 광고비로 매출 예측)',
        method: '단순선형회귀',
        confidence: isPredictionTask ? 'high' : 'medium',
        requiredColumns: numericCols.slice(0, 2).map(col => col.name),
        assumptions: ['선형관계', '정규분포', '등분산성', '독립성'],
        nextSteps: ['잔차 분석', '예측 구간', '모델 검증']
      })
    }

    // 6. 다변량 분석 (다중회귀)
    if (numericCols.length >= 3) {
      recommendations.push({
        id: 'multiple_regression',
        title: '다중회귀분석',
        description: '여러 변수가 하나의 결과 변수를 얼마나 예측하는지 분석합니다',
        easyDescription: '🎯 여러 요인을 함께 고려해서 예측해보세요 (예: 광고비+계절+가격으로 매출 예측)',
        method: '다중선형회귀',
        confidence: 'medium',
        requiredColumns: numericCols.slice(0, 3).map(col => col.name),
        assumptions: ['선형관계', '정규분포', '등분산성', '독립성', '다중공선성 없음'],
        nextSteps: ['변수 선택', 'VIF 확인', '모델 비교']
      })
    }

    // 7. 이원분산분석 (2개 범주형 변수)
    if (numericCols.length >= 1 && categoricalCols.length >= 2) {
      recommendations.push({
        id: 'two_way_anova',
        title: '이원분산분석',
        description: '두 개의 범주형 변수가 수치형 변수에 미치는 영향을 분석합니다',
        easyDescription: '📊 두 가지 요인이 함께 결과에 영향을 주는지 알아보세요 (예: 성별+연령대가 점수에 영향)',
        method: '이원분산분석',
        confidence: 'medium',
        requiredColumns: [numericCols[0].name, categoricalCols[0].name, categoricalCols[1].name],
        assumptions: ['정규분포', '등분산성', '독립성'],
        nextSteps: ['주효과 분석', '상호작용 효과 확인', '단순주효과 분석']
      })
    }

    // 8. 시계열 데이터 감지
    const timeColumns = columns.filter(col =>
      col.name.toLowerCase().includes('날짜') ||
      col.name.toLowerCase().includes('시간') ||
      col.name.toLowerCase().includes('년') ||
      col.name.toLowerCase().includes('월') ||
      col.name.toLowerCase().includes('date') ||
      col.name.toLowerCase().includes('time') ||
      col.name.toLowerCase().includes('year')
    )

    if (timeColumns.length > 0 && numericCols.length >= 1) {
      recommendations.push({
        id: 'time_series',
        title: '시계열 분석',
        description: '시간에 따른 데이터의 변화 패턴을 분석합니다',
        easyDescription: '📈 시간의 흐름에 따라 데이터가 어떻게 변하는지 알아보세요 (트렌드, 계절성)',
        method: '시계열 분석',
        confidence: 'medium',
        requiredColumns: [timeColumns[0].name, numericCols[0].name],
        assumptions: ['시간 순서 데이터', '일정한 시간 간격'],
        nextSteps: ['트렌드 분석', '계절성 확인', '예측 모델 구축']
      })
    }

    // 9. 연구 질문 기반 추천
    if (researchQuestion) {
      const questionBasedRecommendations = this.analyzeResearchQuestion(researchQuestion, columns)
      recommendations.push(...questionBasedRecommendations)
    }
    
    // 중복 추천 병합: 동일 method는 하나로, 더 높은 신뢰도 유지
    const confidenceRank = { 'high': 3, 'medium': 2, 'low': 1 }
    const merged: Record<string, AnalysisRecommendation> = {}
    for (const rec of recommendations) {
      const key = rec.method
      if (!merged[key]) {
        merged[key] = rec
      } else {
        const recRank = confidenceRank[rec.confidence as keyof typeof confidenceRank] ?? 0
        const mergedRank = confidenceRank[merged[key].confidence as keyof typeof confidenceRank] ?? 0
        const keep = recRank >= mergedRank ? rec : merged[key]
        merged[key] = {
          ...keep,
          // 다음 단계/가정은 합집합으로 보존
          assumptions: Array.from(new Set([...(merged[key].assumptions || []), ...(rec.assumptions || [])])),
          nextSteps: Array.from(new Set([...(merged[key].nextSteps || []), ...(rec.nextSteps || [])]))
        }
      }
    }

    const deduped = Object.values(merged)

    // 신뢰도 정규화: 연구질문 기반만 있고 데이터 근거가 약하면 medium 이하로 완화
    const normalized: AnalysisRecommendation[] = deduped.map(rec => {
      const hasAssumptions = (rec.assumptions && rec.assumptions.length > 0)
      if (!hasAssumptions && rec.confidence === 'high') {
        return { ...rec, confidence: 'medium' as const }
      }
      return rec as AnalysisRecommendation
    })

    // 신뢰도 순으로 정렬
    return normalized.sort((a, b) => {
      const aRank = confidenceRank[a.confidence as keyof typeof confidenceRank] ?? 0
      const bRank = confidenceRank[b.confidence as keyof typeof confidenceRank] ?? 0
      return bRank - aRank
    })
  }
  
  /**
   * 연구 질문을 분석해서 적절한 방법 추천
   */
  private static analyzeResearchQuestion(question: string, columns: DataColumn[]): AnalysisRecommendation[] {
    const recommendations: AnalysisRecommendation[] = []
    const lowerQuestion = question.toLowerCase()
    
    // 키워드 기반 분석
    const keywords = {
      difference: ['차이', '다른', '비교', 'difference', 'compare', 'different'],
      relationship: ['관계', '관련', 'relationship', 'correlation', 'related'],
      prediction: ['예측', '영향', 'predict', 'effect', 'influence'],
      trend: ['변화', '트렌드', '경향', 'trend', 'change', 'over time']
    }
    
    // 차이 분석 키워드 감지
    if (keywords.difference.some(keyword => lowerQuestion.includes(keyword))) {
      const numericCols = columns.filter(col => col.type === 'numeric')
      const categoricalCols = columns.filter(col => col.type === 'categorical')
      
      if (numericCols.length >= 1 && categoricalCols.length >= 1) {
        recommendations.push({
          id: 'question_based_comparison',
          title: '그룹 간 차이 분석 (연구질문 기반)',
          description: '연구 질문에서 감지된 그룹 비교 분석',
          easyDescription: '❓ 질문하신 내용을 바탕으로 그룹 간 차이를 분석해드려요',
          method: categoricalCols[0].uniqueCount === 2 ? '독립표본 t-검정' : '일원분산분석',
          confidence: 'high',
          requiredColumns: [numericCols[0].name, categoricalCols[0].name],
          assumptions: ['정규분포', '등분산성'],
          nextSteps: ['결과 해석', '실용적 의미 확인']
        })
      }
    }
    
    return recommendations
  }
  
  /**
   * 분석 결과를 쉬운 말로 해석
   */
  static interpretResults(analysisType: string, results: any): PlainLanguageResult {
    switch (analysisType) {
      case '기술통계량':
        return this.interpretDescriptiveStats(results)
      case '독립표본 t-검정':
        return this.interpretTTest(results)
      case '일원분산분석':
        return this.interpretANOVA(results)
      case '상관분석':
        return this.interpretCorrelation(results)
      default:
        return {
          summary: '분석이 완료되었습니다.',
          conclusion: '결과를 확인해 주세요.',
          confidence: '추가 해석이 필요합니다.',
          effectSize: '',
          practical_meaning: '',
          next_steps: [],
          warnings: []
        }
    }
  }
  
  private static interpretDescriptiveStats(results: any): PlainLanguageResult {
    const mean = results.mean
    const std = results.std
    const cv = (std / mean) * 100 // 변동계수
    
    let variabilityDesc = ''
    if (cv < 10) {
      variabilityDesc = '데이터가 평균 주변에 일정하게 모여있어요'
    } else if (cv < 30) {
      variabilityDesc = '데이터가 적당히 흩어져 있어요'
    } else {
      variabilityDesc = '데이터가 매우 다양하게 분산되어 있어요'
    }
    
    return {
      summary: `평균은 ${mean.toFixed(2)}이고, ${variabilityDesc}.`,
      conclusion: `전체 ${results.count}개의 데이터 중에서 대부분은 ${(mean - std).toFixed(1)}에서 ${(mean + std).toFixed(1)} 범위에 있습니다.`,
      confidence: '데이터의 기본 특성을 확인했습니다.',
      effectSize: '',
      practical_meaning: `최솟값 ${results.min}부터 최댓값 ${results.max}까지의 범위를 가지고 있으며, 중간값은 ${results.median.toFixed(2)}입니다.`,
      next_steps: [
        '📊 그래프로 분포를 확인해보세요',
        '🔍 이상값이 있는지 체크해보세요',
        '👥 그룹별로 나누어 비교해보세요'
      ],
      warnings: results.count < 30 ? ['⚠️ 데이터 개수가 30개 미만이므로 해석에 주의가 필요합니다'] : []
    }
  }
  
  private static interpretTTest(results: any): PlainLanguageResult {
    const pValue = results.p_value
    const effectSize = Math.abs(results.effect_size_cohens_d)
    const isSignificant = pValue < 0.05
    
    // p-값 해석
    let pValueDesc = ''
    if (pValue < 0.001) {
      pValueDesc = '1000번 중 1번도 안 되는 확률로 우연히 생긴 차이'
    } else if (pValue < 0.01) {
      pValueDesc = '100번 중 1번 정도의 확률로 우연히 생긴 차이'
    } else if (pValue < 0.05) {
      pValueDesc = '20번 중 1번 정도의 확률로 우연히 생긴 차이'
    } else {
      pValueDesc = '꽤 자주 우연히 생길 수 있는 차이'
    }
    
    // 효과크기 해석
    let effectDesc = ''
    if (effectSize < 0.2) {
      effectDesc = '매우 작은 차이'
    } else if (effectSize < 0.5) {
      effectDesc = '작은 차이'
    } else if (effectSize < 0.8) {
      effectDesc = '중간 크기의 차이'
    } else {
      effectDesc = '매우 큰 차이'
    }
    
    const conclusion = isSignificant 
      ? `✅ 두 그룹 사이에 통계적으로 유의미한 차이가 있습니다!`
      : `❓ 두 그룹 사이에 명확한 차이가 있다고 확신하기 어렵습니다.`
    
    const nextSteps = isSignificant ? [
      '📊 박스플롯으로 차이를 시각화해보세요',
      '🔍 다른 변수들도 같은 패턴인지 확인해보세요',
      '📈 실용적인 의미가 있는 차이인지 검토해보세요'
    ] : [
      '📏 더 많은 데이터를 수집해보세요',
      '🔄 비모수 검정(Mann-Whitney U)을 시도해보세요',
      '🎯 다른 요인들을 고려해보세요'
    ]
    
    return {
      summary: `${conclusion} ${effectDesc}입니다.`,
      conclusion,
      confidence: `${pValueDesc}이므로, ${isSignificant ? '95% 이상 확신' : '확실하지 않음'}할 수 있습니다.`,
      effectSize: `효과크기(Cohen's d): ${effectSize.toFixed(3)} (${effectDesc})`,
      practical_meaning: isSignificant 
        ? `실제로 ${effectDesc}가 관찰되므로, 실용적으로도 의미가 ${effectSize > 0.5 ? '있을' : '제한적일'} 것으로 보입니다.`
        : '통계적으로 유의하지 않으므로 실용적 의미를 판단하기 어렵습니다.',
      next_steps: nextSteps,
      warnings: []
    }
  }
  
  private static interpretANOVA(results: any): PlainLanguageResult {
    const pValue = results.p_value
    const etaSquared = results.eta_squared
    const isSignificant = pValue < 0.05
    
    let effectDesc = ''
    if (etaSquared < 0.01) {
      effectDesc = '매우 작은 효과'
    } else if (etaSquared < 0.06) {
      effectDesc = '작은 효과'
    } else if (etaSquared < 0.14) {
      effectDesc = '중간 효과'
    } else {
      effectDesc = '큰 효과'
    }
    
    const conclusion = isSignificant
      ? '✅ 그룹들 사이에 통계적으로 유의미한 차이가 있습니다!'
      : '❓ 그룹들 사이에 명확한 차이가 있다고 확신하기 어렵습니다.'
    
    const nextSteps = isSignificant ? [
      '🔍 사후검정으로 어느 그룹이 다른지 정확히 알아보세요',
      '📊 박스플롯으로 그룹별 차이를 시각화하세요',
      '📈 각 그룹의 평균을 비교해보세요'
    ] : [
      '📏 각 그룹의 샘플 크기를 늘려보세요',
      '🔄 Kruskal-Wallis 검정(비모수)을 시도해보세요',
      '🎯 그룹 분류를 다시 검토해보세요'
    ]
    
    return {
      summary: `${conclusion} ${effectDesc}가 관찰됩니다.`,
      conclusion,
      confidence: `p-값이 ${pValue.toFixed(4)}이므로, ${isSignificant ? '95% 이상 확신' : '확실하지 않음'}할 수 있습니다.`,
      effectSize: `효과크기(η²): ${etaSquared.toFixed(3)} (${effectDesc})`,
      practical_meaning: isSignificant 
        ? '그룹 간에 실제적인 차이가 있을 가능성이 높습니다.'
        : '관찰된 그룹 간 차이는 우연에 의한 것일 가능성이 높습니다.',
      next_steps: nextSteps,
      warnings: isSignificant ? ['⚠️ 어느 그룹이 구체적으로 다른지는 사후검정이 필요합니다'] : []
    }
  }
  
  private static interpretCorrelation(results: any): PlainLanguageResult {
    const correlation = results.correlation
    const pValue = results.p_value
    const isSignificant = pValue < 0.05
    const absCorr = Math.abs(correlation)
    
    let strengthDesc = ''
    if (absCorr < 0.1) {
      strengthDesc = '거의 관계없음'
    } else if (absCorr < 0.3) {
      strengthDesc = '약한 관계'
    } else if (absCorr < 0.7) {
      strengthDesc = '중간 정도의 관계'
    } else {
      strengthDesc = '강한 관계'
    }
    
    const directionDesc = correlation > 0 ? '정적 관계 (함께 증가)' : '부적 관계 (반대로 변화)'
    
    const conclusion = isSignificant
      ? `✅ 두 변수 사이에 통계적으로 유의미한 ${directionDesc}가 있습니다!`
      : `❓ 두 변수 사이에 명확한 관계가 있다고 확신하기 어렵습니다.`
    
    return {
      summary: `${conclusion} ${strengthDesc}입니다.`,
      conclusion,
      confidence: `상관계수 ${correlation.toFixed(3)}이 ${isSignificant ? '통계적으로 유의미' : '유의미하지 않'}합니다.`,
      effectSize: `상관계수: ${correlation.toFixed(3)} (${strengthDesc})`,
      practical_meaning: isSignificant
        ? `한 변수가 변하면 다른 변수도 ${absCorr > 0.5 ? '상당히 일정하게' : '어느 정도'} ${correlation > 0 ? '같은 방향으로' : '반대 방향으로'} 변합니다.`
        : '두 변수 간의 관계는 우연에 의한 것일 가능성이 높습니다.',
      next_steps: isSignificant ? [
        '📊 산점도로 관계를 시각화해보세요',
        '📈 회귀분석으로 예측 모델을 만들어보세요',
        '⚠️ 상관관계 ≠ 인과관계임을 기억하세요'
      ] : [
        '📏 더 많은 데이터를 수집해보세요',
        '🔄 비모수 상관분석(Spearman)을 시도해보세요',
        '🎯 다른 변수들과의 관계도 확인해보세요'
      ],
      warnings: isSignificant ? ['⚠️ 상관관계가 인과관계를 의미하지는 않습니다'] : []
    }
  }
  
  /**
   * 사용자 수준에 맞는 설명 제공
   */
  static getExplanationLevel(userLevel: 'beginner' | 'intermediate' | 'expert', content: any) {
    switch (userLevel) {
      case 'beginner':
        return {
          ...content,
          technical_details: false,
          emoji_use: true,
          simple_language: true
        }
      case 'intermediate':
        return {
          ...content,
          technical_details: true,
          emoji_use: false,
          simple_language: false
        }
      case 'expert':
        return {
          ...content,
          technical_details: true,
          statistical_notation: true,
          assumptions_detailed: true
        }
      default:
        return content
    }
  }
}