/**
 * 통계 방법에 따른 변수 자동 매핑
 */

import { StatisticalMethod } from './method-mapping'

export interface VariableMapping {
  // 기본 변수
  independentVar?: string | string[] // 독립변수 (X)
  dependentVar?: string | string[] // 종속변수 (Y) - 다중 종속변수 지원 (McNemar, MANOVA 등)
  groupVar?: string // 그룹 변수 / 요인 (factor)
  timeVar?: string // 시간 변수
  variables?: string[] // 일반 변수들

  // 고급 변수 역할
  covariate?: string | string[] // 공변량 (ANCOVA, 편상관)
  within?: string[] // 개체내 요인 (반복측정)
  between?: string[] // 개체간 요인
  blocking?: string | string[] // 블록 변수 / 무선효과 (혼합모형)
  event?: string // 이벤트 변수 (생존분석)
  censoring?: string // 중도절단 변수 (생존분석)
  weight?: string // 가중치 변수

  // 확장성을 위한 index signature
  [key: string]: string | string[] | undefined
}

export interface ColumnInfo {
  name: string
  type: 'numeric' | 'categorical' | 'date' | 'text'
  uniqueValues?: number
  missing?: number
  min?: number
  max?: number
}

/**
 * 통계 방법에 따른 변수 자동 매핑
 * 53개 메서드별 세부 매핑 지원
 */
export function autoMapVariables(
  method: StatisticalMethod,
  columns: ColumnInfo[]
): VariableMapping {
  const numericColumns = columns.filter(c => c.type === 'numeric')
  const categoricalColumns = columns.filter(c => c.type === 'categorical')
  const dateColumns = columns.filter(c => c.type === 'date')

  const mapping: VariableMapping = {}

  // 메서드 ID 기반 상세 매핑
  switch (method.id) {
    // ========================================
    // 1. 기술통계 (5개)
    // ========================================
    case 'descriptive':
    case 'descriptive-stats':
      if (numericColumns.length > 0) {
        mapping.variables = numericColumns.map(c => c.name)
      }
      if (categoricalColumns.length > 0) {
        mapping.groupVar = categoricalColumns[0].name
      }
      break

    case 'explore-data':
      if (numericColumns.length > 0) {
        mapping.variables = numericColumns.map(c => c.name)
      }
      if (categoricalColumns.length > 0) {
        mapping.groupVar = categoricalColumns[0].name
      }
      break

    case 'reliability':
    case 'reliability-analysis':
      if (numericColumns.length >= 2) {
        mapping.variables = numericColumns.map(c => c.name)
      }
      break

    // ========================================
    // 2. 평균 비교 / t-검정 (6개)
    // ========================================
    case 'one-sample-t':
      if (numericColumns.length > 0) {
        mapping.dependentVar = numericColumns[0].name
      }
      break

    case 't-test':
    case 'two-sample-t':
      if (numericColumns.length > 0) {
        mapping.dependentVar = numericColumns[0].name
      }
      if (categoricalColumns.length > 0) {
        const binaryVar = categoricalColumns.find(c => c.uniqueValues === 2)
        mapping.groupVar = binaryVar ? binaryVar.name : categoricalColumns[0].name
      }
      break

    case 'paired-t':
      if (numericColumns.length >= 2) {
        mapping.variables = [numericColumns[0].name, numericColumns[1].name]
      }
      break

    case 'welch-t':
      if (numericColumns.length > 0) {
        mapping.dependentVar = numericColumns[0].name
      }
      if (categoricalColumns.length > 0) {
        const binaryVar = categoricalColumns.find(c => c.uniqueValues === 2)
        mapping.groupVar = binaryVar ? binaryVar.name : categoricalColumns[0].name
      }
      break

    case 'proportion-test':
    case 'one-sample-proportion':
      if (categoricalColumns.length > 0) {
        const binaryVar = categoricalColumns.find(c => c.uniqueValues === 2)
        mapping.dependentVar = binaryVar ? binaryVar.name : categoricalColumns[0].name
      }
      break

    case 'means-plot':
      if (numericColumns.length > 0) {
        mapping.dependentVar = numericColumns[0].name
      }
      if (categoricalColumns.length > 0) {
        mapping.groupVar = categoricalColumns[0].name
      }
      break

    // ========================================
    // 3. ANOVA / GLM (7개)
    // ========================================
    case 'anova':
    case 'one-way-anova':
      if (numericColumns.length > 0) {
        mapping.dependentVar = numericColumns[0].name
      }
      if (categoricalColumns.length > 0) {
        mapping.groupVar = categoricalColumns[0].name
      }
      break

    case 'two-way-anova':
      if (numericColumns.length > 0) {
        mapping.dependentVar = numericColumns[0].name
      }
      if (categoricalColumns.length >= 2) {
        mapping.groupVar = `${categoricalColumns[0].name},${categoricalColumns[1].name}`
      } else if (categoricalColumns.length === 1) {
        mapping.groupVar = categoricalColumns[0].name
      }
      break

    case 'three-way-anova':
      if (numericColumns.length > 0) {
        mapping.dependentVar = numericColumns[0].name
      }
      if (categoricalColumns.length >= 3) {
        mapping.groupVar = categoricalColumns.slice(0, 3).map(c => c.name).join(',')
      }
      break

    case 'ancova':
      if (numericColumns.length >= 2) {
        mapping.dependentVar = numericColumns[0].name
        mapping.covariate = numericColumns.slice(1).map(c => c.name) // 공변량
      }
      if (categoricalColumns.length > 0) {
        mapping.groupVar = categoricalColumns[0].name
      }
      break

    case 'repeated-measures-anova':
      if (numericColumns.length >= 2) {
        mapping.within = numericColumns.map(c => c.name) // 반복측정 변수들 (개체내 요인)
      }
      if (categoricalColumns.length > 0) {
        mapping.between = [categoricalColumns[0].name] // 개체간 요인
      }
      break

    case 'manova':
      if (numericColumns.length >= 2) {
        mapping.variables = numericColumns.map(c => c.name) // 다중 종속변수
      }
      if (categoricalColumns.length > 0) {
        mapping.groupVar = categoricalColumns[0].name
      }
      break

    case 'mixed-model':
      if (numericColumns.length > 0) {
        mapping.dependentVar = numericColumns[0].name
      }
      if (categoricalColumns.length >= 2) {
        mapping.groupVar = categoricalColumns[0].name // 고정효과
        mapping.blocking = categoricalColumns[1].name // 무선효과
      } else if (categoricalColumns.length === 1) {
        mapping.blocking = categoricalColumns[0].name // 무선효과
      }
      break

    // ========================================
    // 4. 상관분석 (4개)
    // ========================================
    case 'correlation':
    case 'pearson-correlation':
    case 'spearman-correlation':
    case 'kendall-correlation':
      if (numericColumns.length >= 2) {
        mapping.variables = numericColumns.slice(0, 5).map(c => c.name)
      }
      break

    case 'partial-correlation':
      if (numericColumns.length >= 3) {
        mapping.variables = numericColumns.slice(0, 2).map(c => c.name) // 분석 변수
        mapping.covariate = numericColumns.slice(2).map(c => c.name) // 통제 변수
      }
      break

    // ========================================
    // 5. 회귀분석 (6개)
    // ========================================
    case 'regression':
    case 'simple-regression':
      if (numericColumns.length >= 2) {
        mapping.dependentVar = numericColumns[0].name
        mapping.independentVar = numericColumns[1].name
      }
      break

    case 'multiple-regression':
      if (numericColumns.length >= 2) {
        mapping.dependentVar = numericColumns[0].name
        mapping.independentVar = numericColumns.slice(1).map(c => c.name)
      }
      break

    case 'stepwise':
    case 'stepwise-regression':
      if (numericColumns.length >= 3) {
        mapping.dependentVar = numericColumns[0].name
        mapping.independentVar = numericColumns.slice(1).map(c => c.name)
      }
      break

    case 'logistic-regression':
      const binaryDepVar = categoricalColumns.find(c => c.uniqueValues === 2)
      if (binaryDepVar) {
        mapping.dependentVar = binaryDepVar.name
        mapping.independentVar = numericColumns.map(c => c.name)
      }
      break

    case 'ordinal-regression':
      if (categoricalColumns.length > 0 && numericColumns.length > 0) {
        mapping.dependentVar = categoricalColumns[0].name // 서열 종속변수
        mapping.independentVar = numericColumns.map(c => c.name)
      }
      break

    case 'poisson':
    case 'poisson-regression':
      if (numericColumns.length >= 2) {
        mapping.dependentVar = numericColumns[0].name // 카운트 변수
        mapping.independentVar = numericColumns.slice(1).map(c => c.name)
      }
      break

    // ========================================
    // 6. 비모수 검정 (12개)
    // ========================================
    case 'mann-whitney':
      if (numericColumns.length > 0) {
        mapping.dependentVar = numericColumns[0].name
      }
      if (categoricalColumns.length > 0) {
        const binaryVar = categoricalColumns.find(c => c.uniqueValues === 2)
        mapping.groupVar = binaryVar ? binaryVar.name : categoricalColumns[0].name
      }
      break

    case 'wilcoxon':
    case 'wilcoxon-signed-rank':
      if (numericColumns.length >= 2) {
        mapping.variables = [numericColumns[0].name, numericColumns[1].name]
      }
      break

    case 'kruskal-wallis':
      if (numericColumns.length > 0) {
        mapping.dependentVar = numericColumns[0].name
      }
      if (categoricalColumns.length > 0) {
        mapping.groupVar = categoricalColumns[0].name
      }
      break

    case 'friedman':
      if (numericColumns.length >= 3) {
        mapping.variables = numericColumns.map(c => c.name)
      }
      break

    case 'sign-test':
      if (numericColumns.length >= 2) {
        mapping.variables = [numericColumns[0].name, numericColumns[1].name]
      }
      break

    case 'runs-test':
      if (numericColumns.length > 0) {
        mapping.dependentVar = numericColumns[0].name
      } else if (categoricalColumns.length > 0) {
        mapping.dependentVar = categoricalColumns[0].name
      }
      break

    case 'ks-test':
    case 'kolmogorov-smirnov':
      if (numericColumns.length > 0) {
        mapping.dependentVar = numericColumns[0].name
      }
      if (categoricalColumns.length > 0) {
        const binaryVar = categoricalColumns.find(c => c.uniqueValues === 2)
        mapping.groupVar = binaryVar ? binaryVar.name : undefined
      }
      break

    case 'mcnemar':
      if (categoricalColumns.length >= 2) {
        const binaryVars = categoricalColumns.filter(c => c.uniqueValues === 2)
        if (binaryVars.length >= 2) {
          mapping.variables = [binaryVars[0].name, binaryVars[1].name]
        }
      }
      break

    case 'cochran-q':
      if (categoricalColumns.length >= 4) {
        mapping.independentVar = categoricalColumns[0].name // 피험자 ID
        mapping.variables = categoricalColumns.slice(1, 4).map(c => c.name) // 조건 변수들
      }
      break

    case 'mood-median':
      if (numericColumns.length > 0) {
        mapping.dependentVar = numericColumns[0].name
      }
      if (categoricalColumns.length > 0) {
        mapping.groupVar = categoricalColumns[0].name
      }
      break

    case 'binomial-test':
      if (categoricalColumns.length > 0) {
        const binaryVar = categoricalColumns.find(c => c.uniqueValues === 2)
        mapping.dependentVar = binaryVar ? binaryVar.name : categoricalColumns[0].name
      }
      break

    case 'mann-kendall':
    case 'mann-kendall-test':
      if (numericColumns.length > 0) {
        mapping.dependentVar = numericColumns[0].name
      }
      if (dateColumns.length > 0) {
        mapping.timeVar = dateColumns[0].name
      }
      break

    case 'normality-test':
      if (numericColumns.length > 0) {
        mapping.variables = numericColumns.map(c => c.name)
      }
      break

    case 'power-analysis':
      // 검정력 분석은 데이터 기반 매핑이 아님
      break

    // ========================================
    // 7. 카이제곱 검정 (3개)
    // ========================================
    case 'chi-square':
    case 'chi-square-independence':
      if (categoricalColumns.length >= 2) {
        mapping.independentVar = categoricalColumns[0].name // 행 변수
        mapping.dependentVar = categoricalColumns[1].name // 열 변수
      }
      break

    case 'chi-square-goodness':
      if (categoricalColumns.length > 0) {
        mapping.dependentVar = categoricalColumns[0].name
      }
      break

    case 'fisher-exact':
      if (categoricalColumns.length >= 2) {
        const binaryVars = categoricalColumns.filter(c => c.uniqueValues === 2)
        if (binaryVars.length >= 2) {
          mapping.independentVar = binaryVars[0].name
          mapping.dependentVar = binaryVars[1].name
        }
      }
      break

    // ========================================
    // 8. 고급 분석 (6개)
    // ========================================
    case 'factor-analysis':
      if (numericColumns.length >= 3) {
        mapping.variables = numericColumns.map(c => c.name)
      }
      break

    case 'pca':
      mapping.variables = numericColumns.map(c => c.name)
      break

    case 'cluster':
      mapping.variables = numericColumns.map(c => c.name)
      break

    case 'discriminant':
    case 'discriminant-analysis':
      if (categoricalColumns.length > 0 && numericColumns.length >= 2) {
        mapping.dependentVar = categoricalColumns[0].name // 그룹 변수
        mapping.independentVar = numericColumns.map(c => c.name) // 판별 변수
      }
      break

    case 'dose-response':
      if (numericColumns.length >= 2) {
        mapping.independentVar = numericColumns[0].name // 용량
        mapping.dependentVar = numericColumns[1].name // 반응
      }
      break

    case 'response-surface':
      if (numericColumns.length >= 3) {
        mapping.dependentVar = numericColumns[0].name // 반응 변수
        mapping.independentVar = numericColumns.slice(1).map(c => c.name) // 요인 변수들
      }
      break

    case 'games-howell':
      // Games-Howell은 ANOVA 사후검정이므로 ANOVA와 동일
      if (numericColumns.length > 0) {
        mapping.dependentVar = numericColumns[0].name
      }
      if (categoricalColumns.length > 0) {
        mapping.groupVar = categoricalColumns[0].name
      }
      break

    default:
      // 카테고리 기반 폴백 처리
      switch (method.category) {
        case 't-test':
          if (numericColumns.length > 0) {
            mapping.dependentVar = numericColumns[0].name
          }
          if (categoricalColumns.length > 0) {
            const binaryVar = categoricalColumns.find(c => c.uniqueValues === 2)
            mapping.groupVar = binaryVar ? binaryVar.name : categoricalColumns[0].name
          }
          break

        case 'anova':
          if (numericColumns.length > 0) {
            mapping.dependentVar = numericColumns[0].name
          }
          if (categoricalColumns.length > 0) {
            mapping.groupVar = categoricalColumns[0].name
          }
          break

        case 'regression':
          if (numericColumns.length >= 2) {
            mapping.dependentVar = numericColumns[0].name
            mapping.independentVar = numericColumns.slice(1).map(c => c.name)
          }
          break

        case 'nonparametric':
          if (numericColumns.length > 0) {
            mapping.dependentVar = numericColumns[0].name
          }
          if (categoricalColumns.length > 0) {
            mapping.groupVar = categoricalColumns[0].name
          }
          break

        default:
          if (numericColumns.length > 0) {
            mapping.variables = [numericColumns[0].name]
          }
      }
  }

  return mapping
}

/**
 * 변수 매핑 검증
 */
export function validateVariableMapping(
  method: StatisticalMethod,
  mapping: VariableMapping,
  columns: ColumnInfo[]
): { isValid: boolean; errors: string[] } {
  const errors: string[] = []

  // 필수 변수 확인
  switch (method.category) {
    case 't-test':
      if (!mapping.dependentVar && method.id !== 'paired-t') {
        errors.push('종속변수(수치형)를 선택해주세요')
      }
      if (method.id === 'two-sample-t' && !mapping.groupVar) {
        errors.push('그룹 변수(범주형)를 선택해주세요')
      }
      if (method.id === 'paired-t' && (!mapping.variables || mapping.variables.length < 2)) {
        errors.push('비교할 두 변수를 선택해주세요')
      }
      break

    case 'anova':
      if (!mapping.dependentVar) {
        errors.push('종속변수(수치형)를 선택해주세요')
      }
      if (!mapping.groupVar) {
        errors.push('그룹 변수(범주형)를 선택해주세요')
      }
      break

    case 'regression':
      if (!mapping.dependentVar) {
        errors.push('종속변수를 선택해주세요')
      }
      if (!mapping.independentVar) {
        errors.push('독립변수를 선택해주세요')
      }
      break

    case 'correlation':
      if (!mapping.variables || mapping.variables.length < 2) {
        errors.push('상관분석을 위해 최소 2개의 수치형 변수가 필요합니다')
      }
      break

    case 'chi-square': {
      // Goodness modes (1 variable): chi-square-goodness, proportion-test
      const isGoodness = method.id === 'chi-square-goodness' || method.id === 'proportion-test'
      if (isGoodness) {
        if (!mapping.dependentVar) {
          errors.push('검정할 범주형 변수를 선택해주세요')
        }
      } else {
        // Independence modes (2 variables): chi-square, chi-square-independence, mcnemar
        if (!mapping.independentVar) {
          errors.push('독립 변수(행)를 선택해주세요')
        }
        if (!mapping.dependentVar) {
          errors.push('종속 변수(열)를 선택해주세요')
        }
      }
      break
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  }
}

/**
 * 변수 유형별 추천 메시지
 */
export function getVariableSuggestions(
  method: StatisticalMethod,
  columns: ColumnInfo[]
): string[] {
  const suggestions: string[] = []
  const numericCount = columns.filter(c => c.type === 'numeric').length
  const categoricalCount = columns.filter(c => c.type === 'categorical').length

  switch (method.category) {
    case 't-test':
      if (method.id === 'two-sample-t') {
        suggestions.push('💡 두 그룹 간 평균을 비교합니다')
        suggestions.push('종속변수: 비교할 수치형 변수 (예: 키, 몸무게)')
        suggestions.push('그룹변수: 2개 그룹을 구분하는 범주형 변수 (예: 성별)')
      }
      break

    case 'regression':
      if (method.id === 'simple-regression') {
        suggestions.push('💡 한 변수가 다른 변수에 미치는 영향을 분석합니다')
        suggestions.push('종속변수: 예측하려는 변수 (Y)')
        suggestions.push('독립변수: 영향을 미치는 변수 (X)')
      }
      break

    case 'correlation':
      suggestions.push('💡 변수 간의 선형적 관계를 분석합니다')
      suggestions.push(`현재 ${numericCount}개의 수치형 변수 사용 가능`)
      break
  }

  return suggestions
}