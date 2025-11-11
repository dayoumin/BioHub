/**
 * VariableAssignment ↔ 특화 타입 변환 유틸리티
 *
 * 목적: 타입 안전성을 확보하면서 VariableSelector와 통계 페이지 간 타입 불일치 해결
 * 날짜: 2025-11-05
 */

import type {
  ANCOVAVariables,
  ANOVAVariables,
  ChiSquareIndependenceVariables,
  CorrelationVariables,
  DiscriminantVariables,
  FrequencyTableVariables,
  FriedmanVariables,
  KruskalWallisVariables,
  KSTestVariables,
  MannWhitneyVariables,
  MANOVAVariables,
  MixedModelVariables,
  NonParametricVariables,
  NormalityTestVariables,
  OneSampleTVariables,
  PartialCorrelationVariables,
  PCAVariables,
  ProportionTestVariables,
  RegressionVariables,
  ReliabilityVariables,
  RunsTestVariables,
  WelchTVariables,
  WilcoxonVariables
} from './statistics'

/**
 * VariableSelector가 반환하는 동적 타입
 */
export interface VariableAssignment {
  [role: string]: string | string[] | undefined
}

/**
 * 헬퍼: 값을 단일 문자열로 변환
 */
function toSingleString(value: string | string[] | undefined): string {
  if (!value) return ''
  return Array.isArray(value) ? value[0] || '' : value
}

/**
 * 헬퍼: 값을 문자열 배열로 변환
 */
function toStringArray(value: string | string[] | undefined): string[] {
  if (!value) return []
  return Array.isArray(value) ? value : [value]
}

// ============================================================================
// 변환 함수 (41개 통계 메서드)
// ============================================================================

export function toANCOVAVariables(vars: VariableAssignment): ANCOVAVariables {
  return {
    dependent: toSingleString(vars.dependent),
    factor: toStringArray(vars.factor || vars.independent),
    covariate: toStringArray(vars.covariate || vars.covariates)
  }
}

export function toANOVAVariables(vars: VariableAssignment): ANOVAVariables {
  return {
    dependent: toSingleString(vars.dependent),
    factor: toStringArray(vars.factor || vars.independent),
    covariate: toStringArray(vars.covariate || vars.covariates)
  }
}

export function toChiSquareIndependenceVariables(vars: VariableAssignment): ChiSquareIndependenceVariables {
  return {
    row: toSingleString(vars.independent || vars.row),
    column: toSingleString(vars.dependent || vars.column)
  }
}

export function toCorrelationVariables(vars: VariableAssignment): CorrelationVariables {
  return {
    all: toStringArray(vars.all || vars.variables)
  }
}

export function toDiscriminantVariables(vars: VariableAssignment): DiscriminantVariables {
  return {
    dependent: toSingleString(vars.dependent),
    independent: toStringArray(vars.independent)
  }
}

export function toFrequencyTableVariables(vars: VariableAssignment): FrequencyTableVariables {
  return {
    dependent: toStringArray(vars.dependent || vars.all || vars.variables) // Fallback: all → dependent
  }
}

export function toFriedmanVariables(vars: VariableAssignment): FriedmanVariables {
  return {
    dependent: toSingleString(vars.dependent),
    within: toStringArray(vars.within || vars.conditions || vars.groups)
  }
}

export function toKruskalWallisVariables(vars: VariableAssignment): KruskalWallisVariables {
  return {
    dependent: toSingleString(vars.dependent),
    factor: toStringArray(vars.factor || vars.groups)
  }
}

export function toKSTestVariables(vars: VariableAssignment): KSTestVariables {
  return {
    variables: toStringArray(vars.variables || vars.data || vars.variable)
  }
}

export function toMannWhitneyVariables(vars: VariableAssignment): MannWhitneyVariables {
  return {
    dependent: toSingleString(vars.dependent),
    factor: toStringArray(vars.factor || vars.groups)
  }
}

export function toMANOVAVariables(vars: VariableAssignment): MANOVAVariables {
  return {
    dependent: toStringArray(vars.dependent),
    factor: toStringArray(vars.factor || vars.independent)
  }
}

export function toMixedModelVariables(vars: VariableAssignment): MixedModelVariables {
  return {
    dependent: toSingleString(vars.dependent),
    factor: toStringArray(vars.factor || vars.independent),
    blocking: toStringArray(vars.blocking)
  }
}

export function toNonParametricVariables(vars: VariableAssignment): NonParametricVariables {
  return {
    dependent: toSingleString(vars.dependent),
    factor: toStringArray(vars.factor || vars.groups)
  }
}

export function toNormalityTestVariables(vars: VariableAssignment): NormalityTestVariables {
  return {
    all: toStringArray(vars.all || vars.variables)
  }
}

export function toOneSampleTVariables(vars: VariableAssignment): OneSampleTVariables {
  return {
    dependent: toSingleString(vars.dependent || vars.variable)
  }
}

export function toPartialCorrelationVariables(vars: VariableAssignment): PartialCorrelationVariables {
  const result: PartialCorrelationVariables = {
    dependent: toStringArray(vars.dependent || vars.all || vars.variables) // Fallback: all → dependent
  }

  if (vars.covariate) {
    result.covariate = toStringArray(vars.covariate)
  }

  if (vars.location && typeof vars.location === 'object' && !Array.isArray(vars.location)) {
    result.location = vars.location as { column: string; row: string }
  }

  return result
}

export function toPCAVariables(vars: VariableAssignment): PCAVariables {
  return {
    all: toStringArray(vars.all || vars.variables)
  }
}

export function toProportionTestVariables(vars: VariableAssignment): ProportionTestVariables {
  return {
    factor: toStringArray(vars.factor || vars.groups || vars.variables)
  }
}

export function toRegressionVariables(vars: VariableAssignment): RegressionVariables {
  return {
    dependent: toSingleString(vars.dependent),
    independent: toStringArray(vars.independent)
  }
}

export function toReliabilityVariables(vars: VariableAssignment): ReliabilityVariables {
  return {
    items: toStringArray(vars.items || vars.variables)
  }
}

export function toRunsTestVariables(vars: VariableAssignment): RunsTestVariables {
  return {
    dependent: toSingleString(vars.dependent || vars.data || vars.variable) // Fallback: data → dependent
  }
}

export function toWelchTVariables(vars: VariableAssignment): WelchTVariables {
  return {
    dependent: toSingleString(vars.dependent),
    factor: toStringArray(vars.factor || vars.groups)
  }
}

export function toWilcoxonVariables(vars: VariableAssignment): WilcoxonVariables {
  return {
    dependent: toStringArray(vars.dependent || vars.variable || vars.variables)
  }
}

// ============================================================================
// 타입 가드 (옵션: 런타임 검증 필요 시)
// ============================================================================

export function isValidANCOVAVariables(vars: unknown): vars is ANCOVAVariables {
  if (!vars || typeof vars !== 'object') return false
  const v = vars as Partial<ANCOVAVariables>
  return (
    typeof v.dependent === 'string' &&
    Array.isArray(v.factor) &&
    Array.isArray(v.covariate)
  )
}

// ... (필요 시 다른 타입 가드 추가)
