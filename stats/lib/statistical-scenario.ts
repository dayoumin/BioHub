/**
 * 통계 분석 방법 선택 시나리오
 * 데이터 특성과 분석 목적에 따른 최적 통계 방법 추천
 */

export interface DataCharacteristics {
  // 데이터 기본 정보
  rowCount: number
  columnCount: number
  
  // 변수 유형
  numericColumns: string[]
  categoricalColumns: string[]
  
  // 데이터 품질
  missingValueRatio: number
  outlierRatio: number
  
  // 통계적 특성
  normalityTest?: {
    column: string
    pValue: number
    isNormal: boolean
  }[]
  homogeneityTest?: {
    groups: string[]
    pValue: number
    isHomogeneous: boolean
  }
  independence?: boolean
}

export interface AnalysisPurpose {
  type: 'comparison' | 'relationship' | 'prediction' | 'exploration' | 'classification'
  groupCount?: number
  isRepeatedMeasure?: boolean
  targetVariable?: string
  predictorVariables?: string[]
}

export interface StatisticalRecommendation {
  method: string
  priority: number // 1 (가장 적합) ~ 5 (대안)
  reason: string
  requirements: string[]
  warnings?: string[]
  alternativeIf?: string
}

/**
 * 통계 방법 선택 결정 트리
 */
export function recommendStatisticalMethod(
  data: DataCharacteristics,
  purpose: AnalysisPurpose
): StatisticalRecommendation[] {
  const recommendations: StatisticalRecommendation[] = []
  
  // 1. 비교 분석 (Comparison)
  if (purpose.type === 'comparison') {
    if (purpose.groupCount === 2) {
      // 두 그룹 비교
      const hasNormalData = data.normalityTest?.every(t => t.isNormal) ?? false
      const hasHomogeneity = data.homogeneityTest?.isHomogeneous ?? false
      const hasSufficientSample = data.rowCount >= 30
      
      if (hasNormalData && hasHomogeneity && hasSufficientSample) {
        recommendations.push({
          method: '독립표본 t-검정',
          priority: 1,
          reason: '정규성과 등분산성을 만족하며 충분한 샘플이 있습니다',
          requirements: ['정규분포', '등분산성', 'n≥30']
        })
      } else if (hasNormalData && !hasHomogeneity) {
        recommendations.push({
          method: 'Welch t-검정',
          priority: 1,
          reason: '정규성은 만족하지만 등분산성을 만족하지 않습니다',
          requirements: ['정규분포'],
          warnings: ['등분산성 가정 위배']
        })
      } else if (!hasNormalData || data.rowCount < 30) {
        recommendations.push({
          method: 'Mann-Whitney U 검정',
          priority: 1,
          reason: '정규성을 만족하지 않거나 샘플 크기가 작습니다',
          requirements: ['독립성'],
          alternativeIf: '비모수 검정이 필요한 경우'
        })
      }
      
      // 대응표본인 경우
      if (purpose.isRepeatedMeasure) {
        if (hasNormalData) {
          recommendations.push({
            method: '대응표본 t-검정',
            priority: 1,
            reason: '같은 대상의 전후 비교이며 정규성을 만족합니다',
            requirements: ['정규분포', '대응 데이터']
          })
        } else {
          recommendations.push({
            method: 'Wilcoxon 부호순위 검정',
            priority: 1,
            reason: '대응표본이지만 정규성을 만족하지 않습니다',
            requirements: ['대응 데이터']
          })
        }
      }
      
    } else if (purpose.groupCount && purpose.groupCount >= 3) {
      // 세 그룹 이상 비교
      const hasNormalData = data.normalityTest?.every(t => t.isNormal) ?? false
      const hasHomogeneity = data.homogeneityTest?.isHomogeneous ?? false
      
      if (hasNormalData && hasHomogeneity) {
        recommendations.push({
          method: '일원분산분석 (One-way ANOVA)',
          priority: 1,
          reason: '정규성과 등분산성을 만족하는 3개 이상 그룹 비교',
          requirements: ['정규분포', '등분산성', '독립성']
        })
        
        recommendations.push({
          method: 'Tukey HSD 사후검정',
          priority: 2,
          reason: 'ANOVA 후 그룹 간 다중비교를 위한 사후검정',
          requirements: ['ANOVA 유의미한 결과']
        })
      } else if (!hasNormalData) {
        recommendations.push({
          method: 'Kruskal-Wallis 검정',
          priority: 1,
          reason: '정규성을 만족하지 않는 3개 이상 그룹 비교',
          requirements: ['독립성'],
          alternativeIf: '비모수 검정이 필요한 경우'
        })
        
        recommendations.push({
          method: 'Dunn 검정',
          priority: 2,
          reason: 'Kruskal-Wallis 후 비모수 사후검정',
          requirements: ['Kruskal-Wallis 유의미한 결과']
        })
      }
      
      if (!hasHomogeneity && hasNormalData) {
        recommendations.push({
          method: 'Welch ANOVA',
          priority: 1,
          reason: '정규성은 만족하지만 등분산성을 만족하지 않는 경우',
          requirements: ['정규분포'],
          warnings: ['등분산성 가정 위배']
        })
        
        recommendations.push({
          method: 'Games-Howell 사후검정',
          priority: 2,
          reason: '등분산성을 가정하지 않는 사후검정',
          requirements: ['Welch ANOVA 유의미한 결과']
        })
      }
    }
  }
  
  // 2. 관계 분석 (Relationship)
  if (purpose.type === 'relationship') {
    const hasNumericData = data.numericColumns.length >= 2
    const hasCategoricalData = data.categoricalColumns.length >= 2
    
    if (hasNumericData) {
      const hasNormalData = data.normalityTest?.every(t => t.isNormal) ?? false
      
      if (hasNormalData) {
        recommendations.push({
          method: 'Pearson 상관분석',
          priority: 1,
          reason: '연속형 변수 간 선형 관계 분석에 적합',
          requirements: ['정규분포', '선형관계', '연속형 변수']
        })
      } else {
        recommendations.push({
          method: 'Spearman 순위상관분석',
          priority: 1,
          reason: '정규성을 만족하지 않거나 순위 데이터인 경우',
          requirements: ['단조관계'],
          alternativeIf: '비모수 상관분석이 필요한 경우'
        })
      }
    }
    
    if (hasCategoricalData) {
      recommendations.push({
        method: '카이제곱 검정',
        priority: 1,
        reason: '범주형 변수 간 독립성 검정',
        requirements: ['범주형 변수', '기대빈도 ≥ 5']
      })
      
      if (data.rowCount < 100) {
        recommendations.push({
          method: 'Fisher 정확 검정',
          priority: 2,
          reason: '작은 표본에서 범주형 변수 간 관계 검정',
          requirements: ['2x2 분할표', '작은 표본']
        })
      }
    }
  }
  
  // 3. 예측 분석 (Prediction)
  if (purpose.type === 'prediction') {
    const hasTarget = purpose.targetVariable !== undefined
    const hasPredictors = purpose.predictorVariables && purpose.predictorVariables.length > 0
    
    if (hasTarget && hasPredictors) {
      const targetIsNumeric = data.numericColumns.includes(purpose.targetVariable!)
      const targetIsCategorical = data.categoricalColumns.includes(purpose.targetVariable!)
      
      if (targetIsNumeric) {
        if (purpose.predictorVariables?.length === 1) {
          recommendations.push({
            method: '단순선형회귀',
            priority: 1,
            reason: '하나의 예측변수로 연속형 결과 예측',
            requirements: ['선형관계', '정규분포 잔차', '등분산성']
          })
        } else {
          recommendations.push({
            method: '다중회귀분석',
            priority: 1,
            reason: '여러 예측변수로 연속형 결과 예측',
            requirements: ['선형관계', '정규분포 잔차', '다중공선성 없음']
          })
        }
      }
      
      if (targetIsCategorical) {
        recommendations.push({
          method: '로지스틱 회귀',
          priority: 1,
          reason: '범주형 결과 변수 예측',
          requirements: ['독립성', '충분한 표본 크기']
        })
      }
    }
  }
  
  // 4. 탐색적 분석 (Exploration)
  if (purpose.type === 'exploration') {
    recommendations.push({
      method: '기술통계',
      priority: 1,
      reason: '데이터의 기본적인 특성 파악',
      requirements: []
    })
    
    if (data.numericColumns.length > 3) {
      recommendations.push({
        method: '주성분분석 (PCA)',
        priority: 2,
        reason: '고차원 데이터의 차원 축소 및 패턴 발견',
        requirements: ['연속형 변수', '변수 간 상관관계']
      })
    }
    
    recommendations.push({
      method: '상관행렬 분석',
      priority: 2,
      reason: '여러 변수 간 관계 탐색',
      requirements: ['연속형 변수']
    })
  }
  
  // 5. 분류 분석 (Classification)
  if (purpose.type === 'classification') {
    recommendations.push({
      method: 'K-means 클러스터링',
      priority: 1,
      reason: '데이터를 자연스러운 그룹으로 분류',
      requirements: ['연속형 변수', '클러스터 수 사전 결정']
    })
    
    recommendations.push({
      method: '계층적 클러스터링',
      priority: 2,
      reason: '데이터의 계층적 구조 파악',
      requirements: ['거리 측정 가능']
    })
  }
  
  // 추가 권장사항 정렬
  recommendations.sort((a, b) => a.priority - b.priority)
  
  return recommendations
}

/**
 * 데이터 특성 자동 분석
 */
export function analyzeDataCharacteristics(
  data: any[],
  columns: { name: string; type: string }[]
): DataCharacteristics {
  const numericColumns = columns
    .filter(col => col.type === 'numeric')
    .map(col => col.name)
  
  const categoricalColumns = columns
    .filter(col => col.type === 'categorical' || col.type === 'string')
    .map(col => col.name)
  
  // 결측값 비율 계산
  let missingCount = 0
  let totalValues = 0
  
  data.forEach(row => {
    Object.values(row).forEach(value => {
      totalValues++
      if (value === null || value === undefined || value === '') {
        missingCount++
      }
    })
  })
  
  const missingValueRatio = totalValues > 0 ? missingCount / totalValues : 0
  
  // 이상치 비율 계산 (IQR 방법)
  let outlierCount = 0
  numericColumns.forEach(col => {
    const values = data
      .map(row => parseFloat(row[col]))
      .filter(v => !isNaN(v))
      .sort((a, b) => a - b)
    
    if (values.length > 0) {
      const q1Index = Math.floor(values.length * 0.25)
      const q3Index = Math.floor(values.length * 0.75)
      const q1 = values[q1Index]
      const q3 = values[q3Index]
      const iqr = q3 - q1
      const lowerBound = q1 - 1.5 * iqr
      const upperBound = q3 + 1.5 * iqr
      
      values.forEach(v => {
        if (v < lowerBound || v > upperBound) {
          outlierCount++
        }
      })
    }
  })
  
  const outlierRatio = data.length * numericColumns.length > 0
    ? outlierCount / (data.length * numericColumns.length)
    : 0
  
  return {
    rowCount: data.length,
    columnCount: columns.length,
    numericColumns,
    categoricalColumns,
    missingValueRatio,
    outlierRatio,
    // normalityTest와 homogeneityTest는 별도 함수로 계산
  }
}

/**
 * 분석 목적 파싱 (자연어 처리)
 */
export function parseAnalysisPurpose(description: string): AnalysisPurpose {
  const lowerDesc = description.toLowerCase()
  
  // 비교 관련 키워드
  if (lowerDesc.includes('비교') || lowerDesc.includes('차이') || 
      lowerDesc.includes('다른') || lowerDesc.includes('compare')) {
    
    // 그룹 수 파악
    let groupCount = 2
    if (lowerDesc.includes('여러') || lowerDesc.includes('3개') || 
        lowerDesc.includes('세') || lowerDesc.includes('multiple')) {
      groupCount = 3
    }
    
    // 대응표본 여부
    const isRepeatedMeasure = lowerDesc.includes('전후') || 
                              lowerDesc.includes('전과 후') ||
                              lowerDesc.includes('같은') ||
                              lowerDesc.includes('paired') ||
                              lowerDesc.includes('repeated')
    
    return { type: 'comparison', groupCount, isRepeatedMeasure }
  }
  
  // 관계 관련 키워드
  if (lowerDesc.includes('관계') || lowerDesc.includes('상관') || 
      lowerDesc.includes('연관') || lowerDesc.includes('correlation')) {
    return { type: 'relationship' }
  }
  
  // 예측 관련 키워드
  if (lowerDesc.includes('예측') || lowerDesc.includes('영향') || 
      lowerDesc.includes('predict') || lowerDesc.includes('effect')) {
    return { type: 'prediction' }
  }
  
  // 분류 관련 키워드
  if (lowerDesc.includes('분류') || lowerDesc.includes('그룹화') || 
      lowerDesc.includes('클러스터') || lowerDesc.includes('cluster')) {
    return { type: 'classification' }
  }
  
  // 기본값: 탐색적 분석
  return { type: 'exploration' }
}