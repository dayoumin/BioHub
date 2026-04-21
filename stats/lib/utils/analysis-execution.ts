import type { StatisticalMethodRequirements } from '@/lib/statistics/variable-requirements'
import type { VariableMapping } from '@/lib/statistics/variable-mapping'
import {
  getLocalizedSettingLabel,
  getLocalizedSettingOptions,
} from '@/lib/statistics/localized-setting-metadata'
import type { AnalysisOptions, SuggestedSettings } from '@/types/analysis'
import { isEnglishLanguage } from '@/lib/preferences'

export type ExecutionSettingValue = string | number | boolean | undefined
export type ExecutionSettingsRecord = Record<string, ExecutionSettingValue>
export type ManagedAnalysisOptionKey = 'testValue' | 'nullProportion' | 'alternative' | 'ciMethod'
export type ManagedRequirementSettingKey = 'testValue' | 'testProportion' | 'alternative' | 'ciMethod'
const MANAGED_ANALYSIS_OPTION_OVERRIDE_KEY = '__managedAnalysisOptionOverrides'
const EXPLICIT_METHOD_SETTING_KEYS = '__explicitMethodSettingKeys'

export const MANAGED_REQUIREMENT_SETTING_KEYS = new Set<ManagedRequirementSettingKey>([
  'testValue',
  'testProportion',
  'alternative',
  'ciMethod',
])

export interface ExecutionSettingEntry {
  key: string
  label: string
  value: string
}

interface BuildAnalysisExecutionContextArgs {
  analysisOptions: AnalysisOptions
  methodRequirements?: StatisticalMethodRequirements
  selectedMethodId?: string
  suggestedSettings?: SuggestedSettings | null
  variableMapping?: VariableMapping | null
  presentationLanguage?: string
}

export interface AnalysisExecutionContext {
  effectiveExecutionSettings: ExecutionSettingsRecord
  effectiveExecutionVariables: VariableMapping
  executionSettingEntries: ExecutionSettingEntry[]
}

interface ManagedExecutionSchema {
  analysisOptionKey: ManagedAnalysisOptionKey
  requirementSettingKey: ManagedRequirementSettingKey
  executionTarget: 'setting' | 'variable'
  executionKey: string
  parseAnalysisOptionValue: (value: unknown) => AnalysisOptions[ManagedAnalysisOptionKey] | undefined
  serializeExecutionValue: (value: unknown) => ExecutionSettingValue
}

const MANAGED_EXECUTION_SCHEMAS: ManagedExecutionSchema[] = [
  {
    analysisOptionKey: 'testValue',
    requirementSettingKey: 'testValue',
    executionTarget: 'variable',
    executionKey: 'testValue',
    parseAnalysisOptionValue: (value) => {
      const parsed = Number(value)
      return Number.isFinite(parsed) ? parsed : undefined
    },
    serializeExecutionValue: (value) => String(value),
  },
  {
    analysisOptionKey: 'nullProportion',
    requirementSettingKey: 'testProportion',
    executionTarget: 'variable',
    executionKey: 'nullProportion',
    parseAnalysisOptionValue: (value) => {
      const parsed = Number(value)
      return Number.isFinite(parsed) ? parsed : undefined
    },
    serializeExecutionValue: (value) => String(value),
  },
  {
    analysisOptionKey: 'alternative',
    requirementSettingKey: 'alternative',
    executionTarget: 'setting',
    executionKey: 'alternative',
    parseAnalysisOptionValue: (value) => {
      const normalized = String(value)
      return normalized === 'two-sided' || normalized === 'less' || normalized === 'greater'
        ? normalized
        : undefined
    },
    serializeExecutionValue: (value) => {
      const normalized = String(value)
      return normalized === 'two-sided' || normalized === 'less' || normalized === 'greater'
        ? normalized
        : undefined
    },
  },
  {
    analysisOptionKey: 'ciMethod',
    requirementSettingKey: 'ciMethod',
    executionTarget: 'setting',
    executionKey: 'ciMethod',
    parseAnalysisOptionValue: (value) => String(value),
    serializeExecutionValue: (value) => String(value),
  },
]

const DEFAULT_PRESENTATION_LANGUAGE = 'ko'

function formatExecutionSettingValue(value: unknown, language: string = DEFAULT_PRESENTATION_LANGUAGE): string {
  if (typeof value === 'boolean') {
    return isEnglishLanguage(language)
      ? (value ? 'Yes' : 'No')
      : (value ? '예' : '아니오')
  }
  if (Array.isArray(value)) return value.join(', ')
  return String(value)
}

function getManagedExecutionSchemas(
  methodRequirements?: StatisticalMethodRequirements
): ManagedExecutionSchema[] {
  return MANAGED_EXECUTION_SCHEMAS.filter(schema => (
    methodRequirements?.settings?.[schema.requirementSettingKey] !== undefined
  ))
}

function getManagedAnalysisOptionValue(
  analysisOptions: AnalysisOptions,
  key: ManagedAnalysisOptionKey
): AnalysisOptions[ManagedAnalysisOptionKey] {
  return analysisOptions[key]
}

function parseTrackedKeys(value: string | number | boolean | undefined): Set<string> {
  if (typeof value !== 'string' || value.length === 0) {
    return new Set<string>()
  }

  return new Set(
    value
      .split(',')
      .map((entry) => entry.trim())
      .filter((entry) => entry.length > 0),
  )
}

function getManagedAnalysisOptionOverrides(analysisOptions: AnalysisOptions): Set<string> {
  return parseTrackedKeys(analysisOptions.methodSettings?.[MANAGED_ANALYSIS_OPTION_OVERRIDE_KEY])
}

function getExplicitMethodSettingKeys(analysisOptions: AnalysisOptions): Set<string> {
  return parseTrackedKeys(analysisOptions.methodSettings?.[EXPLICIT_METHOD_SETTING_KEYS])
}

function stripInternalMethodSettings(
  methodSettings: AnalysisOptions['methodSettings']
): ExecutionSettingsRecord {
  const sanitized = {
    ...(methodSettings ?? {}),
  }

  delete sanitized[MANAGED_ANALYSIS_OPTION_OVERRIDE_KEY]
  delete sanitized[EXPLICIT_METHOD_SETTING_KEYS]

  return sanitized
}

function valuesMatch(left: unknown, right: unknown): boolean {
  if (left === right) {
    return true
  }

  return String(left) === String(right)
}

export function getSettingOptionLabel(
  options: Array<{ value: string | number | boolean; label: string; description: string }> | undefined,
  value: unknown,
  key?: string,
  language: string = DEFAULT_PRESENTATION_LANGUAGE,
): string {
  const localizedOptions = key
    ? getLocalizedSettingOptions(key, options, language)
    : options
  const matched = localizedOptions?.find(option => String(option.value) === String(value))
  return matched?.label ?? formatExecutionSettingValue(value, language)
}

function resolveManagedSettingValue({
  defaultValue,
  suggestedValue,
  userValue,
  isExplicitSelection,
}: {
  defaultValue: unknown
  suggestedValue: unknown
  userValue: unknown
  isExplicitSelection: boolean
}): unknown {
  if (userValue === undefined) {
    return suggestedValue ?? defaultValue
  }

  if (isExplicitSelection || suggestedValue === undefined || !valuesMatch(userValue, defaultValue)) {
    return userValue
  }

  return suggestedValue
}

export function buildManagedAnalysisOptionDefaults(args: {
  analysisOptions: AnalysisOptions
  methodRequirements?: StatisticalMethodRequirements
}): Partial<AnalysisOptions> {
  const defaults: Partial<AnalysisOptions> = {}
  const typedDefaults = defaults as Record<ManagedAnalysisOptionKey, AnalysisOptions[ManagedAnalysisOptionKey] | undefined>

  for (const schema of getManagedExecutionSchemas(args.methodRequirements)) {
    const currentValue = getManagedAnalysisOptionValue(args.analysisOptions, schema.analysisOptionKey)
    if (currentValue !== undefined) continue

    const defaultValue = args.methodRequirements?.settings?.[schema.requirementSettingKey]?.default
    if (defaultValue === undefined || defaultValue === null) continue

    const parsedDefault = schema.parseAnalysisOptionValue(defaultValue)
    if (parsedDefault !== undefined) {
      typedDefaults[schema.analysisOptionKey] = parsedDefault
    }
  }

  return defaults
}

function buildEffectiveExecutionSettings({
  analysisOptions,
  methodRequirements,
  selectedMethodId,
  suggestedSettings,
}: Omit<BuildAnalysisExecutionContextArgs, 'variableMapping'>): ExecutionSettingsRecord {
  const sanitizedMethodSettings = stripInternalMethodSettings(analysisOptions.methodSettings)
  const managedOverrides = getManagedAnalysisOptionOverrides(analysisOptions)
  const merged: ExecutionSettingsRecord = {
    ...((suggestedSettings ?? {}) as ExecutionSettingsRecord),
    ...sanitizedMethodSettings,
    alpha: analysisOptions.alpha,
  }

  for (const schema of getManagedExecutionSchemas(methodRequirements)) {
    if (schema.executionTarget !== 'setting') continue

    const resolvedValue = resolveManagedSettingValue({
      defaultValue: methodRequirements?.settings?.[schema.requirementSettingKey]?.default,
      suggestedValue: suggestedSettings?.[schema.executionKey as keyof SuggestedSettings],
      userValue: getManagedAnalysisOptionValue(analysisOptions, schema.analysisOptionKey),
      isExplicitSelection: managedOverrides.has(schema.analysisOptionKey),
    })
    if (resolvedValue === undefined || resolvedValue === null) continue

    const serialized = schema.serializeExecutionValue(resolvedValue)
    if (serialized !== undefined) {
      merged[schema.executionKey] = serialized
    }
  }

  if (
    selectedMethodId === 'two-sample-t' &&
    sanitizedMethodSettings.equalVar !== undefined &&
    !getExplicitMethodSettingKeys(analysisOptions).has('equalVar') &&
    suggestedSettings?.equalVar === undefined &&
    valuesMatch(sanitizedMethodSettings.equalVar, methodRequirements?.settings?.equalVar?.default)
  ) {
    delete merged.equalVar
  }

  return merged
}

function buildEffectiveExecutionVariables({
  analysisOptions,
  methodRequirements,
  variableMapping,
}: Pick<BuildAnalysisExecutionContextArgs, 'analysisOptions' | 'methodRequirements' | 'variableMapping'>): VariableMapping {
  const mergedVariables: VariableMapping = {
    ...(variableMapping ?? {}),
  }

  for (const schema of getManagedExecutionSchemas(methodRequirements)) {
    if (schema.executionTarget !== 'variable') continue

    const defaultValue = methodRequirements?.settings?.[schema.requirementSettingKey]?.default
    const userValue = getManagedAnalysisOptionValue(analysisOptions, schema.analysisOptionKey)
    const resolvedValue = userValue ?? defaultValue
    if (resolvedValue === undefined || resolvedValue === null) continue

    const serialized = schema.serializeExecutionValue(resolvedValue)
    if (serialized !== undefined) {
      ;(mergedVariables as Record<string, ExecutionSettingValue>)[schema.executionKey] = serialized
    }
  }

  return mergedVariables
}

function buildExecutionSettingEntries({
  analysisOptions,
  effectiveExecutionSettings,
  effectiveExecutionVariables,
  methodRequirements,
  presentationLanguage,
}: Pick<AnalysisExecutionContext, 'effectiveExecutionSettings' | 'effectiveExecutionVariables'> & Pick<BuildAnalysisExecutionContextArgs, 'analysisOptions' | 'methodRequirements' | 'presentationLanguage'>): ExecutionSettingEntry[] {
  const language = presentationLanguage ?? DEFAULT_PRESENTATION_LANGUAGE
  const entries: ExecutionSettingEntry[] = [
    { key: 'alpha', label: 'alpha', value: String(analysisOptions.alpha) },
  ]

  const settings = methodRequirements?.settings
  const pushEntry = (key: string, label: string, rawValue: unknown) => {
    if (rawValue === undefined || rawValue === null || rawValue === '') return
    entries.push({ key, label, value: formatExecutionSettingValue(rawValue, language) })
  }

  for (const schema of getManagedExecutionSchemas(methodRequirements)) {
    const setting = settings?.[schema.requirementSettingKey]
    if (!setting) continue

    const rawValue = schema.executionTarget === 'setting'
      ? effectiveExecutionSettings[schema.executionKey]
      : effectiveExecutionVariables[schema.executionKey as keyof VariableMapping]
    const displayValue = setting.options
      ? getSettingOptionLabel(setting.options, rawValue, schema.requirementSettingKey, language)
      : rawValue

    pushEntry(
      schema.requirementSettingKey,
      getLocalizedSettingLabel(schema.requirementSettingKey, setting.label, language),
      displayValue
    )
  }

  for (const [key, setting] of Object.entries(settings ?? {})) {
    if (key === 'alpha' || MANAGED_REQUIREMENT_SETTING_KEYS.has(key as ManagedRequirementSettingKey)) continue

    const rawValue = effectiveExecutionSettings[key]
    if (rawValue === undefined) continue
    pushEntry(
      key,
      getLocalizedSettingLabel(key, setting.label, language),
      setting.options ? getSettingOptionLabel(setting.options, rawValue, key, language) : rawValue
    )
  }

  pushEntry(
    'showAssumptions',
    isEnglishLanguage(language) ? 'Assumption checks' : '가정 검정',
    analysisOptions.showAssumptions
      ? (isEnglishLanguage(language) ? 'Enabled' : '사용')
      : (isEnglishLanguage(language) ? 'Skipped' : '건너뜀')
  )
  pushEntry(
    'showEffectSize',
    isEnglishLanguage(language) ? 'Effect size' : '효과크기',
    analysisOptions.showEffectSize
      ? (isEnglishLanguage(language) ? 'Shown' : '표시')
      : (isEnglishLanguage(language) ? 'Hidden' : '생략')
  )

  return entries
}

export function buildAnalysisExecutionContext(
  args: BuildAnalysisExecutionContextArgs
): AnalysisExecutionContext {
  const effectiveExecutionSettings = buildEffectiveExecutionSettings(args)
  const effectiveExecutionVariables = buildEffectiveExecutionVariables(args)
  const executionSettingEntries = buildExecutionSettingEntries({
    analysisOptions: args.analysisOptions,
    effectiveExecutionSettings,
    effectiveExecutionVariables,
    methodRequirements: args.methodRequirements,
    presentationLanguage: args.presentationLanguage,
  })

  return {
    effectiveExecutionSettings,
    effectiveExecutionVariables,
    executionSettingEntries,
  }
}
