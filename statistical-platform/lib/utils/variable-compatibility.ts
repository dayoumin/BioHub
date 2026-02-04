/**
 * 변수 호환성 검증 유틸리티
 * 재분석 모드에서 새 데이터와 저장된 변수 매핑의 호환성을 검사합니다.
 */

import type { VariableMapping, ColumnInfo } from '@/lib/statistics/variable-mapping'

/**
 * 호환성 검사 결과
 */
export interface CompatibilityResult {
  /** 모든 필수 변수가 호환되는지 여부 */
  isCompatible: boolean
  /** 발견된 이슈 목록 */
  issues: CompatibilityIssue[]
  /** 호환 상태 요약 */
  summary: {
    totalRequired: number
    matched: number
    missing: number
    typeMismatch: number
  }
}

/**
 * 호환성 이슈 타입
 */
export interface CompatibilityIssue {
  /** 이슈 유형 */
  type: 'missing' | 'type_mismatch'
  /** 변수명 */
  variableName: string
  /** 역할 (dependentVar, independentVar 등) */
  role: string
  /** 기대값 */
  expected: string
  /** 실제값 */
  actual: string
  /** 심각도 (error: 분석 불가, warning: 주의 필요) */
  severity: 'error' | 'warning'
}

/**
 * 저장된 변수 매핑에서 필요한 모든 변수명 추출
 */
function extractRequiredVariables(mapping: VariableMapping): Array<{ name: string; role: string }> {
  const variables: Array<{ name: string; role: string }> = []

  const addVar = (value: string | string[] | undefined, role: string) => {
    if (!value) return
    if (Array.isArray(value)) {
      value.forEach(v => variables.push({ name: v, role }))
    } else {
      variables.push({ name: value, role })
    }
  }

  // 기본 변수
  addVar(mapping.dependentVar, 'dependentVar')
  addVar(mapping.independentVar, 'independentVar')
  addVar(mapping.groupVar, 'groupVar')
  addVar(mapping.timeVar, 'timeVar')
  addVar(mapping.variables, 'variables')

  // 고급 변수
  addVar(mapping.covariate, 'covariate')
  addVar(mapping.within, 'within')
  addVar(mapping.between, 'between')
  addVar(mapping.blocking, 'blocking')
  addVar(mapping.event, 'event')
  addVar(mapping.censoring, 'censoring')
  addVar(mapping.weight, 'weight')

  return variables
}

/**
 * 변수 역할을 한글로 변환
 */
function getRoleLabel(role: string): string {
  const labels: Record<string, string> = {
    dependentVar: '종속변수',
    independentVar: '독립변수',
    groupVar: '그룹변수',
    timeVar: '시간변수',
    variables: '분석변수',
    covariate: '공변량',
    within: '개체내 요인',
    between: '개체간 요인',
    blocking: '블록변수',
    event: '이벤트변수',
    censoring: '중도절단변수',
    weight: '가중치변수'
  }
  return labels[role] || role
}

/**
 * 새 데이터와 저장된 변수 매핑의 호환성을 검사합니다.
 *
 * @param savedMapping - 이전 분석에서 저장된 변수 매핑
 * @param newColumns - 새로 업로드된 데이터의 컬럼 정보
 * @returns 호환성 검사 결과
 *
 * @example
 * ```typescript
 * const result = checkVariableCompatibility(
 *   { dependentVar: 'score', groupVar: 'treatment' },
 *   [{ name: 'score', type: 'numeric' }, { name: 'category', type: 'categorical' }]
 * )
 * // result.isCompatible === false (groupVar 'treatment' 없음)
 * ```
 */
export function checkVariableCompatibility(
  savedMapping: VariableMapping | null | undefined,
  newColumns: ColumnInfo[]
): CompatibilityResult {
  // 빈 매핑은 항상 호환
  if (!savedMapping) {
    return {
      isCompatible: true,
      issues: [],
      summary: { totalRequired: 0, matched: 0, missing: 0, typeMismatch: 0 }
    }
  }

  const issues: CompatibilityIssue[] = []
  const requiredVars = extractRequiredVariables(savedMapping)
  const newColumnNames = new Set(newColumns.map(c => c.name))
  const newColumnTypes = new Map(newColumns.map(c => [c.name, c.type]))

  let matched = 0
  let missing = 0
  let typeMismatch = 0

  for (const { name, role } of requiredVars) {
    // 1. 변수 존재 여부 확인
    if (!newColumnNames.has(name)) {
      issues.push({
        type: 'missing',
        variableName: name,
        role,
        expected: name,
        actual: '없음',
        severity: 'error'
      })
      missing++
      continue
    }

    // 2. 타입 호환성 확인 (기본적인 검사)
    const actualType = newColumnTypes.get(name)

    // 종속변수, 독립변수, 공변량은 보통 numeric 기대
    const numericRoles = ['dependentVar', 'independentVar', 'covariate', 'weight']
    // 그룹변수, 요인은 categorical 기대
    const categoricalRoles = ['groupVar', 'within', 'between', 'blocking', 'event', 'censoring']

    if (numericRoles.includes(role) && actualType !== 'numeric') {
      issues.push({
        type: 'type_mismatch',
        variableName: name,
        role,
        expected: 'numeric',
        actual: actualType || 'unknown',
        severity: 'warning' // 타입 불일치는 warning (분석은 가능할 수 있음)
      })
      typeMismatch++
    } else if (categoricalRoles.includes(role) && actualType === 'numeric') {
      // numeric도 그룹변수로 사용 가능 (연속형을 범주형으로 처리)
      // 경고만 표시
      issues.push({
        type: 'type_mismatch',
        variableName: name,
        role,
        expected: 'categorical',
        actual: actualType || 'unknown',
        severity: 'warning'
      })
      typeMismatch++
    } else {
      matched++
    }
  }

  // error 심각도의 이슈가 없으면 호환
  const hasErrors = issues.some(issue => issue.severity === 'error')

  return {
    isCompatible: !hasErrors,
    issues,
    summary: {
      totalRequired: requiredVars.length,
      matched,
      missing,
      typeMismatch
    }
  }
}

/**
 * 호환성 이슈를 사용자 친화적인 메시지로 변환
 */
export function formatCompatibilityIssue(issue: CompatibilityIssue): string {
  const roleLabel = getRoleLabel(issue.role)

  if (issue.type === 'missing') {
    return `${roleLabel} "${issue.variableName}" 변수가 새 데이터에 없습니다.`
  }

  if (issue.type === 'type_mismatch') {
    return `${roleLabel} "${issue.variableName}"의 타입이 다릅니다 (기대: ${issue.expected}, 실제: ${issue.actual}).`
  }

  return `${issue.variableName}: 알 수 없는 이슈`
}
