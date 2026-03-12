/**
 * Slot Configurations for UnifiedVariableSelector
 *
 * SelectorType별 변수 슬롯 구성을 정의합니다.
 * variable-requirements.ts의 ID와 SELECTOR_MAP의 ID가 불일치하므로,
 * SelectorType 기준으로 직접 정의합니다.
 */

import type { VariableMapping } from '@/lib/statistics/variable-mapping'

/** Variable type accepted by a slot */
export type AcceptedType = 'numeric' | 'categorical'

/** Color scheme for slot visual distinction */
export type SlotColorScheme = 'info' | 'success' | 'highlight' | 'muted'

/** Configuration for a single variable role slot */
export interface SlotConfig {
  /** Unique slot identifier (e.g. 'dependent', 'factor') */
  id: string
  /** Display label (e.g. "종속 변수 (Y)") */
  label: string
  /** Short description */
  description: string
  /** Whether this slot must be filled */
  required: boolean
  /** Accepted variable types */
  accepts: AcceptedType[]
  /** Whether multiple variables can be assigned */
  multiple: boolean
  /** Max variables (only relevant when multiple=true) */
  maxCount?: number
  /** Min variables (only relevant when multiple=true) */
  minCount?: number
  /** Visual color scheme */
  colorScheme: SlotColorScheme
  /** Key in VariableMapping to write to */
  mappingKey: keyof VariableMapping
}

/** SelectorType from VariableSelectionStep */
export type SelectorType =
  | 'one-sample'
  | 'two-way-anova'
  | 'correlation'
  | 'paired'
  | 'multiple-regression'
  | 'group-comparison'
  | 'chi-square'
  | 'auto'
  | 'default'

/**
 * Returns slot configurations for a given selector type.
 * Each configuration defines what variable roles are needed and their constraints.
 */
export function getSlotConfigs(selectorType: SelectorType): SlotConfig[] {
  switch (selectorType) {
    case 'group-comparison':
      return [
        {
          id: 'dependent',
          label: '종속 변수 (Y)',
          description: '분석하고자 하는 결과 변수',
          required: true,
          accepts: ['numeric'],
          multiple: false,
          colorScheme: 'info',
          mappingKey: 'dependentVar',
        },
        {
          id: 'factor',
          label: '그룹 변수 (X)',
          description: '그룹을 나누는 범주형 변수',
          required: true,
          accepts: ['categorical'],
          multiple: false,
          colorScheme: 'success',
          mappingKey: 'groupVar',
        },
        {
          id: 'covariate',
          label: '공변량',
          description: '통제할 연속형 변수',
          required: false,
          accepts: ['numeric'],
          multiple: true,
          colorScheme: 'muted',
          mappingKey: 'covariate',
        },
      ]

    case 'correlation':
      return [
        {
          id: 'variables',
          label: '분석 변수',
          description: '상관관계를 분석할 연속형 변수들',
          required: true,
          accepts: ['numeric'],
          multiple: true,
          minCount: 2,
          maxCount: 10,
          colorScheme: 'highlight',
          mappingKey: 'variables',
        },
      ]

    case 'multiple-regression':
      return [
        {
          id: 'dependent',
          label: '종속 변수 (Y)',
          description: '예측하고자 하는 결과 변수',
          required: true,
          accepts: ['numeric'],
          multiple: false,
          colorScheme: 'info',
          mappingKey: 'dependentVar',
        },
        {
          id: 'independent',
          label: '독립 변수 (X)',
          description: '예측에 사용할 변수들',
          required: true,
          accepts: ['numeric'],
          multiple: true,
          minCount: 1,
          maxCount: 10,
          colorScheme: 'highlight',
          mappingKey: 'independentVar',
        },
      ]

    case 'paired':
      return [
        {
          id: 'variables',
          label: '비교 변수',
          description: '대응 비교할 연속형 변수 2개',
          required: true,
          accepts: ['numeric'],
          multiple: true,
          minCount: 2,
          maxCount: 2,
          colorScheme: 'highlight',
          mappingKey: 'variables',
        },
      ]

    case 'one-sample':
      return [
        {
          id: 'dependent',
          label: '검정 변수',
          description: '검정할 연속형 변수',
          required: true,
          accepts: ['numeric'],
          multiple: false,
          colorScheme: 'info',
          mappingKey: 'dependentVar',
        },
      ]

    case 'chi-square':
      return [
        {
          id: 'independent',
          label: '독립 변수 (행)',
          description: '행을 구성할 범주형 변수',
          required: true,
          accepts: ['categorical'],
          multiple: false,
          colorScheme: 'highlight',
          mappingKey: 'independentVar',
        },
        {
          id: 'dependent',
          label: '종속 변수 (열)',
          description: '열을 구성할 범주형 변수',
          required: true,
          accepts: ['categorical'],
          multiple: false,
          colorScheme: 'info',
          mappingKey: 'dependentVar',
        },
      ]

    case 'two-way-anova':
      return [
        {
          id: 'dependent',
          label: '종속 변수 (Y)',
          description: '분석하고자 하는 결과 변수',
          required: true,
          accepts: ['numeric'],
          multiple: false,
          colorScheme: 'info',
          mappingKey: 'dependentVar',
        },
        {
          id: 'factor',
          label: '요인 변수',
          description: '2개의 범주형 요인 변수',
          required: true,
          accepts: ['categorical'],
          multiple: true,
          minCount: 2,
          maxCount: 2,
          colorScheme: 'success',
          mappingKey: 'groupVar',
        },
      ]

    case 'default':
      return [
        {
          id: 'dependent',
          label: '종속 변수 (Y)',
          description: '결과 변수',
          required: true,
          accepts: ['numeric', 'categorical'],
          multiple: false,
          colorScheme: 'info',
          mappingKey: 'dependentVar',
        },
        {
          id: 'independent',
          label: '독립 변수 (X)',
          description: '설명 변수',
          required: true,
          accepts: ['numeric', 'categorical'],
          multiple: false,
          colorScheme: 'highlight',
          mappingKey: 'independentVar',
        },
      ]

    // 'auto' is handled by AutoConfirmSelector, not UnifiedVariableSelector
    case 'auto':
      return []
  }
}

/**
 * Maps a column type from variable-type-detector to slot AcceptedType.
 * 'continuous' → 'numeric', everything else → 'categorical'
 */
export function toAcceptedType(variableType: string): AcceptedType {
  return variableType === 'continuous' ? 'numeric' : 'categorical'
}

/**
 * Checks if a variable type is accepted by a slot.
 */
export function isTypeAccepted(slot: SlotConfig, variableType: AcceptedType): boolean {
  return slot.accepts.includes(variableType)
}

/**
 * Builds a VariableMapping from slot assignments.
 * Handles both single and multiple variable slots.
 */
export function buildMappingFromSlots(
  slots: SlotConfig[],
  assignments: Record<string, string[]>
): VariableMapping {
  const mapping: VariableMapping = {}

  for (const slot of slots) {
    const assigned = assignments[slot.id]
    if (!assigned || assigned.length === 0) continue

    if (slot.multiple) {
      if (slot.mappingKey === 'variables') {
        mapping.variables = assigned
      } else if (slot.mappingKey === 'covariate') {
        mapping.covariate = assigned
      } else if (slot.mappingKey === 'groupVar') {
        // two-way-anova: factor(2) → groupVar as comma-separated
        mapping.groupVar = assigned.join(',')
      } else if (slot.mappingKey === 'independentVar') {
        mapping.independentVar = assigned.join(',')
      }
    } else {
      const key = slot.mappingKey
      if (key === 'dependentVar') mapping.dependentVar = assigned[0]
      else if (key === 'independentVar') mapping.independentVar = assigned[0]
      else if (key === 'groupVar') mapping.groupVar = assigned[0]
    }
  }

  return mapping
}

/**
 * Validates that all required slots are filled and constraints are met.
 * Returns an array of error messages (empty = valid).
 */
export function validateSlots(
  slots: SlotConfig[],
  assignments: Record<string, string[]>
): string[] {
  const errors: string[] = []

  for (const slot of slots) {
    const assigned = assignments[slot.id] ?? []
    const count = assigned.length

    if (slot.required && count === 0) {
      errors.push(`${slot.label}을(를) 선택해주세요`)
    }

    if (slot.multiple) {
      if (slot.minCount !== undefined && count > 0 && count < slot.minCount) {
        errors.push(`${slot.label}: 최소 ${slot.minCount}개 필요 (현재 ${count}개)`)
      }
      if (slot.maxCount !== undefined && count > slot.maxCount) {
        errors.push(`${slot.label}: 최대 ${slot.maxCount}개 (현재 ${count}개)`)
      }
    }
  }

  return errors
}
