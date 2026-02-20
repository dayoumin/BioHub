import { DataColumn } from './data-processing'

export interface SmartAnalysisResult {
  canAnalyze: boolean
  issues: AnalysisIssue[]
  recommendations: AnalysisRecommendation[]
  suggestedTests: SuggestedTest[]
  dataQuality: DataQuality
}

export interface AnalysisIssue {
  type: 'error' | 'warning' | 'info'
  category: 'sample_size' | 'data_type' | 'normality' | 'variance' | 'missing_data' | 'outliers'
  message: string
  solution?: string
  affectedColumns?: string[]
}

export interface AnalysisRecommendation {
  type: 'preprocessing' | 'alternative_test' | 'data_collection' | 'transformation'
  title: string
  description: string
  priority: 'high' | 'medium' | 'low'
  actionable: boolean
}

export interface SuggestedTest {
  name: string
  type: 'parametric' | 'non_parametric' | 'descriptive'
  confidence: 'high' | 'medium' | 'low'
  reason: string
  requirements: string[]
  variables: {
    dependent?: string[]
    independent?: string[]
    grouping?: string[]
  }
}

export interface DataQuality {
  overall: 'excellent' | 'good' | 'fair' | 'poor'
  sampleSize: number
  completeness: number // 0-100%
  normalityScore: number // 0-100%
  varianceHomogeneity: number // 0-100%
}

/**
 * 스마트 자동 분석 - 데이터셋 분석 및 적절한 통계 방법 제안
 */
export function performSmartAnalysis(
  columns: DataColumn[],
  data: Record<string, unknown>[],
  sampleSize: number
): SmartAnalysisResult {
  const issues: AnalysisIssue[] = []
  const recommendations: AnalysisRecommendation[] = []
  const suggestedTests: SuggestedTest[] = []

  // 기본 데이터 품질 평가
  const dataQuality = assessDataQuality(columns, data, sampleSize)
  
  // 1. 샘플 크기 검사
  checkSampleSize(sampleSize, issues, recommendations)
  
  // 2. 데이터 타입 분석
  const { numericColumns, categoricalColumns } = analyzeDataTypes(columns, issues)
  
  // 3. 결측값 분석
  analyzeMissingData(columns, sampleSize, issues, recommendations)
  
  // 4. 정규성 검정 (수치형 변수에 대해)
  const normalityResults = checkNormality(numericColumns, data, issues, recommendations)
  
  // 5. 등분산성 검정
  const varianceResults = checkVarianceHomogeneity(numericColumns, categoricalColumns, data, issues, recommendations)
  
  // 6. 적절한 통계 분석 제안
  suggestStatisticalTests(
    numericColumns, 
    categoricalColumns, 
    sampleSize, 
    normalityResults, 
    varianceResults,
    suggestedTests,
    issues
  )
  
  // 전체 분석 가능 여부 결정
  const canAnalyze = !issues.some(issue => issue.type === 'error')
  
  return {
    canAnalyze,
    issues,
    recommendations,
    suggestedTests,
    dataQuality
  }
}

function assessDataQuality(
  columns: DataColumn[],
  data: Record<string, unknown>[],
  sampleSize: number
): DataQuality {
  // 완성도 계산 (결측값 기준)
  const totalCells = columns.length * sampleSize
  const missingCells = columns.reduce((sum, col) => sum + col.missingCount, 0)
  const completeness = ((totalCells - missingCells) / totalCells) * 100
  
  // 임시 정규성/등분산성 점수 (실제로는 검정 결과 기반)
  const normalityScore = sampleSize >= 30 ? 85 : 60
  const varianceHomogeneity = 75
  
  // 전체 품질 평가
  let overall: DataQuality['overall']
  if (sampleSize >= 30 && completeness >= 95 && normalityScore >= 80) {
    overall = 'excellent'
  } else if (sampleSize >= 20 && completeness >= 90 && normalityScore >= 70) {
    overall = 'good'
  } else if (sampleSize >= 10 && completeness >= 80) {
    overall = 'fair'
  } else {
    overall = 'poor'
  }
  
  return {
    overall,
    sampleSize,
    completeness,
    normalityScore,
    varianceHomogeneity
  }
}

function checkSampleSize(
  sampleSize: number,
  issues: AnalysisIssue[],
  recommendations: AnalysisRecommendation[]
): void {
  if (sampleSize < 3) {
    issues.push({
      type: 'error',
      category: 'sample_size',
      message: `표본 크기가 너무 작습니다 (${sampleSize}개). 통계 분석을 수행할 수 없습니다.`,
      solution: '최소 3개 이상의 데이터가 필요합니다. 더 많은 데이터를 수집해주세요.'
    })
    
    recommendations.push({
      type: 'data_collection',
      title: '추가 데이터 수집 필요',
      description: '신뢰할 수 있는 통계 분석을 위해 더 많은 데이터를 수집해주세요.',
      priority: 'high',
      actionable: true
    })
  } else if (sampleSize < 10) {
    issues.push({
      type: 'warning',
      category: 'sample_size',
      message: `표본 크기가 작습니다 (${sampleSize}개). 일부 통계 검정의 신뢰성이 떨어질 수 있습니다.`,
      solution: '더 정확한 분석을 위해 최소 30개 이상의 데이터를 권장합니다.'
    })
  } else if (sampleSize < 30) {
    issues.push({
      type: 'info',
      category: 'sample_size',
      message: `표본 크기가 중간 정도입니다 (${sampleSize}개). 중심극한정리 적용에 제한이 있을 수 있습니다.`,
      solution: '정규성 가정을 더 엄격히 확인하거나 비모수 검정을 고려해보세요.'
    })
  }
}

function analyzeDataTypes(
  columns: DataColumn[],
  issues: AnalysisIssue[]
): { numericColumns: DataColumn[], categoricalColumns: DataColumn[] } {
  const numericColumns = columns.filter(col => col.type === 'numeric')
  const categoricalColumns = columns.filter(col => col.type === 'categorical')
  
  if (numericColumns.length === 0) {
    issues.push({
      type: 'error',
      category: 'data_type',
      message: '수치형 변수가 없습니다. 대부분의 통계 분석에는 최소 1개의 수치형 변수가 필요합니다.',
      solution: '숫자로 측정 가능한 변수를 포함하거나, 기존 변수를 수치형으로 변환해주세요.',
      affectedColumns: columns.map(col => col.name)
    })
  }
  
  // 상수 변수 검사
  columns.forEach(column => {
    if (column.uniqueCount === 1) {
      issues.push({
        type: 'warning',
        category: 'data_type',
        message: `"${column.name}" 변수의 모든 값이 동일합니다. 분석에서 제외를 고려해보세요.`,
        solution: '다양한 값을 가지는 변수로 교체하거나 해당 변수를 제거해주세요.',
        affectedColumns: [column.name]
      })
    }
  })
  
  return { numericColumns, categoricalColumns }
}

function analyzeMissingData(
  columns: DataColumn[],
  sampleSize: number,
  issues: AnalysisIssue[],
  recommendations: AnalysisRecommendation[]
): void {
  columns.forEach(column => {
    const missingPercentage = (column.missingCount / sampleSize) * 100
    
    if (missingPercentage > 50) {
      issues.push({
        type: 'error',
        category: 'missing_data',
        message: `"${column.name}" 변수에 결측값이 ${missingPercentage.toFixed(1)}% 있습니다. 분석 결과가 신뢰할 수 없습니다.`,
        solution: '결측값을 보완하거나 해당 변수를 제외하고 분석해주세요.',
        affectedColumns: [column.name]
      })
      
      recommendations.push({
        type: 'preprocessing',
        title: `"${column.name}" 변수 결측값 처리`,
        description: '평균값 대체, 회귀 대체, 또는 변수 제거를 고려해보세요.',
        priority: 'high',
        actionable: true
      })
    } else if (missingPercentage > 20) {
      issues.push({
        type: 'warning',
        category: 'missing_data',
        message: `"${column.name}" 변수에 결측값이 ${missingPercentage.toFixed(1)}% 있습니다. 분석 시 주의가 필요합니다.`,
        solution: '결측값 패턴을 확인하고 적절한 처리 방법을 선택해주세요.',
        affectedColumns: [column.name]
      })
    }
  })
}

function checkNormality(
  numericColumns: DataColumn[],
  data: Record<string, unknown>[],
  issues: AnalysisIssue[],
  recommendations: AnalysisRecommendation[]
): Record<string, boolean> {
  const normalityResults: Record<string, boolean> = {}
  
  numericColumns.forEach(column => {
    // 간단한 정규성 추정 (실제로는 Shapiro-Wilk 등 사용)
    const values = data.map(row => Number(row[column.name])).filter(v => !isNaN(v))
    
    if (values.length < 3) {
      normalityResults[column.name] = false
      return
    }
    
    // 임시 정규성 검정 (실제 구현에서는 통계 검정 사용)
    const isNormal = estimateNormality(values)
    normalityResults[column.name] = isNormal
    
    if (!isNormal) {
      issues.push({
        type: 'warning',
        category: 'normality',
        message: `"${column.name}" 변수가 정규분포를 따르지 않을 가능성이 있습니다.`,
        solution: '비모수 검정을 사용하거나 데이터 변환(로그, 제곱근 등)을 고려해보세요.',
        affectedColumns: [column.name]
      })
      
      recommendations.push({
        type: 'alternative_test',
        title: `"${column.name}" 변수 비정규성 대응`,
        description: 'Mann-Whitney U 검정, Wilcoxon 검정 등 비모수 방법을 사용하세요.',
        priority: 'medium',
        actionable: true
      })
    }
  })
  
  return normalityResults
}

function checkVarianceHomogeneity(
  numericColumns: DataColumn[],
  categoricalColumns: DataColumn[],
  data: Record<string, unknown>[],
  issues: AnalysisIssue[],
  recommendations: AnalysisRecommendation[]
): Record<string, boolean> {
  const varianceResults: Record<string, boolean> = {}
  
  // 그룹이 있는 경우 등분산성 검정
  if (categoricalColumns.length > 0 && numericColumns.length > 0) {
    numericColumns.forEach(numCol => {
      categoricalColumns.forEach(catCol => {
        const isHomogeneous = estimateVarianceHomogeneity(data, numCol.name, catCol.name)
        const key = `${numCol.name}_by_${catCol.name}`
        varianceResults[key] = isHomogeneous
        
        if (!isHomogeneous) {
          issues.push({
            type: 'warning',
            category: 'variance',
            message: `"${catCol.name}" 그룹 간 "${numCol.name}"의 분산이 동일하지 않을 수 있습니다.`,
            solution: 'Welch t-test나 Games-Howell 사후검정을 사용해보세요.',
            affectedColumns: [numCol.name, catCol.name]
          })
        }
      })
    })
  }
  
  return varianceResults
}

function suggestStatisticalTests(
  numericColumns: DataColumn[],
  categoricalColumns: DataColumn[],
  sampleSize: number,
  normalityResults: Record<string, boolean>,
  varianceResults: Record<string, boolean>,
  suggestedTests: SuggestedTest[],
  issues: AnalysisIssue[]
): void {
  // 기초 통계량은 항상 가능
  if (numericColumns.length > 0) {
    suggestedTests.push({
      name: '기초 통계량',
      type: 'descriptive',
      confidence: 'high',
      reason: '수치형 변수가 있어 기초 통계량 계산이 가능합니다.',
      requirements: ['최소 1개의 수치형 변수'],
      variables: {
        dependent: numericColumns.map(col => col.name)
      }
    })
  }
  
  // 단일 표본 분석
  if (numericColumns.length >= 1 && sampleSize >= 3) {
    const hasNormalData = numericColumns.some(col => normalityResults[col.name])
    
    if (hasNormalData) {
      suggestedTests.push({
        name: 'One-sample t-test',
        type: 'parametric',
        confidence: sampleSize >= 30 ? 'high' : 'medium',
        reason: '정규분포를 따르는 수치형 변수로 모집단 평균과 비교 가능합니다.',
        requirements: ['정규성 가정 만족', '최소 3개 관측값'],
        variables: {
          dependent: numericColumns.filter(col => normalityResults[col.name]).map(col => col.name)
        }
      })
    }
    
    // 비모수 대안도 제안
    suggestedTests.push({
      name: 'Wilcoxon Signed-rank test',
      type: 'non_parametric',
      confidence: 'medium',
      reason: '정규성 가정 없이 중앙값 비교가 가능합니다.',
      requirements: ['최소 3개 관측값'],
      variables: {
        dependent: numericColumns.map(col => col.name)
      }
    })
  }
  
  // 두 그룹 비교
  if (numericColumns.length >= 1 && categoricalColumns.length >= 1) {
    const binaryGroups = categoricalColumns.filter(col => col.uniqueCount === 2)
    
    if (binaryGroups.length > 0) {
      const hasNormalData = numericColumns.some(col => normalityResults[col.name])
      
      if (hasNormalData && sampleSize >= 6) {
        suggestedTests.push({
          name: 'Two-sample t-test',
          type: 'parametric',
          confidence: sampleSize >= 30 ? 'high' : 'medium',
          reason: '두 그룹 간 평균 비교가 가능합니다.',
          requirements: ['정규성 가정', '각 그룹 최소 3개 관측값'],
          variables: {
            dependent: numericColumns.filter(col => normalityResults[col.name]).map(col => col.name),
            grouping: binaryGroups.map(col => col.name)
          }
        })
      }
      
      // 비모수 대안
      suggestedTests.push({
        name: 'Mann-Whitney U test',
        type: 'non_parametric',
        confidence: 'medium',
        reason: '정규성 가정 없이 두 그룹 비교가 가능합니다.',
        requirements: ['각 그룹 최소 3개 관측값'],
        variables: {
          dependent: numericColumns.map(col => col.name),
          grouping: binaryGroups.map(col => col.name)
        }
      })
    }
  }
  
  // 상관분석
  if (numericColumns.length >= 2) {
    const normalColumns = numericColumns.filter(col => normalityResults[col.name])
    
    if (normalColumns.length >= 2) {
      suggestedTests.push({
        name: 'Pearson 상관분석',
        type: 'parametric',
        confidence: sampleSize >= 30 ? 'high' : 'medium',
        reason: '두 연속형 변수 간 선형 관계를 분석할 수 있습니다.',
        requirements: ['정규성 가정', '선형 관계', '최소 5개 관측값'],
        variables: {
          dependent: normalColumns.map(col => col.name)
        }
      })
    }
    
    // 비모수 상관분석
    suggestedTests.push({
      name: 'Spearman 상관분석',
      type: 'non_parametric',
      confidence: 'medium',
      reason: '정규성 가정 없이 단조 관계를 분석할 수 있습니다.',
      requirements: ['최소 5개 관측값'],
      variables: {
        dependent: numericColumns.map(col => col.name)
      }
    })
  }
  
  // 분석 제안이 없는 경우
  if (suggestedTests.length === 0) {
    issues.push({
      type: 'error',
      category: 'data_type',
      message: '현재 데이터로는 의미 있는 통계 분석을 수행할 수 없습니다.',
      solution: '수치형 변수를 추가하거나 데이터 구조를 변경해주세요.'
    })
  }
}

// 유틸리티 함수들
function estimateNormality(values: number[]): boolean {
  if (values.length < 3) return false
  
  // 간단한 정규성 추정 (실제로는 Shapiro-Wilk 등 사용)
  const mean = values.reduce((sum, v) => sum + v, 0) / values.length
  const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / (values.length - 1)
  const std = Math.sqrt(variance)
  
  // 왜도와 첨도 기반 간단 추정
  const skewness = calculateSkewness(values, mean, std)
  const kurtosis = calculateKurtosis(values, mean, std)
  
  // 대략적인 기준: 왜도 < 2, 첨도 < 7
  return Math.abs(skewness) < 2 && Math.abs(kurtosis - 3) < 4
}

function estimateVarianceHomogeneity(
  data: Record<string, unknown>[],
  numericVar: string,
  groupVar: string
): boolean {
  // 간단한 분산 동질성 추정 (실제로는 Levene's test 등 사용)
  const groups = new Map<string, number[]>()
  
  data.forEach(row => {
    const groupValue = String(row[groupVar])
    const numValue = Number(row[numericVar])
    
    if (!isNaN(numValue)) {
      if (!groups.has(groupValue)) {
        groups.set(groupValue, [])
      }
      groups.get(groupValue)!.push(numValue)
    }
  })
  
  if (groups.size < 2) return true
  
  const variances = Array.from(groups.values()).map(values => {
    const mean = values.reduce((sum, v) => sum + v, 0) / values.length
    return values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / (values.length - 1)
  })
  
  const maxVar = Math.max(...variances)
  const minVar = Math.min(...variances)
  
  // 분산비 < 4면 동질적으로 간주
  return (maxVar / minVar) < 4
}

function calculateSkewness(values: number[], mean: number, std: number): number {
  const n = values.length
  const sum = values.reduce((acc, val) => acc + Math.pow((val - mean) / std, 3), 0)
  return (n / ((n - 1) * (n - 2))) * sum
}

function calculateKurtosis(values: number[], mean: number, std: number): number {
  const n = values.length
  const sum = values.reduce((acc, val) => acc + Math.pow((val - mean) / std, 4), 0)
  return (n * (n + 1) / ((n - 1) * (n - 2) * (n - 3))) * sum - (3 * Math.pow(n - 1, 2) / ((n - 2) * (n - 3)))
}