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
  /** How multiple values are serialized: 'array' keeps string[], 'comma' joins with comma (default: 'array') */
  multipleFormat?: 'array' | 'comma'
}

/** SelectorType — canonical 정의는 lib/registry/selector-types.ts, 여기서 re-export */
import type { SelectorType } from '@/lib/registry/selector-types'
export type { SelectorType } from '@/lib/registry/selector-types'

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
          multipleFormat: 'comma',
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
          multipleFormat: 'comma',
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

    case 'repeated-measures':
      return [
        {
          id: 'variables',
          label: '반복 측정 변수',
          description: '반복해서 측정된 연속형 변수들 (개체내 요인)',
          required: true,
          accepts: ['numeric'],
          multiple: true,
          minCount: 2,
          colorScheme: 'highlight',
          mappingKey: 'variables',
        },
        {
          id: 'group',
          label: '그룹 변수',
          description: '그룹을 나누는 범주형 변수 (개체간 요인)',
          required: false,
          accepts: ['categorical'],
          multiple: false,
          colorScheme: 'success',
          mappingKey: 'groupVar',
        },
      ]

    case 'manova':
      return [
        {
          id: 'variables',
          label: '종속 변수 (Y)',
          description: '2개 이상의 다변량 종속 변수들',
          required: true,
          accepts: ['numeric'],
          multiple: true,
          minCount: 2,
          colorScheme: 'info',
          mappingKey: 'variables',
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
      ]

    case 'survival':
      return [
        {
          id: 'time',
          label: '시간 변수 (Time)',
          description: '관찰 생존/추적 시간 (연속형)',
          required: true,
          accepts: ['numeric'],
          multiple: false,
          colorScheme: 'info',
          mappingKey: 'timeVar',
        },
        {
          id: 'event',
          label: '사건 변수 (Event)',
          description: '발생 여부를 나타내는 사건 변수',
          required: true,
          accepts: ['categorical', 'numeric'],
          multiple: false,
          colorScheme: 'highlight',
          mappingKey: 'event',
        },
        {
          id: 'factor',
          label: '비교 그룹',
          description: '생존 차이를 비교할 범주형 그룹 변수',
          required: false,
          accepts: ['categorical'],
          multiple: false,
          colorScheme: 'success',
          mappingKey: 'groupVar',
        },
        {
          id: 'covariate',
          label: '예측 변수 (Cox 전용)',
          description: '생존 위험에 영향을 미치는 다변량 공변량들',
          required: false,
          accepts: ['numeric', 'categorical'],
          multiple: true,
          colorScheme: 'muted',
          mappingKey: 'independentVar',
          multipleFormat: 'comma',
        },
      ]

    case 'time-series':
      return [
        {
          id: 'dependent',
          label: '목표 변수 (Y)',
          description: '시계열 분석을 수행할 주요 관심 변수',
          required: true,
          accepts: ['numeric'],
          multiple: false,
          colorScheme: 'info',
          mappingKey: 'dependentVar',
        },
        {
          id: 'time',
          label: '시간/인덱스 변수',
          description: '시점을 나타내는 변수',
          required: false,
          accepts: ['categorical', 'numeric'], // some are strings or dates treated as categorical
          multiple: false,
          colorScheme: 'success',
          mappingKey: 'timeVar',
        },
      ]

    case 'mixed-model':
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
          id: 'fixed',
          label: '고정 효과 변수',
          description: '결과에 영향을 미치는 고정 요인',
          required: true,
          accepts: ['categorical', 'numeric'],
          multiple: true,
          colorScheme: 'success',
          mappingKey: 'groupVar',
          multipleFormat: 'comma',
        },
        {
          id: 'random',
          label: '무선 효과 변수',
          description: '개체간/블록별 편차를 보정할 변수',
          required: true,
          accepts: ['categorical'],
          multiple: true,
          colorScheme: 'highlight',
          mappingKey: 'blocking',
          multipleFormat: 'comma',
        },
      ]

    case 'discriminant':
      return [
        {
          id: 'group',
          label: '분류 변수 (Y)',
          description: '예측할 대상이 되는 범주형 상태',
          required: true,
          accepts: ['categorical'],
          multiple: false,
          colorScheme: 'info',
          mappingKey: 'dependentVar',
        },
        {
          id: 'predictors',
          label: '판별 변수 (X)',
          description: '그룹 구분에 사용되는 연속형 예측 변수들',
          required: true,
          accepts: ['numeric'],
          multiple: true,
          minCount: 1,
          colorScheme: 'highlight',
          mappingKey: 'independentVar',
          multipleFormat: 'comma',
        },
      ]

    case 'roc-curve':
      return [
        {
          id: 'state',
          label: '상태 변수 (실제 클래스)',
          description: '실제 양성/사건 발생 여부 (0/1 이진값)',
          required: true,
          accepts: ['categorical', 'numeric'],
          multiple: false,
          colorScheme: 'info',
          mappingKey: 'dependentVar',
        },
        {
          id: 'test',
          label: '예측 점수 (연속형)',
          description: '예측/검사 기준이 되는 연속형 변수',
          required: true,
          accepts: ['numeric'],
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
 * continuous/count/ordinal → 'numeric', categorical/binary/date → 'categorical'
 */
export function toAcceptedType(variableType: string): AcceptedType {
  switch (variableType) {
    case 'continuous':
    case 'count':
    case 'ordinal':
      return 'numeric'
    default:
      return 'categorical'
  }
}

/**
 * Checks if a variable type is accepted by a slot.
 */
export function isTypeAccepted(slot: SlotConfig, variableType: AcceptedType): boolean {
  return slot.accepts.includes(variableType)
}

/**
 * Builds a VariableMapping from slot assignments.
 * Uses slot.multipleFormat to determine serialization:
 * - 'comma': join with comma (e.g. independentVar for regression)
 * - 'array' (default): keep as string[] (e.g. variables, covariate)
 * Single-value slots always use assigned[0].
 */
export function buildMappingFromSlots(
  slots: SlotConfig[],
  assignments: Record<string, string[]>
): VariableMapping {
  const mapping: VariableMapping = {}

  for (const slot of slots) {
    const assigned = assignments[slot.id]
    if (!assigned || assigned.length === 0) continue

    const key = slot.mappingKey
    if (slot.multiple) {
      const value = slot.multipleFormat === 'comma' ? assigned.join(',') : assigned
      ;(mapping as Record<string, unknown>)[key] = value
    } else {
      ;(mapping as Record<string, unknown>)[key] = assigned[0]
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
