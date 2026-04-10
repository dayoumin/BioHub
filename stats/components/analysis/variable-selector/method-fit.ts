import type {
  StatisticalMethodRequirements,
  VariableRequirement,
  VariableType,
} from '@/lib/statistics/variable-requirements'
import { isTypeCompatibleWithValues } from '@/lib/utils/variable-type-mapper'
import type { AcceptedType, SelectorType, SlotColorScheme, SlotConfig } from './slot-configs'

export interface SelectorColumnInfo {
  name: string
  type: 'numeric' | 'categorical'
  rawType: VariableType
  dataType: 'number' | 'string' | 'boolean' | 'date' | 'mixed'
  uniqueCount: number
  missingCount: number
  nonMissingCount: number
  sampleValues: unknown[]
}

export interface MethodMismatchHint {
  title: string
  message: string
  actionLabel?: string
  actionCtaLabel?: string
}

export interface MethodFitState {
  status: 'ready' | 'partial' | 'blocked' | 'mismatch'
  title: string
  message: string
  actionLabel?: string
  actionCtaLabel?: string
}

export interface VariableCandidate {
  column: SelectorColumnInfo
  status: 'recommended' | 'valid' | 'caution' | 'invalid' | 'assigned'
  reason: string
  isSelectable: boolean
}

const EXACT_TWO_LEVEL_FACTOR_METHODS = new Set([
  'two-sample-t',
  't-test',
  'welch-t',
  'mann-whitney',
])

const PRE_POST_NAME_PATTERN = /(pre|post|before|after|baseline|followup|사전|사후|전후)/i

const TYPE_LABELS: Record<VariableType, string> = {
  continuous: '연속형',
  categorical: '범주형',
  binary: '이진형',
  ordinal: '서열형',
  date: '날짜형',
  count: '카운트형',
}

function normalizeDataType(
  dataType: SelectorColumnInfo['dataType']
): 'number' | 'string' | 'date' | 'boolean' {
  if (dataType === 'mixed') return 'string'
  return dataType
}

function getRequirementTypesText(types: VariableType[]): string {
  return [...new Set(types)].map(type => TYPE_LABELS[type]).join(', ')
}

function toAcceptedTypes(types: VariableType[]): AcceptedType[] {
  const accepted = new Set<AcceptedType>()

  for (const type of types) {
    if (['continuous', 'count', 'ordinal'].includes(type)) {
      accepted.add('numeric')
      continue
    }

    accepted.add('categorical')
  }

  return accepted.size > 0 ? [...accepted] : ['categorical']
}

function getSlotDefinition(
  requirement: VariableRequirement,
  index: number
): Pick<SlotConfig, 'id' | 'mappingKey' | 'colorScheme'> {
  switch (requirement.role) {
    case 'dependent':
      return {
        id: requirement.multiple ? 'variables' : 'dependent',
        mappingKey: requirement.multiple ? 'variables' : 'dependentVar',
        colorScheme: 'info',
      }
    case 'independent':
      return {
        id: requirement.multiple ? 'predictors' : 'independent',
        mappingKey: 'independentVar',
        colorScheme: 'highlight',
      }
    case 'factor':
    case 'between':
      return {
        id: 'factor',
        mappingKey: 'groupVar',
        colorScheme: 'success',
      }
    case 'covariate':
      return {
        id: 'covariate',
        mappingKey: 'covariate',
        colorScheme: 'muted',
      }
    case 'time':
      return {
        id: 'time',
        mappingKey: 'timeVar',
        colorScheme: 'highlight',
      }
    case 'event':
      return {
        id: 'event',
        mappingKey: 'event',
        colorScheme: 'info',
      }
    case 'blocking':
      return {
        id: 'random',
        mappingKey: 'blocking',
        colorScheme: 'muted',
      }
    case 'weight':
      return {
        id: 'weight',
        mappingKey: 'weight',
        colorScheme: 'muted',
      }
    case 'within':
      return {
        id: 'variables',
        mappingKey: 'variables',
        colorScheme: 'highlight',
      }
    default:
      return {
        id: `${requirement.role}-${index}`,
        mappingKey: 'variables',
        colorScheme: 'muted',
      }
  }
}

function roleCandidatesForSlot(slot: SlotConfig): VariableRequirement['role'][] {
  switch (slot.id) {
    case 'dependent':
      return ['dependent']
    case 'independent':
    case 'predictors':
      return ['independent']
    case 'factor':
    case 'group':
    case 'fixed':
      return ['factor', 'between']
    case 'covariate':
      return ['covariate', 'independent']
    case 'time':
      return ['time']
    case 'event':
      return ['event']
    case 'random':
      return ['blocking']
    case 'weight':
      return ['weight']
    case 'state':
      return ['dependent', 'event']
    case 'variables':
      return ['dependent', 'within', 'independent']
    default:
      if (slot.mappingKey === 'dependentVar') return ['dependent']
      if (slot.mappingKey === 'independentVar') return ['independent']
      if (slot.mappingKey === 'groupVar') return ['factor', 'between']
      if (slot.mappingKey === 'covariate') return ['covariate']
      if (slot.mappingKey === 'timeVar') return ['time']
      if (slot.mappingKey === 'event') return ['event']
      if (slot.mappingKey === 'blocking') return ['blocking']
      if (slot.mappingKey === 'weight') return ['weight']
      if (slot.mappingKey === 'variables') return ['dependent', 'within', 'independent']
      return []
  }
}

export function buildSlotsFromMethodRequirements(
  selectorType: SelectorType,
  methodRequirements?: StatisticalMethodRequirements
): SlotConfig[] | null {
  if (!methodRequirements) return null
  if (selectorType !== 'chi-square') return null

  const slots = methodRequirements.variables.map((requirement, index) => {
    const definition = getSlotDefinition(requirement, index)
    return {
      id: definition.id,
      label: requirement.label,
      description: requirement.example
        ? `${requirement.description} 예: ${requirement.example}`
        : requirement.description,
      required: requirement.required,
      accepts: toAcceptedTypes(requirement.types),
      multiple: requirement.multiple,
      minCount: requirement.minCount,
      maxCount: requirement.maxCount,
      colorScheme: definition.colorScheme as SlotColorScheme,
      mappingKey: definition.mappingKey,
      multipleFormat: requirement.multiple ? 'array' : undefined,
    } satisfies SlotConfig
  })

  return slots.length > 0 ? slots : null
}

export function findRequirementForSlot(
  slot: SlotConfig,
  methodRequirements?: StatisticalMethodRequirements
): VariableRequirement | undefined {
  if (!methodRequirements) return undefined

  if (methodRequirements.variables.length === 1) {
    return methodRequirements.variables[0]
  }

  const roles = roleCandidatesForSlot(slot)
  for (const role of roles) {
    const match = methodRequirements.variables.find(variable => variable.role === role)
    if (match) return match
  }

  return undefined
}

export function decorateSlotsWithMethodRequirements(
  slots: SlotConfig[],
  methodRequirements?: StatisticalMethodRequirements
): SlotConfig[] {
  if (!methodRequirements) return slots

  return slots.map(slot => {
    const requirement = findRequirementForSlot(slot, methodRequirements)
    if (!requirement) return slot

    const fragments = [requirement.description]
    if (requirement.example) {
      fragments.push(`예: ${requirement.example}`)
    }

    return {
      ...slot,
      label: requirement.label || slot.label,
      description: fragments.join(' '),
    }
  })
}

function columnMatchesRequirement(
  column: SelectorColumnInfo,
  requirement?: VariableRequirement
): boolean {
  if (!requirement) return true

  return isTypeCompatibleWithValues(
    normalizeDataType(column.dataType),
    requirement.types,
    column.sampleValues
  )
}

function requiresExactTwoLevels(
  methodId: string | undefined,
  requirement?: VariableRequirement
): boolean {
  return requirement?.role === 'factor' && !!methodId && EXACT_TWO_LEVEL_FACTOR_METHODS.has(methodId)
}

function getAssignmentFailureReason(
  column: SelectorColumnInfo,
  slot: SlotConfig,
  requirement: VariableRequirement | undefined,
  methodId?: string
): string | null {
  if (requirement && !columnMatchesRequirement(column, requirement)) {
    return `${slot.label}에는 ${getRequirementTypesText(requirement.types)} 변수가 필요합니다.`
  }

  if (!requirement && !slot.accepts.includes(column.type)) {
    return `${slot.label}에는 ${slot.accepts.includes('numeric') ? '연속형' : '범주형'} 변수가 필요합니다.`
  }

  if (requiresExactTwoLevels(methodId, requirement) && column.uniqueCount !== 2) {
    return `이 방법의 그룹 변수는 정확히 2개 수준이어야 합니다. 현재 ${column.uniqueCount}개 수준입니다.`
  }

  return null
}

function getRecommendedReason(
  column: SelectorColumnInfo,
  requirement: VariableRequirement | undefined,
  methodId?: string
): string | null {
  if (!requirement) return null

  if (requirement.role === 'factor' && column.uniqueCount === 2) {
    return '범주형이면서 2개 수준이라 그룹 변수로 적합합니다.'
  }

  if (
    requirement.role === 'dependent' &&
    requirement.types.includes('continuous') &&
    column.rawType === 'continuous'
  ) {
    return '연속형 변수이므로 결과 변수로 사용하기 적합합니다.'
  }

  if (requirement.role === 'event' && column.uniqueCount === 2) {
    return '이진형 사건 변수로 해석하기 적합합니다.'
  }

  if (requirement.role === 'time' && column.rawType === 'date') {
    return '시간 순서를 가진 날짜형 변수라 시간 축으로 적합합니다.'
  }

  if ((methodId === 'paired-t' || methodId === 'wilcoxon') && PRE_POST_NAME_PATTERN.test(column.name)) {
    return '전후 비교처럼 보이는 이름이라 대응 측정 변수 후보로 적합합니다.'
  }

  return null
}

function getValidReason(slot: SlotConfig, requirement?: VariableRequirement): string {
  if (requirement) {
    return `${slot.label}에 사용할 수 있는 ${getRequirementTypesText(requirement.types)} 변수입니다.`
  }

  return `${slot.label}에 사용할 수 있는 변수입니다.`
}

export function buildVariableCandidates(params: {
  columns: SelectorColumnInfo[]
  slots: SlotConfig[]
  assignments: Record<string, string[]>
  focusSlotId: string | null
  methodRequirements?: StatisticalMethodRequirements
  methodId?: string
}): VariableCandidate[] {
  const { columns, slots, assignments, focusSlotId, methodRequirements, methodId } = params
  const focusSlot = slots.find(slot => slot.id === focusSlotId) ?? slots[0]
  if (!focusSlot) return []

  const requirement = findRequirementForSlot(focusSlot, methodRequirements)
  const assignedElsewhere = new Map<string, string>()
  for (const slot of slots) {
    for (const variable of assignments[slot.id] ?? []) {
      assignedElsewhere.set(variable, slot.id)
    }
  }

  const statusOrder: Record<VariableCandidate['status'], number> = {
    recommended: 0,
    assigned: 1,
    valid: 2,
    caution: 3,
    invalid: 4,
  }

  return columns
    .map(column => {
      const assignedSlotId = assignedElsewhere.get(column.name)
      if (assignedSlotId) {
        return {
          column,
          status: 'assigned' as const,
          reason: assignedSlotId === focusSlot.id
            ? '현재 이 역할에 배정되어 있습니다.'
            : '이미 다른 역할에 배정되어 있습니다. 클릭하면 해제할 수 있습니다.',
          isSelectable: true,
        }
      }

      const failureReason = getAssignmentFailureReason(column, focusSlot, requirement, methodId)
      if (failureReason) {
        return {
          column,
          status: 'invalid' as const,
          reason: failureReason,
          isSelectable: false,
        }
      }

      const recommendedReason = getRecommendedReason(column, requirement, methodId)
      if (recommendedReason) {
        return {
          column,
          status: 'recommended' as const,
          reason: recommendedReason,
          isSelectable: true,
        }
      }

      return {
        column,
        status: 'valid' as const,
        reason: getValidReason(focusSlot, requirement),
        isSelectable: true,
      }
    })
    .sort((left, right) => {
      const statusDelta = statusOrder[left.status] - statusOrder[right.status]
      if (statusDelta !== 0) return statusDelta
      return left.column.name.localeCompare(right.column.name)
    })
}

export function buildMethodFitState(params: {
  slots: SlotConfig[]
  assignments: Record<string, string[]>
  columns: SelectorColumnInfo[]
  methodRequirements?: StatisticalMethodRequirements
  methodId?: string
  mismatchHint?: MethodMismatchHint
}): MethodFitState {
  const { slots, assignments, columns, methodRequirements, methodId, mismatchHint } = params

  if (mismatchHint) {
    return {
      status: 'mismatch',
      title: mismatchHint.title,
      message: mismatchHint.message,
      actionLabel: mismatchHint.actionLabel,
      actionCtaLabel: mismatchHint.actionCtaLabel,
    }
  }

  for (const slot of slots.filter(slot => slot.required)) {
    const assigned = assignments[slot.id] ?? []
    const requirement = findRequirementForSlot(slot, methodRequirements)
    const eligibleColumns = columns.filter(
      column => !getAssignmentFailureReason(column, slot, requirement, methodId)
    )

    if (assigned.length === 0) {
      if (eligibleColumns.length === 0) {
        return {
          status: 'blocked',
          title: '현재 데이터로는 바로 실행할 수 없습니다',
          message: `${slot.label}에 사용할 수 있는 변수가 현재 데이터에 없습니다.`,
          actionLabel: '분석 방법을 바꾸거나, 이 역할에 맞는 변수를 먼저 준비해 주세요.',
        }
      }

      return {
        status: 'partial',
        title: '필수 역할을 먼저 채워주세요',
        message: `${slot.label}부터 선택하면 다음 단계로 진행할 수 있습니다.`,
        actionLabel: '역할 슬롯을 클릭하면 가능한 변수만 먼저 보여줍니다.',
      }
    }

    if (slot.minCount !== undefined && assigned.length < slot.minCount) {
      return {
        status: 'partial',
        title: '필수 역할을 더 채워주세요',
        message: `${slot.label}에는 최소 ${slot.minCount}개의 변수가 필요합니다.`,
        actionLabel: '현재 역할에 필요한 개수를 채운 뒤 분석을 계속할 수 있습니다.',
      }
    }

    for (const variableName of assigned) {
      const column = columns.find(item => item.name === variableName)
      if (!column) {
        return {
          status: 'blocked',
          title: '선택한 변수를 다시 확인해 주세요',
          message: `${variableName} 변수를 현재 데이터에서 찾을 수 없습니다.`,
          actionLabel: '데이터를 다시 불러왔거나 컬럼명이 바뀐 경우 선택을 새로 맞춰주세요.',
        }
      }

      const failureReason = getAssignmentFailureReason(column, slot, requirement, methodId)
      if (failureReason) {
        return {
          status: 'blocked',
          title: '현재 배정으로는 분석을 실행할 수 없습니다',
          message: failureReason,
          actionLabel: '해당 역할의 조건을 만족하는 변수로 바꾸면 바로 진행할 수 있습니다.',
        }
      }
    }
  }

  return {
    status: 'ready',
    title: '분석 실행 준비가 완료되었습니다',
    message: '필수 역할이 모두 유효하게 채워졌습니다.',
    actionLabel: '현재 설정으로 바로 분석을 실행할 수 있습니다.',
  }
}
